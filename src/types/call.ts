/**
 * Shape mirrors backend/src/controllers/engineerCallController.ts and
 * models/calldetailsModel.ts. Only the fields the assigned-call list and
 * card actually use are declared here — the server returns the full
 * document, but nothing downstream should depend on fields beyond these
 * until a job-detail screen needs them.
 */
export interface EngineerServiceLine {
  serviceName: string;
  amount: number;
  remarks?: string;
}

export type ServiceImageCategory =
  | 'service'
  | 'product'
  | 'nameplate'
  | 'bill'
  | 'warranty_card'
  | 'indoor_unit'
  | 'outdoor_unit'
  | 'site_before'
  | 'site_after'
  | 'fault_evidence'
  | 'selfie'
  | 'payment_proof';

export interface ServiceImage {
  public_id: string;
  secure_url: string;
  category?: ServiceImageCategory;
  isPrivate?: boolean;
}

export interface CustomerSignature {
  pathData: string;
  width: number;
  height: number;
  capturedAt: string;
  capturedBy: string;
}

/**
 * An engineer's request to be released from a call, and the office's
 * answer — NOT a request to cancel the call itself; the ticket stays open.
 *
 * While 'pending' the job stays in the list but is locked — the server
 * refuses edits. On 'approved' the engineer is cleared back to Unassigned,
 * which drops it out of the assigned list entirely, so the app only ever
 * sees an approved request in the brief window before the next refresh.
 */
/**
 * The engineer's travel to the job — what they rode, the vehicle's car
 * number, and the photo proving it. Recorded at check-in.
 *
 * It's a travel log, not a payment claim: the office reviews it, but no
 * money moves either way.
 */
export type RideVehicleType = '2W' | '3W' | '4W';

export const RIDE_VEHICLE_TYPES: RideVehicleType[] = ['2W', '3W', '4W'];

/** Whose vehicle it was: the engineer's own, or a hired/shared ride. */
export type RideMode = 'private' | 'public';

export const RIDE_MODES: RideMode[] = ['private', 'public'];

export const RIDE_MODE_LABEL: Record<RideMode, string> = {
  private: 'Private',
  public: 'Public',
};

export const RIDE_VEHICLE_LABEL: Record<RideVehicleType, string> = {
  '2W': '2 Wheeler',
  '3W': '3 Wheeler',
  '4W': '4 Wheeler',
};

export interface Ride {
  vehicleType: RideVehicleType;
  mode: RideMode;
  carNumber: string;
  photoUrl: string;
  photoPublicId?: string;
  recordedBy: string;
  recordedAt: string;
  status: 'pending' | 'approved' | 'declined';
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
}

/** A short video of the unit, kept apart from service_images (which are images only). */
export interface ServiceVideo {
  public_id: string;
  secure_url: string;
  duration?: number;
  bytes?: number;
  caption?: string;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * A part the engineer bought with their own money, from a shop near the job.
 *
 * `amountPaid` is what they are out of pocket and gets reimbursed once the
 * office approves; `customerPrice` is what the customer is billed and is a
 * separate figure carrying the company's margin.
 */
export interface SelfPurchasedPart {
  _id: string;
  partName: string;
  quantity: number;
  amountPaid: number;
  customerPrice?: number;
  shopName?: string;
  billPhotoUrl: string;
  billed: boolean;
  recordedBy: string;
  recordedAt: string;
  status: 'pending' | 'approved' | 'declined';
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
}

export interface CancellationRequest {
  reason: string;
  status: 'pending' | 'approved' | 'declined';
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  /** Why the office said no. Always present on a decline — the server requires it. */
  decisionNote?: string;
}

export interface EngineerNote {
  note: string;
  authorName: string;
  role: string;
  createdAt: string;
}

export interface ProductCorrection {
  field: string;
  previousValue?: string;
  newValue?: string;
  source: 'nameplate' | 'bill' | 'warranty_card' | 'customer_stated';
  correctedBy: string;
  correctedAt: string;
}

export type WarrantyStatus = 'in_warranty' | 'out_of_warranty' | 'disputed' | 'extended';

export interface GeoCheckIn {
  selfieUrl: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
}

export interface GeoCheckOut {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
}

export interface StepResult {
  order: number;
  label: string;
  notes?: string;
  photos?: ServiceImage[];
  amount?: number;
  completedAt?: string;
}

export interface AmountRevision {
  requestedAmount: number;
  reason: string;
  status: 'none' | 'pending' | 'approved' | 'declined';
  requestedAt?: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface ServiceStep {
  order: number;
  label: string;
  requiresPhoto: boolean;
  requiresAmount: boolean;
}

export interface EngineerCall {
  _id: string;
  callNumber: string;
  srNumber?: string;
  customerName: string;
  contactNumber: string;
  whatsappNumber?: string;
  address?: string;
  route?: string;
  pincode?: string;
  brandName?: string;
  productsName?: string;
  modelNumber?: string;
  serialNumber?: string;
  iduser?: string;
  oduser?: string;
  capacity?: string;
  starRating?: string;
  dateOfInstallation?: string;
  dealerName?: string;
  billNumber?: string;
  billAmount?: number;
  warrantyStatus?: WarrantyStatus;
  warrantyCheckedBy?: string;
  warrantyCheckedAt?: string;
  warrantyDisputeReason?: string;
  productCorrections?: ProductCorrection[];
  engineerNotes?: EngineerNote[];
  customerSignature?: CustomerSignature;
  paymentCollected?: boolean;
  serviceType?: string;
  jobStatus: string;
  subStatus?: string;
  status?: string;
  visitdate?: string;
  etaDate?: string;
  callDate?: string;
  dateofPurchase?: string;
  TAT?: number;
  warrantyTerms?: string;
  warrantyYears?: number;
  warrantyEndDate?: string;
  remarks?: string;
  cancelReason?: string;
  cancellationRequest?: CancellationRequest;
  ride?: Ride;
  selfPurchasedParts?: SelfPurchasedPart[];
  service_videos?: ServiceVideo[];
  /** Identity fields the office filled in — the engineer cannot overwrite these. */
  officeSetIdentity?: string[];
  closerCode?: string;
  engineerServices?: EngineerServiceLine[];
  service_images?: ServiceImage[];
  checkIn?: GeoCheckIn;
  checkOut?: GeoCheckOut;
  stepResults?: StepResult[];
  amountRevision?: AmountRevision;
  updatedAt: string;
}

/** PUT /api/engineer-calls/:id */
/**
 * Every field is optional: the job is now saved one step at a time, so a
 * step sends only its own slice. The server already treats each field
 * independently (), so a partial update is exactly
 * what it expects.
 */
export interface UpdateEngineerCallPayload {
  subStatus?: string;
  remarks?: string;
  serialNumber?: string;
  cancelReason?: string;
  engineerServices?: EngineerServiceLine[];
  closerCode?: string;
}

export interface UpdateEngineerCallResponse {
  success: boolean;
  message: string;
  call: EngineerCall;
}

/** POST /api/engineer-calls/:id/upload-image */
export interface UploadServiceImagesResponse {
  success: boolean;
  message: string;
  service_images: ServiceImage[];
}

export interface EngineerCallSummary {
  totalCount: number;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
}

/** GET /api/engineer-calls */
export interface EngineerCallListResponse {
  success: boolean;
  count: number;
  page: number;
  totalPages: number;
  summary: EngineerCallSummary;
  calls: EngineerCall[];
}
