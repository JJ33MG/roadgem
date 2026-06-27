import Bull from 'bull';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// One queue per agent — keeps them isolated
export const billingQueue = new Bull('billing', REDIS_URL);
export const qualityQueue = new Bull('quality', REDIS_URL);
export const optimizerQueue = new Bull('optimizer', REDIS_URL);
export const marketingQueue = new Bull('marketing', REDIS_URL);

export const allQueues = [billingQueue, qualityQueue, optimizerQueue, marketingQueue];
