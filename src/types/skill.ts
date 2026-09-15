/**
 * Shapes mirror backend/src/controllers/skillController.ts and the
 * skills sub-document on backend/src/models/engineerModel.ts.
 */

export interface Skill {
  _id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  requiresCertification: boolean;
  status: 'active' | 'inactive';
}

/** GET /api/skills/dropdown */
export interface SkillGroup {
  category: string;
  items: Skill[];
}

export type EngineerSkillStatus = 'pending' | 'approved' | 'rejected';

/**
 * One entry on the engineer's own skill list. `skillId` is populated
 * server-side, so it arrives as the full Skill object rather than a
 * bare id — never free text, matching the master it references.
 */
export interface EngineerSkillEntry {
  skillId: Skill;
  status: EngineerSkillStatus;
  removalRequested: boolean;
  certificateUrl?: string;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  rejectionReason?: string;
}
