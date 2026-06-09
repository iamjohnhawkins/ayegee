// ─── Application status badge ─────────────────────────────────────────────────
const STATUS_STYLES = {
  INVEST:     'bg-emerald-100 text-emerald-700',
  MAINTAIN:   'bg-amber-100 text-amber-700',
  DISINVEST:  'bg-rose-100 text-rose-700',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

// ─── Source type badge (ADC / Baseline CTB / CTB Project) ─────────────────────
const SOURCE_STYLES = {
  adc:          'bg-blue-100 text-blue-700',
  baseline_ctb: 'bg-emerald-100 text-emerald-700',
  ctb_project:  'bg-violet-100 text-violet-700',
};
const SOURCE_LABELS = {
  adc:          'ADC',
  baseline_ctb: 'Baseline CTB',
  ctb_project:  'CTB Project',
};

export function SourceBadge({ type }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${SOURCE_STYLES[type] ?? 'bg-slate-100 text-slate-600'}`}>
      {SOURCE_LABELS[type] ?? type}
    </span>
  );
}

// ─── Target type badge (application / group / portfolio) ──────────────────────
const TARGET_STYLES = {
  application: 'bg-sky-100 text-sky-700',
  group:       'bg-orange-100 text-orange-700',
  portfolio:   'bg-purple-100 text-purple-700',
};

export function TargetBadge({ type }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${TARGET_STYLES[type] ?? 'bg-slate-100 text-slate-600'}`}>
      {type}
    </span>
  );
}

// ─── FTE title badge ──────────────────────────────────────────────────────────
const TITLE_STYLES = {
  MD:        'bg-purple-100 text-purple-700',
  D:         'bg-indigo-100 text-indigo-700',
  VP:        'bg-blue-100 text-blue-700',
  AVP:       'bg-sky-100 text-sky-700',
  Associate: 'bg-slate-100 text-slate-600',
};

export function TitleBadge({ title }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TITLE_STYLES[title] ?? 'bg-slate-100 text-slate-600'}`}>
      {title}
    </span>
  );
}
