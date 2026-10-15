export interface CastOption {
  kind: 'FIGURE' | 'PERSONA';
  id: string;
  personaId: string | null;
  figureId: string;
  displayName: string;
  dynasty: string;
  category: string;
  inkColor: string;
  sealChar: string;
  avatarUrl: string | null;
  avatarKind: string | null;
  baseName?: string;
}

export interface DebateMessageView {
  id: string;
  participantId: string | null;
  roleType: string;
  speakerName: string;
  round: number;
  phase: string;
  /** 环节：立论 / 驳论 / 质询 / 应质 / 结辩；旧录无此值 */
  stage?: string | null;
  content: string;
  truncated: boolean;
}

export interface ParticipantView {
  id: string;
  kind: string;
  displayName: string;
  dynastyLabel: string | null;
  categoryLabel: string | null;
  inkColor: string;
  sealChar: string;
  avatarUrl: string | null;
  orderIndex: number;
  /** 阵营：PRO 主张 / CON 反对 / MID 折中 */
  stance: string | null;
  stanceClaim: string | null;
  closingDone: boolean;
}
