"use client";

import React, { useEffect, useMemo, useState } from "react";
import CustomFileUploader from "@/components/CustomInput/CustomFileUploader";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import AgGrid from "@/components/AgGrid";
import toast from "react-hot-toast";
import useBranches from "@/api/customHooks/useBranches";
import useBillingCounters from "@/api/customHooks/useBillingCounters";
import useAccountsPreloaded from "@/api/customHooks/useAccountsPreloaded";
import {
  createAccountsPreloadData,
  bulkCreateAccountsPreloadData,
  deleteAccountsPreloadDataByDate,
} from "@/api/helpers/accounts_preload_data";
import useDeleteModal from "@/customHooks/useDeleteModal";
import { FormatNumber, Flex, Text, Button, Box } from "@chakra-ui/react";
import { capitalizeWords } from "@/utils/string";
import DatePicker from "react-datepicker";
import { CustomDateTimeInput } from "@/components/CustomInput";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";
import AccountsPreloadCalendar from "@/components/AccountsPreloadCalendar";
import FileUploaderWithColumnMapping from "@/components/FileUploaderWithColumnMapping";

const TARGET_COLUMNS = [
  {
    key: "counter_code",
    label: "Counter Code",
    required: true,
    suggestedKey: "Counter",
  },
  {
    key: "branch_name",
    label: "Branch Name",
    required: true,
    suggestedKey: "OUTLET NAME",
  },
  {
    key: "no_of_bills",
    label: "No. of Bills",
    required: true,
    suggestedKey: "Total Bills",
  },
  {
    key: "no_of_items",
    label: "No. of Items",
    required: true,
    suggestedKey: "Total Qty",
  },
  {
    key: "total_sales",
    label: "Total Sales",
    required: true,
    suggestedKey: "Bill Amt With Tax",
  },
];

function LoadData() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const { branches } = useBranches();
  const { billingCounters } = useBillingCounters();

  const [mappedData, setMappedData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [displayedData, setDisplayedData] = useState(null);
  const [missingCounters, setMissingCounters] = useState([]);
  const { dataByDate, refetch: refetchPreloadData } = useAccountsPreloaded();
  const { openDeleteModal, DeleteModalComponent, setLoading } =
    useDeleteModal();

  const mappedBranches = useMemo(() => {
    const map = {};
    branches.forEach((branch) => {
      if (map[branch.branch_name]) return;

      map[branch.branch_name] = {
        ...branch,
      };
    });
    return map;
  }, [branches]);

  const mappedBillingCounters = useMemo(() => {
    const map = {};
    billingCounters.forEach((counter) => {
      if (!counter.counter_code || counter.counter_code === "") {
        return;
      }
      map[counter.counter_code] = {
        ...counter,
      };
    });

    return map;
  }, [billingCounters]);

  const handleParsedData = (data) => {
    try {
      if (!data) return;

      const missing = [];
      const mappedData = data
        .map((item) => {
          const counter = mappedBillingCounters[item.counter_code];
          const branch =
            mappedBranches[item.branch_name?.replace("A1 MART", "A1MART")];

          // Track missing counters
          if (!counter && item.counter_code) {
            const counterCode = item.counter_code;
            if (!missing.find((m) => m.counter === counterCode)) {
              missing.push({
                counter: counterCode,
                branch: item.branch_name || "Unknown",
              });
            }
          }

          // Filter out rows where counter is not mapped
          if (!counter) {
            return null;
          }

          const data = {
            no_of_bills: item.no_of_bills,
            no_of_items: parseInt(item.no_of_items),
            total_sales: item.total_sales,
            billing_counter_id: counter?.counter_id,
            branch_id: branch?.branch_id,
            counter_code: counter?.counter_code,
            counter_name: counter?.counter_name,
            branch_name: branch?.branch_name,
          };

          return data;
        })
        .filter((item) => item !== null); // Remove null entries

      setMappedData(mappedData);
      setMissingCounters(missing);
    } catch (error) {
      console.error("Error parsing data:", error);
      toast.error("Error parsing data. Please check the file format.");
    }
  };

  const handleMappedData = (data) => {
    try {
      setFileData(data);
    } catch (error) {
      console.error("Error mapping data:", error);
      toast.error("Error mapping data. Please check the file format.");
    }
  };

  useEffect(() => {
    if (fileData && mappedBillingCounters && mappedBranches) {
      handleParsedData(fileData);
    }
  }, [fileData, mappedBillingCounters, mappedBranches]);

  // Check if data exists for selected date
  const hasExistingData = useMemo(() => {
    if (!selectedDate || !dataByDate) return false;
    const dateKey = moment(selectedDate).format("YYYY-MM-DD");
    return dataByDate[dateKey] && dataByDate[dateKey].length > 0;
  }, [selectedDate, dataByDate]);

  // Load data for selected date from preloaded data
  useEffect(() => {
    if (selectedDate && dataByDate) {
      const dateKey = moment(selectedDate).format("YYYY-MM-DD");
      const dateData = dataByDate[dateKey] || [];

      if (dateData.length > 0) {
        // Format the data for display
        const formattedData = dateData.map((item) => ({
          branch_name: item.branch_name || "-",
          counter_name: item.counter_name || "-",
          counter_code: item.counter_code || "-",
          no_of_bills: item.no_of_bills || 0,
          no_of_items: item.no_of_items || 0,
          total_sales: item.total_sales || 0,
          billing_counter_id: item.billing_counter_id,
          branch_id: item.branch_id,
          exists_in_accounts_sheet: item.exists_in_accounts_sheet || 0,
        }));
        setDisplayedData(formattedData);
      } else {
        setDisplayedData([]);
      }
    }
  }, [selectedDate, dataByDate]);

  // Handle date click from calendar
  const handleDateClick = (date) => {
    setSelectedDate(date);
    // Clear uploaded file data when selecting a date from calendar
    setUploadedFile(null);
    setFileData(null);
    setMappedData(null);
    setMissingCounters([]);
  };

  const handleDelete = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    try {
      setLoading(true);
      const dateISO = moment(selectedDate).format("YYYY-MM-DD");
      const response = await deleteAccountsPreloadDataByDate(dateISO);

      if (response.code === 200) {
        toast.success("Data deleted successfully!");
        refetchPreloadData();
        setDisplayedData([]);
      } else {
        throw new Error(response.message || "Failed to delete data");
      }
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Error deleting data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    const dateStr = moment(selectedDate).format("DD/MM/YYYY");
    openDeleteModal({
      title: "Delete Accounts Preload Data",
      message: `Are you sure you want to delete all data for ${dateStr}? This action cannot be undone.`,
      onDelete: handleDelete,
    });
  };

  const handleSave = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    if (!mappedData || mappedData.length === 0) {
      toast.error("No data to save");
      return;
    }

    // Prepare data for API - format date as ISO string for Joi.date() validation
    const dataToSave = mappedData.map((item) => {
      return {
        date: moment(selectedDate).format("YYYY-MM-DD"), // Send as ISO string for Joi.date()
        billing_counter_id: item.billing_counter_id || null,
        branch_id: item.branch_id,
        no_of_bills: parseInt(item.no_of_bills) || 0,
        no_of_items: parseFloat(item.no_of_items) || 0,
        total_sales: parseFloat(item.total_sales) || 0,
      };
    });

    // Save using bulk endpoint
    try {
      const response = await bulkCreateAccountsPreloadData(dataToSave);

      if (response.code === 200) {
        toast.success("Data saved successfully!");
        refetchPreloadData();
        // Clear uploaded file data after successful save
        setUploadedFile(null);
        setFileData(null);
        setMappedData(null);
        setMissingCounters([]);
      } else {
        throw new Error(response.message || "Failed to save data");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Error saving data. Please try again."
      );
    }
  };

  const colDefs = [
    {
      field: "branch_name",
      headerName: "Branch",
      type: "capitalized",
    },
    {
      field: "counter_name",
      headerName: "Counter",
      type: "capitalized",
      cellRenderer: (props) => {
        const hasValues = props.data.exists_in_accounts_sheet > 0;
        return <Text color={hasValues ? "green" : "red"}>{props.value}</Text>;
      },
    },
    {
      field: "counter_code",
      headerName: "Counter Code",
      type: "capitalized",
    },
    {
      field: "no_of_bills",
      headerName: "No. of Bills",
      type: "number",
    },
    {
      field: "no_of_items",
      headerName: "No. of Items",
      type: "number",
    },
    {
      field: "total_sales",
      headerName: "Total Sales",
      type: "currency",
    },
  ];

  return (
    <GlobalWrapper>
      <DeleteModalComponent />
      <CustomContainer title="Load Data">
        <Flex flexDirection="column" gap="22px">
          {/* Calendar View */}
          <CustomContainer
            title={`Calendar View (${moment(selectedDate).format("MMM YYYY")})`}
            color="secondary"
            size="sm"
          >
            <AccountsPreloadCalendar
              dataByDate={dataByDate}
              currentMonth={selectedDate}
              onDateClick={handleDateClick}
              selectedDate={selectedDate}
            />
          </CustomContainer>

          <CustomContainer
            title="Items"
            color="secondary"
            size="sm"
            rightSection={
              <Flex gap={2}>
                {hasExistingData && !mappedData && (
                  <Button
                    colorPalette="red"
                    onClick={handleDeleteClick}
                    disabled={!selectedDate}
                    size="xs"
                    variant="surface"
                  >
                    Remove
                  </Button>
                )}
                {mappedData && mappedData.length > 0 && (
                  <Button
                    colorPalette="secondary"
                    onClick={handleSave}
                    disabled={!selectedDate}
                    size="xs"
                  >
                    Save
                  </Button>
                )}
              </Flex>
            }
          >
            <Flex flexDirection="column" gap="22px">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb="8px">
                  Date
                </Text>
                <DatePicker
                  portalId="root-portal"
                  selected={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    // Clear uploaded file data when changing date manually
                    setUploadedFile(null);
                    setFileData(null);
                    setMappedData(null);
                    setMissingCounters([]);
                  }}
                  customInput={
                    <CustomDateTimeInput placeholder="DD/MM/YYYY" type="date" />
                  }
                />
              </Box>

              {(mappedData && mappedData.length > 0) ||
              (displayedData || []).length > 0 ? (
                <>
                  <AgGrid
                    rowData={
                      mappedData && mappedData.length > 0
                        ? mappedData
                        : displayedData || []
                    }
                    columnDefs={colDefs}
                    tableKey="performance-load-data"
                  />
                  {missingCounters.length > 0 && (
                    <Box
                      p={4}
                      bg="red.50"
                      borderWidth="1px"
                      borderColor="red.200"
                      borderRadius="md"
                    >
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color="red.700"
                        mb={2}
                      >
                        Missing Counter Mappings:
                      </Text>
                      <Flex flexDirection="column" gap={1}>
                        {missingCounters.map((missing, index) => (
                          <Text key={index} fontSize="sm" color="red.600">
                            • Counter Code: <strong>{missing.counter}</strong>{" "}
                            (Branch: {missing.branch})
                          </Text>
                        ))}
                      </Flex>
                      <Text fontSize="xs" color="red.500" mt={2}>
                        These rows have been filtered out. Please ensure the
                        counter codes exist in the billing counters list.
                      </Text>
                    </Box>
                  )}
                </>
              ) : (
                <FileUploaderWithColumnMapping
                  targetColumns={TARGET_COLUMNS}
                  onDataMapped={handleMappedData}
                />
              )}
            </Flex>
          </CustomContainer>
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default LoadData;
