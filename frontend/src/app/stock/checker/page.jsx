"use client";

import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import React from "react";
import useStockCircles from "@/api/customHooks/useStockCircles";
import AgGrid from "@/components/AgGrid";
import { formatStockCircleDepartments, getPeriod } from "../circle/page";
import { useRouter } from "next/navigation";
import { Flex } from "@chakra-ui/react";
import { capitalizeWordsLatest } from "@/utils/string";
import { useStockCircleFilters } from "@/components/StockCircleFilters";
import StockCircleDaysLeftCell, {
  stockCircleDaysLeftValueGetter,
} from "@/components/StockChecker/StockCircleDaysLeftCell";

function StockChecker() {
  const router = useRouter();
  const { stockCircles } = useStockCircles();
  const { filtered, filterCard } = useStockCircleFilters(stockCircles, {
    searchPlaceholder: "Search by circle, branch or department...",
  });

  const colDefs = [
    {
      field: "id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "branch_name",
      headerName: "Branch",
      type: "capitalized",
    },
    {
      headerName: "Type",
      valueGetter: (props) => capitalizeWordsLatest(props.data?.period_type ?? ""),
    },
    {
      headerName: "Department",
      valueGetter: (props) => capitalizeWordsLatest(formatStockCircleDepartments(props.data)),
    },
    {
      headerName: "Category",
      valueGetter: (props) =>
        props.data?.category_name ? capitalizeWordsLatest(props.data.category_name) : "—",
    },
    {
      headerName: "Subcategory",
      valueGetter: (props) =>
        props.data?.subcategory_name
          ? capitalizeWordsLatest(props.data.subcategory_name)
          : "—",
    },
    {
      headerName: "Period",
      valueGetter: (props) => getPeriod(props.data) ?? "-",
    },
    {
      headerName: "Days Left",
      valueGetter: stockCircleDaysLeftValueGetter,
      cellRenderer: StockCircleDaysLeftCell,
    },
    {
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        return [
          {
            label: "View",
            value: "view",
            onClick: () => router.push(`/stock/checker/list/${props.data.id}`),
          },
        ];
      },
    },
  ];

  return (
    <GlobalWrapper permissionKey="view_circle">
      <CustomContainer title="Stock Checker">
        <Flex direction="column" gap="16px">
          {filterCard}
          <AgGrid rowData={filtered} colDefs={colDefs} tableKey="stock-checker" />
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default StockChecker;
