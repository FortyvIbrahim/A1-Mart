/**
 * Returns true if the checklist form applies to the given designation id
 * (either `report_to_designation_ids` on the form or `report_to_designations` rows from API).
 */
export function isChecklistFormForDesignation(form, designationId) {
  const did = Number(designationId);
  if (!Number.isFinite(did)) return false;

  const ids = form?.report_to_designation_ids;
  if (Array.isArray(ids) && ids.some((x) => Number(x) === did)) {
    return true;
  }

  const rows = form?.report_to_designations;
  if (Array.isArray(rows)) {
    return rows.some((r) => {
      const rid = r.designation_id ?? r.id ?? r.designationId;
      return Number(rid) === did;
    });
  }

  return false;
}
