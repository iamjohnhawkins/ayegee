// ─── Month constants ──────────────────────────────────────────────────────────
export const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Number formatting ────────────────────────────────────────────────────────
/** Format an allocation value: 0 → "—", 1.0 → "1", 1.5 → "1.5" */
export function fmtNum(v) {
  const n = Number(v) || 0;
  if (n === 0) return '—';
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

// ─── HTML escape (for any dangerouslySetInnerHTML uses) ───────────────────────
export function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Month totals ─────────────────────────────────────────────────────────────
/** Sum all 12 month values for a single allocation row */
export function rowTotal(row) {
  return MONTHS.reduce((s, m) => s + (Number(row[m]) || 0), 0);
}

// ─── Net CTB totals for one FTE ───────────────────────────────────────────────
// Applies the group-scope baseline CTB offset formula:
//   - App-level baseline offsets only exact-app projects
//   - Group-level baseline offsets group-level projects AND app-level projects
//     whose app belongs to that group (pooled together)
//   - Projects with no applicable baseline are counted at full cost
//   - Portfolio-level projects: no baseline offset, always full cost
//
// Source of truth: fte-allocation.html netCtbTotals() (verified June 2026)
//
export function computeNetMonths(fteId, allAdc, allCtb, allProj) {
  const id = Number(fteId);
  const adcRows  = allAdc.filter(r => Number(r.fte_id) === id);
  const ctbRows  = allCtb.filter(r => Number(r.fte_id) === id);
  const projRows = allProj.filter(r => Number(r.fte_id) === id);

  // ADC total per month
  const adcT = {};
  MONTHS.forEach(m => { adcT[m] = adcRows.reduce((s, r) => s + (Number(r[m]) || 0), 0); });

  // Baseline CTB pools by key ('app:{id}' | 'grp:{id}')
  const baseByKey = {};
  ctbRows.forEach(a => {
    const key = a.application_id ? `app:${a.application_id}` : `grp:${a.application_group_id}`;
    if (!baseByKey[key]) baseByKey[key] = {};
    MONTHS.forEach(m => { baseByKey[key][m] = (baseByKey[key][m] || 0) + (Number(a[m]) || 0); });
  });

  // CTB project pools — app-level projects are added to their exact key AND
  // to their parent group's key so a group baseline can offset them.
  const projByKey = {};
  projRows.forEach(a => {
    if (a.application_id) {
      const appKey = `app:${a.application_id}`;
      if (!projByKey[appKey]) projByKey[appKey] = {};
      MONTHS.forEach(m => { projByKey[appKey][m] = (projByKey[appKey][m] || 0) + (Number(a[m]) || 0); });
      if (a.app_group_id) {
        const grpKey = `grp:${a.app_group_id}`;
        if (!projByKey[grpKey]) projByKey[grpKey] = {};
        MONTHS.forEach(m => { projByKey[grpKey][m] = (projByKey[grpKey][m] || 0) + (Number(a[m]) || 0); });
      }
    } else if (a.application_group_id) {
      const grpKey = `grp:${a.application_group_id}`;
      if (!projByKey[grpKey]) projByKey[grpKey] = {};
      MONTHS.forEach(m => { projByKey[grpKey][m] = (projByKey[grpKey][m] || 0) + (Number(a[m]) || 0); });
    }
    // Portfolio-level: no baseline offset — handled in full-cost pass below
  });

  // Apply offset formula for every baseline pool
  const ctbNet = {};
  MONTHS.forEach(m => { ctbNet[m] = 0; });
  Object.entries(baseByKey).forEach(([key, baseM]) => {
    const projM = projByKey[key] || {};
    MONTHS.forEach(m => {
      const base = baseM[m] || 0;
      const proj = projM[m] || 0;
      ctbNet[m] += Math.max(base, proj - base);
    });
  });

  // Full-cost pass: projects with no applicable baseline
  projRows.forEach(a => {
    let covered = false;
    if (a.application_id) {
      covered = !!baseByKey[`app:${a.application_id}`]
             || (a.app_group_id && !!baseByKey[`grp:${a.app_group_id}`]);
    } else if (a.application_group_id) {
      covered = !!baseByKey[`grp:${a.application_group_id}`];
    }
    if (!covered) {
      MONTHS.forEach(m => { ctbNet[m] += Number(a[m]) || 0; });
    }
  });

  // Net total = ADC + net CTB
  const net = {};
  MONTHS.forEach(m => { net[m] = adcT[m] + ctbNet[m]; });
  return net;
}
