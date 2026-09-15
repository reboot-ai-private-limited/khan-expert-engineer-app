# 04 · Assignment & Engineer Dashboard

**Depends on:** [01 · Registration](./01-auth-and-registration.md), [03 · Skills](./03-skills.md), and the `engineerId` fix (blocker B1)
**Blocks:** [05 · ID Card](./05-id-card.md), [06 · Job Execution](./06-job-execution.md)

---

## The blocker that must clear first

Call tickets currently store the assigned engineer as a **plain name string** — `engineer: { type: String, default: 'Unassigned' }` — and the engineer's own call list is queried with `{ engineer: engineerName }`.

Everything in this document assumes an `engineerId` reference instead. Scheduled assignment, ID cards tied to a job, wallet entries attributed to an engineer, and GPS check-ins all break if the link between an engineer and their work is a name that can be edited in a master screen.

**Add `engineerId` to the call schema, backfill it from the existing names, and scope every engineer query by it.** This is blocker B1 from the build plan, and it is a prerequisite here rather than an improvement.

---

## Assignment, admin side

### Assigning a ticket

From the existing call-details screen, the engineer field becomes a proper picker rather than a dropdown of names.

The picker shows, for each candidate:

| Column | Why it matters |
|---|---|
| Name and photo | Recognition |
| Skill match | Does the engineer hold the skill this `serviceType` requires? |
| Route match | Is the ticket's `route` or pincode within the engineer's preferred routes? |
| Open jobs today | Workload. Counted from tickets assigned with today's scheduled date. |
| Current status | Available, on a job, checked in elsewhere |
| Distance | Only if the engineer has an active location fix — see [06](./06-job-execution.md) |

Sorted by skill match, then route match, then lightest workload. Engineers lacking the skill appear under a separate "Other engineers" heading with a warning, and choosing one records an override with a reason.

### Scheduling

Assignment needs a **scheduled date and time**, which the current schema does not really have. There are `visitdate`, `etaDate` and `gddate` fields on the call ticket, all dates without a clear single meaning.

Introduce an explicit `scheduledAt` timestamp — the appointment the customer was given, and the time the engineer is expected on site. The arrival check-in in [06](./06-job-execution.md) compares against it to compute lateness, so it has to be a real timestamp, not a date.

The existing date fields stay for compatibility. Someone should decide which of them `scheduledAt` supersedes, and whether the others can be retired — see [11 · Open Questions](./11-open-questions.md).

### Reassignment

An assigned job can be moved to another engineer while it is not yet complete.

- Requires a reason, recorded on the ticket's activity log
- The previous engineer's temporary ID card for that job is **revoked immediately** — see [05](./05-id-card.md)
- The previous engineer is notified by push
- Any work already recorded — steps completed, photographs, amounts — stays on the ticket and remains visible to the new engineer
- If the previous engineer had already collected money, the wallet entry stands and settles against them, not the new engineer

### Bulk assignment

A day-planning screen showing unassigned tickets against engineers, so the office can allocate a morning's work in one pass rather than ticket by ticket. Worth building second, after single assignment works.

---

## Engineer dashboard — the app home screen

The first screen after login for an `active` engineer. It answers one question: *what am I doing next?*

### Layout, top to bottom

**1. Header**
Name, photograph, and today's date. A wallet balance chip that opens [08 · Wallet](./08-wallet-and-payments.md) — engineers check this constantly and it should be one tap from home.

**2. Status banner, conditional**
Only when something needs attention:
- Offline, with the count of pending writes
- A job checked into but not completed
- Documents expiring
- Wallet balance past its settlement threshold

**3. Today's summary**
Four counts: scheduled, in progress, completed today, and pending spares. These mirror the summary the current `getAssignedEngineerCalls` endpoint already returns, extended for the new states.

**4. Next job**
The single most useful element on the screen. The next scheduled job, prominent, showing customer name, area, scheduled time, service type, and a distance estimate where available. Primary action: **Navigate**. Secondary: **View details**.

**5. Today's schedule**
The rest of today's jobs in time order, each a compact card: time, customer, area, service type, status pill.

**6. Upcoming**
Tomorrow and later, collapsed by default.

### Job list, the second tab

The full list with search, filters and pagination — essentially what the current engineer portal shows, extended with the new statuses.

| Filter | Options |
|---|---|
| Status | All, scheduled, on site, in progress, awaiting spare, awaiting approval, completed |
| Date | Today, tomorrow, this week, custom range |
| Service type | From the existing master |

**Completed jobs.** Currently the server hides every closed ticket from the engineer entirely. Engineers want yesterday's work for reference, and with a wallet they need it to check what they were paid for. A read-only history tab is specified here; the server-side filter has to change to support it. Flagged in [11 · Open Questions](./11-open-questions.md).

---

## Job states

The current model has `jobStatus` and `subStatus` as free-text strings driven by a master collection, with engineers permitted to write only `subStatus`. The workflow in [06 · Job Execution](./06-job-execution.md) needs states with defined transitions.

| State | Set by | Meaning |
|---|---|---|
| `assigned` | Admin | Allocated to an engineer, not yet acknowledged |
| `accepted` | Engineer | Engineer has seen and accepted it |
| `arrived` | Engineer | Checked in on site with selfie and GPS |
| `in_progress` | Engineer | Working through the steps |
| `awaiting_spare` | Engineer | Blocked on a part |
| `awaiting_approval` | Engineer | Amount revised, waiting on customer or office approval |
| `work_done` | Engineer | Work finished, payment not yet settled |
| `payment_collected` | Engineer | Money taken; wallet entry created |
| `completed` | System | Terminal for the engineer. ID card expires. |
| `cancelled` | Admin | Only an administrator can cancel |
| `rescheduled` | Admin | New `scheduledAt` set |

**These must map onto the existing `jobStatus` / `subStatus` fields** rather than replacing them outright, because the web CRM, the dashboard alerts, the billing conversion and the estimate flow all read those fields. The cleanest approach is a new explicit `workflowState` field that the app drives, with the server deriving the legacy `jobStatus` and `subStatus` from it so the web side keeps working unchanged. That mapping needs to be written down before anyone builds it.

### Transitions the engineer may make

```
assigned ──► accepted ──► arrived ──► in_progress
                                                          │
                            ┌─────────────────────────────┼──────────────┐
                            ▼                             ▼              ▼
                     awaiting_spare              awaiting_approval    work_done
                            │                             │              │
                            └──────────► in_progress ◄────┘              ▼
                                                              payment_collected
                                                                         │
                                                                         ▼
                                                                    completed
```

Two rules carried forward from the current server behaviour, which remain correct:

- **An engineer cannot cancel or close a job.** Only an administrator can. The engineer's equivalent is reporting a refusal, which needs a mandatory reason.
- **Once a job is complete it is locked** to the engineer. No further edits.

---

## Notifications

| Event | To | Channel |
|---|---|---|
| Job assigned | Engineer | Push, deep-linking to the job |
| Job reassigned away | Engineer | Push |
| Schedule changed | Engineer | Push |
| Job cancelled | Engineer | Push |
| Engineer has not accepted within *n* minutes | Admin | Admin panel |
| Engineer has not arrived by scheduled time + grace | Admin | Admin panel |
| Amount revision needs approval | Admin | Admin panel + push |
| Spare requested | Admin | Admin panel + push |

Push requires a device-token endpoint and Expo push credentials, neither of which exists — see [10 · API Contract](./10-api-contract.md).

---

## Rules

1. Only an `active` engineer can be assigned work.
2. Assignment requires `scheduledAt`.
3. Assigning an engineer who lacks the required skill is allowed, but records an override and a reason.
4. Reassignment revokes the previous engineer's ID card for that job immediately.
5. An engineer can hold only one job in `arrived` or `in_progress` at a time. Starting a second requires pausing the first, with a reason.
6. Engineers cannot cancel or close jobs.
7. Completed jobs are locked to the engineer, read-only.
