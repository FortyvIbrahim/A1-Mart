"use client";

import { Text } from "@chakra-ui/react";
import { calculateDaysLeft } from "@/utils/stockCirclePeriod";

/**
 * AgGrid column helpers for stock circles — matches All Circles (`/stock/checker`).
 */
export function stockCircleDaysLeftValueGetter(params) {
  return calculateDaysLeft(params.data);
}

export default function StockCircleDaysLeftCell(props) {
  if (props.node?.rowPinned === "bottom") return null;
  const daysLeft = props.value;
  if (daysLeft === null) {
    return "-";
  }
  const isOverdue = daysLeft < 0;
  return (
    <Text style={{ color: isOverdue ? "#e53e3e" : "#38a169" }}>
      {Math.abs(daysLeft)} days
      {daysLeft > 0 ? " left" : " overdue"}
    </Text>
  );
}
