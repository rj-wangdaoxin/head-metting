'use client';

import { InkSeal } from '@/components/ink/InkSeal';
import { STANCE_LABEL } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface Props {
  speakerName: string;
  label: string;
  content: string;
  inkColor: string;
  sealChar: string;
  dynasty?: string | null;
  /** 环节标识：立论 / 驳论 / 质询 / 应质 */
  stageLabel?: string | null;
  /** 阵营：PRO / CON / MID */
  stance?: string | null;
  streaming?: boolean;
  truncated?: boolean;
  closing?: boolean;
}

export function SpeechBubble({
  speakerName,
  label,
  content,
  inkColor,
  sealChar,
  dynasty,
  stageLabel = null,
  stance = null,
  streaming = false,
  truncated = false,
  closing = false,
}: Props) {
  const isSelf = label === '我' || label === '主持';

  if (isSelf) {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="max-w-[78%]">
          <div className="mb-1 flex items-center justify-end gap-2 text-[11px] text-ink-mute">
            <span>{label}</span>
          </div>
          <div className="rounded-sm rounded-tr-none border border-ink/15 bg-ink/5 px-4 py-2.5 text-[15px] leading-7 text-ink-soft">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in-up gap-3">
      <InkSeal char={sealChar} color={inkColor} size={40} title={speakerName} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-serif text-sm font-bold text-ink">{speakerName}</span>
          {dynasty ? (
            <span className="rounded-sm px-1.5 py-0.5 text-[11px]" style={{ background: `${inkColor}14`, color: inkColor }}>
              {dynasty}
            </span>
          ) : null}
          {stageLabel && !closing ? (
            <span className="rounded-sm border border-ink/20 px-1.5 py-0.5 text-[11px] text-ink-mute">
              {stageLabel}
            </span>
          ) : null}
          {stance ? (
            <span
              className={cn(
                'rounded-sm px-1.5 py-0.5 text-[11px]',
                stance === 'PRO'
                  ? 'bg-cinnabar/10 text-cinnabar'
                  : stance === 'CON'
                    ? 'bg-indigo/10 text-indigo'
                    : 'bg-gold/15 text-gold',
              )}
            >
              {STANCE_LABEL[stance] ?? stance}
            </span>
          ) : null}
          {closing ? (
            <span className="rounded-sm bg-gold/15 px-1.5 py-0.5 text-[11px] text-gold">结辩</span>
          ) : null}
          {truncated ? <span className="text-[11px] text-ink/40">（中断）</span> : null}
        </div>
        <div
          className="scroll-card border-l-2 px-4 py-3 text-[15px] leading-7 text-ink-soft text-justify-cn"
          style={{ borderLeftColor: inkColor }}
        >
          {content}
          {streaming ? <span className="ml-0.5 inline-block h-4 w-[2px] animate-blink bg-cinnabar align-middle" /> : null}
        </div>
      </div>
    </div>
  );
}
