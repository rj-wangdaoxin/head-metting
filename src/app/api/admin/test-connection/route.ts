import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/llm';
import { getLlmConfig } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';
import { adminUnlocked } from '@/lib/admin-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: '未登录或登录已失效' }, { status: 401 });
  if (!(await adminUnlocked())) {
    return NextResponse.json({ ok: false, message: '后台已上锁，请先输入管理口令' }, { status: 403 });
  }

  const patch = (await req.json().catch(() => ({}))) as {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  };

  const current = await getLlmConfig(user.id);
  const result = await testConnection({
    baseUrl: patch.baseUrl?.trim() || current.baseUrl,
    apiKey: patch.apiKey || current.apiKey,
    model: patch.model?.trim() || current.model,
    temperature: current.temperature,
    maxTokens: current.maxTokens,
    timeoutMs: patch.timeoutMs ?? current.timeoutMs,
  });

  return NextResponse.json(result);
}
