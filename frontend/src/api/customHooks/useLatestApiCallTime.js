"use client";

import { useMemo } from "react";
import moment from "moment";
import useApiCallLogs from "./useApiCallLogs";

/**
 * Hook to get the latest API call time for a given api_type and secondary_type.
 *
 * @param {Object} params
 * @param {string} params.api_type
 * @param {string} params.secondary_type
 * @param {number} [params.limit=100] - Number of logs to fetch and search within
 */
function useLatestApiCallTime({
  api_type,
  secondary_type,
  limit = 100,
} = {}) {
  const { logs, loading, refetch } = useApiCallLogs({ limit, offset: 0 });

  const latestCall = useMemo(() => {
    if (!Array.isArray(logs) || !api_type || !secondary_type) return null;

    const matching = logs.filter(
      (log) =>
        String(log.api_type) === String(api_type) &&
        String(log.secondary_type) === String(secondary_type)
    );

    if (!matching.length) return null;

    const latest = matching.reduce((acc, curr) => {
      const accTime = acc?.created_at || acc?.updated_at || acc?.timestamp;
      const currTime = curr?.created_at || curr?.updated_at || curr?.timestamp;
      if (!accTime) return curr;
      if (!currTime) return acc;
      return moment(currTime).isAfter(moment(accTime)) ? curr : acc;
    });

    const rawTime =
      latest?.created_at || latest?.updated_at || latest?.timestamp || null;

    if (!rawTime) return null;

    return {
      raw: rawTime,
      formatted: moment(rawTime).format("DD MMM YYYY, hh:mm A"),
      iso: moment(rawTime).toISOString(),
    };
  }, [logs, api_type, secondary_type]);

  return { latestCall, loading, refetch };
}

export default useLatestApiCallTime;

