"use client";

import { useEffect, useState } from "react";
import {
  BOOLEAN_LIST,
  findItem,
  PACKAGING_MATERIAL_LIST,
  PACKAGING_MATERIAL_SIZE_LIST,
  PACKAGING_TYPE_LIST,
} from "@/constants/repackItems";
import toast from "react-hot-toast";
import { capitalizeWords } from "@/utils/string";
import {
  getAllCleaningPacking,
  syncCleaningPacking,
} from "../helpers/cleaning_packing";

export function useCleaningPacking(filters) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    try {
      setLoading(true);
      const data = await getAllCleaningPacking(filters);
      if (data.code === 200) {
        const formattedData = data.data.map((item, index) => ({
          ...item,
          sno: index + 1,
          parent_stock: item.parent_stock.toFixed(2),
          article_name: capitalizeWords(item.article_name),
          bulk_weight:
            (item.repackage_conversion * item.repack_quantity) / 1000,
          cleaning_val: findItem(BOOLEAN_LIST, item.cleaning),
          packing_type_val: findItem(PACKAGING_TYPE_LIST, item.packing_type),
          packing_material_val: findItem(
            PACKAGING_MATERIAL_LIST,
            item.packing_material
          ),
          packing_material_size_val: findItem(
            PACKAGING_MATERIAL_SIZE_LIST,
            item.packing_material_size
          ),
          sticker_val: findItem(BOOLEAN_LIST, item.sticker),
        }));
        setItems(formattedData);
      } else {
        throw data;
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const sync = async () => {
    try {
      const data = await syncCleaningPacking();

      if (data.code === 200) {
        fetchList();
        toast.success("Data successfully synced!");
      } else {
        throw err;
      }
    } catch (err) {
      console.log(err);
      toast.error(err?.message);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  return { items, loading, setItems, refetch: fetchList, sync };
}
