import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Link, User, Lightbulb, MessageSquare, Clock,
  CalendarDays, Youtube, Plus, ExternalLink, Maximize2,
} from 'lucide-react';
import { Partner, Conversation, STAGE_COLORS, EDITABLE_MANAGERS } from '../types';

interface PartnerExpandPanelProps {
  partner: Partner;
  conversations: Conversation[];
  loadingConversations: boolean;
  onOpenFullView: () => void;
  onDescriptionChange: (partnerId: string, val: string) => void;
  onNextStepsChange: (partnerId: string, val: string) => void;
  onDriveFolderChange: (partnerId: string, url: string) => void;
  onFollowUpChange: (partnerId: string, date: string) => void;
  onManagerChange: (partnerId: string, val: string) => void;
  onAddConversation: (partnerId: string, entry: {
    title: string; date: string; channel: string; summary: string;
    key_takeaways: string; next_steps: string; logged_by: string;
  }) => void;
}

/** Auto-growing inline textarea */
const InlineEdit: React.FC<{
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
}> = ({ value, placeholder, onChange }) => {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [draft]);
  return (
    <textarea
      ref={ref}
      className="textarea textarea-ghost w-full text-sm leading-relaxed p-1 min-h-[1.8rem] resize-none focus:outline-none focus:bg-base-300/40 rounded transition-colors"
      value={draft}
      placeholder={placeholder}
      rows={1}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onChange(draft); }}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

function formatDate(d: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
}

const CHANNEL_ICONS: Record<string, string> = {
  '📞 Call': '📞', 'Call': '📞',
  '📧 Email': '📧', 'Email': '📧',
  '💬 Slack': '💬', 'Slack': '💬',
  '🤝 In-Person': '🤝', 'In-Person': '🤝',
  '📹 Video Call': '📹', 'Video Call': '📹',
  '📝 Other': '📝', 'Other': '📝',
};

export const PartnerExpandPanel: React.FC<PartnerExpandPanelProps> = ({
  partner, conversations, loadingConversations,
  onOpenFullView, onDescriptionChange, onNextStepsChange,
  onDriveFolderChange, onFollowUpChange, onManagerChange,
  onAddConversation,
}) => {
  const sorted = [...conversations].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  const recentConvos = sorted.slice(0, 3);
  const isOverdue = partner.nextFollowUp ? new Date(partner.nextFollowUp) < new Date() : false;

  // Quick-add conversation form
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qTitle, setQTitle] = useState('');
  const [qDate, setQDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [qChannel, setQChannel] = useState('Call');
  const [qSummary, setQSummary] = useState('');
  const [qLoggedBy, setQLoggedBy] = useState('');

  const handleQuickSave = async () => {
    setSaving(true);
    try {
      await onAddConversation(partner.id, {
        title: qTitle, date: qDate, channel: qChannel,
        summary: qSummary, key_takeaways: '', next_steps: '', logged_by: qLoggedBy,
      });
      setQTitle(''); setQSummary(''); setShowQuickAdd(false);
      setQDate(new Date().toISOString().slice(0, 10));
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div
      className="border-t border-base-300 bg-base-100/50 px-4 pb-4 pt-3 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top bar: Full View button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-base-content/50">
          {partner.email && (
            <a href={`mailto:${partner.email}`} className="link link-primary flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Mail size={12} /> {partner.email}
            </a>
          )}
          {partner.appUserId && (
            <a
              href={`https://app.popcorn.co/admin/users/${partner.appUserId}`}
              target="_blank" rel="noopener noreferrer"
              className="link link-primary flex items-center gap-1 font-mono"
              onClick={(e) => e.stopPropagation()}
            >
              <User size={12} /> 🔑 {partner.appUserId}
            </a>
          )}
        </div>
        <button
          className="btn btn-ghost btn-xs gap-1 text-primary"
          onClick={(e) => { e.stopPropagation(); onOpenFullView(); }}
        >
          <Maximize2 size={13} /> Full View
        </button>
      </div>

      {/* Quick info row: Dates + Drive + Links */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {/* Last Contact */}
        {partner.lastConversation && (
          <span className="flex items-center gap-1.5 text-base-content/60">
            <Clock size={13} /> Last: <span className="font-medium text-base-content/80">{formatDate(partner.lastConversation)}</span>
          </span>
        )}
        {/* Follow-up (editable) */}
        <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-error font-semibold' : 'text-base-content/60'}`}>
          <CalendarDays size={13} /> Follow-up:
          <input
            type="date"
            className={`input input-ghost input-xs text-sm ${isOverdue ? 'text-error' : ''}`}
            value={partner.nextFollowUp || ''}
            onChange={(e) => onFollowUpChange(partner.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          {isOverdue && <span className="badge badge-error badge-xs">overdue!</span>}
        </span>
        {/* Drive Folder */}
        {(partner as any).driveFolder ? (
          <a
            href={(partner as any).driveFolder}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-500 hover:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            📁 <span className="underline">Drive Folder</span>
          </a>
        ) : (
          <span className="flex items-center gap-1 text-base-content/30">
            📁
            <input
              type="text"
              className="input input-ghost input-xs w-28 text-xs"
              placeholder="+ Drive URL"
              onBlur={(e) => { if (e.target.value) onDriveFolderChange(partner.id, e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              onClick={(e) => e.stopPropagation()}
            />
          </span>
        )}
        {/* Link buttons */}
        {partner.youtubeChannel && (
          <a href={partner.youtubeChannel} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-red-500 hover:text-red-400"
            onClick={(e) => e.stopPropagation()}>
            <Youtube size={14} /> YouTube
          </a>
        )}
        {partner.popcornChannel && (
          <a href={partner.popcornChannel} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-amber-500 hover:text-amber-400"
            onClick={(e) => e.stopPropagation()}>
            🍿 Popcorn
          </a>
        )}
        {partner.url && (
          <a href={partner.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-base-content/40 hover:text-base-content/60"
            onClick={(e) => e.stopPropagation()}>
            <ExternalLink size={12} /> Notion
          </a>
        )}
      </div>

      {/* Two-column: Creative Idea + Next Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-base-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary mb-1">
            <Lightbulb size={13} /> Creative Idea
          </div>
          <InlineEdit
            value={partner.useCase || ''}
            placeholder="Click to add idea..."
            onChange={(val) => onDescriptionChange(partner.id, val)}
          />
        </div>
        <div className="bg-base-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-base-content/60 mb-1">
            📋 Next Steps
          </div>
          <InlineEdit
            value={partner.nextSteps || ''}
            placeholder="Click to add next steps..."
            onChange={(val) => onNextStepsChange(partner.id, val)}
          />
        </div>
      </div>

      {/* Conversation History (compact) */}
      <div className="bg-base-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <MessageSquare size={13} /> Conversations
            {loadingConversations ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <span className="badge badge-xs badge-primary">{sorted.length}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-ghost btn-xs gap-1"
              onClick={(e) => { e.stopPropagation(); setShowQuickAdd(!showQuickAdd); }}
            >
              <Plus size={12} /> Log
            </button>
            {sorted.length > 3 && (
              <button
                className="btn btn-ghost btn-xs text-primary"
                onClick={(e) => { e.stopPropagation(); onOpenFullView(); }}
              >
                View all {sorted.length} →
              </button>
            )}
          </div>
        </div>

        {/* Quick-add form */}
        {showQuickAdd && (
          <div className="mb-3 p-3 bg-base-300 rounded-lg space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input className="input input-bordered input-xs" placeholder="Title" value={qTitle}
                onChange={(e) => setQTitle(e.target.value)} onClick={(e) => e.stopPropagation()} />
              <input type="date" className="input input-bordered input-xs" value={qDate}
                onChange={(e) => setQDate(e.target.value)} onClick={(e) => e.stopPropagation()} />
              <select className="select select-bordered select-xs" value={qChannel}
                onChange={(e) => setQChannel(e.target.value)} onClick={(e) => e.stopPropagation()}>
                <option value="Call">📞 Call</option>
                <option value="Email">📧 Email</option>
                <option value="Slack">💬 Slack</option>
                <option value="Video Call">📹 Video</option>
                <option value="In-Person">🤝 In-Person</option>
                <option value="Other">📝 Other</option>
              </select>
              <select className="select select-bordered select-xs" value={qLoggedBy}
                onChange={(e) => setQLoggedBy(e.target.value)} onClick={(e) => e.stopPropagation()}>
                <option value="">Logged by</option>
                <option value="Adi">Adi</option>
                <option value="Tess">Tess</option>
                <option value="Ben">Ben</option>
                <option value="Cydel">Cydel</option>
                <option value="Agent 🤖">Agent 🤖</option>
              </select>
            </div>
            <textarea className="textarea textarea-bordered w-full text-xs" rows={2}
              placeholder="Summary..." value={qSummary}
              onChange={(e) => setQSummary(e.target.value)} onClick={(e) => e.stopPropagation()} />
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost btn-xs" onClick={() => setShowQuickAdd(false)}>Cancel</button>
              <button className="btn btn-primary btn-xs" onClick={handleQuickSave} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-xs" /> : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Recent conversations */}
        {!loadingConversations && recentConvos.length === 0 && !showQuickAdd && (
          <p className="text-xs text-base-content/40 italic">No conversations yet — click Log to add one.</p>
        )}
        {recentConvos.map((c) => (
          <div key={c.id} className="flex items-start gap-2 py-1.5 border-b border-base-300 last:border-0 text-xs">
            <span className="shrink-0 mt-0.5">{CHANNEL_ICONS[c.channel] || '💬'}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">{c.title || c.channel || 'Untitled'}</span>
                <span className="text-base-content/40 whitespace-nowrap">{c.date ? formatDate(c.date) : ''}</span>
              </div>
              {c.summary && (
                <p className="text-base-content/60 line-clamp-2 mt-0.5">{c.summary}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
