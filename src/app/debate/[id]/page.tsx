import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DebateStage, type StageSession } from '@/components/debate/DebateStage';
import { loadSession } from '@/lib/debate';
import { getDebateLimits } from '@/lib/settings';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DebateRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const session = await loadSession(id, user.id);
  if (!session) notFound();
  const limits = await getDebateLimits(user.id);

  const stage: StageSession = {
    id: session.id,
    topic: session.topic,
    background: session.background,
    motion: session.motion,
    roundLimit: session.roundLimit,
    language: session.language,
    currentRound: session.currentRound,
    phase: session.phase,
    status: session.status,
    extensionCount: session.extensionCount,
    allowJudgment: session.allowJudgment,
    messageCount: session.messageCount,
    summary: session.summary,
    judgment: session.judgment,
    participants: session.participants.map((p) => ({
      id: p.id,
      kind: p.kind,
      displayName: p.displayName,
      dynastyLabel: p.dynastyLabel,
      categoryLabel: p.categoryLabel,
      inkColor: p.inkColor,
      sealChar: p.sealChar,
      avatarUrl: p.avatarUrl,
      orderIndex: p.orderIndex,
      stance: p.stance,
      stanceClaim: p.stanceClaim,
      closingDone: p.closingDone,
    })),
    messages: session.messages.map((m) => ({
      id: m.id,
      participantId: m.participantId,
      roleType: m.roleType,
      speakerName: m.speakerName,
      round: m.round,
      phase: m.phase,
      content: m.content,
      truncated: m.truncated,
    })),
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/debate" className="text-sm text-ink-mute hover:text-cinnabar">
            ←
          </Link>
          <h1 className="font-serif text-xl font-bold text-ink">{session.topic}</h1>
        </div>
        <Link href="/debate/history" className="text-sm text-ink-mute hover:text-cinnabar">
          辩录
        </Link>
      </div>

      <DebateStage
        session={stage}
        limits={{
          extendCap: limits.extendCap,
          roundDefault: limits.roundDefault,
          messageCap: limits.messageCap,
          tokenBudget: limits.tokenBudget,
        }}
      />
    </div>
  );
}
