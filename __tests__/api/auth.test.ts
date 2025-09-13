import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import registerHandler from '../../pages/api/auth/register';
import loginHandler from '../../pages/api/auth/login';
import logoutHandler from '../../pages/api/auth/logout';
import refreshHandler from '../../pages/api/auth/refresh';
import meHandler from '../../pages/api/auth/me';

// Mock environment variables
vi.mock('../../lib/config/environment', () => ({
  config: {
    JWT_SECRET: 'test-secret-key-that-is-at-least-32-characters-long',
    JWT_EXPIRES_IN: '24h',
    ENCRYPTION_KEY: 'test-encryption-key-that-is-32-chars'
  }
}));

// Mock UUID
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}));

describe('/api/auth/register', () => {
  beforeEach(() => {
    // Clear users storage before each test
    const { users, usersByEmail } = require('../../pages/api/auth/register');
    users.clear();
    usersByEmail.clear();
  });

  it('should register a new user successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    await registerHandler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('test@example.com');
    expect(data.token).toBeDefined();
  });

  it('should reject registration with missing email', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        password: 'password123'
      }
    });

    await registerHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Email and password are required');
  });

  it('should reject registration with invalid email format', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'invalid-email',
        password: 'password123'
      }
    });

    await registerHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid email format');
  });

  it('should reject registration with weak password', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: '123'
      }
    });

    await registerHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Password must be at least 8 characters long');
  });

  it('should reject registration with duplicate email', async () => {
    // First registration
    const { req: req1, res: res1 } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    await registerHandler(req1, res1);
    expect(res1._getStatusCode()).toBe(201);

    // Second registration with same email
    const { req: req2, res: res2 } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password456'
      }
    });

    await registerHandler(req2, res2);

    expect(res2._getStatusCode()).toBe(409);
    const data = JSON.parse(res2._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('User with this email already exists');
  });

  it('should reject non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });

    await registerHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Method not allowed');
  });
});

describe('/api/auth/login', () => {
  beforeEach(async () => {
    // Clear users storage and register a test user
    const { users, usersByEmail } = require('../../pages/api/auth/register');
    users.clear();
    usersByEmail.clear();

    // Register test user
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    await registerHandler(req, res);
  });

  it('should login with valid credentials', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    await loginHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('test@example.com');
    expect(data.token).toBeDefined();
    expect(data.sessionId).toBeDefined();
  });

  it('should reject login with invalid email', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'nonexistent@example.com',
        password: 'password123'
      }
    });

    await loginHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid email or password');
  });

  it('should reject login with invalid password', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'wrongpassword'
      }
    });

    await loginHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid email or password');
  });

  it('should reject login with missing credentials', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com'
      }
    });

    await loginHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Email and password are required');
  });

  it('should set session cookie on successful login', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    await loginHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const cookies = res._getHeaders()['set-cookie'];
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies) ? cookies[0] : cookies).toContain('sessionId=');
  });
});

describe('/api/auth/logout', () => {
  it('should logout successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      cookies: {
        sessionId: 'test-session-id'
      }
    });

    await logoutHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toBe('Logged out successfully');
  });

  it('should clear session cookie', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      cookies: {
        sessionId: 'test-session-id'
      }
    });

    await logoutHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const cookies = res._getHeaders()['set-cookie'];
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies) ? cookies[0] : cookies).toContain('Max-Age=0');
  });

  it('should reject non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });

    await logoutHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Method not allowed');
  });
});

describe('/api/auth/refresh', () => {
  let validToken: string;

  beforeEach(async () => {
    // Clear users storage and register/login a test user
    const { users, usersByEmail } = require('../../pages/api/auth/register');
    users.clear();
    usersByEmail.clear();

    // Register test user
    const { req: regReq, res: regRes } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    await registerHandler(regReq, regRes);
    const regData = JSON.parse(regRes._getData());
    validToken = regData.token;
  });

  it('should refresh valid token', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        token: validToken
      }
    });

    await refreshHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.token).not.toBe(validToken); // Should be a new token
  });

  it('should reject invalid token', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        token: 'invalid-token'
      }
    });

    await refreshHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Token refresh failed');
  });

  it('should reject non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });

    await refreshHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Method not allowed');
  });
});

describe('/api/auth/me', () => {
  let validToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clear users storage and register a test user
    const { users, usersByEmail } = require('../../pages/api/auth/register');
    users.clear();
    usersByEmail.clear();

    // Register test user
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    await registerHandler(req, res);
    const data = JSON.parse(res._getData());
    validToken = data.token;
    userId = data.user.id;
  });

  it('should return user profile with valid token', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: `Bearer ${validToken}`
      }
    });

    await meHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.user.id).toBe(userId);
    expect(data.user.email).toBe('test@example.com');
    expect(data.user.profile).toBeDefined();
    expect(data.user.preferences).toBeDefined();
    expect(data.user.privacySettings).toBeDefined();
  });

  it('should reject request without token', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });

    await meHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('No token provided');
  });

  it('should reject request with invalid token', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer invalid-token'
      }
    });

    await meHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Invalid token');
  });

  it('should reject non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`
      }
    });

    await meHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Method not allowed');
  });
});