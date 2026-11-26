"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getStockAdditionById } from "../helpers/stock_addition";

function useStockAdditionById(id) {
  const [stockAddition, setStockAddition] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getStockAdditionById(id);
      if (response) {
        setStockAddition(response);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching stock addition!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  return { stockAddition, loading };
}

export default useStockAdditionById;
