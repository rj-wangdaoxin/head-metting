import { AccountPanel } from '@/components/admin/AccountPanel';
import { AdminGatePanel, AdminLockButton } from '@/components/admin/AdminGatePanel';
import { DebateSettings } from '@/components/admin/DebateSettings';
import { FigureManager } from '@/components/admin/FigureManager';
import { ModelSettings } from '@/components/admin/ModelSettings';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { prisma } from '@/lib/db';
import { listUserNames, requireUser } from '@/lib/auth';
import { adminGateEnabled, adminUnlocked } from '@/lib/admin-gate';
import { SPEECH_RULES } from '@/lib/prompt';
import { getOwnSettings, platformModel } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireUser();

  // 部署到公网后可设 ADMIN_PASSWORD 上锁，未解锁则只出示解锁屏
  if (!(await adminUnlocked())) {
    return (
      <div className="mx-auto max-w-[520px] px-6 py-16">
        <AdminGatePanel />
      </div>
    );
  }

  const [settings, figures, users] = await Promise.all([
    getOwnSettings(user.id),
    prisma.figure.findMany({ orderBy: [{ dynastyOrder: 'asc' }, { birthYear: 'asc' }] }),
    listUserNames(),
  ]);
  const platform = platformModel();

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-wide text-ink">后台</h1>
          <p className="mt-1 text-sm text-ink-mute">
            配置你自己的模型接口与论辩规则，管理内置人物的启停与头像。人物档案本身不可编辑。
          </p>
        </div>
        {adminGateEnabled() ? <AdminLockButton /> : null}
      </div>

      <div className="space-y-5">
        <AccountPanel name={user.name} userNames={users.map((u) => u.name)} />

        <ModelSettings initial={settings} platform={platform} />
        <DebateSettings initial={settings} />

        <FigureManager
          figures={figures.map((f) => ({
            id: f.id,
            name: f.name,
            dynasty: f.dynasty,
            category: f.category,
            inkColor: f.inkColor,
            enabled: f.enabled,
            avatarKind: f.avatarKind,
            avatarUrl: f.avatarUrl,
            avatarSource: f.avatarSource,
          }))}
        />

        <ScrollCard className="p-5">
          <h2 className="mb-3 font-serif text-base font-bold text-ink">角色立言通则（提示词模板）</h2>
          <pre className="thin-scrollbar max-h-72 overflow-auto whitespace-pre-wrap rounded-sm bg-paper-deep/70 p-4 text-[12px] leading-6 text-ink-soft">
            {SPEECH_RULES}
          </pre>
          <p className="mt-3 text-[11px] leading-5 text-ink/50">
            每次生成时，模型收到：不可变身份档案（生平、思想、性情、语体、可引之语、立言之禁）＋ 分身差异层 ＋
            上述通则 ＋ 当前环节规则（立论／驳论／质询／应质／结辩）＋ 按角色视角裁剪的近期交锋。
          </p>
        </ScrollCard>
      </div>
    </div>
  );
}
