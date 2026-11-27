import { CHECKLIST_RESPONSE_ROUTES } from "@/constants/routes";
import {
  submissionStatForFormDate,
  submissionStatsKeyForYmd,
} from "@/utils/checklistSubmissionStatsCalendar";

export function checklistResponseViewPath(formId, ymd, branchId) {
  const base = CHECKLIST_RESPONSE_ROUTES.view.path.replace(
    ":formId",
    String(formId)
  );
  let q = `date=${encodeURIComponent(ymd)}`;
  if (branchId != null && branchId !== "") {
    q += `&branch_id=${encodeURIComponent(String(branchId))}`;
  }
  return `${base}?${q}`;
}

export function branchLabelFromStat(stat) {
  if (!stat) return "-";
  const n = (stat.branch_name ?? "").toString().trim();
  if (n) return n;
  const id = stat.branch_id;
  if (id != null && id !== "") return `Branch #${id}`;
  return "-";
}

/** AgGrid column defs for checklist responses (single `selectedYmd`). */
export function buildChecklistResponsesColumnDefs(router, selectedYmd) {
  const statsKey = submissionStatsKeyForYmd(selectedYmd);

  return [
    {
      field: "id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "title",
      headerName: "Title",
      type: "capitalized",
      flex: 2,
    },
    {
      headerName: "Branch",
      type: "capitalized",
      flex: 1.2,
      valueGetter: (p) => branchLabelFromStat(p.data?._branchStat),
    },
    {
      field: "questions_count",
      headerName: "Questions",
      type: "number",
    },
    {
      headerName: "Progress",
      valueGetter: (p) => {
        const form = p.data;
        if (!statsKey) return "-";
        const stat =
          p.data?._branchStat ??
          submissionStatForFormDate(form, selectedYmd);
        if (!stat) return "-";
        const answered = stat.answered ?? 0;
        const total = stat.total_questions ?? form?.questions_count ?? 0;
        if (total > 0) return `${answered}/${total}`;
        return `${answered}`;
      },
    },
    {
      headerName: "Completion",
      valueGetter: (p) => {
        const form = p.data;
        if (!statsKey) return "-";
        const stat =
          p.data?._branchStat ??
          submissionStatForFormDate(form, selectedYmd);
        if (!stat) return "-";
        const answered = stat.answered ?? 0;
        const total = stat.total_questions ?? form?.questions_count ?? 0;
        if (total <= 0) return "-";
        return `${Math.round((answered / total) * 100)}%`;
      },
    },
    {
      headerName: "Late",
      type: "number",
      valueGetter: (p) => {
        const form = p.data;
        if (!statsKey) return "-";
        const stat =
          p.data?._branchStat ??
          submissionStatForFormDate(form, selectedYmd);
        if (!stat) return "-";
        return String(stat.late ?? 0);
      },
    },
    {
      field: "updated_at",
      headerName: "Updated",
      type: "datetime",
      valueGetter: (p) => {
        const s = p.data?._branchStat;
        const t =
          s?.updated_at ??
          s?.updatedAt ??
          s?.created_at ??
          s?.createdAt ??
          p.data?.updated_at;
        return t ?? null;
      },
    },
    {
      field: "id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (p) => {
        const id = p.data?.id;
        if (id == null) return [];
        const branchId = p.data?._branchStat?.branch_id;
        return [
          {
            label: "View",
            value: "view",
            onClick: () =>
              router.push(checklistResponseViewPath(id, selectedYmd, branchId)),
          },
        ];
      },
    },
  ];
}

/**
 * Dashboard "Forms" grid: one row per (form × day × branch) in the selected range.
 * Rows carry `_branchStat` and `dashboardRowKey` (see dashboard row builder).
 */
export function buildChecklistDashboardFormsColumnDefs(router) {
  return [
    {
      field: "_responseYmd",
      headerName: "Date",
      type: "date",
    },
    {
      field: "id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "title",
      headerName: "Title",
      type: "capitalized",
      flex: 2,
    },
    {
      headerName: "Branch",
      type: "capitalized",
      flex: 1.2,
      valueGetter: (p) => branchLabelFromStat(p.data?._branchStat),
    },
    {
      field: "questions_count",
      headerName: "Questions",
      type: "number",
    },
    {
      // Figma "Forms" table: Progress = % answered, Completed = answered count.
      headerName: "Progress",
      valueGetter: (p) => {
        const form = p.data;
        const ymd = form?._responseYmd;
        if (!ymd || !submissionStatsKeyForYmd(ymd)) return "-";
        const stat = p.data?._branchStat;
        if (!stat || stat._noSubmission) return "0%";
        const answered = stat.answered ?? 0;
        const total = stat.total_questions ?? form?.questions_count ?? 0;
        return total > 0 ? `${Math.round((answered / total) * 100)}%` : "0%";
      },
    },
    {
      headerName: "Completed",
      type: "number",
      valueGetter: (p) => {
        const stat = p.data?._branchStat;
        if (!stat || stat._noSubmission) return 0;
        return stat.answered ?? 0;
      },
    },
    {
      headerName: "Late",
      // Figma shows "No" / "Yes".
      valueGetter: (p) => {
        const stat = p.data?._branchStat;
        if (!stat || stat._noSubmission) return "No";
        return Number(stat.late) > 0 ? "Yes" : "No";
      },
    },
    {
      field: "updated_at",
      headerName: "Updated",
      type: "datetime",
      valueGetter: (p) => {
        const s = p.data?._branchStat;
        if (!s || s._noSubmission) return null;
        const t =
          s?.updated_at ??
          s?.updatedAt ??
          s?.created_at ??
          s?.createdAt ??
          p.data?.updated_at;
        return t ?? null;
      },
    },
    {
      field: "id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (p) => {
        const id = p.data?.id;
        const ymd = p.data?._responseYmd;
        if (id == null || !ymd) return [];
        const branchId = p.data?._branchStat?.branch_id;
        return [
          {
            label: "View",
            value: "view",
            onClick: () =>
              router.push(checklistResponseViewPath(id, ymd, branchId)),
          },
        ];
      },
    },
  ];
}
