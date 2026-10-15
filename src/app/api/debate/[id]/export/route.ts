import { buildExportMarkdown, loadSession } from '@/lib/debate';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response('未登录或登录已失效', { status: 401 });

  const { id } = await params;
  const session = await loadSession(id, user.id);
  if (!session) return new Response('会话不存在或无权限', { status: 404 });

  const markdown = buildExportMarkdown(session);
  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="debate-${id}.md"`,
    },
  });
}
