/**
 * Company details printed on the engineer's temporary ID card.
 *
 * Mirrors the `khan_expert` entry in
 * frontend/src/constants/companyProfiles.ts — kept as a small local copy
 * rather than fetched, because the ID card has to render offline from the
 * cached card (see services/storage/idCardCache.ts).
 */
export const COMPANY = {
  name: 'KHAN EXPERT TECHNOLOGY',
  tagline: 'Refrigeration & Air Conditioner Service',
  address:
    'New South Ambedkar Colony, Pradhan Nagar, Nr. Sarda Math, Siliguri, West Bengal — 734003',
  mobile: '9576768686',
  email: 'khanexpertslg@gmail.com',
  gstin: '19FUEPK1279J1Z6',
} as const;
