"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getUserTarget } from "../helpers/target_employee";
import { useUser } from "@/contexts/UserContext";
import moment from "moment";

function useUserTarget(date, targets = []) {
  const [targetRes, setTargetRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const { employeeData } = useUser();

  const fetchData = async () => {
    try {
      const response = await getUserTarget(date);

      if (response.code === 200) {
        setTargetRes(response.data);
      } else if (response.code === 404) {
        setTargetRes(null);
      } else {
        setTargetRes(null);
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching target!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (date) {
      fetchData();
    }
  }, [date]);

  const calculateSalesMade = () => {
    if (targets.length > 0 && date && targetRes && employeeData) {
      let total = 0;

      targets
        .filter((item) => {
          if (
            targetRes.is_merged == 0 &&
            item.employee_code !== employeeData?.employee_code
          ) {
            return false;
          }

          if (
            !moment(item.date).isSame(date, "month") ||
            !moment(item.date).isSame(date, "year")
          ) {
            return false;
          }

          return true;
        })
        .forEach((item) => {
          console.log(item);
          total += item.sales_amount;
        });

      return total;
    }

    return 0;
  };

  const target = targetRes?.target_amount;
  const salesMade = calculateSalesMade();
  const pendingSales = target - salesMade;
  const achievementPerc = (salesMade / target) * 100;

  return {
    target,
    loading,
    salesMade,
    pendingSales,
    achievementPerc,
  };
}

export default useUserTarget;
