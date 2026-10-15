import { NextResponse, type NextRequest } from 'next/server';

/** 与 src/lib/auth.ts 保持一致；此处不可引入该模块（内含 node:crypto 与 Prisma，非 Edge 可用） */
const SESSION_COOKIE = 'hm_uid';

/**
 * 全站需登录后再用：未携带会话 cookie 一律送去登录页（接口返回 401）。
 * 这里只做「有没有、格式对不对」的粗筛，真正的签名校验与查库在服务端进行。
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/login') return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value ?? '';
  const looksValid = /^[A-Za-z0-9_-]{8,}\.[a-f0-9]{64}$/.test(cookie);
  if (looksValid) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: '未登录或登录已失效' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|avatars).*)'],
};
