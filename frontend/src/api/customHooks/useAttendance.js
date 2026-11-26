"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import moment from "moment";
import {
  getAttendanceList,
  getProcessedAttendanceList,
  syncAttendance,
} from "../helpers/employee_attendance";

/**
 * @param {Object} [options]
 * @param {string} [options.fromDate] - YYYY-MM-DD or ISO date
 * @param {string} [options.toDate]   - YYYY-MM-DD or ISO date
 * @param {string} [options.employeeCode] - Optional filter by employee
 */
function useAttendance(options = {}) {
  const { fromDate, toDate, employeeCode } = options;
  const [records, setRecords] = useState([]);
  const [processedAttendanceByEmployeeCode, setProcessedAttendanceByEmployeeCode] =
    useState(new Map());
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const from = useMemo(
    () => fromDate || moment().startOf("month").format("YYYY-MM-DD"),
    [fromDate]
  );
  const to = useMemo(
    () => toDate || moment().endOf("month").format("YYYY-MM-DD"),
    [toDate]
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { from_date: from, to_date: to };
      if (employeeCode) params.employee_code = employeeCode;
      const data = await getAttendanceList(params);
      const processedData = await getProcessedAttendanceList(params);
      if (data.code === 200 && processedData.code === 200) {
        setRecords(Array.isArray(data.data) ? data.data : []);
        const byEmployeeCode = new Map();
        (Array.isArray(processedData.data) ? processedData.data : []).forEach(
          (row) => {
            const employeeCodeKey = String(row?.employee_code ?? "");
            if (!employeeCodeKey) return;
            const rowDate = row?.date
              ? moment(row.date).format("YYYY-MM-DD")
              : null;
            if (!rowDate) return;
            const dateMap = byEmployeeCode.get(employeeCodeKey) ?? new Map();
            const current = dateMap.get(rowDate) ?? {
              is_late: false,
              is_early: false,
            };
            dateMap.set(rowDate, {
              is_late: current.is_late || Boolean(row?.is_late),
              is_early: current.is_early || Boolean(row?.is_early),
            });
            byEmployeeCode.set(employeeCodeKey, dateMap);
          }
        );
        setProcessedAttendanceByEmployeeCode(byEmployeeCode);
      } else {
        setRecords([]);
        setProcessedAttendanceByEmployeeCode(new Map());
        throw data;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching attendance");
      setRecords([]);
      setProcessedAttendanceByEmployeeCode(new Map());
    } finally {
      setLoading(false);
    }
  }, [from, to, employeeCode]);

  const sync = useCallback(async () => {
    try {
      setIsSyncing(true);
      const data = await syncAttendance();
      if (data.code === 200) {
        toast.success("Attendance synced successfully");
        fetchData();
      } else {
        throw data;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error syncing attendance");
    } finally {
      setIsSyncing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    records,
    processedAttendanceByEmployeeCode,
    loading,
    refetch: fetchData,
    sync,
    isSyncing,
  };
}

export default useAttendance;
