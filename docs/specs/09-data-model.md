# 09 · Data Model

Schema changes required by these specifications. Field lists are indicative, not final — they exist so the size and shape of the work is visible before it starts.

---

## Changes to existing collections

### `Engineer` — substantially extended

Today: `name`, `phone`, `email`, `password`, `route`, `status`. Six fields. It becomes the core identity record.

| Field | Type | Notes |
|---|---|---|
| `engineerCode` | String, unique | Human-readable, e.g. `KET-ENG-0142`. For the ID card. |
| `accountStatus` | Enum | Replaces `status`. See [01](./01-auth-and-registration.md). |
| `registrationSource` | Enum | `admin_created` · `self_registered` |
| `dateOfBirth` | Date | |
| `gender` | Enum, optional | |
| `fatherOrSpouseName` | String, optional | |
| `alternatePhone` | String, optional | |
| `phoneVerified` | Boolean | OTP-verified at registration |
| `photoUrl` | String | Profile photograph |
| `currentAddress` | Object | line1, line2, city, district, state, pincode, landmark |
| `permanentAddress` | Object | Same shape; `sameAsCurrent` boolean |
| `preferredRoutes` | [String] | Replaces the single `route` string |
| `languages` | [String] | |
| `yearsOfExperience` | Number, optional | |
| `skills` | [Object] | `{ skillId, status, proficiency?, certificateUrl?, addedAt, approvedBy }` |
| `kyc` | Object | See below |
| `bankDetails` | Object | See below |
| `consent` | Object | `{ version, acceptedAt, ipAddress }` |
| `approvedBy`, `approvedAt` | — | |
| `rejectionReason` | String | |
| `suspendedReason`, `suspendedAt` | — | |
| `walletBalance` | Number | **Cached, derived value for display only.** The ledger is authoritative. |
| `pushTokens` | [Object] | `{ token, platform, deviceId, updatedAt }` |
| `lastActiveAt` | Date | |

**`kyc` sub-document**

| Field | Notes |
|---|---|
| `aadhaar` | `{ lastFourDigits, nameOnCard, frontImageId, backImageId, status, rejectionReason, verifiedBy, verifiedAt }` — **the full number is never stored** |
| `pan` | `{ number, nameOnCard, imageId, status, ... }` |
| `addressProof` | `{ documentType, imageId, issueDate, status, ... }` |
| `drivingLicence` | Optional, same shape |

**`bankDetails` sub-document**

`accountHolderName`, `accountNumber` (encrypted), `ifsc`, `bankName`, `branch`, `upiId`, `chequeImageId`, `status`, `verifiedBy`, `verifiedAt`.

**Migration.** Existing engineers map to `accountStatus: 'active'`, `registrationSource: 'admin_created'`, `preferredRoutes: [existing route]`, and KYC states of `not_uploaded`. They keep working, but cannot be assigned under the new rules until KYC is completed — so the activation gate needs a grandfathering flag, or a deadline after which it applies. **This needs a decision.**

---

### `CallDetails` — the assignment link and workflow state

| Field | Type | Notes |
|---|---|---|
| `engineerId` | ObjectId ref | **Blocker B1.** Replaces matching on the `engineer` name string. Backfill by name, keep `engineer` for display. |
| `scheduledAt` | Date | The appointment. Distinct from the existing `visitdate` / `etaDate` / `gddate`. |
| `workflowState` | Enum | The states in [04](./04-assignment-and-dashboard.md). Coexists with `jobStatus` / `subStatus`, which the server derives so the web CRM keeps working. |
| `assignment` | Object | `{ assignedBy, assignedAt, skillMatched, overrideReason, reassignedFrom[] }` |
| `checkIn` | Object | `{ selfieImageId, latitude, longitude, accuracy, deviceTime, serverTime, address, distanceFromSite, mockLocationDetected, verified }` |
| `siteLocation` | Object, optional | Customer coordinates, for the distance check |
| `steps` | [Object] | `{ templateStepId, name, order, status, completedAt, notes, photoIds[], chargeableAmount, skippedReason }` |
| `amountRevisions` | [Object] | `{ revisionNumber, previousTotal, newTotal, delta, reason, stepId, changedBy, changedAt, approvalRequired, approvedBy, approvedAt, customerConfirmedAt }` |
| `customerSignature` | Object | `{ imageId, signedAt, signedBy }` |
| `payment` | Object | `{ mode, amount, reference, screenshotId, verificationStatus, verifiedBy, verifiedAt }` |
| `spareRequests` | [ObjectId] | References |
| `productDetails` | Object | Capacity, star rating, installation date, dealer name, bill number, bill amount — the fields the schema lacks. See [12](./12-product-details.md). |
| `productCorrections` | [Object] | `{ field, previousValue, newValue, source, evidenceImageId, correctedBy, correctedAt }` — append-only |
| `warrantyCheck` | Object | `{ status, computedStatus, billImageIds[], purchaseDate, reason, checkedBy, checkedAt, confirmedBy }` |

`engineerServices`, `activityLogs`, `engineerNotes`, `serialNumber`, `iduser`, `oduser`, `modelNumber`, `brandName`, `productsName`, `dateofPurchase`, `warrantyTerms`, `warrantyYears` and `warrantyEndDate` already exist and are reused as-is.

**`service_images` must be extended.** Today it is `[{ public_id, secure_url }]` — no category, no metadata. Every photograph an engineer takes lands in one flat array, which becomes unusable once product, nameplate, bill, warranty-card, unit and fault photographs are added. Extend each entry with `category`, `caption`, `stepId`, `capturedAt`, `uploadedAt`, `uploadedBy` and `sortOrder`. Existing rows migrate to `category: 'service'`, so nothing that reads the array today breaks. The arrival selfie should become a category here rather than a separate field, giving one image pipeline instead of two.

**Storage routes by category.** Bills and warranty cards carry the customer's name, address and what they paid; they go to private storage with signed URLs, not the public `khanexperttech/services` folder used today.

---

### `ServiceItem` — reservation

| Field | Notes |
|---|---|
| `reservedQty` | Reserved against open spare requests but not yet issued |
| `availableQty` | Derived: `currentStock − reservedQty` |

**Prerequisite:** `currentStock` is currently unreliable — it is decremented on billing, never restored on invoice deletion, and never incremented by purchases. Fix the arithmetic before engineers are shown stock figures.

---

## New collections

### `Skill`

`name`, `code`, `category`, `description`, `requiresCertification`, `isActive`, `sortOrder`. See [03](./03-skills.md).

### `ServiceTypeSkillMap`

`serviceTypeId`, `requiredSkillIds[]`, `isActive`. Connects what a job needs to who can do it.

### `EngineerApplication`

Optional. The registration draft could live on the `Engineer` record with `accountStatus: 'draft'`, or as its own collection.

**Recommendation: on the `Engineer` record.** One identity, one record, and no merge step at approval. A separate collection only pays off if applications are expected in volumes that would pollute the engineer list — which is unlikely here.

Either way the **review history** is its own collection: `{ engineerId, action, fromState, toState, itemsRejected[], reason, actorId, actorRole, timestamp }`.

### `StepTemplate`

`serviceTypeId`, `name`, `isDefault`, `isActive`, and `steps[]` of `{ name, order, requiresPhoto, requiresNote, isChargeable, isOptional }`. See [06](./06-job-execution.md).

### `IdCard`

`engineerId`, `jobId`, `cardNumber`, `verificationToken` (unique, indexed, unguessable), `issuedAt`, `validFrom`, `validUntil`, `status`, `revokedAt`, `revokedReason`, and `verificationLog[]` of `{ scannedAt, ipHash, coarseLocation }`. See [05](./05-id-card.md).

### `SpareRequest`

`jobId`, `engineerId`, `serviceItemId` (or `freeTextItem` plus `photoIds[]`), `quantity`, `urgency`, `reason`, `status`, `godownId`, `reservedAt`, `dispatchedAt`, `deliveredAt`, `receivedQuantity`, `rejectionReason`, `substitutedItemId`, `handledBy`, and a `statusHistory[]`. See [07](./07-spare-parts.md).

### `WalletLedgerEntry`

The most important new collection. **Append-only.**

`engineerId`, `type`, `amount` (signed), `balanceAfter`, `jobId`, `invoiceId`, `paymentMode`, `reference`, `commissionRate`, `commissionBasis`, `status`, `reversalOf`, `createdBy`, `createdAt`, `note`.

Indexes on `{ engineerId, createdAt }` and `{ jobId }`. No update or delete path — corrections are new entries. See [08](./08-wallet-and-payments.md).

### `Settlement`

`engineerId`, `direction` (`engineer_to_company` | `company_to_engineer`), `amount`, `method`, `reference`, `proofImageId`, `status`, `initiatedBy`, `confirmedBy`, `confirmedAt`, `ledgerEntryIds[]`, `note`.

### `CommissionRule`

`scope` (`default` | `service_type` | `engineer` | `service_item`), `scopeId`, `type` (`percentage` | `flat`), `value`, `basis` (`pre_tax` | `post_tax`), `appliesToParts`, `effectiveFrom`, `effectiveTo`, `isActive`.

**Rules are versioned by date and never edited in place**, so historical entries keep the rate that actually applied.

### `DeviceToken`

Could live on the `Engineer` record. Separate is cleaner if one engineer uses several devices: `engineerId`, `token`, `platform`, `deviceId`, `appVersion`, `lastSeenAt`, `isActive`.

### `OtpRequest`

`identifier`, `purpose` (`registration` | `password_reset` | `customer_confirmation`), `codeHash`, `expiresAt`, `attempts`, `consumedAt`, `ipAddress`. Rate-limited per identifier and per IP.

---

## Indexes to add

| Collection | Index | For |
|---|---|---|
| `CallDetails` | `{ engineerId, workflowState }` | The engineer's job list — replaces the name scan |
| `CallDetails` | `{ engineerId, scheduledAt }` | Dashboard and today's schedule |
| `CallDetails` | `{ updatedAt }` | Delta sync |
| `WalletLedgerEntry` | `{ engineerId, createdAt }` | Balance and history |
| `IdCard` | `{ verificationToken }` unique | Public verification lookup |
| `SpareRequest` | `{ status, urgency, createdAt }` | Admin queue |
| `Engineer` | `{ accountStatus }` | Approval queue |
| `Engineer` | `{ 'skills.skillId' }` | Assignment matching |

---

## Migration sequence

1. Add `Skill`, seed it, build the admin master screens
2. Add `ServiceTypeSkillMap`
3. Extend `Engineer`; migrate existing records to `active` / `admin_created`; decide the KYC grandfathering rule
4. **Add `engineerId` to `CallDetails` and backfill from the name strings** — verify every row matches before switching any query over
5. Add `scheduledAt`; decide its relationship to `visitdate` / `etaDate` / `gddate`
6. Add `workflowState`; write and test the mapping to `jobStatus` / `subStatus`
7. Add the job sub-documents — check-in, steps, revisions, payment
8. Extend `service_images` with categories and metadata; migrate existing rows to `category: 'service'`; add the private storage route for bills
9. Add `productDetails`, `productCorrections` and `warrantyCheck`
10. Add `StepTemplate`, seed a default including the product-verification step
11. Add `IdCard`
12. Add `SpareRequest`; fix the `ServiceItem` stock arithmetic; add reservation
13. Add `CommissionRule`, `WalletLedgerEntry`, `Settlement` — last

**Step 4 is the risky one.** Backfilling `engineerId` from names will not match cleanly where names were edited, where engineers were deleted, or where the value is `'Unassigned'`. Produce a reconciliation report of unmatched rows and have someone resolve them by hand before any query depends on the new field.

---

## Transactions

The current backend uses **no MongoDB transactions anywhere**. Invoice creation writes the invoice, stock, the call ticket and the ledger as independent saves, so a mid-sequence failure leaves inconsistent state.

That is already a defect. With a wallet it becomes unacceptable: job completion writes the job state, the payment record, a ledger entry and a stock movement, and a partial failure produces an engineer who has collected money the system has no record of.

**Job completion and settlement confirmation must run inside a transaction.** This requires a MongoDB replica set — confirm the deployment supports it before designing around it.
