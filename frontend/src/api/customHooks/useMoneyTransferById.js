"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMoneyTransferById } from "../helpers/money_transfers";

function useMoneyTransferById(moneyTransferId) {
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(!!moneyTransferId);

  useEffect(() => {
    if (!moneyTransferId) {
      setTransfer(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getMoneyTransferById(moneyTransferId);
        if (response.code === 200) {
          setTransfer(response.data || null);
        } else {
          throw response;
        }
      } catch (err) {
        console.error(err);
        toast.error("Error fetching money transfer!");
        setTransfer(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [moneyTransferId]);

  return { transfer, loading, refresh: () => {} };
}

export default useMoneyTransferById;
