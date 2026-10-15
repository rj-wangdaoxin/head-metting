import { NextResponse } from 'next/server';
import { LlmError, streamChat } from '@/lib/llm';
import { prisma } from '@/lib/db';
import {
  advanceSession,
  buildTurnMessages,
  loadSession,
  persistMessage,
  planRound,
  roundStatus,
  stageFor,
  type TurnAction,
  type TurnPlanItem,
} from '@/lib/debate';
import { buildOpeningInstruction } from '@/lib/prompt';
import { STAGE_LABEL } from '@/lib/constants';
import { getLlmConfig } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sse(controller: ReadableStreamDefaultController, payload: unknown) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`));
}

/**
 * 推进整轮：本轮未发言者按座次依次发言（串行，后一位能读到前一位的话）；
 * 结辩阶段则一次完成全部未结辩者。
 * 事件：meta（某位开始）→ delta（逐段文本）→ segment（某位说完）→ done（整轮结束）
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: TurnAction };
  const action = body.action;
  if (!action) return NextResponse.json({ error: '缺少动作' }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录或登录已失效' }, { status: 401 });
  const userId = user.id;

  const session = await loadSession(id, userId);
  if (!session) return NextResponse.json({ error: '会话不存在或无权限' }, { status: 404 });
  if (session.busy) return NextResponse.json({ error: '本场正有人在发言，请稍候' }, { status: 409 });
  if (session.status === 'ENDED') return NextResponse.json({ error: '本场已结束，如欲再论请续一场' }, { status: 409 });

  // 用户插话 / 主持指令：只落库，不调用模型
  if (action.type === 'USER_INTERJECT') {
    const content = action.content.trim();
    if (!content) return NextResponse.json({ error: '内容为空' }, { status: 400 });

    const round = session.phase === 'CLOSING'
      ? Math.max(1, session.currentRound || 1)
      : roundStatus(session).activeRound;
    const message = await persistMessage({
      sessionId: id,
      participantId: null,
      roleType: action.asModerator ? 'MODERATOR' : 'USER',
      speakerName: action.asModerator ? '主持' : '我',
      round,
      phase: session.phase === 'CLOSING' ? 'CLOSING' : 'NORMAL',
      content,
    });
    await advanceSession(id, null, userId);
    return NextResponse.json({ ok: true, messageId: message.id, streaming: false });
  }

  // 点名发言只生成一条；「推进本轮」生成整轮
  let plan: TurnPlanItem[];
  if (action.type === 'SPECIFY') {
    const target = session.participants.find((p) => p.id === action.participantId);
    if (!target) return NextResponse.json({ error: '未找到发言者' }, { status: 400 });
    const phase = session.phase === 'CLOSING' ? ('CLOSING' as const) : ('NORMAL' as const);
    plan = [
      {
        participantId: target.id,
        round: Math.max(1, session.currentRound || roundStatus(session).activeRound),
        phase,
      },
    ];
  } else {
    plan = planRound(session);
  }

  if (plan.length === 0) {
    return NextResponse.json({ error: '本轮已无待发言者，可「收束成辩要」' }, { status: 400 });
  }

  await prisma.debateSession.update({ where: { id }, data: { busy: true } });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let aborted = false;
      let ended = false;
      let lastPhase: string = session.phase;
      let spokeCount = 0;

      try {
        const config = await getLlmConfig(userId);

        for (const [index, item] of plan.entries()) {
          const fresh = await loadSession(id, userId);
          if (!fresh) break;
          if (fresh.phase === 'ENDED') {
            ended = true;
            break;
          }
          // 触顶等原因已被强制转入结辩，则本轮剩余发言不再进行
          if (item.phase === 'NORMAL' && fresh.phase !== 'NORMAL') break;

          const target = fresh.participants.find((p) => p.id === item.participantId);
          if (!target) continue;

          const phase = item.phase;
          // 结辩归属已完成的那一轮（提前收束时按当前进度计），常规归属进行中的轮次
          const status = roundStatus(fresh);
          const round =
            phase === 'CLOSING'
              ? Math.max(1, status.completedRounds || fresh.currentRound || item.round)
              : status.activeRound;

          const stage = stageFor(fresh, target.id, round, phase);

          sse(controller, {
            type: 'meta',
            participantId: target.id,
            speakerName: target.displayName,
            kind: target.kind,
            sealChar: target.sealChar,
            inkColor: target.inkColor,
            dynasty: target.dynastyLabel,
            round,
            phase,
            stage,
            stageLabel: STAGE_LABEL[stage],
            stance: target.stance,
            index: index + 1,
            total: plan.length,
          });

          let accumulated = '';
          try {
            const { system, history } = await buildTurnMessages(fresh, target.id, phase, round, userId);
            const opening =
              fresh.messages.filter((m) => m.roleType !== 'SYSTEM').length === 0
                ? buildOpeningInstruction(fresh.topic, fresh.background, stage)
                : `现在轮到你${STAGE_LABEL[stage]}。`;

            const messages = [
              { role: 'system' as const, content: system },
              ...history,
              { role: 'user' as const, content: opening },
            ];

            for await (const delta of streamChat(messages, config, req.signal)) {
              accumulated += delta;
              sse(controller, { type: 'delta', text: delta });
            }
          } catch (err) {
            const error = err as LlmError;
            aborted = error.message === '生成已中止' || req.signal.aborted;
            if (!aborted) {
              console.error('[debate.turn]', error.status ?? '', error.message);
              sse(controller, { type: 'error', message: error.message });
            }
          }

          const content = accumulated.trim();
          let segmentEnded = false;
          if (content) {
            await persistMessage({
              sessionId: id,
              participantId: target.id,
              roleType: target.kind === 'PERSONA' ? 'PERSONA' : 'FIGURE',
              speakerName: target.displayName,
              round,
              phase,
              content,
              truncated: aborted,
            });
            spokeCount += 1;
            const result = await advanceSession(id, target.id, userId);
            lastPhase = result.phase;
            segmentEnded = result.ended;
            ended = ended || result.ended;
          } else if (!aborted) {
            sse(controller, { type: 'error', message: '模型未返回内容，请重试或检查后台配置' });
          }

          sse(controller, {
            type: 'segment',
            participantId: target.id,
            speakerName: target.displayName,
            round,
            phase,
            stage,
            stageLabel: STAGE_LABEL[stage],
            truncated: aborted,
            ended: segmentEnded,
            nextPhase: lastPhase,
          });

          if (aborted || segmentEnded) break;
          if (phase === 'NORMAL' && lastPhase !== 'NORMAL') break;
        }
      } catch (err) {
        console.error('[debate.turn]', (err as Error).message);
        sse(controller, { type: 'error', message: '发言失败，请稍后重试' });
      } finally {
        const fresh = await loadSession(id, userId).catch(() => null);
        sse(controller, {
          type: 'done',
          phase: fresh?.phase ?? lastPhase,
          ended: ended || fresh?.status === 'ENDED',
          spokeCount,
          session: fresh
            ? {
                phase: fresh.phase,
                status: fresh.status,
                currentRound: fresh.currentRound,
                roundLimit: fresh.roundLimit,
                messageCount: fresh.messageCount,
                extensionCount: fresh.extensionCount,
                summary: fresh.summary,
                judgment: fresh.judgment,
              }
            : null,
        });
        await prisma.debateSession.update({ where: { id }, data: { busy: false } }).catch(() => undefined);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
