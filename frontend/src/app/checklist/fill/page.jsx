"use client";

import useChecklistForms from "@/api/customHooks/useChecklistForms";
import { getTodaySubmissionListingProgress } from "@/api/helpers/checklist_submissions";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import { CHECKLIST_FILL_ROUTES } from "@/constants/routes";
import { useUser } from "@/contexts/UserContext";
import { isChecklistFormForDesignation } from "@/utils/checklistFormDesignationFilter";
import moment from "moment";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";

function FillChecklistListing() {
  const router = useRouter();
  const gridRef = useRef(null);
  const { forms } = useChecklistForms();
  const { designationId, employeeData } = useUser();
  const [bootDesig, setBootDesig] = useState(null);
  useEffect(() => {
    setBootDesig(
      typeof window !== "undefined"
        ? localStorage.getItem("designationId")
        : null
    );
  }, []);
  const effectiveDesig = designationId ?? bootDesig;

  const rows = useMemo(() => {
    if (!effectiveDesig) return [];
    return (forms ?? []).filter((f) =>
      isChecklistFormForDesignation(f, effectiveDesig)
    );
  }, [forms, effectiveDesig]);

  const [tableRows, setTableRows] = useState([]);

  useEffect(() => {
    if (!rows.length) {
      setTableRows([]);
      return;
    }
    let cancelled = false;
    const dateStr = moment().format("YYYY-MM-DD");
    setTableRows(
      rows.map((r) => ({ ...r, answered_count: null, late_count: null }))
    );
    (async () => {
      const next = await Promise.all(
        rows.map(async (f) => {
          try {
            const { answeredCount, lateCount } =
              await getTodaySubmissionListingProgress(
                f.id,
                dateStr,
                employeeData?.branch_id
              );
            return {
              ...f,
              answered_count: answeredCount,
              late_count: lateCount,
            };
          } catch {
            return { ...f, answered_count: 0, late_count: 0 };
          }
        })
      );
      if (!cancelled) setTableRows(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, employeeData?.branch_id]);

  const colDefs = [
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
      headerName: "Progress",
      valueGetter: (p) => {
        const a = p.data?.answered_count;
        const t = p.data?.questions_count;
        if (a === null || a === undefined) return "—";
        if (t == null || t === undefined) return `${a}`;
        return `${a}/${t}`;
      },
    },
    {
      headerName: "Completion",
      valueGetter: (p) => {
        const a = p.data?.answered_count;
        const t = p.data?.questions_count;
        if (a === null || a === undefined) return "—";
        if (t == null || t === undefined) return "—";
        if (t <= 0) return "0%";
        return `${Math.round((a / t) * 100)}%`;
      },
    },
    {
      headerName: "Late",
      type: "number",
      valueGetter: (p) => {
        if (
          p.data?.answered_count === null ||
          p.data?.answered_count === undefined
        ) {
          return "—";
        }
        return String(p.data?.late_count ?? 0);
      },
    },
    {
      field: "updated_at",
      headerName: "Updated",
      type: "datetime",
    },
    {
      field: "id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (p) => {
        const id = p.data?.id;
        if (id == null) return [];
        return [
          {
            label: "Fill",
            value: "fill",
            onClick: () =>
              router.push(
                CHECKLIST_FILL_ROUTES.fill.path.replace(":id", String(id))
              ),
          },
        ];
      },
    },
  ];

  return (
    <GlobalWrapper permissionKey={CHECKLIST_FILL_ROUTES.listing.permissionKey}>
      <CustomContainer title={CHECKLIST_FILL_ROUTES.listing.title}>
        {!effectiveDesig ? (
          <span>
            Your designation could not be determined. You cannot fill
            checklists.
          </span>
        ) : (
          <AgGrid
            ref={gridRef}
            rowData={tableRows}
            columnDefs={colDefs}
            tableKey="checklist-fill"
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default FillChecklistListing;
