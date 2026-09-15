# 01 · Authentication & Registration

**Depends on:** [03 · Skills](./03-skills.md) (skills are chosen during signup)
**Blocks:** everything else

---

## The two ways an engineer enters the system

**Path A — Admin creates the engineer.** Office staff add the engineer in the admin panel, as they do today. The engineer receives credentials and can log in immediately. This is the existing behaviour and must keep working.

**Path B — Engineer self-registers from the app.** The engineer downloads the app, submits an application with their details, KYC documents and skills, then waits for an administrator to approve it. This is new.

Both paths converge on the same `Engineer` record. The difference is which fields are populated at creation and what state the record starts in.

---

## Account states

A single `accountStatus` field drives everything — what the engineer sees on login, whether they can be assigned work, and what the admin queue shows.

| State | Meaning | Can log in? | Can be assigned work? |
|---|---|---|---|
| `draft` | Application started in the app, not yet submitted | Yes — resumes the form | No |
| `pending_approval` | Submitted, waiting on an administrator | Yes — sees status screen only | No |
| `changes_requested` | Admin rejected specific items and asked for resubmission | Yes — sees what to fix | No |
| `rejected` | Application declined outright | Yes — sees the reason, terminal | No |
| `approved` | Verified, but not yet activated | Yes | No |
| `active` | Working engineer | Yes | **Yes** |
| `suspended` | Temporarily barred | Yes — sees suspension notice | No |
| `inactive` | Left the company or deactivated | **No** | No |

**Note on the existing schema.** Today `Engineer.status` is an enum of `active` / `inactive`, and `engineerLogin` filters on `status: 'active'` while `authenticateJWT` rejects `inactive`. Introducing these states means replacing that field. Existing engineer records migrate to `active`.

### Why rejected engineers can still log in

They need to see *why*. An engineer who is silently locked out telephones the office. One who opens the app and reads "Address proof was unreadable — please upload a clearer photograph" resubmits on their own. Only `inactive` is a hard lockout.

---

## Screens

### 1. Welcome

First launch, no session.

- App identity, one line on what it is
- **Log in** — primary
- **Register as an engineer** — secondary
- Support phone number, tappable

### 2. Log in

Unchanged from the current portal behaviour: phone or email, plus a password.

| Field | Rules |
|---|---|
| Phone or email | Required. Trimmed. Matched against either field server-side. |
| Password | Required. Masked, with a reveal toggle. |

- "Remember me" stores the identifier only, never the password
- Failed attempts show the server's message; after three failures, surface the support number
- On success, route by `accountStatus` — `active` and `approved` go to the dashboard, everything else to the application status screen

**Forgot password.** There is no password-reset mechanism anywhere in the current codebase; administrators set passwords manually. This is unacceptable for a personal device holding a long-lived session. Specified in [10 · API Contract](./10-api-contract.md) as new work: OTP to the registered phone, then set a new password.

### 3. Register — the application form

A multi-step form, saved as `draft` after every step so a dropped connection or a closed app loses nothing. The engineer can leave and resume.

#### Step 1 — Identity

| Field | Type | Rules |
|---|---|---|
| Full name | Text | Required. As printed on the Aadhaar card, since it will be checked against it. |
| Father's or spouse's name | Text | Optional. Commonly required on Indian employment records — confirm whether the business needs it. |
| Date of birth | Date | Required. Must be 18 or older. |
| Gender | Choice | Optional. Male / Female / Other / Prefer not to say. |
| Mobile number | Phone | Required. **Verified by OTP.** Becomes the login identifier. Must be unique — the existing schema already enforces uniqueness on `phone`. |
| Alternate number | Phone | Optional. |
| Email | Email | Optional. If given, must be unique. |
| Photograph | Camera | Required. **Camera only, not gallery.** Used on the ID card. Face must be visible. |

The mobile number is OTP-verified before the form proceeds. Everything downstream — login, ID card, wallet settlement — keys off it.

#### Step 2 — Address & demography

| Field | Type | Rules |
|---|---|---|
| Address line 1 | Text | Required. |
| Address line 2 | Text | Optional. |
| City / town | Text | Required. |
| District | Text | Required. |
| State | Choice | Required. Reuse the existing `indianStates` constant from the web app; default West Bengal. |
| Pincode | Number | Required. Six digits. |
| Landmark | Text | Optional. |
| Same as permanent address | Toggle | Default on. When off, collect a second permanent address with the same fields. |
| Preferred work routes | Multi-select | Optional but strongly recommended. Feeds assignment. The existing `Engineer.route` field is a single free-text string; this should become a list. |
| Years of experience | Number | Optional. |
| Languages spoken | Multi-select | Optional. Bengali, Hindi, English, other. Genuinely useful for matching an engineer to a customer. |

#### Step 3 — KYC documents

Fully specified in [02 · KYC & Documents](./02-kyc-and-documents.md).

#### Step 4 — Skills

Fully specified in [03 · Skills](./03-skills.md). The engineer picks from an admin-maintained list; they cannot type free text.

#### Step 5 — Review & submit

- Every entered value shown back, each section with an edit link
- Declaration checkbox: the information is true and the documents are genuine
- Consent checkbox: explicit consent to store and process the documents, naming the purpose. Required under the DPDP Act; record the consent text version and timestamp alongside the record.
- **Submit** moves the record from `draft` to `pending_approval`

### 4. Application status

Shown on every login while the engineer is not yet `active`.

- Current state as a clear headline — "Waiting for approval", "Changes needed", "Application declined"
- A checklist of the five steps with per-item state: submitted, verified, rejected with reason
- For `changes_requested`, only the rejected items are editable; the rest stay locked
- Submitted date, and last reviewed date
- Support contact

---

## Admin side — the approval queue

New screens in the existing web admin panel.

**List view.** Pending applications, oldest first, showing name, phone, district, applied date, days waiting, and a document-completeness indicator. Filterable by state and district.

**Detail view.** Everything the engineer submitted, with document images enlargeable. Per-item verify or reject controls, each rejection requiring a reason that the engineer will read verbatim. Three outcomes:

- **Approve** → `approved`, then a separate explicit **Activate** → `active`. Two steps, because approving the paperwork and putting someone on the roster are different decisions, often made by different people.
- **Request changes** → `changes_requested`, with per-item reasons
- **Reject** → `rejected`, with a reason

Every transition is written to an audit log: who, when, from which state to which, and why. Engineer records carry identity documents; who looked at them and who changed them needs to be answerable.

---

## Notifications

| Event | To | Channel |
|---|---|---|
| Application submitted | Admin | Admin panel badge, optional email |
| Approved / activated | Engineer | Push + SMS |
| Changes requested | Engineer | Push + SMS, naming what to fix |
| Rejected | Engineer | Push + SMS |
| Suspended | Engineer | Push |

SMS matters as well as push here — an engineer waiting on approval may have uninstalled the app.

---

## Session handling

| Concern | Decision |
|---|---|
| Token storage | `expo-secure-store`, Keystore-backed. Never `AsyncStorage`, never the web app's `localStorage` pattern. |
| Token lifetime | Currently 30 days with no refresh and no revocation. Replace with a short access token plus a rotating refresh token. |
| Logout | Clears the token, the SQLite cache and any queued writes — with a warning if unsynced writes exist. |
| Forced logout | A 401 clears the session and routes to login with an explanatory message, not a silent bounce. |
| Status change mid-session | If the engineer is suspended while logged in, the next API call returns 403 and the app routes to the status screen. |

---

## Rules

1. An engineer cannot be assigned work unless `accountStatus` is `active`.
2. An engineer cannot reach `approved` with any KYC document in `pending` or `rejected`.
3. Phone numbers are unique across all engineers, enforced by the existing index.
4. A rejected application can be resubmitted only if the admin chose `changes_requested`. A flat `rejected` is terminal and needs an administrator to reopen it.
5. Self-registered and admin-created engineers are the same record type. An admin-created engineer still requires KYC before activation — the admin either uploads it on their behalf or the engineer completes it on first login.
