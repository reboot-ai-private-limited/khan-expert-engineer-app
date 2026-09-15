# 11 · Open Questions

Everything that needed a policy decision from the owner has been answered — see the decision log in [`../engineer-flow.md`](../engineer-flow.md#decisions--resolved-by-the-owner), and the individual spec files (02, 04, 05, 06, 07, 08, 12), each updated in place with a **Decided (owner):** note where the answer changed the original recommendation.

What's left below needs either a **number**, or a technical call from whoever leads the backend build — nothing here is a business decision waiting on the owner.

---

## Needs a number

- **Cash-in-hand limit** (₹) — the balance above which an engineer is blocked from new job assignment. Policy is decided; the figure isn't.
- **Price-increase approval threshold** (₹ or %) — the amount above which a job's amount revision needs office approval before collection. Policy is decided; the figure isn't.
- **Payment gateway provider** — which one to integrate for online payment verification. Affects transaction fees and backend effort.

## Technical, for the backend build

- **How does `scheduledAt` relate to the existing date fields?** `visitdate`, `etaDate` and `gddate` all exist on the call ticket with no clearly distinct meanings. Which does `scheduledAt` supersede, and can any be retired?
- **How does `workflowState` map to `jobStatus` and `subStatus`?** The web CRM, dashboard alerts, billing conversion and estimate flow all read the existing free-text fields. The mapping has to be written down and tested before anything depends on it. Simpler now that `travelling` is out of the state machine.
- **Does the deployment run a MongoDB replica set?** Job completion and settlement need transactions, which require one.

---

## Questions the specs already answer, recorded so they are not reopened

| Question | Answer | Where |
|---|---|---|
| Can engineers close or cancel jobs? | No. Already enforced server-side, and it stays. | [04](./04-assignment-and-dashboard.md) |
| Can engineers edit completed jobs? | No, read-only. | [04](./04-assignment-and-dashboard.md) |
| Free-text skills? | No, master list only. | [03](./03-skills.md) |
| Selfie from the gallery? | No, live camera only. | [06](./06-job-execution.md) |
| Background location tracking? | No, foreground only, at check-in. | [06](./06-job-execution.md) |
| Can a bad GPS fix block check-in? | No, it flags for review. | [06](./06-job-execution.md) |
| Is the wallet balance stored? | No, derived from an append-only ledger. | [08](./08-wallet-and-payments.md) |
| Can ledger entries be edited? | No, corrections are reversal entries. | [08](./08-wallet-and-payments.md) |
| Can an engineer clear their own balance? | No, admin confirmation moves it. | [08](./08-wallet-and-payments.md) |
| Does the QR encode the card? | No, it points at a server-verified page. | [05](./05-id-card.md) |
| Does the verification page show the customer's address? | No. | [05](./05-id-card.md) |
| Are product corrections overwritten? | No, previous value and evidence are kept. | [12](./12-product-details.md) |
| Do purchase bills go to public storage? | No, private with signed URLs. | [12](./12-product-details.md) |
