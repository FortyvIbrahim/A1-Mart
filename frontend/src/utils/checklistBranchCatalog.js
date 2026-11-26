/**
 * Normalizes GET /branches list for checklist dashboard (form rows, pie, pending).
 * @param {Array<{ branch_id?: number, branch_name?: string }>} branchesApi
 * @returns {{ id: number, name: string }[]}
 */
export function normalizeChecklistBranchCatalog(branchesApi) {
  if (!Array.isArray(branchesApi) || branchesApi.length === 0) return [];
  const seen = new Set();
  const out = [];
  for (const b of branchesApi) {
    const id = Number(b.branch_id);
    if (Number.isNaN(id) || seen.has(id)) continue;
    seen.add(id);
    const name =
      (b.branch_name ?? "").toString().trim() ||
      `Branch #${b.branch_id}`;
    out.push({ id, name });
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}

/** Row stat when the branch has no submission row for that day (show "-" in grid). */
export function syntheticBranchStatNoSubmission(branch) {
  return {
    branch_id: branch.id,
    branch_name: branch.name || `Branch #${branch.id}`,
    _noSubmission: true,
  };
}
