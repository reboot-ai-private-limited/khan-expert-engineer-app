# 10 · API Contract

Every endpoint the app needs. **Existing** means it works today and can be called as-is. **Modify** means it exists but must change. **New** means it does not exist.

Base path `/api`. Authenticated requests send `Authorization: Bearer <token>`.

---

## Summary

| Status | Count |
|---|---|
| Existing, usable as-is | 7 |
| Existing, needs modification | 4 |
| New | 51 |

The proportion is the honest measure of this project's size: roughly **nine in ten** of the endpoints this app needs do not exist yet.

---

## Authentication & registration

| Method | Path | Status | Notes |
|---|---|---|---|
| POST | `/engineer-auth/login` | **Modify** | Must return `accountStatus` so the app can route. Must be rate-limited — it is not today. |
| GET | `/engineer-auth/profile` | **Modify** | Extend with the new profile, KYC states and skills |
| POST | `/engineer-auth/logout` | New | Invalidate the refresh token |
| POST | `/engineer-auth/refresh` | New | Rotate the access token. Depends on moving off the current 30-day non-refreshable token. |
| POST | `/engineer-auth/otp/send` | New | Registration and password reset. Rate-limited per identifier and per IP. |
| POST | `/engineer-auth/otp/verify` | New | |
| POST | `/engineer-auth/register` | New | Create a `draft` application |
| PUT | `/engineer-auth/register/:step` | New | Save one step; keeps the draft resumable |
| POST | `/engineer-auth/register/submit` | New | `draft` → `pending_approval` |
| GET | `/engineer-auth/application-status` | New | Per-item states and rejection reasons |
| POST | `/engineer-auth/forgot-password` | New | OTP to the registered phone |
| POST | `/engineer-auth/reset-password` | New | |
| POST | `/engineer-auth/change-password` | New | **Nothing in the codebase lets an engineer set their own password today.** |
| POST | `/engineer-auth/device-token` | New | Register an Expo push token |
| DELETE | `/engineer-auth/device-token` | New | On logout |

## KYC

| Method | Path | Status | Notes |
|---|---|---|---|
| POST | `/engineer-auth/kyc/:documentType` | New | Upload. **Private storage with signed URLs, not the public folder job photos use.** |
| GET | `/engineer-auth/kyc` | New | Own documents, masked values and thumbnails |
| DELETE | `/engineer-auth/kyc/:documentType` | New | Only while `pending` or `rejected` |
| PUT | `/engineer-auth/bank-details` | New | Resets verification to `pending` |

## Skills

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/skills/dropdown` | New | Grouped by category. Follows the existing dropdown convention. |
| GET | `/skills` | New | Admin list — `general_masters:view` |
| POST | `/skills` | New | `general_masters:create` |
| PUT | `/skills/:id` | New | `general_masters:edit` |
| DELETE | `/skills/:id` | New | Deactivate only |
| POST | `/engineer-auth/skills` | New | Engineer requests additions or removals |
| GET | `/service-type-skills` | New | The service-type → required-skill map |
| PUT | `/service-type-skills/:id` | New | Admin maintains it |

## Jobs — engineer-facing

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/engineer-calls` | **Modify** | Fix the `$or` overwrite that drops the closed filter on search (B2); scope by `engineerId` not name (B1); replace the second full-collection query with an aggregation (B6); add `?since=` for delta sync. **Add a route guard** — the router has none (B3). |
| GET | `/engineer-calls/:id` | New | Single job. Needed for push deep links and post-sync refresh. |
| PUT | `/engineer-calls/:id` | **Modify** | Unconditional ownership check (B3); accept an idempotency key so retries do not duplicate `activityLogs` entries. |
| POST | `/engineer-calls/:id/upload-image` | **Modify** | Delete the temp file after upload (B4); validate MIME type; accept `category`, `caption` and `stepId`, and route bills and warranty cards to private signed-URL storage. |
| POST | `/engineer-calls/:id/accept` | New | `assigned` → `accepted` |
| POST | `/engineer-calls/:id/start-travel` | New | Optional state |
| GET | `/engineer-calls/history` | New | Completed jobs, read-only. The server hides closed tickets from engineers entirely today. |
| GET | `/engineer-calls/summary` | New | Dashboard counts, as an aggregation |

## Check-in

| Method | Path | Status | Notes |
|---|---|---|---|
| POST | `/engineer-calls/:id/check-in` | New | Selfie, coordinates, accuracy, device time. Server records its own timestamp and computes distance. |
| GET | `/engineer-calls/:id/check-in` | New | For display |

## Steps & amounts

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/step-templates/:serviceTypeId` | New | Falls back to the default template |
| POST | `/engineer-calls/:id/steps/:stepId/complete` | New | Notes, photos, chargeable amount |
| POST | `/engineer-calls/:id/steps/:stepId/skip` | New | Reason mandatory |
| POST | `/engineer-calls/:id/amount-revision` | New | Append-only. Reason mandatory. Returns whether approval is required. |
| POST | `/engineer-calls/:id/amount-revision/:revId/customer-confirm` | New | Customer accepted the revised figure |
| PUT | `/calls/:id/amount-revision/:revId/approve` | New | Admin. Mirrors the existing estimate-approval flow. |
| POST | `/engineer-calls/:id/complete` | New | Signature, final amount, payment mode. **Runs in a transaction.** |

## Product details & warranty

| Method | Path | Status | Notes |
|---|---|---|---|
| PUT | `/engineer-calls/:id/product-details` | New | Corrected product fields, each with its source and evidence image. Append-only corrections. |
| GET | `/engineer-calls/:id/product-history` | New | Corrections made, for the office |
| POST | `/engineer-calls/:id/warranty-check` | New | Records status, bill images and reason; returns the computed suggestion |
| GET | `/engineer-calls/:id/images` | New | Job images filtered by category; signed URLs for private categories |
| GET | `/warranties/dropdown` | **Existing** | Warranty terms master — cache at login for offline warranty computation |

## Spare parts

| Method | Path | Status | Notes |
|---|---|---|---|
| POST | `/spare-requests` | New | Raise; moves the job to `awaiting_spare` |
| GET | `/spare-requests` | New | Engineer's own; admin sees all |
| GET | `/spare-requests/:id` | New | |
| POST | `/spare-requests/:id/confirm-receipt` | New | Resumes the job, records stock movement |
| PUT | `/spare-requests/:id/status` | New | Admin: acknowledge, reserve, dispatch, reject |
| GET | `/service-items/availability` | New | Stock across godowns. **Advisory until the stock arithmetic is fixed.** |

## Wallet

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/wallet/balance` | New | Derived from the ledger, never a stored number |
| GET | `/wallet/ledger` | New | Paginated, filterable |
| GET | `/wallet/ledger/:id` | New | Full calculation breakdown |
| GET | `/wallet/earnings` | New | Day, week, month summaries |
| POST | `/wallet/settlement` | New | Engineer initiates; creates a `pending` settlement. **Does not move the balance.** |
| GET | `/wallet/settlements` | New | |
| POST | `/wallet/settlement/:id/confirm-receipt` | New | Engineer confirms a payout arrived |
| GET | `/wallet/payment-qr` | New | The company's static QR, cacheable for offline use |
| POST | `/engineer-calls/:id/payment` | New | Record collection. **Creates the ledger entry server-side, in a transaction.** |

## Admin-facing

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/engineers/applications` | New | Approval queue |
| GET | `/engineers/:id/application` | New | Full submission with signed document URLs. **Logs the view.** |
| PUT | `/engineers/:id/kyc/:documentType/verify` | New | Verify or reject with a reason |
| PUT | `/engineers/:id/approve` | New | |
| PUT | `/engineers/:id/request-changes` | New | Per-item reasons |
| PUT | `/engineers/:id/reject` | New | |
| PUT | `/engineers/:id/activate` | New | Separate from approve, deliberately |
| PUT | `/engineers/:id/suspend` | New | |
| GET | `/engineers/available` | New | Assignment picker with skill, route and workload |
| PUT | `/calls/:id/assign` | New | Assign with `scheduledAt`; records a skill override |
| PUT | `/calls/:id/reassign` | New | Reason mandatory; revokes the previous ID card |
| GET | `/wallet/admin/balances` | New | All engineers, with owed and owing totals |
| PUT | `/wallet/settlement/:id/confirm` | New | **Moves the balance.** Requires a new explicit permission. |
| POST | `/wallet/admin/adjustment` | New | Adjustment, penalty, bonus. Reason mandatory. |
| GET | `/commission-rules` · POST · PUT | New | Versioned by date, never edited in place |

## ID card

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/engineer-calls/:id/id-card` | New | Card data, cacheable for offline display |
| GET | `/verify-card/:token` | New | **Public, unauthenticated, rate-limited.** Returns only photo, name, validity, scheduled date and area. Never the customer's address or phone, never financials. |

## Existing, usable as-is

| Method | Path |
|---|---|
| GET | `/job-statuses/dropdown` |
| GET | `/service-items/dropdown` |
| GET | `/brands/dropdown` |
| GET | `/products/dropdown` |
| GET | `/parties/dropdown` |
| POST | `/calls/:id/engineer-note` |

---

## Cross-cutting requirements

**Idempotency.** Every mutating engineer endpoint accepts an `Idempotency-Key` header. The server records processed keys and returns the original response on a repeat. Without this, an offline queue draining over poor connectivity produces duplicate `activityLogs` entries and — far worse — duplicate wallet entries.

**Rate limiting.** `express-rate-limit` is installed and applied only to the public website-lead endpoints. It must also cover both login routes, OTP send and verify, and the public card-verification endpoint.

**Authorisation.** Every engineer endpoint restricts to the engineer role and checks ownership **unconditionally**. The current `engineerCallRoutes` applies neither, and its controller checks ownership only when the role is literally `engineer` — so any authenticated account can edit any ticket through it. That pattern must not be repeated in any endpoint above, and it must be fixed in the ones that exist.

**Transactions.** Job completion, payment recording and settlement confirmation each write several documents. They run in a MongoDB transaction or they will eventually leave money unaccounted for. Confirm the deployment runs a replica set.

**Response envelope.** Keep the existing `{ success, message, ... }` shape throughout. It is consistent across the current codebase and the app can rely on it.

**Errors.** The backend has no error-handling middleware; controllers return `error.message` directly, which leaks internals. Add central error handling and map to stable codes the app can branch on rather than matching message strings.
