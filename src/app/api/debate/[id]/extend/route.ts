import { NextResponse } from 'next/server';
import { extendSession } from '@/lib/debate';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录或登录已失效' }, { status: 401 });

  const { id } = await params;
  const result = await extendSession(id, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, added: result.added });
}
