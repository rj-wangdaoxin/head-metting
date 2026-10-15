import Link from 'next/link';
import { CloudDivider } from '@/components/ink/CloudDivider';
import { ScrollCard } from '@/components/ink/ScrollCard';

const ENTRIES = [
  {
    href: '/figures',
    title: '人物库',
    desc: '按朝代与类型检阅先秦以迄近现代人物本体，档案取自史料，标记官方本体、不可修改。',
    seal: '贤',
    color: '#35566B',
  },
  {
    href: '/personas',
    title: '分身',
    desc: '以本体为骨，调性格、语气与知识侧重，造一个只属于你的分身。',
    seal: '影',
    color: '#4E7A51',
  },
  {
    href: '/debate',
    title: '论辩',
    desc: '立一个话题，请三两位古人同席争鸣，轮次有度，辩毕结词定论。',
    seal: '辩',
    color: '#9E3B2E',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-16">
      <section className="grid gap-10 lg:grid-cols-[auto,1fr] lg:items-center">
        <div className="flex items-start gap-4">
          <span
            className="flex h-24 w-24 items-center justify-center border-[3px] border-cinnabar font-serif text-4xl font-bold text-cinnabar"
            style={{ borderRadius: 4, boxShadow: '0 4px 14px rgba(158,59,46,.25)' }}
          >
            青史
          </span>
          <div className="vertical-text font-serif text-2xl font-bold tracking-[0.3em] text-ink">
            与古人坐论
          </div>
        </div>

        <div>
          <h1 className="font-serif text-4xl font-bold leading-tight text-ink">
            青史群贤 · 历史人物智能体平台
          </h1>
          <p className="mt-4 max-w-2xl text-justify-cn text-[15px] leading-7 text-ink-mute">
            此处收录先秦以迄清末的人物本体，各依其生平、思想与语体立言。你可检阅其档案，
            据以派生私人分身，或设一话题，邀数位古人同席论辩——所言皆须合其时代与其人本色，
            不涉身后之事。论辩设有定数，轮满则结辩陈词，辩毕成录，可续、可评、可导出。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/figures" className="ink-btn-seal">
              入人物库
            </Link>
            <Link href="/debate" className="ink-btn-ghost">
              发起论辩
            </Link>
          </div>
        </div>
      </section>

      <CloudDivider className="my-14" label="卷 一" />

      <section className="grid gap-5 md:grid-cols-3">
        {ENTRIES.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <ScrollCard hoverable className="h-full p-6">
              <span
                className="mb-4 inline-flex h-11 w-11 items-center justify-center border-2 font-serif text-lg font-bold transition-transform duration-300 group-hover:rotate-[-6deg]"
                style={{
                  borderColor: item.color,
                  color: item.color,
                  borderRadius: 3,
                  background: `linear-gradient(145deg, ${item.color}14, ${item.color}05)`,
                }}
              >
                {item.seal}
              </span>
              <h2 className="font-serif text-xl font-bold text-ink">{item.title}</h2>
              <p className="mt-2 text-justify-cn text-sm leading-6 text-ink-mute">{item.desc}</p>
            </ScrollCard>
          </Link>
        ))}
      </section>
    </div>
  );
}
