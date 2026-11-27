"use client";
import useEmployee from "@/api/customHooks/useEmployee";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { capitalizeWords } from "@/utils/string";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  createAccountSheet,
  updateAccountSheet,
} from "@/api/helpers/accounts_sheet";
import moment from "moment";
import { useRouter } from "next/navigation";
import useAccountSheetById from "@/api/customHooks/useAccountSheetById";
import {
  BILLING_CHECKER_DESIGNATION_ID,
  BILLING_OPERATOR_DESIGNATION_ID,
} from "@/constants/designation";
import useBillingCounters from "@/api/customHooks/useBillingCounters";
import useBranches from "@/api/customHooks/useBranches";
import usePermission from "@/customHooks/usePermission";
import { useUser } from "@/contexts/UserContext";
import useAccountsPreloaded from "@/api/customHooks/useAccountsPreloaded";
import useAccountsSheet from "@/api/customHooks/useAccountsSheet";

function designationIdForAccountSheetRow(sheet, employees) {
  const emp = employees.find((e) => e.employee_code === sheet.employee_id);
  return emp?.designation_id ?? null;
}

function accountSheetMatchesBranchFilter(sheet, branchId) {
  if (branchId === null || branchId === undefined || branchId === "") {
    return true;
  }
  if (sheet.branch_id == null || sheet.branch_id === "") {
    return true;
  }
  return Number(sheet.branch_id) === Number(branchId);
}

function accountSheetsShareBillingCounter(sheet, billingCounterId) {
  const sheetCounter =
    sheet.billing_counter_id != null && sheet.billing_counter_id !== ""
      ? Number(sheet.billing_counter_id)
      : null;
  const selected =
    billingCounterId != null && billingCounterId !== ""
      ? Number(billingCounterId)
      : null;
  return sheetCounter === selected;
}

/** Billing checker / operator: at most one entry per designation per day per billing counter (per branch when branch_id is present on rows). */
function getBillingDesignationDuplicateWarning({
  accountSheets,
  employees,
  date,
  branchId,
  billingCounterId,
  selectedEmployeeCode,
  excludeSheetId,
}) {
  if (!selectedEmployeeCode || !date) return null;
  const selected = employees.find(
    (e) => e.employee_code === selectedEmployeeCode
  );
  if (!selected) return null;
  const desId = selected.designation_id;
  if (
    desId !== BILLING_CHECKER_DESIGNATION_ID &&
    desId !== BILLING_OPERATOR_DESIGNATION_ID
  ) {
    return null;
  }
  const dayKey = moment(date).format("YYYY-MM-DD");
  for (const sheet of accountSheets) {
    if (excludeSheetId != null && sheet.id === excludeSheetId) continue;
    const sheetDay = moment(sheet.date).format("YYYY-MM-DD");
    if (sheetDay !== dayKey) continue;
    if (!accountSheetMatchesBranchFilter(sheet, branchId)) continue;
    if (!accountSheetsShareBillingCounter(sheet, billingCounterId)) continue;
    const sheetDesId = designationIdForAccountSheetRow(sheet, employees);
    if (sheetDesId !== desId) continue;
    const name =
      (sheet.employee_name &&
        capitalizeWords(String(sheet.employee_name))) ||
      sheet.employee_name ||
      "another employee";
    return { existingName: name };
  }
  return null;
}

const TENDER_VALIDATION = Yup.object().shape({
  sales: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be ≥ 0")
    .required("Required"),
  type: Yup.string()
    .oneOf(["excess", "short", "exact"], "Invalid option")
    .required("Required"),
  reason: Yup.string().optional(),
});

const getAccountValidationSchema = (employees) => {
  return Yup.object().shape({
    date: Yup.date().required("Required"),
    branch_id: Yup.number().integer().positive().required("Required"),
    employee_id: Yup.string().required("Required"),
    billing_counter_id: Yup.number()
      .nullable()
      .test(
        "billing-counter-required",
        "Billing counter is required",
        function (value) {
          const { employee_id } = this.parent;
          if (!employee_id) return true; // No validation if no employee selected

          const employee = employees.find(
            (emp) => emp.employee_code === employee_id
          );

          if (!employee) return true; // No validation if employee not found

          // Required only for BILLING_CHECKER or BILLING_OPERATOR
          const isRequired =
            employee.designation_id === BILLING_CHECKER_DESIGNATION_ID ||
            employee.designation_id === BILLING_OPERATOR_DESIGNATION_ID;

          if (isRequired) {
            return value !== null && value !== undefined;
          }

          return true; // Optional for other designations
        }
      ),
    no_of_bills: Yup.number()
      .typeError("Must be a number")
      .integer("Must be an integer")
      .min(0, "Must be ≥ 0")
      .required("Required"),
    no_of_items: Yup.number()
      .typeError("Must be a number")
      .integer("Must be an integer")
      .min(0, "Must be ≥ 0")
      .required("Required"),
    total_sales: Yup.number()
      .typeError("Must be a number")
      .min(0, "Must be ≥ 0")
      .required("Required"),
    cash: TENDER_VALIDATION,
    card: TENDER_VALIDATION,
    paytm: TENDER_VALIDATION,
  });
};

const INITIAL_VALUES = {
  date: new Date(),
  branch_id: null,
  employee_id: "",
  billing_counter_id: null,
  no_of_bills: "",
  no_of_items: "",
  total_sales: "",
  cash: { sales: "", type: "", reason: "" },
  card: { sales: "", type: "", reason: "" },
  paytm: { sales: "", type: "", reason: "" },
};

export default function AccountsForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const { fetchData, accountSheet } = useAccountSheetById(mode[1] ?? 0);
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  const { employees } = useEmployee({ allBranches: isViewMode || isEditMode });
  const { billingCounters } = useBillingCounters();
  const { branches } = useBranches();
  const canAccessAllBranches = usePermission("access_all_branches");
  const { employeeData } = useUser();
  const { dataByDate: preloadedAccountsData } = useAccountsPreloaded();
  const { accountSheets } = useAccountsSheet();

  const filteredEmployees = employees
    .filter((item) => {
      return (
        !item.terminated &&
        (selectedBranchId === null || item.branch_id == selectedBranchId)
      );
    })
    .map((item) => {
      const name = capitalizeWords(item.employee_name);
      const designation = capitalizeWords(item.designation_name ?? "");
      const branch = capitalizeWords(item.branch_name ?? "");
      return {
        value: item.employee_code,
        label: `${item.employee_code} - ${name}`,
        searchText: [
          item.employee_code,
          item.employee_name,
          item.designation_name,
          item.branch_name,
        ]
          .filter(Boolean)
          .join(" "),
        designation_name: designation,
        branch_name: branch,
      };
    });

  // Filter billing counters by branch
  const filteredBillingCounters = selectedBranchId
    ? billingCounters.filter((counter) => counter.branch_id == selectedBranchId)
    : billingCounters;

  // Branch options
  const branchOptions = branches
    .filter((branch) => branch.is_active !== false)
    .map((branch) => ({
      value: branch.branch_id,
      label: branch.branch_name,
    }));

  // Set initial branch based on permission in create mode
  useEffect(() => {
    if (isCreateMode && !canAccessAllBranches && employeeData?.branch_id) {
      setSelectedBranchId(employeeData.branch_id);
      setInitialValues((prev) => ({
        ...prev,
        branch_id: employeeData.branch_id,
      }));
    }
  }, [isCreateMode, canAccessAllBranches, employeeData]);

  useEffect(() => {
    if (isEditMode || isViewMode) {
      fetchData();
    }
  }, [isEditMode, isViewMode]);

  useEffect(() => {
    if (accountSheet) {
      setInitialValues({
        date: moment(accountSheet.date),
        branch_id: accountSheet.branch_id || null,
        employee_id: accountSheet.employee_id,
        billing_counter_id: accountSheet.billing_counter_id || null,
        no_of_bills: accountSheet.no_of_bills,
        no_of_items: accountSheet.no_of_items,
        total_sales: accountSheet.total_sales,
        cash: {
          sales: accountSheet.cash_sales,
          type: accountSheet.cash_type,
          reason: accountSheet.cash_reason,
        },
        card: {
          sales: accountSheet.card_sales,
          type: accountSheet.card_type,
          reason: accountSheet.card_reason,
        },
        paytm: {
          sales: accountSheet.paytm_sales,
          type: accountSheet.paytm_type,
          reason: accountSheet.paytm_reason,
        },
      });

      // Set branch ID for filtering billing counters when loading existing sheet
      if (accountSheet.branch_id) {
        setSelectedBranchId(accountSheet.branch_id);
      } else if (accountSheet.employee_id) {
        const employee = employees.find(
          (emp) => emp.employee_code === accountSheet.employee_id
        );
        if (employee?.branch_id) {
          setSelectedBranchId(employee.branch_id);
        }
      }
    }
  }, [accountSheet, employees]);

  const getTenderRow = (key, title, setFieldValue) => {
    return (
      <Grid
        templateColumns={{ base: "1fr", sm: "68px 1fr 1fr" }}
        gap="14px"
        alignItems="start"
        w="100%"
      >
        <Text
          fontWeight="600"
          fontSize="13.5px"
          color="fg"
          pt={{ base: "0px", sm: "28px" }}
        >
          {title}
        </Text>

        <CustomInput
          label="Value"
          isRequired
          placeholder="0"
          name={`${key}.sales`}
          method="text"
          type="number"
          viewOnly={isViewMode}
          onChange={(e) => {
            if (e.target.value) {
              const value = parseInt(e.target.value);

              if (value == 0) {
                setFieldValue(`${key}.type`, "exact");
              }
            }
          }}
        />
        <CustomInput
          label="Type"
          isRequired
          placeholder="Select type (Excess/Short)"
          name={`${key}.type`}
          method="dropdown"
          viewOnly={isViewMode}
          options={[
            { value: "excess", label: "Excess" },
            { value: "short", label: "Short" },
            { value: "exact", label: "Correct" },
          ]}
        />
      </Grid>
    );
  };

  const isBillingOperatorEmployee = (emp, sheet) => {
    const desId = emp?.designation_id ?? sheet?.designation_id;
    const desName = String(
      emp?.designation_name ?? sheet?.designation_name ?? ""
    )
      .trim()
      .toLowerCase();
    return (
      Number(desId) === BILLING_OPERATOR_DESIGNATION_ID ||
      desName === "billing operator"
    );
  };

  const handleCreate = async (values) => {
    if (!isViewMode) {
      const dup = getBillingDesignationDuplicateWarning({
        accountSheets,
        employees,
        date: values.date,
        branchId: values.branch_id,
        billingCounterId: values.billing_counter_id,
        selectedEmployeeCode: values.employee_id,
        excludeSheetId:
          isEditMode && accountSheet?.id != null ? accountSheet.id : null,
      });
      if (dup) {
        toast.error(
          `Data entry already done by ${dup.existingName} for this day.`
        );
        return;
      }
    }
    try {
      const data = {
        date: moment(values.date).format("YYYY-MM-DD"),
        // branch_id: values.branch_id,
        employee_id: values.employee_id,
        billing_counter_id: values.billing_counter_id || null,
        no_of_bills: values.no_of_bills,
        no_of_items: values.no_of_items,
        total_sales: values.total_sales,
        cash_sales: values.cash.sales,
        cash_type: values.cash.type,
        cash_reason: values.cash.reason,
        card_sales: values.card.sales,
        card_type: values.card.type,
        card_reason: values.card.reason,
        paytm_sales: values.paytm.sales,
        paytm_type: values.paytm.type,
        paytm_reason: values.paytm.reason,
      };

      const promise = isEditMode
        ? updateAccountSheet(accountSheet.id, data)
        : createAccountSheet(data);

      toast.promise(promise, {
        loading: isEditMode
          ? "Updating Performance Entry!"
          : "Creating Performance Entry!",
        success: (data) => {
          if (data.code === 200) {
            router.push("/performance");
            return isEditMode
              ? "Successfully Updated Performance Entry!"
              : "Successfully Created Performance Entry!";
          } else {
            throw data;
          }
        },
        error: (err) => {
          console.log(err);
          return isEditMode
            ? "Error Updating Performance Entry!"
            : "Error Creating Performance Entry!";
        },
      });
    } catch (err) {
      console.log(err);
      toast.error(
        isEditMode
          ? "Error updating performance entry!"
          : "Error creating performance entry!"
      );
    }
  };

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Performance Entry";
    }

    if (isEditMode) {
      return "Edit Performance Entry";
    }

    return `Performance Entry : #${accountSheet?.id ?? mode[1] ?? ""}`;
  };

  const formatTenderType = (type) => {
    if (type === "exact") return "Correct";
    if (type === "excess") return "Excess";
    if (type === "short") return "Short";
    return type || "-";
  };

  const viewEmployee = employees.find(
    (emp) => emp.employee_code === accountSheet?.employee_id
  );
  const viewSelectBranchName =
    accountSheet?.branch_id != null
      ? branches.find((b) => Number(b.branch_id) === Number(accountSheet.branch_id))
          ?.branch_name || "—"
      : "—";
  const viewCounterName =
    accountSheet?.counter_name ||
    billingCounters.find(
      (c) => Number(c.counter_id) === Number(accountSheet?.billing_counter_id)
    )?.counter_name ||
    "—";
  const viewEmployeeDisplay = accountSheet?.employee_id
    ? `${accountSheet.employee_id} - ${
        (viewEmployee?.employee_name || accountSheet?.employee_name || "")
          .toString()
          .toUpperCase() || accountSheet.employee_id
      }`
    : "—";
  const viewDesignation =
    viewEmployee?.designation_name || accountSheet?.designation_name
      ? String(
          viewEmployee?.designation_name || accountSheet?.designation_name
        ).toUpperCase()
      : "—";
  const viewBranch =
    viewEmployee?.branch_name || accountSheet?.employee_branch_name
      ? String(
          viewEmployee?.branch_name || accountSheet?.employee_branch_name
        ).toUpperCase()
      : "—";
  const hasAnyTenderData =
    accountSheet?.cash_sales != null ||
    accountSheet?.card_sales != null ||
    accountSheet?.paytm_sales != null;
  const hasNonZeroTenderData =
    Number(accountSheet?.cash_sales || 0) > 0 ||
    Number(accountSheet?.card_sales || 0) > 0 ||
    Number(accountSheet?.paytm_sales || 0) > 0;
  const showViewTenderDetails =
    isBillingOperatorEmployee(viewEmployee, accountSheet) ||
    hasNonZeroTenderData ||
    (!viewEmployee?.designation_id &&
      !accountSheet?.designation_id &&
      hasAnyTenderData);
  const tenderRows = [
    {
      label: "Cash",
      value: Number(accountSheet?.cash_sales ?? 0).toFixed(2),
      type: formatTenderType(accountSheet?.cash_type),
    },
    {
      label: "Card",
      value: Number(accountSheet?.card_sales ?? 0).toFixed(2),
      type: formatTenderType(accountSheet?.card_type),
    },
    {
      label: "Paytm",
      value: Number(accountSheet?.paytm_sales ?? 0).toFixed(2),
      type: formatTenderType(accountSheet?.paytm_type),
    },
  ];

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_accounts_sheet";
    }

    return "view_accounts_sheet";
  };

  const renderEmployeeDetails = (employee) => {
    if (!employee) {
      return null;
    }

    return (
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="18px">
        <Box>
          <Text fontSize="12px" color="fg.muted" mb="4px">
            Designation
          </Text>
          <Text fontSize="14px" fontWeight="600" color="fg">
            {String(employee.designation_name || "—").toUpperCase()}
          </Text>
        </Box>

        <Box>
          <Text fontSize="12px" color="fg.muted" mb="4px">
            Branch
          </Text>
          <Text fontSize="14px" fontWeight="600" color="fg">
            {String(employee.branch_name || "—").toUpperCase()}
          </Text>
        </Box>
      </Grid>
    );
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm headerBand title={getTitle()}>
        {isViewMode ? (
          <Flex direction="column" gap="20px">
            {/* Entry details card */}
            <Box
              bg="white"
              borderWidth="1px"
              borderColor="border"
              borderRadius="12px"
              p={{ base: "16px", md: "20px" }}
            >
              <Text
                fontSize="15px"
                lineHeight="20px"
                fontWeight="600"
                color="fg"
                mb="16px"
              >
                Entry details
              </Text>
              <Grid
                templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
                gap="18px"
              >
                <Box>
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Date
                  </Text>
                  <Text fontSize="14px" fontWeight="500" color="fg">
                    {accountSheet?.date
                      ? moment(accountSheet.date).format("DD/MM/YYYY")
                      : "—"}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Select Branch
                  </Text>
                  <Text fontSize="14px" fontWeight="500" color="fg">
                    {viewSelectBranchName}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Select Billing Counter
                  </Text>
                  <Text fontSize="14px" fontWeight="500" color="fg">
                    {viewCounterName}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Select Employee
                  </Text>
                  <Text fontSize="14px" fontWeight="500" color="fg">
                    {viewEmployeeDisplay}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Designation
                  </Text>
                  <Text fontSize="14px" fontWeight="500" color="fg">
                    {viewDesignation}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Branch
                  </Text>
                  <Text fontSize="14px" fontWeight="500" color="fg">
                    {viewBranch}
                  </Text>
                </Box>
              </Grid>
            </Box>

            {/* Stat KPI cards */}
            <Grid
              templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
              gap="16px"
            >
              <Box bg="#FFF5ED" borderRadius="10px" px="20px" py="16px">
                <Text fontSize="12px" color="fg.muted" mb="6px">
                  No of Bills
                </Text>
                <Text fontSize="22px" lineHeight="28px" fontWeight="600" color="fg">
                  {accountSheet?.no_of_bills ?? "—"}
                </Text>
              </Box>
              <Box bg="#FFF5ED" borderRadius="10px" px="20px" py="16px">
                <Text fontSize="12px" color="fg.muted" mb="6px">
                  No of Items
                </Text>
                <Text fontSize="22px" lineHeight="28px" fontWeight="600" color="fg">
                  {accountSheet?.no_of_items ?? "—"}
                </Text>
              </Box>
              <Box bg="#FFF5ED" borderRadius="10px" px="20px" py="16px">
                <Text fontSize="12px" color="fg.muted" mb="6px">
                  Total Sales
                </Text>
                <Text fontSize="22px" lineHeight="28px" fontWeight="600" color="fg">
                  {accountSheet?.total_sales != null
                    ? Number(accountSheet.total_sales).toFixed(2)
                    : "—"}
                </Text>
              </Box>
            </Grid>

            {/* Tender Details table (without Settings) */}
            {showViewTenderDetails && (
              <Flex direction="column" gap="14px">
                <Text fontSize="15px" lineHeight="20px" fontWeight="600" color="fg">
                  Tender Details
                </Text>
                <Box
                  bg="white"
                  borderWidth="1px"
                  borderColor="border"
                  borderRadius="12px"
                  overflow="hidden"
                >
                  <Grid
                    templateColumns="1fr 120px 140px"
                    bg="#FFF5ED"
                    px="20px"
                    py="14px"
                    alignItems="center"
                  >
                    <Text fontSize="12px" fontWeight="600" color="fg.muted">
                      Tender
                    </Text>
                    <Text
                      fontSize="12px"
                      fontWeight="600"
                      color="fg.muted"
                      textAlign="right"
                    >
                      Value
                    </Text>
                    <Text
                      fontSize="12px"
                      fontWeight="600"
                      color="fg.muted"
                      pl="24px"
                    >
                      Type
                    </Text>
                  </Grid>
                  {tenderRows.map((row, idx) => (
                    <Grid
                      key={row.label}
                      templateColumns="1fr 120px 140px"
                      px="20px"
                      py="18px"
                      alignItems="center"
                      borderTopWidth={idx > 0 ? "1px" : "0px"}
                      borderColor="border.subtle"
                    >
                      <Text fontSize="13px" color="fg">
                        {row.label}
                      </Text>
                      <Text fontSize="13px" color="fg" textAlign="right">
                        {row.value}
                      </Text>
                      <Text fontSize="13px" color="fg" pl="24px">
                        {row.type}
                      </Text>
                    </Grid>
                  ))}
                </Box>
              </Flex>
            )}

            <Flex justifyContent="flex-end" pt="4px">
              <Link href="/performance">
                <Button variant="subtle">Back</Button>
              </Link>
            </Flex>
          </Flex>
        ) : (
          <Formik
            initialValues={initialValues}
            validationSchema={getAccountValidationSchema(employees)}
            onSubmit={handleCreate}
            enableReinitialize
          >
            {({ handleSubmit, setFieldValue, values }) => {
              const selectedEmployee = employees.find(
                (employee) => employee.employee_code === values.employee_id
              );

              const billingDuplicateWarning =
                accountSheets?.length
                  ? getBillingDesignationDuplicateWarning({
                      accountSheets,
                      employees,
                      date: values.date,
                      branchId: values.branch_id,
                      billingCounterId: values.billing_counter_id,
                      selectedEmployeeCode: values.employee_id,
                      excludeSheetId:
                        isEditMode && accountSheet?.id != null
                          ? accountSheet.id
                          : null,
                    })
                  : null;

              const isBillingCounterRequired =
                selectedEmployee &&
                (selectedEmployee.designation_id ===
                  BILLING_CHECKER_DESIGNATION_ID ||
                  selectedEmployee.designation_id ===
                    BILLING_OPERATOR_DESIGNATION_ID);

              const billingCounterOptions = filteredBillingCounters.map(
                (counter) => ({
                  value: counter.counter_id,
                  label: capitalizeWords(counter.counter_name),
                })
              );

              const onCounterAndBranchChange = (
                billing_counter_id,
                branch_id,
                date
              ) => {
                if (branch_id && billing_counter_id && date) {
                  const dataListKey = moment(date).format("YYYY-MM-DD");
                  const dataList = preloadedAccountsData[dataListKey];
                  const selectedCounterData = dataList.find(
                    (item) =>
                      item.billing_counter_id == billing_counter_id &&
                      item.branch_id == branch_id
                  );

                  if (selectedCounterData) {
                    setFieldValue(
                      "no_of_bills",
                      parseInt(selectedCounterData.no_of_bills)
                    );
                    setFieldValue("no_of_items", selectedCounterData.no_of_items);
                    setFieldValue("total_sales", selectedCounterData.total_sales);
                  } else {
                    setFieldValue("no_of_bills", "");
                    setFieldValue("no_of_items", "");
                    setFieldValue("total_sales", "");
                  }
                }
              };

              const showFormTenderDetails =
                selectedEmployee && isBillingOperatorEmployee(selectedEmployee);

              const entryFormCard = (
                <Box
                  bg="white"
                  borderWidth="1px"
                  borderColor="border"
                  borderRadius="12px"
                  p={{ base: "16px", md: "20px" }}
                >
                  <Text
                    fontSize="15px"
                    lineHeight="20px"
                    fontWeight="600"
                    color="fg"
                    mb="16px"
                  >
                    Entry details
                  </Text>
                  <Flex direction="column" gap="18px">
                    <Grid
                      templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                      gap="16px"
                    >
                      <CustomInput
                        label="Date"
                        isRequired
                        placeholder="DD/MM/YYYY"
                        name="date"
                        type="date"
                        method="date-picker"
                        onChange={(date) => {
                          onCounterAndBranchChange(
                            values.billing_counter_id,
                            values.branch_id,
                            date
                          );
                        }}
                      />
                      <CustomInput
                        label="Select Branch"
                        isRequired
                        placeholder="Click here to select branch..."
                        name="branch_id"
                        method="dropdown"
                        options={branchOptions}
                        disabled={!canAccessAllBranches}
                        onChange={(e) => {
                          setSelectedBranchId(e.target.value);
                          // Reset counter when branch changes
                          setFieldValue("billing_counter_id", null);
                          onCounterAndBranchChange(
                            values.billing_counter_id,
                            e.target.value,
                            values.date
                          );
                        }}
                      />

                      <CustomInput
                        label="Select Billing Counter"
                        isRequired={isBillingCounterRequired}
                        placeholder={
                          values.branch_id
                            ? "Select billing counter"
                            : "Select branch first"
                        }
                        name="billing_counter_id"
                        method="dropdown"
                        options={billingCounterOptions}
                        disabled={!values.branch_id}
                        onChange={(e) => {
                          onCounterAndBranchChange(
                            e.target.value,
                            values.branch_id,
                            values.date
                          );
                        }}
                      />

                      <CustomInput
                        label="Select Employee"
                        isRequired
                        placeholder="Click here to select employee..."
                        name="employee_id"
                        method="searchable-dropdown"
                        options={filteredEmployees}
                        customRender={(item) => (
                          <Flex
                            flexDirection="column"
                            align="flex-start"
                            gap="0"
                            py="0.5"
                          >
                            <Text fontSize="sm" fontWeight="medium" lineHeight="short">
                              {item.label}
                            </Text>
                            <Text fontSize="xs" color="gray.500" lineHeight="short">
                              {[item.designation_name, item.branch_name]
                                .filter(Boolean)
                                .join(" · ") || "\u2014"}
                            </Text>
                          </Flex>
                        )}
                        onChange={(employee_id) => {
                          const emp = employees.find(
                            (employee) => employee.employee_code === employee_id
                          );

                          if (emp && !isBillingOperatorEmployee(emp)) {
                            setFieldValue("cash.sales", "0");
                            setFieldValue("cash.type", "exact");
                            setFieldValue("cash.reason", "");
                            setFieldValue("card.sales", "0");
                            setFieldValue("card.type", "exact");
                            setFieldValue("card.reason", "");
                            setFieldValue("paytm.sales", "0");
                            setFieldValue("paytm.type", "exact");
                            setFieldValue("paytm.reason", "");
                          } else {
                            setFieldValue("cash.sales", "");
                            setFieldValue("cash.type", "");
                            setFieldValue("cash.reason", "");
                            setFieldValue("card.sales", "");
                            setFieldValue("card.type", "");
                            setFieldValue("card.reason", "");
                            setFieldValue("paytm.sales", "");
                            setFieldValue("paytm.type", "");
                            setFieldValue("paytm.reason", "");
                          }
                        }}
                      />
                    </Grid>

                    {selectedEmployee && renderEmployeeDetails(selectedEmployee)}

                    {billingDuplicateWarning && (
                      <Box
                        borderWidth="1px"
                        borderColor="orange.400"
                        bg="orange.50"
                        _dark={{
                          borderColor: "orange.500",
                          bg: "rgba(251, 146, 60, 0.12)",
                        }}
                        borderRadius="md"
                        px="4"
                        py="3"
                      >
                        <Text
                          fontSize="sm"
                          color="orange.900"
                          _dark={{ color: "orange.100" }}
                        >
                          Data entry already done by{" "}
                          <Text as="span" fontWeight="semibold">
                            {billingDuplicateWarning.existingName}
                          </Text>
                          . Only one billing checker and one billing operator
                          entry is allowed per day for this branch.
                        </Text>
                      </Box>
                    )}

                    {isEditMode && (
                      <Grid
                        templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
                        gap="14px"
                      >
                        <CustomInput
                          label="No of Bills"
                          isRequired
                          placeholder="0"
                          name="no_of_bills"
                          method="text"
                          type="number"
                          disabled={true}
                        />
                        <CustomInput
                          label="No of Items"
                          isRequired
                          placeholder="0"
                          name="no_of_items"
                          method="text"
                          type="number"
                          disabled={true}
                        />
                        <CustomInput
                          label="Total Sales"
                          isRequired
                          placeholder="0"
                          name="total_sales"
                          method="text"
                          type="number"
                          disabled={true}
                        />
                      </Grid>
                    )}
                  </Flex>
                </Box>
              );

              const tenderDetailsCard = showFormTenderDetails ? (
                <Box
                  bg="white"
                  borderWidth="1px"
                  borderColor="border"
                  borderRadius="12px"
                  p={{ base: "16px", md: "20px" }}
                >
                  <Text
                    fontSize="15px"
                    lineHeight="20px"
                    fontWeight="600"
                    color="fg"
                    mb="16px"
                  >
                    Tender Details
                  </Text>
                  <Flex direction="column" gap="16px">
                    {getTenderRow("cash", "Cash", setFieldValue)}
                    {getTenderRow("card", "Card", setFieldValue)}
                    {getTenderRow("paytm", "Paytm", setFieldValue)}
                  </Flex>
                </Box>
              ) : null;

              return (
                <Flex flexDirection="column" gap="20px">
                  {isEditMode ? (
                    <Grid
                      templateColumns={{
                        base: "1fr",
                        lg: showFormTenderDetails ? "1.45fr 1fr" : "1fr",
                      }}
                      gap="20px"
                      alignItems="start"
                    >
                      {entryFormCard}
                      {tenderDetailsCard}
                    </Grid>
                  ) : (
                    <>
                      {entryFormCard}
                      <Box
                        bg="white"
                        borderWidth="1px"
                        borderColor="border"
                        borderRadius="12px"
                        p={{ base: "16px", md: "20px" }}
                      >
                        <Text
                          fontSize="15px"
                          lineHeight="20px"
                          fontWeight="600"
                          color="fg"
                          mb="16px"
                        >
                          Performance figures
                        </Text>
                        <Grid
                          templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
                          gap="16px"
                        >
                          <CustomInput
                            label="No of Bills"
                            isRequired
                            placeholder="0"
                            name="no_of_bills"
                            method="text"
                            type="number"
                            disabled={true}
                          />
                          <CustomInput
                            label="No of Items"
                            isRequired
                            placeholder="0"
                            name="no_of_items"
                            method="text"
                            type="number"
                            disabled={true}
                          />
                          <CustomInput
                            label="Total Sales"
                            isRequired
                            placeholder="0"
                            name="total_sales"
                            method="text"
                            type="number"
                            disabled={true}
                          />
                        </Grid>
                      </Box>
                      {tenderDetailsCard}
                    </>
                  )}

                  <Flex gap="12px" justifyContent="flex-end">
                    <Link href="/performance">
                      <Button variant="subtle">Back</Button>
                    </Link>
                    {(isCreateMode || isEditMode) && (
                      <Button
                        bg="#F47721"
                        color="white"
                        _hover={{ bg: "#E06612" }}
                        onClick={handleSubmit}
                        disabled={Boolean(billingDuplicateWarning)}
                      >
                        {isCreateMode ? "Create" : "Update"}
                      </Button>
                    )}
                  </Flex>
                </Flex>
              );
            }}
          </Formik>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}
