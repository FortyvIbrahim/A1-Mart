"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAccountAssetById } from "../helpers/account_assets";

function useAccountAssetById(accountAssetId) {
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(!!accountAssetId);

  useEffect(() => {
    if (!accountAssetId) {
      setAsset(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getAccountAssetById(accountAssetId);
        if (response.code === 200) {
          setAsset(response.data || null);
        } else {
          throw response;
        }
      } catch (err) {
        console.error(err);
        toast.error("Error fetching account asset!");
        setAsset(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accountAssetId]);

  return { asset, loading, refresh: () => {} };
}

export default useAccountAssetById;
