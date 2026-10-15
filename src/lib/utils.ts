import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function toJson(value: unknown): string {
  return JSON.stringify(value ?? []);
}

export function formatYear(year: number | null) {
  if (year === null || year === undefined) return '?';
  return year < 0 ? `前${-year}` : `${year}`;
}

export function formatLifespan(birth: number | null, death: number | null) {
  if (birth && death) return `${formatYear(birth)} — ${formatYear(death)}`;
  if (birth) return `生于 ${formatYear(birth)}`;
  if (death) return `卒于 ${formatYear(death)}`;
  return '生卒年不详';
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** 估算 token：中文按字符计，英文按 4 字符 1 token，取粗略上界 */
export function estimateTokens(text: string) {
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const rest = text.length - cjk;
  return Math.ceil(cjk + rest / 4);
}
