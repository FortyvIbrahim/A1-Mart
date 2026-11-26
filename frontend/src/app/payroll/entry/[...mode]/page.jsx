"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirects legacy payroll entry routes to the single payroll entry page.
 * /payroll/entry/create -> /payroll/entry
 * /payroll/entry/view/:id -> /payroll/entry?payroll_id=:id
 * /payroll/entry/edit/:id -> /payroll/entry?payroll_id=:id
 */
export default function PayrollEntryRedirect() {
  const router = useRouter();
  const params = useParams();
  const mode = params?.mode;

  useEffect(() => {
    if (!mode || !Array.isArray(mode)) {
      router.replace("/payroll/entry");
      return;
    }
    const [action, payrollId] = mode;
    if (action === "create") {
      router.replace("/payroll/entry");
    } else if ((action === "view" || action === "edit") && payrollId) {
      router.replace(`/payroll/entry?payroll_id=${payrollId}`);
    } else {
      router.replace("/payroll/entry");
    }
  }, [router, mode]);

  return null;
}
