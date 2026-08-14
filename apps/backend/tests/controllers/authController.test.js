const request = require('supertest');
const { createApp } = require('../../src/app');
const db = require('../../src/config/database');
const { encrypt, blindIndex } = require('../../src/utils/crypto');
const emailService = require('../../src/services/emailService');
const admin = require('../../src/config/firebase');

const app = createApp();

jest.mock('../../src/config/database', () => {
  const mKnex = jest.fn().mockReturnThis();
  mKnex.where = jest.fn().mockReturnThis();
  mKnex.first = jest.fn().mockResolvedValue(null);
  mKnex.insert = jest.fn().mockReturnThis();
  mKnex.returning = jest.fn().mockResolvedValue([{ id: '1' }]);
  mKnex.update = jest.fn().mockResolvedValue(1);
  mKnex.select = jest.fn().mockReturnThis();
  
  const mockDb = jest.fn(() => mKnex);
  Object.assign(mockDb, mKnex, {
    destroy: jest.fn(),
    transaction: jest.fn(async (cb) => {
      return cb(mKnex);
    })
  });
  return mockDb;
});

jest.mock('../../src/services/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(),
  sendTemporaryPassword: jest.fn().mockResolvedValue(),
}));
jest.mock('../../src/config/firebase', () => ({
  auth: () => ({
    verifyIdToken: jest.fn(),
  }),
}));

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const dbMock = db();
      dbMock.returning.mockResolvedValueOnce([{
        id: '1',
        full_name_v5: 'Test User',
        email: encrypt('test@example.com'),
        role: 'USER',
        created_at: new Date().toISOString()
      }]);
      
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          full_name_v5: 'Test User',
          email: 'test@example.com',
          password: 'Password1',
          password_confirmation: 'Password1'
        });
        
      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should return 409 if user exists', async () => {
      const dbMock = db();
      const duplicateError = new Error('duplicate key value');
      duplicateError.code = '23505';
      dbMock.returning.mockRejectedValueOnce(duplicateError);
      
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          full_name_v5: 'Test User',
          email: 'test@example.com',
          password: 'Password1',
          password_confirmation: 'Password1'
        });
        
      expect(res.statusCode).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });
});
