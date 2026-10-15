import { LoginPanel } from '@/components/auth/LoginPanel';
import { isSignupAllowed, listUserNames } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith('/') ? params.next : '/figures';

  // 部署到公网后可设 HIDE_ACCOUNT_LIST=true：不罗列已有账号名，访客直接进注册模式
  const hideList = (process.env.HIDE_ACCOUNT_LIST ?? '').trim() === 'true';
  const users = hideList ? [] : await listUserNames();

  // 设 ALLOW_SIGNUP=false 后关闭注册入口，账号由站长手工分发
  const allowSignup = await isSignupAllowed();

  return (
    <LoginPanel
      users={users.map((u) => ({ id: u.id, name: u.name }))}
      next={next}
      allowSignup={allowSignup}
    />
  );
}
