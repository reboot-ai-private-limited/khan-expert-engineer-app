export type SpareRequestUrgency = 'immediate' | 'today' | 'next_visit';

export type SpareRequestStatus =
  | 'requested'
  | 'acknowledged'
  | 'in_stock'
  | 'ordered'
  | 'dispatched'
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export interface SpareRequestPhoto {
  public_id: string;
  secure_url: string;
}

export interface SpareRequestStatusEvent {
  status: string;
  changedBy: string;
  changedAt: string;
  note?: string;
}

export interface SpareRequest {
  _id: string;
  callTicketId: string;
  callNumber: string;
  engineerId: string;
  engineerName: string;
  itemId?: string;
  itemName: string;
  isFreeText: boolean;
  quantity: number;
  urgency: SpareRequestUrgency;
  reason: string;
  partNumber?: string;
  customerWaiting: boolean;
  photos: SpareRequestPhoto[];
  status: SpareRequestStatus;
  rejectionReason?: string;
  substituteItemName?: string;
  substituteNote?: string;
  deliveredQty?: number;
  statusHistory: SpareRequestStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

export const SPARE_REQUEST_STATUS_LABEL: Record<SpareRequestStatus, string> = {
  requested: 'Requested — waiting on the office',
  acknowledged: 'Office has seen this',
  in_stock: 'Available, being arranged',
  ordered: 'Not in stock, being purchased',
  dispatched: 'On its way to you',
  delivered: 'Delivered',
  rejected: 'Declined by the office',
  cancelled: 'Cancelled',
};

/** Terminal states — nothing more can happen to the request. */
export const isSpareRequestTerminal = (status: SpareRequestStatus): boolean =>
  status === 'delivered' || status === 'rejected' || status === 'cancelled';
