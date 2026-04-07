export interface Partner {
  id: string;
  url: string;
  name: string;
  email: string;
  company: string;
  onboardingStage: string;
  priority: string;
  accountManager: string;
  appUserId: string;
  channelLink: string;
  channelStatus: string;
  youtubeChannel: string;
  popcornChannel: string;
  driveFolder: string;
  useCase: string;
  nextSteps: string;
  lastConversation: string;
  nextFollowUp: string;
  source: 'crm' | 'onboarding' | 'both' | 'manual';
  detailsLoaded: boolean;
}

export interface OnboardingEntry {
  name: string;
  userId: string;
  channelStatus: string;
  accountManager: string;
  youtubeUrl: string;
  popcornUrl: string;
}

export interface Conversation {
  id: string;
  url: string;
  title: string;
  customerUrl: string;
  channel: string;
  loggedBy: string;
  summary: string;
  keyTakeaways: string;
  nextSteps: string;
  date: string;
}

export type OnboardingStage =
  | '🟡 Prospect'
  | '🔵 Active Onboarding'
  | '🟢 Ongoing Management'
  | '💪 Self Sufficient'
  | '📦 Archived'
  | '🔴 Churned'
  | 'All';

export type ViewMode = 'list' | 'detail';

export interface Filters {
  stage: OnboardingStage;
  priority: string;
  accountManager: string;
  search: string;
}

export const STAGES: OnboardingStage[] = [
  'All',
  '🔵 Active Onboarding',
  '🟢 Ongoing Management',
  '🟡 Prospect',
  '💪 Self Sufficient',
  '📦 Archived',
  '🔴 Churned',
];

/** Stages available for the dropdown (excludes "All") */
export const EDITABLE_STAGES: string[] = [
  '🔵 Active Onboarding',
  '🟢 Ongoing Management',
  '🟡 Prospect',
  '💪 Self Sufficient',
  '📦 Archived',
  '🔴 Churned',
];

export const STAGE_COLORS: Record<string, string> = {
  '🟡 Prospect': 'badge-warning',
  '🔵 Active Onboarding': 'badge-info',
  '🟢 Ongoing Management': 'badge-success',
  '💪 Self Sufficient': 'badge-accent',
  '📦 Archived': 'badge-ghost',
  '🔴 Churned': 'badge-error',
};

/** Sort priority — lower number = listed first */
export const STAGE_SORT_ORDER: Record<string, number> = {
  '🔵 Active Onboarding': 1,
  '🟢 Ongoing Management': 2,
  '🟡 Prospect': 3,
  '💪 Self Sufficient': 4,
  '🔴 Churned': 5,
  '📦 Archived': 6,
};

export const PRIORITIES = ['All', '⭐ VIP', 'Standard'];
export const ACCOUNT_MANAGERS = ['All', 'Adi', 'Tess', 'Cydel', 'Ben', 'Maria'];

/** Managers for the assignment dropdown (excludes "All") */
export const EDITABLE_MANAGERS: string[] = ['Tess', 'Ben', 'Maria', 'Cydel', 'Adi'];
