import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LEN = 64;

/** 生成本地口令的盐值与哈希（scrypt，单向存储） */
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, KEY_LEN);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export const PASSWORD_RULE = '口令至少 6 位';

export function isValidPassword(password: string) {
  return password.length >= 6;
}

export function isValidUserName(name: string) {
  return name.trim().length >= 1 && name.trim().length <= 16;
}
