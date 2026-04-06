import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Film, Plus, X, GripVertical, Trash2 } from 'lucide-react';
import { loadAllEdits, saveField, saveFields } from '../utils/db';

interface KOL {
  id: string;
  name: string;
  kolTier: string;
  kolStatus: string;
  kolNotes: string;
  kolMovieLink: string;
  kolOrder: number;
  isInCRM: boolean;
}

async function loadKOLs(): Promise<KOL[]> {
  const rows = await loadAllEdits();

  // Group by partner_id
  const byId: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    if (!byId[row.partner_id]) byId[row.partner_id] = {};
    byId[row.partner_id][row.field] = row.value;
  }

  // Filter to only KOLs (not deleted)
  return Object.entries(byId)
    .filter(([, fields]) => fields.isKOL === 'true' && fields.name && fields.deleted !== 'true')
    .map(([id, fields]) => ({
      id,
      name: fields.name,
      kolTier: fields.kolTier || 'Potential Outreach',
      kolStatus: fields.kolStatus || '',
      kolNotes: fields.kolNotes || '',
      kolMovieLink: fields.kolMovieLink || '',
      kolOrder: fields.kolOrder !== undefined ? parseInt(fields.kolOrder, 10) : 9999,
      isInCRM: !id.startsWith('kol-'),
    }));
}

function saveKOLField(id: string, field: string, value: string) {
  saveField(id, field, value).catch(console.error);
}

const STATUS_OPTIONS = ['', 'Research', 'Avatar Created', 'Movie Created', 'Reached Out', 'Responded', 'Demo Scheduled', 'Converted'];

const STATUS_COLORS: Record<string, string> = {
  '': '',
  'Research': 'badge-ghost',
  'Avatar Created': 'badge-info',
  'Movie Created': 'badge-primary',
  'Reached Out': 'badge-warning',
  'Responded': 'badge-success',
  'Demo Scheduled': 'badge-accent',
  'Converted': 'badge-success badge-outline',
};

// ---- Add KOL Modal ----
const AddKOLModal: React.FC<{ onAdd: (name: string, tier: string) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [tier, setTier] = useState('Initial Target');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), tier);
    onClose();
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-sm">
        <h3 className="font-bold text-lg mb-4">Add KOL</h3>
        <div className="space-y-3">
          <input
            className="input input-bordered w-full"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <select
            className="select select-bordered w-full"
            value={tier}
            onChange={e => setTier(e.target.value)}
          >
            <option>Initial Target</option>
            <option>Potential Outreach</option>
          </select>
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!name.trim()}>Add</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
};

// ---- KOL Row ----
const KOLRow: React.FC<{
  kol: KOL;
  isDragOver: boolean;
  confirmDeleteId: string | null;
  onStatusChange: (id: string, v: string) => void;
  onNotesChange: (id: string, v: string) => void;
  onMovieChange: (id: string, v: string) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string | null) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}> = ({ kol, isDragOver, confirmDeleteId, onStatusChange, onNotesChange, onMovieChange, onDelete, onConfirmDelete, onDragStart, onDragOver, onDrop, onDragEnd }) => {
  const [editingMovie, setEditingMovie] = useState(false);
  const [movieDraft, setMovieDraft] = useState(kol.kolMovieLink);
  const isConfirming = confirmDeleteId === kol.id;

  return (
    <tr
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`hover cursor-grab active:cursor-grabbing transition-colors group ${isDragOver ? 'bg-primary/10 border-t-2 border-primary' : ''}`}
    >
      <td className="w-6 px-1">
        <GripVertical size={14} className="text-base-content/25 cursor-grab" />
      </td>
      <td className="min-w-[130px]">
        <span className="font-medium text-sm leading-snug">{kol.name}</span>
      </td>
      <td className="min-w-[140px]">
        <select
          className="select select-xs select-bordered w-full text-xs"
          value={kol.kolStatus}
          onChange={e => onStatusChange(kol.id, e.target.value)}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s || '— No Status —'}</option>
          ))}
        </select>
        {kol.kolStatus && (
          <div className="mt-1">
            <span className={`badge badge-xs ${STATUS_COLORS[kol.kolStatus] || 'badge-ghost'}`}>
              {kol.kolStatus}
            </span>
          </div>
        )}
      </td>
      <td className="min-w-[200px]">
        <input
          className="input input-xs w-full bg-transparent focus:bg-base-200 transition-colors rounded px-2 py-1 border border-transparent focus:border-base-300"
          value={kol.kolNotes}
          onChange={e => onNotesChange(kol.id, e.target.value)}
          onBlur={e => saveKOLField(kol.id, 'kolNotes', e.target.value)}
          placeholder="Add notes..."
        />
      </td>
      <td className="min-w-[120px]">
        {kol.kolMovieLink && !editingMovie ? (
          <div className="flex items-center gap-1">
            <a
              href={kol.kolMovieLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-xs btn-primary gap-1"
            >
              <Film size={10} /> Watch
            </a>
            <button
              className="btn btn-xs btn-ghost btn-square"
              onClick={() => { setEditingMovie(true); setMovieDraft(kol.kolMovieLink); }}
              title="Edit link"
            >
              <X size={10} />
            </button>
          </div>
        ) : editingMovie ? (
          <input
            className="input input-xs input-bordered w-full"
            value={movieDraft}
            autoFocus
            onChange={e => setMovieDraft(e.target.value)}
            onBlur={() => {
              onMovieChange(kol.id, movieDraft);
              setEditingMovie(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') { onMovieChange(kol.id, movieDraft); setEditingMovie(false); }
              if (e.key === 'Escape') setEditingMovie(false);
            }}
            placeholder="https://popcorn.co/..."
          />
        ) : (
          <button
            className="btn btn-xs btn-ghost gap-1 text-base-content/40"
            onClick={() => setEditingMovie(true)}
          >
            <Plus size={10} /> Add link
          </button>
        )}
      </td>
      <td className="w-8 px-1">
        {isConfirming ? (
          <button
            className="btn btn-xs btn-error gap-1 animate-pulse"
            onClick={() => { onDelete(kol.id); onConfirmDelete(null); }}
            title="Confirm remove"
          >
            <Trash2 size={10} />?
          </button>
        ) : (
          <button
            className="btn btn-xs btn-ghost btn-square opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:btn-error transition-opacity"
            onClick={() => onConfirmDelete(kol.id)}
            title="Remove KOL"
          >
            <Trash2 size={12} />
          </button>
        )}
      </td>
    </tr>
  );
};

// ---- KOL Section ----
// Renders one tier's table. Drag/drop state is managed by parent (KOLTab).
const KOLSection: React.FC<{
  title: string;
  tier: string;
  emoji: string;
  kols: KOL[];
  dragOverId: string | null;
  confirmDeleteId: string | null;
  onStatusChange: (id: string, v: string) => void;
  onNotesChange: (id: string, v: string) => void;
  onMovieChange: (id: string, v: string) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string | null) => void;
  onDragStart: (e: React.DragEvent, kolId: string, tier: string) => void;
  onDragOver: (e: React.DragEvent, targetId: string) => void;
  onDrop: (e: React.DragEvent, targetId: string, targetTier: string) => void;
  onDragEnd: () => void;
}> = ({ title, tier, emoji, kols, dragOverId, confirmDeleteId, onStatusChange, onNotesChange, onMovieChange, onDelete, onConfirmDelete, onDragStart, onDragOver, onDrop, onDragEnd }) => {
  if (kols.length === 0) return null;

  const endDropId = `__end__${tier}`;

  return (
    <div>
      <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-widest mb-2">
        {emoji} {title} <span className="text-base-content/30 normal-case font-normal">({kols.length})</span>
        <span className="ml-2 text-base-content/25 normal-case font-normal text-[10px]">drag to reorder or move between sections</span>
      </h3>
      <div className="overflow-x-auto rounded-xl border border-base-200">
        <table className="table table-sm w-full">
          <thead>
            <tr className="text-xs text-base-content/40 border-b border-base-200">
              <th className="w-6"></th>
              <th>Name</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Movie</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {kols.map((kol) => (
              <KOLRow
                key={kol.id}
                kol={kol}
                isDragOver={dragOverId === kol.id}
                confirmDeleteId={confirmDeleteId}
                onStatusChange={onStatusChange}
                onNotesChange={onNotesChange}
                onMovieChange={onMovieChange}
                onDelete={onDelete}
                onConfirmDelete={onConfirmDelete}
                onDragStart={(e) => onDragStart(e, kol.id, tier)}
                onDragOver={(e) => onDragOver(e, kol.id)}
                onDrop={(e) => onDrop(e, kol.id, tier)}
                onDragEnd={onDragEnd}
              />
            ))}
            {/* Drop zone at end of section */}
            <tr
              className={`h-6 transition-colors ${dragOverId === endDropId ? 'bg-primary/10 border-t-2 border-primary' : ''}`}
              onDragOver={(e) => { e.preventDefault(); onDragOver(e, endDropId); }}
              onDrop={(e) => onDrop(e, endDropId, tier)}
            >
              <td colSpan={6} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---- Main KOL Tab ----
export const KOLTab: React.FC<{ onCountChange?: (n: number) => void }> = ({ onCountChange }) => {
  const [kols, setKols] = useState<KOL[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const draggingTierRef = useRef<string | null>(null);

  // Report count changes up to parent
  useEffect(() => { onCountChange?.(kols.length); }, [kols.length, onCountChange]);

  useEffect(() => {
    loadKOLs().then(k => {
      const sorted = [...k].sort((a, b) => {
        const tierOrder = (t: string) => t === 'Initial Target' ? 0 : 1;
        if (tierOrder(a.kolTier) !== tierOrder(b.kolTier)) return tierOrder(a.kolTier) - tierOrder(b.kolTier);
        if (a.kolOrder !== b.kolOrder) return a.kolOrder - b.kolOrder;
        return a.name.localeCompare(b.name);
      });
      setKols(sorted);
      setLoading(false);
    });
  }, []);

  const handleStatusChange = useCallback((id: string, value: string) => {
    setKols(prev => prev.map(k => k.id === id ? { ...k, kolStatus: value } : k));
    saveKOLField(id, 'kolStatus', value);
  }, []);

  const handleNotesChange = useCallback((id: string, value: string) => {
    setKols(prev => prev.map(k => k.id === id ? { ...k, kolNotes: value } : k));
  }, []);

  const handleMovieChange = useCallback((id: string, value: string) => {
    setKols(prev => prev.map(k => k.id === id ? { ...k, kolMovieLink: value } : k));
    saveKOLField(id, 'kolMovieLink', value);
  }, []);

  const handleDeleteKOL = useCallback(async (id: string) => {
    setKols(prev => prev.filter(k => k.id !== id));
    try {
      await saveField(id, 'isKOL', 'false');
      await saveField(id, 'deleted', 'true');
    } catch (err) { console.error('Failed to delete KOL:', err); }
  }, []);

  // --- Cross-section drag & drop ---
  const handleDragStart = useCallback((e: React.DragEvent, kolId: string, tier: string) => {
    draggingIdRef.current = kolId;
    draggingTierRef.current = tier;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(targetId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string, targetTier: string) => {
    e.preventDefault();
    const fromId = draggingIdRef.current;
    if (!fromId || fromId === targetId) {
      setDragOverId(null);
      draggingIdRef.current = null;
      draggingTierRef.current = null;
      return;
    }

    const isEndDrop = targetId.startsWith('__end__');

    setKols(prev => {
      const dragged = prev.find(k => k.id === fromId);
      if (!dragged) return prev;

      const tierChanged = dragged.kolTier !== targetTier;

      // Remove from old position
      const rest = prev.filter(k => k.id !== fromId);
      const updatedDragged = { ...dragged, kolTier: targetTier };

      // Get the target tier list (without the dragged item)
      const targetTierKols = rest.filter(k => k.kolTier === targetTier);

      let insertAt: number;
      if (isEndDrop) {
        insertAt = targetTierKols.length; // append at end
      } else {
        const targetIdx = targetTierKols.findIndex(k => k.id === targetId);
        insertAt = targetIdx === -1 ? targetTierKols.length : targetIdx;
      }

      const newTargetTierKols = [...targetTierKols];
      newTargetTierKols.splice(insertAt, 0, updatedDragged);

      // Persist new order + tier change
      newTargetTierKols.forEach((k, i) => {
        saveField(k.id, 'kolOrder', String(i)).catch(console.error);
      });
      if (tierChanged) {
        saveKOLField(fromId, 'kolTier', targetTier);
      }

      // Combine back with updated kolOrder values
      const otherKols = rest.filter(k => k.kolTier !== targetTier);
      const combined = [...otherKols, ...newTargetTierKols.map((k, i) => ({ ...k, kolOrder: i }))];
      const tierOrder = (t: string) => t === 'Initial Target' ? 0 : 1;
      return combined.sort((a, b) => {
        if (tierOrder(a.kolTier) !== tierOrder(b.kolTier)) return tierOrder(a.kolTier) - tierOrder(b.kolTier);
        return a.kolOrder - b.kolOrder;
      });
    });

    setDragOverId(null);
    draggingIdRef.current = null;
    draggingTierRef.current = null;
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragOverId(null);
    draggingIdRef.current = null;
    draggingTierRef.current = null;
  }, []);

  const handleAddKOL = useCallback(async (name: string, tier: string) => {
    const slug = 'kol-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const tierKols = kols.filter(k => k.kolTier === tier);
    const newOrder = tierKols.length;
    await saveFields(slug, {
      name,
      isKOL: 'true',
      kolTier: tier,
      kolOrder: String(newOrder),
      stage: '🟡 Prospect',
    });
    const newKOL: KOL = { id: slug, name, kolTier: tier, kolStatus: '', kolNotes: '', kolMovieLink: '', kolOrder: newOrder, isInCRM: false };
    setKols(prev => {
      const tierOrder = (t: string) => t === 'Initial Target' ? 0 : 1;
      return [...prev, newKOL].sort((a, b) => {
        if (tierOrder(a.kolTier) !== tierOrder(b.kolTier)) return tierOrder(a.kolTier) - tierOrder(b.kolTier);
        return a.kolOrder - b.kolOrder;
      });
    });
  }, [kols]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner text-primary" />
      </div>
    );
  }

  const initialTargets = kols.filter(k => k.kolTier === 'Initial Target');
  const potentialOutreach = kols.filter(k => k.kolTier === 'Potential Outreach');
  const converted = kols.filter(k => k.kolStatus === 'Converted');

  const sharedSectionProps = {
    dragOverId,
    confirmDeleteId,
    onStatusChange: handleStatusChange,
    onNotesChange: handleNotesChange,
    onMovieChange: handleMovieChange,
    onDelete: handleDeleteKOL,
    onConfirmDelete: setConfirmDeleteId,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-base-content/50">
            {kols.length} KOLs · {initialTargets.length} initial targets · {potentialOutreach.length} potential outreach
            {converted.length > 0 && ` · ${converted.length} converted 🎉`}
          </p>
        </div>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => setShowAddModal(true)}>
          <Plus size={14} /> Add KOL
        </button>
      </div>

      <KOLSection
        title="Initial Target"
        tier="Initial Target"
        emoji="🎯"
        kols={initialTargets}
        {...sharedSectionProps}
      />
      <KOLSection
        title="Potential Outreach"
        tier="Potential Outreach"
        emoji="📡"
        kols={potentialOutreach}
        {...sharedSectionProps}
      />

      {showAddModal && (
        <AddKOLModal onAdd={handleAddKOL} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};
