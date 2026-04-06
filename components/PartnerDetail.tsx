import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Star,
  Mail,
  Link,
  User,
  Lightbulb,
  MessageSquare,
  Clock,
  CalendarDays,
  Youtube,
  Plus,
} from 'lucide-react';
import { Partner, Conversation, STAGE_COLORS, EDITABLE_STAGES, EDITABLE_MANAGERS } from '../types';

interface PartnerDetailProps {
  partner: Partner;
  conversations: Conversation[];
  loadingDetail: boolean;
  onBack: () => void;
  onStageChange: (partnerId: string, newStage: string) => void;
  onManagerChange: (partnerId: string, newManager: string) => void;
  onDescriptionChange: (partnerId: string, newDesc: string) => void;
  onNextStepsChange: (partnerId: string, val: string) => void;
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
      className="textarea textarea-ghost w-full text-sm leading-relaxed p-0 min-h-[2rem] resize-none focus:outline-none focus:bg-base-300/40 rounded transition-colors"
      value={draft}
      placeholder={placeholder}
      rows={1}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onChange(draft); }}
    />
  );
};

function formatDate(d: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

const CHANNEL_ICONS: Record<string, string> = {
  '📞 Call': '📞',
  '📧 Email': '📧',
  '💬 Slack': '💬',
  '🤝 In-Person': '🤝',
  '📹 Video Call': '📹',
  '📝 Other': '📝',
};

export const PartnerDetail: React.FC<PartnerDetailProps> = ({
  partner,
  conversations,
  loadingDetail,
  onBack,
  onStageChange,
  onManagerChange,
  onDescriptionChange,
  onNextStepsChange,
  onAddConversation,
}) => {
  const sorted = [...conversations].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const stageClass = STAGE_COLORS[partner.onboardingStage] || 'badge-ghost';

  // Add Conversation form state
  const [showConvoForm, setShowConvoForm] = useState(false);
  const [convoSaving, setConvoSaving] = useState(false);
  const [convoSuccess, setConvoSuccess] = useState(false);
  const [convoTitle, setConvoTitle] = useState('');
  const [convoDate, setConvoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [convoChannel, setConvoChannel] = useState('Call');
  const [convoLoggedBy, setConvoLoggedBy] = useState('');
  const [convoSummary, setConvoSummary] = useState('');
  const [convoTakeaways, setConvoTakeaways] = useState('');
  const [convoNextSteps, setConvoNextSteps] = useState('');

  const resetConvoForm = () => {
    setConvoTitle('');
    setConvoDate(new Date().toISOString().slice(0, 10));
    setConvoChannel('Call');
    setConvoLoggedBy('');
    setConvoSummary('');
    setConvoTakeaways('');
    setConvoNextSteps('');
  };

  const handleSaveConvo = async () => {
    setConvoSaving(true);
    try {
      await onAddConversation(partner.id, {
        title: convoTitle,
        date: convoDate,
        channel: convoChannel,
        summary: convoSummary,
        key_takeaways: convoTakeaways,
        next_steps: convoNextSteps,
        logged_by: convoLoggedBy,
      });
      resetConvoForm();
      setShowConvoForm(false);
      setConvoSuccess(true);
      setTimeout(() => setConvoSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save conversation:', err);
    } finally {
      setConvoSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button className="btn btn-ghost btn-sm gap-1" onClick={onBack}>
        <ArrowLeft size={16} /> Back to list
      </button>

      {loadingDetail && (
        <div className="flex items-center gap-2 text-sm text-base-content/60 px-1">
          <span className="loading loading-spinner loading-sm" />
          Loading full details from Notion...
        </div>
      )}

      {/* Header card */}
      <div className="card bg-base-200">
        <div className="card-body p-5 gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{partner.name}</h2>
                {partner.priority === '⭐ VIP' && (
                  <Star size={18} className="text-warning fill-current" />
                )}
              </div>
              {partner.company && (
                <p className="text-sm text-base-content/60 mt-0.5">{partner.company}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                className={`select select-bordered select-sm font-semibold text-sm ${stageClass}`}
                value={partner.onboardingStage}
                onChange={(e) => onStageChange(partner.id, e.target.value)}
              >
                {EDITABLE_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                {!EDITABLE_STAGES.includes(partner.onboardingStage) && partner.onboardingStage && (
                  <option value={partner.onboardingStage}>{partner.onboardingStage}</option>
                )}
              </select>
              {partner.url && (
                <a
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm btn-square"
                  title="Open in Notion"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="flex items-center gap-2 text-sm">
              <User size={14} className="opacity-60" />
              <span className="text-base-content/60">Manager:</span>
              <select
                className="select select-ghost select-xs font-medium"
                value={partner.accountManager || ''}
                onChange={(e) => onManagerChange(partner.id, e.target.value)}
              >
                <option value="">Unassigned</option>
                {EDITABLE_MANAGERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {partner.accountManager && !EDITABLE_MANAGERS.includes(partner.accountManager) && partner.accountManager !== '' && (
                  <option value={partner.accountManager}>{partner.accountManager}</option>
                )}
              </select>
            </div>
            {partner.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="opacity-60" />
                <a href={`mailto:${partner.email}`} className="link link-primary">
                  {partner.email}
                </a>
              </div>
            )}
            {partner.lastConversation && (
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="opacity-60" />
                <span className="text-base-content/60">Last contact:</span>
                <span>{formatDate(partner.lastConversation)}</span>
              </div>
            )}
            {partner.nextFollowUp && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays size={14} className="opacity-60" />
                <span className="text-base-content/60">Next follow-up:</span>
                <span>{formatDate(partner.nextFollowUp)}</span>
              </div>
            )}
            {partner.appUserId && (
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="opacity-60" />
                <span className="text-base-content/60">App User ID:</span>
                <span className="font-mono text-xs bg-base-300 px-1.5 py-0.5 rounded">
                  {partner.appUserId}
                </span>
              </div>
            )}
            {partner.channelLink && !partner.youtubeChannel && !partner.popcornChannel && (
              <div className="flex items-center gap-2 text-sm">
                <Link size={14} className="opacity-60" />
                <a href={partner.channelLink} target="_blank" rel="noopener noreferrer" className="link link-primary truncate">
                  Channel Link
                </a>
              </div>
            )}
          </div>

          {/* YouTube & Popcorn Channel buttons */}
          {(partner.youtubeChannel || partner.popcornChannel) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {partner.youtubeChannel && (
                <a
                  href={partner.youtubeChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline gap-2"
                >
                  <Youtube size={16} className="text-red-500" />
                  YouTube Channel
                </a>
              )}
              {partner.popcornChannel && (
                <a
                  href={partner.popcornChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline gap-2"
                >
                  🍿 Popcorn Channel
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Creative Idea / Description — Inline Editable */}
      <div className="card bg-base-200">
        <div className="card-body p-5 gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-secondary" />
            <h3 className="font-semibold">Creative Idea / Description</h3>
          </div>
          <InlineEdit
            value={partner.useCase || ''}
            placeholder="Type a creative idea, use case, or notes..."
            onChange={(val) => onDescriptionChange(partner.id, val)}
          />
        </div>
      </div>

      {/* Next Steps — Inline Editable */}
      <div className="card bg-base-200">
        <div className="card-body p-5 gap-2">
          <h3 className="font-semibold">📋 Next Steps</h3>
          <InlineEdit
            value={partner.nextSteps || ''}
            placeholder="Type next steps for this partner..."
            onChange={(val) => onNextStepsChange(partner.id, val)}
          />
        </div>
      </div>

      {/* Popcorn Publishing Status - placeholder for API */}
      <div className="card bg-base-200 border border-dashed border-base-content/20">
        <div className="card-body p-5 gap-2">
          <h3 className="font-semibold">🍿 Popcorn Publishing Status</h3>
          {partner.appUserId ? (
            <div className="text-sm text-base-content/60">
              <p>App User ID: <span className="font-mono bg-base-300 px-1.5 py-0.5 rounded">{partner.appUserId}</span></p>
              <p className="mt-1 text-base-content/40 italic">API integration coming soon — provide the Popcorn Publishing API to see live status here.</p>
            </div>
          ) : (
            <p className="text-sm text-base-content/40 italic">No App User ID set — partner hasn't been linked to Popcorn Publishing yet.</p>
          )}
        </div>
      </div>

      {/* Source indicator */}
      {partner.source === 'onboarding' && (
        <div className="alert alert-info text-sm">
          ℹ️ This partner is from the Onboarding table only — not yet added to the main CRM database.
        </div>
      )}

      {/* Conversation History */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-primary" />
          <h3 className="font-semibold">Conversation History</h3>
          <span className="badge badge-sm badge-primary">{sorted.length}</span>
          <button
            className="btn btn-ghost btn-xs gap-1 ml-auto"
            onClick={() => setShowConvoForm(!showConvoForm)}
          >
            <Plus size={14} />
            Log Conversation
          </button>
        </div>

        {convoSuccess && (
          <div className="alert alert-success text-sm py-2">
            ✅ Conversation logged successfully!
          </div>
        )}

        {showConvoForm && (
          <div className="card bg-base-200">
            <div className="card-body p-4 gap-3">
              <h4 className="font-semibold text-sm">New Conversation Entry</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label pb-0"><span className="label-text text-xs">Title</span></label>
                  <input
                    className="input input-bordered w-full input-sm"
                    placeholder="e.g. Onboarding kickoff call"
                    value={convoTitle}
                    onChange={(e) => setConvoTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label pb-0"><span className="label-text text-xs">Date</span></label>
                  <input
                    type="date"
                    className="input input-bordered w-full input-sm"
                    value={convoDate}
                    onChange={(e) => setConvoDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label pb-0"><span className="label-text text-xs">Channel</span></label>
                  <select
                    className="select select-bordered w-full select-sm"
                    value={convoChannel}
                    onChange={(e) => setConvoChannel(e.target.value)}
                  >
                    <option value="Call">📞 Call</option>
                    <option value="Email">📧 Email</option>
                    <option value="Slack">💬 Slack</option>
                    <option value="In-Person">🤝 In-Person</option>
                    <option value="Video Call">📹 Video Call</option>
                    <option value="Other">📝 Other</option>
                  </select>
                </div>
                <div>
                  <label className="label pb-0"><span className="label-text text-xs">Logged By</span></label>
                  <select
                    className="select select-bordered w-full select-sm"
                    value={convoLoggedBy}
                    onChange={(e) => setConvoLoggedBy(e.target.value)}
                  >
                    <option value="">— Select</option>
                    <option value="Adi">Adi</option>
                    <option value="Tess">Tess</option>
                    <option value="Ben">Ben</option>
                    <option value="Cydel">Cydel</option>
                    <option value="Agent 🤖">Agent 🤖</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label pb-0"><span className="label-text text-xs">Summary</span></label>
                <textarea
                  className="textarea textarea-bordered w-full text-sm"
                  rows={3}
                  placeholder="What was discussed?"
                  value={convoSummary}
                  onChange={(e) => setConvoSummary(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label pb-0"><span className="label-text text-xs">Key Takeaways</span></label>
                  <textarea
                    className="textarea textarea-bordered w-full text-sm"
                    rows={2}
                    placeholder="Important points..."
                    value={convoTakeaways}
                    onChange={(e) => setConvoTakeaways(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label pb-0"><span className="label-text text-xs">Next Steps</span></label>
                  <textarea
                    className="textarea textarea-bordered w-full text-sm"
                    rows={2}
                    placeholder="Action items..."
                    value={convoNextSteps}
                    onChange={(e) => setConvoNextSteps(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { resetConvoForm(); setShowConvoForm(false); }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveConvo}
                  disabled={convoSaving}
                >
                  {convoSaving ? <span className="loading loading-spinner loading-xs" /> : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {sorted.length === 0 && !showConvoForm ? (
          <p className="text-sm text-base-content/50 pl-7">No conversations logged yet.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((c) => (
              <div key={c.id} className="card bg-base-200">
                <div className="card-body p-4 gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span>{CHANNEL_ICONS[c.channel] || '💬'}</span>
                      <span className="font-medium text-sm">{c.title || c.channel || 'Untitled'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-base-content/50">
                      {c.loggedBy && <span>by {c.loggedBy}</span>}
                      {c.date && <span>{formatDate(c.date)}</span>}
                    </div>
                  </div>
                  {c.summary && (
                    <p className="text-sm text-base-content/80">{c.summary}</p>
                  )}
                  {c.keyTakeaways && (
                    <div className="text-xs mt-1">
                      <span className="font-medium text-base-content/60">Key takeaways:</span>{' '}
                      <span className="text-base-content/70">{c.keyTakeaways}</span>
                    </div>
                  )}
                  {c.nextSteps && (
                    <div className="text-xs">
                      <span className="font-medium text-base-content/60">Next steps:</span>{' '}
                      <span className="text-base-content/70">{c.nextSteps}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
