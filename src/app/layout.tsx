import type { Metadata } from 'next';
import './globals.css';
import { TopNav } from '@/components/layout/TopNav';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '青史群贤 · 历史人物智能体平台',
  description: '内置先秦以来至二十世纪上半叶的历史人物本体，可派生个人分身，组织跨朝代话题辩论。',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <TopNav user={user} />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
