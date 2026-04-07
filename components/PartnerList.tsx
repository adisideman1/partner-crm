import React, { useState } from 'react';
import { ExternalLink, Star, ChevronRight, ChevronDown, Clock, Lightbulb, Youtube, Trash2 } from 'lucide-react';
import { Partner, Conversation, STAGE_COLORS, EDITABLE_STAGES, EDITABLE_MANAGERS } from '../types';
import { PartnerExpandPanel } from './PartnerExpandPanel';

interface PartnerListProps {
  partners: Partner[];
  onSelect: (partner: Partner) => void;
  selectedId: string | null;
  onStageChange: (partnerId: string, newStage: string) => void;
  onManagerChange: (partnerId: string, newManager: string) => void;
  onDelete?: (partnerId: string) => void;
  // Expansion panel props
  expandedId: string | null;
  onExpand: (partner: Partner | null) => void;
  expandedConversations: Conversation[];
  loadingExpandConversations: boolean;
  onDescriptionChange: (partnerId: string, val: string) => void;
  onNextStepsChange: (partnerId: string, val: string) => void;
  onDriveFolderChange: (partnerId: string, url: string) => void;
  onFollowUpChange: (partnerId: string, date: string) => void;
  onAddConversation: (partnerId: string, entry: {
    title: string; date: string; channel: string; summary: string;
    key_takeaways: string; next_steps: string; logged_by: string;
  }) => void;
}

function formatDate(d: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
}

function isOverdue(d: string): boolean {
  if (!d) return false;
  return new Date(d) < new Date();
}

function summarize(text: string, maxWords: number): string {
  if (!text) return '';
  // Strip markdown bullets/dashes and newlines, collapse whitespace
  const clean = text.replace(/^[-•*]\s*/gm, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ');
  if (words.length <= maxWords) return clean;
  return words.slice(0, maxWords).join(' ') + '…';
}

// Helper to open external links — works inside iframes where target="_blank" gets blocked
const openExternal = (e: React.MouseEvent, url: string) => {
  e.preventDefault();
  e.stopPropagation();
  try { (window.top || window).open(url, '_blank'); } catch { window.open(url, '_blank'); }
};

const ChannelBadge: React.FC<{ url: string }> = ({ url }) => {
  const isYt = url.includes('youtube.com') || url.includes('youtu.be');
  if (isYt) {
    return (
      <a
        href={url}
        className="flex items-center gap-1 text-red-500 hover:text-red-400 transition-colors cursor-pointer"
        onClick={(e) => openExternal(e, url)}
        title="YouTube Channel"
      >
        <Youtube size={14} /> <span className="underline">YouTube</span>
      </a>
    );
  }
  return (
    <a
      href={url}
      className="flex items-center gap-1 link link-primary cursor-pointer"
      onClick={(e) => openExternal(e, url)}
      title="Channel Link"
    >
      <ExternalLink size={12} /> <span className="underline">Channel</span>
    </a>
  );
};

export const PartnerList: React.FC<PartnerListProps> = ({
  partners, onSelect, selectedId, onStageChange, onManagerChange, onDelete,
  expandedId, onExpand, expandedConversations, loadingExpandConversations,
  onDescriptionChange, onNextStepsChange, onDriveFolderChange, onFollowUpChange, onAddConversation,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (partners.length === 0) {
    return (
      <div className="text-center py-12 text-base-content/60">
        <p className="text-lg">No partners found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {partners.map((p) => {
        const stageClass = STAGE_COLORS[p.onboardingStage] || 'badge-ghost';
        const isSelected = selectedId === p.id;
        const isExpanded = expandedId === p.id;
        const overdue = isOverdue(p.nextFollowUp);
        const isConfirming = confirmDeleteId === p.id;

        return (
          <div
            key={p.id}
            className={`card bg-base-200 cursor-pointer transition-all hover:bg-base-300 group ${
              isExpanded ? 'ring-2 ring-primary/50 shadow-lg' : isSelected ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => { setConfirmDeleteId(null); onExpand(isExpanded ? null : p); }}
          >
            <div className="card-body p-4 gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  {p.priority === '⭐ VIP' && <Star size={14} className="text-warning shrink-0 fill-current" />}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className={`select select-bordered select-xs font-medium ${stageClass}`}
                    value={p.onboardingStage}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      onStageChange(p.id, e.target.value);
                    }}
                  >
                    {EDITABLE_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    {!EDITABLE_STAGES.includes(p.onboardingStage) && p.onboardingStage && (
                      <option value={p.onboardingStage}>{p.onboardingStage}</option>
                    )}
                  </select>
                  {onDelete && (
                    isConfirming ? (
                      <button
                        className="btn btn-xs btn-error gap-1 animate-pulse"
                        onClick={(e) => { e.stopPropagation(); onDelete(p.id); setConfirmDeleteId(null); }}
                        title="Confirm remove"
                      >
                        <Trash2 size={11} /> Remove?
                      </button>
                    ) : (
                      <button
                        className="btn btn-xs btn-ghost btn-square opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:btn-error transition-opacity"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
                        title="Remove partner"
                      >
                        <Trash2 size={13} />
                      </button>
                    )
                  )}
                  {isExpanded ? (
                    <ChevronDown size={16} className="opacity-60 text-primary" />
                  ) : (
                    <ChevronRight size={16} className="opacity-40" />
                  )}
                </div>
              </div>

              {p.useCase && (
                <div className="flex items-start gap-1.5 text-sm text-base-content/70">
                  <Lightbulb size={13} className="shrink-0 mt-0.5 text-secondary" />
                  <span>{summarize(p.useCase, 10)}</span>
                </div>
              )}
              {p.nextSteps && (
                <div className="flex items-start gap-1.5 text-xs text-base-content/50">
                  <span className="shrink-0">📋</span>
                  <span className="italic">{summarize(p.nextSteps, 8)}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-base-content/50 mt-1">
                <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  👤
                  <select
                    className="select select-ghost select-xs text-xs py-0 h-5 min-h-0"
                    value={p.accountManager || ''}
                    onChange={(e) => { e.stopPropagation(); onManagerChange(p.id, e.target.value); }}
                  >
                    <option value="">—</option>
                    {EDITABLE_MANAGERS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {p.accountManager && !EDITABLE_MANAGERS.includes(p.accountManager) && p.accountManager !== '' && (
                      <option value={p.accountManager}>{p.accountManager}</option>
                    )}
                  </select>
                </span>
                {(p.youtubeChannel || p.channelLink) && (
                  <ChannelBadge url={p.youtubeChannel || p.channelLink || ''} />
                )}
                {p.popcornChannel && (
                  <a
                    href={p.popcornChannel}
                    className="flex items-center gap-1 text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
                    onClick={(e) => openExternal(e, p.popcornChannel!)}
                    title="Popcorn Channel"
                  >
                    🍿 <span className="underline">Popcorn</span>
                  </a>
                )}
                {(p as any).driveFolder && (
                  <a
                    href={(p as any).driveFolder}
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
                    onClick={(e) => openExternal(e, (p as any).driveFolder)}
                    title="Google Drive Folder"
                  >
                    📁 <span className="underline">Drive</span>
                  </a>
                )}
                {p.company && <span>🏢 {p.company}</span>}
                {p.appUserId && <span className="font-mono bg-base-300 px-1 py-0.5 rounded">🔑 ID</span>}

                {p.source === 'onboarding' && (
                  <span className="badge badge-xs badge-outline">onboarding only</span>
                )}
                {!p.detailsLoaded && !p.id.startsWith('onb-') && (
                  <span className="text-base-content/30 italic">click for details</span>
                )}
                {p.lastConversation && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> Last: {formatDate(p.lastConversation)}
                  </span>
                )}
                {p.nextFollowUp && (
                  <span className={`flex items-center gap-1 ${overdue ? 'text-error font-medium' : ''}`}>
                    📅 Follow-up: {formatDate(p.nextFollowUp)}
                    {overdue && ' (overdue)'}
                  </span>
                )}
              </div>
            </div>
            {/* Expansion Panel */}
            {isExpanded && (
              <PartnerExpandPanel
                partner={p}
                conversations={expandedConversations}
                loadingConversations={loadingExpandConversations}
                onOpenFullView={() => onSelect(p)}
                onDescriptionChange={onDescriptionChange}
                onNextStepsChange={onNextStepsChange}
                onDriveFolderChange={onDriveFolderChange}
                onFollowUpChange={onFollowUpChange}
                onManagerChange={onManagerChange}
                onAddConversation={onAddConversation}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
