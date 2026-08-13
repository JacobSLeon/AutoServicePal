# AutoServicePal — Comprehensive Code Review

**Reviewer:** Antigravity  
**Date:** 2026-08-13  
**Scope:** Full-stack audit — Backend (Express/Node.js) + Frontend (React Native/Expo)

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical (runtime crash / security) | 4 |
| 🟠 High (incorrect behaviour / data integrity) | 7 |
| 🟡 Medium (code smell / maintenance risk) | 10 |
| 🔵 Low (style / minor improvement) | 8 |

---

## 🔴 Critical Issues

### C-1: `report.routes.js` imports a non-existent export — **will crash at startup**

[report.routes.js](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/routes/report.routes.js#L6)

```js
const { requireAuth, requireRole } = require('../middlewares/auth');
```

The `auth.js` middleware exports `authenticateToken` and `generateToken` — there is **no export named `requireAuth`**. This means the report routes will crash with `TypeError: requireAuth is not a function` the moment the server starts, because Node evaluates all `require()` calls at module load time.

Additionally, `requireRole` is exported from `rbac.js`, not `auth.js`.

**Fix:**
```diff
-const { requireAuth, requireRole } = require('../middlewares/auth');
+const { authenticateToken } = require('../middlewares/auth');
+const { requireRole } = require('../middlewares/rbac');

-router.get('/daily', requireAuth, requireRole('ADMIN'), reportController.getDailyReport);
-router.get('/weekly', requireAuth, requireRole('ADMIN'), reportController.getWeeklyReport);
+router.get('/daily', authenticateToken, requireRole('ADMIN'), reportController.getDailyReport);
+router.get('/weekly', authenticateToken, requireRole('ADMIN'), reportController.getWeeklyReport);
```

---

### C-2: `LOCKOUT_HOURS` referenced in `authController.js` but never imported

[authController.js:137](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/authController.js#L137)

```js
data: { secondsRemaining: LOCKOUT_HOURS * 3600 },
```

`LOCKOUT_HOURS` is defined in `loginRateLimiter.js` but is never imported into `authController.js`. This will throw a `ReferenceError` at runtime when a user triggers their 10th failed login attempt — exactly the most critical security path.

**Fix:**
```diff
+const { config } = require('../config/env');
+const LOCKOUT_HOURS = config.security.lockoutDurationHours;
```
Or import `LOCKOUT_HOURS` from `loginRateLimiter.js` by adding it to the module exports.

---

### C-3: `LoginScreen.tsx` uses `theme` before importing it

[LoginScreen.tsx:104](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/screens/LoginScreen.tsx#L104)

`theme` is used inside JSX on line 104 (`placeholderTextColor={theme.colors.textSecondary}`), but the import statement is on **line 145**:

```tsx
// Line 145 — AFTER usage
import { theme } from '../utils/theme';
```

This works only due to JavaScript hoisting of `import` statements, but it's a code smell that indicates the file was assembled incorrectly. The `import` belongs at the top of the file with other imports. This also means `Button` from react-native is imported but unused.

---

### C-4: `cronJobs.js` uses `db.raw()` but Knex `raw()` returns different shapes per dialect

[cronJobs.js:13-24](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/jobs/cronJobs.js#L13-L24)

```js
const { rows: newRegs } = await db.raw(`SELECT count(*) ...`);
```

Knex `raw()` returns `{ rows: [...] }` only for PostgreSQL. If the database driver changes or tests use SQLite, this destructuring will produce `undefined`. While PostgreSQL is the current target, this is a portability risk and the destructured result lacks null-safety.

Additionally, `count(*)` returns a `bigint` string in PostgreSQL, so `parseInt(newRegs[0].count, 10)` is technically correct but fragile. Using Knex's query builder with `.count()` would be safer.

---

## 🟠 High Severity Issues

### H-1: `adminController.verifyWorkItem` uses `\\\\n` (double-escaped newline) in SQL

[adminController.js:149](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/authController.js#L149)

```js
admin_note: db.raw(`CASE WHEN admin_note IS NULL OR admin_note = '' THEN ? ELSE CONCAT(admin_note, '\\\\n', ?) END`, ...)
```

The `'\\\\n'` will insert the **literal characters `\n`** (a backslash followed by the letter `n`), not an actual newline. In the original JavaScript string, `'\\\\n'` becomes `\\n`, which becomes the literal text `\n` in SQL. This will display `\n` in the UI rather than line-breaking.

**Fix:**
```diff
-CONCAT(admin_note, '\\\\n', ?)
+CONCAT(admin_note, E'\\n', ?)
```
Or use `CHR(10)` for a database-level newline: `CONCAT(admin_note, CHR(10), ?)`.

---

### H-2: `syncVehicles` does not handle duplicate registration numbers

[vehicleController.js:155-166](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/vehicleController.js#L155-L166)

If the user already has a vehicle with the same `registration_number` in the cloud (from a previous sync or manual add), the sync will insert a **duplicate**. There is no `ON CONFLICT` or pre-existence check. The `vehicles` table has no unique constraint on `(owner_id, registration_number)`, so this silently creates duplicates.

**Fix:** Add an `ON CONFLICT DO NOTHING` clause or pre-filter existing registrations.

---

### H-3: `addServiceRecord` does not verify vehicle ownership

[serviceController.js:26-75](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/serviceController.js#L26-L75)

The `addServiceRecord` endpoint accepts a `vehicle_id` from the client but never verifies that `req.user.id` actually owns that vehicle. A malicious authenticated user could create service records on **any vehicle** by supplying an arbitrary `vehicle_id`.

**Fix:** Add an ownership check before insert:
```js
const vehicle = await db('vehicles')
  .where({ id: vehicle_id, owner_id: req.user.id })
  .first();
if (!vehicle) return res.status(404).json({ ... });
```

---

### H-4: `getPendingReviews` has an N+1 query problem

[adminController.js:99-105](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/adminController.js#L99-L105)

```js
const formattedWorkItems = await Promise.all(pendingWorkItems.map(async (wi) => {
  const proofs = await db('service_proofs').where({ service_record_id: wi.service_record_id });
  return { ...wi, proofs };
}));
```

For each pending work item, a separate query fetches proofs. With 50 pending items, this fires 50+ queries. This should be refactored to use a single batch query with `whereIn()`.

---

### H-5: `forgotPassword` mutation in `apiSlice.ts` sends double-wrapped email

[apiSlice.ts:46-52](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/store/api/apiSlice.ts#L46-L52)

```ts
forgotPassword: builder.mutation<any, any>({
  query: (email) => ({
    url: '/auth/forgot-password',
    method: 'POST',
    body: { email },   // <-- wraps email in { email }
  }),
}),
```

But `ForgotPasswordScreen.tsx` calls it with:
```ts
await forgotPassword({ email }).unwrap();  // already passes { email }
```

This will send `{ email: { email: "user@example.com" } }` to the backend — double nested. The Joi validation on the backend will reject this because `email` won't be a string.

**Fix:** Change the mutation query to pass through the body directly:
```ts
query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
```

---

### H-6: `DVLA lookup` route is completely unauthenticated

[dvla.routes.js](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/routes/dvla.routes.js)

The `/api/v1/dvla/lookup/:reg` endpoint has **no authentication middleware** and **no rate limiting**. Anyone on the internet can spam this endpoint to proxy unlimited DVLA API lookups through your server, potentially exhausting your DVLA API quota and racking up costs.

**Fix:** Add at minimum a rate limiter (e.g., `express-rate-limit`) and consider requiring authentication.

---

### H-7: Redis is initialised but never actually used

[redis.js](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/config/redis.js) / [server.js:33](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/server.js#L33)

The server calls `getRedisClient()` at startup, but Redis is never used anywhere in the codebase — no caching, no session storage, no rate limiting. This means:
- Redis is a hard runtime dependency for no reason (startup fails if Redis is down)
- The DVLA API responses are not cached (despite Redis being documented for this)

**Recommendation:** Either implement DVLA response caching as intended, or make Redis truly optional to avoid blocking startup.

---

## 🟡 Medium Severity Issues

### M-1: `Button` from react-native still imported in `LoginScreen.tsx` and `RegisterScreen.tsx`

Both files import `Button` from react-native but never use it (the UI uses `TouchableOpacity` for buttons). This is a dead import.

---

### M-2: No `updated_at` timestamps on any table

None of the 6 database tables have an `updated_at` column. This makes it impossible to track when records were last modified — critical for audit trails in a "verified digital ledger" application. The `service_records` and `work_items` tables especially need this for the admin verification workflow.

---

### M-3: `uploads` directory not auto-created

[upload.js:10](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/middlewares/upload.js#L10)

```js
destination: path.join(__dirname, '../../public/uploads')
```

If `public/uploads/` does not exist, multer will crash with an `ENOENT` error on first upload. The directory should be created at startup with `fs.mkdirSync(..., { recursive: true })`.

---

### M-4: `VehicleDetailsScreen.tsx` still uses inline UK plate styling instead of `UKNumberPlate` component

[VehicleDetailsScreen.tsx:149-154](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/screens/VehicleDetailsScreen.tsx#L149-L154)

This screen was not refactored during Phase 3, so it still renders the UK plate with 25+ lines of inline View/Text/StyleSheet. The `UKNumberPlate` component exists but isn't used here.

---

### M-5: No input validation on admin endpoints

[adminController.js](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/adminController.js)

The `reviewV5` and `verifyWorkItem` endpoints validate status values manually with `if (!['APPROVED', 'REJECTED'].includes(status))`, but don't use the Joi validation middleware that protects auth routes. `admin_note` and `rejection_reason` have no length limits — a malicious admin could submit megabytes of text.

---

### M-6: `addVehicle` in `vehicleController.js` doesn't validate the registration format

[vehicleController.js:34-36](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/controllers/vehicleController.js#L34-L36)

The only check is `if (!registration_number)` — there is no validation on format (e.g., UK plate regex). Users could insert any arbitrary string as a registration number.

---

### M-7: `crossPlatformAlert` web confirm logic is fragile

[alert.ts:26-31](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/utils/alert.ts#L26-L31)

When `buttons.length > 1`, the function uses `window.confirm()` and assumes the "action" button is any button that isn't `cancel`. But if both buttons have `style: 'default'`, the logic breaks — `cancelButton` and `actionButton` could point to the same button.

---

### M-8: No `try/catch` around `vehicle.registrationNumber.toUpperCase()` in `HomeScreen`

If a vehicle somehow has a `null` or `undefined` `registrationNumber`, the app will crash. Defensive coding should guard this.

---

### M-9: `store.ts` persists the `api` cache via `redux-persist`

[store.ts:14](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/store/store.ts#L14)

```ts
whitelist: ['vehicles', 'auth'],
```

While the whitelist correctly excludes the API cache, the `apiSlice.reducerPath` (`'api'`) is still in the combined root reducer. If the whitelist were accidentally changed to include `'api'`, stale cached data (e.g., old admin reports) would persist across app restarts. Consider adding a `blacklist` for the API slice explicitly.

---

### M-10: Password validation regex in `RegisterScreen.tsx` differs from backend

[RegisterScreen.tsx:25](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/screens/RegisterScreen.tsx#L25)

```tsx
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
```

The frontend requires a **lowercase** letter (`(?=.*[a-z])`), but the backend's Joi regex only requires uppercase + digit:

```js
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
```

This means a password like `HELLO123` would pass the backend but be rejected by the frontend. The regexes should be identical.

---

## 🔵 Low Severity Issues

### L-1: Unused import `RenderItemParams` was removed from `HomeScreen` but `TextInput` is still imported and now unused

Since `HomeScreen` now uses `InputField`, the `TextInput` import from react-native is dead code.

---

### L-2: `RegisterScreen.tsx` and `LoginScreen.tsx` still import `Button` from react-native

Both files import `Button` from `react-native` on line 2, but neither screen uses it. These should be cleaned up.

---

### L-3: Missing `'use strict'` in `reportController.js`

All other backend files consistently use `'use strict'`, but the newly created `reportController.js` omits it.

---

### L-4: `cronJobs.js` report functions don't return on error

[cronJobs.js:42-44](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/jobs/cronJobs.js#L42-L44)

```js
} catch (err) {
  console.error('[cron] Error running daily report:', err);
}
```

When called from the `reportController`, this silently swallows the error and returns `undefined`, which the controller then serves as `{ report: undefined }`. The function should re-throw errors so the controller can return a 500.

---

### L-5: `VehicleDetailsScreen` uses hardcoded `editBtn` padding values instead of theme spacing

[VehicleDetailsScreen.tsx:352-353](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/screens/VehicleDetailsScreen.tsx#L352-L353)

```ts
paddingHorizontal: 12,
paddingVertical: 6,
```

---

### L-6: `errorHandler.js` regex for extracting constraint field name can be improved

[errorHandler.js:49-51](file:///d:/AntiGrav/Projects/AutoServicePal/apps/backend/src/middlewares/errorHandler.js#L49-L51)

The regex `err.detail.match(/Key \((.+?)\)/)` captures the column name from PostgreSQL error details. This works, but it may also capture composite key names (e.g., `owner_id, registration_number`) without proper formatting for the user.

---

### L-7: Magic numbers in `imageCompressor.ts`

[imageCompressor.ts:12-13](file:///d:/AntiGrav/Projects/AutoServicePal/apps/mobile-web/src/utils/imageCompressor.ts#L12-L13)

```ts
[{ resize: { width: 1024 } }],
{ compress: 0.7, format: ... }
```

The 1024px width and 0.7 quality values should be configurable constants.

---

### L-8: `theme.ts` does not provide a light mode fallback

The theme is hardcoded to dark mode. While this is fine for MVP, the theme system should be designed to support both themes. A `lightTheme` export or a `useColorScheme()` hook integration would future-proof this.

---

## Architecture Observations

### Positive Patterns ✅
- **Joi validation middleware** is well-structured and DRY
- **Transaction usage** in admin and vehicle controllers is correct and consistent
- **Error handler** properly sanitises errors in production vs development
- **JWT secret length validation** at startup (>= 32 chars) is a good security measure
- **Email enumeration prevention** — both login and forgot-password return generic messages
- **Fire-and-forget email pattern** correctly avoids blocking HTTP responses on email delivery
- **Redux Toolkit + RTK Query** is a solid state management pattern
- **Cross-platform alert utility** is a thoughtful abstraction

### Areas for Improvement 🔧
- **No test suite exists** — there are zero test files anywhere in the repository
- **No API rate limiting** — outside of the login lockout, there's no general rate limiting
- **No request logging per user** — `morgan` logs requests but doesn't capture `userId` for audit
- **No pagination** — `getServiceHistory`, `getVehicles`, and `getPendingReviews` all return unbounded result sets
- **No HTTPS enforcement** — the backend doesn't redirect HTTP→HTTPS or set HSTS headers
- **The `public/uploads` path exposes files without auth** — uploaded V5 documents and proofs stored at predictable URLs are accessible to anyone who can guess the filename
