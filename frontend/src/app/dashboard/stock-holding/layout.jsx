"use client";

import React from "react";
import { StockHoldingDashboardProvider } from "./StockHoldingDashboardContext";

export default function StockHoldingDashboardLayout({ children }) {
  return (
    <StockHoldingDashboardProvider>{children}</StockHoldingDashboardProvider>
  );
}
