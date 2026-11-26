"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteAccountSheet,
  getAllAccountSheet,
} from "../helpers/accounts_sheet";

/**
 * @param {Object} [options]
 * @param {string} [options.fromDate] - YYYY-MM-DD → query `from_date`
 * @param {string} [options.toDate]   - YYYY-MM-DD → query `to_date`
 */
function useAccountsSheet({ fromDate, toDate } = {}) {
  const [accountSheets, setAccountSheets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {};
      if (fromDate) filters.from_date = fromDate;
      if (toDate) filters.to_date = toDate;
      const response = await getAllAccountSheet(filters);
      if (response.code === 200) {
        setAccountSheets(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching account sheets!");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteAccountSheet = async (id) => {
    toast.promise(deleteAccountSheet(id), {
      loading: "Deleting performance entry...",
      success: (response) => {
        fetchData();
        return "Performance entry deleted successfully";
      },
      error: (err) => {
        console.log(err);
        return "Error deleting performance entry";
      },
    });
  };

  return { accountSheets, loading, handleDeleteAccountSheet, fetchData };
}

export default useAccountsSheet;
