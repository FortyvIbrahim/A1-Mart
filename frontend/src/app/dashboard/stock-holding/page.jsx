"use client";

import React, { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import StockHoldingDashboardShell from "./components/StockHoldingDashboardShell";
import HoldingDashboardView from "./components/HoldingDashboardView";
import AvailabilityDashboardView from "./components/AvailabilityDashboardView";
import SalesDashboardView from "./components/SalesDashboardView";

const DASHBOARD_TAB_PARAM = "tab";
const DEFAULT_TAB = "holding";
const VALID_TABS = new Set(["holding", "availability", "sales"]);

function parseTabFromSearchParams(searchParams) {
  const tab = searchParams.get(DASHBOARD_TAB_PARAM);
  return VALID_TABS.has(tab) ? tab : DEFAULT_TAB;
}

export default function StockHoldingDashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = parseTabFromSearchParams(searchParams);

  const onTabChange = useCallback(
    (tab) => {
      if (!VALID_TABS.has(tab) || tab === activeTab) return;

      const params = new URLSearchParams(searchParams.toString());
      if (tab === DEFAULT_TAB) {
        params.delete(DASHBOARD_TAB_PARAM);
      } else {
        params.set(DASHBOARD_TAB_PARAM, tab);
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [activeTab, pathname, router, searchParams]
  );

  return (
    <StockHoldingDashboardShell activeTab={activeTab} onTabChange={onTabChange}>
      {activeTab === "holding" ? (
        <HoldingDashboardView />
      ) : activeTab === "availability" ? (
        <AvailabilityDashboardView />
      ) : (
        <SalesDashboardView />
      )}
    </StockHoldingDashboardShell>
  );
}
