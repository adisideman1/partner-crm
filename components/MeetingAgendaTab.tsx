import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, Plus, ChevronDown, ChevronRight, GripVertical, ExternalLink } from 'lucide-react';
import { loadAllEdits, saveField, saveFields, deletePartner } from '../utils/db';

interface AgendaItem {
  id: string;
  title: string;
  body: string;
  status: 'open' | 'done';
  priority: 'high' | 'normal' | 'low';
  category: string;
  link: string;
  createdAt: string;
  sortOrder: number;
}

const STATUS_BADGE: Record<string, string> = {
  open: 'badge-warning',
  done: 'badge-success',
};

const PRIORITY_BADGE: Record<string, string> = {
  high: 'badge-error',
  normal: 'badge-info',
  low: 'badge-ghost',
};

const DEFAULT_WEBTOON_ITEM: Omit<AgendaItem, 'id'> = {
  title: 'Webtoons Competitor Research for ICP Targeting',
  body: `## Market Context
- Global webtoons market: ~$8.76B in 2026, projected $28.6B by 2034 (CAGR 15.5%)
- WEBTOON launched "Video Episodes" (5-min animated shorts from webcomics), validates exact Popcorn use case
- Every platform sitting on massive IP libraries of static comics that could become video content

## Tier 1 — Highest ICP Fit
1. **WEBTOON Entertainment** (NYSE: WBTN) — 170M MAU, launched Video Episodes, Warner Bros + Disney partnerships. Already in CRM.
2. **Tapas** (Kakao Entertainment) — Acquired for $510M. Massive IP library. LA HQ.
3. **Manta** (RIDI Corp) — Subscription model, Kodansha partnership. Needs constant content churn.
4. **Lezhin Comics** (KidariStudio) — 8M+ members, premium/mature niche, high ARPU.

## Tier 2 — Strong Fit
5. **Tappytoon** (KidariStudio) — Romance/fantasy vertical, Korean manhwa licensing.
6. **Bilibili Comics** — Part of Bilibili (300M+ MAU), already video-first company.
7. **Honeytoon** — Newer entrant, ranked #1 for English readers 2026. NYC based.
8. **Toonsutra** — India focus. Co-founder: Gen Fukunaga (FUNIMATION founder).

## Tier 3 — Emerging
9. **WebComics** — Popular with US youth. HK based.
10. **VoyceMe** — Indie/creator-owned.
11. Pocket Comics/Comico — ❌ DEAD (shutting down)

## Popcorn Sweet Spot
All platforms share same pain: thousands of static comic IPs that need to become video. WEBTOON proving the model. Popcorn = engine to do it without building an animation studio.`,
  status: 'open',
  priority: 'high',
  category: 'ICP Research',
  link: '',
  createdAt: new Date().toISOString().split('T')[0],
  sortOrder: 0,
};

export const MeetingAgendaTab: React.FC = () => {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await loadAllEdits();
      // Filter for agenda items (id starts with 'agenda-')
      const agendaMap: Record<string, Record<string, string>> = {};
      for (const row of rows) {
        if (!row.partner_id.startsWith('agenda-')) continue;
        if (!agendaMap[row.partner_id]) agendaMap[row.partner_id] = {};
        agendaMap[row.partner_id][row.field] = row.value;
      }

      const parsed: AgendaItem[] = Object.entries(agendaMap)
        .filter(([, f]) => f.deleted !== 'true' && f.title)
        .map(([id, f]) => ({
          id,
          title: f.title || '',
          body: f.body || '',
          status: (f.status as 'open' | 'done') || 'open',
          priority: (f.priority as 'high' | 'normal' | 'low') || 'normal',
          category: f.category || '',
          link: f.link || '',
          createdAt: f.createdAt || '',
          sortOrder: parseInt(f.sortOrder) || 0,
        }))
        .sort((a, b) => {
          // Open items first, then by priority, then by sort order
          if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
          const pOrder = { high: 0, normal: 1, low: 2 };
          if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
          return a.sortOrder - b.sortOrder;
        });

      // If no items exist yet, seed the Webtoon research item
      if (parsed.length === 0) {
        const seedId = `agenda-webtoon-competitors-${Date.now().toString(36)}`;
        const fields: Record<string, string> = {
          title: DEFAULT_WEBTOON_ITEM.title,
          body: DEFAULT_WEBTOON_ITEM.body,
          status: DEFAULT_WEBTOON_ITEM.status,
          priority: DEFAULT_WEBTOON_ITEM.priority,
          category: DEFAULT_WEBTOON_ITEM.category,
          link: DEFAULT_WEBTOON_ITEM.link,
          createdAt: DEFAULT_WEBTOON_ITEM.createdAt,
          sortOrder: '0',
          itemType: 'agenda',
        };
        await saveFields(seedId, fields);
        parsed.push({ ...DEFAULT_WEBTOON_ITEM, id: seedId });
      }

      setItems(parsed);
    } catch (err) {
      console.error('Failed to load agenda items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleStatusToggle = useCallback(async (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: item.status === 'open' ? 'done' : 'open' } : item
    ));
    const item = items.find(i => i.id === id);
    if (item) {
      await saveField(id, 'status', item.status === 'open' ? 'done' : 'open');
    }
  }, [items]);

  const handleDelete = useCallback(async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
    setDeleteConfirmId(null);
    await deletePartner(id); // reuse same soft-delete pattern
  }, [deleteConfirmId]);

  const handleAddItem = useCallback(async (data: { title: string; body: string; priority: string; category: string; link: string }) => {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    const id = `agenda-${slug}-${Date.now().toString(36)}`;
    const fields: Record<string, string> = {
      title: data.title,
      body: data.body,
      status: 'open',
      priority: data.priority || 'normal',
      category: data.category || '',
      link: data.link || '',
      createdAt: new Date().toISOString().split('T')[0],
      sortOrder: String(items.length),
      itemType: 'agenda',
    };
    await saveFields(id, fields);
    setItems(prev => [...prev, {
      id,
      title: data.title,
      body: data.body,
      status: 'open' as const,
      priority: (data.priority || 'normal') as 'high' | 'normal' | 'low',
      category: data.category || '',
      link: data.link || '',
      createdAt: fields.createdAt,
      sortOrder: items.length,
    }]);
    setShowAddModal(false);
  }, [items]);

  const handleFieldSave = useCallback(async (id: string, field: string, value: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
    await saveField(id, field, value);
  }, []);

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
  const openCount = items.filter(i => i.status === 'open').length;
  const doneCount = items.filter(i => i.status === 'done').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-sm text-base-content/60">Loading agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="btn-group">
            <button className={`btn btn-xs ${filter === 'all' ? 'btn-active' : ''}`} onClick={() => setFilter('all')}>
              All ({items.length})
            </button>
            <button className={`btn btn-xs ${filter === 'open' ? 'btn-active' : ''}`} onClick={() => setFilter('open')}>
              Open ({openCount})
            </button>
            <button className={`btn btn-xs ${filter === 'done' ? 'btn-active' : ''}`} onClick={() => setFilter('done')}>
              Done ({doneCount})
            </button>
          </div>
        </div>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => setShowAddModal(true)}>
          <Plus size={14} /> Add Item
        </button>
      </div>

      {/* Agenda Items */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-base-content/40">
          <p className="text-lg">📋 No agenda items yet</p>
          <p className="text-sm mt-1">Click "Add Item" to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className={`card bg-base-100 shadow-sm border ${item.status === 'done' ? 'opacity-60' : ''}`}>
              <div className="card-body p-3">
                {/* Title row */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary mt-1 shrink-0"
                    checked={item.status === 'done'}
                    onChange={() => handleStatusToggle(item.id)}
                  />
                  <div
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${item.status === 'done' ? 'line-through text-base-content/50' : ''}`}>
                        {item.title}
                      </span>
                      <span className={`badge badge-xs ${PRIORITY_BADGE[item.priority]}`}>
                        {item.priority}
                      </span>
                      {item.category && (
                        <span className="badge badge-xs badge-outline">{item.category}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-base-content/40">{item.createdAt}</span>
                      {item.link && (
                        <button
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          onClick={(e) => { e.stopPropagation(); window.open(item.link, '_blank'); }}
                        >
                          <ExternalLink size={10} /> Link
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {expandedId === item.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <button
                      className={`btn btn-ghost btn-xs btn-square ${deleteConfirmId === item.id ? 'btn-error text-error-content' : ''}`}
                      onClick={() => handleDelete(item.id)}
                      title={deleteConfirmId === item.id ? 'Click again to confirm' : 'Delete'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Expanded body */}
                {expandedId === item.id && (
                  <div className="mt-2 pl-8 space-y-2">
                    <div className="flex gap-2 items-center">
                      <select
                        className="select select-bordered select-xs"
                        value={item.priority}
                        onChange={(e) => handleFieldSave(item.id, 'priority', e.target.value)}
                      >
                        <option value="high">🔴 High</option>
                        <option value="normal">🔵 Normal</option>
                        <option value="low">⚪ Low</option>
                      </select>
                      <input
                        className="input input-bordered input-xs flex-1"
                        placeholder="Category (e.g. ICP Research, Follow-up)"
                        value={item.category}
                        onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, category: e.target.value } : i))}
                        onBlur={(e) => handleFieldSave(item.id, 'category', e.target.value)}
                      />
                      <input
                        className="input input-bordered input-xs flex-1"
                        placeholder="Link URL"
                        value={item.link}
                        onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, link: e.target.value } : i))}
                        onBlur={(e) => handleFieldSave(item.id, 'link', e.target.value)}
                      />
                    </div>
                    <textarea
                      className="textarea textarea-bordered w-full text-xs leading-relaxed min-h-[200px] font-mono"
                      value={item.body}
                      onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, body: e.target.value } : i))}
                      onBlur={(e) => handleFieldSave(item.id, 'body', e.target.value)}
                      placeholder="Notes, research, talking points..."
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && <AddAgendaModal onAdd={handleAddItem} onClose={() => setShowAddModal(false)} />}
    </div>
  );
};

const AddAgendaModal: React.FC<{ onAdd: (d: { title: string; body: string; priority: string; category: string; link: string }) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');
  const [category, setCategory] = useState('');
  const [link, setLink] = useState('');

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">📋 Add Agenda Item</h3>
        <div className="space-y-3">
          <input className="input input-bordered w-full" placeholder="Title *" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <select className="select select-bordered select-sm flex-1" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="high">🔴 High Priority</option>
              <option value="normal">🔵 Normal</option>
              <option value="low">⚪ Low</option>
            </select>
            <input className="input input-bordered input-sm flex-1" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <input className="input input-bordered w-full input-sm" placeholder="Link (optional)" value={link} onChange={e => setLink(e.target.value)} />
          <textarea className="textarea textarea-bordered w-full min-h-[120px]" placeholder="Notes, research, talking points..." value={body} onChange={e => setBody(e.target.value)} />
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => { if (title.trim()) onAdd({ title, body, priority, category, link }); }} disabled={!title.trim()}>Add Item</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
};
