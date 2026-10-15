import { NextResponse } from 'next/server';
import { finalizeSession, loadSession } from '@/lib/debate';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 提前收束：立即生成辩要（与判官评点）并封存本场 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录或登录已失效' }, { status: 401 });

  const { id } = await params;
  const session = await loadSession(id, user.id);
  if (!session) return NextResponse.json({ error: '会话不存在或无权限' }, { status: 404 });
  if (session.status === 'ENDED') return NextResponse.json({ ok: true, alreadyEnded: true });

  await finalizeSession(id, user.id);
  const fresh = await loadSession(id, user.id);
  return NextResponse.json({
    ok: true,
    summary: fresh?.summary ?? null,
    judgment: fresh?.judgment ?? null,
  });
}
