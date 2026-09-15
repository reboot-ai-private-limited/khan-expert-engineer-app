export type IdCardStatus = 'issued' | 'revoked' | 'expired';

export interface IdCard {
  _id: string;
  callId: string;
  token: string;
  status: IdCardStatus;
  issuedAt: string;
  validUntil: string;
  ticketNumber: string;
  customerName: string;
  area: string;
  engineer: {
    name: string;
    code: string;
    skills: string[];
    photoUrl: string | null;
  } | null;
  verifyUrl: string;
}
