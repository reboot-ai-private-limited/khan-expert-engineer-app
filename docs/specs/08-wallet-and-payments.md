# 08 · Wallet & Payments

**Depends on:** [06 · Job Execution](./06-job-execution.md)
**Build last.** This module moves money. It depends on every other module producing trustworthy records, and it is the hardest thing here to correct after the fact.

---

## The problem in one paragraph

An engineer finishes a job worth ₹2,000. If the customer pays **cash**, the engineer is holding company money and owes most of it back. If the customer pays **online** into the company's account, the company is holding the engineer's commission and owes it to them. Either way a balance accumulates between the two, and it is settled periodically. The wallet is the record of that balance.

---

## Sign convention — fix this before writing any code

Every balance in this system is stated **from the engineer's point of view**:

| Balance | Meaning |
|---|---|
| **Positive** | The company owes the engineer |
| **Negative** | The engineer owes the company |
| **Zero** | Settled |

One convention, used everywhere — schema, API, admin panel, app. Most bugs in systems like this come from two halves of the codebase disagreeing about which way the sign points.

In the app the raw sign is never shown to the engineer. It renders as:

- Positive → **"₹400 to receive"**
- Negative → **"₹1,600 to pay"**

Engineers should not have to reason about signs, and "your balance is −₹1,600" invites exactly the wrong reading.

---

## The two payment paths

### Cash

The customer hands money to the engineer.

```
Job total ₹2,000 · commission 20% = ₹400

Engineer collects  ₹2,000  →  ledger −2,000  (holding company money)
Commission earned    ₹400  →  ledger   +400  (company owes engineer)
                              ─────────────
Engineer owes the company    −₹1,600
```

The engineer later pays ₹1,600 to the office, which records a settlement of +1,600 and returns the balance to zero.

### Online

The customer pays the company directly.

```
Job total ₹2,000 · commission 20% = ₹400

Customer pays company  ₹2,000  →  no engineer ledger entry
Commission earned        ₹400  →  ledger +400
                                  ───────────
Company owes the engineer        +₹400
```

Settled when the company pays the engineer ₹400.

### Mixed

Part cash, part online. Each portion generates its own entry. The existing `PaymentInvoice` model already has a `paymentBreakdown` array, which is the right shape.

---

## Online payment — the admin QR

> *"for online payemtn direct admin scanner show to app"*

The app displays the **company's** payment QR so the customer can pay the company directly. Money never routes through the engineer's own account.

### How it works

1. Engineer selects Online at the payment step
2. App displays the company UPI QR with the exact amount
3. Customer scans and pays
4. Engineer records the transaction reference and captures a screenshot of the customer's confirmation
5. Marked as **pending verification** until the office confirms the money arrived

### The verification gap

**The app cannot confirm the payment happened.** It shows a QR; it has no visibility of the company's bank account. An engineer could mark a payment received that never arrived.

Three options, in increasing order of cost and reliability:

| Option | How | Trade-off |
|---|---|---|
| **A — Manual** | Engineer records the UPI reference and a screenshot; office reconciles against the bank statement | Cheap, works now, needs daily reconciliation and trusts the engineer until it is checked |
| **B — Dynamic QR per job** | Generate a QR with a unique reference per job via a payment gateway | Reconciliation becomes automatic; needs a gateway account and integration |
| **C — Gateway with webhook** | Gateway notifies the backend on payment; job updates itself | Correct and real-time; most integration work, and gateway fees |

**Decided (owner): Option C — gateway with webhook**, not the phased approach originally recommended here. Online payments go through a payment gateway from the first release; the gateway's webhook confirms receipt and the job updates itself, rather than the office reconciling a UPI reference by hand. This adds a gateway account, an integration, and gateway fees to the backend estimate — see [`11-open-questions.md`](./11-open-questions.md) for the provider decision still open.

Still store `paymentReference`, `verificationStatus` and `verifiedBy` on the entry — the gateway webhook is what sets them, rather than an administrator doing it by hand.

Until a payment is verified by the gateway, a commission on it should be **credited but held**, not settled — see the rules at the end.

---

## Commission — decided

**Decided (owner):** Admin sets the commission **amount for each job individually** when reviewing it — not a flat rate, a percentage, or a slab. There is no rule table to build; the commission field on the ledger entry is a manually entered figure, per job, per engineer.

| Question | Decision |
|---|---|
| Basis | Tax-**inclusive** job total |
| Scope | **Labour only.** If the engineer personally buys a part that wasn't supplied through a godown, the office reimburses that cost separately, alongside the commission — as a distinct ledger entry (see `part_reimbursed` below), not folded into the commission figure |
| Timing | Earned at job **completion**; not settleable until the payment behind it is verified |

Because the amount is entered per job rather than computed from a stored rate, there is no "rate that applied" to preserve — but the **entered amount itself must be immutable on the ledger entry** once posted, for the same reason: a dispute needs to see exactly what was recorded at the time, not a number that can silently change.

Still open: what happens when a job is refunded or cancelled after payment — see [11 · Open Questions](./11-open-questions.md).

---

## The ledger

The wallet balance is **derived, never stored as an editable number**. It is the sum of an append-only ledger.

This is the single most important decision in this document. A stored balance that gets written to from several code paths will drift, and when an engineer disputes it there is no way to reconstruct the truth. A ledger of immutable entries can always be re-summed and always explains itself.

### Entry

| Field | Notes |
|---|---|
| `engineerId` | Who |
| `type` | See below |
| `amount` | Signed, by the convention above |
| `balanceAfter` | Running balance, for display and audit |
| `jobId`, `invoiceId` | What it relates to |
| `paymentMode` | cash · upi · card · bank_transfer |
| `reference` | UPI reference, cheque number |
| `commissionAmount` | The figure admin entered for this job — see Commission, above. No rate or basis field; the amount itself is the record. |
| `status` | `pending` · `confirmed` · `reversed` |
| `createdBy`, `createdAt` | Audit |
| `note` | Free text |

### Types

| Type | Sign | When |
|---|---|---|
| `cash_collected` | − | Engineer takes cash from a customer |
| `commission_earned` | + | Job completed |
| `online_collected` | none | Recorded for the job; no engineer ledger effect |
| `settlement_paid_by_engineer` | + | Engineer hands cash to the office |
| `settlement_paid_to_engineer` | + on the office side, − here | Company pays the engineer out |
| `advance_given` | − | Company advances money |
| `part_reimbursed` | + | Engineer bought a required part out of pocket; office reimburses its cost alongside the job's commission |
| `penalty` | − | Deduction, with a mandatory reason |
| `bonus` | + | Addition, with a reason |
| `reversal` | opposite | Corrects an earlier entry |
| `adjustment` | either | Manual correction, admin only, reason mandatory |

### Corrections

**Entries are never edited or deleted.** A mistake is corrected by a `reversal` entry referencing the original. The ledger reads as a history, including its own mistakes — which is exactly what an engineer disputing a figure needs to see.

The existing `LedgerEntry` collection in the CRM is a **cashbook for the business**, not this. Keep them separate. **Decided (owner):** a confirmed settlement also posts to the business cashbook — a deliberate integration at settlement time, not a merge of the two ledgers.

---

## Settlement

> *"engineer charge will show in wallet amount then sattle later any time"*

Settlement is a recorded event, not a balance edit.

### Engineer pays the company

1. Engineer opens Settle in the app, sees the amount owed
2. Chooses cash at the office, or UPI to the company
3. For UPI, the company QR is shown, and the engineer records the reference
4. Creates a settlement in `pending` state
5. An administrator confirms receipt; the entry becomes `confirmed` and the balance moves

**The balance moves only on confirmation.** An engineer marking "I paid" does not clear their own debt.

### Company pays the engineer

1. Administrator initiates a payout from the admin panel
2. Paid by bank transfer to the verified account from [02 · KYC](./02-kyc-and-documents.md), or by UPI
3. Reference recorded, engineer notified
4. Engineer confirms receipt in the app, which closes the loop and surfaces disputes early

### Policy

**Decided (owner):** a **cash-in-hand limit** applies — an engineer holding more than the configured amount is blocked from new job assignment until they settle. **Settlement is on demand**, not a fixed daily or weekly cycle; the engineer initiates it whenever they choose, or whenever the limit forces the issue.

The actual ₹ limit is still open — see [11 · Open Questions](./11-open-questions.md). The system should still support:

- **Reminders** as the engineer approaches the limit
- **Auto-deduction** of amounts owed from commission payable, so the settlement is net

---

## Screens

| Screen | Purpose |
|---|---|
| Wallet home | Balance as "to pay" or "to receive", recent entries, settle action |
| Transaction history | Filterable by date, type, job. Each entry expands to its job. |
| Entry detail | Full breakdown: job total, commission amount entered by admin, resulting balance |
| Settle | Amount, method, QR for UPI, reference entry |
| Settlement history | Past settlements and their states |
| Payment collection | On the job — method, amount, QR or cash confirmation |
| Earnings summary | Per day, week, month. What engineers will actually open the app for. |

### What the wallet screen must make obvious

- Whether they owe money or are owed it, in plain words
- How it was calculated, per job
- When the next settlement is due
- What is still pending confirmation

**Every figure must be traceable to a job.** An engineer who cannot see why their balance is what it is will not trust it, and will telephone the office — which is the cost this module exists to remove.

---

## Offline

| Action | Behaviour |
|---|---|
| View balance | Cached, with a clear "as of" timestamp |
| Record cash collection | Queued; the ledger entry is created server-side on sync |
| Show payment QR | **Cached static QR works offline.** A dynamic per-job QR does not — fall back to the static one or to cash. |
| Record online reference | Queued |
| Settle | **Online only.** Settlement must not be queued — it needs a live balance and a confirmable state. |

**The balance shown offline is the last synced figure and must be labelled as such.** Ledger entries are created server-side, never on the device, so the device never computes a balance of its own.

---

## Security

This module is the reason to care about the platform's authorisation defects.

| Requirement | Why |
|---|---|
| Ledger entries are created server-side only | A client that can post arbitrary entries can pay itself |
| The app never sends a computed balance | It sends events; the server computes |
| Commission is entered by an admin and written server-side | Never accepted as a client-supplied figure from the engineer's app |
| Settlement confirmation needs an explicit admin permission | New permission token; the existing matrix has nothing suitable |
| Adjustments, penalties and bonuses are admin-only, with mandatory reasons | These are the manual overrides, and they are where abuse lives |
| Every entry is attributed and timestamped | Disputes are resolved from the record |
| Wallet endpoints are engineer-scoped with an unconditional ownership check | Blocker B3 — the current engineer routes have no permission guard at all, and that pattern must not be repeated here |

---

## Rules

1. Balance is derived from the ledger. It is never a stored, editable number.
2. Entries are immutable. Corrections are reversal entries.
3. Positive means the company owes the engineer. The engineer never sees a raw sign.
4. Ledger entries are created server-side only.
5. Commission is an amount admin enters per job, written server-side onto the ledger entry, and immutable once posted.
6. An engineer marking a settlement paid does not move the balance; administrator confirmation does.
7. Commission on an unverified online payment is credited as `pending` and is not settleable until verified.
8. Settlement requires connectivity.
9. Adjustments, penalties and bonuses require an administrator and a reason.
10. Every wallet figure traces to a job.
