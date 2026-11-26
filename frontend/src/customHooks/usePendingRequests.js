"use client";

import { useSyncExternalStore } from "react";
import { getPendingRequests, subscribePendingRequests } from "@/api";

/** Number of API requests currently in flight (shared axios client). */
export default function usePendingRequests() {
  return useSyncExternalStore(
    subscribePendingRequests,
    getPendingRequests,
    () => 0
  );
}
