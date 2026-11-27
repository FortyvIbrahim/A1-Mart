"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import CustomDialog from "@/components/CustomDialog";
import FileUploaderWithColumnMapping from "@/components/FileUploaderWithColumnMapping";
import GlobalWrapper from "@/components/GlobalWrapper";
import {
  PaymentDetailsDrawer,
  PayrollMonthCalendar,
} from "@/components/payroll";
import { transformPayrollData } from "@/utils/payroll";
import {
  Box,
  Button,
  Flex,
  Text,
  Input,
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  VStack,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import moment from "moment";
import { useSearchParams } from "next/navigation";
import {
  createPayroll,
  updatePayroll,
  getPayrollById,
  deletePayroll,
  preparePayslipData,
} from "@/api/helpers/payroll";
import usePayrolls from "@/api/customHooks/usePayrolls";
import useDeleteModal from "@/customHooks/useDeleteModal";
import usePermission from "@/customHooks/usePermission";
import useEmployee from "@/api/customHooks/useEmployee";
import { capitalizeWordsLatest, formatCurrency } from "@/utils/string";
import {
  getEmployeeCategoryBadgeValue,
  getEmployeeCategoryFromRow,
} from "@/utils/employeeCategoryBadges";
import BranchFilter from "@/components/BranchFilter";

function getEmployeeDesignationFromRow(row, mappedEmployees = {}) {
  const designation =
    row?.designation_name ??
    row?.employee?.designation_name ??
    mappedEmployees[row?.employee_code]?.designation_name;

  if (designation == null || String(designation).trim() === "") return null;
  return String(designation).trim();
}

const targetColumns = [
  {
    key: "employee_code",
    label: "Employee Code",
    required: true,
    suggestedKey: "Employee Code",
    type: "string",
  },
  {
    key: "employee_name",
    label: "Employee Name",
    required: true,
    suggestedKey: "Employee Name",
    type: "string",
  },
  {
    key: "date_of_joining",
    label: "Date of Joining",
    required: true,
    suggestedKey: "Date of Joining",
    type: "date",
  },
  {
    key: "actual_pay",
    label: "Actual Pay",
    required: true,
    suggestedKey: "Actual Pay",
    type: "number",
  },
  {
    key: "no_of_working_days",
    label: "No of Working Days",
    required: true,
    suggestedKey: "No of Working Days",
    type: "number",
  },
  {
    key: "incentive",
    label: "Incentive",
    required: false,
    suggestedKey: "Incentive",
    type: "number",
  },
  {
    key: "lateness_amt",
    label: "Lateness Amount",
    required: true,
    suggestedKey: "Lateness Amt",
    type: "number",
  },
  {
    key: "overtime_amt",
    label: "Overtime Amount",
    required: true,
    suggestedKey: "OverTime Amt",
    type: "number",
  },
  {
    key: "advance",
    label: "Advance",
    required: true,
    suggestedKey: "ADVANCE",
    type: "number",
  },
  {
    key: "penalty",
    label: "Penalty",
    required: true,
    suggestedKey: "PENALTY",
    type: "number",
  },
  {
    key: "employee_esi",
    label: "Employee ESI",
    required: true,
    suggestedKey: "Employee ESI",
    type: "number",
  },
  {
    key: "employee_epf",
    label: "Employee EPF",
    required: true,
    suggestedKey: "Employee EPF",
    type: "number",
  },
  {
    key: "late_early_hours",
    label: "Late & Early Hours",
    required: false,
    suggestedKey: "Late & Early Hours",
    type: "number",
  },
  {
    key: "employer_epf",
    label: "Employer EPF",
    required: true,
    suggestedKey: "Employer EPF",
    type: "number",
  },
  {
    key: "employer_esi",
    label: "Employer ESI",
    required: true,
    suggestedKey: "Employer ESI",
    type: "number",
  },
];

const PAYMENT_IMPORT_TARGET_COLUMNS = [
  {
    key: "employee_code",
    label: "Employee Code",
    type: "string",
    required: false,
    suggestedKey: "User Reference Number",
  },
  {
    key: "account_no",
    label: "Account Number",
    type: "string",
    required: true,
    suggestedKey: "Beneficiary Account No.",
  },
  {
    key: "ifsc_code",
    label: "IFSC Code",
    required: true,
    suggestedKey: "IFSC Code",
  },
  {
    key: "beneficiary",
    label: "Beneficiary",
    required: true,
    suggestedKey: "Beneficiary",
  },
  {
    key: "payment_date",
    label: "Payment date",
    required: true,
    suggestedKey: "Value date",
  },
  { key: "status", label: "Status", required: true, suggestedKey: "Status" },
  { key: "utr", label: "UTR", required: true, suggestedKey: "UTR" },
];

function PayrollEntryList({ type = "entry" }) {
  const isApprovalMode = type === "approval";
  const isBankSubmissionMode = type === "bank_submission";
  const searchParams = useSearchParams();
  const payrollIdFromUrl = searchParams.get("payroll_id");

  const currentYear = moment().year();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(moment().year(), moment().month(), 1)
  );
  const [calculatedData, setCalculatedData] = useState(null);
  const [selectedPayrollData, setSelectedPayrollData] = useState(null);
  const [existingPayrollId, setExistingPayrollId] = useState(null);
  const [paymentDataImported, setPaymentDataImported] = useState(false);
  const [paymentDetailsDrawerOpen, setPaymentDetailsDrawerOpen] =
    useState(false);
  const [selectedRowPaymentDetails, setSelectedRowPaymentDetails] =
    useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNetPayTotal, setSelectedNetPayTotal] = useState(0);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [isAutoSelectModalOpen, setIsAutoSelectModalOpen] = useState(false);
  const [autoSelectAmount, setAutoSelectAmount] = useState("");
  const [autoSelectCategories, setAutoSelectCategories] = useState([]);
  const [autoSelectDesignations, setAutoSelectDesignations] = useState([]);
  const [selectedEmployeeCodes, setSelectedEmployeeCodes] = useState([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [paymentImportPreviewOpen, setPaymentImportPreviewOpen] =
    useState(false);
  const [paymentImportPreviewData, setPaymentImportPreviewData] =
    useState(null);

  const gridRef = useRef(null);
  const autoSelectDialogContentRef = useRef(null);
  const { payrolls, refetch: refetchPayrolls } = usePayrolls();
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();
  const allowAdd = usePermission("add_payroll_entry");
  const canMarkOnHold = usePermission("mark_payroll_on_hold");
  const { employees } = useEmployee();

  const mappedEmployees = useMemo(() => {
    const map = {};
    employees?.forEach((emp) => (map[emp.employee_code] = emp));
    return map;
  }, [employees]);

  const payrollsByMonth = useMemo(() => {
    const byMonth = {};
    payrolls?.forEach((p) => {
      if (p.payroll_month) {
        byMonth[moment(p.payroll_month).format("YYYY-MM")] = p;
      }
    });
    return byMonth;
  }, [payrolls]);

  const selectedMonthKey = selectedMonth
    ? moment(selectedMonth).format("YYYY-MM")
    : null;
  const existingForSelectedMonth = selectedMonthKey
    ? payrollsByMonth[selectedMonthKey]
    : null;
  const isApproved = existingForSelectedMonth?.is_approved ?? false;

  useEffect(() => {
    if (!payrollIdFromUrl || !payrolls?.length) return;
    const id = Number(payrollIdFromUrl);
    const header = payrolls.find((p) => p.payroll_id === id);
    if (header?.payroll_month) {
      const d = new Date(header.payroll_month);
      setSelectedYear(d.getFullYear());
      setSelectedMonth(d);
    }
  }, [payrollIdFromUrl, payrolls]);

  useEffect(() => {
    // Whenever the month changes, reset row selection & selection mode
    setIsSelectionMode(false);
    setSelectedNetPayTotal(0);
    setSelectedEmployeeCodes([]);
    const api = gridRef.current?.api;
    api?.deselectAll?.();

    if (!selectedMonth) {
      setExistingPayrollId(null);
      setCalculatedData(null);
      setPaymentDataImported(false);
      return;
    }
    const key = moment(selectedMonth).format("YYYY-MM");
    const header = payrollsByMonth[key];
    if (header) {
      setExistingPayrollId(header.payroll_id);
      setPaymentDataImported(false);
      getPayrollById(header.payroll_id)
        .then((res) => {
          if (res.code === 200 && res.data) {
            setSelectedPayrollData(res.data.payroll_id);
            setCalculatedData(res.data.employees || []);
          } else setCalculatedData(null);
        })
        .catch(() => {
          setCalculatedData(null);
          toast.error("Failed to load payroll.");
        });
    } else {
      setExistingPayrollId(null);
      setCalculatedData(null);
      setPaymentDataImported(false);
    }
  }, [selectedMonth, selectedMonthKey, payrollsByMonth]);

  const handleMonthClick = (date) => {
    setSelectedMonth(date);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    if (selectedMonth)
      setSelectedMonth(new Date(year, moment(selectedMonth).month(), 1));
  };

  const handleDataMapped = (mappedData) => {
    try {
      const transformed = mappedData
        .filter((item) => item.employee_code !== "Total")
        .map((item) =>
          transformPayrollData(item, selectedMonth, mappedEmployees)
        );
      setCalculatedData(transformed);
    } catch (err) {
      console.error(err);
      setCalculatedData(null);
      toast.error("Error mapping data!");
    }
  };

  // Common helper to build the employee payload object sent to the backend
  const buildEmployeePayload = (item, overrides = {}) => {
    const data = {
      employee_code: item.employee_code,
      date_of_joining: item.date_of_joining ?? null,
      actual_pay: item.actual_pay ?? null,
      no_of_working_days: item.no_of_working_days ?? null,
      incentive: item.incentive ?? null,
      lateness_amt: item.lateness_amt ?? null,
      overtime_amt: item.overtime_amt ?? null,
      advance: item.advance ?? null,
      penalty: item.penalty ?? null,
      employee_esi: item.employee_esi ?? null,
      employee_epf: item.employee_epf ?? null,
      employer_esi: item.employer_esi ?? null,
      employer_epf: item.employer_epf ?? null,
      days_per_month: item.days_per_month ?? null,
      lop_days: item.lop_days ?? null,
      per_day_salary: item.per_day_salary ?? null,
      gross_pay: item.gross_pay ?? null,
      lop_amount: item.lop_amount ?? null,
      net_pay: item.net_pay ?? null,
      late_early_hours: item.late_early_hours ?? null,
      // Flags
      is_generated: item.is_generated == true ? true : false,
      on_hold: item.on_hold == true ? true : false,
      // Allow specific fields (like is_generated) to be overridden per caller
      ...overrides,
    };
    if (item.payment_details) data.payment_details = item.payment_details;
    return data;
  };

  const handleSave = async () => {
    try {
      if (!selectedMonth || !calculatedData?.length) {
        toast.error(
          !selectedMonth
            ? "Please select a payroll month."
            : "No payroll data to save."
        );
        return;
      }
      const payroll_month = moment(selectedMonth)
        .startOf("month")
        .add(1, "days")
        .toISOString();
      const employeesPayload = calculatedData.map((item) =>
        buildEmployeePayload(item)
      );
      const isUpdate = !!existingPayrollId;
      const promise = isUpdate
        ? updatePayroll(existingPayrollId, {
            payroll_month,
            employees: employeesPayload,
          })
        : createPayroll({ payroll_month, employees: employeesPayload });
      toast.promise(promise, {
        loading: isUpdate ? "Updating payroll..." : "Creating payroll...",
        success: async (response) => {
          if (response.code === 200 || response.code === 201) {
            const payrollId =
              response.data?.payroll_id ??
              (isUpdate ? existingPayrollId : null);
            if (isUpdate)
              setExistingPayrollId(
                response.data?.payroll_id ?? existingPayrollId
              );
            else if (response.data?.payroll_id)
              setExistingPayrollId(response.data.payroll_id);
            await refetchPayrolls();
            if (payrollId) {
              getPayrollById(payrollId)
                .then((res) => {
                  if (res.code === 200 && res.data?.employees)
                    setCalculatedData(res.data.employees);
                })
                .catch(() => {
                  toast.error("Saved but failed to reload data.");
                });
            }
            return isUpdate
              ? "Payroll updated successfully!"
              : "Payroll created successfully!";
          }
          throw new Error(response.message || "Failed to save payroll");
        },
        error: (err) => err.message || "Error saving payroll!",
      });
    } catch (err) {
      console.error(err);
      toast.error("Error saving payroll!");
    }
  };

  const handleMarkAsHold = async () => {
    try {
      const api = gridRef.current?.api;
      if (!api) {
        toast.error("Grid not ready.");
        return;
      }
      if (!canMarkOnHold) {
        toast.error("You do not have permission to mark payroll on hold.");
        return;
      }
      if (!existingPayrollId) {
        toast.error("No payroll selected.");
        return;
      }

      const selected = api.getSelectedRows?.() ?? [];
      if (!selected.length) {
        toast.error("Select at least one row.");
        return;
      }

      // Only unpaid (not processed) employees can be marked as on hold
      const eligibleCodes = new Set(
        selected
          .filter((row) => {
            const s = row.payment_details?.status?.toLowerCase();
            const done = s === "processed" || s === "done";
            return !done;
          })
          .map((row) => row.employee_code)
          .filter(Boolean)
      );

      if (!eligibleCodes.size) {
        toast.error("Only unpaid employees can be marked as on hold.");
        return;
      }

      const updated = (calculatedData || []).map((row) =>
        eligibleCodes.has(row.employee_code) ? { ...row, on_hold: true } : row
      );

      const employeesPayload = updated.map((item) =>
        buildEmployeePayload(item)
      );

      // Include payroll_month from the current payroll header so backend
      // always ties updates to the actually selected payroll, not today's month.
      const payroll_month =
        existingForSelectedMonth?.payroll_month && selectedMonth
          ? moment(existingForSelectedMonth.payroll_month)
              .startOf("month")
              .add(1, "days")
              .toISOString()
          : selectedMonth
          ? moment(selectedMonth).startOf("month").add(1, "days").toISOString()
          : null;

      await toast.promise(
        updatePayroll(existingPayrollId, {
          payroll_month,
          employees: employeesPayload,
        }),
        {
          loading: "Marking employees as on hold...",
          success: (response) => {
            if (response.code === 200 || response.code === 201) {
              setCalculatedData(updated);
              // Clear selection and exit selection mode so newly on-hold rows aren't still selected
              api.deselectAll?.();
              setIsSelectionMode(false);
              setSelectedEmployeeCodes([]);
              setSelectedNetPayTotal(0);
              return "Selected employees marked as on hold.";
            }
            throw new Error(response.message || "Failed to mark as on hold.");
          },
          error: (err) => err.message || "Error updating on-hold status.",
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFromOnHold = async (employeeCode) => {
    try {
      if (!existingPayrollId) {
        toast.error("No payroll selected.");
        return;
      }
      if (!canMarkOnHold) {
        toast.error("You do not have permission to update on-hold status.");
        return;
      }
      if (!employeeCode) return;

      const updated = (calculatedData || []).map((row) =>
        row.employee_code === employeeCode ? { ...row, on_hold: false } : row
      );

      // Build payload from the original data, only overriding on_hold for that employee
      const employeesPayload = (calculatedData || []).map((item) =>
        buildEmployeePayload(
          item,
          item.employee_code === employeeCode ? { on_hold: false } : {}
        )
      );

      const payroll_month =
        existingForSelectedMonth?.payroll_month && selectedMonth
          ? moment(existingForSelectedMonth.payroll_month)
              .startOf("month")
              .add(1, "days")
              .toISOString()
          : selectedMonth
          ? moment(selectedMonth).startOf("month").add(1, "days").toISOString()
          : null;

      await toast.promise(
        updatePayroll(existingPayrollId, {
          payroll_month,
          employees: employeesPayload,
        }),
        {
          loading: "Updating on-hold status...",
          success: (response) => {
            if (response.code === 200 || response.code === 201) {
              setCalculatedData(updated);
              return "Removed from on hold.";
            }
            throw new Error(
              response.message || "Failed to update on-hold status."
            );
          },
          error: (err) => err.message || "Error updating on-hold status.",
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaidByCash = async (employeeCode) => {
    try {
      if (!existingPayrollId) {
        toast.error("No payroll selected.");
        return;
      }
      if (!employeeCode) return;

      const updated = (calculatedData || []).map((row) =>
        row.employee_code === employeeCode
          ? {
              ...row,
              payment_details: {
                mode: "cash",
                status: "Processed",
                payment_date: new Date().toISOString(),
              },
            }
          : row
      );

      const employeesPayload = updated.map((item) =>
        buildEmployeePayload(item)
      );

      const payroll_month =
        existingForSelectedMonth?.payroll_month && selectedMonth
          ? moment(existingForSelectedMonth.payroll_month)
              .startOf("month")
              .add(1, "days")
              .toISOString()
          : selectedMonth
          ? moment(selectedMonth).startOf("month").add(1, "days").toISOString()
          : null;

      await toast.promise(
        updatePayroll(existingPayrollId, {
          payroll_month,
          employees: employeesPayload,
        }),
        {
          loading: "Updating payment details...",
          success: (response) => {
            if (response.code === 200 || response.code === 201) {
              setCalculatedData(updated);
              return "Marked as paid by cash.";
            }
            throw new Error(
              response.message || "Failed to update payment details."
            );
          },
          error: (err) => err.message || "Error updating payment details.",
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsUnpaid = async (employeeCode) => {
    try {
      if (!existingPayrollId) {
        toast.error("No payroll selected.");
        return;
      }
      if (!employeeCode) return;

      const updated = (calculatedData || []).map((row) =>
        row.employee_code === employeeCode
          ? { ...row, payment_details: null }
          : row
      );

      const employeesPayload = updated.map((item) => {
        const data = buildEmployeePayload(item);
        if (item.employee_code === employeeCode) data.payment_details = null;
        return data;
      });

      const payroll_month =
        existingForSelectedMonth?.payroll_month && selectedMonth
          ? moment(existingForSelectedMonth.payroll_month)
              .startOf("month")
              .add(1, "days")
              .toISOString()
          : selectedMonth
          ? moment(selectedMonth).startOf("month").add(1, "days").toISOString()
          : null;

      await toast.promise(
        updatePayroll(existingPayrollId, {
          payroll_month,
          employees: employeesPayload,
        }),
        {
          loading: "Marking as unpaid...",
          success: (response) => {
            if (response.code === 200 || response.code === 201) {
              setCalculatedData(updated);
              return "Marked as unpaid.";
            }
            throw new Error(response.message || "Failed to mark as unpaid.");
          },
          error: (err) => err.message || "Error marking as unpaid.",
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaymentDataMapped = (mappedData) => {
    try {
      const mappedByEmployeeCode = {};
      const mappedByAccountNo = {};
      mappedData.forEach((row) => {
        const code =
          row.employee_code != null && String(row.employee_code).trim() !== ""
            ? String(row.employee_code).trim()
            : null;
        if (code) mappedByEmployeeCode[code] = row;
        const accNo =
          row.account_no != null ? String(row.account_no).trim() : null;
        if (accNo && !mappedByAccountNo[accNo]) mappedByAccountNo[accNo] = row;
      });

      const withPayment = calculatedData.map((item) => {
        const empCode =
          item.employee_code != null ? String(item.employee_code).trim() : null;
        const accNo =
          item.employee?.account_no != null
            ? String(item.employee.account_no).trim()
            : null;

        const fileRow =
          (empCode && mappedByEmployeeCode[empCode]) ||
          (accNo && mappedByAccountNo[accNo]) ||
          null;

        return {
          ...item,
          payment_details: fileRow
            ? { ...fileRow, method: "bank" }
            : item.payment_details ?? null,
        };
      });

      setPaymentDataImported(true);
      setCalculatedData(withPayment);
    } catch (err) {
      console.error(err);
      setPaymentDataImported(false);
      toast.error("Error mapping payment data!");
    }
  };

  const handlePaymentImportPreview = (mappedData) => {
    setPaymentImportPreviewData(mappedData);
    setPaymentImportPreviewOpen(true);
  };

  const paymentImportPreviewSummary = useMemo(() => {
    if (!paymentImportPreviewData?.length || !calculatedData?.length) {
      return { unmapped: [], mapped: [] };
    }
    const mappedByEmployeeCode = {};
    const mappedByAccountNo = {};
    paymentImportPreviewData.forEach((row, idx) => {
      const code =
        row.employee_code != null && String(row.employee_code).trim() !== ""
          ? String(row.employee_code).trim()
          : null;
      if (code) mappedByEmployeeCode[code] = { row, idx };
      const accNo =
        row.account_no != null ? String(row.account_no).trim() : null;
      if (accNo && !mappedByAccountNo[accNo])
        mappedByAccountNo[accNo] = { row, idx };
    });

    const matchedFileIndices = new Set();
    const mapped = [];

    calculatedData.forEach((item) => {
      const empCode =
        item.employee_code != null ? String(item.employee_code).trim() : null;
      const accNo =
        item.employee?.account_no != null
          ? String(item.employee.account_no).trim()
          : null;

      const byCode = empCode && mappedByEmployeeCode[empCode];
      const byAccount = accNo && mappedByAccountNo[accNo];
      const fileRow = byCode ? byCode.row : byAccount ? byAccount.row : null;
      const fileIdx = byCode ? byCode.idx : byAccount ? byAccount.idx : null;

      if (fileRow != null && fileIdx != null) {
        matchedFileIndices.add(fileIdx);
        mapped.push({
          employee_code: item.employee_code ?? "-",
          employee_name:
            item.employee_name ?? item.employee?.employee_name ?? "-",
          account_no: fileRow.account_no ?? "-",
          ifsc_code: fileRow.ifsc_code ?? "-",
          status: fileRow.status ?? "-",
        });
      }
    });

    const unmapped = paymentImportPreviewData
      .map((row, idx) => ({ ...row, _idx: idx }))
      .filter((r) => !matchedFileIndices.has(r._idx))
      .map(({ _idx, ...row }) => ({ ...row, status: row.status ?? "-" }));

    return { unmapped, mapped };
  }, [paymentImportPreviewData, calculatedData]);

  const handleClear = () => {
    if (existingPayrollId) {
      openDeleteModal({
        title: "Delete payroll?",
        message:
          "Are you sure you want to delete this payroll? This will remove the payroll and all employee records for this month. You can then add new data by uploading a file.",
        onDelete: async () => {
          try {
            const response = await deletePayroll(existingPayrollId);
            if (response.code === 200) {
              setCalculatedData(null);
              setExistingPayrollId(null);
              setPaymentDataImported(false);
              refetchPayrolls();
              toast.success(
                "Payroll deleted successfully. You can now upload new data."
              );
            } else toast.error(response.message || "Failed to delete payroll");
          } catch (err) {
            toast.error(err.message || "Error deleting payroll.");
          }
        },
      });
    } else {
      setCalculatedData(null);
      setPaymentDataImported(false);
      toast.success("Cleared. You can now upload new data.");
    }
  };

  const handleApprove = async () => {
    if (!existingPayrollId) return;
    try {
      const newApproved = !isApproved;
      const promise = updatePayroll(existingPayrollId, {
        is_approved: newApproved,
      });
      toast.promise(promise, {
        loading: newApproved
          ? "Approving payroll..."
          : "Unapproving payroll...",
        success: (response) => {
          if (response.code === 200 || response.code === 201) {
            refetchPayrolls();
            return newApproved ? "Payroll approved!" : "Payroll unapproved!";
          }
          throw new Error(response.message || "Failed to update approval");
        },
        error: (err) => err.message || "Error updating approval",
      });
    } catch (err) {
      console.error(err);
      toast.error("Error updating approval.");
    }
  };

  const handleRemovePaymentDetails = () => {
    const api = gridRef.current?.api;
    if (!api) {
      toast.error("Grid not ready.");
      return;
    }
    const selected = api.getSelectedRows?.() ?? [];
    if (selected.length === 0) {
      toast.error("Select at least one row.");
      return;
    }
    const selectedCodes = new Set(
      selected.map((row) => row.employee_code).filter(Boolean)
    );
    const updated = calculatedData.map((row) =>
      selectedCodes.has(row.employee_code)
        ? { ...row, payment_details: null }
        : row
    );
    setCalculatedData(updated);
    setIsSelectionMode(false);
    toast.success(
      `Payment details removed for ${selected.length} row(s). Click Save to persist.`
    );
  };

  const downloadTextFile = (selectedIds = []) => {
    try {
      const rows = (calculatedData || []).filter((row) =>
        selectedIds.includes(row.employee_code)
      );

      if (!rows.length) {
        toast.error("No rows to export.");
        return;
      }

      const lines = rows.map((item) => {
        const employee = item.employee || {};

        const transactionType = "N"; // NEFT
        const beneficiaryCode = "A001"; // static as per example
        const accountNumber = employee.account_no || "";
        const amount = (parseFloat(item.net_pay) || 0).toFixed(1);
        const beneficiaryName =
          employee.employee_name || item.employee_name || "";
        const narration = employee.employee_code || ""; // optional - keep empty for now
        const txnDate = moment().format("DD/MM/YYYY"); // e.g. 05/02/26
        const ifsc = employee.ifsc_code || "";
        const bankName = employee.bank_name || "";
        const email = employee.email || "";

        // Build columns A..AB (28 columns) with required fields and empty gaps.
        const cols = [];
        // A-E
        cols[0] = transactionType;
        cols[1] = beneficiaryCode;
        cols[2] = accountNumber;
        cols[3] = amount;
        cols[4] = beneficiaryName;
        // F-M (empty)
        for (let i = 5; i <= 12; i++) cols[i] = "";
        // N - Narration
        cols[13] = narration;
        // O-V (empty)
        for (let i = 14; i <= 21; i++) cols[i] = "";
        // W - Transaction date
        cols[22] = txnDate;
        // X - empty
        cols[23] = "";
        // Y - IFSC
        cols[24] = ifsc;
        // Z - Bank Name
        cols[25] = bankName;
        // AA - empty
        cols[26] = "";
        // AB - Email
        cols[27] = email;

        return cols.join(",");
      });

      const content = lines.join("\r\n");
      const blob = new Blob([content], {
        type: "text/plain;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bank_submission_${moment().format("YYYYMMDD_HHmmss")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Bank submission file exported.");
    } catch (err) {
      console.error(err);
      toast.error("Error exporting text file.");
    }
  };

  const handleAutoSelectByAmount = () => {
    const amount = parseFloat(autoSelectAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    const hasBankDetails = (row) => {
      const employee = row?.employee ?? {};
      const accountNo =
        employee.account_no != null ? String(employee.account_no).trim() : "";
      const ifscCode =
        employee.ifsc_code != null ? String(employee.ifsc_code).trim() : "";
      return Boolean(accountNo && ifscCode);
    };

    const selectedCategorySet =
      autoSelectCategories.length > 0
        ? new Set(autoSelectCategories.map((c) => String(c).toLowerCase()))
        : null;
    const selectedDesignationSet =
      autoSelectDesignations.length > 0
        ? new Set(autoSelectDesignations.map((d) => String(d).toLowerCase()))
        : null;

    const sourceRows = (filteredData || []).filter((row) => {
      if (!row || !row.employee_code) return false;
      if (row.on_hold == true) return false;
      const s = row.payment_details?.status?.toLowerCase();
      const done = s === "processed" || s === "done";
      if (done) return false;
      if (!hasBankDetails(row)) return false;

      if (selectedCategorySet) {
        const category = getEmployeeCategoryFromRow(row, mappedEmployees);
        if (!category || !selectedCategorySet.has(category.toLowerCase())) {
          return false;
        }
      }

      if (selectedDesignationSet) {
        const designation = getEmployeeDesignationFromRow(row, mappedEmployees);
        if (
          !designation ||
          !selectedDesignationSet.has(designation.toLowerCase())
        ) {
          return false;
        }
      }

      return true;
    });
    if (!sourceRows.length) {
      const filterLabels = [];
      if (selectedCategorySet) filterLabels.push("categories");
      if (selectedDesignationSet) filterLabels.push("designations");
      toast.error(
        filterLabels.length
          ? `No employees match the selected ${filterLabels.join(" and ")}.`
          : "No employees to select for this branch/month."
      );
      return;
    }

    const withNetPay = sourceRows
      .map((row) => ({
        row,
        netPay: parseFloat(row.net_pay) || 0,
      }))
      .filter((r) => r.netPay > 0)
      .sort((a, b) => a.netPay - b.netPay);

    let running = 0;
    const selectedCodes = new Set();
    for (const item of withNetPay) {
      if (running + item.netPay <= amount) {
        running += item.netPay;
        selectedCodes.add(item.row.employee_code);
      } else {
        break;
      }
    }

    if (!selectedCodes.size) {
      toast.error("No combination of employees fits within the given amount.");
      return;
    }

    const api = gridRef.current?.api;
    if (!api) {
      toast.error("Grid not ready.");
      return;
    }

    setIsSelectionMode(true);
    const codesArray = Array.from(selectedCodes);
    setSelectedEmployeeCodes(codesArray);
    setTimeout(() => {
      api.deselectAll?.();
      api.forEachNode?.((node) => {
        if (node.data?.on_hold == true) return;
        const code = node.data?.employee_code;
        if (code && selectedCodes.has(code)) {
          node.setSelected?.(true);
        }
      });
      setSelectedNetPayTotal(running);
    }, 0);

    setIsAutoSelectModalOpen(false);
    setAutoSelectCategories([]);
    setAutoSelectDesignations([]);
  };

  const handleExportSelectedForBank = async () => {
    const api = gridRef.current?.api;
    if (!api) {
      toast.error("Grid not ready.");
      return;
    }

    const selected = api.getSelectedRows?.() ?? [];
    if (selected.length === 0) {
      toast.error("Select at least one row.");
      return;
    }

    if (!existingPayrollId) {
      toast.error("No payroll selected.");
      return;
    }

    const selectedCodes = new Set(
      selected.map((row) => row.employee_code).filter(Boolean)
    );

    downloadTextFile(Array.from(selectedCodes));

    const updated = (calculatedData || []).map((row) =>
      selectedCodes.has(row.employee_code)
        ? { ...row, is_generated: true }
        : row
    );

    const employeesPayload = updated.map((item) =>
      buildEmployeePayload(item, {
        is_generated: selectedCodes.has(item.employee_code)
          ? true
          : item.is_generated == 1,
      })
    );

    try {
      const payroll_month =
        existingForSelectedMonth?.payroll_month && selectedMonth
          ? moment(existingForSelectedMonth.payroll_month)
              .startOf("month")
              .add(1, "days")
              .toISOString()
          : selectedMonth
          ? moment(selectedMonth).startOf("month").add(1, "days").toISOString()
          : null;

      await toast.promise(
        updatePayroll(existingPayrollId, {
          payroll_month,
          employees: employeesPayload,
        }),
        {
          loading: "Updating bank submission status...",
          success: (response) => {
            if (response.code === 200 || response.code === 201) {
              setCalculatedData(updated);
              return `Marked ${selected.length} row(s) as generated for bank submission.`;
            }
            throw new Error(
              response.message || "Failed to update bank submission status."
            );
          },
          error: (err) =>
            err.message || "Error updating bank submission status.",
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectionChanged = () => {
    if (!isBankSubmissionMode) return;
    const api = gridRef.current?.api;
    if (!api) return;
    const selected = api.getSelectedRows?.() ?? [];
    const total = selected.reduce(
      (sum, row) => sum + (parseFloat(row.net_pay) || 0),
      0
    );
    setSelectedNetPayTotal(total);
    const codes = selected.map((row) => row.employee_code).filter((c) => !!c);
    setSelectedEmployeeCodes(codes);
  };

  const handleGeneratePayslip = async () => {
    const api = gridRef.current?.api;
    if (!api) {
      toast.error("Grid not ready.");
      return;
    }
    const selected = api.getSelectedRows?.() ?? [];
    if (selected.length === 0) {
      toast.error("Select at least one row.");
      return;
    }
    if (!selectedMonth) {
      toast.error("No month selected.");
      return;
    }
    const selectedMonthDate = moment(selectedMonth)
      .startOf("month")
      .add(1, "day") // Move to 2nd of the month
      .toISOString();
    const items = selected
      .filter((row) => row.employee_code)
      .map((row) => ({
        employee_code: row.employee_code,
        selected_month: selectedMonthDate,
      }));
    if (items.length === 0) {
      toast.error("No valid rows selected.");
      return;
    }
    try {
      const response = await preparePayslipData({ items });
      if (response.code !== 200 || !response.data?.items) {
        toast.error(response.message || "Failed to prepare payslips.");
        return;
      }
      const results = response.data.items;
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        toast.error(
          `Prepared ${succeeded} payslip(s). ${failed.length} failed: ${failed
            .map((f) => f.error || "Unknown")
            .join(", ")}`
        );
      } else {
        setIsSelectionMode(false);
        toast.success(`Prepared ${succeeded} payslip(s) successfully.`);
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Error preparing payslips."
      );
    }
  };

  const colDef = useMemo(
    () => [
      {
        field: "employee_code",
        headerName: "Employee Code",
        pinned: "left",
        type: "id",
      },
      {
        field: "profile_img_url",
        headerName: "Profile Image",
        pinned: "left",
        type: "image",
        valueGetter: (params) =>
          params.data?.profile_img_url ??
          params.data?.employee?.profile_img_url ??
          null,
      },
      {
        field: "employee_name",
        headerName: "Employee Name",
        pinned: "left",
        valueGetter: (params) =>
          params.data.employee_name ?? params.data?.employee?.employee_name,
      },
      {
        field: "designation_name",
        headerName: "Designation",
        pinned: "left",
        hideByDefault: true,
        type: "capitalize",
        valueGetter: (params) =>
          params.data?.designation_name ??
          params.data?.employee?.designation_name ??
          mappedEmployees[params.data?.employee_code]?.designation_name,
      },
      {
        field: "employee_category",
        headerName: "Category",
        type: "badge-column",
        pinned: "left",
        width: 80,
        valueGetter: (params) =>
          getEmployeeCategoryBadgeValue(
            getEmployeeCategoryFromRow(params.data, mappedEmployees)
          ),
      },
      {
        field: "branch_name",
        headerName: "Branch Name",
        hideByDefault: !isBankSubmissionMode,
        valueGetter: (params) =>
          params.data.branch_name ?? params.data?.employee?.branch_name,
      },
      { field: "date_of_joining", headerName: "Date of Joining", type: "date" },
      {
        field: "actual_pay",
        headerName: "Actual Pay",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.actual_pay),
      },
      {
        field: "days_per_month",
        headerName: "Days per Month",
        computation: true,
        type: "number",
      },
      {
        field: "no_of_working_days",
        headerName: "No of Working Days",
        computation: true,
        type: "number",
        valueGetter: (params) => parseFloat(params.data.no_of_working_days),
      },
      {
        field: "lop_days",
        headerName: "LOP Days",
        computation: true,
        type: "number",
        valueGetter: (params) => parseFloat(params.data.lop_days),
      },
      {
        field: "per_day_salary",
        headerName: "Per Day Salary",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.per_day_salary),
      },
      {
        field: "late_early_hours",
        headerName: "Late/Early Hours",
        type: "number",
        valueGetter: (params) => parseFloat(params.data.late_early_hours),
      },
      {
        field: "overtime_amt",
        headerName: "Overtime Amount",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.overtime_amt),
      },
      {
        field: "incentive",
        headerName: "Incentive",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.incentive),
      },
      {
        field: "gross_pay",
        headerName: "Gross Pay",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.gross_pay),
      },
      {
        field: "lop_amount",
        headerName: "LOP Amount",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.lop_amount),
      },
      {
        field: "lateness_amt",
        headerName: "Lateness Amount",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.lateness_amt),
      },
      {
        field: "advance",
        headerName: "Advance",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.advance),
      },
      {
        field: "penalty",
        headerName: "Penalty",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.penalty),
      },
      {
        field: "employee_esi",
        headerName: "Employee ESI",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.employee_esi),
      },
      {
        field: "employee_epf",
        headerName: "Employee EPF",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.employee_epf),
      },
      {
        field: "employer_esi",
        headerName: "Employer ESI",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.employer_esi),
      },
      {
        field: "employer_epf",
        headerName: "Employer EPF",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.employer_epf),
      },
      {
        field: "net_pay",
        headerName: "Net Pay",
        type: "currency",
        valueGetter: (params) => parseFloat(params.data.net_pay),
      },
      {
        field: "is_payslip_available",
        headerName: "Payslip",
        type: "badge-column",
        valueGetter: (params) => {
          const isGenerated = params.data.is_payslip_available == true;
          return {
            label: isGenerated ? "Generated" : "Not Generated",
            colorScheme: isGenerated ? "green" : "gray",
          };
        },
      },
      {
        field: "status",
        headerName: "Status",
        type: "badge-column",
        pinned: "right",
        valueGetter: (params) => {
          const s = params.data.payment_details?.status?.toLowerCase();
          const isGenerated = params.data.is_generated == true;
          const isOnHold = params.data.on_hold == true;
          const done = s === "processed" || s === "done";

          if (isOnHold) {
            return {
              label: "On Hold",
              colorScheme: "blue",
            };
          }

          if (done) {
            return {
              label: "Paid",
              colorScheme: "green",
            };
          }

          if (isGenerated) {
            return {
              label: "Unpaid (G)",
              colorScheme: "purple",
            };
          }

          return {
            label: "Unpaid",
            colorScheme: "gray",
          };
        },
      },
      {
        field: "actions",
        headerName: "Action",
        type: "action-column",
        pinned: "right",
        valueGetter: (params) => {
          if (!existingPayrollId) return [];
          if (!isApproved) return [];

          const s = params.data.payment_details?.status?.toLowerCase();
          const done = s === "processed" || s === "done";
          const items = [];

          if (canMarkOnHold && params.data?.on_hold == true) {
            items.push({
              label: "Remove On Hold",
              value: "remove_on_hold",
              onClick: () => {
                handleRemoveFromOnHold(params.data?.employee_code);
              },
            });

            return items;
          }

          if (!done) {
            items.push({
              label: "Paid by cash",
              value: "paid_by_cash",
              onClick: () => {
                handlePaidByCash(params.data?.employee_code);
              },
            });
          }

          if (done && params.data.payment_details) {
            items.push({
              label: "View Payment Details",
              value: "view_payment_details",
              onClick: () => {
                setSelectedRowPaymentDetails(params.data);
                setPaymentDetailsDrawerOpen(true);
              },
            });
            const isPaidByCash =
              params.data.payment_details?.mode?.toLowerCase() === "cash";
            if (isPaidByCash) {
              items.push({
                label: "Mark as unpaid",
                value: "mark_as_unpaid",
                onClick: () => {
                  handleMarkAsUnpaid(params.data?.employee_code);
                },
              });
            }
          }
          return items;
        },
      },
    ],
    [
      existingPayrollId,
      isApproved,
      isBankSubmissionMode,
      mappedEmployees,
      canMarkOnHold,
      handleRemoveFromOnHold,
      handlePaidByCash,
      handleMarkAsUnpaid,
      setSelectedRowPaymentDetails,
      setPaymentDetailsDrawerOpen,
    ]
  );

  const filteredData = useMemo(() => {
    if (!isBankSubmissionMode || !calculatedData) return calculatedData;
    if (!selectedBranchId) return calculatedData;
    return calculatedData.filter((row) => {
      const branchId =
        row.branch_id ?? row.employee?.branch_id ?? row.employee?.branch?.id;
      if (!branchId) return false;
      return String(branchId) === String(selectedBranchId);
    });
  }, [isBankSubmissionMode, calculatedData, selectedBranchId]);

  const autoSelectCategoryOptions = useMemo(() => {
    const categories = new Set();
    (filteredData || []).forEach((row) => {
      const category = getEmployeeCategoryFromRow(row, mappedEmployees);
      if (category) categories.add(category);
    });
    return Array.from(categories)
      .sort((a, b) => a.localeCompare(b))
      .map((category) => ({
        value: category,
        label: capitalizeWordsLatest(category),
      }));
  }, [filteredData, mappedEmployees]);

  const autoSelectDesignationOptions = useMemo(() => {
    const designations = new Set();
    (filteredData || []).forEach((row) => {
      const designation = getEmployeeDesignationFromRow(row, mappedEmployees);
      if (designation) designations.add(designation);
    });
    return Array.from(designations)
      .sort((a, b) => a.localeCompare(b))
      .map((designation) => ({
        value: designation,
        label: capitalizeWordsLatest(designation),
      }));
  }, [filteredData, mappedEmployees]);

  const displayData = useMemo(() => {
    if (!filteredData) return filteredData;
    if (!isSelectionMode || !selectedEmployeeCodes.length) return filteredData;

    const selectedSet = new Set(selectedEmployeeCodes);
    const arr = [...filteredData];
    arr.sort((a, b) => {
      const aSel = selectedSet.has(a.employee_code);
      const bSel = selectedSet.has(b.employee_code);
      if (aSel === bSel) return 0;
      return aSel ? -1 : 1;
    });
    return arr;
  }, [filteredData, isSelectionMode, selectedEmployeeCodes]);

  const hasData = filteredData && filteredData.length > 0;
  const showFileUpload =
    selectedMonth &&
    calculatedData === null &&
    !isApprovalMode &&
    !isBankSubmissionMode;
  const loadingExisting =
    selectedMonth && existingForSelectedMonth && calculatedData === null;

  const getPermissionKey = () => {
    if (isApprovalMode) {
      return "view_payroll_approvals";
    }

    if (isBankSubmissionMode) {
      return "view_payroll_bank_submission";
    }

    return "view_payroll_entry";
  };
  const getTitle = () => {
    if (isApprovalMode) return "Payroll Approval";
    if (isBankSubmissionMode) return "Bank Submission";
    return "Payroll Entries";
  };

  const renderRightSection = () => {
    if (!selectedMonth || !hasData) return null;
    if (isApprovalMode) {
      return (
        <Flex gap={2} align="center">
          <Button size="xs" colorPalette="brand" onClick={handleApprove}>
            {isApproved ? "Unapprove" : "Approve"}
          </Button>
        </Flex>
      );
    }

    if (isBankSubmissionMode) {
      if (!isApproved) {
        return (
          <Text fontSize="xs" fontWeight="medium" color="secondary.600">
            Please approve the payroll first
          </Text>
        );
      }

      if (isSelectionMode) {
        return (
          <Flex gap={3} align="center">
            <Text fontSize="xs" fontWeight="medium" color="secondary.600">
              Total Net Pay:{" "}
              <Text fontWeight="bold" color="secondary.600" as="span">
                {formatCurrency(selectedNetPayTotal)}
              </Text>
            </Text>
            <Button
              size="xs"
              variant="outline"
              colorPalette="secondary"
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedNetPayTotal(0);
                setSelectedEmployeeCodes([]);
                const api = gridRef.current?.api;
                api?.deselectAll?.();
              }}
            >
              Done
            </Button>
            <Button
              size="xs"
              colorPalette="brand"
              onClick={handleExportSelectedForBank}
            >
              Export
            </Button>
          </Flex>
        );
      }
      return (
        <Flex gap={2} align="center">
          <Button
            size="xs"
            variant="outline"
            colorPalette="secondary"
            onClick={() => {
              setIsSelectionMode(true);
              setSelectedNetPayTotal(0);
              setSelectedEmployeeCodes([]);
              const api = gridRef.current?.api;
              api?.deselectAll?.();
            }}
          >
            Select Rows
          </Button>
        </Flex>
      );
    }

    const isUnsaved = hasData && !existingPayrollId;

    if (!isApproved) {
      return (
        <Flex gap={2} align="center">
          {!isUnsaved && (
            <Text fontSize="xs" fontWeight="medium" color="secondary.600">
              Please approve the payroll first
            </Text>
          )}

          <Button
            size="xs"
            variant="subtle"
            colorPalette="red"
            onClick={handleClear}
          >
            Clear
          </Button>

          {isUnsaved && (
            <Button size="xs" colorPalette="brand" onClick={handleSave}>
              Save
            </Button>
          )}
        </Flex>
      );
    }

    if (isSelectionMode) {
      return (
        <Flex gap={2} align="center">
          <Button
            size="xs"
            variant="outline"
            colorPalette="secondary"
            onClick={() => setIsSelectionMode(false)}
          >
            Done
          </Button>
          {canMarkOnHold && (
            <Button
              size="xs"
              variant="subtle"
              colorPalette="orange"
              onClick={handleMarkAsHold}
            >
              Mark as Hold
            </Button>
          )}
          <Button
            size="xs"
            variant="subtle"
            colorPalette="red"
            onClick={handleRemovePaymentDetails}
          >
            Remove Payment Details
          </Button>
          <Button
            size="xs"
            colorPalette="brand"
            onClick={handleGeneratePayslip}
          >
            Generate Payslip
          </Button>
        </Flex>
      );
    }
    if (allowAdd) {
      if (isUnsaved) {
        return (
          <Flex gap={2} align="center">
            <Button size="xs" colorPalette="brand" onClick={handleSave}>
              Save
            </Button>
          </Flex>
        );
      }
      return (
        <Flex gap={3} align="center">
          <Button
            size="xs"
            variant="outline"
            colorPalette="secondary"
            onClick={() => setIsSelectionMode(true)}
          >
            Select Rows
          </Button>
          <Box h="20px" w="1px" bg="secondary.200" />
          <Button
            size="xs"
            variant="subtle"
            colorPalette="red"
            onClick={handleClear}
          >
            Clear
          </Button>
          <Box h="20px" w="1px" bg="secondary.200" />
          <Flex gap={2}>
            <FileUploaderWithColumnMapping
              targetColumns={PAYMENT_IMPORT_TARGET_COLUMNS}
              onDataMapped={handlePaymentImportPreview}
              renderer={({ openFileSelector }) => (
                <Button variant="subtle" size="xs" onClick={openFileSelector}>
                  Import Payment Details
                </Button>
              )}
            />
            <Button size="xs" colorPalette="brand" onClick={handleSave}>
              Save
            </Button>
          </Flex>
        </Flex>
      );
    }
    return null;
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <DeleteModalComponent />
      <CustomContainer
        headerBand={!isApprovalMode}
        breadcrumb={isApprovalMode ? "Approvals  /  Payroll Approval" : undefined}
        title={getTitle()}
        rightSection={
          <Flex gap="8px" alignItems="center" flexWrap="wrap">
            {renderRightSection()}
            {showFileUpload && (
              <Button size="sm" onClick={() => setIsImportOpen(true)}>
                <i className="fa fa-upload" /> Import Payroll
              </Button>
            )}
          </Flex>
        }
      >
        <Flex flexDirection="column" gap="16px">
          {/* Figma "Calendar View (2026)": white, radius 8, padding 24, 16/600 title. */}
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="border"
            borderRadius="8px"
            p={{ base: "16px", md: "24px" }}
          >
            {isApprovalMode && (
              <Text fontSize="16px" fontWeight="600" lineHeight="23px" color="fg" mb="16px">
                Calendar View ({selectedYear})
              </Text>
            )}
            <PayrollMonthCalendar
              payrollsByMonth={payrollsByMonth}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={handleYearChange}
              onMonthClick={handleMonthClick}
            />
          </Box>

          <Box>
            {!selectedMonth && (
              <Text color="gray.500" fontSize="sm">
                Select a month above to view or create payroll.
              </Text>
            )}
            {loadingExisting && (
              <Text color="gray.500" fontSize="sm">
                Loading payroll...
              </Text>
            )}
            {(isApprovalMode || isBankSubmissionMode) &&
              selectedMonth &&
              !existingForSelectedMonth &&
              !loadingExisting && (
                <Flex direction="column" gap="24px">
                  {/* Figma: "Payroll - Nov 2026" heading, then an empty-month card. */}
                  <Text fontSize="18px" fontWeight="600" lineHeight="26px" color="fg">
                    Payroll - {moment(selectedMonth).format("MMM YYYY")}
                  </Text>
                  <Flex
                    align="center"
                    justify="center"
                    minH="160px"
                    bg="white"
                    borderWidth="1px"
                    borderColor="border"
                    borderRadius="8px"
                    p="24px"
                  >
                    <Text fontSize="14px" color="fg.muted">
                      No payroll for this month.
                    </Text>
                  </Flex>
                </Flex>
              )}
            {showFileUpload && (
              <Flex
                direction="column"
                alignItems="center"
                gap="8px"
                bg="white"
                borderWidth="1px"
                borderColor="border"
                borderRadius="14px"
                py="36px"
              >
                <Text fontSize="15px" fontWeight="600" color="gray.700">
                  No payroll for {moment(selectedMonth).format("MMM YYYY")} yet
                </Text>
                <Text fontSize="13px" color="gray.500">
                  Import the month's payroll sheet (.xlsx, .xls or .csv) to get started.
                </Text>
                <Button size="sm" mt="6px" onClick={() => setIsImportOpen(true)}>
                  <i className="fa fa-upload" /> Import Payroll
                </Button>
              </Flex>
            )}
            <CustomDialog
              open={isImportOpen && showFileUpload}
              onOpenChange={(e) => setIsImportOpen(e.open)}
              title={`Import Payroll — ${moment(selectedMonth).format("MMM YYYY")}`}
              maxW="760px"
            >
              <FileUploaderWithColumnMapping
                targetColumns={targetColumns}
                onDataMapped={(mapped) => {
                  handleDataMapped(mapped);
                  setIsImportOpen(false);
                }}
                fileUploaderProps={{
                  color: "brand",
                  size: "md",
                  showClipboardButton: false,
                }}
              />
            </CustomDialog>
            {selectedMonth && hasData && (
              <Box>
                {isBankSubmissionMode && (
                  <Flex
                    mb={4}
                    gap={3}
                    align="flex-end"
                    wrap="wrap"
                    justifyContent="space-between"
                  >
                    <BranchFilter
                      value={selectedBranchId}
                      onChange={setSelectedBranchId}
                    />
                    <Button
                      size="xs"
                      variant="subtle"
                      colorPalette="brand"
                      onClick={() => setIsAutoSelectModalOpen(true)}
                    >
                      <i className="fa fa-bolt" />
                      Auto Select by Amount
                    </Button>
                  </Flex>
                )}
                <AgGrid
                  ref={gridRef}
                  tableKey={`payroll-data-${type}`}
                  rowData={displayData}
                  columnDefs={colDef}
                  rowSelection={
                    isSelectionMode && (!isApprovalMode || isBankSubmissionMode)
                      ? {
                          mode: "multiRow",
                          isRowSelectable: (params) =>
                            params?.data?.on_hold == true ? false : true,
                        }
                      : undefined
                  }
                  getRowId={
                    isSelectionMode && (!isApprovalMode || isBankSubmissionMode)
                      ? (params) =>
                          params.data?.employee_code ??
                          String(params.node?.id ?? params.node?.rowIndex)
                      : undefined
                  }
                  selectionColumnDef={
                    isSelectionMode && (!isApprovalMode || isBankSubmissionMode)
                      ? {
                          pinned: "left",
                          width: 50,
                          maxWidth: 50,
                          minWidth: 50,
                          resizable: false,
                          suppressHeaderMenuButton: true,
                          sortable: false,
                          suppressMovable: true,
                        }
                      : undefined
                  }
                  gridOptions={{
                    autoSizeStrategy: { type: "fitCellContents" },
                  }}
                  onSelectionChanged={
                    isBankSubmissionMode && isSelectionMode
                      ? () => {
                          // Safety: if anything on-hold gets selected, immediately deselect it
                          const api = gridRef.current?.api;
                          if (api) {
                            api.forEachNode?.((node) => {
                              if (
                                node?.isSelected?.() &&
                                node.data?.on_hold == true
                              ) {
                                node.setSelected?.(false);
                              }
                            });
                          }
                          handleSelectionChanged();
                        }
                      : undefined
                  }
                />
              </Box>
            )}
          </Box>
        </Flex>
      </CustomContainer>

      {isAutoSelectModalOpen && (
        <Flex
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={1000}
          justifyContent="center"
          alignItems="center"
          h="100dvh"
        >
          <Dialog.Root
            open={isAutoSelectModalOpen}
            closeOnInteractOutside={false}
            onOpenChange={(e) => {
              if (!e.open) {
                setIsAutoSelectModalOpen(false);
                setAutoSelectCategories([]);
                setAutoSelectDesignations([]);
              }
            }}
          >
            <DialogBackdrop
              bg="blackAlpha.600"
              backdropFilter="blur(4px)"
              onClick={() => {
                setIsAutoSelectModalOpen(false);
                setAutoSelectCategories([]);
                setAutoSelectDesignations([]);
              }}
            />
            <DialogContent
              mx={4}
              borderRadius="6px"
              overflow="visible"
              maxW="sm"
            >
              <Box ref={autoSelectDialogContentRef} overflow="visible">
                <DialogHeader pb={2}>
                  <Text fontSize="md" fontWeight="semibold" color="gray.800">
                    Auto Select Employees
                  </Text>
                </DialogHeader>
                <DialogBody pt={0}>
                  <Text fontSize="sm" mb={2} color="gray.600">
                    Enter the maximum total net pay. The system will select the
                    maximum number of employees whose combined net pay is less
                    than or equal to this amount.
                  </Text>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={autoSelectAmount}
                    onChange={(e) => setAutoSelectAmount(e.target.value)}
                  />
                  <Box mt={4}>
                    <CustomInput
                      label="Category"
                      name="auto_select_categories"
                      method="multiple-dropdown"
                      placeholder="All categories"
                      options={autoSelectCategoryOptions}
                      value={autoSelectCategories}
                      menuPortalRef={autoSelectDialogContentRef}
                      onChange={(categories) =>
                        setAutoSelectCategories(categories ?? [])
                      }
                    />
                  </Box>
                  <Box mt={4}>
                    <CustomInput
                      label="Designation"
                      name="auto_select_designations"
                      method="multiple-dropdown"
                      placeholder="All designations"
                      options={autoSelectDesignationOptions}
                      value={autoSelectDesignations}
                      menuPortalRef={autoSelectDialogContentRef}
                      onChange={(designations) =>
                        setAutoSelectDesignations(designations ?? [])
                      }
                    />
                  </Box>
                </DialogBody>
                <DialogFooter pt={4} gap={3}>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => {
                      setIsAutoSelectModalOpen(false);
                      setAutoSelectCategories([]);
                      setAutoSelectDesignations([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    colorPalette="brand"
                    onClick={handleAutoSelectByAmount}
                  >
                    Apply
                  </Button>
                </DialogFooter>
              </Box>
            </DialogContent>
          </Dialog.Root>
        </Flex>
      )}

      <PaymentDetailsDrawer
        isOpen={paymentDetailsDrawerOpen}
        onClose={() => {
          setPaymentDetailsDrawerOpen(false);
          setSelectedRowPaymentDetails(null);
        }}
        selectedRow={selectedRowPaymentDetails}
      />

      {paymentImportPreviewOpen && (
        <Flex
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={1000}
          justifyContent="center"
          alignItems="center"
          h="100dvh"
        >
          <Dialog.Root
            open={paymentImportPreviewOpen}
            onOpenChange={(e) => {
              if (!e.open) {
                setPaymentImportPreviewOpen(false);
                setPaymentImportPreviewData(null);
              }
            }}
            size="xl"
          >
            <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <DialogContent
              mx={4}
              borderRadius="6px"
              overflow="hidden"
              maxW="2xl"
              maxH="90vh"
            >
              <DialogHeader>Import Payment Details - Preview</DialogHeader>
              <DialogBody overflowY="auto">
                <Flex align="stretch" gap={4} flexDirection="column">
                  {paymentImportPreviewSummary.unmapped.length > 0 && (
                    <Box>
                      <Text
                        fontWeight="semibold"
                        fontSize="sm"
                        mb="2"
                        color="gray.600"
                      >
                        Bank A/C No. and IFSC with no matching employee
                      </Text>
                      <Box w="100%">
                        <AgGrid
                          pagination={false}
                          tableKey="payment-import-preview-unmapped"
                          rowData={paymentImportPreviewSummary.unmapped}
                          columnDefs={[
                            { field: "account_no", headerName: "BANK A/C NO." },
                            { field: "ifsc_code", headerName: "IFSC CODE" },
                            { field: "status", headerName: "STATUS" },
                          ]}
                          showColumnSettings={false}
                        />
                      </Box>
                    </Box>
                  )}
                  <Box>
                    <Text
                      fontWeight="semibold"
                      fontSize="sm"
                      mb="2"
                      color="gray.600"
                    >
                      Mapped rows ({paymentImportPreviewSummary.mapped.length})
                    </Text>
                    <Box w="100%">
                      <AgGrid
                        tableKey="payment-import-preview-mapped"
                        rowData={paymentImportPreviewSummary.mapped}
                        columnDefs={[
                          {
                            field: "employee_code",
                            headerName: "EMPLOYEE CODE",
                          },
                          {
                            field: "employee_name",
                            headerName: "EMPLOYEE NAME",
                          },
                          { field: "account_no", headerName: "BANK A/C NO." },
                          { field: "ifsc_code", headerName: "IFSC CODE" },
                          { field: "status", headerName: "STATUS" },
                        ]}
                        showColumnSettings={false}
                      />
                    </Box>
                  </Box>
                </Flex>
              </DialogBody>
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPaymentImportPreviewOpen(false);
                    setPaymentImportPreviewData(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  colorPalette="brand"
                  onClick={() => {
                    if (paymentImportPreviewData) {
                      handlePaymentDataMapped(paymentImportPreviewData);
                      setPaymentImportPreviewOpen(false);
                      setPaymentImportPreviewData(null);
                      toast.success("Payment details imported.");
                    }
                  }}
                >
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog.Root>
        </Flex>
      )}
    </GlobalWrapper>
  );
}

export default PayrollEntryList;
