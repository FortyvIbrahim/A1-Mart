"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteAccountAsset,
  getAllAccountAssets,
} from "../helpers/account_assets";

function useAccountAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllAccountAssets();
      if (response.code === 200) {
        setAssets(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching account assets!");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (accountAssetId) => {
    toast.promise(deleteAccountAsset(accountAssetId), {
      loading: "Deleting account asset...",
      success: (response) => {
        if (response.code === 200) {
          fetchData();
          return response?.message || "Account asset deleted successfully";
        } else {
          throw response;
        }
      },
      error: (err) => err.message || err.msg || "Error deleting account asset",
    });
  };

  return {
    assets,
    loading,
    refresh: fetchData,
    deleteAccountAsset: handleDelete,
  };
}

export default useAccountAssets;
