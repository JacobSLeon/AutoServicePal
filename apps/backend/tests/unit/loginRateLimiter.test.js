'use strict';

/**
 * tests/unit/loginRateLimiter.test.js
 *
 * Unit tests for the loginRateLimiter service.
 * All database and email interactions are mocked — no real DB calls.
 *
 * Jest rule: jest.mock() factory functions cannot reference out-of-scope variables
 * unless they are prefixed with "mock". We use mockGetDb (a jest.fn()) and update
 * its implementation in beforeEach() to return a fresh chain each test.
 */

// ── Mock the email service ─────────────────────────────────────────────────
const mockSendLockoutAlert = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/emailService', () => ({
  sendLockoutAlert: mockSendLockoutAlert,
}));

// ── Mock env config ────────────────────────────────────────────────────────
jest.mock('../../src/config/env', () => ({
  config: {
    security: {
      maxLoginAttempts: 10,
      lockoutDurationHours: 24,
      bcryptRounds: 12,
    },
  },
}));

// ── Database mock ──────────────────────────────────────────────────────────
// mockGetDb is the actual jest.fn() returned when the module is imported.
// Its .mockImplementation() is reset in beforeEach to return a fresh chain.
const mockGetDb = jest.fn();
jest.mock('../../src/config/database', () => mockGetDb);

// ── Shared terminal mock functions (reused across tests) ───────────────────
const mockDbUpdate = jest.fn().mockResolvedValue(1);
const mockDbFirst = jest.fn();

/**
 * Build a unified knex-style query chain that supports both:
 *   (A) db('users').where({...}).select([...]).first()   — checkLockout
 *   (B) db('users').where({...}).update({...})           — recordFailedAttempt, recordSuccessfulLogin
 *
 * All intermediate methods return `chain` so chaining order doesn't matter.
 * Terminal methods (first, update) delegate to the shared mocks so we can
 * make per-test assertions on them.
 */
function buildChain() {
  const chain = {
    where: jest.fn(),
    select: jest.fn(),
    first: mockDbFirst,
    update: mockDbUpdate,
    insert: jest.fn(),
    returning: jest.fn(),
  };
  chain.where.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.returning.mockReturnValue(chain);
  return chain;
}

// ── Import SUT after all mocks are declared ────────────────────────────────
const { checkLockout, recordFailedAttempt, recordSuccessfulLogin } =
  require('../../src/middlewares/loginRateLimiter');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a mock user object
// ─────────────────────────────────────────────────────────────────────────────
function makeUser(overrides = {}) {
  return {
    id: 'user-uuid-123',
    full_name_v5: 'Test User',
    email: 'test@example.com',
    password_hash: '$2b$12$hashedpassword',
    failed_login_attempts: 0,
    locked_until: null,
    role: 'USER',
    ...overrides,
  };
}

let mockChain;

beforeEach(() => {
  jest.clearAllMocks();
  mockDbUpdate.mockResolvedValue(1);

  // Build a fresh chain for each test and wire it to the db mock
  mockChain = buildChain();
  mockGetDb.mockReturnValue(mockChain);
});

// ─────────────────────────────────────────────────────────────────────────────
// checkLockout
// ─────────────────────────────────────────────────────────────────────────────
describe('checkLockout', () => {
  test('returns isLocked=false when user does not exist', async () => {
    mockDbFirst.mockResolvedValueOnce(null);

    const result = await checkLockout('unknown@example.com');

    expect(result.isLocked).toBe(false);
    expect(result.user).toBeNull();
    expect(result.secondsRemaining).toBeNull();
  });

  test('returns isLocked=false when locked_until is null', async () => {
    mockDbFirst.mockResolvedValueOnce(makeUser({ locked_until: null }));

    const result = await checkLockout('test@example.com');

    expect(result.isLocked).toBe(false);
    expect(result.user).not.toBeNull();
  });

  test('returns isLocked=false when locked_until is in the past', async () => {
    const pastDate = new Date(Date.now() - 1000);
    mockDbFirst.mockResolvedValueOnce(makeUser({ locked_until: pastDate }));

    const result = await checkLockout('test@example.com');

    expect(result.isLocked).toBe(false);
  });

  test('returns isLocked=true when locked_until is in the future', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    mockDbFirst.mockResolvedValueOnce(makeUser({ locked_until: futureDate }));

    const result = await checkLockout('test@example.com');

    expect(result.isLocked).toBe(true);
    expect(result.secondsRemaining).toBeGreaterThan(0);
    expect(result.secondsRemaining).toBeLessThanOrEqual(3600);
  });

  test('queries database with lowercased email index', async () => {
    mockDbFirst.mockResolvedValueOnce(null);

    await checkLockout('TEST@EXAMPLE.COM');

    const { blindIndex } = require('../../src/utils/crypto');
    expect(mockChain.where).toHaveBeenCalledWith({ email_index: blindIndex('test@example.com') });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// recordFailedAttempt
// ─────────────────────────────────────────────────────────────────────────────
describe('recordFailedAttempt', () => {
  test('increments failed_login_attempts by 1 on each call', async () => {
    const user = makeUser({ failed_login_attempts: 3 });

    await recordFailedAttempt(user);

    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ failed_login_attempts: 4 })
    );
  });

  test('returns correct attemptsRemaining', async () => {
    const user = makeUser({ failed_login_attempts: 5 });

    const result = await recordFailedAttempt(user);

    expect(result.attemptsRemaining).toBe(4); // 10 - 6 = 4
    expect(result.isNowLocked).toBe(false);
  });

  test('does NOT lock account before the 10th failure', async () => {
    const user = makeUser({ failed_login_attempts: 8 }); // this is the 9th attempt

    const result = await recordFailedAttempt(user);

    expect(result.isNowLocked).toBe(false);
    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({ locked_until: expect.anything() })
    );
    expect(mockSendLockoutAlert).not.toHaveBeenCalled();
  });

  test('locks account on the 10th failure and sets locked_until ~24h from now', async () => {
    const user = makeUser({ failed_login_attempts: 9 }); // this is the 10th attempt

    const result = await recordFailedAttempt(user);

    expect(result.isNowLocked).toBe(true);
    expect(result.attemptsRemaining).toBe(0);

    const updateCall = mockDbUpdate.mock.calls[0][0];
    expect(updateCall.failed_login_attempts).toBe(10);
    expect(updateCall.locked_until).toBeInstanceOf(Date);

    // locked_until should be ~24 hours from now (within 5s tolerance)
    const expectedLockEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const diff = Math.abs(updateCall.locked_until - expectedLockEnd);
    expect(diff).toBeLessThan(5000);
  });

  test('dispatches lockout email alert on the 10th failure', async () => {
    const user = makeUser({ failed_login_attempts: 9 });

    await recordFailedAttempt(user);

    // Allow the fire-and-forget promise to resolve
    await new Promise((r) => setTimeout(r, 20));

    expect(mockSendLockoutAlert).toHaveBeenCalledWith(user.email, user.full_name_v5);
  });

  test('does NOT send email for non-locking failures', async () => {
    const user = makeUser({ failed_login_attempts: 4 });

    await recordFailedAttempt(user);

    await new Promise((r) => setTimeout(r, 20));

    expect(mockSendLockoutAlert).not.toHaveBeenCalled();
  });

  test('handles null failed_login_attempts as 0', async () => {
    const user = makeUser({ failed_login_attempts: null });

    await recordFailedAttempt(user);

    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ failed_login_attempts: 1 })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// recordSuccessfulLogin
// ─────────────────────────────────────────────────────────────────────────────
describe('recordSuccessfulLogin', () => {
  test('resets failed_login_attempts to 0 and clears locked_until', async () => {
    await recordSuccessfulLogin('user-uuid-123');

    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        failed_login_attempts: 0,
        locked_until: null,
      })
    );
  });

  test('updates last_login_at with a Date', async () => {
    await recordSuccessfulLogin('user-uuid-123');

    const updateCall = mockDbUpdate.mock.calls[0][0];
    expect(updateCall.last_login_at).toBeInstanceOf(Date);
  });
});
