# Field Engineer App — Specification Set

**Project:** Khan Expert Tech CRM · Engineer mobile app (Expo)
**Scope:** Engineer role only
**Status:** Draft for review

---

## What these documents cover

The [build plan](../plan.html) describes an app that mirrors the existing web Field Engineer Portal — log in, see assigned tickets, update them, upload photos. This spec set describes something considerably larger: engineer onboarding, identity verification, skill-based assignment, verified site attendance, a structured job workflow, spare-part logistics, and money settlement between engineer and company.

**None of this exists in the backend today.** The current system has an `Engineer` collection with five fields (name, phone, email, password, route) and a call ticket that stores the assigned engineer as a plain name string. Everything specified here is new.

---

## Document index

| # | Document | Covers |
|---|---|---|
| 01 | [Authentication & Registration](./01-auth-and-registration.md) | Login, self-registration from the app, admin-created engineers, the approval queue |
| 02 | [KYC & Documents](./02-kyc-and-documents.md) | Aadhaar, PAN, address proof, photo; verification states; data-protection obligations |
| 03 | [Skills](./03-skills.md) | Admin-managed skill master, engineer selection, skill-based matching |
| 04 | [Assignment & Dashboard](./04-assignment-and-dashboard.md) | Admin assigns work, engineer home screen, scheduling |
| 05 | [Temporary ID Card](./05-id-card.md) | Job-scoped credential, customer verification, expiry |
| 06 | [Job Execution](./06-job-execution.md) | Arrival check-in with selfie and GPS, step workflow, amount revisions |
| 07 | [Spare Parts](./07-spare-parts.md) | Shortage reporting, fulfilment, job resumption |
| 12 | [Product Details & Documents](./12-product-details.md) | Product and nameplate photos, purchase bill, warranty verification, image categories |
| 08 | [Wallet & Payments](./08-wallet-and-payments.md) | Cash vs online collection, commission, ledger, settlement |
| 09 | [Data Model](./09-data-model.md) | New collections and changes to existing ones |
| 10 | [API Contract](./10-api-contract.md) | Every endpoint the app needs, existing and new |
| 11 | [Open Questions](./11-open-questions.md) | Decisions required before build |

---

## How the pieces connect

```
REGISTRATION                 ONBOARDING                    WORK
┌──────────────┐            ┌──────────────┐             ┌──────────────┐
│ Self-signup  │            │ KYC upload   │             │ Admin assigns│
│ from app     ├───────────►│ Skills pick  ├────────────►│ by skill +   │
│      or      │            │ Admin review │             │ route        │
│ Admin creates│            └──────┬───────┘             └──────┬───────┘
└──────────────┘                   │                            │
                                   ▼                            ▼
                            ┌──────────────┐             ┌──────────────┐
                            │  APPROVED    │             │ Temp ID card │
                            │  engineer    │             │ issued       │
                            └──────────────┘             └──────┬───────┘
                                                                │
       MONEY                        JOB                         │
┌──────────────┐            ┌──────────────┐                    │
│ Wallet entry │◄───────────┤ Payment      │◄───────────────────┘
│ Commission   │            │ collected    │      ┌──────────────┐
│ Settlement   │            └──────▲───────┘      │ Arrive:      │
└──────────────┘                   │              │ selfie + GPS │
                                   │              └──────┬───────┘
                            ┌──────┴───────┐             │
                            │ Steps + amount│◄───────────┘
                            │ revisions     │
                            └──────▲───────┘
                                   │
                            ┌──────┴───────┐
                            │ Spare needed │
                            │ → paused     │
                            └──────────────┘
```

---

## Sequencing

These modules have hard dependencies. Building them out of order will not work.

| Order | Module | Blocked by |
|---|---|---|
| 1 | Skills master (03) | Nothing — admin panel only, build first |
| 2 | Registration & approval (01) | Skills master, because selection happens at signup |
| 3 | KYC (02) | Registration |
| 4 | Assignment (04) | Approved engineers existing; also the `engineerId` fix (blocker B1 in the plan) |
| 5 | ID card (05) | Assignment |
| 6 | Job execution (06) | Assignment |
| 7 | Product capture & warranty (12) | Job execution; it is a step in the job template |
| 8 | Spare parts (07) | Product capture, because ordering the right part needs the right model number; also the existing `ServiceItem` / godown inventory |
| 9 | Wallet (08) | Job execution and warranty status, because who pays depends on it |

The wallet is last deliberately. It is the only module that moves money, it is the hardest to correct after the fact, and it depends on every step above it producing trustworthy records.

---

## Effort reality check

The plan document estimates 17–25 working days for the ticket-handling app. This spec set is roughly **three times that scope**, and about half the new work is backend and admin-panel work rather than mobile work.

| Area | Rough effort |
|---|---|
| Backend — new collections, endpoints, approval workflow | 15–20 days |
| Admin panel — approval queue, skills master, assignment by skill, wallet settlement, map view | 12–18 days |
| Mobile app — the screens in these specs | 25–35 days |
| **Total** | **≈ 52–73 working days for one developer** |

That is a three to four month single-developer project, not a three week one. Splitting backend and mobile between two people is the obvious compression, but the backend must still lead.

---

## Two things that were settled before build

**The commission model is decided.** Admin sets a commission amount per job individually — not a flat rate, percentage, or slab. See [08 · Wallet](./08-wallet-and-payments.md#commission--decided) and [11-open-questions.md](./11-open-questions.md).

**Aadhaar handling is decided, with a compliance flag.** The owner has chosen to store the full Aadhaar number, collected for identity verification at registration. Storing Aadhaar numbers and images is still governed by the Aadhaar Act and the DPDP Act, 2023 — including consent, purpose limitation, and encryption at rest — regardless of that decision. See [02 · KYC](./02-kyc-and-documents.md) and get the storage practice checked against those obligations before the upload screen is built.
