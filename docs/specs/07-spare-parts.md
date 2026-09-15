# 07 · Spare Parts

**Depends on:** [06 · Job Execution](./06-job-execution.md)

---

## The situation

An engineer opens a unit, finds a failed capacitor, and does not have one. The job stops. Today this ends as a telephone call to the office and a job sitting in "Pending Parts" with no record of what is actually needed.

The app should capture the request properly, so the office can fulfil it and the engineer can get back to the customer.

---

## What already exists

The CRM has more of this than it might appear:

- **`ServiceItem`** — the item master, carrying `currentStock` and a `stockHistory` array
- **`Godown`** — warehouses, with a dropdown endpoint
- **`PurchaseInvoice`** — purchases from suppliers
- **Stock deduction** on billing, in `paymentInvoiceController`
- **"Pending Parts"** — already a sub-status option in the engineer portal

What is missing is the request itself: a record connecting "this job is blocked on this part" to "someone fulfilled it".

**Two existing defects matter here.** Stock is deducted on billing but never restored when an invoice is deleted, and purchases never increment stock at all — so `currentStock` only ever falls and is already unreliable. Spare requests that check availability against that number will mislead engineers. Fix the stock arithmetic before showing engineers stock levels, or show availability as advisory only.

---

## Raising a request

From the step screen, the engineer reports a shortage. The job moves to `awaiting_spare`.

| Field | Type | Rules |
|---|---|---|
| Item | Picker from `/api/service-items/dropdown` | Required. Searchable. |
| Item not in the list | Text | Escape hatch — free text plus a photograph. Flags the item master as incomplete. |
| Quantity | Number | Required, minimum 1 |
| Urgency | Choice | Immediate (customer waiting) · Today · Next visit |
| Reason | Text | Required. What failed and why this part. |
| Photographs | Camera | Strongly encouraged — a photograph of the failed part and its rating label is how the office identifies the right replacement |
| Part number | Text | Optional, read off the component |
| Customer waiting | Toggle | Drives urgency in the admin queue |

On submission: the job pauses, the customer-facing state becomes "Awaiting parts", and administrators are notified — immediately by push where the urgency is Immediate.

---

## Request states

| State | Meaning |
|---|---|
| `requested` | Engineer raised it |
| `acknowledged` | Office has seen it |
| `in_stock` | Available in a godown, ready for collection or dispatch |
| `ordered` | Not in stock; being purchased |
| `dispatched` | On its way to the engineer |
| `delivered` | Engineer has it |
| `rejected` | Office declined, with a reason |
| `cancelled` | No longer needed |

The engineer sees this on the job and in a dedicated spares list. Every state change notifies them — an engineer who does not know a part arrived leaves the customer waiting an extra day.

---

## Fulfilment, admin side

A queue ordered by urgency, then age, showing the job, customer, item, quantity, and whether the customer is waiting.

For each request the administrator can:

- Check stock across godowns and **reserve** the item
- Mark it for collection from a named godown
- Dispatch it to the engineer
- Raise a purchase if it is not in stock, ideally linking to the existing purchase-invoice flow
- Reject it with a reason
- Substitute a different item, with a note

**Reservation matters.** Two engineers requesting the last compressor should not both be told it is available. Reserving decrements available stock without deducting it from inventory — which requires a `reservedQty` concept the item master does not have today.

---

## Resuming the job

When the part reaches the engineer they confirm receipt, which records the delivery and returns the job to `in_progress`.

- If the part changes the price, the engineer raises an **amount revision** as in [06](./06-job-execution.md) — the part is chargeable and the customer agreed to a different figure
- A new visit usually means a new `scheduledAt`, set by the office, which extends the ID card validity
- The original arrival check-in stands; a second visit records its own check-in

### Stock movement

When an engineer confirms receipt, stock should move out of the godown and onto the engineer. That implies **engineer-held stock** — a van stock concept — which does not exist today.

Two options:

**Option A — deduct on delivery.** Simple. Stock leaves the godown when the engineer takes it. Inaccurate if the part is not used and comes back, which is common.

**Option B — engineer stock ledger.** Parts move godown → engineer → job, with returns. Accurate, and it tells you what each engineer is carrying. Considerably more work, and it needs a reconciliation process.

**Decided (owner): Option A**, with unused parts returned by an admin adjustment. No engineer stock ledger for the first release.

---

## Screens

| Screen | Purpose |
|---|---|
| Raise request | Item picker, quantity, urgency, reason, photographs |
| Request status | State, expected availability, office notes |
| My spare requests | All open requests across jobs |
| Confirm receipt | Acknowledge delivery, quantity received, resume the job |

---

## Offline

Requests queue like everything else. An engineer in a basement raises the request, and it sends when signal returns.

The one thing that cannot work offline is **live stock availability**. Show the last cached figure with its age, clearly marked as possibly stale, and never promise availability the app cannot confirm.

---

## Rules

1. Raising a spare request moves the job to `awaiting_spare`.
2. Item selection comes from the master; free text is an exception that flags the master as incomplete.
3. A reason is mandatory.
4. Every state change notifies the engineer.
5. Reserved stock is not available to another request.
6. Confirming receipt resumes the job and records stock movement.
7. A part that changes the price requires an amount revision, with customer confirmation.
8. Stock availability shown offline is marked as cached, with its age.
