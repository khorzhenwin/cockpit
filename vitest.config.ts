import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
      JWT_SECRET: 'test-jwt-secret-key-that-is-at-least-32-characters-long',
      ENCRYPTION_KEY: 'test-encryption-key-that-is-32-chars',
      SESSION_SECRET: 'test-session-secret-key-that-is-at-least-32-characters-long',
      MCP_SERVER_URL: 'http://localhost:3001',
      MCP_API_KEY: 'test-mcp-api-key',
      NEXT_PUBLIC_WS_URL: 'ws://localhost:3001'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/pages': path.resolve(__dirname, './pages'),
    },
  },
});