# 02 · KYC & Documents

**Depends on:** [01 · Authentication & Registration](./01-auth-and-registration.md)

---

## Read this first

Aadhaar and PAN are regulated identifiers in India. Collecting and storing them is governed by the **Aadhaar Act, 2016** (and UIDAI circulars on masking and storage) and the **Digital Personal Data Protection Act, 2023**. The relevant obligations, in plain terms:

- Collect only what is needed for a stated purpose, and state that purpose to the person
- Obtain and record explicit consent
- Do not store more of an Aadhaar number than you need
- Encrypt at rest, restrict who can view, and log who did
- Define a retention period and delete afterwards

**This document originally specified a deliberately conservative approach** — masked storage, last four digits only. **The owner has since decided otherwise:** the engineer submits the Aadhaar photo and the **full twelve-digit number** at registration, for identity verification only, and the business does not consider itself responsible for downstream use beyond that stated purpose.

That decision still sits inside the same legal framework named above. Storing the full number doesn't remove the Aadhaar Act / DPDP Act obligations — it raises them: encryption at rest, access logging, a defined retention period, and recorded consent all still apply, and now protect a more sensitive field than the masked version would have. This is not a reason to revisit the decision, just a reason to get the storage practice checked against it before the upload screen is built, rather than after.

---

## Documents collected

| Document | Required | Purpose |
|---|---|---|
| Aadhaar card | Yes | Identity and address verification |
| PAN card | Yes | Tax identity; needed if the engineer is paid as a contractor |
| Photograph | Yes | ID card and site verification. Collected in step 1 of registration. |
| Address proof | Only if the current address differs from the Aadhaar address | Verifying where the engineer actually lives |
| Bank details | Yes, if wallet settlement pays out by transfer | See [08 · Wallet](./08-wallet-and-payments.md) |
| Driving licence | Optional | Relevant if the engineer travels by motorcycle on company business |

---

## Per-document fields

### Aadhaar

| Field | Type | Rules |
|---|---|---|
| Aadhaar number | Text, masked input | 12 digits, validated with the Verhoeff checksum. **Decided (owner): the full number is persisted**, encrypted at rest, for identity verification. Displayed back to the engineer as `XXXX XXXX 1234` regardless of what's stored. |
| Name as on Aadhaar | Text | Required. Compared against the name from step 1; a mismatch is flagged for the reviewer, not blocked. |
| Front image | Camera or file | Required. |
| Back image | Camera or file | Required — the address is printed on the reverse. |

The input shows the number as it is typed so the engineer can check it, then the confirmation screen and every subsequent view show `XXXX XXXX 1234`.

### PAN

| Field | Type | Rules |
|---|---|---|
| PAN number | Text, auto-uppercase | 10 characters, pattern `[A-Z]{5}[0-9]{4}[A-Z]`. Stored in full — PAN is routinely stored for tax purposes. |
| Name as on PAN | Text | Required. |
| PAN image | Camera or file | Required. |

### Address proof

Required only when "same as permanent address" was switched off in registration, or when the reviewer judges the Aadhaar address to be out of date.

| Field | Type | Rules |
|---|---|---|
| Document type | Choice | Electricity bill, rent agreement, ration card, voter ID, passport, bank statement |
| Image | Camera or file | Required |
| Issue date | Date | Optional; most proofs must be recent, typically within three months — confirm the business rule |

### Bank details

Needed only if settlement pays engineers by bank transfer rather than cash or UPI. See [08 · Wallet](./08-wallet-and-payments.md).

| Field | Type | Rules |
|---|---|---|
| Account holder name | Text | Required. Should match the PAN name. |
| Account number | Text | Required. Entered twice, the second without paste, to catch typos. |
| IFSC | Text | Required. Pattern `[A-Z]{4}0[A-Z0-9]{6}`. |
| Bank and branch | Text | Auto-filled from IFSC if a lookup is available; otherwise manual. |
| UPI ID | Text | Optional, and often more practical than an account number. |
| Cancelled cheque or passbook image | Camera or file | Recommended. |

---

## Verification states

Each document carries its own state, independent of the others.

| State | Meaning |
|---|---|
| `not_uploaded` | Nothing submitted |
| `pending` | Uploaded, awaiting review |
| `verified` | Reviewer accepted it |
| `rejected` | Reviewer declined it, with a reason the engineer reads |
| `expired` | Past its validity date, where one applies |

An engineer reaches `approved` only when every required document is `verified`. Per-document states are what make `changes_requested` work — the engineer re-uploads only the one bad photograph rather than starting over.

### Standard rejection reasons

Offer the reviewer a preset list plus free text, so engineers get consistent, actionable messages:

- Image is blurred or unreadable
- Document is cut off at the edges
- Name does not match the application
- Document has expired
- Wrong document type uploaded
- Glare or shadow obscures the details

---

## Capture experience

This is where onboarding fails in practice. An engineer photographing an Aadhaar card in a dim room produces an image the reviewer rejects, and the loop repeats until someone gives up.

**Requirements for the capture screen:**

- A framing overlay in card aspect ratio, with the instruction to fill the frame
- Blur detection before upload; warn and offer a retake rather than uploading a bad image
- Glare warning where detectable
- A preview with retake and confirm, always
- Gallery upload permitted for documents — engineers often have scans already — but **not** for the profile photograph or site selfies, which must come from the camera
- Compress before upload: long edge around 1600px, JPEG quality around 80. Legibility matters more than resolution, and the server caps uploads at 10 MB.
- Show upload progress, and allow a retry that does not lose the captured image

---

## Storage and access

| Concern | Requirement |
|---|---|
| Transport | HTTPS only; certificate pinning worth considering for document upload |
| At rest | Encrypted. If Cloudinary continues as the store, documents must go to a **private, signed-URL folder**, separate from the public `khanexperttech/services` folder used for job photographs today. |
| URLs | Never public. Time-limited signed URLs, generated per view. |
| Access | Only administrators with an explicit KYC-view permission. This is a new permission token — the existing matrix has nothing suitable. |
| Audit | Every view of a document image is logged: who, when, which engineer, which document. |
| In the app | The engineer sees their own documents as masked values plus a thumbnail. The app never caches document images to disk. |
| Retention | Define a period — typically for the duration of engagement plus a statutory tail — and delete afterwards. Needs a business answer. |
| Backups | Whatever encryption applies to the primary store applies to backups. |

**On the current upload path.** Job photographs today go through `express-fileupload` with `useTempFiles: true` into `./tmp/`, and nothing ever deletes them (blocker B4 in the plan). KYC documents must not use that path until it deletes its temp files — an unencrypted Aadhaar image sitting indefinitely on the application server is precisely what the obligations above exist to prevent.

---

## Re-verification

Documents are not verified once and forgotten.

- The reviewer may mark a document `rejected` at any time, which drops the engineer out of `active` and back to `changes_requested`
- Documents with an expiry — driving licence, some address proofs — should raise an admin reminder ahead of the date and move to `expired` after it
- Bank detail changes always require re-verification, because that is the obvious fraud vector in a system that pays out money

---

## Rules

1. The full Aadhaar number is persisted, encrypted at rest — decided by the owner, overriding the masked-only default this document originally specified. It is never logged in plain text, never returned by any API response, and is always displayed to the engineer masked (`XXXX XXXX 1234`).
2. Document images are served exclusively through short-lived signed URLs.
3. Viewing a document image writes an audit entry.
4. An engineer cannot be activated with any required document not `verified`.
5. Changing bank details resets that document to `pending` and notifies an administrator.
6. The app never writes a document image to device storage.
7. Consent text version and timestamp are stored with the engineer record.
