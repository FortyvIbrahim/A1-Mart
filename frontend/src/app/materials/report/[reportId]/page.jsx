"use client";

import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import Image from "next/image";
import { Formik } from "formik";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AgGrid from "@/components/AgGrid";
import useMaterials from "@/api/customHooks/useMaterials";
import useMaterialRequests from "@/api/customHooks/useMaterialRequests";
import usePurchaseOrders from "@/api/customHooks/usePurchaseOrders";
import usePurchaseEntries from "@/api/customHooks/usePurchaseEntries";
import useBranches from "@/api/customHooks/useBranches";
import useMasterList from "@/api/customHooks/useMasterList";
import useMaterialsCategory from "@/api/customHooks/useMaterialsCategory";
import { capitalizeWords } from "@/utils/string";
import { REPORT_CATEGORIES } from "../reportData";
import { REPORT_GENERATORS } from "./reportGenerators";
import exportCSVFile from "@/utils/exportCSVFile";
import { generatePDFWithToast } from "@/utils/pdfGenerator";
import moment from "moment";

const ID_KEY_PATTERN = (key) =>
  key === "id" || key.endsWith("_id") || key.endsWith("Id");

function getSortedKeys(firstRow) {
  const keys = Object.keys(firstRow).filter((k) => !ID_KEY_PATTERN(k));
  return keys.includes("imageUrl")
    ? ["imageUrl", ...keys.filter((k) => k !== "imageUrl")]
    : keys;
}

function isNumericColumn(key, firstRow) {
  const value = firstRow[key];
  return typeof value === "number" || (value != null && !isNaN(Number(value)));
}

function ReportResultsGrid({
  reportResults,
  reportId,
  onPinnedBottomRowDataChange,
}) {
  const colDefs = useMemo(() => {
    if (!reportResults || reportResults.length === 0) return [];
    const firstRow = reportResults[0];
    const sortedKeys = getSortedKeys(firstRow);

    return sortedKeys.map((key) => {
      const headerName = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();

      if (key === "imageUrl") {
        return {
          field: key,
          headerName: "Image",
          maxWidth: 120,
          resizable: false,
          filter: false,
          cellRenderer: (props) => {
            if (props.node?.rowPinned === "bottom") {
              return null;
            }
            if (!props.value) {
              return (
                <Flex
                  justifyContent="center"
                  alignItems="center"
                  height={"100%"}
                >
                  <Flex
                    justifyContent="center"
                    alignItems="center"
                    height="80%"
                    width="100%"
                    backgroundColor="gray.100"
                    borderRadius="md"
                    padding="4px"
                  >
                    <Text color="gray.500" fontSize="2xs">
                      No Image
                    </Text>
                  </Flex>
                </Flex>
              );
            }
            return (
              <Flex justifyContent="center" alignItems="center" height={"100%"}>
                <Image
                  src={props.value}
                  alt="Material Image"
                  width={100}
                  height={100}
                />
              </Flex>
            );
          },
        };
      }

      const isMonetaryField =
        /(Amount|Value|Rate|Price|Cost|Tax|Discount|Adjustment|Variance|Average|Total)$/i.test(
          key
        );
      const isPercentageField = /(%|Rate|Percentage)$/i.test(key);
      const isCountField =
        /(Count|Quantity|Stock|Items|Requests|POs|Invoices)$/i.test(key);
      const isStatusField = /(Status)$/i.test(key);

      return {
        field: key,
        headerName: headerName,
        resizable: true,
        cellRenderer: (props) => {
          const value = props.value;
          if (isStatusField && typeof value === "string") {
            const statusLower = value.toLowerCase();
            let colorPalette = "gray";
            if (
              statusLower === "complete" ||
              statusLower === "approved" ||
              statusLower === "active" ||
              statusLower === "pe created"
            ) {
              colorPalette = "green";
            } else if (
              statusLower === "pending" ||
              statusLower === "incomplete"
            ) {
              colorPalette = "yellow";
            } else if (
              statusLower === "rejected" ||
              statusLower === "inactive" ||
              statusLower === "cancelled"
            ) {
              colorPalette = "red";
            }
            return <Badge colorPalette={colorPalette}>{value}</Badge>;
          }
          if (typeof value === "number") {
            if (isMonetaryField || isPercentageField) {
              return value.toFixed(2);
            }
            return Math.round(value);
          }
          return value ?? "-";
        },
      };
    });
  }, [reportResults]);

  const pinnedBottomRowData = useMemo(() => {
    if (!reportResults || reportResults.length === 0) return [];
    const firstRow = reportResults[0];
    const sortedKeys = getSortedKeys(firstRow);
    const firstDataKey =
      sortedKeys.find((k) => k !== "imageUrl") || sortedKeys[0];
    const totalsRow = {};

    sortedKeys.forEach((key) => {
      if (key === "imageUrl") {
        totalsRow[key] = "";
        return;
      }
      if (isNumericColumn(key, firstRow)) {
        const sum = reportResults.reduce(
          (acc, row) => acc + (Number(row[key]) || 0),
          0
        );
        const isMonetaryField =
          /(Amount|Value|Rate|Price|Cost|Tax|Discount|Adjustment|Variance|Average|Total)$/i.test(
            key
          );
        const isPercentageField = /(%|Rate|Percentage)$/i.test(key);
        totalsRow[key] =
          isMonetaryField || isPercentageField
            ? Math.round(sum * 100) / 100
            : Math.round(sum);
      } else {
        totalsRow[key] = key === firstDataKey ? "Total" : "";
      }
    });

    return [totalsRow];
  }, [reportResults]);

  useEffect(() => {
    onPinnedBottomRowDataChange?.(pinnedBottomRowData);
  }, [pinnedBottomRowData, onPinnedBottomRowDataChange]);

  const gridOptions = useMemo(
    () => ({
      rowHeight: 80,
      pinnedBottomRowData,
      getRowStyle: (params) => {
        if (params.node?.rowPinned === "bottom") {
          return {
            fontWeight: "bold",
            backgroundColor: "var(--chakra-colors-gray-100)",
          };
        }
        return null;
      },
    }),
    [pinnedBottomRowData]
  );

  return (
    <AgGrid
      rowData={reportResults}
      tableKey={`materials-report-${reportId}`}
      gridOptions={gridOptions}
      colDefs={colDefs}
    />
  );
}

function ReportFilterPage({ params }) {
  const router = useRouter();
  const { reportId } = use(params);

  // Find the report definition
  let reportDefinition = null;
  for (const category of REPORT_CATEGORIES) {
    const found = category.reports.find((r) => r.id === reportId);
    if (found) {
      reportDefinition = found;
      break;
    }
  }

  if (!reportDefinition) {
    return (
      <GlobalWrapper permissionKey="view_materials">
        <CustomContainer title="Report Not Found">
          <VStack spacing={4}>
            <Text>Report not found.</Text>
            <Link href="/materials/report">
              <Button>Back to Reports</Button>
            </Link>
          </VStack>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  // Fetch data hooks
  const { materials } = useMaterials({ withRate: true });
  const { requests: materialRequests } = useMaterialRequests();
  const { purchaseOrders } = usePurchaseOrders();
  const { purchaseEntries } = usePurchaseEntries();
  const { branches } = useBranches();
  const { masterList } = useMasterList();
  const { materialsCategory } = useMaterialsCategory();

  const [reportResults, setReportResults] = useState([]);
  const [pinnedBottomRowData, setPinnedBottomRowData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get filter options
  const vendorOptions = masterList
    .filter((vendor) => vendor.person_type === 2 && vendor.status === 1)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({
      value: item.master_id,
      label: capitalizeWords(item.name),
    }));

  const supplierOptions = masterList
    .filter((sup) => sup.person_type === 1 && sup.status === 1)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({
      value: item.master_id,
      label: capitalizeWords(item.name),
    }));

  const branchOptions = branches
    .filter((branch) => branch.is_active)
    .map((item) => ({
      value: item.branch_id,
      label: item.branch_name,
    }));

  const categoryOptions = materialsCategory
    .filter((cat) => cat.is_active)
    .map((item) => ({
      value: item.material_category_id,
      label: item.category_name,
    }));

  const materialOptions = materials
    .filter((mat) => mat.is_active)
    .map((item) => ({
      value: item.material_id,
      label: item.name,
    }));

  // Build initial values based on available filters
  const getInitialValues = () => {
    const values = {};
    reportDefinition.filters?.forEach((filter) => {
      if (filter === "Date Range") {
        values.startDate = null;
        values.endDate = null;
      } else if (filter === "Category") {
        values.category = "";
      } else if (filter === "Supplier") {
        values.supplier = "";
      } else if (filter === "Vendor") {
        values.vendor = "";
      } else if (filter === "Branch") {
        values.branch = "";
      } else if (filter === "Material") {
        values.material = "";
      } else if (filter === "Threshold Level") {
        values.thresholdLevel = "";
      } else if (filter === "Tax Range") {
        values.minTax = "";
        values.maxTax = "";
      } else if (filter === "Overdue Days") {
        values.overdueDays = "";
      }
    });
    return values;
  };

  const handleGenerateReport = (values) => {
    setIsGenerating(true);
    try {
      const generator = REPORT_GENERATORS[reportId];
      if (!generator) {
        console.error("No generator found for report:", reportId);
        setIsGenerating(false);
        return;
      }

      const data = {
        materials,
        materialRequests,
        purchaseOrders,
        purchaseEntries,
        branches,
      };

      const result = generator(data, values);
      setReportResults(result);
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      if (reportResults.length === 0) return;

      const firstRow = reportResults[0];
      const exportKeys = Object.keys(firstRow).filter(
        (k) => k !== "id" && !k.endsWith("_id") && !k.endsWith("Id")
      );
      const headers = {};
      exportKeys.forEach((key) => {
        const headerName = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        headers[key] = headerName;
      });

      const dataWithTotal = [
        ...reportResults.map((row) => {
          const out = {};
          exportKeys.forEach((k) => {
            out[k] = row[k];
          });
          return out;
        }),
        ...pinnedBottomRowData.map((row) => {
          const out = {};
          exportKeys.forEach((k) => {
            out[k] = row[k];
          });
          return out;
        }),
      ];

      const fileName = `${reportDefinition.name}-${moment().format(
        "DD-MM-YYYY-HH-mm-ss"
      )}.pdf`;

      const response = await generatePDFWithToast({
        data: dataWithTotal,
        headers: headers,
        pdf_name: fileName,
        title: reportDefinition.name,
        size: "md",
        orientation: "landscape",
        s3_folder: `reports/${reportDefinition.name}`,
      });
      const pdfUrl =
        response.code === 200 ? response.data.pdf_url : response.pdf_url;
      if (pdfUrl) {
        window.open(pdfUrl, "_blank");
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  };

  return (
    <GlobalWrapper permissionKey="view_materials_report">
      <CustomContainer title={reportDefinition.name}>
        <VStack gap={6} align="stretch">
          <Box>
            <Text fontSize="sm" color="gray.600" mb={4}>
              {reportDefinition.description}
            </Text>
          </Box>

          <CustomContainer title="Filters" size="sm" color="secondary">
            <Formik
              initialValues={getInitialValues()}
              onSubmit={handleGenerateReport}
              enableReinitialize
            >
              {({ handleSubmit, values }) => {
                return (
                  <Box>
                    <Grid
                      templateColumns={{
                        base: "1fr",
                        md: "repeat(2, 1fr)",
                        lg: "repeat(3, 1fr)",
                      }}
                      gap={4}
                      mb={4}
                    >
                      {reportDefinition.filters?.map((filter, index) => {
                        if (filter === "Date Range") {
                          return (
                            <Box key={index}>
                              <Flex gap={2}>
                                <CustomInput
                                  label="Start Date"
                                  name="startDate"
                                  method="date-picker"
                                  placeholder="Start Date"
                                />
                                <CustomInput
                                  label="End Date"
                                  name="endDate"
                                  method="date-picker"
                                  placeholder="End Date"
                                />
                              </Flex>
                            </Box>
                          );
                        } else if (filter === "Category") {
                          return (
                            <CustomInput
                              key={index}
                              label="Category"
                              name="category"
                              method="dropdown"
                              placeholder="Select Category"
                              options={[
                                { value: "no-category", label: "No Category" },
                                ...categoryOptions,
                              ]}
                            />
                          );
                        } else if (filter === "Supplier") {
                          return (
                            <CustomInput
                              key={index}
                              label="Supplier"
                              name="supplier"
                              method="searchable-dropdown"
                              placeholder="Select Supplier"
                              options={supplierOptions}
                            />
                          );
                        } else if (filter === "Vendor") {
                          return (
                            <CustomInput
                              key={index}
                              label="Vendor"
                              name="vendor"
                              method="searchable-dropdown"
                              placeholder="Select Vendor"
                              options={vendorOptions}
                            />
                          );
                        } else if (filter === "Branch") {
                          return (
                            <CustomInput
                              key={index}
                              label="Branch"
                              name="branch"
                              method="dropdown"
                              placeholder="Select Branch"
                              options={branchOptions}
                            />
                          );
                        } else if (filter === "Material") {
                          return (
                            <CustomInput
                              key={index}
                              label="Material"
                              name="material"
                              method="searchable-dropdown"
                              placeholder="Select Material"
                              options={materialOptions}
                            />
                          );
                        } else if (filter === "Threshold Level") {
                          return (
                            <CustomInput
                              key={index}
                              label="Threshold Level"
                              name="thresholdLevel"
                              type="number"
                              placeholder="Enter threshold"
                            />
                          );
                        } else if (filter === "Tax Range") {
                          return (
                            <Box key={index}>
                              <Flex gap={2}>
                                <CustomInput
                                  label="Min Tax %"
                                  name="minTax"
                                  type="number"
                                  placeholder="Min"
                                />
                                <CustomInput
                                  label="Max Tax %"
                                  name="maxTax"
                                  type="number"
                                  placeholder="Max"
                                />
                              </Flex>
                            </Box>
                          );
                        } else if (filter === "Overdue Days") {
                          return (
                            <CustomInput
                              key={index}
                              label="Overdue Days"
                              name="overdueDays"
                              type="number"
                              placeholder="Minimum days overdue"
                            />
                          );
                        } else if (filter === "PO Number") {
                          return (
                            <CustomInput
                              key={index}
                              label="PO Number"
                              name="poNumber"
                              type="text"
                              placeholder="Enter PO Number"
                            />
                          );
                        }
                        return null;
                      })}
                    </Grid>

                    <Flex gap={4} justifyContent="flex-end">
                      <Link href="/materials/report">
                        <Button variant="outline">Cancel</Button>
                      </Link>
                      <Button onClick={handleSubmit} isLoading={isGenerating}>
                        Generate Report
                      </Button>
                    </Flex>
                  </Box>
                );
              }}
            </Formik>
          </CustomContainer>

          {/* Report Results Section */}
          {reportResults.length > 0 && (
            <CustomContainer
              title="Report Results"
              size="sm"
              color="secondary"
              rightSection={
                <Button
                  size="xs"
                  colorPalette="secondary"
                  onClick={handleExportPDF}
                >
                  Export
                </Button>
              }
            >
              <ReportResultsGrid
                reportResults={reportResults}
                reportId={reportId}
                onPinnedBottomRowDataChange={setPinnedBottomRowData}
              />
            </CustomContainer>
          )}

          {reportResults.length === 0 && !isGenerating && (
            <CustomContainer title="Report Results" size="sm" color="secondary">
              <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
                Select filters and click "Generate Report" to view results
              </Text>
            </CustomContainer>
          )}
        </VStack>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ReportFilterPage;
