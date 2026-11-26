import useAccountsSheet from "@/api/customHooks/useAccountsSheet";
import useEmployee from "@/api/customHooks/useEmployee";
import useGRNs from "@/api/customHooks/useGRNs";
import useIncentiveCommon from "@/api/customHooks/useIncentiveCommon";
import usePurchaseAcknowledgments from "@/api/customHooks/usePurchaseAcknowledgments";
import useStickering from "@/api/customHooks/useStickering";
import useStickeringIncentive from "@/api/customHooks/useStickeringIncentive";
import useWMSPurchaseEntries from "@/api/customHooks/useWMSPurchaseEntries";
import { calculateIncentive } from "@/utils/incentive";
import moment from "moment";
import React, { useMemo, useState } from "react";

function useIncentiveGenerator({ filters }) {
  const { employees: unfilteredEmployees } = useEmployee({
    filterInactive: false,
  });
  const { wmsPurchaseEntries } = useWMSPurchaseEntries();
  const { grns } = useGRNs();
  const { stickering } = useStickering();
  const { accountSheets } = useAccountsSheet();

  const { incentives: grnIncentives } = useIncentiveCommon("grn");
  const { incentives: billingCheckerIncentives } =
    useIncentiveCommon("billing-checker");
  const { incentives: billingOperatorIncentives } =
    useIncentiveCommon("billing-operator");
  const { incentives: wmsPurchaseEntryIncentives } = useIncentiveCommon(
    "purchase-data-entry"
  );
  const { incentives: stickeringIncentives } = useStickeringIncentive();

  const employees = useMemo(() => {
    return unfilteredEmployees.filter((item) => {
      if (filters.branch_id && filters.branch_id != item.branch_id) {
        return false;
      }

      if (filters.designation_id?.length) {
        const ids = Array.isArray(filters.designation_id)
          ? filters.designation_id
          : [filters.designation_id];
        if (!ids.some((id) => id == item.designation_id)) {
          return false;
        }
      }

      if (
        filters.incentive_type &&
        filters.incentive_type != item.incentive_type_resolved
      ) {
        return false;
      }

      return true;
    });
  }, [unfilteredEmployees, filters]);

  const runThroughFilters = (list) => {
    // Ensure filters.startDate is start of day, filters.endDate is end of day
    const startDate = filters.startDate
      ? moment(filters.startDate).startOf("day")
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate).endOf("day")
      : null;

    return list.filter((item) => {
      const itemDate = item?.date || item?.created_at;

      if (startDate && moment(itemDate).isBefore(startDate)) {
        return false;
      }

      if (endDate && moment(itemDate).isAfter(endDate)) {
        return false;
      }

      return true;
    });
  };

  const filteredGRNs = useMemo(() => {
    return runThroughFilters(grns);
  }, [grns, filters]);

  const filteredWMSPurchaseEntries = useMemo(() => {
    return runThroughFilters(wmsPurchaseEntries);
  }, [wmsPurchaseEntries, filters]);

  const filteredStickering = useMemo(() => {
    return runThroughFilters(stickering);
  }, [stickering, filters]);

  const filteredAccountsSheet = useMemo(() => {
    return runThroughFilters(accountSheets);
  }, [accountSheets, filters]);

  const getGeneratedIncentives = () => {
    const incentives = [];
    employees.forEach((employee) => {
      const incentive = calculateIncentive({
        employee,
        grns: filteredGRNs,
        wmsPurchaseEntries: filteredWMSPurchaseEntries,
        stickering: filteredStickering,
        accountsSheet: filteredAccountsSheet,
        incentives: {
          grn: grnIncentives,
          purchaseDataEntry: wmsPurchaseEntryIncentives,
          stickering: stickeringIncentives,
          billingChecker: billingCheckerIncentives,
          billingOperator: billingOperatorIncentives,
        },
      });

      if (incentive) {
        incentives.push({
          employee_code: employee.employee_code,
          incentive_type: employee.incentive_type_resolved,
          incentive,
        });
      }
    });

    return incentives;
  };

  return { employees, getGeneratedIncentives };
}

export default useIncentiveGenerator;
