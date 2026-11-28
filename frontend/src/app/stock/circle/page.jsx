"use client";

import useProductCategories from "@/api/customHooks/useProductCategories";
import useProductDepartments from "@/api/customHooks/useProductDepartments";
import useProductSubcategories from "@/api/customHooks/useProductSubcategories";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { capitalizeWords, capitalizeWordsLatest } from "@/utils/string";
import { Button, Flex, Grid } from "@chakra-ui/react";
import { Formik } from "formik";
import React, { useState, useEffect } from "react";
import moment from "moment";
import * as Yup from "yup";
import useStockCircles from "@/api/customHooks/useStockCircles";
import AgGrid from "@/components/AgGrid";
import useBranches from "@/api/customHooks/useBranches";
import { useUser } from "@/contexts/UserContext";
import usePermission from "@/customHooks/usePermission";
import useDeleteModal from "@/customHooks/useDeleteModal";
import toast from "react-hot-toast";
import CustomDialog from "@/components/CustomDialog";
import { useStockCircleFilters } from "@/components/StockCircleFilters";
import { LuPlus } from "react-icons/lu";

// {
//     "id": 1,
//     "department_id": 1,
//     "category_id": 2,
//     "subcategory_id": null,
//     "period_type": "yearly",
//     "period": "2025-2026",
//     "period_start_date": null,
//     "period_end_date": null,
//     "created_at": "2025-12-19T12:22:13.000Z",
//     "updated_at": "2025-12-19T12:22:13.000Z",
//     "is_active": 1,
//     "department_name": "spares & toys",
//     "category_name": "laundry basket",
//     "subcategory_name": null
// }

/** Turn stored term range into same style as quarterly options, e.g. T1 FY 2025-26 (Apr - Jul 2025). */
export const formatTermPeriodLabel = (period) => {
  if (!period || typeof period !== "string" || !period.includes(" - ")) {
    return period;
  }
  const parts = period.split(" - ").map((s) => s.trim());
  if (parts.length !== 2) return period;
  const start = moment(parts[0], "DD MMM YYYY", true);
  const end = moment(parts[1], "DD MMM YYYY", true);
  if (!start.isValid() || !end.isValid()) return period;

  const fyStartYear = start.month() >= 3 ? start.year() : start.year() - 1;
  const fyTag = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
  const sm = start.month();

  if (sm >= 3 && sm <= 6) {
    return `T1 FY ${fyTag} (Apr - Jul ${fyStartYear})`;
  }
  if (sm >= 7 && sm <= 10) {
    return `T2 FY ${fyTag} (Aug - Nov ${fyStartYear})`;
  }
  return `T3 FY ${fyTag} (Dec ${fyStartYear} - Mar ${fyStartYear + 1})`;
};

export const getPeriod = ({
  period_type,
  period,
  period_start_date,
  period_end_date,
}) => {
  if (period_type === "term" && period) {
    return formatTermPeriodLabel(period);
  }

  if (
    period_type === "yearly" ||
    period_type === "biyearly" ||
    period_type === "quarterly"
  ) {
    return period;
  }

  if (period_type === "daily") {
    return `${moment(period_start_date).format("DD/MM/YYYY")} - ${moment(
      period_end_date
    ).format("DD/MM/YYYY")}`;
  }

  if (period_type === "monthly") {
    const start = moment(period_start_date).format("MMM YYYY");
    const end = moment(period_end_date).format("MMM YYYY");
    return start === end ? start : `${start} - ${end}`;
  }
};

export const formatStockCircleDepartments = (circle) => {
  const list = circle?.departments;
  if (Array.isArray(list) && list.length > 0) {
    return list
      .map((d) => capitalizeWords(d.department_name ?? ""))
      .filter(Boolean)
      .join(", ");
  }
  return capitalizeWords(circle?.department_name ?? "") || "—";
};

function page() {
  const { createStockCircle, stockCircles, deleteStockCircle } =
    useStockCircles();
  const { departments } = useProductDepartments();
  const { categories } = useProductCategories();
  const { subcategories } = useProductSubcategories();
  const { branches } = useBranches();
  const { employeeData } = useUser();
  const canAccessAllBranches = usePermission("access_all_branches");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const [isStoreSelected, setIsStoreSelected] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { filtered: filteredCircles, filterCard } = useStockCircleFilters(stockCircles);
  const [initialValues, setInitialValues] = useState({
    branch_id: "",
    department_ids: [],
    category_id: "",
    subcategory_id: "",
    period_type: "",
    period: "",
    period_start_date: "",
    period_end_date: "",
  });

  const filteredBranches = branches.map((branch) => ({
    value: branch.branch_id,
    label: branch.branch_name,
  }));

  useEffect(() => {
    if (!canAccessAllBranches && employeeData) {
      setInitialValues((prev) => ({
        ...prev,
        branch_id: employeeData.branch_id,
      }));
      setIsStoreSelected(true);
    } else {
      setIsStoreSelected(false);
    }
  }, [employeeData, canAccessAllBranches]);

  const periodTypeOptions = [
    { value: "yearly", label: "Yearly" },
    { value: "biyearly", label: "Biyearly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "term", label: "Term" },
    { value: "monthly", label: "Monthly" },
    { value: "daily", label: "Daily" },
  ];

  const CIRCLE_VALIDATION_SCHEMA = Yup.object().shape({
    branch_id: Yup.mixed().required("Required"),
    department_ids: Yup.array()
      .of(Yup.number().integer().positive())
      .min(1, "Select at least one department")
      .required("Required"),
    category_id: Yup.mixed().nullable(),
    subcategory_id: Yup.mixed().nullable(),
    period_type: Yup.string()
      .oneOf(["yearly", "biyearly", "quarterly", "term", "monthly", "daily"])
      .required("Required"),
    period: Yup.mixed().when("period_type", {
      is: (val) =>
        val && ["yearly", "biyearly", "quarterly", "term"].includes(val),
      then: (schema) => schema.required("Required"),
      otherwise: (schema) => schema.nullable(),
    }),
    period_start_date: Yup.mixed()
      .nullable()
      .when("period_type", {
        is: (val) => val && ["daily", "monthly"].includes(val),
        then: (schema) =>
          schema.test("is-required", "Required", function (value) {
            return value != null && value !== "";
          }),
        otherwise: (schema) => schema.nullable(),
      }),
    period_end_date: Yup.mixed()
      .nullable()
      .when("period_type", {
        is: (val) => val && ["daily", "monthly"].includes(val),
        then: (schema) =>
          schema
            .test("is-required", "Required", function (value) {
              return value != null && value !== "";
            })
            .test(
              "is-after-start",
              "End date must be after or equal to start date",
              function (endDate) {
                const { period_start_date, period_type } = this.parent;
                if (
                  !endDate ||
                  !period_start_date ||
                  !["daily", "monthly"].includes(period_type)
                )
                  return true;
                const end = moment(endDate);
                const start = moment(period_start_date);
                if (!end.isValid() || !start.isValid()) return true;
                // For monthly, compare by month/year; for daily, compare by day
                if (period_type === "monthly") {
                  return (
                    end.isAfter(start, "month") || end.isSame(start, "month")
                  );
                } else {
                  return end.isAfter(start, "day") || end.isSame(start, "day");
                }
              }
            ),
        otherwise: (schema) => schema.nullable(),
      }),
  });

  const generatePeriods = (periodType) => {
    if (!periodType) return [];

    const periods = [];
    const currentYear = moment().year();
    const startYear = currentYear; // Start from current year
    const endYear = currentYear + 1; // Go up to next year

    switch (periodType) {
      case "yearly":
        for (let year = startYear; year <= endYear; year++) {
          periods.push({
            value: `${year}-${year + 1}`,
            label: `${year}-${year + 1}`,
          });
        }
        break;

      case "biyearly":
        for (let year = startYear; year <= endYear; year++) {
          // First half: Jan - Jun
          periods.push({
            value: `01 Jan ${year} - 30 Jun ${year}`,
            label: `01 Jan ${year} - 30 Jun ${year}`,
          });
          // Second half: Jul - Dec
          periods.push({
            value: `01 Jul ${year} - 31 Dec ${year}`,
            label: `01 Jul ${year} - 31 Dec ${year}`,
          });
        }
        break;

      case "quarterly": {
        // Indian financial year: Apr-Mar. Q1 starts April; only current FY quarters.
        const m = moment();
        const fyStartYear = m.month() >= 3 ? m.year() : m.year() - 1;
        const fyTag = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
        const fmt = (d) => d.format("DD MMM YYYY");
        const quarterDefs = [
          {
            label: "Q1",
            start: moment({ year: fyStartYear, month: 3, date: 1 }),
            end: moment({ year: fyStartYear, month: 5, date: 30 }),
            months: `Apr - Jun ${fyStartYear}`,
          },
          {
            label: "Q2",
            start: moment({ year: fyStartYear, month: 6, date: 1 }),
            end: moment({ year: fyStartYear, month: 8, date: 30 }),
            months: `Jul - Sep ${fyStartYear}`,
          },
          {
            label: "Q3",
            start: moment({ year: fyStartYear, month: 9, date: 1 }),
            end: moment({ year: fyStartYear, month: 11, date: 31 }),
            months: `Oct - Dec ${fyStartYear}`,
          },
          {
            label: "Q4",
            start: moment({ year: fyStartYear + 1, month: 0, date: 1 }),
            end: moment({ year: fyStartYear + 1, month: 2, date: 31 }),
            months: `Jan - Mar ${fyStartYear + 1}`,
          },
        ];
        quarterDefs.forEach(({ label, start, end, months }) => {
          periods.push({
            value: `${fmt(start)} - ${fmt(end)}`,
            label: `${label} FY ${fyTag} (${months})`,
          });
        });
        break;
      }

      case "term": {
        // Same label shape as quarterly: `T1 FY 2025-26 (Apr - Jul 2025)`
        const m = moment();
        const fyStartYear = m.month() >= 3 ? m.year() : m.year() - 1;
        const fyTag = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
        const fmt = (d) => d.format("DD MMM YYYY");
        const termDefs = [
          {
            label: "T1",
            start: moment({ year: fyStartYear, month: 3, date: 1 }),
            end: moment({ year: fyStartYear, month: 6, date: 31 }),
            months: `Apr - Jul ${fyStartYear}`,
          },
          {
            label: "T2",
            start: moment({ year: fyStartYear, month: 7, date: 1 }),
            end: moment({ year: fyStartYear, month: 10, date: 30 }),
            months: `Aug - Nov ${fyStartYear}`,
          },
          {
            label: "T3",
            start: moment({ year: fyStartYear, month: 11, date: 1 }),
            end: moment({ year: fyStartYear + 1, month: 2, date: 31 }),
            months: `Dec ${fyStartYear} - Mar ${fyStartYear + 1}`,
          },
        ];
        termDefs.forEach(({ label, start, end, months }) => {
          periods.push({
            value: `${fmt(start)} - ${fmt(end)}`,
            label: `${label} FY ${fyTag} (${months})`,
          });
        });
        break;
      }

      default:
        break;
    }

    return periods;
  };

  const getCreateStockCircleErrorMessage = (err) => {
    const data = err?.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data?.message) return data.message;
    if (data?.msg) return data.msg;
    if (Array.isArray(data?.errors) && data.errors.length) {
      return data.errors.map((e) => e?.message || String(e)).join("; ");
    }
    if (err?.message) return err.message;
    return "Failed to create stock circle";
  };

  const handleSubmit = async (values, { resetForm }) => {
    const isMonthly = values.period_type === "monthly";
    const data = {
      branch_id: Number(values.branch_id),
      department_ids: values.department_ids.map(Number),
      category_id: values.category_id ? Number(values.category_id) : null,
      subcategory_id: values.subcategory_id
        ? Number(values.subcategory_id)
        : null,
      period_type: values.period_type,
      period: values.period ? values.period : null,
      period_start_date: values.period_start_date
        ? (isMonthly
            ? moment(values.period_start_date).startOf("month")
            : moment(values.period_start_date)
          ).format("YYYY-MM-DD")
        : null,
      period_end_date: values.period_end_date
        ? (isMonthly
            ? moment(values.period_end_date).endOf("month")
            : moment(values.period_end_date)
          ).format("YYYY-MM-DD")
        : null,
    };

    try {
      await toast.promise(createStockCircle(data), {
        loading: "Creating stock circle...",
        success: (response) => {
          if (
            response.code === 200 ||
            response.code === 201 ||
            response.success
          ) {
            resetForm();
            setCreateOpen(false);
            return "Stock circle created successfully!";
          }
          throw new Error(response.message || "Failed to create stock circle");
        },
        error: (err) => {
          console.error("Error creating stock circle:", err);
          return getCreateStockCircleErrorMessage(err);
        },
      });
    } catch {
      // Handled by toast.promise
    }
  };

  const handleDelete = (id) => {
    openDeleteModal({
      title: "Delete Stock Circle",
      message:
        "Are you sure you want to delete this stock circle? This action cannot be undone.",
      onDelete: () => {
        toast.promise(deleteStockCircle(id), {
          loading: "Deleting stock circle...",
          success: (response) => {
            if (response.code === 200 || response.success) {
              return "Stock circle deleted successfully!";
            } else {
              throw new Error(
                response.message || "Failed to delete stock circle"
              );
            }
          },
          error: (err) => {
            console.error("Error deleting stock circle:", err);
            return err.message || "Error deleting stock circle";
          },
        });
      },
    });
  };

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
      field: "period_type",
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
        props.data?.category_name
          ? capitalizeWordsLatest(props.data.category_name)
          : "All categories",
    },
    {
      headerName: "Subcategory",
      valueGetter: (props) =>
        props.data?.subcategory_name
          ? capitalizeWordsLatest(props.data.subcategory_name)
          : "All subcategories",
    },
    {
      headerName: "Period",
      valueGetter: (props) => getPeriod(props.data) ?? "-",
    },
    {
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        return [
          {
            label: "Delete",
            value: "delete",
            onClick: () => handleDelete(props.data.id),
            type: "danger",
          },
        ];
      },
    },
  ];

  return (
    <GlobalWrapper permissionKey="view_circle">
      <DeleteModalComponent />
      <CustomContainer
        title="Stock Circles"
        rightSection={
          <Button onClick={() => setCreateOpen(true)}>
            <LuPlus /> Create Circle
          </Button>
        }
      >
        <Flex direction="column" gap="16px">
          {filterCard}
          <AgGrid
            rowData={filteredCircles}
            colDefs={colDefs}
            tableKey="stock-circle"
          />
        </Flex>
      </CustomContainer>

      <Formik
        initialValues={initialValues}
        validationSchema={CIRCLE_VALIDATION_SCHEMA}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({
          handleSubmit,
          setValues,
          setFieldTouched,
          values,
          resetForm,
          isSubmitting,
        }) => {
          const periodOptions = generatePeriods(values.period_type);

          // Categories belonging to any selected department
          const selectedDepartmentIds = new Set(
            (Array.isArray(values.department_ids) ? values.department_ids : []).map(Number)
          );
          const filteredCategories = selectedDepartmentIds.size
            ? categories.filter((category) =>
                selectedDepartmentIds.has(Number(category.department_id))
              )
            : [];

          // Subcategories of the selected category
          const filteredSubcategories = values.category_id
            ? subcategories.filter(
                (subcategory) =>
                  Number(subcategory.category_id) === Number(values.category_id)
              )
            : [];

          const isDateRangePeriod =
            values.period_type === "daily" || values.period_type === "monthly";

          const close = () => {
            resetForm();
            setCreateOpen(false);
          };

          return (
            <CustomDialog
              open={createOpen}
              onOpenChange={(e) => {
                if (!e.open) close();
              }}
              title="Create Stock Circle"
              maxW="800px"
              contentProps={{ w: "100%" }}
              footer={
                <>
                  <Button variant="outline" h="42px" px="20px" fontSize="13px" onClick={close}>
                    Cancel
                  </Button>
                  <Button
                    h="40px"
                    px="20px"
                    fontSize="13px"
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Create Circle
                  </Button>
                </>
              }
            >
              {/* Figma "Modal / Create Stock Circle": two columns, 16px apart, 18px between rows. */}
              <Grid
                templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                columnGap="16px"
                rowGap="18px"
              >
                <CustomInput
                  label="Branch"
                  isRequired
                  placeholder="Select branch"
                  name="branch_id"
                  method="dropdown"
                  options={filteredBranches}
                  disabled={isStoreSelected}
                />
                <CustomInput
                  label="Period type"
                  isRequired
                  placeholder="Select period type"
                  name="period_type"
                  method="dropdown"
                  options={periodTypeOptions}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setValues(
                      (prev) => ({
                        ...prev,
                        period_type: nextType,
                        period: "",
                        period_start_date: "",
                        period_end_date: "",
                      }),
                      false
                    );
                    setFieldTouched("period", false, false);
                    setFieldTouched("period_start_date", false, false);
                    setFieldTouched("period_end_date", false, false);
                  }}
                />
                {isDateRangePeriod ? (
                  <>
                    <CustomInput
                      label={values.period_type === "monthly" ? "Start month" : "Start date"}
                      isRequired
                      placeholder={
                        values.period_type === "monthly"
                          ? "Select start month"
                          : "Select start date"
                      }
                      name="period_start_date"
                      method="date-picker"
                      type={values.period_type === "monthly" ? "month" : "date"}
                    />
                    <CustomInput
                      label={values.period_type === "monthly" ? "End month" : "End date"}
                      isRequired
                      placeholder={
                        values.period_type === "monthly" ? "Select end month" : "Select end date"
                      }
                      name="period_end_date"
                      method="date-picker"
                      type={values.period_type === "monthly" ? "month" : "date"}
                    />
                  </>
                ) : (
                  <CustomInput
                    label="Period"
                    isRequired
                    placeholder="Select period"
                    name="period"
                    method="dropdown"
                    options={periodOptions}
                    disabled={!values.period_type}
                  />
                )}
                <CustomInput
                  label="Departments"
                  isRequired
                  placeholder="Select departments"
                  name="department_ids"
                  method="multiple-dropdown"
                  options={departments.map((department) => ({
                    value: department.department_id,
                    label: capitalizeWords(department.department_name),
                  }))}
                  onChange={(nextDeptIds) => {
                    setValues(
                      (prev) => ({
                        ...prev,
                        department_ids: Array.isArray(nextDeptIds)
                          ? nextDeptIds
                          : prev.department_ids,
                        category_id: "",
                        subcategory_id: "",
                      }),
                      false
                    );
                  }}
                />
                <CustomInput
                  label="Category"
                  placeholder="All categories"
                  name="category_id"
                  method="searchable-dropdown"
                  options={filteredCategories.map((category) => ({
                    value: category.category_id,
                    label: capitalizeWords(category.category_name),
                  }))}
                  disabled={selectedDepartmentIds.size === 0}
                  onChange={(value) => {
                    setValues(
                      (prev) => ({
                        ...prev,
                        category_id: value ?? "",
                        subcategory_id: "",
                      }),
                      false
                    );
                  }}
                />
                <CustomInput
                  label="Subcategory"
                  placeholder="All subcategories"
                  name="subcategory_id"
                  method="searchable-dropdown"
                  options={filteredSubcategories.map((subcategory) => ({
                    value: subcategory.subcategory_id,
                    label: capitalizeWords(subcategory.subcategory_name),
                  }))}
                  disabled={!values.category_id}
                />
              </Grid>
            </CustomDialog>
          );
        }}
      </Formik>
    </GlobalWrapper>
  );
}

export default page;
