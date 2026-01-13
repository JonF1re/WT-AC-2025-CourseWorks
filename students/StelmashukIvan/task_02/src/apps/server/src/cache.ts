import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });;

const CACHE_TTL = 60;

export async function getOrSet<T>(
    key: string,
    fetchData: () => Promise<T>,
    ttl: number = CACHE_TTL
): Promise<T> {
    const cached = await redisClient.get(key);
    if (cached) {
        return JSON.parse(cached);
    }
    const data = await fetchData();
    await redisClient.setEx(key, ttl, JSON.stringify(data));
    return data;
}

export async function invalidatePattern(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
        await redisClient.del(keys);
    }
}