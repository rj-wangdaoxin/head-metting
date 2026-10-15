import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FigureAvatar } from '@/components/figures/FigureAvatar';
import { CloudDivider } from '@/components/ink/CloudDivider';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { getFigureBySlug } from '@/lib/queries';
import { formatLifespan } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="mb-3 font-serif text-base font-bold tracking-wide text-ink">{title}</h2>
      <div className="text-[15px] leading-7 text-ink-soft">{children}</div>
    </section>
  );
}

export default async function FigureProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const figure = await getFigureBySlug(slug);
  if (!figure) notFound();

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <div className="mb-6">
        <Link href="/figures" className="text-sm text-ink-mute transition-colors hover:text-cinnabar">
          ← 返回人物库
        </Link>
      </div>

      <ScrollCard className="p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-3">
            <FigureAvatar
              name={figure.name}
              dynasty={figure.dynasty}
              category={figure.category}
              inkColor={figure.inkColor}
              avatarUrl={figure.avatarUrl}
              avatarKind={figure.avatarKind}
              size={132}
            />
            <span className="text-[11px] text-ink/45">
              {figure.avatarKind === 'IMAGE' ? '古画像' : '水墨印章'}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-serif text-3xl font-bold text-ink">{figure.name}</h1>
              {figure.courtesy ? (
                <span className="font-serif text-sm text-ink-mute">字 {figure.courtesy}</span>
              ) : null}
              <span className="rounded-sm bg-cinnabar/10 px-2 py-0.5 text-[11px] text-cinnabar">
                官方本体 · 不可修改
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-sm px-2 py-1" style={{ background: `${figure.inkColor}14`, color: figure.inkColor }}>
                {figure.dynasty}
              </span>
              <span className="rounded-sm bg-ink/5 px-2 py-1 text-ink-mute">{figure.category}</span>
              <span className="rounded-sm bg-ink/5 px-2 py-1 text-ink-mute">
                {formatLifespan(figure.birthYear, figure.deathYear)}
              </span>
              {figure.birthplace ? (
                <span className="rounded-sm bg-ink/5 px-2 py-1 text-ink-mute">{figure.birthplace}</span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {figure.roles.map((role) => (
                <span key={role} className="rounded-sm border border-paper-line px-2 py-0.5 text-[11px] text-ink-mute">
                  {role}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {figure.personalityTraits.map((trait) => (
                <span key={trait} className="rounded-sm bg-paper-deep px-2 py-1 text-xs text-ink-soft">
                  {trait}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/personas/new?figure=${figure.slug}`} className="ink-btn-seal">
                据本体创建分身
              </Link>
              <Link href={`/debate?figure=${figure.id}`} className="ink-btn-ghost">
                邀其入论辩
              </Link>
            </div>
          </div>
        </div>

        <CloudDivider className="my-8" label="其 人" />

        <Section title="生平">
          <p className="text-justify-cn">{figure.biography}</p>
        </Section>

        <Section title="核心思想">
          <p className="text-justify-cn">{figure.thoughts}</p>
        </Section>

        <Section title="语言风格">
          <p className="text-justify-cn">{figure.speakingStyle.tone}</p>
          <p className="mt-2 text-sm text-ink-mute">
            自称：{figure.speakingStyle.selfAddress}　习惯用语：
            {figure.speakingStyle.catchphrases.map((c) => `「${c}」`).join('、')}
          </p>
        </Section>

        <Section title="代表言论">
          <ul className="space-y-3">
            {figure.quotes.map((quote) => (
              <li key={quote.text} className="border-l-2 border-cinnabar/40 pl-3">
                <p className="font-kai text-[15px] leading-7 text-ink">{quote.text}</p>
                <p className="mt-1 text-xs text-ink-mute">—— {quote.source}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="典故轶事">
          <ul className="list-disc space-y-1.5 pl-5">
            {figure.anecdotes.map((item) => (
              <li key={item} className="text-justify-cn">
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="所长">
            <div className="flex flex-wrap gap-1.5">
              {figure.expertise.map((item) => (
                <span key={item} className="rounded-sm bg-moss/10 px-2 py-1 text-xs text-moss">
                  {item}
                </span>
              ))}
            </div>
          </Section>

          <Section title="立言之禁">
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {figure.taboos.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        </div>

        <Section title="史料来源">
          <ul className="flex flex-wrap gap-2">
            {figure.sources.map((item) => (
              <li key={item} className="rounded-sm border border-paper-line px-2 py-1 text-xs text-ink-mute">
                {item}
              </li>
            ))}
          </ul>
          {figure.avatarSource ? (
            <p className="mt-3 text-xs text-ink/50">头像来源：{figure.avatarSource}</p>
          ) : null}
        </Section>
      </ScrollCard>
    </div>
  );
}
