# 05 · Temporary ID Card

**Depends on:** [04 · Assignment](./04-assignment-and-dashboard.md)

---

## What it is for

A customer opens their door to a stranger who says they are from Khan Expert Tech. The ID card is how that stranger proves it.

That framing decides every design question here. The card is **for the customer, not the engineer**. It is displayed on the engineer's phone and held up to be read and verified. So it must be legible at arm's length, verifiable independently of the phone showing it, and impossible to reuse after the job is over.

A permanent employee badge would be simpler, but it does not answer the customer's actual question, which is not "does this person work for the company" but "is this person supposed to be at *my* house *today*".

---

## Lifecycle

| Event | Card state |
|---|---|
| Job assigned to engineer | **Issued** — valid from now |
| Job reassigned to someone else | **Revoked** immediately |
| Job cancelled | **Revoked** |
| Job reaches `completed` | **Expired** |
| `validUntil` passes | **Expired** |

`validUntil` defaults to the end of the scheduled day. A job that runs long or is rescheduled extends it; a job that ends early expires the card at completion rather than waiting for the clock.

An engineer working three jobs today holds three cards, each naming its own customer and address. That is the point — a card is scoped to one visit.

---

## What the card shows

### Front — for the customer

| Element | Notes |
|---|---|
| Company name and logo | The existing `khanlogo` asset |
| Engineer photograph | From KYC. Large enough to compare against the face in front of them. |
| Engineer name | Large |
| Engineer code | Short, human-readable, e.g. `KET-ENG-0142` |
| Skills | Two or three, as plain words. "Split AC Installation", not a code. |
| **Valid until** | Date and time. Prominent. |
| **Job reference** | Ticket number and the customer's own name — this is what makes it verifiable |
| Verification QR | Resolves to a public verification page |
| Support number | So the customer can telephone the office and check |

### Back — for the engineer

Masked KYC reference, blood group if collected, emergency contact, and issue date. Not customer-facing.

---

## Verification by QR

The QR encodes a URL to a **public, unauthenticated verification page**, not the card data itself. Encoding the data directly would let anyone fabricate a QR that renders a convincing card.

**The page shows only:**

- Engineer photograph, name and code
- Valid or Not valid, as a large unambiguous status
- The scheduled date and the area — enough for the customer to confirm this is their appointment
- The company support number

**The page must never show:** the customer's full address or phone number, the ticket's financial details, the engineer's KYC data or personal contact details, or any other job.

It is a public URL. Anyone with the link can open it. Design for that: the token in the URL is random and unguessable, it resolves to exactly one card, and it stops resolving when the card expires.

| Concern | Requirement |
|---|---|
| Token | Random, at least 128 bits, unguessable, single card |
| Expiry | The page returns "expired" after `validUntil`, not the card |
| Rate limit | The endpoint is public and must be throttled per IP, like the existing website-lead endpoint |
| No enumeration | Sequential or guessable tokens would expose every appointment |

---

## In the app

**Where it appears.** A card action on each job detail screen, and a cards list on the profile tab showing all currently valid cards.

**Display requirements:**

- Full screen, brightness raised automatically, because it will be shown outdoors
- Portrait lock while displayed
- A large clear QR — at least 200pt square
- Works **offline**. The card is cached on issue. An engineer in a basement with no signal must still be able to show it. The QR resolves only when the *customer* has connectivity, which is a separate matter.
- Screenshot is permitted. Blocking it is trivially defeated by a second phone photographing the screen, and it would stop an engineer keeping a copy when their battery is about to die.

**What the engineer sees when a card is invalid:** a clear expired or revoked state with the reason, never a card that looks valid.

---

## Anti-abuse

The threat is someone showing a card for a job that is not theirs, or one that ended weeks ago.

| Measure | Effect |
|---|---|
| Card names the customer and ticket | A card for a different address is obviously wrong |
| Short validity, tied to the job | Yesterday's card does not work today |
| Server-side verification | The rendered card is only a picture; the QR is the truth |
| Immediate revocation | Reassignment or cancellation kills the card at once |
| Verification logging | Each scan records time and coarse location, so the office can see a card being verified repeatedly in odd places |

**What this does not do:** it does not stop a *currently employed* engineer from misusing a *currently valid* card at the address they were sent to. No card design solves that; supervision and the activity trail do.

---

## Printing

**Decided (owner): not included.** Digital, in-app only — no printed PDF version. The reasoning still stands as a note for later: a printed card can't be revoked, so if this changes, keep validity short and print the expiry large.

---

## Rules

1. A card exists only for an assigned, incomplete job.
2. Cards are revoked immediately on reassignment or cancellation.
3. Cards expire at job completion or at `validUntil`, whichever comes first.
4. The QR resolves to a server-verified public page, never to encoded card data.
5. The verification page never exposes the customer's address or phone number, or the job's financial details.
6. The verification endpoint is rate-limited and its tokens are unguessable.
7. Cards render offline from cache.
8. Every verification scan is logged.
