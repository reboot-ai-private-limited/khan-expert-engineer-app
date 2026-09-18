import { Linking } from 'react-native';

interface Locatable {
  address?: string;
  route?: string;
  pincode?: string;
  customerName?: string;
}

/**
 * The customer's location as a maps query.
 *
 * Customers have no stored coordinates — geocoding was never built (the
 * same gap that blocks the "engineer is >500m from the customer" check in
 * jobExecutionService). So this searches on the address text rather than
 * dropping an exact pin, and the pincode is included because a bare Indian
 * street address is often ambiguous without it.
 *
 * Returns null when there is nothing worth searching for, so callers can
 * hide the button rather than open an empty map.
 */
export const customerMapQuery = (call: Locatable): string | null => {
  const parts = [call.address, call.route, call.pincode]
    .map((p) => (p ?? '').trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  // De-duplicate: `route` is frequently the same area string as part of the
  // address, and repeating it only makes the search worse.
  const seen = new Set<string>();
  const unique = parts.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.join(', ');
};

export const canShowCustomerLocation = (call: Locatable): boolean => customerMapQuery(call) !== null;

/**
 * Opens the address in whatever handles maps on the device. Uses the same
 * `google.com/maps?q=` form the admin panel already uses for check-in
 * coordinates, which Android hands to Google Maps and falls back to the
 * browser everywhere else.
 */
export const openCustomerLocation = async (call: Locatable): Promise<void> => {
  const query = customerMapQuery(call);
  if (!query) return;

  await Linking.openURL(`https://www.google.com/maps?q=${encodeURIComponent(query)}`);
};
