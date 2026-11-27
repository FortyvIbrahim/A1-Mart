"use client";

import useBranches from "@/api/customHooks/useBranches";
import useDesignations from "@/api/customHooks/useDesignations";
import useIncentiveGeneratedById from "@/api/customHooks/useIncentiveGeneratedById";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomInput from "@/components/CustomInput";
import { INCENTIVE_TYPES } from "@/constants/incentive_type";
import { Badge, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import Link from "next/link";
import React, { use, useEffect, useState } from "react";
import * as Yup from "yup";
import moment from "moment";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  createIncentiveGenerated,
  updateIncentiveGenerated,
} from "@/api/helpers/incentive_generated";
import useIncentiveGenerator from "@/customHooks/useIncentiveGenerator";
import AgGrid from "@/components/AgGrid";
import exportCSVFile, { exportToExcel } from "@/utils/exportCSVFile";
import { formatCurrency } from "@/utils/string";

const now = new Date();
const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

const INITIAL_VALUES = {
  startDate: defaultStartDate,
  endDate: defaultEndDate,
  branch_id: "",
  designation_id: [],
  incentive_type: "",
};

const VALIDATION_SCHEMA = Yup.object().shape({
  startDate: Yup.date().required("From date is required"),
  endDate: Yup.date().required("To date is required"),
});

const INCENTIVE_EXPORT_HEADERS = {
  employee_code: "Employee Code",
  employee_name: "Employee Name",
  incentive: "Incentive",
};

function IncentiveGeneratorForm({ params }) {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") ?? "normal";
  const isApprovalMode = type === "approval";

  const router = useRouter();
  const { mode } = use(params);
  const batchId = mode[1];
  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  const { branches } = useBranches();
  const { designations } = useDesignations();
  const { batch, loading: batchLoading } = useIncentiveGeneratedById(batchId);

  const [approved, setApproved] = useState(false);
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [filters, setFilters] = useState({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    branch_id: "",
    designation_id: [],
    incentive_type: "",
  });

  const { getGeneratedIncentives } = useIncentiveGenerator({
    filters,
  });

  useEffect(() => {
    if ((isEditMode || isViewMode) && batch) {
      setInitialValues({
        startDate: batch.start_date
          ? moment(batch.start_date).toDate()
          : defaultStartDate,
        endDate: batch.end_date
          ? moment(batch.end_date).toDate()
          : defaultEndDate,
        branch_id: batch.branch_id ?? "",
        designation_id: Array.isArray(batch.designation_id)
          ? batch.designation_id
          : batch.designation_id != null && batch.designation_id !== ""
          ? [batch.designation_id]
          : [],
        incentive_type: batch.incentive_type ?? "",
      });

      setApproved(batch.status === "approved");
    }
  }, [isEditMode, isViewMode, batch]);

  const getTitle = () => {
    if (isCreateMode) return "Generate Incentive";
    if (isViewMode) return "View Incentive";
    if (isEditMode) return "Edit Incentive";
    return "Incentive";
  };

  const handleApprove = () => {
    try {
      const promise = updateIncentiveGenerated(batchId, {
        header: {
          start_date: moment(batch.start_date),
          end_date: moment(batch.end_date),
          branch_id: batch.branch_id,
          designation_id: batch.designation_id,
          incentive_type: batch.incentive_type,
          status: approved ? "unapproved" : "approved",
        },
      });
      toast.promise(promise, {
        loading: approved
          ? "Unapproving incentive batch..."
          : "Approving incentive batch...",
        success: (response) => {
          if (response.code === 200) {
            router.push("/approvals/incentive");
            return approved
              ? "Incentive batch unapproved!"
              : "Incentive batch approved!";
          }
          throw new Error(response.message || "Failed to approve");
        },
        error: approved
          ? "Error unapproving incentive batch!"
          : "Error approving incentive batch!",
      });
    } catch (err) {
      console.error(err);
      toast.error(
        approved
          ? "Error unapproving incentive batch!"
          : "Error approving incentive batch!"
      );
    }
  };

  const buildHeader = (values) => ({
    start_date: values.startDate
      ? moment(values.startDate).format("YYYY-MM-DD")
      : null,
    end_date: values.endDate
      ? moment(values.endDate).format("YYYY-MM-DD")
      : null,
    branch_id: values.branch_id ? Number(values.branch_id) : null,
    designation_id:
      Array.isArray(values.designation_id) && values.designation_id.length > 0
        ? values.designation_id.map((id) => Number(id))
        : null,
    incentive_type: values.incentive_type || null,
  });

  const onSubmit = async (values) => {
    try {
      const header = buildHeader(values);

      const items = generateIncentives() ?? [];

      if (items.length === 0) {
        toast.error(
          "No incentives generated! Select filters and generate again."
        );
        return;
      }

      if (isCreateMode) {
        const promise = createIncentiveGenerated({
          header,
          items,
        });
        toast.promise(promise, {
          loading: "Creating incentive batch...",
          success: (response) => {
            if (
              response.code === 200 &&
              response.data?.incentive_generated_id
            ) {
              router.push("/incentive/generator");
              return "Incentive batch created!";
            }
            throw new Error(response.message || "Failed to create");
          },
          error: (err) => {
            console.error(err);
            return err.message || "Error creating incentive batch";
          },
        });
      } else if (isEditMode) {
        const promise = updateIncentiveGenerated(batchId, {
          header,
          items,
        });
        toast.promise(promise, {
          loading: "Updating incentive batch...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/incentive/generator");
              return "Incentive batch updated!";
            }
            throw new Error(response.message || "Failed to update");
          },
          error: (err) => {
            console.error(err);
            return err.message || "Error updating incentive batch";
          },
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting form!");
    }
  };

  const getPermissionKey = () => {
    if (isApprovalMode) {
      return "view_incentive_approvals";
    }

    if (isCreateMode || isEditMode) {
      return "add_incentive_generator";
    }

    return "view_incentive_generator";
  };

  if (batchLoading && (isEditMode || isViewMode)) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm headerBand title={getTitle()}>
          <Text>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const generateIncentives = () => {
    try {
      const incentives = getGeneratedIncentives();
      if (incentives.length === 0) {
        return [];
      }

      const transformedIncentives = incentives
        .map((incentive) => {
          let incentiveTotal = 0;

          if (incentive.incentive_type === "stickering") {
            incentiveTotal =
              incentive.incentive.single?.value +
              incentive.incentive.double?.value +
              incentive.incentive.looping?.value;
          } else if (
            incentive.incentive_type === "billing-checker" ||
            incentive.incentive_type === "billing-operator"
          ) {
            incentiveTotal =
              incentive.incentive.small?.value +
              incentive.incentive.medium?.value +
              incentive.incentive.large?.value;
          } else {
            incentiveTotal = incentive.incentive.value;
          }

          return {
            employee_code: incentive.employee_code,
            incentive: incentiveTotal,
            extra_data: {
              ...incentive.incentive,
              incentive_type: incentive.incentive_type,
            },
          };
        })
        .filter((incentive) => incentive.incentive > 0);

      return transformedIncentives;
    } catch (err) {
      console.error(err);
      toast.error("Error generating incentives!");
      return [];
    }
  };

  const colDefs = [
    {
      field: "employee_code",
      headerName: "ID",
      type: "id",
    },
    {
      field: "employee",
      headerName: "Image",
      type: "image",
      valueGetter: (params) => params.data?.employee?.profile_img_url,
    },
    {
      field: "employee",
      headerName: "Name",
      type: "capitalize",
      valueGetter: (params) => params.data?.employee?.employee_name,
    },
    {
      field: "extra_data.incentive_type",
      headerName: "Incentive Type",
      type: "badge-column",
      valueGetter: (params) => {
        return {
          label:
            INCENTIVE_TYPES[params.data?.extra_data?.incentive_type]?.label,
          colorScheme:
            INCENTIVE_TYPES[params.data?.extra_data?.incentive_type]?.color,
        };
      },
    },
    {
      field: "extra_data",
      headerName: "Total",
      valueGetter: (params) => {
        const extraData = params.data?.extra_data;

        if (!extraData) {
          return null;
        }

        if (extraData.incentive_type === "stickering") {
          return (
            extraData.single.actualValue +
            extraData.double.actualValue +
            extraData.looping.actualValue
          );
        } else if (
          extraData.incentive_type === "billing-checker" ||
          extraData.incentive_type === "billing-operator"
        ) {
          return (
            extraData.small?.actualValue +
            extraData.medium?.actualValue +
            extraData.large?.actualValue
          );
        }

        return extraData.actualValue;
      },
      cellRenderer: (params) => {
        const extraData = params.data?.extra_data;

        if (!extraData) {
          return null;
        }

        const getBadge = (label, data, color, format = false) => {
          if (!data) {
            return null;
          }

          let text = `${label}: ${
            format ? formatCurrency(data.actualValue) : data.actualValue
          }`;

          return (
            <Badge colorPalette={color} w="fit-content">
              {text}
            </Badge>
          );
        };

        const COLORS_MAP = {
          single: "pink",
          double: "teal",
          looping: "purple",
          small: "green",
          medium: "blue",
          large: "red",
        };

        if (extraData.incentive_type === "stickering") {
          return (
            <Flex flexDirection="column" gap="4px" p="4px">
              {extraData.single?.actualValue > 0 &&
                getBadge("Single", extraData.single, COLORS_MAP.single)}
              {extraData.double?.actualValue > 0 &&
                getBadge("Double", extraData.double, COLORS_MAP.double)}
              {extraData.looping?.actualValue > 0 &&
                getBadge("Looping", extraData.looping, COLORS_MAP.looping)}
            </Flex>
          );
        }

        if (
          extraData.incentive_type === "billing-checker" ||
          extraData.incentive_type === "billing-operator"
        ) {
          return (
            <Flex flexDirection="column" gap="4px" p="4px">
              {extraData?.small?.actualValue > 0 &&
                getBadge("Small", extraData?.small, COLORS_MAP.small, true)}
              {extraData?.medium?.actualValue > 0 &&
                getBadge("Medium", extraData?.medium, COLORS_MAP.medium, true)}
              {extraData?.large?.actualValue > 0 &&
                getBadge("Large", extraData?.large, COLORS_MAP.large, true)}
            </Flex>
          );
        }

        return formatCurrency(extraData.actualValue);
      },
    },
    {
      field: "extra_data",
      headerName: "Calculation",
      valueGetter: (params) => {
        const extraData = params.data?.extra_data;

        if (!extraData) {
          return null;
        }

        if (extraData.incentive_type === "stickering") {
          return (
            extraData.single.calculationValue +
            extraData.double.calculationValue +
            extraData.looping.calculationValue
          );
        } else if (
          extraData.incentive_type === "billing-checker" ||
          extraData.incentive_type === "billing-operator"
        ) {
          return (
            extraData?.small?.calculationValue +
            extraData?.medium?.calculationValue +
            extraData?.large?.calculationValue
          );
        }

        return extraData.calculationValue;
      },
      cellRenderer: (params) => {
        const extraData = params.data?.extra_data;

        if (!extraData) {
          return null;
        }

        const getBadge = (label, data, color) => {
          if (!data) {
            return null;
          }

          let text = `${label}: ${data.calculationValue}`;

          if (data.type.includes("percentage")) {
            text = `${text}%`;
          } else {
            text = `${label}: x${data.calculationValue}`;
          }

          return (
            <Badge colorPalette={color} w="fit-content">
              {text}
            </Badge>
          );
        };

        const COLORS_MAP = {
          single: "pink",
          double: "teal",
          looping: "purple",
          small: "green",
          medium: "blue",
          large: "red",
        };

        if (extraData.incentive_type === "stickering") {
          return (
            <Flex flexDirection="column" gap="4px" p="4px">
              {extraData.single?.actualValue > 0 &&
                getBadge("Single", extraData.single, COLORS_MAP.single)}
              {extraData.double?.actualValue > 0 &&
                getBadge("Double", extraData.double, COLORS_MAP.double)}
              {extraData.looping?.actualValue > 0 &&
                getBadge("Looping", extraData.looping, COLORS_MAP.looping)}
            </Flex>
          );
        }

        if (
          extraData.incentive_type === "billing-checker" ||
          extraData.incentive_type === "billing-operator"
        ) {
          return (
            <Flex flexDirection="column" gap="4px" p="4px">
              {extraData?.small?.actualValue > 0 &&
                getBadge("Small", extraData?.small, COLORS_MAP.small)}
              {extraData?.medium?.actualValue > 0 &&
                getBadge("Medium", extraData?.medium, COLORS_MAP.medium)}
              {extraData?.large?.actualValue > 0 &&
                getBadge("Large", extraData?.large, COLORS_MAP.large)}
            </Flex>
          );
        }

        if (extraData.type && extraData.type.includes("percentage")) {
          return `${extraData.calculationValue}%`;
        }

        return `x${extraData.calculationValue}`;
      },
    },
    {
      field: "incentive",
      headerName: "Incentive",
      type: "currency",
    },
  ];

  const handleExport = () => {
    try {
      const items = batch?.items ?? [];
      if (items.length === 0) {
        toast.error("No items to export!");
        return;
      }
      const formattedData = items.map((item) => ({
        employee_code: item.employee_code ?? "",
        employee_name: item.employee?.employee_name ?? "",
        incentive: item.incentive ?? "",
      }));

      // Map to use friendly header labels as column names in Excel
      const excelData = formattedData.map((row) => {
        const mapped = {};
        Object.entries(INCENTIVE_EXPORT_HEADERS).forEach(([key, label]) => {
          mapped[label] = row[key];
        });
        return mapped;
      });

      const fileTitle = `incentive-batch-${batchId}-${moment().format(
        "DD-MM-YYYY"
      )}`;
      exportToExcel(
        excelData.length ? [excelData] : [[]],
        ["Incentives"],
        `${fileTitle}.xlsx`
      );
      toast.success("Exported as Excel successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error exporting incentives!");
    }
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm headerBand
        title={getTitle()}
        rightSection={
          batch?.status === "approved" &&
          !isApprovalMode && (
            <Button onClick={() => handleExport()}>Export</Button>
          )
        }
      >
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={onSubmit}
          enableReinitialize
        >
          {({ values, setFieldValue, handleSubmit }) => (
            <Flex flexDirection="column" gap="22px" mb="22px">
              <Grid
                templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                gap="22px"
              >
                <CustomInput
                  label="From Date"
                  name="startDate"
                  method="date-picker"
                  type="date"
                  placeholder="From date"
                  isRequired
                  viewOnly={isViewMode}
                  onChange={(date) =>
                    setFilters((prev) => ({ ...prev, startDate: date }))
                  }
                />
                <CustomInput
                  label="To Date"
                  name="endDate"
                  method="date-picker"
                  type="date"
                  placeholder="To date"
                  isRequired
                  viewOnly={isViewMode}
                  onChange={(date) =>
                    setFilters((prev) => ({ ...prev, endDate: date }))
                  }
                />
                <CustomInput
                  label="Branch"
                  name="branch_id"
                  method="dropdown"
                  placeholder="All Branches"
                  viewOnly={isViewMode}
                  options={branches.map((b) => ({
                    value: b.branch_id,
                    label: b.branch_name,
                  }))}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      branch_id: e.target.value ?? "",
                    }))
                  }
                />
                <CustomInput
                  label="Designation"
                  name="designation_id"
                  method="multiple-dropdown"
                  placeholder="All Designations"
                  viewOnly={isViewMode}
                  options={designations.map((d) => ({
                    value: d.designation_id,
                    label: d.designation_name,
                  }))}
                  onChange={(ids) =>
                    setFilters((prev) => ({
                      ...prev,
                      designation_id: ids ?? [],
                    }))
                  }
                />
                <CustomInput
                  label="Incentive Type"
                  name="incentive_type"
                  method="dropdown"
                  placeholder="All Incentive Types"
                  viewOnly={isViewMode}
                  options={Object.values(INCENTIVE_TYPES).map((i) => ({
                    value: i.key,
                    label: i.label,
                  }))}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      incentive_type: e.target.value ?? "",
                    }))
                  }
                />
              </Grid>

              {((isApprovalMode && isViewMode) ||
                (batch?.status === "approved" && !isApprovalMode)) && (
                <AgGrid
                  rowData={batch?.items ?? []}
                  columnDefs={colDefs}
                  gridOptions={{ autoHeight: true }}
                  // tableKey="incentive-generator-items"
                />
              )}

              <Flex gap="22px" justifyContent="flex-end" mt="22px">
                <Link
                  href={
                    isApprovalMode
                      ? "/approvals/incentive"
                      : "/incentive/generator"
                  }
                >
                  <Button variant="subtle">Back</Button>
                </Link>
                {(isCreateMode || isEditMode) && (
                  <Button onClick={() => handleSubmit()}>Generate</Button>
                )}
                {isApprovalMode && isViewMode && (
                  <Button onClick={() => handleApprove()}>
                    {approved ? "Unapprove" : "Approve"}
                  </Button>
                )}
              </Flex>
            </Flex>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default IncentiveGeneratorForm;
