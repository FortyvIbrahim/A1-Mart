"use client";

import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { getAllAccountsPreloadData } from "../helpers/accounts_preload_data";
import moment from "moment";

function useAccountsPreloaded() {
  const [accountsPreloadData, setAccountsPreloadData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getAllAccountsPreloadData();
      if (response.code === 200) {
        setAccountsPreloadData(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching accounts preload data!");
      setAccountsPreloadData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map data by date (YYYY-MM-DD format)
  const dataByDate = useMemo(() => {
    const map = {};
    accountsPreloadData.forEach((item) => {
      const dateKey = moment(item.date).format("YYYY-MM-DD");
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(item);
    });
    return map;
  }, [accountsPreloadData]);

  // Get all unique dates that have data
  const uploadedDates = useMemo(() => {
    return Object.keys(dataByDate).map((dateStr) => moment(dateStr).toDate());
  }, [dataByDate]);

  return {
    accountsPreloadData,
    dataByDate,
    uploadedDates,
    loading,
    refetch: fetchData,
  };
}

export default useAccountsPreloaded;
