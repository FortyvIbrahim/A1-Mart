"use client";

import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomFileUploader from "@/components/CustomInput/CustomFileUploader";
import FilterCheckboxGroup from "@/components/FilterCheckboxGroup";
import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { capitalizeWords } from "@/utils/string";
import { Button, Flex, HStack } from "@chakra-ui/react";
import { getAllCleaningPackingAsPDF } from "@/api/helpers/cleaning_packing";
import moment from "moment";
import constants from "@/api/constants";

function page() {
  const [fileData, setFileData] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Filter states
  const [fromStoreFilter, setFromStoreFilter] = useState([]);
  const [toStoreFilter, setToStoreFilter] = useState([]);
  const [skuModeFilter, setSkuModeFilter] = useState([]);

  // Get unique values for filters
  const uniqueValues = useMemo(() => {
    if (!fileData || fileData.length === 0) {
      return {
        fromStores: [],
        toStores: [],
        skuModes: [],
      };
    }

    const fromStores = [
      ...new Set(fileData.map((item) => item["From Store"]).filter(Boolean)),
    ];
    const toStores = [
      ...new Set(fileData.map((item) => item["To Store"]).filter(Boolean)),
    ];
    const skuModes = [
      ...new Set(fileData.map((item) => item["Sku Mode"]).filter(Boolean)),
    ];

    return {
      fromStores: fromStores.sort(),
      toStores: toStores.sort(),
      skuModes: skuModes.sort(),
    };
  }, [fileData]);

  // Filter the data based on selected filters
  const filteredData = useMemo(() => {
    if (!fileData || fileData.length === 0) return [];

    return fileData.filter((item) => {
      const fromStoreMatch =
        fromStoreFilter.length === 0 ||
        fromStoreFilter.includes(item["From Store"]);
      const toStoreMatch =
        toStoreFilter.length === 0 || toStoreFilter.includes(item["To Store"]);
      const skuModeMatch =
        skuModeFilter.length === 0 || skuModeFilter.includes(item["Sku Mode"]);

      return fromStoreMatch && toStoreMatch && skuModeMatch;
    });
  }, [fileData, fromStoreFilter, toStoreFilter, skuModeFilter]);

  const REQUIRED_FIELDS = [
    "Actual Quantity",
    "Article Id",
    "Article Name",
    "From Store",
    "Job Type",
    "Mismatch Quantity",
    "Planned Quantity",
    "Recommended Quantity",
    "To Store",
  ];

  const handleFileUpload = (file, data) => {
    if (file && data) {
      if (Array.isArray(data)) {
        // Validate each row contains exactly the required fields
        const isValidArray =
          data.length > 0 &&
          data.every((row) => {
            // Check each key in REQUIRED_FIELDS is present in the row
            // Also ensure values are not undefined/null (allowing 0 and empty string)
            return (
              typeof row === "object" &&
              REQUIRED_FIELDS.every(
                (field) =>
                  Object.prototype.hasOwnProperty.call(row, field) &&
                  row[field] !== undefined &&
                  row[field] !== null
              )
            );
          });

        if (isValidArray) {
          setUploadedFile(file);
          setFileData(data);
          return;
        }
      }
      setUploadedFile(null);
      setFileData(null);
      toast.error(
        "Invalid file format.\n\nExpected columns:\n" +
          REQUIRED_FIELDS.join(", ")
      );
    } else {
      setUploadedFile(null);
      setFileData(null);
    }
  };

  const colDefs = [
    {
      field: "From Store",
      headerName: "From Store",
      resizable: true,
      filter: false,
      minWidth: 120,
      cellRenderer: (props) =>
        capitalizeWords(props.value.replaceAll("a1 mart-", "") ?? ""),
    },
    {
      field: "To Store",
      headerName: "To Store",
      resizable: true,
      filter: false,
      minWidth: 120,
      cellRenderer: (props) =>
        capitalizeWords(props.value.replaceAll("a1 mart-", "") ?? ""),
    },
    {
      field: "Article Id",
      headerName: "Article Id",
      resizable: true,
      filter: false,
    },
    {
      field: "Article Name",
      headerName: "Article Name",
      resizable: true,
      minWidth: 200,
      cellRenderer: (props) => capitalizeWords(props.value ?? ""),
      filter: false,
    },
    {
      field: "Job Type",
      headerName: "Job Type",
      resizable: true,
      filter: false,
    },
    {
      field: "Recommended Quantity",
      headerName: "Recommended Quantity",
      resizable: true,
      filter: false,
    },
    {
      field: "Planned Quantity",
      headerName: "Planned Quantity",
      resizable: true,
      filter: false,
    },
    {
      field: "Actual Quantity",
      headerName: "Actual Quantity",
      resizable: true,
      filter: false,
    },
    {
      field: "Mismatch Quantity",
      headerName: "Mismatch Quantity",
      resizable: true,
      filter: false,
    },
    {
      field: "Sku Mode",
      headerName: "Sku Mode",
      resizable: true,
      filter: false,
      minWidth: 200,
      cellRenderer: (props) => capitalizeWords(props.value ?? ""),
    },
    {
      field: "Job Type",
      headerName: "Job Type",
      resizable: true,
      filter: false,
    },
  ];

  const handleExportToPdf = async () => {
    toast.promise(
      getAllCleaningPackingAsPDF({
        data: filteredData.map((item, index) => ({
          ...item,
          "S.No": index + 1,
        })),
        pdf_name: `picking-list-${moment().format("DD-MM-YYYY-HH-mm-ss")}`,
        title: `Picking List`,
        size: "sm",
        margin_size: "8mm",
        orientation: "portrait",
        headers: {
          "S.No": "S.No",
          "From Store": "From Store",
          "To Store": "To Store",
          "Article Id": "ID",
          "Article Name": "Name",
          "Recommended Quantity": "Rec. Qty",
          "Planned Quantity": "Plan. Qty",
          "Actual Quantity": "Act. Qty",
          "Mismatch Quantity": "Mis. Qty",
          "Sku Mode": "Sku Mode",
          "Job Type": "Job Type",
        },
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

  return (
    <GlobalWrapper permissionKey="view_picking_list">
      <CustomContainer
        title="Picking List"
        color="brand"
        rightSection={
          <Button
            onClick={handleExportToPdf}
            disabled={!filteredData || filteredData.length === 0}
          >
            Export
          </Button>
        }
      >
        <Flex gap="22px" flexDirection="column">
          <CustomFileUploader
            onFileUpload={handleFileUpload}
            uploadedFile={uploadedFile}
            fileData={fileData}
            color="secondary"
            size="sm"
            placeholder="Drag & drop an Excel or CSV file here, or click to select"
            acceptedFileTypes="Only .xlsx, .xls, and .csv files are accepted"
          />

          {fileData && fileData.length > 0 && (
            <>
              {/* Filters */}
              <CustomContainer title="Filters" color="brand" size="sm">
                <HStack spacing={8} align="start" wrap="wrap">
                  {/* From Store Filter */}
                  <FilterCheckboxGroup
                    title="From Store"
                    values={uniqueValues.fromStores}
                    selectedValues={fromStoreFilter}
                    onSelectionChange={setFromStoreFilter}
                    formatValue={(store) =>
                      capitalizeWords(store.replaceAll("a1 mart-", ""))
                    }
                    colorScheme="brand"
                  />

                  {/* To Store Filter */}
                  <FilterCheckboxGroup
                    title="To Store"
                    values={uniqueValues.toStores}
                    selectedValues={toStoreFilter}
                    onSelectionChange={setToStoreFilter}
                    formatValue={(store) =>
                      capitalizeWords(store.replaceAll("a1 mart-", ""))
                    }
                    colorScheme="brand"
                  />

                  {/* SKU Mode Filter */}
                  <FilterCheckboxGroup
                    title="SKU Mode"
                    values={uniqueValues.skuModes}
                    selectedValues={skuModeFilter}
                    onSelectionChange={setSkuModeFilter}
                    formatValue={(mode) => capitalizeWords(mode)}
                    colorScheme="brand"
                  />
                </HStack>
              </CustomContainer>

              {/* Table */}
              <AgGrid
                rowData={filteredData}
                columnDefs={colDefs}
                tableKey="picking-list"
              />
            </>
          )}
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default page;
