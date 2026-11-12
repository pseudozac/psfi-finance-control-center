import type { FinancePlan } from './finance';

export type AccountAvatarColor = 'quasar' | 'corona' | 'solstice' | 'nebula' | 'pulsar';

export interface UserAccount {
  id: string;
  name: string;
  avatarColor: AccountAvatarColor;
  createdAt: string;
  updatedAt: string;
  plan: FinancePlan;
  baseline: FinancePlan | null;
}

export interface AccountStorageState {
  accounts: UserAccount[];
  activeAccountId: string;
}
