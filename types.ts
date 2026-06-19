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
  connector: string;
  sortOrder?: number;
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
  | '🎯 Identified Opportunity'
  | '📞 Outreach'
  | '⏳ Wait'
  | '🔵 Negotiations'
  | '🟢 In Good Discussion'
  | '✅ Signed'

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
  '✅ Signed',
  '🔵 Negotiations',
  '🟢 In Good Discussion',
  '🟡 Prospect',
  '🎯 Identified Opportunity',
  '📞 Outreach',
  '⏳ Wait',

  '📦 Archived',
  '🔴 Churned',
];

/** Stages available for the dropdown (excludes "All") */
export const EDITABLE_STAGES: string[] = [
  '✅ Signed',
  '🔵 Negotiations',
  '🟢 In Good Discussion',
  '🟡 Prospect',
  '🎯 Identified Opportunity',
  '📞 Outreach',
  '⏳ Wait',

  '📦 Archived',
  '🔴 Churned',
];

export const STAGE_COLORS: Record<string, string> = {
  '🟡 Prospect': 'badge-warning',
  '🎯 Identified Opportunity': 'badge-accent',
  '📞 Outreach': 'badge-secondary',
  '⏳ Wait': 'badge-neutral',
  '🔵 Negotiations': 'badge-info',
  '🟢 In Good Discussion': 'badge-success',
  '✅ Signed': 'badge-primary',

  '📦 Archived': 'badge-ghost',
  '🔴 Churned': 'badge-error',
};

/** Sort priority — lower number = listed first */
export const STAGE_SORT_ORDER: Record<string, number> = {
  '✅ Signed': 0,
  '🔵 Negotiations': 1,
  '🟢 In Good Discussion': 2,
  '🟡 Prospect': 3,
  '🎯 Identified Opportunity': 4,
  '📞 Outreach': 5,
  '⏳ Wait': 6,

  '🔴 Churned': 7,
  '📦 Archived': 8,
};

export const PRIORITIES = ['All', '⭐ VIP', 'Standard'];
export const ACCOUNT_MANAGERS = ['All', 'Adi', 'Tess', 'Cydel', 'Ben', 'Caron'];

/** Managers for the assignment dropdown (excludes "All") */
export const EDITABLE_MANAGERS: string[] = ['Tess', 'Ben', 'Caron', 'Cydel', 'Adi'];
