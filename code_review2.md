# AutoServicePal — Production-Grade Code Review

> **Scope:** Full backend (`apps/backend/src`) and key frontend screens (`apps/mobile-web/src`).
> **Stance:** Constructive. Every issue includes a rationale and a ready-to-use code fix.

---

## 1. Blocking Issues & Correctness [BLOCKING]

---

### 🔴 B-1 — `uploadServiceProofs`: Files Written to Disk Before Limit is Checked
**File:** [`serviceController.js` L238–267](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/serviceController.js#L238-L267)

The proof-count limit is enforced **after** Sharp has already processed and written every compressed file to disk. If a user has 9 proofs and uploads 3 more, all 3 `.webp` files are persisted, the count check fires, and the files are **orphaned on disk forever** — consuming storage and never cleaned up.

**Fix:** Check the count **before** touching any file.

```javascript
async function uploadServiceProofs(req, res, next) {
  try {
    const { id } = req.params;
    const record = await db('service_records').where({ id, user_id: req.user.id }).first();
    if (!record) return res.status(404).json({ status: 'error', message: 'Service record not found or unauthorized' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ status: 'error', message: 'No images uploaded' });

    // Check limit BEFORE processing any files
    const { count } = await db('service_proofs').where({ service_record_id: id }).count('* as count').first();
    const currentCount = parseInt(count, 10);
    if (currentCount + req.files.length > 10) {
      for (const file of req.files) fs.unlink(file.path, () => {});
      return res.status(400).json({ status: 'error', message: `Max 10 images. You have ${currentCount}.` });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const proofsToInsert = [];
    for (const file of req.files) {
      const outputPath = `${file.path}-compressed.webp`;
      await sharp(file.path).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 75 }).toFile(outputPath);
      fs.unlinkSync(file.path);
      proofsToInsert.push({ service_record_id: id, image_url: `${baseUrl}/uploads/${file.filename}-compressed.webp` });
    }
    await db('service_proofs').insert(proofsToInsert);
    const fullRecord = await fetchFullServiceRecord(id);
    return res.status(200).json({ status: 'success', message: 'Proofs uploaded successfully', data: fullRecord });
  } catch (err) {
    // Always clean up temp files on error
    if (req.files) {
      for (const file of req.files) {
        fs.unlink(file.path, () => {});
        fs.unlink(`${file.path}-compressed.webp`, () => {});
      }
    }
    next(err);
  }
}
```

---

### 🔴 B-2 — `updateServiceRecord`: Two Separate Transactions, No Atomicity
**File:** [`serviceController.js` L125–148](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/serviceController.js#L125-L148)

`service_records` is updated **outside** any transaction (line 125), then `work_items` replacement runs in a **second separate** transaction. If anything fails between the two, the record is saved with stale/deleted work items and there is no automatic rollback.

**Fix:** Wrap everything in one transaction.

```javascript
await db.transaction(async (trx) => {
  await trx('service_records').where({ id }).update({
    service_type: service_type || record.service_type,
    service_date: service_date || record.service_date,
    record_name: recordName,
    cost: cost !== undefined ? cost : record.cost,
    provider_details: provider_details !== undefined ? provider_details : record.provider_details,
    verification_status: 'PENDING',
  });
  if (req.body.work_items && Array.isArray(req.body.work_items)) {
    await trx('work_items').where({ service_record_id: id }).delete();
    if (req.body.work_items.length > 0) {
      await trx('work_items').insert(
        req.body.work_items.map((item) => ({
          service_record_id: id,
          item_key: item.item_key,
          custom_description: item.custom_description || null,
        }))
      );
    }
  }
});
```

---

### 🔴 B-3 — `auth.js`: Dangling Unresolved Promise in the Firebase Fallback
**File:** [`auth.js` L47–85](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/middlewares/auth.js#L47-L85)

When `jwt.verify` throws (for any reason other than `TokenExpiredError`), the code falls through to `admin.auth().verifyIdToken(token)` which is fired as an **unresolved, un-awaited Promise** with no `return`. Express continues without waiting, causing a "headers already sent" crash if the route completes before Firebase responds.

**Fix:** Make the middleware `async` and `await` the Firebase call.

```javascript
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ status: 'error', message: 'Authentication required.' });

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    return next();
  } catch (jwtErr) {
    if (jwtErr.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Token has expired. Please log in again.' });
    }
    // Fall through to Firebase
  }

  try {
    const firebaseDecoded = await admin.auth().verifyIdToken(token);
    if (!firebaseDecoded.email) throw new Error('Firebase token missing email');
    const encryptedEmail = encrypt(firebaseDecoded.email.toLowerCase());
    const user = await db('users').where({ email: encryptedEmail }).first();
    if (!user) throw new Error('User not found');
    req.user = { id: user.id, email: firebaseDecoded.email.toLowerCase(), role: user.role };
    return next();
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid authentication token.' });
  }
}
```

---

### 🔴 B-4 — `adminController.reviewV5`: Encrypted Ciphertext Sent to Email Service
**File:** [`adminController.js` L54–59](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/adminController.js#L54-L59)

`user.email` fetched from the DB is AES-encrypted ciphertext. It is passed directly to `sendV5VerificationEmail(user.email, ...)`. The email delivery will silently fail — the user never receives their V5 result notification.

**Fix:**

```javascript
// Add at top of adminController.js:
const { decrypt } = require('../utils/crypto');

// Inside the email block of reviewV5:
if (user && vehicle) {
  const plainEmail = decrypt(user.email); // ✅ Decrypt first
  await emailService.sendV5VerificationEmail(plainEmail, status, `${vehicle.make} ${vehicle.model}`, rejection_reason);
}
```

---

### 🟡 B-5 — Duplicate Service Record Check Has a Race Condition
**File:** [`serviceController.js` L41–54](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/serviceController.js#L41-L54)

The select-then-insert pattern is not atomic. Two concurrent requests for the same vehicle/type/date can both pass the check and both insert. The real guard must be a **unique DB constraint** — the `errorHandler` already maps `23505` → HTTP 409.

**Fix:** Add a migration:

```javascript
// 010_add_service_record_unique_constraint.js
exports.up = (knex) =>
  knex.schema.table('service_records', (t) =>
    t.unique(['vehicle_id', 'service_type', 'service_date'], 'uq_svc_records_vehicle_type_date')
  );
exports.down = (knex) =>
  knex.schema.table('service_records', (t) =>
    t.dropUnique(['vehicle_id', 'service_type', 'service_date'], 'uq_svc_records_vehicle_type_date')
  );
```

The application-level pre-check can remain as a fast UX path; the DB constraint is the true safety net.

---

## 2. Security & Data Protection [SECURITY]

---

### 🔴 S-1 — Hardcoded Fallback Encryption Key
**File:** [`crypto.js` L6](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/utils/crypto.js#L6)

```javascript
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
```

If `ENCRYPTION_KEY` is absent from the environment (a common deployment mistake), the server falls back silently to a publicly committed key. Every user's encrypted email becomes trivially decryptable by anyone with source code access.

**Fix:** Fail-fast at startup.

```javascript
// In config/env.js — add to validation:
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
  throw new Error('[env] ENCRYPTION_KEY must be exactly 32 characters. Refusing to start.');
}

// In crypto.js — remove the fallback:
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
```

---

### 🔴 S-2 — Static All-Zeros IV Makes AES Deterministic
**File:** [`crypto.js` L12–13](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/utils/crypto.js#L12-L13)

```javascript
const STATIC_IV = Buffer.alloc(IV_LENGTH, 0); // ← all-zeros IV
```

The code's own comment acknowledges this is a known weakness. With a fixed IV and fixed key, `encrypt("user@example.com")` always produces the same ciphertext. An attacker with DB read access can run a dictionary attack offline — computing ciphertexts of known email addresses and comparing against the stored values.

**The correct architecture** is a *blind index* (HMAC) for querying, and non-deterministic AES (random IV) for storage.

```javascript
// Separate env var for the blind index key
const BLIND_INDEX_KEY = Buffer.from(process.env.BLIND_INDEX_KEY, 'hex');

function blindIndex(text) {
  return crypto.createHmac('sha256', BLIND_INDEX_KEY).update(text.toLowerCase()).digest('hex');
}

function encrypt(text) {
  const iv = crypto.randomBytes(16); // ✅ Random IV
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(text) {
  if (!text?.includes(':')) return text;
  const [ivHex, ctHex] = text.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]).toString('utf8');
}
```

Add an `email_index` column (stores the HMAC), query by it, store the random-IV ciphertext in `email`.

---

### 🔴 S-3 — CORS Wildcard (`*`) Falls Through in Production
**File:** [`app.js` L51](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/app.js#L51)

```javascript
origin: process.env.CORS_ORIGIN || '*',
```

A missing env var means the API accepts requests from any origin, defeating the Same-Origin Policy and opening the door to CSRF-style attacks.

**Fix:**

```javascript
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];

if (config.nodeEnv === 'production' && allowedOrigins.length === 0) {
  throw new Error('[CORS] CORS_ORIGIN must be set in production.');
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

### 🔴 S-4 — `crossOriginResourcePolicy: cross-origin` Applied Globally via Helmet
**File:** [`app.js` L32–34](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/app.js#L32-L34)

The fix for image loading set this header globally, which disables the browser's protection against other origins embedding *any* resource from this API — including JSON API responses. This can enable cross-origin information leakage (e.g., in Spectre-style attacks).

**Fix:** Scope the override only to the static `/uploads` route.

```javascript
app.use(helmet()); // Strict globally

app.use('/uploads',
  (_req, res, next) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); next(); },
  express.static(path.join(__dirname, '../public/uploads'))
);
```

---

### 🟡 S-5 — `item_key` Values Not Allowlisted on the Backend — Stored XSS Risk
**File:** [`serviceController.js` L88–93](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/serviceController.js#L88-L93)

The backend blindly inserts whatever `item_key` string arrives. An attacker calling the API directly could inject `<script>alert(1)</script>` into `item_key`. When the Admin panel renders these without escaping, this becomes Stored XSS.

**Fix:** Validate against a server-side allowlist before inserting.

```javascript
const VALID_WORK_ITEMS = new Set([
  'Oil & Filter', 'Air Filter', 'Cabin Filter', 'Fuel Filter',
  'Spark Plugs', 'Glow Plugs', 'Brake Pads (Front)', 'Brake Pads (Rear)',
  'Brake Discs (Front)', 'Brake Discs (Rear)', 'Brake Fluid', 'Coolant',
  'Timing Belt', 'Water Pump', 'Drive Belt', 'Battery',
  'Tyres (Front)', 'Tyres (Rear)', 'Wheel Alignment', 'Suspension (Front)',
  'Suspension (Rear)', 'Exhaust', 'Clutch', 'Gearbox Oil',
  'Differential Oil', 'Air Conditioning', 'Wiper Blades', 'Bulbs',
  'Diagnostics', 'MOT', 'Other',
]);

const invalid = work_items.filter(i => !VALID_WORK_ITEMS.has(i.item_key));
if (invalid.length > 0) {
  return res.status(400).json({
    status: 'error',
    message: `Invalid work item(s): ${invalid.map(i => i.item_key).join(', ')}`,
  });
}
```

---

### 🟡 S-6 — Login Response Leaks Remaining Attempt Count
**File:** [`authController.js` L152–156](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/authController.js#L152-L156)

Returning `attemptsRemaining` in the response body tells an attacker exactly how many guesses they have left, letting them modulate their brute-force to avoid ever hitting the lockout threshold across multiple IPs.

---

### 🟡 S-7 — Admin RBAC Double Source-of-Truth (JWT Payload + Env Email List)
**File:** [`rbac.js` L43–50](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/middlewares/rbac.js#L43-L50)

The second admin check compares `req.user.email` (from the JWT claim) against `ADMIN_EMAILS` (env var). If an admin's email changes, their old JWT still passes. A DB lookup on `req.user.id` would be the authoritative single source of truth.

---

## 3. Architecture & Maintainability [ARCHITECTURE]

---

### 🟡 A-1 — `require('path')` Called Inside a Function Body
**File:** [`app.js` L64](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/app.js#L64)

```javascript
function createApp() {
  const path = require('path'); // ← require inside function body
```

`require()` belongs at the top of the file. This is a universal Node.js convention; burying it inside a function obscures the module's dependency graph.

**Fix:** Move `const path = require('path');` to the top-level imports.

---

### 🟡 A-2 — `fetchFullServiceRecord` Makes 3 Sequential DB Round-Trips
**File:** [`serviceController.js` L10–22](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/serviceController.js#L10-L22)

Three independent queries run sequentially. This helper is called after every write operation, adding ~2× unnecessary latency to every service create/update/proof-upload response.

**Fix:** Parallelise with `Promise.all`.

```javascript
async function fetchFullServiceRecord(serviceRecordId) {
  const [record, workItems, proofs] = await Promise.all([
    db('service_records').where({ id: serviceRecordId }).first(),
    db('work_items').where({ service_record_id: serviceRecordId }),
    db('service_proofs').where({ service_record_id: serviceRecordId }),
  ]);
  if (!record) return null;
  return { ...record, work_items: workItems, proofs };
}
```

---

### 🟡 A-3 — No Shared Typed `Vehicle` Interface — Repeated Inline Mapping
**Files:** [`LoginScreen.tsx`](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/screens/LoginScreen.tsx), [`AddVehicleScreen.tsx`](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/screens/AddVehicleScreen.tsx)

The vehicle mapping logic is copy-pasted across three or more screens using `any` types. A backend field rename yields zero TypeScript warnings. This is the exact pattern that caused the `v5_status` persistence bug.

**Fix:** Create a canonical typed mapper.

```typescript
// src/types/vehicle.ts
export interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  colour: string;
  motStatus: string;
  motDueDate?: string;
  taxStatus: string;
  taxDueDate?: string;
  isVerified: boolean;
  v5_status: 'UNVERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  isGuest: boolean;
}

// src/utils/vehicleMapper.ts
export function mapApiVehicle(v: any, isGuest = false): Vehicle {
  return {
    id: v.id.toString(),
    registrationNumber: v.registration_number ?? v.registrationNumber,
    make: v.make,
    model: v.model,
    colour: v.colour,
    motStatus: v.motStatus ?? 'Unknown',
    motDueDate: v.motDueDate ?? v.motExpiryDate,
    taxStatus: v.taxStatus ?? 'Unknown',
    taxDueDate: v.taxDueDate,
    isVerified: v.is_v5_verified ?? v.isVerified ?? false,
    v5_status: v.v5_status ?? 'UNVERIFIED',
    isGuest,
  };
}
```

---

### 🟡 A-4 — `apiSlice.ts` Uses `any` Throughout
**File:** [`apiSlice.ts`](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/store/api/apiSlice.ts)

`builder.mutation<any, any>` on nearly every endpoint removes all compile-time type safety from API calls. This is what allowed the `response.data.service.id` vs `response.data.id` crash to go undetected until runtime.

---

### 🟡 A-5 — Sentry Initialised Inside the `createApp()` Factory
**File:** [`app.js` L26–29](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/app.js#L26-L29)

Sentry should be initialised before any other code runs so it captures startup errors (failed migrations, bad DB connections). Inside `createApp()`, it is initialised too late to catch `server.js` errors.

---

## 4. Performance & Resource Management [PERFORMANCE]

---

### 🟡 P-1 — `syncVehicles` Inserts One Row at a Time Inside a Loop
**File:** [`vehicleController.js` L159–178](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/vehicleController.js#L159-L178)

```javascript
for (const v of vehicles) {
  await trx('vehicles').insert({ ... }); // N sequential round-trips
}
```

**Fix:** Collect all rows then issue a single bulk insert.

```javascript
const vehiclesToInsert = [];
for (const v of vehicles) {
  if (!v.registrationNumber) continue;
  const reg = v.registrationNumber.replace(/\s+/g, '').toUpperCase();
  if (existingRegs.has(reg)) continue;
  vehiclesToInsert.push({ owner_id: userId, registration_number: reg, /* ... */ });
  existingRegs.add(reg);
}
if (vehiclesToInsert.length > 0) {
  await trx('vehicles').insert(vehiclesToInsert); // ✅ One round-trip
}
```

---

### 🟡 P-2 — `clearCachePattern` Uses `KEYS` — Blocks Redis
**File:** [`redisService.js` L66–75](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/services/redisService.js#L66-L75)

`KEYS` is O(N) and **blocks the entire Redis process** while it scans. Use `SCAN` (non-blocking, cursor-based iteration) instead.

```javascript
async function clearCachePattern(pattern) {
  try {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const pipeline = redis.pipeline();
    stream.on('data', (keys) => keys.forEach(k => pipeline.del(k)));
    await new Promise((resolve, reject) => {
      stream.on('end', () => pipeline.exec().then(resolve).catch(reject));
      stream.on('error', reject);
    });
  } catch (err) {
    logger.error(`Error clearing cache pattern ${pattern}:`, err);
  }
}
```

---

### 🟡 P-3 — Global Rate Limiter Too Coarse for Auth Endpoints
**File:** [`app.js` L37–45](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/app.js#L37-L45)

150 requests / 15 minutes globally is ~10 requests/minute per IP — easily enough for a distributed brute-force to outpace the per-account lockout. Auth endpoints need a dedicated, far stricter limiter.

```javascript
// In auth.routes.js:
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 'error', message: 'Too many auth requests. Please wait 15 minutes.' },
});
router.post('/login', authLimiter, validate(schemas.login), authController.login);
router.post('/register', authLimiter, validate(schemas.register), authController.register);
```

---

### 🟡 P-4 — V5 Images Stored Uncompressed With an Incorrect URL Path
**File:** [`vehicleController.js` L116](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/vehicleController.js#L116)

```javascript
const imageUrl = `/public/uploads/${req.file.filename}`;
```

- The stored path includes `/public/` but the static middleware serves from `/uploads/` — the URL will 404.
- V5 images are stored uncompressed (potentially 5–10 MB each), while service proofs go through Sharp. Apply the same WebP compression pipeline here.

---

## 5. Testing & Edge Cases [TESTING]

---

### 🟡 T-1 — No Test Suite Exists
**Path:** `apps/backend/`

The application handles legal-adjacent records (vehicle service history for insurance/resale) and stores encrypted PII. There are zero unit or integration tests. Minimum coverage needed:

| Area | What to test |
|---|---|
| `authController` | Register, login, lockout at attempt 10, forgot-password |
| `loginRateLimiter` | `locked_until` expired vs active, counter reset |
| `serviceController` | Create, update atomicity, duplicate constraint, proof limit |
| `adminController` | V5 approve/reject, work item verification |
| `rbac` | Role enforcement, admin email list |
| `validate` | Password regex edge cases, `Other` description requirement |

**Recommended stack:** Jest + Supertest + a test Postgres instance (or Knex SQLite in-memory for unit tests).

---

### 🟡 T-2 — `service_date` Not Validated Against a Format Schema
**File:** [`serviceController.js` L30](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/serviceController.js#L30)

An invalid date string (e.g., `"tomorrow"`, `"99-99-9999"`) is passed directly to a PostgreSQL `DATE` column, which throws a raw DB error propagated to the client. A Joi schema on the service endpoints would catch this cleanly before touching the DB.

---

## 6. Style, Readability & Naming [NIT]

---

### NIT-1 — `app.js` Has a Misplaced Comment Block
**File:** [`app.js` L61–63](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/app.js#L61-L63)

The "Request Logging" section comment is immediately followed by the "Static Files" section comment, with the actual logging code appearing *after* the static files block. This is an artifact of inserting the static middleware in-place without reorganising the comments.

---

### NIT-2 — `BASE_URL` Hardcoded to `localhost` in `apiSlice.ts`
**File:** [`apiSlice.ts` L5](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/store/api/apiSlice.ts#L5)

```typescript
const BASE_URL = 'http://localhost:3001/api/v1';
```

This must be environment-driven before any staging or production deployment. With Expo, use `expo-constants`:

```typescript
import Constants from 'expo-constants';
const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3001/api/v1';
```

---

### NIT-3 — Mock FCM `console.log` Left in Production `adminController`
**File:** [`adminController.js` L178–180](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/adminController.js#L178-L180)

```javascript
console.log(`[adminController] Mock FCM sent to user ${record.user_id}...`);
```

This stub was never completed. It should be removed (and the real FCM implementation tracked as a backlog item) — it adds log noise and gives the false impression a push notification was dispatched.

---

### NIT-4 — Login Step Comments Are Mis-numbered
**File:** [`authController.js`](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/authController.js)

The inline comments label five steps but the JSDoc at the top describes four. Step 3 in the code ("Account is currently locked") is actually a sub-step of Step 1's lockout check. Align the inline steps with the JSDoc description.

---

## Priority Summary

| ID | Severity | File | Summary |
|---|---|---|---|
| B-1 | 🔴 BLOCKING | `serviceController.js` | Files written to disk before limit is checked — orphaned files |
| B-2 | 🔴 BLOCKING | `serviceController.js` | Split transactions in `updateServiceRecord` — data inconsistency risk |
| B-3 | 🔴 BLOCKING | `auth.js` | Dangling unresolved Promise in Firebase fallback — headers-already-sent |
| B-4 | 🔴 BLOCKING | `adminController.js` | Encrypted email sent to email service — silent notification failure |
| S-1 | 🔴 SECURITY | `crypto.js` | Hardcoded fallback encryption key committed to source |
| S-2 | 🔴 SECURITY | `crypto.js` | Static all-zeros IV — deterministic AES, offline dictionary attack |
| S-3 | 🔴 SECURITY | `app.js` | CORS wildcard fallback in production |
| S-4 | 🔴 SECURITY | `app.js` | Global CORP `cross-origin` header — weakens cross-site isolation |
| B-5 | 🟡 HIGH | `serviceController.js` | Race condition in duplicate check — add DB unique constraint |
| S-5 | 🟡 HIGH | `serviceController.js` | `item_key` not allowlisted — Stored XSS in admin panel |
| P-3 | 🟡 HIGH | `app.js` | Auth endpoints not rate-limited separately |
| A-2 | 🟡 MEDIUM | `serviceController.js` | 3 sequential DB calls — use `Promise.all` |
| P-1 | 🟡 MEDIUM | `vehicleController.js` | N sequential inserts in loop — batch instead |
| P-2 | 🟡 MEDIUM | `redisService.js` | `KEYS` command blocks Redis — use `SCAN` |
| P-4 | 🟡 MEDIUM | `vehicleController.js` | V5 images uncompressed + wrong URL path |
| A-3 | 🟡 MEDIUM | Frontend | No typed `Vehicle` interface — repeated inline `any` mapping |
| T-1 | 🟡 MEDIUM | `apps/backend/` | Zero test coverage |
| T-2 | 🟡 MEDIUM | `serviceController.js` | `service_date` input not validated |
| NIT-1–4 | 🔵 LOW | Various | Comment cleanup, localhost hardcode, mock FCM stub |
