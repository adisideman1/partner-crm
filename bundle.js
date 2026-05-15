// app.tsx
import { useState as useState5, useEffect as useEffect4, useMemo as useMemo2, useCallback as useCallback2, useRef as useRef4 } from "react";
import { createRoot } from "react-dom/client";
import { RefreshCw, Lock, LogOut } from "lucide-react";

// types.ts
var STAGES = [
  "All",
  "\u2705 Signed",
  "\u{1F535} Active Onboarding",
  "\u{1F7E2} Ongoing Management",
  "\u{1F7E1} Prospect",
  "\u{1F4AA} Self Sufficient",
  "\u{1F4E6} Archived",
  "\u{1F534} Churned"
];
var EDITABLE_STAGES = [
  "\u2705 Signed",
  "\u{1F535} Active Onboarding",
  "\u{1F7E2} Ongoing Management",
  "\u{1F7E1} Prospect",
  "\u{1F4AA} Self Sufficient",
  "\u{1F4E6} Archived",
  "\u{1F534} Churned"
];
var STAGE_COLORS = {
  "\u{1F7E1} Prospect": "badge-warning",
  "\u{1F535} Active Onboarding": "badge-info",
  "\u{1F7E2} Ongoing Management": "badge-success",
  "\u2705 Signed": "badge-primary",
  "\u{1F4AA} Self Sufficient": "badge-accent",
  "\u{1F4E6} Archived": "badge-ghost",
  "\u{1F534} Churned": "badge-error"
};
var STAGE_SORT_ORDER = {
  "\u2705 Signed": 0,
  "\u{1F535} Active Onboarding": 1,
  "\u{1F7E2} Ongoing Management": 2,
  "\u{1F7E1} Prospect": 3,
  "\u{1F4AA} Self Sufficient": 4,
  "\u{1F534} Churned": 5,
  "\u{1F4E6} Archived": 6
};
var PRIORITIES = ["All", "\u2B50 VIP", "Standard"];
var ACCOUNT_MANAGERS = ["All", "Adi", "Tess", "Cydel", "Ben", "Maria"];
var EDITABLE_MANAGERS = ["Tess", "Ben", "Maria", "Cydel", "Adi"];

// utils/supabase.ts
var SUPABASE_URL = "https://ctbeturbytzfrvxpyiuo.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0YmV0dXJieXR6ZnJ2eHB5aXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjg1NzIsImV4cCI6MjA5MDc0NDU3Mn0.ampYahXbbZmE9Y2Wom6UJDT6IwzG12vZiLvrIOV86go";
var REST = `${SUPABASE_URL}/rest/v1`;
var IN_TASKLET = typeof window !== "undefined" && typeof window.tasklet !== "undefined";
async function sbGet(path) {
  if (IN_TASKLET) {
    const result = await window.tasklet.runCommand(
      `curl -sf "${REST}/${path}" -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}"`,
      30
    );
    if (result.exitCode !== 0) {
      console.error("sbGet failed:", result.log);
      throw new Error(`Supabase query failed: ${result.log}`);
    }
    return JSON.parse(result.log);
  }
  const r = await fetch(`${REST}/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}
async function sbWrite(path, body, method = "POST", prefer = "return=minimal") {
  if (IN_TASKLET) {
    if (body !== null) {
      const json = JSON.stringify(body);
      const b64 = btoa(
        encodeURIComponent(json).replace(
          /%([0-9A-F]{2})/g,
          (_m, p) => String.fromCharCode(parseInt(p, 16))
        )
      );
      const tmp = `/tmp/sb_${Date.now()}.json`;
      const result = await window.tasklet.runCommand(
        `printf '%s' "${b64}" | base64 -d > ${tmp} && curl -s -w "\\n__HTTP__%{http_code}" -X ${method} "${REST}/${path}" -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" -H "Content-Type: application/json" -H "Prefer: ${prefer}" -d @${tmp}; rm -f ${tmp}`,
        30
      );
      const lines = result.log.split("\n");
      const statusLine = lines.find((l) => l.startsWith("__HTTP__")) || "";
      const httpCode = parseInt(statusLine.replace("__HTTP__", ""), 10) || 0;
      const responseBody = lines.filter((l) => !l.startsWith("__HTTP__")).join("\n").trim();
      if (httpCode >= 400 || result.exitCode !== 0) {
        console.error("sbWrite failed:", httpCode, responseBody);
        throw new Error(`Supabase write failed (${httpCode}): ${responseBody}`);
      }
      return responseBody;
    } else {
      const result = await window.tasklet.runCommand(
        `curl -s -w "\\n__HTTP__%{http_code}" -X ${method} "${REST}/${path}" -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" -H "Prefer: ${prefer}"`,
        30
      );
      const lines = result.log.split("\n");
      const statusLine = lines.find((l) => l.startsWith("__HTTP__")) || "";
      const httpCode = parseInt(statusLine.replace("__HTTP__", ""), 10) || 0;
      const responseBody = lines.filter((l) => !l.startsWith("__HTTP__")).join("\n").trim();
      if (httpCode >= 400 || result.exitCode !== 0) {
        throw new Error(`Supabase write failed (${httpCode}): ${responseBody}`);
      }
      return responseBody;
    }
  }
  const r = await fetch(`${REST}/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer
    },
    body: body !== null ? JSON.stringify(body) : void 0
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  const text = await r.text();
  return text;
}

// utils/notion.ts
var sbFetch = sbGet;
function normalize(s) {
  return (s || "").replace("Graduated", "Ongoing Management").replace("Paused", "Archived").replace("\u26AA Archived", "\u{1F4E6} Archived").replace(/^Active Onboarding$/, "\u{1F535} Active Onboarding").replace(/^Ongoing Management$/, "\u{1F7E2} Ongoing Management").replace(/^Prospect$/, "\u{1F7E1} Prospect").replace(/^Churned$/, "\u{1F534} Churned").replace(/^Self Sufficient$/, "\u{1F7E3} Self Sufficient").replace(/^Archived$/, "\u{1F4E6} Archived").replace(/^VIP$/, "\u2B50 VIP");
}
function rowToPartner(row) {
  return {
    id: row.id,
    url: row.url || "",
    name: row.name || "",
    email: row.email || "",
    company: row.company || "",
    onboardingStage: normalize(row.onboarding_stage || ""),
    priority: normalize(row.priority || "Standard"),
    accountManager: row.account_manager || "",
    appUserId: row.app_user_id || "",
    channelLink: row.channel_link || "",
    channelStatus: "",
    youtubeChannel: row.youtube_channel || "",
    popcornChannel: row.popcorn_channel || "",
    driveFolder: "",
    useCase: row.use_case || "",
    nextSteps: row.next_steps || "",
    lastConversation: row.last_conversation || "",
    nextFollowUp: row.next_follow_up || "",
    source: row.source || "crm",
    detailsLoaded: true
    // all details come from cache row
  };
}
async function fetchPartnerList() {
  const rows = await sbFetch(
    "partners_cache?select=*&order=name.asc&limit=200"
  );
  return rows.map(rowToPartner);
}
async function fetchPartnerDetail(id) {
  try {
    const rows = await sbFetch(
      `partners_cache?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
    );
    if (!rows.length) return null;
    return rowToPartner(rows[0]);
  } catch (err) {
    console.error(`fetchPartnerDetail(${id}) failed:`, err);
    return null;
  }
}
async function fetchConversationsForPartner(partnerId) {
  try {
    const rows = await sbFetch(
      `conversation_log?partner_id=eq.${encodeURIComponent(partnerId)}&select=*&order=date.desc`
    );
    return rows.map((row) => ({
      id: row.id,
      url: row.notion_url || "",
      title: row.title || "",
      customerUrl: "",
      channel: row.channel || "",
      loggedBy: row.logged_by || "",
      summary: row.summary || "",
      keyTakeaways: row.key_takeaways || "",
      nextSteps: row.next_steps || "",
      date: row.date || ""
    }));
  } catch (err) {
    console.error(`fetchConversationsForPartner(${partnerId}) failed:`, err);
    return [];
  }
}
async function fetchOnboardingTable() {
  return [];
}
function mergeOnboardingData(partners, _onboarding) {
  return partners;
}

// utils/db.ts
async function loadAllEdits() {
  const rows = await sbGet(
    "partner_edits?select=partner_id,field,value"
  );
  return rows;
}
async function saveField(partnerId, field, value) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const encodedPid = encodeURIComponent(partnerId);
  const encodedField = encodeURIComponent(field);
  const filterPath = `partner_edits?partner_id=eq.${encodedPid}&field=eq.${encodedField}`;
  try {
    const resp = await sbWrite(
      filterPath,
      { value, updated_at: now },
      "PATCH",
      "return=representation"
    );
    const rows = resp ? JSON.parse(resp) : [];
    if (Array.isArray(rows) && rows.length > 0) {
      return;
    }
  } catch {
  }
  await sbWrite(
    "partner_edits",
    { partner_id: partnerId, field, value, updated_at: now },
    "POST",
    "return=minimal"
  );
}
async function saveFields(partnerId, fields) {
  await Promise.all(
    Object.entries(fields).map(([field, value]) => saveField(partnerId, field, value))
  );
}
async function deletePartner(partnerId) {
  await saveField(partnerId, "deleted", "true");
}
async function saveConversation(partnerId, entry) {
  await sbWrite("conversation_log", {
    partner_id: partnerId,
    title: entry.title,
    date: entry.date || null,
    channel: entry.channel,
    summary: entry.summary,
    key_takeaways: entry.key_takeaways,
    next_steps: entry.next_steps,
    logged_by: entry.logged_by
  });
}

// components/StatsBar.tsx
import { Users, Star, AlertTriangle, DollarSign, Zap } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
var StatsBar = ({ partners }) => {
  const total = partners.length;
  const signed = partners.filter((p) => p.onboardingStage === "\u2705 Signed").length;
  const active = partners.filter((p) => p.onboardingStage === "\u{1F535} Active Onboarding").length;
  const prospects = partners.filter((p) => p.onboardingStage === "\u{1F7E1} Prospect").length;
  const now = /* @__PURE__ */ new Date();
  const overdue = partners.filter((p) => {
    if (!p.nextFollowUp) return false;
    return new Date(p.nextFollowUp) < now;
  }).length;
  const stats = [
    { label: "Total Clients", value: total, icon: Users, color: "text-primary" },
    { label: "Signed", value: signed, icon: DollarSign, color: "text-success" },
    { label: "Active Onboarding", value: active, icon: Zap, color: "text-info" },
    { label: "Prospects", value: prospects, icon: Star, color: "text-warning" }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-2", children: stats.map((s) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 rounded-xl bg-base-200/60 px-3 py-2.5", children: [
      /* @__PURE__ */ jsx("div", { className: `${s.color} p-1.5 rounded-lg bg-base-100`, children: /* @__PURE__ */ jsx(s.icon, { size: 16 }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-xl font-bold leading-tight", children: s.value }),
        /* @__PURE__ */ jsx("div", { className: "text-[10px] text-base-content/50 uppercase tracking-wider font-medium", children: s.label })
      ] })
    ] }, s.label)) }),
    overdue > 0 && /* @__PURE__ */ jsxs("div", { className: "alert alert-warning py-2 text-sm", children: [
      /* @__PURE__ */ jsx(AlertTriangle, { size: 14 }),
      /* @__PURE__ */ jsxs("span", { children: [
        overdue,
        " client",
        overdue > 1 ? "s" : "",
        " overdue for follow-up"
      ] })
    ] })
  ] });
};

// components/FilterBar.tsx
import { Search } from "lucide-react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var FilterBar = ({ filters, onFiltersChange }) => {
  return /* @__PURE__ */ jsxs2("div", { className: "flex flex-col sm:flex-row gap-2 items-stretch sm:items-center", children: [
    /* @__PURE__ */ jsxs2("label", { className: "input input-bordered input-sm flex items-center gap-2 grow", children: [
      /* @__PURE__ */ jsx2(Search, { className: "h-[1em] opacity-50" }),
      /* @__PURE__ */ jsx2(
        "input",
        {
          type: "search",
          className: "grow",
          placeholder: "Search clients...",
          value: filters.search,
          onChange: (e) => onFiltersChange({ ...filters, search: e.target.value })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs2("div", { className: "flex gap-2 flex-wrap", children: [
      /* @__PURE__ */ jsx2(
        "select",
        {
          className: "select select-bordered select-sm",
          value: filters.stage,
          onChange: (e) => onFiltersChange({ ...filters, stage: e.target.value }),
          children: STAGES.map((s) => /* @__PURE__ */ jsx2("option", { value: s, children: s === "All" ? "\u{1F3F7}\uFE0F All Stages" : s }, s))
        }
      ),
      /* @__PURE__ */ jsx2(
        "select",
        {
          className: "select select-bordered select-sm",
          value: filters.priority,
          onChange: (e) => onFiltersChange({ ...filters, priority: e.target.value }),
          children: PRIORITIES.map((p) => /* @__PURE__ */ jsx2("option", { value: p, children: p === "All" ? "\u{1F525} All Priorities" : p }, p))
        }
      ),
      /* @__PURE__ */ jsx2(
        "select",
        {
          className: "select select-bordered select-sm",
          value: filters.accountManager,
          onChange: (e) => onFiltersChange({ ...filters, accountManager: e.target.value }),
          children: ACCOUNT_MANAGERS.map((m) => /* @__PURE__ */ jsx2("option", { value: m, children: m === "All" ? "\u{1F464} All Managers" : m }, m))
        }
      )
    ] })
  ] });
};

// components/PartnerList.tsx
import { useState as useState2, useMemo } from "react";
import { ExternalLink as ExternalLink2, Star as Star2, ChevronRight, ChevronDown, Clock as Clock2, Lightbulb as Lightbulb2, Youtube as Youtube2, Trash2 } from "lucide-react";

// components/PartnerExpandPanel.tsx
import { useState, useEffect, useRef } from "react";
import {
  Mail,
  User,
  Lightbulb,
  MessageSquare,
  Clock,
  CalendarDays,
  Youtube,
  Plus,
  ExternalLink,
  Maximize2
} from "lucide-react";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var InlineEdit = ({ value, placeholder, onChange }) => {
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [draft]);
  return /* @__PURE__ */ jsx3(
    "textarea",
    {
      ref,
      className: "textarea textarea-ghost w-full text-sm leading-relaxed p-1 min-h-[1.8rem] resize-none focus:outline-none focus:bg-base-300/40 rounded transition-colors",
      value: draft,
      placeholder,
      rows: 1,
      onChange: (e) => setDraft(e.target.value),
      onBlur: () => {
        if (draft !== value) onChange(draft);
      },
      onClick: (e) => e.stopPropagation()
    }
  );
};
function formatDate(d) {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}
var CHANNEL_ICONS = {
  "\u{1F4DE} Call": "\u{1F4DE}",
  "Call": "\u{1F4DE}",
  "\u{1F4E7} Email": "\u{1F4E7}",
  "Email": "\u{1F4E7}",
  "\u{1F4AC} Slack": "\u{1F4AC}",
  "Slack": "\u{1F4AC}",
  "\u{1F91D} In-Person": "\u{1F91D}",
  "In-Person": "\u{1F91D}",
  "\u{1F4F9} Video Call": "\u{1F4F9}",
  "Video Call": "\u{1F4F9}",
  "\u{1F4DD} Other": "\u{1F4DD}",
  "Other": "\u{1F4DD}"
};
var openExternal = (e, url) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    (window.top || window).open(url, "_blank");
  } catch {
    window.open(url, "_blank");
  }
};
var PartnerExpandPanel = ({
  partner,
  conversations,
  loadingConversations,
  onOpenFullView,
  onDescriptionChange,
  onNextStepsChange,
  onDriveFolderChange,
  onFollowUpChange,
  onManagerChange,
  onAddConversation
}) => {
  const sorted = [...conversations].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  const recentConvos = sorted.slice(0, 3);
  const isOverdue2 = partner.nextFollowUp ? new Date(partner.nextFollowUp) < /* @__PURE__ */ new Date() : false;
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qTitle, setQTitle] = useState("");
  const [qDate, setQDate] = useState(() => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const [qChannel, setQChannel] = useState("Call");
  const [qSummary, setQSummary] = useState("");
  const [qLoggedBy, setQLoggedBy] = useState("");
  const handleQuickSave = async () => {
    setSaving(true);
    try {
      await onAddConversation(partner.id, {
        title: qTitle,
        date: qDate,
        channel: qChannel,
        summary: qSummary,
        key_takeaways: "",
        next_steps: "",
        logged_by: qLoggedBy
      });
      setQTitle("");
      setQSummary("");
      setShowQuickAdd(false);
      setQDate((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxs3(
    "div",
    {
      className: "border-t border-base-300 bg-base-100/50 px-4 pb-4 pt-3 space-y-3",
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxs3("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-3 text-xs text-base-content/50", children: [
            partner.email && /* @__PURE__ */ jsxs3("a", { href: `mailto:${partner.email}`, className: "link link-primary flex items-center gap-1", onClick: (e) => e.stopPropagation(), children: [
              /* @__PURE__ */ jsx3(Mail, { size: 12 }),
              " ",
              partner.email
            ] }),
            partner.appUserId && /* @__PURE__ */ jsxs3(
              "a",
              {
                href: `https://app.popcorn.co/admin/users/${partner.appUserId}`,
                className: "link link-primary flex items-center gap-1 font-mono cursor-pointer",
                onClick: (e) => openExternal(e, `https://app.popcorn.co/admin/users/${partner.appUserId}`),
                children: [
                  /* @__PURE__ */ jsx3(User, { size: 12 }),
                  " \u{1F511} ",
                  partner.appUserId
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs3(
            "button",
            {
              className: "btn btn-ghost btn-xs gap-1 text-primary",
              onClick: (e) => {
                e.stopPropagation();
                onOpenFullView();
              },
              children: [
                /* @__PURE__ */ jsx3(Maximize2, { size: 13 }),
                " Full View"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs3("div", { className: "flex flex-wrap items-center gap-x-4 gap-y-2 text-sm", children: [
          partner.lastConversation && /* @__PURE__ */ jsxs3("span", { className: "flex items-center gap-1.5 text-base-content/60", children: [
            /* @__PURE__ */ jsx3(Clock, { size: 13 }),
            " Last: ",
            /* @__PURE__ */ jsx3("span", { className: "font-medium text-base-content/80", children: formatDate(partner.lastConversation) })
          ] }),
          /* @__PURE__ */ jsxs3("span", { className: `flex items-center gap-1.5 ${isOverdue2 ? "text-error font-semibold" : "text-base-content/60"}`, children: [
            /* @__PURE__ */ jsx3(CalendarDays, { size: 13 }),
            " Follow-up:",
            /* @__PURE__ */ jsx3(
              "input",
              {
                type: "date",
                className: `input input-ghost input-xs text-sm ${isOverdue2 ? "text-error" : ""}`,
                value: partner.nextFollowUp || "",
                onChange: (e) => onFollowUpChange(partner.id, e.target.value),
                onClick: (e) => e.stopPropagation()
              }
            ),
            isOverdue2 && /* @__PURE__ */ jsx3("span", { className: "badge badge-error badge-xs", children: "overdue!" })
          ] }),
          partner.driveFolder ? /* @__PURE__ */ jsxs3(
            "a",
            {
              href: partner.driveFolder,
              className: "flex items-center gap-1 text-blue-500 hover:text-blue-400 cursor-pointer",
              onClick: (e) => openExternal(e, partner.driveFolder),
              children: [
                "\u{1F4C1} ",
                /* @__PURE__ */ jsx3("span", { className: "underline", children: "Drive Folder" })
              ]
            }
          ) : /* @__PURE__ */ jsxs3("span", { className: "flex items-center gap-1 text-base-content/30", children: [
            "\u{1F4C1}",
            /* @__PURE__ */ jsx3(
              "input",
              {
                type: "text",
                className: "input input-ghost input-xs w-28 text-xs",
                placeholder: "+ Drive URL",
                onBlur: (e) => {
                  if (e.target.value) onDriveFolderChange(partner.id, e.target.value);
                },
                onKeyDown: (e) => {
                  if (e.key === "Enter") e.target.blur();
                },
                onClick: (e) => e.stopPropagation()
              }
            )
          ] }),
          partner.youtubeChannel && /* @__PURE__ */ jsxs3(
            "a",
            {
              href: partner.youtubeChannel,
              className: "flex items-center gap-1 text-red-500 hover:text-red-400 cursor-pointer",
              onClick: (e) => openExternal(e, partner.youtubeChannel),
              children: [
                /* @__PURE__ */ jsx3(Youtube, { size: 14 }),
                " YouTube"
              ]
            }
          ),
          partner.popcornChannel && /* @__PURE__ */ jsx3(
            "a",
            {
              href: partner.popcornChannel,
              className: "flex items-center gap-1 text-amber-500 hover:text-amber-400 cursor-pointer",
              onClick: (e) => openExternal(e, partner.popcornChannel),
              children: "\u{1F37F} Popcorn"
            }
          ),
          partner.url && /* @__PURE__ */ jsxs3(
            "a",
            {
              href: partner.url,
              className: "flex items-center gap-1 text-base-content/40 hover:text-base-content/60 cursor-pointer",
              onClick: (e) => openExternal(e, partner.url),
              children: [
                /* @__PURE__ */ jsx3(ExternalLink, { size: 12 }),
                " Notion"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs3("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs3("div", { className: "bg-base-200 rounded-lg p-3", children: [
            /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-1.5 text-xs font-semibold text-secondary mb-1", children: [
              /* @__PURE__ */ jsx3(Lightbulb, { size: 13 }),
              " Creative Idea"
            ] }),
            /* @__PURE__ */ jsx3(
              InlineEdit,
              {
                value: partner.useCase || "",
                placeholder: "Click to add idea...",
                onChange: (val) => onDescriptionChange(partner.id, val)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs3("div", { className: "bg-base-200 rounded-lg p-3", children: [
            /* @__PURE__ */ jsx3("div", { className: "flex items-center gap-1.5 text-xs font-semibold text-base-content/60 mb-1", children: "\u{1F4CB} Next Steps" }),
            /* @__PURE__ */ jsx3(
              InlineEdit,
              {
                value: partner.nextSteps || "",
                placeholder: "Click to add next steps...",
                onChange: (val) => onNextStepsChange(partner.id, val)
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs3("div", { className: "bg-base-200 rounded-lg p-3", children: [
          /* @__PURE__ */ jsxs3("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-1.5 text-xs font-semibold text-primary", children: [
              /* @__PURE__ */ jsx3(MessageSquare, { size: 13 }),
              " Conversations",
              loadingConversations ? /* @__PURE__ */ jsx3("span", { className: "loading loading-spinner loading-xs" }) : /* @__PURE__ */ jsx3("span", { className: "badge badge-xs badge-primary", children: sorted.length })
            ] }),
            /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxs3(
                "button",
                {
                  className: "btn btn-ghost btn-xs gap-1",
                  onClick: (e) => {
                    e.stopPropagation();
                    setShowQuickAdd(!showQuickAdd);
                  },
                  children: [
                    /* @__PURE__ */ jsx3(Plus, { size: 12 }),
                    " Log"
                  ]
                }
              ),
              sorted.length > 3 && /* @__PURE__ */ jsxs3(
                "button",
                {
                  className: "btn btn-ghost btn-xs text-primary",
                  onClick: (e) => {
                    e.stopPropagation();
                    onOpenFullView();
                  },
                  children: [
                    "View all ",
                    sorted.length,
                    " \u2192"
                  ]
                }
              )
            ] })
          ] }),
          showQuickAdd && /* @__PURE__ */ jsxs3("div", { className: "mb-3 p-3 bg-base-300 rounded-lg space-y-2", children: [
            /* @__PURE__ */ jsxs3("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2", children: [
              /* @__PURE__ */ jsx3(
                "input",
                {
                  className: "input input-bordered input-xs",
                  placeholder: "Title",
                  value: qTitle,
                  onChange: (e) => setQTitle(e.target.value),
                  onClick: (e) => e.stopPropagation()
                }
              ),
              /* @__PURE__ */ jsx3(
                "input",
                {
                  type: "date",
                  className: "input input-bordered input-xs",
                  value: qDate,
                  onChange: (e) => setQDate(e.target.value),
                  onClick: (e) => e.stopPropagation()
                }
              ),
              /* @__PURE__ */ jsxs3(
                "select",
                {
                  className: "select select-bordered select-xs",
                  value: qChannel,
                  onChange: (e) => setQChannel(e.target.value),
                  onClick: (e) => e.stopPropagation(),
                  children: [
                    /* @__PURE__ */ jsx3("option", { value: "Call", children: "\u{1F4DE} Call" }),
                    /* @__PURE__ */ jsx3("option", { value: "Email", children: "\u{1F4E7} Email" }),
                    /* @__PURE__ */ jsx3("option", { value: "Slack", children: "\u{1F4AC} Slack" }),
                    /* @__PURE__ */ jsx3("option", { value: "Video Call", children: "\u{1F4F9} Video" }),
                    /* @__PURE__ */ jsx3("option", { value: "In-Person", children: "\u{1F91D} In-Person" }),
                    /* @__PURE__ */ jsx3("option", { value: "Other", children: "\u{1F4DD} Other" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs3(
                "select",
                {
                  className: "select select-bordered select-xs",
                  value: qLoggedBy,
                  onChange: (e) => setQLoggedBy(e.target.value),
                  onClick: (e) => e.stopPropagation(),
                  children: [
                    /* @__PURE__ */ jsx3("option", { value: "", children: "Logged by" }),
                    /* @__PURE__ */ jsx3("option", { value: "Adi", children: "Adi" }),
                    /* @__PURE__ */ jsx3("option", { value: "Tess", children: "Tess" }),
                    /* @__PURE__ */ jsx3("option", { value: "Ben", children: "Ben" }),
                    /* @__PURE__ */ jsx3("option", { value: "Cydel", children: "Cydel" }),
                    /* @__PURE__ */ jsx3("option", { value: "Agent \u{1F916}", children: "Agent \u{1F916}" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx3(
              "textarea",
              {
                className: "textarea textarea-bordered w-full text-xs",
                rows: 2,
                placeholder: "Summary...",
                value: qSummary,
                onChange: (e) => setQSummary(e.target.value),
                onClick: (e) => e.stopPropagation()
              }
            ),
            /* @__PURE__ */ jsxs3("div", { className: "flex justify-end gap-2", children: [
              /* @__PURE__ */ jsx3("button", { className: "btn btn-ghost btn-xs", onClick: () => setShowQuickAdd(false), children: "Cancel" }),
              /* @__PURE__ */ jsx3("button", { className: "btn btn-primary btn-xs", onClick: handleQuickSave, disabled: saving, children: saving ? /* @__PURE__ */ jsx3("span", { className: "loading loading-spinner loading-xs" }) : "Save" })
            ] })
          ] }),
          !loadingConversations && recentConvos.length === 0 && !showQuickAdd && /* @__PURE__ */ jsx3("p", { className: "text-xs text-base-content/40 italic", children: "No conversations yet \u2014 click Log to add one." }),
          recentConvos.map((c) => /* @__PURE__ */ jsxs3("div", { className: "flex items-start gap-2 py-1.5 border-b border-base-300 last:border-0 text-xs", children: [
            /* @__PURE__ */ jsx3("span", { className: "shrink-0 mt-0.5", children: CHANNEL_ICONS[c.channel] || "\u{1F4AC}" }),
            /* @__PURE__ */ jsxs3("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxs3("div", { className: "flex items-center justify-between gap-2", children: [
                /* @__PURE__ */ jsx3("span", { className: "font-medium truncate", children: c.title || c.channel || "Untitled" }),
                /* @__PURE__ */ jsx3("span", { className: "text-base-content/40 whitespace-nowrap", children: c.date ? formatDate(c.date) : "" })
              ] }),
              c.summary && /* @__PURE__ */ jsx3("p", { className: "text-base-content/60 line-clamp-2 mt-0.5", children: c.summary })
            ] })
          ] }, c.id))
        ] })
      ]
    }
  );
};

// components/PartnerList.tsx
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function formatDate2(d) {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}
function isOverdue(d) {
  if (!d) return false;
  return new Date(d) < /* @__PURE__ */ new Date();
}
function summarize(text, maxWords) {
  if (!text) return "";
  const clean = text.replace(/^[-•*]\s*/gm, "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const words = clean.split(" ");
  if (words.length <= maxWords) return clean;
  return words.slice(0, maxWords).join(" ") + "\u2026";
}
var openExternal2 = (e, url) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    (window.top || window).open(url, "_blank");
  } catch {
    window.open(url, "_blank");
  }
};
var STAGE_HEADER_COLORS = {
  "\u2705 Signed": "border-l-primary text-primary",
  "\u{1F535} Active Onboarding": "border-l-info text-info",
  "\u{1F7E2} Ongoing Management": "border-l-success text-success",
  "\u{1F7E1} Prospect": "border-l-warning text-warning",
  "\u{1F4AA} Self Sufficient": "border-l-accent text-accent",
  "\u{1F534} Churned": "border-l-error text-error",
  "\u{1F4E6} Archived": "border-l-base-300 text-base-content/40"
};
var ChannelBadge = ({ url }) => {
  const isYt = url.includes("youtube.com") || url.includes("youtu.be");
  if (isYt) {
    return /* @__PURE__ */ jsxs4(
      "a",
      {
        href: url,
        className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors cursor-pointer text-xs",
        onClick: (e) => openExternal2(e, url),
        title: "YouTube Channel",
        children: [
          /* @__PURE__ */ jsx4(Youtube2, { size: 12 }),
          " YouTube"
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxs4(
    "a",
    {
      href: url,
      className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer text-xs",
      onClick: (e) => openExternal2(e, url),
      title: "Channel Link",
      children: [
        /* @__PURE__ */ jsx4(ExternalLink2, { size: 10 }),
        " Channel"
      ]
    }
  );
};
var PartnerRow = ({
  p,
  isExpanded,
  isSelected,
  isConfirming,
  onExpand,
  onSelect,
  onStageChange,
  onManagerChange,
  onDelete,
  setConfirmDeleteId,
  expandedConversations,
  loadingExpandConversations,
  onDescriptionChange,
  onNextStepsChange,
  onDriveFolderChange,
  onFollowUpChange,
  onAddConversation
}) => {
  const stageClass = STAGE_COLORS[p.onboardingStage] || "badge-ghost";
  const overdue = isOverdue(p.nextFollowUp);
  const isSigned = p.onboardingStage === "\u2705 Signed";
  return /* @__PURE__ */ jsxs4(
    "div",
    {
      draggable: true,
      onDragStart: (e) => {
        e.dataTransfer.setData("application/x-crm-partner", JSON.stringify({ id: p.id, name: p.name, type: "partner" }));
        e.dataTransfer.setData("application/x-cross-tab", JSON.stringify({ id: p.id, name: p.name, fromTab: "partners" }));
        e.dataTransfer.effectAllowed = "move";
      },
      className: `rounded-xl border transition-all cursor-pointer group ${isExpanded ? "border-primary/40 shadow-lg bg-base-100 ring-1 ring-primary/20" : isSelected ? "border-primary bg-base-100" : "border-base-content/5 bg-base-100 hover:border-base-content/15 hover:shadow-md"} ${isSigned ? "border-l-4 !border-l-primary" : ""}`,
      onClick: () => {
        setConfirmDeleteId(null);
        onExpand(isExpanded ? null : p);
      },
      children: [
        /* @__PURE__ */ jsxs4("div", { className: "px-4 py-3 space-y-1.5", children: [
          /* @__PURE__ */ jsxs4("div", { className: "flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [
              /* @__PURE__ */ jsx4("h3", { className: `font-semibold truncate ${isSigned ? "text-primary" : ""}`, children: p.name }),
              p.priority === "\u2B50 VIP" && /* @__PURE__ */ jsx4(Star2, { size: 13, className: "text-warning shrink-0 fill-current" }),
              p.company && /* @__PURE__ */ jsxs4("span", { className: "text-xs text-base-content/40 truncate hidden sm:inline", children: [
                "\xB7 ",
                p.company
              ] })
            ] }),
            /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-1.5 shrink-0", children: [
              /* @__PURE__ */ jsxs4(
                "select",
                {
                  className: `select select-bordered select-xs text-xs font-medium ${stageClass}`,
                  value: p.onboardingStage,
                  onClick: (e) => e.stopPropagation(),
                  onChange: (e) => {
                    e.stopPropagation();
                    onStageChange(p.id, e.target.value);
                  },
                  children: [
                    EDITABLE_STAGES.map((s) => /* @__PURE__ */ jsx4("option", { value: s, children: s }, s)),
                    !EDITABLE_STAGES.includes(p.onboardingStage) && p.onboardingStage && /* @__PURE__ */ jsx4("option", { value: p.onboardingStage, children: p.onboardingStage })
                  ]
                }
              ),
              /* @__PURE__ */ jsx4("span", { className: "flex items-center gap-0", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxs4(
                "select",
                {
                  className: "select select-ghost select-xs text-xs py-0 h-6 min-h-0 w-16 pr-5",
                  value: p.accountManager || "",
                  onChange: (e) => {
                    e.stopPropagation();
                    onManagerChange(p.id, e.target.value);
                  },
                  children: [
                    /* @__PURE__ */ jsx4("option", { value: "", children: "\u2014" }),
                    EDITABLE_MANAGERS.map((m) => /* @__PURE__ */ jsx4("option", { value: m, children: m }, m)),
                    p.accountManager && !EDITABLE_MANAGERS.includes(p.accountManager) && p.accountManager !== "" && /* @__PURE__ */ jsx4("option", { value: p.accountManager, children: p.accountManager })
                  ]
                }
              ) }),
              onDelete && (isConfirming ? /* @__PURE__ */ jsxs4(
                "button",
                {
                  className: "btn btn-xs btn-error gap-1 animate-pulse",
                  onClick: (e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                    setConfirmDeleteId(null);
                  },
                  title: "Confirm remove",
                  children: [
                    /* @__PURE__ */ jsx4(Trash2, { size: 11 }),
                    " Remove?"
                  ]
                }
              ) : /* @__PURE__ */ jsx4(
                "button",
                {
                  className: "btn btn-xs btn-ghost btn-square opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:btn-error transition-opacity",
                  onClick: (e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(p.id);
                  },
                  title: "Remove",
                  children: /* @__PURE__ */ jsx4(Trash2, { size: 12 })
                }
              )),
              isExpanded ? /* @__PURE__ */ jsx4(ChevronDown, { size: 15, className: "opacity-60 text-primary" }) : /* @__PURE__ */ jsx4(ChevronRight, { size: 15, className: "opacity-30" })
            ] })
          ] }),
          (p.useCase || p.nextSteps) && /* @__PURE__ */ jsxs4("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm", children: [
            p.useCase && /* @__PURE__ */ jsxs4("span", { className: "text-base-content/70 flex items-center gap-1", children: [
              /* @__PURE__ */ jsx4(Lightbulb2, { size: 12, className: "text-secondary shrink-0" }),
              summarize(p.useCase, 10)
            ] }),
            p.nextSteps && /* @__PURE__ */ jsxs4("span", { className: "text-base-content/45 italic text-xs flex items-center gap-1", children: [
              "\u2192 ",
              summarize(p.nextSteps, 8)
            ] })
          ] }),
          /* @__PURE__ */ jsxs4("div", { className: "flex flex-wrap items-center gap-1.5", children: [
            (p.youtubeChannel || p.channelLink) && /* @__PURE__ */ jsx4(ChannelBadge, { url: p.youtubeChannel || p.channelLink || "" }),
            p.popcornChannel && /* @__PURE__ */ jsx4(
              "a",
              {
                href: p.popcornChannel,
                className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors cursor-pointer text-xs",
                onClick: (e) => openExternal2(e, p.popcornChannel),
                title: "Popcorn Channel",
                children: "\u{1F37F} Popcorn"
              }
            ),
            p.driveFolder && /* @__PURE__ */ jsx4(
              "a",
              {
                href: p.driveFolder,
                className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors cursor-pointer text-xs",
                onClick: (e) => openExternal2(e, p.driveFolder),
                title: "Google Drive Folder",
                children: "\u{1F4C1} Drive"
              }
            ),
            p.appUserId && /* @__PURE__ */ jsx4("span", { className: "inline-flex items-center px-1.5 py-0.5 rounded-md bg-base-200 text-base-content/50 text-xs font-mono", children: "\u{1F511} ID" }),
            p.lastConversation && /* @__PURE__ */ jsxs4("span", { className: "inline-flex items-center gap-1 text-xs text-base-content/40", children: [
              /* @__PURE__ */ jsx4(Clock2, { size: 10 }),
              " ",
              formatDate2(p.lastConversation)
            ] }),
            p.nextFollowUp && /* @__PURE__ */ jsxs4("span", { className: `inline-flex items-center gap-1 text-xs ${overdue ? "text-error font-semibold" : "text-base-content/40"}`, children: [
              "\u{1F4C5} ",
              formatDate2(p.nextFollowUp),
              overdue && " \u26A0\uFE0F"
            ] })
          ] })
        ] }),
        isExpanded && /* @__PURE__ */ jsx4(
          PartnerExpandPanel,
          {
            partner: p,
            conversations: expandedConversations,
            loadingConversations: loadingExpandConversations,
            onOpenFullView: () => onSelect(p),
            onDescriptionChange,
            onNextStepsChange,
            onDriveFolderChange,
            onFollowUpChange,
            onManagerChange,
            onAddConversation
          }
        )
      ]
    }
  );
};
var PartnerList = ({
  partners,
  onSelect,
  selectedId,
  onStageChange,
  onManagerChange,
  onDelete,
  expandedId,
  onExpand,
  expandedConversations,
  loadingExpandConversations,
  onDescriptionChange,
  onNextStepsChange,
  onDriveFolderChange,
  onFollowUpChange,
  onAddConversation,
  grouped = true
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState2(null);
  const stageGroups = useMemo(() => {
    if (!grouped) return null;
    const groups = [];
    const stageMap = /* @__PURE__ */ new Map();
    for (const p of partners) {
      const stage = p.onboardingStage || "\u{1F7E1} Prospect";
      if (!stageMap.has(stage)) stageMap.set(stage, []);
      stageMap.get(stage).push(p);
    }
    const entries = [...stageMap.entries()].sort(
      (a, b) => (STAGE_SORT_ORDER[a[0]] ?? 99) - (STAGE_SORT_ORDER[b[0]] ?? 99)
    );
    for (const [stage, pts] of entries) {
      groups.push({ stage, partners: pts });
    }
    return groups;
  }, [partners, grouped]);
  if (partners.length === 0) {
    return /* @__PURE__ */ jsxs4("div", { className: "text-center py-12 text-base-content/60", children: [
      /* @__PURE__ */ jsx4("p", { className: "text-lg", children: "No clients found" }),
      /* @__PURE__ */ jsx4("p", { className: "text-sm mt-1", children: "Try adjusting your filters" })
    ] });
  }
  const renderRow = (p) => /* @__PURE__ */ jsx4(
    PartnerRow,
    {
      p,
      isExpanded: expandedId === p.id,
      isSelected: selectedId === p.id,
      isConfirming: confirmDeleteId === p.id,
      onExpand,
      onSelect,
      onStageChange,
      onManagerChange,
      onDelete,
      setConfirmDeleteId,
      expandedConversations,
      loadingExpandConversations,
      onDescriptionChange,
      onNextStepsChange,
      onDriveFolderChange,
      onFollowUpChange,
      onAddConversation
    },
    p.id
  );
  if (stageGroups && stageGroups.length > 1) {
    return /* @__PURE__ */ jsx4("div", { className: "space-y-4", children: stageGroups.map(({ stage, partners: pts }) => /* @__PURE__ */ jsxs4("div", { children: [
      /* @__PURE__ */ jsxs4("div", { className: `flex items-center gap-2 mb-2 pl-1 border-l-4 ${STAGE_HEADER_COLORS[stage] || "border-l-base-300 text-base-content/50"}`, children: [
        /* @__PURE__ */ jsx4("span", { className: "pl-2 text-xs font-bold uppercase tracking-wider", children: stage }),
        /* @__PURE__ */ jsxs4("span", { className: "text-xs text-base-content/30", children: [
          "(",
          pts.length,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsx4("div", { className: "space-y-1.5", children: pts.map(renderRow) })
    ] }, stage)) });
  }
  return /* @__PURE__ */ jsx4("div", { className: "space-y-1.5", children: partners.map(renderRow) });
};

// components/PartnerDetail.tsx
import { useState as useState3, useEffect as useEffect2, useRef as useRef2 } from "react";
import {
  ArrowLeft,
  ExternalLink as ExternalLink3,
  Star as Star3,
  Mail as Mail2,
  Link as Link2,
  User as User2,
  Lightbulb as Lightbulb3,
  MessageSquare as MessageSquare2,
  Clock as Clock3,
  CalendarDays as CalendarDays2,
  Youtube as Youtube3,
  Plus as Plus2
} from "lucide-react";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var openExternal3 = (e, url) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    (window.top || window).open(url, "_blank");
  } catch {
    window.open(url, "_blank");
  }
};
var InlineEdit2 = ({ value, placeholder, onChange }) => {
  const [draft, setDraft] = useState3(value);
  const ref = useRef2(null);
  useEffect2(() => {
    setDraft(value);
  }, [value]);
  useEffect2(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [draft]);
  return /* @__PURE__ */ jsx5(
    "textarea",
    {
      ref,
      className: "textarea textarea-ghost w-full text-sm leading-relaxed p-0 min-h-[2rem] resize-none focus:outline-none focus:bg-base-300/40 rounded transition-colors",
      value: draft,
      placeholder,
      rows: 1,
      onChange: (e) => setDraft(e.target.value),
      onBlur: () => {
        if (draft !== value) onChange(draft);
      }
    }
  );
};
function formatDate3(d) {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return d;
  }
}
var CHANNEL_ICONS2 = {
  "\u{1F4DE} Call": "\u{1F4DE}",
  "\u{1F4E7} Email": "\u{1F4E7}",
  "\u{1F4AC} Slack": "\u{1F4AC}",
  "\u{1F91D} In-Person": "\u{1F91D}",
  "\u{1F4F9} Video Call": "\u{1F4F9}",
  "\u{1F4DD} Other": "\u{1F4DD}",
  // Also match stripped-emoji keys from Supabase
  "Call": "\u{1F4DE}",
  "Email": "\u{1F4E7}",
  "Slack": "\u{1F4AC}",
  "In-Person": "\u{1F91D}",
  "Video Call": "\u{1F4F9}",
  "Other": "\u{1F4DD}"
};
var PartnerDetail = ({
  partner,
  conversations,
  loadingDetail,
  onBack,
  onStageChange,
  onManagerChange,
  onDescriptionChange,
  onNextStepsChange,
  onDriveFolderChange,
  onFollowUpChange,
  onAddConversation
}) => {
  const sorted = [...conversations].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  const stageClass = STAGE_COLORS[partner.onboardingStage] || "badge-ghost";
  const [showConvoForm, setShowConvoForm] = useState3(false);
  const [convoSaving, setConvoSaving] = useState3(false);
  const [convoSuccess, setConvoSuccess] = useState3(false);
  const [convoTitle, setConvoTitle] = useState3("");
  const [convoDate, setConvoDate] = useState3(() => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const [convoChannel, setConvoChannel] = useState3("Call");
  const [convoLoggedBy, setConvoLoggedBy] = useState3("");
  const [convoSummary, setConvoSummary] = useState3("");
  const [convoTakeaways, setConvoTakeaways] = useState3("");
  const [convoNextSteps, setConvoNextSteps] = useState3("");
  const resetConvoForm = () => {
    setConvoTitle("");
    setConvoDate((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
    setConvoChannel("Call");
    setConvoLoggedBy("");
    setConvoSummary("");
    setConvoTakeaways("");
    setConvoNextSteps("");
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
        logged_by: convoLoggedBy
      });
      resetConvoForm();
      setShowConvoForm(false);
      setConvoSuccess(true);
      setTimeout(() => setConvoSuccess(false), 3e3);
    } catch (err) {
      console.error("Failed to save conversation:", err);
    } finally {
      setConvoSaving(false);
    }
  };
  return /* @__PURE__ */ jsxs5("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs5("button", { className: "btn btn-ghost btn-sm gap-1", onClick: onBack, children: [
      /* @__PURE__ */ jsx5(ArrowLeft, { size: 16 }),
      " Back to list"
    ] }),
    loadingDetail && /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2 text-sm text-base-content/60 px-1", children: [
      /* @__PURE__ */ jsx5("span", { className: "loading loading-spinner loading-sm" }),
      "Loading full details from Notion..."
    ] }),
    /* @__PURE__ */ jsx5("div", { className: "card bg-base-200", children: /* @__PURE__ */ jsxs5("div", { className: "card-body p-5 gap-3", children: [
      /* @__PURE__ */ jsxs5("div", { className: "flex items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxs5("div", { children: [
          /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx5("h2", { className: "text-xl font-bold", children: partner.name }),
            partner.priority === "\u2B50 VIP" && /* @__PURE__ */ jsx5(Star3, { size: 18, className: "text-warning fill-current" })
          ] }),
          partner.company && /* @__PURE__ */ jsx5("p", { className: "text-sm text-base-content/60 mt-0.5", children: partner.company })
        ] }),
        /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxs5(
            "select",
            {
              className: `select select-bordered select-sm font-semibold text-sm ${stageClass}`,
              value: partner.onboardingStage,
              onChange: (e) => onStageChange(partner.id, e.target.value),
              children: [
                EDITABLE_STAGES.map((s) => /* @__PURE__ */ jsx5("option", { value: s, children: s }, s)),
                !EDITABLE_STAGES.includes(partner.onboardingStage) && partner.onboardingStage && /* @__PURE__ */ jsx5("option", { value: partner.onboardingStage, children: partner.onboardingStage })
              ]
            }
          ),
          partner.url && /* @__PURE__ */ jsx5(
            "a",
            {
              href: partner.url,
              className: "btn btn-ghost btn-sm btn-square",
              title: "Open in Notion",
              onClick: (e) => openExternal3(e, partner.url),
              children: /* @__PURE__ */ jsx5(ExternalLink3, { size: 14 })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs5("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2", children: [
        /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsx5(User2, { size: 14, className: "opacity-60" }),
          /* @__PURE__ */ jsx5("span", { className: "text-base-content/60", children: "Manager:" }),
          /* @__PURE__ */ jsxs5(
            "select",
            {
              className: "select select-ghost select-xs font-medium",
              value: partner.accountManager || "",
              onChange: (e) => onManagerChange(partner.id, e.target.value),
              children: [
                /* @__PURE__ */ jsx5("option", { value: "", children: "Unassigned" }),
                EDITABLE_MANAGERS.map((m) => /* @__PURE__ */ jsx5("option", { value: m, children: m }, m)),
                partner.accountManager && !EDITABLE_MANAGERS.includes(partner.accountManager) && partner.accountManager !== "" && /* @__PURE__ */ jsx5("option", { value: partner.accountManager, children: partner.accountManager })
              ]
            }
          )
        ] }),
        partner.email && /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsx5(Mail2, { size: 14, className: "opacity-60" }),
          /* @__PURE__ */ jsx5("a", { href: `mailto:${partner.email}`, className: "link link-primary", children: partner.email })
        ] }),
        partner.lastConversation && /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsx5(Clock3, { size: 14, className: "opacity-60" }),
          /* @__PURE__ */ jsx5("span", { className: "text-base-content/60", children: "Last contact:" }),
          /* @__PURE__ */ jsx5("span", { children: formatDate3(partner.lastConversation) })
        ] }),
        /* @__PURE__ */ jsxs5("div", { className: `flex items-center gap-2 text-sm ${partner.nextFollowUp && new Date(partner.nextFollowUp) < /* @__PURE__ */ new Date() ? "text-error font-semibold" : ""}`, children: [
          /* @__PURE__ */ jsx5(CalendarDays2, { size: 14, className: "opacity-60" }),
          /* @__PURE__ */ jsx5("span", { className: "text-base-content/60", children: "Next follow-up:" }),
          /* @__PURE__ */ jsx5(
            "input",
            {
              type: "date",
              className: `input input-ghost input-xs ${partner.nextFollowUp && new Date(partner.nextFollowUp) < /* @__PURE__ */ new Date() ? "text-error" : ""}`,
              value: partner.nextFollowUp || "",
              onChange: (e) => onFollowUpChange(partner.id, e.target.value)
            }
          ),
          partner.nextFollowUp && new Date(partner.nextFollowUp) < /* @__PURE__ */ new Date() && /* @__PURE__ */ jsx5("span", { className: "badge badge-error badge-xs", children: "overdue!" })
        ] }),
        partner.appUserId && /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsx5(User2, { size: 14, className: "opacity-60" }),
          /* @__PURE__ */ jsx5("span", { className: "text-base-content/60", children: "Popcorn User ID:" }),
          /* @__PURE__ */ jsxs5(
            "a",
            {
              href: `https://app.popcorn.co/admin/users/${partner.appUserId}`,
              className: "font-mono text-xs bg-base-300 px-1.5 py-0.5 rounded link link-primary cursor-pointer",
              onClick: (e) => openExternal3(e, `https://app.popcorn.co/admin/users/${partner.appUserId}`),
              children: [
                partner.appUserId,
                " \u2197"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsx5("span", { className: "opacity-60", children: "\u{1F4C1}" }),
          /* @__PURE__ */ jsx5("span", { className: "text-base-content/60", children: "Drive Folder:" }),
          partner.driveFolder ? /* @__PURE__ */ jsx5(
            "a",
            {
              href: partner.driveFolder,
              className: "link link-primary truncate max-w-[200px] cursor-pointer",
              onClick: (e) => openExternal3(e, partner.driveFolder),
              children: "Open Folder \u2197"
            }
          ) : /* @__PURE__ */ jsx5("span", { className: "text-base-content/30 italic", children: "Not set" }),
          /* @__PURE__ */ jsx5(
            "input",
            {
              type: "text",
              className: "input input-ghost input-xs w-40 text-xs",
              placeholder: "Paste Drive URL...",
              defaultValue: partner.driveFolder || "",
              onBlur: (e) => {
                if (e.target.value !== (partner.driveFolder || "")) {
                  onDriveFolderChange(partner.id, e.target.value);
                }
              },
              onKeyDown: (e) => {
                if (e.key === "Enter") e.target.blur();
              },
              onClick: (e) => e.stopPropagation()
            }
          )
        ] }),
        partner.channelLink && !partner.youtubeChannel && !partner.popcornChannel && /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsx5(Link2, { size: 14, className: "opacity-60" }),
          /* @__PURE__ */ jsx5(
            "a",
            {
              href: partner.channelLink,
              className: "link link-primary truncate cursor-pointer",
              onClick: (e) => openExternal3(e, partner.channelLink),
              children: "Channel Link"
            }
          )
        ] })
      ] }),
      (partner.youtubeChannel || partner.popcornChannel || partner.driveFolder) && /* @__PURE__ */ jsxs5("div", { className: "flex flex-wrap gap-2 mt-2", children: [
        partner.youtubeChannel && /* @__PURE__ */ jsxs5(
          "a",
          {
            href: partner.youtubeChannel,
            className: "btn btn-sm btn-outline gap-2",
            onClick: (e) => openExternal3(e, partner.youtubeChannel),
            children: [
              /* @__PURE__ */ jsx5(Youtube3, { size: 16, className: "text-red-500" }),
              "YouTube Channel"
            ]
          }
        ),
        partner.popcornChannel && /* @__PURE__ */ jsx5(
          "a",
          {
            href: partner.popcornChannel,
            className: "btn btn-sm btn-outline gap-2",
            onClick: (e) => openExternal3(e, partner.popcornChannel),
            children: "\u{1F37F} Popcorn Channel"
          }
        ),
        partner.driveFolder && /* @__PURE__ */ jsx5(
          "a",
          {
            href: partner.driveFolder,
            className: "btn btn-sm btn-outline gap-2",
            onClick: (e) => openExternal3(e, partner.driveFolder),
            children: "\u{1F4C1} Drive Folder"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsx5("div", { className: "card bg-base-200", children: /* @__PURE__ */ jsxs5("div", { className: "card-body p-5 gap-2", children: [
      /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx5(Lightbulb3, { size: 18, className: "text-secondary" }),
        /* @__PURE__ */ jsx5("h3", { className: "font-semibold", children: "Creative Idea / Description" })
      ] }),
      /* @__PURE__ */ jsx5(
        InlineEdit2,
        {
          value: partner.useCase || "",
          placeholder: "Type a creative idea, use case, or notes...",
          onChange: (val) => onDescriptionChange(partner.id, val)
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx5("div", { className: "card bg-base-200", children: /* @__PURE__ */ jsxs5("div", { className: "card-body p-5 gap-2", children: [
      /* @__PURE__ */ jsx5("h3", { className: "font-semibold", children: "\u{1F4CB} Next Steps" }),
      /* @__PURE__ */ jsx5(
        InlineEdit2,
        {
          value: partner.nextSteps || "",
          placeholder: "Type next steps for this partner...",
          onChange: (val) => onNextStepsChange(partner.id, val)
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx5("div", { className: "card bg-base-200 border border-dashed border-base-content/20", children: /* @__PURE__ */ jsxs5("div", { className: "card-body p-5 gap-2", children: [
      /* @__PURE__ */ jsx5("h3", { className: "font-semibold", children: "\u{1F37F} Popcorn Publishing Status" }),
      partner.appUserId ? /* @__PURE__ */ jsxs5("div", { className: "text-sm text-base-content/60", children: [
        /* @__PURE__ */ jsxs5("p", { children: [
          "App User ID: ",
          /* @__PURE__ */ jsx5("span", { className: "font-mono bg-base-300 px-1.5 py-0.5 rounded", children: partner.appUserId })
        ] }),
        /* @__PURE__ */ jsx5("p", { className: "mt-1 text-base-content/40 italic", children: "API integration coming soon \u2014 provide the Popcorn Publishing API to see live status here." })
      ] }) : /* @__PURE__ */ jsx5("p", { className: "text-sm text-base-content/40 italic", children: "No App User ID set \u2014 partner hasn't been linked to Popcorn Publishing yet." })
    ] }) }),
    partner.source === "onboarding" && /* @__PURE__ */ jsx5("div", { className: "alert alert-info text-sm", children: "\u2139\uFE0F This partner is from the Onboarding table only \u2014 not yet added to the main CRM database." }),
    /* @__PURE__ */ jsxs5("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx5(MessageSquare2, { size: 18, className: "text-primary" }),
        /* @__PURE__ */ jsx5("h3", { className: "font-semibold", children: "Conversation History" }),
        /* @__PURE__ */ jsx5("span", { className: "badge badge-sm badge-primary", children: sorted.length }),
        /* @__PURE__ */ jsxs5(
          "button",
          {
            className: "btn btn-ghost btn-xs gap-1 ml-auto",
            onClick: () => setShowConvoForm(!showConvoForm),
            children: [
              /* @__PURE__ */ jsx5(Plus2, { size: 14 }),
              "Log Conversation"
            ]
          }
        )
      ] }),
      convoSuccess && /* @__PURE__ */ jsx5("div", { className: "alert alert-success text-sm py-2", children: "\u2705 Conversation logged successfully!" }),
      showConvoForm && /* @__PURE__ */ jsx5("div", { className: "card bg-base-200", children: /* @__PURE__ */ jsxs5("div", { className: "card-body p-4 gap-3", children: [
        /* @__PURE__ */ jsx5("h4", { className: "font-semibold text-sm", children: "New Conversation Entry" }),
        /* @__PURE__ */ jsxs5("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs5("div", { children: [
            /* @__PURE__ */ jsx5("label", { className: "label pb-0", children: /* @__PURE__ */ jsx5("span", { className: "label-text text-xs", children: "Title" }) }),
            /* @__PURE__ */ jsx5(
              "input",
              {
                className: "input input-bordered w-full input-sm",
                placeholder: "e.g. Onboarding kickoff call",
                value: convoTitle,
                onChange: (e) => setConvoTitle(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs5("div", { children: [
            /* @__PURE__ */ jsx5("label", { className: "label pb-0", children: /* @__PURE__ */ jsx5("span", { className: "label-text text-xs", children: "Date" }) }),
            /* @__PURE__ */ jsx5(
              "input",
              {
                type: "date",
                className: "input input-bordered w-full input-sm",
                value: convoDate,
                onChange: (e) => setConvoDate(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs5("div", { children: [
            /* @__PURE__ */ jsx5("label", { className: "label pb-0", children: /* @__PURE__ */ jsx5("span", { className: "label-text text-xs", children: "Channel" }) }),
            /* @__PURE__ */ jsxs5(
              "select",
              {
                className: "select select-bordered w-full select-sm",
                value: convoChannel,
                onChange: (e) => setConvoChannel(e.target.value),
                children: [
                  /* @__PURE__ */ jsx5("option", { value: "Call", children: "\u{1F4DE} Call" }),
                  /* @__PURE__ */ jsx5("option", { value: "Email", children: "\u{1F4E7} Email" }),
                  /* @__PURE__ */ jsx5("option", { value: "Slack", children: "\u{1F4AC} Slack" }),
                  /* @__PURE__ */ jsx5("option", { value: "In-Person", children: "\u{1F91D} In-Person" }),
                  /* @__PURE__ */ jsx5("option", { value: "Video Call", children: "\u{1F4F9} Video Call" }),
                  /* @__PURE__ */ jsx5("option", { value: "Other", children: "\u{1F4DD} Other" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs5("div", { children: [
            /* @__PURE__ */ jsx5("label", { className: "label pb-0", children: /* @__PURE__ */ jsx5("span", { className: "label-text text-xs", children: "Logged By" }) }),
            /* @__PURE__ */ jsxs5(
              "select",
              {
                className: "select select-bordered w-full select-sm",
                value: convoLoggedBy,
                onChange: (e) => setConvoLoggedBy(e.target.value),
                children: [
                  /* @__PURE__ */ jsx5("option", { value: "", children: "\u2014 Select" }),
                  /* @__PURE__ */ jsx5("option", { value: "Adi", children: "Adi" }),
                  /* @__PURE__ */ jsx5("option", { value: "Tess", children: "Tess" }),
                  /* @__PURE__ */ jsx5("option", { value: "Ben", children: "Ben" }),
                  /* @__PURE__ */ jsx5("option", { value: "Cydel", children: "Cydel" }),
                  /* @__PURE__ */ jsx5("option", { value: "Agent \u{1F916}", children: "Agent \u{1F916}" })
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs5("div", { children: [
          /* @__PURE__ */ jsx5("label", { className: "label pb-0", children: /* @__PURE__ */ jsx5("span", { className: "label-text text-xs", children: "Summary" }) }),
          /* @__PURE__ */ jsx5(
            "textarea",
            {
              className: "textarea textarea-bordered w-full text-sm",
              rows: 3,
              placeholder: "What was discussed?",
              value: convoSummary,
              onChange: (e) => setConvoSummary(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs5("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs5("div", { children: [
            /* @__PURE__ */ jsx5("label", { className: "label pb-0", children: /* @__PURE__ */ jsx5("span", { className: "label-text text-xs", children: "Key Takeaways" }) }),
            /* @__PURE__ */ jsx5(
              "textarea",
              {
                className: "textarea textarea-bordered w-full text-sm",
                rows: 2,
                placeholder: "Important points...",
                value: convoTakeaways,
                onChange: (e) => setConvoTakeaways(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs5("div", { children: [
            /* @__PURE__ */ jsx5("label", { className: "label pb-0", children: /* @__PURE__ */ jsx5("span", { className: "label-text text-xs", children: "Next Steps" }) }),
            /* @__PURE__ */ jsx5(
              "textarea",
              {
                className: "textarea textarea-bordered w-full text-sm",
                rows: 2,
                placeholder: "Action items...",
                value: convoNextSteps,
                onChange: (e) => setConvoNextSteps(e.target.value)
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs5("div", { className: "flex justify-end gap-2 mt-1", children: [
          /* @__PURE__ */ jsx5(
            "button",
            {
              className: "btn btn-ghost btn-sm",
              onClick: () => {
                resetConvoForm();
                setShowConvoForm(false);
              },
              children: "Cancel"
            }
          ),
          /* @__PURE__ */ jsx5(
            "button",
            {
              className: "btn btn-primary btn-sm",
              onClick: handleSaveConvo,
              disabled: convoSaving,
              children: convoSaving ? /* @__PURE__ */ jsx5("span", { className: "loading loading-spinner loading-xs" }) : "Save Entry"
            }
          )
        ] })
      ] }) }),
      sorted.length === 0 && !showConvoForm ? /* @__PURE__ */ jsx5("p", { className: "text-sm text-base-content/50 pl-7", children: "No conversations logged yet." }) : /* @__PURE__ */ jsx5("div", { className: "space-y-2", children: sorted.map((c) => /* @__PURE__ */ jsx5("div", { className: "card bg-base-200", children: /* @__PURE__ */ jsxs5("div", { className: "card-body p-4 gap-2", children: [
        /* @__PURE__ */ jsxs5("div", { className: "flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx5("span", { children: CHANNEL_ICONS2[c.channel] || "\u{1F4AC}" }),
            /* @__PURE__ */ jsx5("span", { className: "font-medium text-sm", children: c.title || c.channel || "Untitled" })
          ] }),
          /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2 text-xs text-base-content/50", children: [
            c.loggedBy && /* @__PURE__ */ jsxs5("span", { children: [
              "by ",
              c.loggedBy
            ] }),
            c.date && /* @__PURE__ */ jsx5("span", { children: formatDate3(c.date) })
          ] })
        ] }),
        c.summary && /* @__PURE__ */ jsx5("p", { className: "text-sm text-base-content/80", children: c.summary }),
        c.keyTakeaways && /* @__PURE__ */ jsxs5("div", { className: "text-xs mt-1", children: [
          /* @__PURE__ */ jsx5("span", { className: "font-medium text-base-content/60", children: "Key takeaways:" }),
          " ",
          /* @__PURE__ */ jsx5("span", { className: "text-base-content/70", children: c.keyTakeaways })
        ] }),
        c.nextSteps && /* @__PURE__ */ jsxs5("div", { className: "text-xs", children: [
          /* @__PURE__ */ jsx5("span", { className: "font-medium text-base-content/60", children: "Next steps:" }),
          " ",
          /* @__PURE__ */ jsx5("span", { className: "text-base-content/70", children: c.nextSteps })
        ] })
      ] }) }, c.id)) })
    ] })
  ] });
};

// components/KOLTab.tsx
import { useState as useState4, useEffect as useEffect3, useCallback, useRef as useRef3 } from "react";
import { Film, Plus as Plus3, X, GripVertical, Trash2 as Trash22 } from "lucide-react";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
async function loadKOLs() {
  const rows = await loadAllEdits();
  const byId = {};
  for (const row of rows) {
    if (!byId[row.partner_id]) byId[row.partner_id] = {};
    byId[row.partner_id][row.field] = row.value;
  }
  return Object.entries(byId).filter(([, fields]) => fields.isKOL === "true" && fields.name && fields.deleted !== "true").map(([id, fields]) => ({
    id,
    name: fields.name,
    kolTier: fields.kolTier || "Potential Outreach",
    kolStatus: fields.kolStatus || "",
    kolNotes: fields.kolNotes || "",
    kolMovieLink: fields.kolMovieLink || "",
    kolOrder: fields.kolOrder !== void 0 ? parseInt(fields.kolOrder, 10) : 9999,
    isInCRM: !id.startsWith("kol-")
  }));
}
function saveKOLField(id, field, value) {
  saveField(id, field, value).catch(console.error);
}
var STATUS_OPTIONS = ["", "Research", "Avatar Created", "Movie Created", "Reached Out", "Responded", "Demo Scheduled", "Converted"];
var STATUS_COLORS = {
  "": "",
  "Research": "badge-ghost",
  "Avatar Created": "badge-info",
  "Movie Created": "badge-primary",
  "Reached Out": "badge-warning",
  "Responded": "badge-success",
  "Demo Scheduled": "badge-accent",
  "Converted": "badge-success badge-outline"
};
var AddKOLModal = ({ onAdd, onClose }) => {
  const [name, setName] = useState4("");
  const [tier, setTier] = useState4("Initial Target");
  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), tier);
    onClose();
  };
  return /* @__PURE__ */ jsxs6("div", { className: "modal modal-open", children: [
    /* @__PURE__ */ jsxs6("div", { className: "modal-box max-w-sm", children: [
      /* @__PURE__ */ jsx6("h3", { className: "font-bold text-lg mb-4", children: "Add KOL" }),
      /* @__PURE__ */ jsxs6("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx6(
          "input",
          {
            className: "input input-bordered w-full",
            placeholder: "Name",
            value: name,
            onChange: (e) => setName(e.target.value),
            autoFocus: true,
            onKeyDown: (e) => e.key === "Enter" && handleSubmit()
          }
        ),
        /* @__PURE__ */ jsxs6(
          "select",
          {
            className: "select select-bordered w-full",
            value: tier,
            onChange: (e) => setTier(e.target.value),
            children: [
              /* @__PURE__ */ jsx6("option", { children: "Initial Target" }),
              /* @__PURE__ */ jsx6("option", { children: "Potential Outreach" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs6("div", { className: "modal-action", children: [
        /* @__PURE__ */ jsx6("button", { className: "btn btn-ghost btn-sm", onClick: onClose, children: "Cancel" }),
        /* @__PURE__ */ jsx6("button", { className: "btn btn-primary btn-sm", onClick: handleSubmit, disabled: !name.trim(), children: "Add" })
      ] })
    ] }),
    /* @__PURE__ */ jsx6("div", { className: "modal-backdrop", onClick: onClose })
  ] });
};
var KOLRow = ({ kol, isDragOver, confirmDeleteId, onStatusChange, onNotesChange, onMovieChange, onDelete, onConfirmDelete, onDragStart, onDragOver, onDrop, onDragEnd }) => {
  const [editingMovie, setEditingMovie] = useState4(false);
  const [movieDraft, setMovieDraft] = useState4(kol.kolMovieLink);
  const isConfirming = confirmDeleteId === kol.id;
  return /* @__PURE__ */ jsxs6(
    "tr",
    {
      draggable: true,
      onDragStart: (e) => {
        e.dataTransfer.setData("application/x-crm-kol", JSON.stringify({ id: kol.id, name: kol.name, type: "kol" }));
        e.dataTransfer.setData("application/x-cross-tab", JSON.stringify({ id: kol.id, name: kol.name, fromTab: "kols" }));
        onDragStart(e);
      },
      onDragOver,
      onDrop,
      onDragEnd,
      className: `hover cursor-grab active:cursor-grabbing transition-colors group ${isDragOver ? "bg-primary/10 border-t-2 border-primary" : ""}`,
      children: [
        /* @__PURE__ */ jsx6("td", { className: "w-6 px-1", children: /* @__PURE__ */ jsx6(GripVertical, { size: 14, className: "text-base-content/25 cursor-grab" }) }),
        /* @__PURE__ */ jsx6("td", { className: "min-w-[130px]", children: /* @__PURE__ */ jsx6("span", { className: "font-medium text-sm leading-snug", children: kol.name }) }),
        /* @__PURE__ */ jsxs6("td", { className: "min-w-[140px]", children: [
          /* @__PURE__ */ jsx6(
            "select",
            {
              className: "select select-xs select-bordered w-full text-xs",
              value: kol.kolStatus,
              onChange: (e) => onStatusChange(kol.id, e.target.value),
              children: STATUS_OPTIONS.map((s) => /* @__PURE__ */ jsx6("option", { value: s, children: s || "\u2014 No Status \u2014" }, s))
            }
          ),
          kol.kolStatus && /* @__PURE__ */ jsx6("div", { className: "mt-1", children: /* @__PURE__ */ jsx6("span", { className: `badge badge-xs ${STATUS_COLORS[kol.kolStatus] || "badge-ghost"}`, children: kol.kolStatus }) })
        ] }),
        /* @__PURE__ */ jsx6("td", { className: "min-w-[200px]", children: /* @__PURE__ */ jsx6(
          "input",
          {
            className: "input input-xs w-full bg-transparent focus:bg-base-200 transition-colors rounded px-2 py-1 border border-transparent focus:border-base-300",
            value: kol.kolNotes,
            onChange: (e) => onNotesChange(kol.id, e.target.value),
            onBlur: (e) => saveKOLField(kol.id, "kolNotes", e.target.value),
            placeholder: "Add notes..."
          }
        ) }),
        /* @__PURE__ */ jsx6("td", { className: "min-w-[120px]", children: kol.kolMovieLink && !editingMovie ? /* @__PURE__ */ jsxs6("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxs6(
            "a",
            {
              href: kol.kolMovieLink,
              className: "btn btn-xs btn-primary gap-1",
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  (window.top || window).open(kol.kolMovieLink, "_blank");
                } catch {
                  window.open(kol.kolMovieLink, "_blank");
                }
              },
              children: [
                /* @__PURE__ */ jsx6(Film, { size: 10 }),
                " Watch"
              ]
            }
          ),
          /* @__PURE__ */ jsx6(
            "button",
            {
              className: "btn btn-xs btn-ghost btn-square",
              onClick: () => {
                setEditingMovie(true);
                setMovieDraft(kol.kolMovieLink);
              },
              title: "Edit link",
              children: /* @__PURE__ */ jsx6(X, { size: 10 })
            }
          )
        ] }) : editingMovie ? /* @__PURE__ */ jsx6(
          "input",
          {
            className: "input input-xs input-bordered w-full",
            value: movieDraft,
            autoFocus: true,
            onChange: (e) => setMovieDraft(e.target.value),
            onBlur: () => {
              onMovieChange(kol.id, movieDraft);
              setEditingMovie(false);
            },
            onKeyDown: (e) => {
              if (e.key === "Enter") {
                onMovieChange(kol.id, movieDraft);
                setEditingMovie(false);
              }
              if (e.key === "Escape") setEditingMovie(false);
            },
            placeholder: "https://popcorn.co/..."
          }
        ) : /* @__PURE__ */ jsxs6(
          "button",
          {
            className: "btn btn-xs btn-ghost gap-1 text-base-content/40",
            onClick: () => setEditingMovie(true),
            children: [
              /* @__PURE__ */ jsx6(Plus3, { size: 10 }),
              " Add link"
            ]
          }
        ) }),
        /* @__PURE__ */ jsx6("td", { className: "w-8 px-1", children: isConfirming ? /* @__PURE__ */ jsxs6(
          "button",
          {
            className: "btn btn-xs btn-error gap-1 animate-pulse",
            onClick: () => {
              onDelete(kol.id);
              onConfirmDelete(null);
            },
            title: "Confirm remove",
            children: [
              /* @__PURE__ */ jsx6(Trash22, { size: 10 }),
              "?"
            ]
          }
        ) : /* @__PURE__ */ jsx6(
          "button",
          {
            className: "btn btn-xs btn-ghost btn-square opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:btn-error transition-opacity",
            onClick: () => onConfirmDelete(kol.id),
            title: "Remove KOL",
            children: /* @__PURE__ */ jsx6(Trash22, { size: 12 })
          }
        ) })
      ]
    }
  );
};
var KOLSection = ({ title, tier, emoji, kols, dragOverId, confirmDeleteId, onStatusChange, onNotesChange, onMovieChange, onDelete, onConfirmDelete, onDragStart, onDragOver, onDrop, onDragEnd }) => {
  if (kols.length === 0) return null;
  const endDropId = `__end__${tier}`;
  return /* @__PURE__ */ jsxs6("div", { children: [
    /* @__PURE__ */ jsxs6("h3", { className: "text-xs font-semibold text-base-content/50 uppercase tracking-widest mb-2", children: [
      emoji,
      " ",
      title,
      " ",
      /* @__PURE__ */ jsxs6("span", { className: "text-base-content/30 normal-case font-normal", children: [
        "(",
        kols.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx6("span", { className: "ml-2 text-base-content/25 normal-case font-normal text-[10px]", children: "drag to reorder or move between sections" })
    ] }),
    /* @__PURE__ */ jsx6("div", { className: "overflow-x-auto rounded-xl border border-base-200", children: /* @__PURE__ */ jsxs6("table", { className: "table table-sm w-full", children: [
      /* @__PURE__ */ jsx6("thead", { children: /* @__PURE__ */ jsxs6("tr", { className: "text-xs text-base-content/40 border-b border-base-200", children: [
        /* @__PURE__ */ jsx6("th", { className: "w-6" }),
        /* @__PURE__ */ jsx6("th", { children: "Name" }),
        /* @__PURE__ */ jsx6("th", { children: "Status" }),
        /* @__PURE__ */ jsx6("th", { children: "Notes" }),
        /* @__PURE__ */ jsx6("th", { children: "Movie" }),
        /* @__PURE__ */ jsx6("th", { className: "w-8" })
      ] }) }),
      /* @__PURE__ */ jsxs6("tbody", { children: [
        kols.map((kol) => /* @__PURE__ */ jsx6(
          KOLRow,
          {
            kol,
            isDragOver: dragOverId === kol.id,
            confirmDeleteId,
            onStatusChange,
            onNotesChange,
            onMovieChange,
            onDelete,
            onConfirmDelete,
            onDragStart: (e) => onDragStart(e, kol.id, tier),
            onDragOver: (e) => onDragOver(e, kol.id),
            onDrop: (e) => onDrop(e, kol.id, tier),
            onDragEnd
          },
          kol.id
        )),
        /* @__PURE__ */ jsx6(
          "tr",
          {
            className: `h-6 transition-colors ${dragOverId === endDropId ? "bg-primary/10 border-t-2 border-primary" : ""}`,
            onDragOver: (e) => {
              e.preventDefault();
              onDragOver(e, endDropId);
            },
            onDrop: (e) => onDrop(e, endDropId, tier),
            children: /* @__PURE__ */ jsx6("td", { colSpan: 6 })
          }
        )
      ] })
    ] }) })
  ] });
};
var KOLTab = ({ onCountChange, reloadRef }) => {
  const [kols, setKols] = useState4([]);
  const [loading, setLoading] = useState4(true);
  const [showAddModal, setShowAddModal] = useState4(false);
  const [dragOverId, setDragOverId] = useState4(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState4(null);
  const draggingIdRef = useRef3(null);
  const draggingTierRef = useRef3(null);
  useEffect3(() => {
    onCountChange?.(kols.length);
  }, [kols.length, onCountChange]);
  const reload = useCallback(() => {
    setLoading(true);
    loadKOLs().then((k) => {
      const sorted = [...k].sort((a, b) => {
        const tierOrder = (t) => t === "Initial Target" ? 0 : 1;
        if (tierOrder(a.kolTier) !== tierOrder(b.kolTier)) return tierOrder(a.kolTier) - tierOrder(b.kolTier);
        if (a.kolOrder !== b.kolOrder) return a.kolOrder - b.kolOrder;
        return a.name.localeCompare(b.name);
      });
      setKols(sorted);
      setLoading(false);
    });
  }, []);
  useEffect3(() => {
    if (reloadRef) reloadRef.current = reload;
    return () => {
      if (reloadRef) reloadRef.current = null;
    };
  }, [reloadRef, reload]);
  useEffect3(() => {
    reload();
  }, [reload]);
  const handleStatusChange = useCallback((id, value) => {
    setKols((prev) => prev.map((k) => k.id === id ? { ...k, kolStatus: value } : k));
    saveKOLField(id, "kolStatus", value);
  }, []);
  const handleNotesChange = useCallback((id, value) => {
    setKols((prev) => prev.map((k) => k.id === id ? { ...k, kolNotes: value } : k));
  }, []);
  const handleMovieChange = useCallback((id, value) => {
    setKols((prev) => prev.map((k) => k.id === id ? { ...k, kolMovieLink: value } : k));
    saveKOLField(id, "kolMovieLink", value);
  }, []);
  const handleDeleteKOL = useCallback(async (id) => {
    setKols((prev) => prev.filter((k) => k.id !== id));
    try {
      await saveField(id, "isKOL", "false");
      await saveField(id, "deleted", "true");
    } catch (err) {
      console.error("Failed to delete KOL:", err);
    }
  }, []);
  const handleDragStart = useCallback((e, kolId, tier) => {
    draggingIdRef.current = kolId;
    draggingTierRef.current = tier;
    e.dataTransfer.effectAllowed = "move";
  }, []);
  const handleDragOver = useCallback((e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(targetId);
  }, []);
  const handleDrop = useCallback((e, targetId, targetTier) => {
    e.preventDefault();
    const fromId = draggingIdRef.current;
    if (!fromId || fromId === targetId) {
      setDragOverId(null);
      draggingIdRef.current = null;
      draggingTierRef.current = null;
      return;
    }
    const isEndDrop = targetId.startsWith("__end__");
    setKols((prev) => {
      const dragged = prev.find((k) => k.id === fromId);
      if (!dragged) return prev;
      const tierChanged = dragged.kolTier !== targetTier;
      const rest = prev.filter((k) => k.id !== fromId);
      const updatedDragged = { ...dragged, kolTier: targetTier };
      const targetTierKols = rest.filter((k) => k.kolTier === targetTier);
      let insertAt;
      if (isEndDrop) {
        insertAt = targetTierKols.length;
      } else {
        const targetIdx = targetTierKols.findIndex((k) => k.id === targetId);
        insertAt = targetIdx === -1 ? targetTierKols.length : targetIdx;
      }
      const newTargetTierKols = [...targetTierKols];
      newTargetTierKols.splice(insertAt, 0, updatedDragged);
      newTargetTierKols.forEach((k, i) => {
        saveField(k.id, "kolOrder", String(i)).catch(console.error);
      });
      if (tierChanged) {
        saveKOLField(fromId, "kolTier", targetTier);
      }
      const otherKols = rest.filter((k) => k.kolTier !== targetTier);
      const combined = [...otherKols, ...newTargetTierKols.map((k, i) => ({ ...k, kolOrder: i }))];
      const tierOrder = (t) => t === "Initial Target" ? 0 : 1;
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
  const handleAddKOL = useCallback(async (name, tier) => {
    const slug = "kol-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const tierKols = kols.filter((k) => k.kolTier === tier);
    const newOrder = tierKols.length;
    await saveFields(slug, {
      name,
      isKOL: "true",
      kolTier: tier,
      kolOrder: String(newOrder),
      stage: "\u{1F7E1} Prospect"
    });
    const newKOL = { id: slug, name, kolTier: tier, kolStatus: "", kolNotes: "", kolMovieLink: "", kolOrder: newOrder, isInCRM: false };
    setKols((prev) => {
      const tierOrder = (t) => t === "Initial Target" ? 0 : 1;
      return [...prev, newKOL].sort((a, b) => {
        if (tierOrder(a.kolTier) !== tierOrder(b.kolTier)) return tierOrder(a.kolTier) - tierOrder(b.kolTier);
        return a.kolOrder - b.kolOrder;
      });
    });
  }, [kols]);
  if (loading) {
    return /* @__PURE__ */ jsx6("div", { className: "flex justify-center py-12", children: /* @__PURE__ */ jsx6("span", { className: "loading loading-spinner text-primary" }) });
  }
  const initialTargets = kols.filter((k) => k.kolTier === "Initial Target");
  const potentialOutreach = kols.filter((k) => k.kolTier === "Potential Outreach");
  const converted = kols.filter((k) => k.kolStatus === "Converted");
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
    onDragEnd: handleDragEnd
  };
  return /* @__PURE__ */ jsxs6("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs6("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx6("div", { children: /* @__PURE__ */ jsxs6("p", { className: "text-xs text-base-content/50", children: [
        kols.length,
        " KOLs \xB7 ",
        initialTargets.length,
        " initial targets \xB7 ",
        potentialOutreach.length,
        " potential outreach",
        converted.length > 0 && ` \xB7 ${converted.length} converted \u{1F389}`
      ] }) }),
      /* @__PURE__ */ jsxs6("button", { className: "btn btn-primary btn-sm gap-1", onClick: () => setShowAddModal(true), children: [
        /* @__PURE__ */ jsx6(Plus3, { size: 14 }),
        " Add KOL"
      ] })
    ] }),
    /* @__PURE__ */ jsx6(
      KOLSection,
      {
        title: "Initial Target",
        tier: "Initial Target",
        emoji: "\u{1F3AF}",
        kols: initialTargets,
        ...sharedSectionProps
      }
    ),
    /* @__PURE__ */ jsx6(
      KOLSection,
      {
        title: "Potential Outreach",
        tier: "Potential Outreach",
        emoji: "\u{1F4E1}",
        kols: potentialOutreach,
        ...sharedSectionProps
      }
    ),
    showAddModal && /* @__PURE__ */ jsx6(AddKOLModal, { onAdd: handleAddKOL, onClose: () => setShowAddModal(false) })
  ] });
};

// app.tsx
import { Fragment, jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
var PASS_HASH = "130f70ae5b44ed4c645aad5cf7cf18ad2413c48e754dbfdec86cc781a26a5624";
var AUTH_KEY = "crm_auth";
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
var PasswordGate = ({ children, onLockRef }) => {
  const [authed, setAuthed] = useState5(() => localStorage.getItem(AUTH_KEY) === "true");
  const [input, setInput] = useState5("");
  const [error, setError] = useState5(false);
  const [checking, setChecking] = useState5(false);
  onLockRef.current = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setInput("");
  };
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setChecking(true);
    setError(false);
    const h = await hashPassword(input);
    if (h === PASS_HASH) {
      localStorage.setItem(AUTH_KEY, "true");
      setAuthed(true);
    } else {
      setError(true);
    }
    setChecking(false);
  };
  if (authed) return /* @__PURE__ */ jsx7(Fragment, { children });
  return /* @__PURE__ */ jsx7("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-base-200 to-base-300 p-4", children: /* @__PURE__ */ jsx7("div", { className: "card bg-base-100 shadow-2xl w-full max-w-sm", children: /* @__PURE__ */ jsxs7("div", { className: "card-body items-center text-center gap-4", children: [
    /* @__PURE__ */ jsx7("div", { className: "w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center", children: /* @__PURE__ */ jsx7(Lock, { className: "w-8 h-8 text-primary" }) }),
    /* @__PURE__ */ jsx7("h2", { className: "card-title text-2xl", children: "\u{1F37F} Popcorn CRM" }),
    /* @__PURE__ */ jsx7("p", { className: "text-base-content/60 text-sm", children: "Enter password to continue" }),
    /* @__PURE__ */ jsxs7("form", { onSubmit: handleSubmit, className: "w-full space-y-3", children: [
      /* @__PURE__ */ jsx7(
        "input",
        {
          type: "password",
          placeholder: "Password",
          className: `input input-bordered w-full ${error ? "input-error" : ""}`,
          value: input,
          onChange: (e) => {
            setInput(e.target.value);
            setError(false);
          },
          autoFocus: true
        }
      ),
      error && /* @__PURE__ */ jsx7("p", { className: "text-error text-xs", children: "Incorrect password" }),
      /* @__PURE__ */ jsx7("button", { type: "submit", className: "btn btn-primary w-full", disabled: checking || !input, children: checking ? /* @__PURE__ */ jsx7("span", { className: "loading loading-spinner loading-sm" }) : "Unlock" })
    ] })
  ] }) }) });
};
async function loadEdits() {
  const rows = await loadAllEdits();
  const edits = {};
  for (const row of rows) {
    const pid = row.partner_id;
    const field = row.field;
    const value = row.value;
    if (!edits[pid]) edits[pid] = {};
    edits[pid][field] = value;
  }
  return edits;
}
function applyEdits(partners, edits) {
  const dbPartnerNames = {};
  for (const [pid, fields] of Object.entries(edits)) {
    if (!pid.startsWith("onb-") && !pid.startsWith("kol-") && fields.name) {
      dbPartnerNames[pid] = fields.name;
    }
  }
  const normalizeN = (n) => n.replace(/\(.*?\)/g, "").replace(/[^\w\s]/g, "").trim().toLowerCase();
  const result = [];
  const seenIds = /* @__PURE__ */ new Set();
  for (const p of partners) {
    if (edits[p.id]?.isKOL === "true") continue;
    if (edits[p.id]?.deleted === "true") continue;
    if (p.id.startsWith("onb-")) {
      const normP = normalizeN(p.name);
      const matchingCrmId = Object.entries(dbPartnerNames).find(([, name]) => {
        const normDb = normalizeN(name);
        return normDb === normP || normDb.includes(normP) || normP.includes(normDb);
      });
      if (matchingCrmId) {
        if (seenIds.has(matchingCrmId[0])) continue;
        seenIds.add(matchingCrmId[0]);
        const stub = {
          ...p,
          id: matchingCrmId[0],
          name: matchingCrmId[1],
          source: "crm",
          detailsLoaded: false
        };
        const e2 = edits[matchingCrmId[0]];
        if (e2) {
          if (e2.onboardingStage !== void 0) stub.onboardingStage = e2.onboardingStage;
          if (e2.accountManager !== void 0) stub.accountManager = e2.accountManager;
          if (e2.useCase !== void 0) stub.useCase = e2.useCase;
          if (e2.nextSteps !== void 0) stub.nextSteps = e2.nextSteps;
          if (e2.driveFolder !== void 0) stub.driveFolder = e2.driveFolder;
          if (e2.nextFollowUp !== void 0) stub.nextFollowUp = e2.nextFollowUp;
          if (e2.lastConversation !== void 0) stub.lastConversation = e2.lastConversation;
          if (e2.channelLink !== void 0) stub.channelLink = e2.channelLink;
          if (e2.email !== void 0) stub.email = e2.email;
          if (e2.company !== void 0) stub.company = e2.company;
          if (e2.appUserId !== void 0) stub.appUserId = e2.appUserId;
          if (e2.priority !== void 0) stub.priority = e2.priority;
        }
        result.push(stub);
        continue;
      }
    }
    if (seenIds.has(p.id)) continue;
    seenIds.add(p.id);
    const e = edits[p.id];
    if (!e) {
      result.push(p);
      continue;
    }
    const updated = { ...p };
    if (e.onboardingStage !== void 0) updated.onboardingStage = e.onboardingStage;
    if (e.accountManager !== void 0) updated.accountManager = e.accountManager;
    if (e.useCase !== void 0) updated.useCase = e.useCase;
    if (e.nextSteps !== void 0) updated.nextSteps = e.nextSteps;
    if (e.driveFolder !== void 0) updated.driveFolder = e.driveFolder;
    if (e.nextFollowUp !== void 0) updated.nextFollowUp = e.nextFollowUp;
    if (e.lastConversation !== void 0) updated.lastConversation = e.lastConversation;
    if (e.channelLink !== void 0 && !updated.channelLink) updated.channelLink = e.channelLink;
    if (e.email !== void 0 && !updated.email) updated.email = e.email;
    if (e.company !== void 0 && !updated.company) updated.company = e.company;
    if (e.appUserId !== void 0 && !updated.appUserId) updated.appUserId = e.appUserId;
    if (e.priority !== void 0) updated.priority = e.priority;
    result.push(updated);
  }
  for (const [pid, name] of Object.entries(dbPartnerNames)) {
    if (!seenIds.has(pid)) {
      if (edits[pid]?.isKOL === "true") continue;
      if (edits[pid]?.deleted === "true") continue;
      seenIds.add(pid);
      const e = edits[pid] || {};
      result.push({
        id: pid,
        url: pid.startsWith("manual-") ? "" : `https://www.notion.so/${pid.replace(/-/g, "")}`,
        name,
        email: e.email || "",
        company: e.company || "",
        onboardingStage: e.onboardingStage || "\u{1F7E1} Prospect",
        priority: e.priority || "Standard",
        accountManager: e.accountManager || "",
        appUserId: e.appUserId || "",
        channelLink: e.channelLink || "",
        channelStatus: "",
        youtubeChannel: e.youtubeChannel || "",
        popcornChannel: e.popcornChannel || "",
        driveFolder: e.driveFolder || "",
        useCase: e.useCase || "",
        nextSteps: e.nextSteps || "",
        lastConversation: e.lastConversation || "",
        nextFollowUp: e.nextFollowUp || "",
        source: "crm",
        detailsLoaded: true
        // manual partners have all data from DB
      });
    }
  }
  return result;
}
function saveEdit(partnerId, field, value) {
  saveField(partnerId, field, value).catch((err) => console.error("Failed to save edit:", err));
}
var AddPartnerModal = ({ onAdd, onClose }) => {
  const [name, setName] = useState5("");
  const [email, setEmail] = useState5("");
  const [company, setCompany] = useState5("");
  const [stage, setStage] = useState5("\u{1F7E1} Prospect");
  const [manager, setManager] = useState5("");
  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), email: email.trim(), company: company.trim(), stage, manager });
    onClose();
  };
  return /* @__PURE__ */ jsxs7("div", { className: "modal modal-open", children: [
    /* @__PURE__ */ jsxs7("div", { className: "modal-box max-w-sm", children: [
      /* @__PURE__ */ jsx7("h3", { className: "font-bold text-lg mb-4", children: "Add Client" }),
      /* @__PURE__ */ jsxs7("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx7("label", { className: "label pb-0", children: /* @__PURE__ */ jsx7("span", { className: "label-text text-xs", children: "Name *" }) }),
        /* @__PURE__ */ jsx7(
          "input",
          {
            className: "input input-bordered w-full",
            placeholder: "Full name",
            value: name,
            onChange: (e) => setName(e.target.value),
            autoFocus: true,
            onKeyDown: (e) => e.key === "Enter" && handleSubmit()
          }
        ),
        /* @__PURE__ */ jsx7("label", { className: "label pb-0", children: /* @__PURE__ */ jsx7("span", { className: "label-text text-xs", children: "Email" }) }),
        /* @__PURE__ */ jsx7(
          "input",
          {
            className: "input input-bordered w-full",
            placeholder: "email@example.com",
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value)
          }
        ),
        /* @__PURE__ */ jsx7("label", { className: "label pb-0", children: /* @__PURE__ */ jsx7("span", { className: "label-text text-xs", children: "Company" }) }),
        /* @__PURE__ */ jsx7(
          "input",
          {
            className: "input input-bordered w-full",
            placeholder: "Company name",
            value: company,
            onChange: (e) => setCompany(e.target.value)
          }
        ),
        /* @__PURE__ */ jsxs7("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxs7("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsx7("label", { className: "label pb-0", children: /* @__PURE__ */ jsx7("span", { className: "label-text text-xs", children: "Stage" }) }),
            /* @__PURE__ */ jsx7("select", { className: "select select-bordered w-full select-sm", value: stage, onChange: (e) => setStage(e.target.value), children: ["\u2705 Signed", "\u{1F535} Active Onboarding", "\u{1F7E2} Ongoing Management", "\u{1F7E1} Prospect", "\u{1F4AA} Self Sufficient", "\u{1F534} Churned", "\u{1F4E6} Archived"].map((s) => /* @__PURE__ */ jsx7("option", { value: s, children: s }, s)) })
          ] }),
          /* @__PURE__ */ jsxs7("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsx7("label", { className: "label pb-0", children: /* @__PURE__ */ jsx7("span", { className: "label-text text-xs", children: "Manager" }) }),
            /* @__PURE__ */ jsxs7("select", { className: "select select-bordered w-full select-sm", value: manager, onChange: (e) => setManager(e.target.value), children: [
              /* @__PURE__ */ jsx7("option", { value: "", children: "\u2014 Unassigned" }),
              ["Tess", "Ben", "Maria", "Cydel", "Adi"].map((m) => /* @__PURE__ */ jsx7("option", { value: m, children: m }, m))
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs7("div", { className: "modal-action", children: [
        /* @__PURE__ */ jsx7("button", { className: "btn btn-ghost btn-sm", onClick: onClose, children: "Cancel" }),
        /* @__PURE__ */ jsx7("button", { className: "btn btn-primary btn-sm", onClick: handleSubmit, disabled: !name.trim(), children: "Add Client" })
      ] })
    ] }),
    /* @__PURE__ */ jsx7("div", { className: "modal-backdrop", onClick: onClose })
  ] });
};
var App = ({ onLock }) => {
  const [activeTab, setActiveTab] = useState5("partners");
  const [partners, setPartners] = useState5([]);
  const [loading, setLoading] = useState5(true);
  const [refreshing, setRefreshing] = useState5(false);
  const [error, setError] = useState5(null);
  const [selectedPartner, setSelectedPartner] = useState5(null);
  const [partnerConversations, setPartnerConversations] = useState5([]);
  const [loadingDetail, setLoadingDetail] = useState5(false);
  const [filters, setFilters] = useState5({
    stage: "All",
    priority: "All",
    accountManager: "All",
    search: ""
  });
  const [showArchived, setShowArchived] = useState5(false);
  const [showAddModal, setShowAddModal] = useState5(false);
  const [kolCount, setKolCount] = useState5(0);
  const [dragOverTab, setDragOverTab] = useState5(null);
  const kolReloadRef = useRef4(null);
  const [expandedPartnerId, setExpandedPartnerId] = useState5(null);
  const [expandedConversations, setExpandedConversations] = useState5([]);
  const [loadingExpandConversations, setLoadingExpandConversations] = useState5(false);
  const editsRef = useRef4({});
  const loadingRef = useRef4(false);
  const loadData = useCallback2(async (isRefresh = false) => {
    if (loadingRef.current && !isRefresh) return;
    loadingRef.current = true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [partnerList, onb, edits] = await Promise.all([
        fetchPartnerList(),
        fetchOnboardingTable(),
        loadEdits()
      ]);
      editsRef.current = edits;
      const kCount = Object.entries(edits).filter(
        ([, f]) => f.isKOL === "true" && f.name && f.deleted !== "true"
      ).length;
      setKolCount(kCount);
      const merged = mergeOnboardingData(partnerList, onb);
      const withEdits = applyEdits(merged, edits);
      setPartners(withEdits);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      console.error("Failed to load CRM data:", err);
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect4(() => {
    loadData();
  }, [loadData]);
  const handleSelectPartner = useCallback2(async (partner) => {
    setSelectedPartner(partner);
    setPartnerConversations([]);
    fetchConversationsForPartner(partner.id).then(setPartnerConversations).catch((err) => console.error("Failed to load conversations:", err));
    if (partner.detailsLoaded || partner.id.startsWith("onb-") || partner.id.startsWith("manual-")) {
      return;
    }
    setLoadingDetail(true);
    try {
      const [details, convos] = await Promise.all([
        fetchPartnerDetail(partner.id),
        fetchConversationsForPartner(partner.id)
      ]);
      if (details) {
        const merged = {
          ...details,
          channelStatus: details.channelStatus || partner.channelStatus,
          // kept for data compat
          youtubeChannel: details.youtubeChannel || partner.youtubeChannel,
          popcornChannel: details.popcornChannel || partner.popcornChannel,
          appUserId: details.appUserId || partner.appUserId,
          accountManager: details.accountManager || partner.accountManager,
          source: partner.source === "both" ? "both" : details.source,
          detailsLoaded: true
        };
        const e = editsRef.current[partner.id];
        if (e) {
          if (e.onboardingStage !== void 0) merged.onboardingStage = e.onboardingStage;
          if (e.accountManager !== void 0) merged.accountManager = e.accountManager;
          if (e.useCase !== void 0) merged.useCase = e.useCase;
          if (e.nextSteps !== void 0) merged.nextSteps = e.nextSteps;
          if (e.driveFolder !== void 0) merged.driveFolder = e.driveFolder;
          if (e.nextFollowUp !== void 0) merged.nextFollowUp = e.nextFollowUp;
          if (e.lastConversation !== void 0) merged.lastConversation = e.lastConversation;
        }
        setSelectedPartner(merged);
        setPartners((prev) => prev.map((p) => p.id === partner.id ? merged : p));
      }
      setPartnerConversations(convos);
    } catch (err) {
      console.error("Failed to load partner details:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);
  const { activeFiltered, archivedFiltered } = useMemo2(() => {
    const applyFilters = (p) => {
      if (p.detailsLoaded) {
        if (filters.stage !== "All" && p.onboardingStage !== filters.stage) return false;
        if (filters.priority !== "All" && p.priority !== filters.priority) return false;
      }
      if (filters.accountManager !== "All" && p.accountManager !== filters.accountManager) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchable = [p.name, p.company, p.email, p.useCase, p.nextSteps].join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    };
    const sortFn = (a, b) => {
      const orderA = STAGE_SORT_ORDER[a.onboardingStage] ?? 99;
      const orderB = STAGE_SORT_ORDER[b.onboardingStage] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      if (a.priority === "\u2B50 VIP" && b.priority !== "\u2B50 VIP") return -1;
      if (b.priority === "\u2B50 VIP" && a.priority !== "\u2B50 VIP") return 1;
      return a.name.localeCompare(b.name);
    };
    const all = partners.filter(applyFilters);
    const active = all.filter((p) => p.onboardingStage !== "\u{1F4E6} Archived").sort(sortFn);
    const archived = all.filter((p) => p.onboardingStage === "\u{1F4E6} Archived").sort(sortFn);
    return { activeFiltered: active, archivedFiltered: archived };
  }, [partners, filters]);
  const handleFieldChange = useCallback2((partnerId, field, value) => {
    setPartners(
      (prev) => prev.map((p) => p.id === partnerId ? { ...p, [field]: value } : p)
    );
    setSelectedPartner(
      (prev) => prev && prev.id === partnerId ? { ...prev, [field]: value } : prev
    );
    if (!editsRef.current[partnerId]) editsRef.current[partnerId] = {};
    editsRef.current[partnerId][field] = value;
    saveEdit(partnerId, field, value);
  }, []);
  const handleStageChange = useCallback2((id, v) => handleFieldChange(id, "onboardingStage", v), [handleFieldChange]);
  const handleManagerChange = useCallback2((id, v) => handleFieldChange(id, "accountManager", v), [handleFieldChange]);
  const handleDescriptionChange = useCallback2((id, v) => handleFieldChange(id, "useCase", v), [handleFieldChange]);
  const handleNextStepsChange = useCallback2((id, v) => handleFieldChange(id, "nextSteps", v), [handleFieldChange]);
  const handleDriveFolderChange = useCallback2((id, v) => handleFieldChange(id, "driveFolder", v), [handleFieldChange]);
  const handleFollowUpChange = useCallback2((id, v) => handleFieldChange(id, "nextFollowUp", v), [handleFieldChange]);
  const handleExpandPartner = useCallback2(async (partner) => {
    if (!partner) {
      setExpandedPartnerId(null);
      setExpandedConversations([]);
      return;
    }
    setExpandedPartnerId(partner.id);
    setExpandedConversations([]);
    setLoadingExpandConversations(true);
    try {
      const convos = await fetchConversationsForPartner(partner.id);
      setExpandedConversations(convos);
    } catch (err) {
      console.error("Failed to load conversations for expansion:", err);
    } finally {
      setLoadingExpandConversations(false);
    }
  }, []);
  const handleAddConversation = useCallback2(async (partnerId, entry) => {
    try {
      await saveConversation(partnerId, entry);
      const convos = await fetchConversationsForPartner(partnerId);
      setPartnerConversations(convos);
      if (expandedPartnerId === partnerId) {
        setExpandedConversations(convos);
      }
      if (convos.length > 0) {
        const sorted = [...convos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (sorted[0].date) {
          handleFieldChange(partnerId, "lastConversation", sorted[0].date);
        }
      }
    } catch (err) {
      console.error("Failed to save conversation:", err);
    }
  }, [handleFieldChange, expandedPartnerId]);
  const handleDropOnTab = useCallback2(async (targetTab, e) => {
    e.preventDefault();
    setDragOverTab(null);
    const raw = e.dataTransfer.getData("application/x-cross-tab");
    if (!raw) return;
    try {
      const { id, name, fromTab } = JSON.parse(raw);
      if (fromTab === targetTab) return;
      if (targetTab === "kols") {
        await saveField(id, "isKOL", "true");
        if (!editsRef.current[id]) editsRef.current[id] = {};
        editsRef.current[id].isKOL = "true";
        setPartners((prev) => prev.filter((p) => p.id !== id));
        kolReloadRef.current?.();
        setKolCount((prev) => prev + 1);
        setActiveTab("kols");
      } else {
        await saveField(id, "isKOL", "false");
        if (!editsRef.current[id]) editsRef.current[id] = {};
        editsRef.current[id].isKOL = "false";
        setKolCount((prev) => Math.max(0, prev - 1));
        await loadData(true);
        setActiveTab("partners");
      }
    } catch (err) {
      console.error("Cross-tab drop failed:", err);
    }
  }, [loadData]);
  const handleDeletePartner = useCallback2(async (id) => {
    setPartners((prev) => prev.filter((p) => p.id !== id));
    setSelectedPartner((prev) => prev?.id === id ? null : prev);
    setExpandedPartnerId((prev) => prev === id ? null : prev);
    try {
      await deletePartner(id);
    } catch (err) {
      console.error("Failed to delete partner:", err);
    }
  }, []);
  const handleAddPartner = useCallback2(async (data) => {
    const slug = "manual-" + data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const id = `${slug}-${Date.now().toString(36)}`;
    const fields = {
      name: data.name,
      onboardingStage: data.stage || "\u{1F7E1} Prospect"
    };
    if (data.email) fields.email = data.email;
    if (data.company) fields.company = data.company;
    if (data.manager) fields.accountManager = data.manager;
    try {
      await saveFields(id, fields);
    } catch (err) {
      console.error("Failed to add partner:", err);
    }
    const newPartner = {
      id,
      url: "",
      name: data.name,
      email: data.email,
      company: data.company,
      onboardingStage: data.stage || "\u{1F7E1} Prospect",
      priority: "Standard",
      accountManager: data.manager,
      appUserId: "",
      channelLink: "",
      channelStatus: "",
      youtubeChannel: "",
      popcornChannel: "",
      driveFolder: "",
      useCase: "",
      nextSteps: "",
      lastConversation: "",
      nextFollowUp: "",
      source: "manual",
      detailsLoaded: true
    };
    if (!editsRef.current[id]) editsRef.current[id] = {};
    Object.entries(fields).forEach(([k, v]) => {
      editsRef.current[id][k] = v;
    });
    setPartners((prev) => [...prev, newPartner]);
  }, []);
  if (loading) {
    return /* @__PURE__ */ jsxs7("div", { className: "flex flex-col items-center justify-center min-h-[60vh] gap-3", children: [
      /* @__PURE__ */ jsx7("span", { className: "loading loading-spinner loading-lg text-primary" }),
      /* @__PURE__ */ jsx7("p", { className: "text-sm text-base-content/60", children: "Loading partners from Notion..." })
    ] });
  }
  if (error) {
    return /* @__PURE__ */ jsxs7("div", { className: "flex flex-col items-center justify-center min-h-[60vh] gap-3", children: [
      /* @__PURE__ */ jsx7("div", { className: "alert alert-error max-w-md", children: /* @__PURE__ */ jsx7("span", { children: error }) }),
      /* @__PURE__ */ jsx7("button", { className: "btn btn-primary btn-sm", onClick: () => loadData(), children: "Retry" })
    ] });
  }
  return /* @__PURE__ */ jsx7("div", { className: "p-4 max-w-4xl mx-auto space-y-4", children: selectedPartner ? /* @__PURE__ */ jsx7(
    PartnerDetail,
    {
      partner: selectedPartner,
      conversations: partnerConversations,
      loadingDetail,
      onBack: () => {
        setSelectedPartner(null);
        setPartnerConversations([]);
      },
      onStageChange: handleStageChange,
      onManagerChange: handleManagerChange,
      onDescriptionChange: handleDescriptionChange,
      onNextStepsChange: handleNextStepsChange,
      onDriveFolderChange: handleDriveFolderChange,
      onFollowUpChange: handleFollowUpChange,
      onAddConversation: handleAddConversation
    }
  ) : /* @__PURE__ */ jsxs7(Fragment, { children: [
    /* @__PURE__ */ jsxs7("div", { className: "flex gap-3 mb-1 relative", children: [
      onLock && /* @__PURE__ */ jsx7(
        "button",
        {
          className: "btn btn-ghost btn-sm btn-circle absolute -top-1 right-0 opacity-40 hover:opacity-100 tooltip tooltip-left z-10",
          "data-tip": "Lock CRM",
          onClick: onLock,
          children: /* @__PURE__ */ jsx7(LogOut, { className: "w-4 h-4" })
        }
      ),
      /* @__PURE__ */ jsxs7(
        "button",
        {
          className: `btn btn-lg gap-3 flex-1 text-lg font-bold transition-all ${activeTab === "partners" ? "btn-primary shadow-lg" : "btn-ghost bg-base-200 hover:bg-base-300"} ${dragOverTab === "partners" ? "ring-4 ring-primary ring-offset-2 scale-105" : ""}`,
          onClick: () => setActiveTab("partners"),
          onDragOver: (e) => {
            e.preventDefault();
            setDragOverTab("partners");
          },
          onDragLeave: () => setDragOverTab(null),
          onDrop: (e) => handleDropOnTab("partners", e),
          children: [
            "\u{1F91D} Potential Clients",
            /* @__PURE__ */ jsx7("span", { className: `badge badge-lg ${activeTab === "partners" ? "badge-primary-content bg-white/20" : "badge-ghost"}`, children: partners.filter((p) => p.onboardingStage !== "\u{1F4E6} Archived").length })
          ]
        }
      ),
      /* @__PURE__ */ jsxs7(
        "button",
        {
          className: `btn btn-lg gap-3 flex-1 text-lg font-bold transition-all ${activeTab === "kols" ? "btn-primary shadow-lg" : "btn-ghost bg-base-200 hover:bg-base-300"} ${dragOverTab === "kols" ? "ring-4 ring-primary ring-offset-2 scale-105" : ""}`,
          onClick: () => setActiveTab("kols"),
          onDragOver: (e) => {
            e.preventDefault();
            setDragOverTab("kols");
          },
          onDragLeave: () => setDragOverTab(null),
          onDrop: (e) => handleDropOnTab("kols", e),
          children: [
            "\u{1F3AF} KOLs",
            /* @__PURE__ */ jsx7("span", { className: `badge badge-lg ${activeTab === "kols" ? "badge-primary-content bg-white/20" : "badge-ghost"}`, children: kolCount })
          ]
        }
      )
    ] }),
    activeTab === "partners" && /* @__PURE__ */ jsxs7(Fragment, { children: [
      /* @__PURE__ */ jsx7(StatsBar, { partners }),
      /* @__PURE__ */ jsxs7("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsx7(FilterBar, { filters, onFiltersChange: setFilters }),
        /* @__PURE__ */ jsxs7("div", { className: "flex items-center gap-1 shrink-0", children: [
          /* @__PURE__ */ jsx7(
            "button",
            {
              className: "btn btn-primary btn-sm gap-1",
              onClick: () => setShowAddModal(true),
              children: "+ Add Client"
            }
          ),
          /* @__PURE__ */ jsx7(
            "button",
            {
              className: `btn btn-ghost btn-sm btn-square ${refreshing ? "animate-spin" : ""}`,
              onClick: () => loadData(true),
              disabled: refreshing,
              title: "Refresh from Notion",
              children: /* @__PURE__ */ jsx7(RefreshCw, { size: 16 })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs7("p", { className: "text-xs text-base-content/50", children: [
        "Showing ",
        activeFiltered.length,
        " active client",
        activeFiltered.length !== 1 ? "s" : "",
        archivedFiltered.length > 0 && ` \xB7 ${archivedFiltered.length} archived`
      ] }),
      /* @__PURE__ */ jsx7(
        PartnerList,
        {
          partners: activeFiltered,
          onSelect: handleSelectPartner,
          selectedId: selectedPartner?.id ?? null,
          onStageChange: handleStageChange,
          onManagerChange: handleManagerChange,
          onDelete: handleDeletePartner,
          expandedId: expandedPartnerId,
          onExpand: handleExpandPartner,
          expandedConversations,
          loadingExpandConversations,
          onDescriptionChange: handleDescriptionChange,
          onNextStepsChange: handleNextStepsChange,
          onDriveFolderChange: handleDriveFolderChange,
          onFollowUpChange: handleFollowUpChange,
          onAddConversation: handleAddConversation
        }
      ),
      archivedFiltered.length > 0 && /* @__PURE__ */ jsxs7("div", { className: "mt-2", children: [
        /* @__PURE__ */ jsxs7(
          "button",
          {
            className: `btn btn-sm gap-2 ${showArchived ? "btn-neutral" : "btn-ghost"}`,
            onClick: () => setShowArchived(!showArchived),
            children: [
              /* @__PURE__ */ jsx7("span", { className: "text-base", children: "\u{1F4E6}" }),
              showArchived ? "Hide" : "Show",
              " Archived (",
              archivedFiltered.length,
              ")"
            ]
          }
        ),
        showArchived && /* @__PURE__ */ jsx7("div", { className: "mt-2 opacity-75", children: /* @__PURE__ */ jsx7(
          PartnerList,
          {
            partners: archivedFiltered,
            onSelect: handleSelectPartner,
            selectedId: selectedPartner?.id ?? null,
            onStageChange: handleStageChange,
            onManagerChange: handleManagerChange,
            onDelete: handleDeletePartner,
            expandedId: expandedPartnerId,
            onExpand: handleExpandPartner,
            expandedConversations,
            loadingExpandConversations,
            onDescriptionChange: handleDescriptionChange,
            onNextStepsChange: handleNextStepsChange,
            onDriveFolderChange: handleDriveFolderChange,
            onFollowUpChange: handleFollowUpChange,
            onAddConversation: handleAddConversation
          }
        ) })
      ] })
    ] }),
    activeTab === "kols" && /* @__PURE__ */ jsx7(KOLTab, { onCountChange: setKolCount, reloadRef: kolReloadRef }),
    showAddModal && /* @__PURE__ */ jsx7(
      AddPartnerModal,
      {
        onAdd: handleAddPartner,
        onClose: () => setShowAddModal(false)
      }
    )
  ] }) });
};
var Root = () => {
  const lockRef = useRef4(null);
  return /* @__PURE__ */ jsx7(PasswordGate, { onLockRef: lockRef, children: /* @__PURE__ */ jsx7(App, { onLock: () => lockRef.current?.() }) });
};
createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsx7(Root, {}));
