"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getLedgerById } from "../helpers/ledgers";

function useLedgerById(ledgerId) {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(!!ledgerId);

  useEffect(() => {
    if (!ledgerId) {
      setLedger(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getLedgerById(ledgerId);
        if (response.code === 200) {
          setLedger(response.data || null);
        } else {
          throw response;
        }
      } catch (err) {
        console.error(err);
        toast.error("Error fetching ledger!");
        setLedger(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ledgerId]);

  return { ledger, loading, refresh: () => {} };
}

export default useLedgerById;
