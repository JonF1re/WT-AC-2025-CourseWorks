import 'dotenv/config';

const required = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_TTL',
  'JWT_REFRESH_TTL',
  'FRONTEND_ORIGIN'
] as const;

type RequiredKey = (typeof required)[number];

type DurationUnit = 's' | 'm' | 'h' | 'd';

function parseDurationToSeconds(value: string): number {
  const match = value.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error(`Invalid duration format: ${value}`);
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase() as DurationUnit;
  const multipliers: Record<DurationUnit, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24
  };
  return amount * multipliers[unit];
}

function getEnv(key: RequiredKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: getEnv('DATABASE_URL'),
  frontendOrigin: getEnv('FRONTEND_ORIGIN'),
  jwtAccessSecret: getEnv('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: getEnv('JWT_REFRESH_SECRET'),
  jwtAccessTtlSeconds: parseDurationToSeconds(getEnv('JWT_ACCESS_TTL')),
  jwtRefreshTtlSeconds: parseDurationToSeconds(getEnv('JWT_REFRESH_TTL')),
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'refreshToken'
};

export const isProduction = env.nodeEnv === 'production';
