// ─── TanStack Query key factory ───────────────────────────────────────────────
// Centralising keys ensures that invalidateQueries calls are consistent
// when the same data is used across multiple pages (e.g. FTEs appear on
// ADCs, CTB, Portfolios, FTEAllocation, FTESummary).
export const keys = {
  dashboard:    { summary: () => ['dashboard', 'summary'] },
  applications: { list: () => ['applications'] },
  appGroups:    { list: () => ['application-groups'], detail: (id) => ['application-groups', id], members: (id) => ['application-groups', id, 'members'] },
  ftes:         { list: () => ['ftes'] },
  portfolios:   { list: () => ['portfolios'] },
  tbh:          { list: () => ['tbh'] },
  adcs:         { list: () => ['adcs'], targets: () => ['adcs', 'targets'] },
  ctb:          { list: () => ['ctb'],  targets: () => ['ctb', 'targets'] },
  ctbProjects:  { list: () => ['ctb-projects'], targets: () => ['ctb-projects', 'targets'], detail: (id) => ['ctb-projects', id] },
  fteAlloc:     { summary: () => ['fte-allocations', 'summary'], detail: (id) => ['fte-allocations', id] },
};
