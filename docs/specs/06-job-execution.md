# 06 · Job Execution

**Depends on:** [04 · Assignment](./04-assignment-and-dashboard.md)
**Blocks:** [07 · Spare Parts](./07-spare-parts.md), [08 · Wallet](./08-wallet-and-payments.md)

---

This is the core of the app: what happens between an engineer arriving at a customer's door and money changing hands.

---

## Arrival check-in

When the engineer reaches the site, they change the job status to **Arrived**. The check-in is not a button press — it requires proof.

### What is captured

| Item | Source | Required |
|---|---|---|
| Selfie | **Camera only, front-facing** | Yes |
| GPS coordinates | Device location | Yes |
| Accuracy radius | Device location | Yes |
| Device timestamp | Device clock | Yes |
| Server timestamp | Server | Yes — recorded independently |
| Reverse-geocoded address | Geocoding service | Best effort |
| Distance from site | Computed | Where the ticket has coordinates |

### The selfie

- **Front camera, live capture only.** No gallery, no file picker. This is the one place where gallery upload must be impossible, because the entire value of the selfie is that it was taken at that place at that time.
- Face detection before accepting — reject an image with no visible face and ask again
- Compressed before upload, long edge around 1200px
- Shown to administrators on the job record alongside the location

### The location pin

- Request permission with a clear explanation on first use. **Foreground location only** — the app does not need background tracking and asking for it will cost Play Store review friction and engineer trust.
- Require an accuracy threshold — around 100 metres — before accepting. If the fix is poor, show "Getting a better location…" and retry rather than recording a useless point.
- If the ticket has customer coordinates, compute the distance and flag a check-in beyond **500 metres** (configurable) for administrator attention — **decided by the owner**. **Flag, do not block** — addresses are wrong, GPS drifts indoors, and blocking an engineer at the door is worse than a flag someone reviews.
- If location cannot be obtained at all, allow check-in with a recorded reason and mark it unverified.

### On the admin panel

The check-in appears on the call ticket as a map pin with the selfie, the timestamp, the accuracy radius, the distance from the customer address, and a lateness figure against `scheduledAt`. This is what the request for "pin the location to admin panel show" means in practice — the office needs to see, at a glance, that the engineer really was where and when they said.

### Anti-fraud, honestly

Mock location applications exist and are not difficult to use. Available mitigations:

- Read the platform's mock-location flag and record it — Android exposes this
- Record device time and compare against server time; a large skew is suspicious
- Store accuracy radius; a suspiciously perfect fix indoors is a signal
- Treat check-ins as evidence for review, never as an automatic gate

**Do not build this as a security control.** It is an accountability record. A determined engineer can defeat it; an honest one is protected by it when a customer disputes whether anyone turned up.

---

## Step-by-step workflow

After arrival, the job proceeds through steps. Each step is recorded with a timestamp, optional notes, optional photographs, and — critically — an amount.

### Step template

Steps come from a **template chosen by service type**, maintained by administrators, so an installation and a gas charging job do not present the same checklist. Each template step defines:

| Field | Notes |
|---|---|
| `name` | "Diagnose fault", "Install indoor unit", "Test and demonstrate" |
| `order` | Sequence |
| `requiresPhoto` | Forces at least one photograph before the step can complete |
| `requiresNote` | Forces text |
| `isChargeable` | Whether this step can carry an amount |
| `isOptional` | Can be skipped, with a reason |

A generic default template covers service types with none defined: Verify product → Diagnose → Perform work → Test → Customer confirmation.

**The product-verification step comes first, immediately after arrival.** The engineer photographs the unit and its nameplate, corrects the product record, and checks the purchase bill to establish warranty — which decides who pays, and therefore has to be settled before work begins rather than after. Specified in full in [12 · Product Details & Documents](./12-product-details.md).

### Recording a step

For each step the engineer records completion, notes, photographs, and where chargeable, a service line and amount. This maps onto the existing `engineerServices` array on the call ticket — `{ serviceName, amount, remarks }` — which the current portal already populates. Service names should come from the existing `/api/service-items/dropdown` rather than free text, so the office can reconcile them against the item master.

Photographs go to the existing `service_images` array through the existing upload endpoint — which needs a `category` field added before this works, since product, nameplate, bill and service photographs would otherwise land in one undifferentiated pile. See [12](./12-product-details.md).

---

## Amount revisions

> *"for all steps need to user change the amount"*

Interpreted as: **the chargeable amount is not fixed at assignment; it is built up and revised as the engineer discovers what the job actually needs.** A technician arrives expecting a service, finds a failed compressor, and the price changes.

### The rule that matters

Every change to the amount is an **append-only revision**, never an edit in place.

| Field | Notes |
|---|---|
| `revisionNumber` | Sequential |
| `previousTotal`, `newTotal` | Both recorded |
| `delta` | Computed |
| `reason` | **Mandatory** |
| `stepId` | Which step prompted it |
| `changedBy`, `changedAt` | Audit |
| `approvalRequired`, `approvedBy`, `approvedAt` | See below |

The customer is being asked to pay more than they were quoted. When that is later disputed — and it will be — the office needs the sequence of what changed, when, and why.

### Approval

An increase should require approval before the engineer can collect on it. Two candidate policies:

**Policy A — any increase needs office approval.** Safest, slowest. The engineer waits at the customer's house for someone at a desk to respond.

**Policy B — increases within a threshold are recorded and proceed; beyond it, approval is required.** Practical. The threshold can be a fixed amount, a percentage, or both.

**Decided (owner): Policy B**, with the threshold configurable and defaulting low — the actual value is still open, see [11 · Open Questions](./11-open-questions.md). The **customer** must see and accept the revised amount on the engineer's screen — a simple confirmation the engineer shows and the customer agrees to, recorded with a timestamp. The existing estimate-approval flow (`approveCallEstimate` / `rejectCallEstimate`, with `estimateStatus` moving through `Pending_Approval` → `Approved`) already models office approval and should be reused rather than duplicated.

---

## Job completion

Completion requires, in order:

1. All non-optional steps complete
2. Final amount confirmed, with every revision approved where required
3. At least one service photograph — carried over from current practice
4. Serial number recorded, where the service type requires it. The current portal already asks for this, prompting the engineer to read the label on the back or bottom of the machine, and the schema has `serialNumber` plus separate indoor and outdoor unit fields (`iduser`, `oduser`).
5. Customer confirmation — **decided (owner): on-screen signature**, not OTP. Simpler, and it works offline.
6. Payment recorded — see [08 · Wallet](./08-wallet-and-payments.md)

Then the job moves to `payment_collected`, and on to `completed`. The engineer's ID card for it expires, and the job becomes read-only to them.

**The engineer still cannot close or cancel the job.** That restriction is already enforced server-side and stays. `completed` here means the engineer's work is done; the office closes the ticket.

---

## Offline behaviour

Every part of this must work without a connection. An engineer in a basement plant room has no signal and cannot wait for one.

| Action | Offline behaviour |
|---|---|
| Arrival check-in | Captured and queued. GPS works without a data connection. |
| Selfie | Stored locally, queued for upload |
| Step completion | Queued |
| Photographs | Stored locally, queued, uploaded separately from the step record |
| Amount revision | Queued. If it needs approval, the engineer is told approval is pending and cannot collect on it yet. |
| Customer signature | Captured locally, queued |
| Payment record | Queued |
| ID card | Rendered from cache |

**Ordering is preserved.** Steps sync in the order they were recorded. A check-in that reaches the server after the completion it preceded would corrupt the timeline, so the queue drains strictly in sequence per job.

**Each queued write carries an idempotency key.** The current update endpoint appends to `activityLogs` on every call, so a retried request writes a duplicate audit entry. Without idempotency, poor connectivity produces a job history full of duplicates.

---

## Screens

| Screen | Purpose |
|---|---|
| Job detail | Customer, site, machine, warranty, history, current state, primary action |
| Arrival check-in | Selfie capture, location acquisition, confirm |
| Step list | Progress through the template, each step's state, next action |
| Step detail | Notes, photographs, chargeable amount |
| Amount revision | Previous, new, reason, customer confirmation |
| Spare request | See [07](./07-spare-parts.md) |
| Completion | Summary, signature, payment method |
| Photo gallery | Everything captured on this job |

---

## Rules

1. Arrival requires a live front-camera selfie and a GPS fix, or a recorded reason for their absence.
2. Location is flagged when far from the site, never blocked.
3. Amounts are revised by append-only revisions, each with a mandatory reason.
4. An increase beyond the configured threshold requires approval before collection.
5. The customer confirms any revised amount on screen.
6. Non-optional steps must complete before the job can.
7. Every step, photograph and revision is queued offline and synced in order, with idempotency keys.
8. Engineers cannot close or cancel a job.
9. Completed jobs are read-only to the engineer.
