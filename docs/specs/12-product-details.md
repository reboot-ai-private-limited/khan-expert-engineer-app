# 12 · Product Details & Documents

**Depends on:** [06 · Job Execution](./06-job-execution.md)
**Related:** [07 · Spare Parts](./07-spare-parts.md), [08 · Wallet](./08-wallet-and-payments.md)

---

## Why this exists

The office books a call from a telephone conversation. The customer says "my AC is not cooling", gives a brand from memory, and a model number they are reading off a remote control or not at all. That record is a best guess.

The engineer is the first person to actually see the machine. They can read the nameplate, photograph the unit, and — critically — look at the customer's purchase bill. Three things depend on getting that right:

1. **Warranty.** Whether the customer pays is decided by the date of purchase, and the bill is the evidence. This is the most commonly disputed point in appliance service.
2. **Spare parts.** Ordering the wrong compressor because the model number was wrong wastes a visit and a part.
3. **Service history.** The machine, not the customer, is the thing being serviced over its life.

So the engineer does not just record work performed. They **verify and correct the product record**, and attach the evidence.

---

## What the engineer captures

### Photographs

| Photograph | Required | Purpose |
|---|---|---|
| **Product photograph** | Yes | The unit as installed, in situ. Establishes what was worked on and its condition on arrival. |
| **Nameplate / rating label** | Yes | Where the model and serial numbers actually live. Must be legible — this is the one photograph the office will zoom into. |
| **Purchase bill** | When claimed in warranty | Establishes the date of purchase. Multiple pages permitted. |
| **Warranty card** | If the customer has one | Some brands issue a separate card with its own terms |
| **Indoor unit** | Split systems | The schema already separates indoor and outdoor serials |
| **Outdoor unit** | Split systems | Often on a balcony or roof — condition matters for installation disputes |
| **Installation site** | For installations | Before and after |
| **Fault evidence** | When relevant | The burnt PCB, the leaking joint — supports the amount charged |

### Structured product fields

Most of these already exist on the call ticket. The engineer confirms or corrects them.

| Field | Schema status | Notes |
|---|---|---|
| Brand | `brandName` exists | Correct against the nameplate. Picker from the brand master. |
| Product type | `productsName` exists | Picker from the product master. |
| Model number | `modelNumber` exists | From the nameplate, not the customer's memory. |
| Serial number | `serialNumber` exists | The current portal already prompts for this. |
| Indoor unit serial | `iduser` exists | Split systems |
| Outdoor unit serial | `oduser` exists | Split systems |
| Capacity / tonnage | **New** | 1.0T, 1.5T, 2.0T. Needed for spare matching and for quoting. |
| Star rating | **New** | On the nameplate; occasionally relevant to parts |
| Date of purchase | `dateofPurchase` exists | **From the bill.** Drives warranty. |
| Date of installation | **New** | Some warranties run from installation, not purchase |
| Dealer / seller name | **New** | From the bill. Matters for brand warranty claims. |
| Bill number | **New** | From the bill |
| Bill amount | **New** | From the bill |
| Warranty terms | `warrantyTerms` exists | Picker from the warranty master |
| Warranty years | `warrantyYears` exists | |
| Warranty end date | `warrantyEndDate` exists | Computed, overridable |

---

## Verify-and-correct, not overwrite

The office entered something. The engineer is changing it. **Both values matter**, and a silent overwrite destroys the more interesting one.

When an engineer changes a product field, record a correction entry:

| Field | Notes |
|---|---|
| `field` | Which value changed |
| `previousValue`, `newValue` | Both kept |
| `source` | `nameplate` · `bill` · `warranty_card` · `customer_stated` |
| `evidenceImageId` | The photograph the engineer read it from |
| `correctedBy`, `correctedAt` | Audit |

Two reasons this is worth the extra table. It shows the office where their intake is consistently wrong — if brand is corrected on a third of jobs, the booking script needs fixing. And when a warranty claim is later disputed, the trail shows exactly what was read, from which document, by whom.

The engineer's corrected value becomes the ticket's live value. The original is not lost.

---

## Warranty determination

This is the part with money attached.

```
Bill photographed  →  date of purchase  →  warranty period (from the warranty master)
                                              │
                                              ▼
                               in warranty ── or ── out of warranty
                                    │                     │
                              customer pays          customer pays
                              nothing, or            the full amount
                              labour only
```

**The app computes the warranty status from the bill and shows it, with the evidence.** It does not decide silently.

| State | Meaning |
|---|---|
| `in_warranty` | Purchase date plus warranty period is in the future, bill attached |
| `out_of_warranty` | Expired, or no bill produced |
| `disputed` | Customer disagrees with the computed status |
| `extended` | Extended or AMC cover applies |

**Decided (owner): a purchase bill is mandatory for a warranty claim, with no exception.** This reverses the spec's original recommendation. There is no `unverified` state — a customer without a bill is `out_of_warranty` by default, and the job proceeds as chargeable. If the customer disputes that outcome, it is recorded as `disputed` and the office resolves it, but the engineer does not withhold service or treat the claim as pending on a missing receipt.

**Warranty status changes who pays**, so it feeds directly into the amount, and through the amount into the wallet. A job switching from in-warranty to out-of-warranty on site is an amount revision under [06](./06-job-execution.md), with the same mandatory reason and customer confirmation. This is exactly the case that flow exists for.

---

## The schema gap this exposes

Service photographs today go into a single flat array:

```
service_images: [{ public_id, secure_url }]
```

No category, no caption, no capture metadata, no ordering. Every photograph an engineer takes lands in one undifferentiated pile.

That is already awkward. With product photographs, nameplate photographs, bill pages, warranty cards, indoor and outdoor unit shots and fault evidence all going into the same array, it becomes unusable — the office cannot find the bill, and the app cannot show "the nameplate" on the product screen.

**Add a category and metadata to each image:**

| Field | Notes |
|---|---|
| `category` | `service` · `product` · `nameplate` · `bill` · `warranty_card` · `indoor_unit` · `outdoor_unit` · `site_before` · `site_after` · `fault_evidence` · `selfie` |
| `caption` | Optional, engineer-entered |
| `stepId` | Which workflow step produced it |
| `capturedAt` | Device timestamp |
| `uploadedAt` | Server timestamp |
| `uploadedBy` | Engineer or staff |
| `sortOrder` | Bill pages have an order |

**Migration:** existing images become `category: 'service'`. The array shape is preserved, so nothing that reads it today breaks.

The arrival selfie from [06](./06-job-execution.md) should be a category here rather than a separate field, so there is one image pipeline instead of two.

---

## Privacy — the bill is the customer's document

A purchase bill carries the customer's name, address, telephone number and what they paid. It is customer personal data, not a photograph of a machine.

Service images today are uploaded to the Cloudinary folder `khanexperttech/services` with public URLs. **A customer's purchase invoice must not sit at a guessable public URL.** The same reasoning applies as to KYC documents in [02](./02-kyc-and-documents.md):

- Bills, warranty cards and anything else bearing customer details go to a **private folder with signed, time-limited URLs**
- Product, nameplate and fault photographs can remain in the general job image store
- The app does not cache bill images to device storage
- The engineer can view a bill only while the job is open to them

This is a per-category storage decision, which is another reason the category field is not optional.

---

## Capture experience

The nameplate photograph is the one that fails. It is a small metal or foil label, often in a dark recess behind the unit, frequently at an angle, and the engineer is photographing it one-handed.

- Framing guide with a zoom control; nameplate labels are small
- Torch toggle — most of these labels are in shade
- Blur detection before accepting; a blurred nameplate is worthless
- Allow multiple attempts without losing earlier captures
- After capture, the model and serial fields sit directly beneath the photograph so the engineer types what they are looking at

**Bill photographs:** multi-page support with ordering, gallery upload permitted because customers often have a digital copy on their own phone, and a warning if the image is too low-resolution for the date to be read.

**Decided (owner): no OCR**, now or later. Nameplate and bill fields are typed by the engineer, full stop.

---

## Where this sits in the job flow

Product capture is a **step in the template** from [06](./06-job-execution.md), not a separate screen bolted on:

```
arrived → verify product → diagnose → [work steps] → test → complete
              │
              ├── photograph unit + nameplate
              ├── confirm or correct product fields
              ├── warranty check → bill photograph
              └── warranty status → affects the amount
```

Placing it immediately after arrival is deliberate. Warranty status determines who pays, and the engineer should establish that **before** doing work, not after — discovering at the end that a job is chargeable, when the customer believed it was covered, is how disputes start.

For service types where it does not apply, the step template omits it.

---

## Offline

Everything here works offline. Photographs are stored locally and queued; field corrections queue as ordinary writes. Warranty computation is local arithmetic over the warranty master, which is cached, so the engineer gets a warranty answer with no signal.

The only online dependency is fetching warranty terms the app has never cached. Ship the warranty master with the cached lookups at login.

---

## API

| Method | Path | Notes |
|---|---|---|
| POST | `/engineer-calls/:id/upload-image` | **Modify** — accept a `category`, `caption` and `stepId`; route by category to public or private storage; delete the temp file (B4) |
| PUT | `/engineer-calls/:id/product-details` | New — corrected product fields, each with source and evidence image |
| GET | `/engineer-calls/:id/product-history` | New — corrections made, for the office |
| POST | `/engineer-calls/:id/warranty-check` | New — records status, evidence and reason; returns the computed suggestion |
| GET | `/warranties/dropdown` | **Exists** — warranty terms master |
| GET | `/brands/dropdown`, `/products/dropdown` | **Exist** — for correction pickers |

---

## Rules

1. A product photograph and a legible nameplate photograph are required before a job can complete, unless the step template omits the product step.
2. A warranty claim without a bill is `out_of_warranty` — chargeable, not `unverified`. Service is never refused; the job simply proceeds as paid.
3. Product corrections are recorded with the previous value, the source and the evidence image. Values are never silently overwritten.
4. Every uploaded image carries a category.
5. Bills and warranty cards go to private storage with signed URLs. They are never public.
6. The app does not cache bill images to device storage.
7. A warranty status change that alters who pays is an amount revision, with a mandatory reason and customer confirmation.
8. Warranty status is computed and suggested by the app, and confirmed by a person.
