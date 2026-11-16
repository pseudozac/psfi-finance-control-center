export type SkillTier = 'tier1_survival' | 'tier2_velocity' | 'tier3_autonomy';

export type SkillStatus = 'locked' | 'in_progress' | 'mastered';

export type EvidenceType = 'budgeted' | 'assumed' | 'verified';

export interface PolicyCoverageDetails {
  policyType: string;
  targetCoverage: string;
  verifiedStatus: boolean;
  verificationRequirements: string;
  evidenceNotes?: string;
}

export interface SkillNode {
  id: string;
  tier: SkillTier;
  title: string;
  badge: string;
  category: 'defense' | 'offense' | 'tax' | 'autonomy';
  description: string;
  actuarialPrinciple: string;
  iconName: string;
  requiredParentIds: string[]; // Prerequisite node IDs
  currentMetricLabel: string;
  targetMetricLabel: string;
  progressPercent: number; // 0 to 100
  status: SkillStatus;
  gapRupeesOrMonths?: string;
  actionableStep: string;
  // Evidence Classification and Integrity Audit
  evidenceType: EvidenceType;
  evidenceDescription: string;
  policyDetails?: PolicyCoverageDetails;
  // Kinetic Constellation layout coordinates (percentage 0-100)
  gridColumn: number; // 1 to 5
  gridRow: number; // 1 to 3
  // Symmetrical Visual RPG Skill Tree Canvas coordinates (0 to 860, 0 to 620)
  treeX?: number;
  treeY?: number;
  shortLabel?: string;
  suggestedAction?: {
    field: string;
    targetValue: number;
    description: string;
  };
}

export interface RankPerk {
  rankName: string;
  tierRequired: number;
  perks: string[];
  lore: string;
}

export interface SovereignBadge {
  id: string;
  title: string;
  category: 'defense' | 'velocity' | 'autonomy' | 'discipline';
  icon: string;
  tagline: string;
  requirement: string;
  isUnlocked: boolean;
  unlockedAtLabel?: string;
  progressPercent: number;
  currentValueLabel: string;
  targetValueLabel: string;
  xpReward: number;
  tier: 1 | 2 | 3;
  suggestedAction?: {
    field: string;
    targetValue: number;
    description: string;
  };
}

export interface SkillTreeState {
  nodes: SkillNode[];
  overallMasteryPercent: number;
  unlockedCount: number;
  totalCount: number;
  currentRank: string;
  nextRank: string;
  currentRankPerks: string[];
  nextRankPerks: string[];
  tier1MasteredCount: number;
  tier2MasteredCount: number;
  tier3MasteredCount: number;
  // Sovereign XP & Progression Level System
  totalXP: number;
  maxPossibleXP: number;
  level: number;
  levelTitle: string;
  nextLevelXP: number;
  currentLevelProgressPercent: number;
  badges: SovereignBadge[];
  unlockedBadgesCount: number;
}

export type SpendCategory = 'chai_quick' | 'dining_night' | 'retail_impulse' | 'other';

export interface SpendLogEntry {
  id: string;
  category: SpendCategory;
  title: string;
  amount: number;
  timestamp: number;
}

export interface CoolingOffItem {
  id: string;
  title: string;
  amount: number;
  createdAt: number;
  expiresAt: number; // createdAt + 72 hours
  burnEquivalentDays: number;
  workHoursEquivalent: number;
  tenYearOpportunityCost: number; // compounding in Nifty 50 at 12%
}

export interface DailyBurnState {
  currentDayOfMonth: number;
  totalDaysInMonth: number;
  remainingDaysInMonth: number;
  monthlyDiscretionaryPool: number; // Inflow - Needs - SIP
  baseDailyBurn: number; // monthlyDiscretionary / totalDays
  effectiveDailyBurnToday: number; // with weekend multiplier if active
  spentToday: number;
  remainingBurnToday: number;
  isOverspentToday: number;
  recalibratedRemainingDailyBurn: number; // adjusted for remaining days
  isSipShieldActive: boolean; // True if spending exceeded, shield engages to protect SIP
  sipProtectedAmount: number;
  weekendModeActive: boolean;
  disciplineStreakDays: number;
  bankedSurplusRupees: number;
  surplusDestination: 'weekend_pot' | 'bonus_sip';
  hourlyEarningRate: number; // monthlyInflow / 160 hours
}
