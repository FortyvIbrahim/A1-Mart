"use client";

import constants from "@/api/constants";
import { useCleaningPacking } from "@/api/customHooks/useCleaningPacking";
import { getAllCleaningPackingAsPDF } from "@/api/helpers/cleaning_packing";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import {
  colDefsCleaning,
  colDefsPacking,
} from "@/utils/colDefs/cleaning_packing";
import exportCSVFile, { exportToExcel } from "@/utils/exportCSVFile";
import { Button, Flex, Tabs, Text } from "@chakra-ui/react";
import moment from "moment";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import toast from "react-hot-toast";

const TABLE_HEADER_BULK_ITEMS_FOR_CLEANING = {
  sno: "S.No",
  article_name: "Name",
  parent_stock: "Current Stock",
  repackage_conversion: "Repack Conversion",
  bulk_weight: "Bulk Weight",
  gross_weight: "Gross Weight",
  bag_weight: "Bag Weight",
  wastage: "Wastage",
  net_weight: "Net Weight",
  start_time: "Start Time",
  end_time: "End Time",
  no_of_persons: "No Of Persons",
};

const TABLE_HEADER_BULK_ITEMS_FOR_PACKING = {
  sno: "S.No",
  article_id: "Item Code",
  article_name: "Name",
  repack_quantity: "Pack Qty",
  packing_material_val: "Packing Material",
  packing_material_size_val: "Packing Material Size",
  sticker_val: "Sticker",
  store_uom: "Store UOM",
  bag_weight: "Bag Weight",
  wastage: "Wastage",
};

function Repack() {
  const router = useRouter();
  const [tab, setTab] = useState("cleaning");
  const { items: cleaningItems, sync } = useCleaningPacking({
    cleaning: "true",
  });
  const { items: nonCleaningItems, refetch: refetchCleaningItems } =
    useCleaningPacking({ cleaning: "false" });
  const { items: handpackedItems, refetch: refetchHandPackedItems } =
    useCleaningPacking({ packing_type: 1 });
  const { items: machinePackedItems, refetch: refetchMachinePackedItems } =
    useCleaningPacking({ packing_type: 2 });

  const formatDataForExportAll = (list) => {
    return list.map((item) => ({
      "S.No": item.sno,
      Name: item.article_name,
      "Current Stock": item.parent_stock,
      "Repack Conversion": item.repackage_conversion,
      "Bulk Weight": item.bulk_weight,
      "Gross Weight": item.gross_weight,
      "Bag Weight": item.bag_weight,
      Wastage: item.wastage,
      "Net Weight": item.net_weight,
      "Start Time": item.start_time,
      "End Time": item.end_time,
      "No Of Persons": item.no_of_persons,
    }));
  };

  const formatDataForPackExportAll = (list) => {
    return list.map((item) => ({
      "S.No": item.sno,
      "Item Code": item.article_id,
      Name: item.article_name,
      "Pack Qty": item.repack_quantity,
      "Packing Material": item.packing_material_val,
      "Packing Material Size": item.packing_material_size_val,
      Sticker: item.sticker_val,
      "Store UOM": item.store_uom,
      "Bag Weight": item.bag_weight,
      Wastage: item.wastage,
    }));
  };

  const handleSync = async () => {
    await sync();
    await refetchCleaningItems();
    await refetchHandPackedItems();
    await refetchMachinePackedItems();
  };

  const handleExportAll = () => {
    exportToExcel(
      [
        formatDataForExportAll(cleaningItems),
        formatDataForExportAll(nonCleaningItems),
        formatDataForPackExportAll(handpackedItems),
        formatDataForPackExportAll(machinePackedItems),
      ],
      [
        "Bulk Items for Cleaning",
        "Bulk Items for Without Cleaning",
        "Hand Packing Items",
        "Machine Packing Items",
      ],
      `cleaning-packing-${moment().format("DD-MM-YYYY")}.xlsx`
    );
  };

  const handleExport = (list, name) => {
    const formattedData = [];
    list.forEach((item) => {
      formattedData.push({
        sno: item.sno,
        article_id: item.article_id,
        article_name: item.article_name,
        repack_quantity: item.repack_quantity,
        packing_material_val: item.packing_material_val,
        packing_material_size_val: item.packing_material_size_val,
        sticker_val: item.sticker_val,
        store_uom: item.store_uom,
        bag_weight: "",
        wastage: "",
      });
    });

    exportCSVFile(
      TABLE_HEADER_BULK_ITEMS_FOR_PACKING,
      formattedData,
      `${name}-${moment().format("DD-MM-YYYY")}`
    );
  };

  const handleExportBulkItems = (list, name) => {
    const formattedData = [];
    list.forEach((item) => {
      formattedData.push({
        sno: item.sno,
        article_name: item.article_name,
        parent_stock: item.parent_stock,
        repackage_conversion: item.repackage_conversion,
        bulk_weight: item.bulk_weight,
        gross_weight: "",
        bag_weight: "",
        wastage: "",
        net_weight: "",
        start_time: "",
        end_time: "",
        no_of_persons: "",
      });
    });

    exportCSVFile(
      TABLE_HEADER_BULK_ITEMS_FOR_CLEANING,
      formattedData,
      `${name}-${moment().format("DD-MM-YYYY")}`
    );
  };

  const getLastSyncedComponent = (list) => {
    if (!list || list.length === 0) {
      return "";
    }

    return (
      <Text fontSize="sm" color="brand700">
        Last Sync - {moment(list[0].created_at).fromNow()}
      </Text>
    );
  };

  const handleExportToPdf = async (list, pdfName, title, headers) => {
    toast.promise(
      getAllCleaningPackingAsPDF({
        date: moment().format("YYYY-MM-DD"),
        pdf_name: pdfName,
        title: title,
        headers: headers,
        data: list,
      }),
      {
        loading: "Exporting data",
        success: (response) => {
          if (response.code === 200) {
            window.open(
              `${constants.BASE_URL}${response.data.pdf_url}`,
              "_blank"
            );
            return "Data exported successfully";
          }

          throw response;
        },
        error: (err) => {
          console.error("Error exporting data:", err);
          return "Failed to export data";
        },
      }
    );
  };

  const CP_TABS = [
    {
      value: "cleaning",
      label: "Bulk Items for Cleaning",
      tableKey: "cleaning-packing-bulk-items-for-cleaning",
      rows: cleaningItems,
      colDefs: colDefsCleaning,
      onExport: () =>
        handleExportToPdf(cleaningItems, "bulk-items-for-cleaning", "Bulk Items for Cleaning", TABLE_HEADER_BULK_ITEMS_FOR_CLEANING),
    },
    {
      value: "no_cleaning",
      label: "Bulk Items Without Cleaning",
      tableKey: "cleaning-packing-bulk-items-for-without-cleaning",
      rows: nonCleaningItems,
      colDefs: colDefsCleaning,
      onExport: () =>
        handleExportToPdf(nonCleaningItems, "bulk-items-for-cleaning", "Bulk Items for Cleaning", TABLE_HEADER_BULK_ITEMS_FOR_CLEANING),
    },
    {
      value: "hand",
      label: "Hand Packing Items",
      tableKey: "cleaning-packing-hand-packing-items",
      rows: handpackedItems,
      colDefs: colDefsPacking,
      onExport: () =>
        handleExportToPdf(handpackedItems, "hand-packed", "Hand Packed", TABLE_HEADER_BULK_ITEMS_FOR_PACKING),
    },
    {
      value: "machine",
      label: "Machine Packing Items",
      tableKey: "cleaning-packing-machine-packing-items",
      rows: machinePackedItems,
      colDefs: colDefsPacking,
      onExport: () =>
        handleExportToPdf(machinePackedItems, "machine-packed", "Machine Packed", TABLE_HEADER_BULK_ITEMS_FOR_PACKING),
    },
  ];
  const current = CP_TABS.find((t) => t.value === tab) ?? CP_TABS[0];

  return (
    <GlobalWrapper permissionKey="view_cleaning_packing">
      <CustomContainer
        contentCard
        title="Cleaning and Packing"
        rightSection={
          <Flex gap={4} alignItems="center">
            

            <Button onClick={handleSync}>Sync Now</Button>
            {getLastSyncedComponent(machinePackedItems)}
            {/* <Button onClick={handleExportAll}>Export All</Button> */}
          </Flex>
        }
      >
        {/* Figma PUR/08: the four lists as underline tabs in one card, with
            Export beside the tabs. */}
        <Tabs.Root value={tab} onValueChange={(d) => setTab(d.value)} colorPalette="brand">
          <Flex align="center" justify="space-between" gap="12px" mb="16px" wrap="wrap">
            <Tabs.List borderColor="border" flex="1">
              {CP_TABS.map((t) => (
                <Tabs.Trigger
                  key={t.value}
                  value={t.value}
                  fontSize="12px"
                  color="fg.muted"
                  _selected={{ color: "#C95C18" }}
                >
                  {t.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <Button size="sm" variant="subtle" onClick={() => current.onExport()}>
              Export
            </Button>
          </Flex>
          {CP_TABS.map((t) => (
            <Tabs.Content key={t.value} value={t.value} pt={0}>
              <AgGrid
                tableKey={t.tableKey}
                rowData={t.rows}
                columnDefs={t.colDefs}
              />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Repack;
