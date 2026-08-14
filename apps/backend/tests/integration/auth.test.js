'use strict';

/**
 * tests/integration/auth.test.js
 *
 * Integration tests for the three auth endpoints.
 * These tests use supertest to exercise the full Express request-response cycle
 * (middleware → controller → response) against mocked database and email services.
 *
 * Strategy: Mock the db and emailService modules so no real PostgreSQL or SMTP
 * connection is required. This keeps tests fast and deterministic.
 */

// ── Must load .env before any config module ────────────────────────────────
require('dotenv').config();

// ── Apply test env overrides before importing anything that reads them ──────
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/autoservicepal_test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN = '1h';
process.env.EMAIL_HOST = 'smtp.test.local';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_SECURE = 'false';
process.env.EMAIL_USER = 'test';
process.env.EMAIL_PASS = 'test';
process.env.EMAIL_FROM = 'test@test.com';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
process.env.BLIND_INDEX_KEY = '12345678901234567890123456789012';

// ── Mock database ──────────────────────────────────────────────────────────
const mockDbInsert = jest.fn();
const mockDbReturning = jest.fn();
const mockDbUpdate = jest.fn().mockResolvedValue(1);
const mockDbWhere = jest.fn();
const mockDbFirst = jest.fn();
const mockDbSelect = jest.fn();

// Build a chainable mock for the knex query builder pattern
function buildMockQueryChain() {
  const chain = {
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    first: mockDbFirst,
    insert: jest.fn().mockReturnThis(),
    returning: mockDbReturning,
    update: mockDbUpdate,
  };
  return chain;
}

let mockQueryChain;
jest.mock('../../src/config/database', () => {
  const mockFn = jest.fn(() => mockQueryChain);
  mockFn.raw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
  return mockFn;
});

// ── Mock email service ─────────────────────────────────────────────────────
const mockSendLockoutAlert = jest.fn().mockResolvedValue(undefined);
const mockSendTemporaryPassword = jest.fn().mockResolvedValue(undefined);
const mockSendWelcomeEmail = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/emailService', () => ({
  sendLockoutAlert: mockSendLockoutAlert,
  sendTemporaryPassword: mockSendTemporaryPassword,
  sendWelcomeEmail: mockSendWelcomeEmail,
}));

// ── Import app after mocks are set up ─────────────────────────────────────
const request = require('supertest');
const { createApp } = require('../../src/app');
const bcrypt = require('bcryptjs');

const app = createApp();

// ─────────────────────────────────────────────────────────────────────────────
// Shared test data
// ─────────────────────────────────────────────────────────────────────────────
const VALID_REGISTER_PAYLOAD = {
  full_name_v5: 'Jane Doe',
  email: 'jane@example.com',
  password: 'Password1',
  password_confirmation: 'Password1',
};

const VALID_LOGIN_PAYLOAD = {
  email: 'jane@example.com',
  password: 'Password1',
};

async function makeHashedUser(overrides = {}) {
  const hash = await bcrypt.hash('Password1', 10); // Low rounds for test speed
  return {
    id: 'user-uuid-abc123',
    full_name_v5: 'Jane Doe',
    email: 'jane@example.com',
    password_hash: hash,
    failed_login_attempts: 0,
    locked_until: null,
    role: 'USER',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryChain = buildMockQueryChain();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/register', () => {
  test('201 — creates user and returns JWT for valid payload', async () => {
    const newUser = {
      id: 'user-uuid-abc123',
      full_name_v5: 'Jane Doe',
      email: 'jane@example.com',
      role: 'USER',
      created_at: new Date().toISOString(),
    };
    mockDbReturning.mockResolvedValueOnce([newUser]);

    const res = await request(app).post('/api/v1/auth/register').send(VALID_REGISTER_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('jane@example.com');
    // Sensitive fields MUST NOT be present
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(res.body.data.user.failed_login_attempts).toBeUndefined();
  });

  test('400 — rejects weak password (no uppercase)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      ...VALID_REGISTER_PAYLOAD,
      password: 'password1',
      password_confirmation: 'password1',
    });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  test('400 — rejects mismatched password confirmation', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      ...VALID_REGISTER_PAYLOAD,
      password_confirmation: 'WrongPass1',
    });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password_confirmation' }),
      ])
    );
  });

  test('400 — rejects missing required fields', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('409 — returns conflict when email already exists', async () => {
    const duplicateError = new Error('duplicate key value');
    duplicateError.code = '23505';
    duplicateError.detail = 'Key (email)=(jane@example.com) already exists.';
    mockDbReturning.mockRejectedValueOnce(duplicateError);

    const res = await request(app).post('/api/v1/auth/register').send(VALID_REGISTER_PAYLOAD);

    expect(res.status).toBe(409);
    expect(res.body.status).toBe('error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/login
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
  test('200 — returns JWT on valid credentials', async () => {
    const user = await makeHashedUser();
    mockDbFirst.mockResolvedValueOnce(user);   // checkLockout → find user
    mockDbUpdate.mockResolvedValue(1);          // recordSuccessfulLogin

    const res = await request(app).post('/api/v1/auth/login').send(VALID_LOGIN_PAYLOAD);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('jane@example.com');
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  test('401 — returns generic error for wrong password (no email enumeration)', async () => {
    const user = await makeHashedUser();
    mockDbFirst.mockResolvedValueOnce(user);  // user found
    mockDbUpdate.mockResolvedValue(1);         // recordFailedAttempt

    const res = await request(app).post('/api/v1/auth/login').send({
      ...VALID_LOGIN_PAYLOAD,
      password: 'WrongPassword1',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('401 — returns same generic error when email does not exist', async () => {
    mockDbFirst.mockResolvedValueOnce(null);  // user not found

    const res = await request(app).post('/api/v1/auth/login').send(VALID_LOGIN_PAYLOAD);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('423 — returns locked status when account is already locked', async () => {
    const lockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const user = await makeHashedUser({ locked_until: lockedUntil });
    mockDbFirst.mockResolvedValueOnce(user);

    const res = await request(app).post('/api/v1/auth/login').send(VALID_LOGIN_PAYLOAD);

    expect(res.status).toBe(423);
    expect(res.body.status).toBe('error');
    expect(res.body.data).toHaveProperty('secondsRemaining');
    expect(res.body.data.secondsRemaining).toBeGreaterThan(0);
  });

  test('400 — rejects missing email', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ password: 'Password1' });

    expect(res.status).toBe(400);
  });

  test('400 — rejects invalid email format', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'not-an-email',
      password: 'Password1',
    });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/forgot-password', () => {
  test('200 — returns generic success when email exists', async () => {
    const user = { id: 'user-uuid-abc123', full_name_v5: 'Jane Doe', email: 'jane@example.com' };
    mockDbFirst.mockResolvedValueOnce(user);
    mockDbUpdate.mockResolvedValue(1);

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'jane@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    // Message must not reveal whether the account exists
    expect(res.body.message).toMatch(/if an account/i);

    // Allow fire-and-forget to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(mockSendTemporaryPassword).toHaveBeenCalledWith(
      user.email,
      user.full_name_v5,
      expect.any(String)
    );
  });

  test('200 — returns same generic success when email does NOT exist (no enumeration)', async () => {
    mockDbFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    // Email service must NOT be called
    await new Promise((r) => setTimeout(r, 50));
    expect(mockSendTemporaryPassword).not.toHaveBeenCalled();
  });

  test('400 — rejects missing email', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({});

    expect(res.status).toBe(400);
  });

  test('400 — rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'not-valid' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('200 — returns health status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('AutoServicePal API');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────────────────────────────────
describe('404 handler', () => {
  test('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });
});
