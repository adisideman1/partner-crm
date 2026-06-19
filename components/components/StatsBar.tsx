import React from 'react';
import { Users, Star, AlertTriangle, CheckCircle, KeyRound, DollarSign, Zap } from 'lucide-react';
import { Partner } from '../types';

interface StatsBarProps {
  partners: Partner[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ partners }) => {
  const total = partners.length;
  const signed = partners.filter((p) => p.onboardingStage === '✅ Signed').length;
  const active = partners.filter((p) => p.onboardingStage === '🔵 Negotiations').length;
  const prospects = partners.filter((p) => p.onboardingStage === '🟡 Prospect').length;

  const now = new Date();
  const overdue = partners.filter((p) => {
    if (!p.nextFollowUp) return false;
    return new Date(p.nextFollowUp) < now;
  }).length;

  const stats = [
    { label: 'Total Clients', value: total, icon: Users, color: 'text-primary' },
    { label: 'Signed', value: signed, icon: DollarSign, color: 'text-success' },
    { label: 'Negotiations', value: active, icon: Zap, color: 'text-info' },
    { label: 'Prospects', value: prospects, icon: Star, color: 'text-warning' },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-xl bg-base-200/60 px-3 py-2.5">
            <div className={`${s.color} p-1.5 rounded-lg bg-base-100`}>
              <s.icon size={16} />
            </div>
            <div>
              <div className="text-xl font-bold leading-tight">{s.value}</div>
              <div className="text-[10px] text-base-content/50 uppercase tracking-wider font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      {overdue > 0 && (
        <div className="alert alert-warning py-2 text-sm">
          <AlertTriangle size={14} />
          <span>{overdue} client{overdue > 1 ? 's' : ''} overdue for follow-up</span>
        </div>
      )}
    </div>
  );
};
