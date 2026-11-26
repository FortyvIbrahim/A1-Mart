import { useEffect, useState } from "react";
import {
  createRepackItem,
  deleteRepackItem,
  getAllRepackItems,
  getRepackItemById,
  updateRepackItem,
} from "../helpers/return_item";

export function useReturnItem(filters = {}) {
  const [returnItems, setReturnItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReturnItems = async (noRefresh = false) => {
    try {
      if (!noRefresh) {
        setLoading(true);
        setReturnItems([]);
      }

      const data = await getAllRepackItems({
        offset: 0,
        limit: 10000000,
        ...filters,
      });
      if (data.code === 200) {
        setReturnItems(data.data || []);
      } else {
        setError("Failed to fetch return items");
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const createReturnItem = async (returnItemData) => {
    try {
      const response = await createRepackItem(returnItemData);
      // if (response.code === 200) {
      //   await fetchReturnItems(true);
      // }
      return response;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const updateReturnItem = async (returnItemId, returnItemData) => {
    try {
      const response = await updateRepackItem(returnItemId, returnItemData);
      if (response.code === 200) {
        await fetchReturnItems(true);
      }
      return response;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const deleteReturnItem = async (returnItemId) => {
    try {
      const response = await deleteRepackItem(returnItemId);
      if (response.code === 200) {
        await fetchReturnItems(true);
      }
      return response;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const getReturnItemById = async (returnItemId) => {
    try {
      const response = await getRepackItemById(returnItemId);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  useEffect(() => {
    fetchReturnItems();
  }, []);

  return {
    returnItems,
    setReturnItems,
    loading,
    error,
    refetch: fetchReturnItems,
    createReturnItem,
    updateReturnItem,
    deleteReturnItem,
    getReturnItemById,
  };
}
