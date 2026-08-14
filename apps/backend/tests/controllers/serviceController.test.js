const request = require('supertest');
const { createApp } = require('../../src/app');
const db = require('../../src/config/database');
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
  mKnex.orderBy = jest.fn().mockReturnThis();
  mKnex.whereIn = jest.fn().mockReturnThis();
  
  const mockDb = jest.fn(() => mKnex);
  Object.assign(mockDb, mKnex, {
    destroy: jest.fn(),
    transaction: jest.fn(async (cb) => {
      return cb(mKnex);
    })
  });
  return mockDb;
});

// Mock authentication middleware
jest.mock('../../src/middlewares/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user1', email: 'test@example.com', role: 'USER' };
    next();
  },
  generateToken: () => 'token',
}));

describe('Service Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/services/vehicle/:vehicleId', () => {
    it('should return service history', async () => {
      const dbMock = db();
      
      // 1. vehicles check (.first())
      dbMock.first.mockResolvedValueOnce({ id: 'veh1', owner_id: 'user1' });
      
      // 2. service_records query (.orderBy resolves to array)
      dbMock.orderBy.mockResolvedValueOnce([
        { id: '1', vehicle_id: 'veh1', service_type: 'Full Service', service_date: '2026-08-14' }
      ]);
      
      // 3. work_items query (.whereIn resolves to array)
      dbMock.whereIn.mockResolvedValueOnce([{ service_record_id: '1', item_key: 'Oil', status: 'APPROVED' }]);
      
      // 4. service_proofs query (.whereIn resolves to array)
      dbMock.whereIn.mockResolvedValueOnce([{ service_record_id: '1', proof_url: '/img.jpg' }]);

      const res = await request(app).get('/api/v1/services/vehicle/veh1');
        
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.history)).toBe(true);
      if (res.body.data.history.length > 0) {
        expect(res.body.data.history[0]).toHaveProperty('work_items');
        expect(res.body.data.history[0]).toHaveProperty('proofs');
      }
    });
  });
});
