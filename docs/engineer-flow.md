# Engineer Flow — App × Admin Website

**Project:** Khan Expert Tech CRM
**Purpose:** Walk the complete path a service call takes — from an engineer joining the roster, through the admin website assigning and tracking work, to the engineer's app collecting the job, the payment, and settling accounts — so the owner can verify the flow before build continues.

Sourced from the spec set in [`specs/`](./specs/00-overview.md).

---

## Where things stand today

Right now the engineer app only does **one** thing for real: an engineer already created by the office can log in with their phone/email and password. Every other stage below — registration, KYC, skills, assignment, the ID card, job execution, spare parts, and the wallet — is **designed and specified, not yet built**. This document is that design, laid out for sign-off before the office and the developers commit the ~2–3 months of work it represents.

**Legend**
- 🟢 **Live today**
- 🟡 **Designed · to be built**
- 🔴 **Needs an owner decision**

---

## The whole journey, in one picture

```
Engineer registers on the app,          KYC documents            Skills selected,
or office adds them on the website  →   verified by admin    →   approved by admin
                                                                          │
                                                                          ▼
                                                                 Engineer activated —
                                                                  now assignable
                                                                          │
                                                                          ▼
                                                                Admin assigns the job
                                                              (skill + route + workload)
                                                                          │
                                                                          ▼
                                                               Temporary ID card issued
                                                                  for this job only
                                                                          │
                                                                          ▼
                                                                Engineer arrives —
                                                               selfie + GPS check-in
                                                                          │
                                                                          ▼
                                                                Product verified,
                                                                warranty checked
                                                                          │
                                                                          ▼
                                        ┌──────────────── Job steps completed, ──────────────┐
                                        │              amount revised if needed               │
                                        │                                                      │
                                  part missing                                                 │
                                        ▼                                                      │
                              Admin fulfils spare-part                                         │
                                      request                                                  │
                                        │  part delivered                                      │
                                        └──────────────────────────────────────────────────────┘
                                                                          │
                                                                          ▼
                                                              Payment collected —
                                                              cash or company QR
                                                                          │
                                                                          ▼
                                                              Engineer wallet ledger
                                                                     updated
                                                                          │
                                                                          ▼
                                                              Settlement with the office
                                                                          │
                                                                          ▼
                                                              Job completed and locked
```

A missing spare part is the one branch that can pause a job mid-way before it rejoins the main path.

---

## Stage 01 — Registration & onboarding

*Depends on: skills master (03) · Blocks: everything else*

An engineer joins the roster one of two ways: the office adds them directly (works today), or the engineer applies from the app and waits for approval (new). Both end up as the same kind of record — an `accountStatus` that decides what the engineer can do next.

**Engineer · App**
1. Downloads the app, taps **Register as engineer** (or, if the office added them, logs in with the credentials they were given)
2. Enters name, date of birth, photo (camera only), mobile number — **verified by OTP**
3. Enters address, preferred work routes, languages spoken
4. Uploads KYC documents — stage 02
5. Selects skills from the office's list — stage 03
6. Reviews everything, accepts the consent declaration, **submits**
7. Sees a live status screen on every login until approved: *waiting*, *changes needed*, or *declined*, with reasons

**↔ Communication:** Application submitted → badge on admin panel · Decision made → push + SMS to engineer

**Admin · Website**
1. New application lands in the **Approval Queue**, oldest first, with a completeness indicator
2. Opens the detail view — every field, every document, enlargeable
3. Verifies or rejects each item individually, with a reason the engineer will read
4. **Approve** the paperwork, then a separate **Activate** step puts them on the roster — two decisions, often two people
5. Or chooses **Request changes** (only flagged items re-open) or **Reject** (final)
6. Every decision is written to an audit log — who, when, why

**Status:** 🟡 Designed · to be built — 🟢 admin-created login is live today

---

## Stage 02 — KYC & documents

*Depends on: registration (01)*

Aadhaar, PAN, address proof and bank details. An engineer cannot be activated until every required document is verified. India's Aadhaar Act and DPDP Act apply here — only the last four digits of the Aadhaar number are ever stored.

**Engineer · App**
1. Photographs Aadhaar (front + back) inside a framing guide, with blur and glare warnings before upload
2. Enters PAN number and photographs the card
3. Adds address proof, only if it differs from the Aadhaar address
4. Adds bank account or UPI ID, for settlement payouts
5. Ticks the consent checkbox — what is stored, and why
6. Sees each document's own status: *pending*, *verified*, or *rejected* with a reason

**↔ Communication:** Document uploaded → appears for review · Verified / rejected → shown on engineer's status screen

**Admin · Website**
1. Views documents through short-lived, signed links only — never a public URL
2. Verifies or rejects each document from a preset reason list ("blurred", "cut off", "name mismatch"…)
3. Every view of a document is itself logged — who looked, when
4. Bank-detail changes always reset to *pending* and re-notify the office — the obvious fraud vector in anything that pays out money

**Status:** 🟡 Designed · to be built — **Decided:** engineer submits the Aadhaar photo and full number at registration, for identity verification only. Existing engineers do not need to self-submit KYC — admin handles their records directly (stage owner: office).

---

## Stage 03 — Skills

*Depends on: nothing — build this first*

Skills come from a list the office maintains, the same way brands and product types already work. An engineer never types a skill freehand — "AC gas charging" and "gas filling" typed by two people would never match each other when the system looks for who can do a job.

**Engineer · App**
1. Picks from a categorised, searchable list — Air Conditioning, Refrigeration, Electrical, and so on
2. Some skills require a certificate photo before they can be selected
3. After approval, can request to add or drop a skill any time from their profile

**↔ Communication:** Skill request → admin approves or rejects

**Admin · Website**
1. Maintains the Skill Master — same screen pattern as the existing Brand / Product / Service Type masters
2. Groups skills by category; deactivates old ones rather than deleting (history keeps referring to them)
3. Maps each service type to the skill(s) it needs — this is what makes assignment (stage 04) skill-aware

**Status:** 🟡 Designed · to be built first

---

## Stage 04 — Job assignment & the engineer's dashboard

*Depends on: skills (03), an active engineer, a one-time fix linking jobs to engineers by ID*

The office turns a call ticket into a scheduled visit. The engineer's home screen answers one question the moment they open the app: *what am I doing next?*

**Admin · Website**
1. Opens the call ticket; the engineer field is a picker, not a typed name
2. Picker ranks engineers by skill match, route match, then lightest workload today
3. Sets a firm **scheduled date & time** — what the customer was promised
4. Can reassign mid-job with a reason (previous engineer's ID card is revoked at once) or cancel (only an admin can)
5. Bulk-assigns a morning's unassigned tickets in one pass

**↔ Communication:** Assigned / reassigned / rescheduled / cancelled → push to engineer · Not accepted in time → flag on admin panel

**Engineer · App**
1. New job appears as **Next job** on the home screen — customer, area, time, service type
2. Accepts the job (or it flags on the admin side if left too long)
3. Home screen shows: wallet balance, today's counts, next job, rest of today, upcoming
4. Job list tab: search, filter by status or date, full schedule
5. One job at a time in progress — starting a second requires pausing the first, with a reason

**Status:** 🟡 Designed · to be built — requires backend fix: jobs currently link to engineers by name text, not a stable ID. **Decided:** no separate "travelling" status — Accepted goes straight to Arrived.

---

## Stage 05 — Temporary ID card

*Depends on: assignment (04)*

A customer opens their door to a stranger. The card answers "is this person supposed to be at my house today?" — not "do they work for the company". It is scoped to one visit and dies with the job.

**Engineer · App**
1. Card is issued automatically the moment the job is assigned — nothing to request
2. Shown full-screen: photo, name, code, skills, **valid until**, job reference, a QR code
3. Works offline — cached the moment it's issued
4. Expires the instant the job completes, is reassigned, or is cancelled

**↔ Communication:** Customer scans the QR → public page shows only photo, name, valid/not valid, appointment area, support number

**Admin · Website**
1. No admin action needed to issue a card — it follows the job automatically
2. Reassigning or cancelling the job revokes the card immediately
3. Every QR scan is logged with time and coarse location, visible on the ticket

**Status:** 🟡 Designed · to be built

---

## Stage 06 — Job execution (the core of the app)

*Depends on: assignment (04)*

What happens between the engineer reaching the door and money changing hands: a proven arrival, a checklist that fits the job, and prices that can change honestly as the real fault is found.

**Engineer · App**
1. **Arrival check-in** — live front-camera selfie + GPS fix, required to move the job to *Arrived*
2. Works through a step checklist chosen by service type (diagnose, install, test…), each with notes, photos, and — where chargeable — an amount
3. Raises an **amount revision** when the real fault costs more than quoted — always with a reason, always shown to the customer on screen for their agreement
4. Completes the job: final amount, service photo, serial number, customer signature
5. Collects payment — stage 09
6. **Cannot cancel or close a job** — only the office can

**↔ Communication:** Check-in far from the customer address → flagged on admin panel · Amount rise past threshold → needs office approval before the engineer can collect

**Admin · Website**
1. Sees the check-in on a map: the selfie, timestamp, accuracy, distance from the customer, and lateness — flagged beyond **500 metres** from the customer address (configurable), never blocked
2. Approves or declines amount increases above a configurable threshold, in real time
3. Watches steps, photos and revisions land on the ticket live
4. Once complete, closes the ticket — the engineer's copy is already locked read-only

**Status:** 🟡 Designed · to be built — **Decided:** price increases beyond a configurable threshold need office approval before collection; the customer's agreement is captured by on-screen signature (no OTP).

### One full visit, message by message

```
Admin                              Engineer                              Customer
  │──── Assigns job + schedule ─────▶│                                        │
  │◀─────────── Accepts ─────────────│                                        │
  │                                   │────── Arrives, shows ID card ────────▶│
  │◀──── Check-in: selfie + GPS ──────│                                        │
  │                                   │──── Verifies product, checks warranty▶│
  │  [if price rises past threshold]                                          │
  │◀──── Requests approval ───────────│                                        │
  │───── Approves / declines ────────▶│                                        │
  │                                   │──── Confirms revised amount on screen▶│
  │                                   │──── Collects payment (cash/QR) ──────▶│
  │◀──── Marks payment collected ─────│                                        │
  │───── Confirms settlement ────────▶│  (later, on demand)                    │
  │                                   │  Job locked — read-only from here      │
```

---

## Stage 07 — Product verification & warranty

*Depends on: job execution (06)*

The office books a call from a phone conversation — a best guess at the brand and model. The engineer is the first person to actually see the machine and its purchase bill, and warranty decides who pays.

**Engineer · App**
1. Photographs the unit and its nameplate — where the real model and serial number live
2. Corrects the brand / model / serial the office had on file, if wrong — the original guess is kept, not erased
3. Photographs the purchase bill, if the customer has one, to establish the purchase date
4. App computes the warranty status from the purchase bill the customer produces: *in warranty* or *out of warranty* — **a bill is mandatory to claim warranty cover; without one, the job proceeds as chargeable**

**↔ Communication:** Warranty status flips who pays → becomes an amount revision, same approval path as stage 06

**Admin · Website**
1. Sees exactly what changed — the office's original value and the engineer's corrected one, side by side
2. Reviews warranty claims the customer disputes — since a missing bill means the job was charged, this is where a disagreement is resolved
3. Purchase bills and warranty cards are stored privately, never at a public link — they carry the customer's own details

**Status:** 🟡 Designed · to be built — **Decided:** a purchase bill is mandatory for a warranty claim, no exceptions.

---

## Stage 08 — Spare parts

*Depends on: job execution (06), product capture (07)*

An engineer opens a unit, finds a failed part, and doesn't have it. Today that's a phone call and a ticket parked in "Pending Parts" with no real record of what's needed. This gives the shortage a shape the office can act on.

**Engineer · App**
1. Raises a request from the step screen: item, quantity, urgency, reason, a photo of the failed part
2. Job pauses — customer-facing state becomes "Awaiting parts"
3. Watches the request move through the office's queue in real time
4. Confirms receipt when the part arrives — job resumes; a price change from the new part is an amount revision, same as stage 06

**↔ Communication:** Request raised → urgent ones push instantly · Every status change (stocked / dispatched / rejected…) → notifies the engineer

**Admin · Website**
1. Fulfilment queue, ordered by urgency then age, across all warehouses
2. Reserves stock so two engineers are never both told the last part is available
3. Dispatches it, raises a purchase if it's not in stock, or rejects with a reason
4. Stock leaves the godown the moment it's handed to the engineer — no running "van stock" ledger to reconcile

**Status:** 🟡 Designed · to be built — **Decided:** deduct stock on handover, not a per-engineer stock ledger.

---

## Stage 09 — Wallet, payments & settlement

*Depends on: everything above — built last, moves real money*

If a customer pays cash, the engineer is holding the company's money. If they pay online, the company is holding the engineer's commission. Either way a balance builds up between the two, and this is the record of it — settled on demand, never edited directly by either side.

**Engineer · App**
1. At payment, chooses **Cash** or **Online** — Online runs through a payment gateway, so the office doesn't have to manually match every transaction against a bank statement
2. Wallet home always reads in plain words — **"₹400 to receive"** or **"₹1,600 to pay"**, never a raw balance
3. Every figure traces back to the job that produced it
4. If the engineer had to personally buy a required part (not supplied through a godown), that cost is logged against the job for reimbursement alongside the commission
5. Opens **Settle** to pay the office what's owed, or to confirm a payout has arrived
6. If cash-in-hand passes the configured limit, new job assignment is blocked until they settle

**↔ Communication:** "I paid the office" → stays pending until the office confirms it · Balance past the limit → new jobs blocked until settled

**Admin · Website**
1. Sets the **commission amount for each completed job individually** — not a fixed rate or percentage — on the tax-inclusive job total
2. Commission is for labour; if the engineer bought a part out of pocket, admin adds that reimbursement to the same settlement
3. Commission is earned at job completion but only settleable once the payment behind it is verified
4. Confirms engineer-to-office settlements before the balance actually moves — settlement is **on demand**, not a fixed cycle
5. Initiates office-to-engineer payouts — bank transfer or UPI, referenced and logged
6. Every entry is permanent; a correction is a new reversing entry, never an edit
7. Every settlement also posts to the business cashbook, so cash movement shows in one place

**Status:** 🟡 Designed · to be built last — **Decided:** commission is a per-job amount admin sets (labour, tax-inclusive), earned at completion, settleable once payment verifies. Online payments verify through a payment gateway. A cash-in-hand limit blocks new jobs until settlement, which happens on demand and also posts to the business cashbook.

---

## Decisions — resolved by the owner

All open questions below were answered on 2026-09-15. This is now the working design — the spec files in [`specs/`](./specs/) have been updated to match where the decision changed the original recommendation.

| # | Question | Decision |
|---|---|---|
| 1 | Commission model | Admin sets the commission amount for **each job individually** — not a fixed rate or percentage |
| 2 | Tax inclusive or exclusive | Commission is calculated on the **tax-inclusive** job amount |
| 3 | Commission on parts or labour | **Labour only.** If the engineer buys a required part out of pocket (not supplied through a godown), the office reimburses that cost separately, alongside the commission |
| 4 | When commission is earned | At job **completion**, but not settleable until the payment behind it is verified |
| 5 | Aadhaar retention | Engineer submits the Aadhaar photo and full number at registration, for identity verification only |
| 6 | Who fixes the backend | The in-house team |
| 7 | Amount-increase approval | Threshold-based — increases within a configurable limit proceed; larger ones need office approval before collection |
| 8 | Customer confirmation | On-screen **signature**, not OTP |
| 9 | Spare-part stock | **Deducted from the godown the moment it's handed to the engineer** — no running van-stock ledger |
| 9b | Bill mandatory for a warranty claim | **Yes** — no bill, no warranty claim; the job proceeds as chargeable |
| 9c | OCR on nameplates/bills | Not included |
| 10 | Engineers see completed jobs | Yes, **read-only** |
| 11 | "Travelling" status | Not included — Accepted goes straight to Arrived |
| 12 | Skill proficiency levels | Not included |
| 13 | Offline support in the first release | **Included** |
| 14 | Existing engineers & KYC | No action required from them — admin handles their records directly |
| 15 | Online payment verification | **Payment gateway** integration (not manual reconciliation) |
| 16 | Cash-in-hand limit & settlement cycle | A limit blocks new job assignment above it; settlement happens **on demand** |
| 17 | App language | English only |
| 18 | Platform | **Android only** |
| 19 | Settlement → business cashbook | **Yes** — every settlement also posts there |
| 20 | GPS check-in flag distance | **500 metres**, configurable — flags for review, never blocks |
| 21 | Printed ID cards | Not included — digital, in-app only |

### Still to pin down a number for

- The exact **cash-in-hand limit** (₹ amount) that blocks new job assignment
- Which **payment gateway** to integrate — affects both transaction fees and backend effort
- The **price-increase approval threshold** (₹ amount or %) from decision #7

### One flag worth a second look

Storing the **full** Aadhaar number (decision #5) carries obligations under the Aadhaar Act and the DPDP Act regardless of the stated purpose — encryption at rest, access logging, a defined retention period, and recorded consent. This isn't a reason to change the decision, just worth a five-minute check with whoever handles compliance so "for verification purposes only" is backed by the right storage practice before the upload screen is built.

---

## Build order & rough effort

The stages above have to be built in this order — each depends on the one before it producing trustworthy records. Skipping ahead means rebuilding later.

| Order | Stage | Why this order |
|---|---|---|
| 1 | Skills master | No dependency — an admin-panel-only screen, build it first |
| 2 | Registration & approval | Skill selection happens at sign-up |
| 3 | KYC | Part of the registration form |
| 4 | Assignment & dashboard | Needs approved engineers, and the job↔engineer ID fix |
| 5 | ID card | Issued the moment a job is assigned |
| 6 | Job execution | The core workflow — needs assignment first |
| 7 | Product & warranty | A step inside job execution |
| 8 | Spare parts | Ordering the right part needs the model number from stage 07 |
| 9 | Wallet & settlement | Moves real money — built last, deliberately, once everything feeding it is trustworthy |

| Area | Rough effort |
|---|---|
| Backend — new data, new endpoints, the approval workflow | 15–20 working days |
| Admin website — approval queue, skills master, assignment, wallet settlement, map view | 12–18 working days |
| Engineer app — every screen described above | 25–35 working days |
| **Total, one developer** | **≈ 52–73 working days** |

Using a payment gateway for online verification (decision #15) adds gateway account setup, integration and webhook handling on top of the backend estimate above — get a quote once a provider is picked.

That's roughly three to four months for one person. Splitting backend and app work between two people is the obvious way to shorten it, but the backend has to lead — the app has nothing to talk to until it exists.

---

## Owner sign-off

Confirm the flow above matches how the business actually wants to run, before it goes into development.

| Stage | Reviewed | Notes |
|---|---|---|
| 01 · Registration | | |
| 02 · KYC & documents | | |
| 03 · Skills | | |
| 04 · Assignment & dashboard | | |
| 05 · ID card | | |
| 06 · Job execution | | |
| 07 · Product & warranty | | |
| 08 · Spare parts | | |
| 09 · Wallet & settlement | | |
