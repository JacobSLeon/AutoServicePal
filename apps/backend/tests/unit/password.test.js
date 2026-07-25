'use strict';

/**
 * tests/unit/password.test.js
 *
 * Unit tests for the password validation regex and Joi register schema.
 * Tests are isolated — no DB or network calls.
 */

const { PASSWORD_REGEX, schemas } = require('../../src/middlewares/validate');

// ─────────────────────────────────────────────────────────────────
// PASSWORD_REGEX direct tests
// ─────────────────────────────────────────────────────────────────
describe('PASSWORD_REGEX', () => {
  describe('Valid passwords', () => {
    const validPasswords = [
      'Password1',       // Exact minimum
      'Password1!',      // With special char
      'ABCDEFG1abcdefg', // Long, uppercase + number
      'Hello123',        // Standard case
      'Aa1aaaaa',        // Minimum length exactly
    ];

    test.each(validPasswords)('accepts "%s"', (password) => {
      expect(PASSWORD_REGEX.test(password)).toBe(true);
    });
  });

  describe('Invalid passwords', () => {
    test('rejects passwords shorter than 8 characters', () => {
      expect(PASSWORD_REGEX.test('Pass1')).toBe(false);
      expect(PASSWORD_REGEX.test('Aa1')).toBe(false);
    });

    test('rejects passwords with no uppercase letter', () => {
      expect(PASSWORD_REGEX.test('password1')).toBe(false);
      expect(PASSWORD_REGEX.test('alllower1')).toBe(false);
    });

    test('rejects passwords with no number', () => {
      expect(PASSWORD_REGEX.test('Password')).toBe(false);
      expect(PASSWORD_REGEX.test('ALLUPPERCASE')).toBe(false);
    });

    test('rejects passwords with no uppercase AND no number', () => {
      expect(PASSWORD_REGEX.test('alllowercase')).toBe(false);
    });

    test('rejects empty string', () => {
      expect(PASSWORD_REGEX.test('')).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Joi register schema validation
// ─────────────────────────────────────────────────────────────────
describe('schemas.register (Joi)', () => {
  const validPayload = {
    full_name_v5: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password1',
    password_confirmation: 'Password1',
  };

  test('accepts a valid registration payload', () => {
    const { error } = schemas.register.validate(validPayload);
    expect(error).toBeUndefined();
  });

  test('strips unknown fields', () => {
    const { value } = schemas.register.validate({
      ...validPayload,
      role: 'ADMIN',          // Should be stripped
      injected_field: 'evil',
    }, { stripUnknown: true });
    expect(value.role).toBeUndefined();
    expect(value.injected_field).toBeUndefined();
  });

  test('rejects missing full_name_v5', () => {
    const { error } = schemas.register.validate({ ...validPayload, full_name_v5: undefined });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain('full_name_v5');
  });

  test('rejects invalid email format', () => {
    const { error } = schemas.register.validate({ ...validPayload, email: 'not-an-email' });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain('email');
  });

  test('rejects weak password (no uppercase)', () => {
    const { error } = schemas.register.validate({ ...validPayload, password: 'password1', password_confirmation: 'password1' });
    expect(error).toBeDefined();
    const messages = error.details.map((d) => d.message);
    expect(messages.some((m) => m.includes('uppercase'))).toBe(true);
  });

  test('rejects weak password (no number)', () => {
    const { error } = schemas.register.validate({ ...validPayload, password: 'Password', password_confirmation: 'Password' });
    expect(error).toBeDefined();
  });

  test('rejects weak password (too short)', () => {
    const { error } = schemas.register.validate({ ...validPayload, password: 'Abc1', password_confirmation: 'Abc1' });
    expect(error).toBeDefined();
  });

  test('rejects mismatched password_confirmation', () => {
    const { error } = schemas.register.validate({
      ...validPayload,
      password_confirmation: 'DifferentPass1',
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toMatch(/match/i);
  });
});

// ─────────────────────────────────────────────────────────────────
// Joi login schema validation
// ─────────────────────────────────────────────────────────────────
describe('schemas.login (Joi)', () => {
  test('accepts valid login payload', () => {
    const { error } = schemas.login.validate({ email: 'user@example.com', password: 'anypassword' });
    expect(error).toBeUndefined();
  });

  test('rejects missing email', () => {
    const { error } = schemas.login.validate({ password: 'anypassword' });
    expect(error).toBeDefined();
  });

  test('rejects invalid email', () => {
    const { error } = schemas.login.validate({ email: 'bad', password: 'anypassword' });
    expect(error).toBeDefined();
  });

  test('rejects missing password', () => {
    const { error } = schemas.login.validate({ email: 'user@example.com' });
    expect(error).toBeDefined();
  });
});
