import { defineConfig } from 'vitest/config';

// Database tests share one test database: run files one after another so their clean-ups do not collide.
export default defineConfig({ test: { fileParallelism: false } });
