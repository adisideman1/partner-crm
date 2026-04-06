import React from 'react';
import { Users, Star, AlertTriangle, CheckCircle, KeyRound } from 'lucide-react';
import { Partner } from '../types';

interface StatsBarProps {
  partners: Partner[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ partners }) => {
  const total = partners.length;
  const vip = partners.filter((p) => p.priority === '⭐ VIP').length;
  const active = partners.filter((p) => p.onboardingStage === '🔵 Active Onboarding').length;
  const graduated = partners.filter((p) => p.onboardingStage === '🟢 Ongoing Management').length;

  const now = new Date();
  const overdue = partners.filter((p) => {
    if (!p.nextFollowUp) return false;
    return new Date(p.nextFollowUp) < now;
  }).length;

  const linked = partners.filter((p) => p.appUserId).length;

  const stats = [
    { label: 'Total Partners', value: total, icon: Users, color: 'text-primary' },
    { label: 'VIP', value: vip, icon: Star, color: 'text-warning' },
    { label: 'Active Onboarding', value: active, icon: AlertTriangle, color: 'text-info' },
    { label: 'Ongoing Mgmt', value: graduated, icon: CheckCircle, color: 'text-success' },
    { label: 'Linked (User ID)', value: linked, icon: KeyRound, color: 'text-secondary' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="card bg-base-200">
          <div className="card-body p-4 flex-row items-center gap-3">
            <s.icon className={`${s.color} shrink-0`} size={22} />
            <div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-base-content/60">{s.label}</div>
            </div>
          </div>
        </div>
      ))}
      {overdue > 0 && (
        <div className="col-span-2 lg:col-span-4">
          <div className="alert alert-warning py-2">
            <AlertTriangle size={16} />
            <span className="text-sm">{overdue} partner{overdue > 1 ? 's' : ''} overdue for follow-up</span>
          </div>
        </div>
      )}
    </div>
  );
};
