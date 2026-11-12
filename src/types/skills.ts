export type SkillTier = 'tier1_survival' | 'tier2_velocity' | 'tier3_autonomy';

export type SkillStatus = 'locked' | 'in_progress' | 'mastered';

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
}

export interface SkillTreeState {
  nodes: SkillNode[];
  overallMasteryPercent: number;
  unlockedCount: number;
  totalCount: number;
  currentRank: string;
  nextRank: string;
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
}
