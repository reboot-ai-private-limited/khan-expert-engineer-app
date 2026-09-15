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

export interface ServiceImage {
  public_id: string;
  secure_url: string;
}

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
export interface UpdateEngineerCallPayload {
  subStatus: string;
  remarks?: string;
  serialNumber?: string;
  cancelReason?: string;
  engineerServices: EngineerServiceLine[];
  closerCode: string;
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
