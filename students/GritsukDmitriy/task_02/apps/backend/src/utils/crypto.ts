import { createHash, randomUUID } from 'crypto';

export function generateJti(): string {
  return randomUUID();
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
