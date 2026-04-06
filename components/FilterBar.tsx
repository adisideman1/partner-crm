import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Filters, STAGES, PRIORITIES, ACCOUNT_MANAGERS, OnboardingStage } from '../types';

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFiltersChange }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <label className="input input-bordered input-sm flex items-center gap-2 grow">
        <Search className="h-[1em] opacity-50" />
        <input
          type="search"
          className="grow"
          placeholder="Search partners..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        />
      </label>

      <div className="flex gap-2 flex-wrap">
        <select
          className="select select-bordered select-sm"
          value={filters.stage}
          onChange={(e) =>
            onFiltersChange({ ...filters, stage: e.target.value as OnboardingStage })
          }
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? '🏷️ All Stages' : s}
            </option>
          ))}
        </select>

        <select
          className="select select-bordered select-sm"
          value={filters.priority}
          onChange={(e) => onFiltersChange({ ...filters, priority: e.target.value })}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p === 'All' ? '🔥 All Priorities' : p}
            </option>
          ))}
        </select>

        <select
          className="select select-bordered select-sm"
          value={filters.accountManager}
          onChange={(e) => onFiltersChange({ ...filters, accountManager: e.target.value })}
        >
          {ACCOUNT_MANAGERS.map((m) => (
            <option key={m} value={m}>
              {m === 'All' ? '👤 All Managers' : m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
