# 03 · Skills

**Depends on:** nothing — build this first
**Blocks:** [01 · Registration](./01-auth-and-registration.md), [04 · Assignment](./04-assignment-and-dashboard.md)

---

## The principle

Skills are a **master list maintained by administrators**. Engineers select from it; they never type free text.

This is the same pattern the CRM already uses for brands, products, service types, job statuses and sources — each has a master collection, a `/dropdown` endpoint, and admin CRUD screens under General Masters. Skills follow that pattern exactly, which makes them cheap to build and familiar to operate.

The reason free text is excluded: assignment depends on matching. "AC Gas Charging", "gas charging", "Gas filling" and "AC gas refill" typed by four engineers produce four unmatchable values, and skill-based assignment silently stops working.

---

## Skill master

Managed in the admin panel alongside the existing masters.

| Field | Type | Notes |
|---|---|---|
| `name` | String, unique | Displayed to engineers. E.g. "Split AC Installation" |
| `code` | String, unique | Stable identifier, uppercase. Follows the existing `brandModel` convention. |
| `category` | String | Groups skills in the picker. E.g. Air Conditioning, Refrigeration, Electrical, Plumbing |
| `description` | String | Optional, shown as helper text in the picker |
| `requiresCertification` | Boolean | If true, selecting it prompts for a certificate upload |
| `isActive` | Boolean | Soft delete. Inactive skills stay on existing engineer records but disappear from the picker. |
| `sortOrder` | Number | Manual ordering within a category |

**Never hard-delete a skill.** Engineer records and historical assignments reference it. Deactivate instead — the existing masters have the same consideration and should be checked for whether they handle it.

### Suggested starting categories

Drawn from the service work the CRM already handles — the existing service types, products and the engineer service names seen in the current portal ("Gas Charging", "PCB Repair"):

- **Air Conditioning** — split installation, window installation, gas charging, PCB repair, compressor replacement, servicing, dismantling
- **Refrigeration** — refrigerator repair, deep freezer, water cooler, visi cooler
- **Home appliances** — washing machine, microwave, geyser, chimney
- **Electrical** — wiring, stabiliser, panel work
- **General** — site survey, customer training

The real list should come from whoever runs the service desk. This is a starting point for the conversation, not a proposal.

---

## Engineer skill selection

### In the app — registration step 4

- Skills grouped by category, collapsible, with a search box
- Multi-select with checkboxes; running count of selected skills
- At least one skill required to submit
- Selecting a skill with `requiresCertification` reveals a certificate upload for that skill
- Optional proficiency per skill, if the business wants it — see the open question below

### After approval

An engineer can request additions to their skill list at any time from their profile. A request moves that skill to `pending` and notifies an administrator; the engineer keeps working with their approved skills meanwhile. Removing a skill is also a request, not an immediate action — an engineer should not be able to drop a skill to dodge an assignment.

### Per-engineer skill record

| Field | Type | Notes |
|---|---|---|
| `skillId` | Reference | To the skill master |
| `status` | Enum | `pending`, `approved`, `rejected` |
| `proficiency` | Enum, optional | `beginner`, `intermediate`, `expert` — see open question |
| `certificateUrl` | String, optional | Required when the skill demands certification |
| `addedAt`, `approvedAt`, `approvedBy` | — | Audit |

Only `approved` skills count for assignment matching.

---

## Proficiency — an open question

Two options, and the choice affects both the picker and the assignment screen.

**Option A — no proficiency.** An engineer either has a skill or does not. Simplest, and probably sufficient for a service team of this size.

**Option B — three levels.** Enables "send the expert to the difficult job" and could feed a commission differential later. Costs a self-assessment field engineers will inflate, and a verification burden on administrators.

**Recommendation: Option A.** Add proficiency only when someone can describe a specific decision it would change. Note that adding it later is a cheap migration; removing it after engineers have set values is not.

---

## Skill-based assignment

Specified in [04 · Assignment](./04-assignment-and-dashboard.md); the skill side of it:

- A call ticket's `serviceType` maps to one or more required skills, through a mapping the admin maintains
- When assigning, the admin screen shows engineers who hold the required skill, sorted by route match and current workload
- Engineers without the skill are not hidden but are shown separately under "Other engineers" with a warning, because on a short-staffed day the office will override the match and should be able to
- An override is recorded on the assignment

**This mapping is new work.** Today `serviceType` is a free-text string on the call ticket with its own master collection. Linking service types to required skills is a small admin screen that has to exist before skill-based assignment does anything useful.

---

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/skills/dropdown` | Active skills for the picker, grouped by category. Follows the existing dropdown convention — open to any authenticated user. |
| `GET /api/skills` | Admin list with filters |
| `POST /api/skills` | Create — `general_masters:create` |
| `PUT /api/skills/:id` | Update — `general_masters:edit` |
| `DELETE /api/skills/:id` | Deactivate, never hard delete — `general_masters:delete` |
| `POST /api/engineer-auth/skills` | Engineer requests skill additions or removals |
| `PUT /api/engineers/:id/skills` | Admin approves or rejects requested skills |

Reusing the `general_masters` permission tokens keeps skills consistent with brands, products and service types, and avoids adding a permission that has to be granted to everyone who already manages masters.

---

## Rules

1. Skills are never free text on an engineer record.
2. Skills are deactivated, never deleted.
3. Only `approved` skills count for assignment.
4. An engineer must hold at least one approved skill to be activated.
5. Assigning an engineer who lacks the required skill is permitted but recorded as an override.
