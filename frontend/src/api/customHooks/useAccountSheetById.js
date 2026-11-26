"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { getAccountSheetById } from "../helpers/accounts_sheet";

function useAccountSheetById(accountSheetId) {
  const [accountSheet, setAccountSheet] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAccountSheetById(accountSheetId);
      if (response.code === 200) {
        setAccountSheet(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching account sheet!");
    } finally {
      setLoading(false);
    }
  };

  return { accountSheet, loading, fetchData };
}

export default useAccountSheetById;
