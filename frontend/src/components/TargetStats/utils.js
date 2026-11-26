import moment from "moment";

/**
 * Calculate total sales from entryTargets for a given branch, department, section, and date range
 */
export const calculateSales = (
  entryTargets = [],
  filters = {
    branchId: null,
    departmentId: null,
    sectionId: null,
    targetMonth: null,
  }
) => {
  let total = 0;

  entryTargets.forEach((entry) => {
    // Filter by branch
    if (filters.branchId && entry.branch_id !== filters.branchId) {
      return;
    }

    // Filter by department
    if (
      filters.departmentId !== null &&
      filters.departmentId !== undefined &&
      entry.department_id !== filters.departmentId
    ) {
      return;
    }

    // Filter by section
    if (
      filters.sectionId !== null &&
      filters.sectionId !== undefined &&
      entry.section_id !== filters.sectionId
    ) {
      return;
    }

    // Filter by month
    if (filters.targetMonth) {
      const entryDate = moment(entry.date);
      const targetDate = moment(filters.targetMonth);
      if (
        !entryDate.isSame(targetDate, "month") ||
        !entryDate.isSame(targetDate, "year")
      ) {
        return;
      }
    }

    total += parseFloat(entry.sales_amount || 0);
  });

  return total;
};

/**
 * Get branch statistics
 */
export const getBranchStats = (branchTargets = [], entryTargets = []) => {
  return branchTargets.map((branch) => {
    const targetAmount = parseFloat(branch.target_amount || 0);
    const salesMade = calculateSales(entryTargets, {
      branchId: branch.branch_id,
      targetMonth: branch.target_month,
    });
    const targetLeft = Math.max(0, targetAmount - salesMade);
    const achievementPerc =
      targetAmount > 0 ? (salesMade / targetAmount) * 100 : 0;

    return {
      ...branch,
      targetAmount,
      salesMade,
      targetLeft,
      achievementPerc,
    };
  });
};

/**
 * Get department statistics
 */
export const getDepartmentStats = (
  departmentTargets = [],
  entryTargets = []
) => {
  return departmentTargets.map((dept) => {
    const targetAmount = parseFloat(dept.target_amount || 0);
    const salesMade = calculateSales(entryTargets, {
      branchId: dept.branch_id,
      departmentId: dept.department_id,
      targetMonth: dept.target_date,
    });
    const targetLeft = Math.max(0, targetAmount - salesMade);
    const achievementPerc =
      targetAmount > 0 ? (salesMade / targetAmount) * 100 : 0;

    return {
      ...dept,
      targetAmount,
      salesMade,
      targetLeft,
      achievementPerc,
    };
  });
};

/**
 * Get section statistics
 */
export const getSectionStats = (sectionTargets = [], entryTargets = []) => {
  return sectionTargets.map((section) => {
    const targetAmount = parseFloat(section.target_amount || 0);
    const salesMade = calculateSales(entryTargets, {
      branchId: section.branch_id,
      departmentId: section.department_id,
      sectionId: section.section_id,
      targetMonth: section.target_date,
    });
    const targetLeft = Math.max(0, targetAmount - salesMade);
    const achievementPerc =
      targetAmount > 0 ? (salesMade / targetAmount) * 100 : 0;

    return {
      ...section,
      targetAmount,
      salesMade,
      targetLeft,
      achievementPerc,
    };
  });
};

/**
 * Get employee statistics
 */
export const getEmployeeStats = (entryTargets = []) => {
  const employeeMap = {};

  entryTargets.forEach((entry) => {
    const key = `${entry.employee_code}_${entry.branch_id}_${
      entry.department_id || "null"
    }_${entry.section_id || "null"}`;
    const monthKey = moment(entry.date).format("YYYY-MM");

    if (!employeeMap[key]) {
      employeeMap[key] = {
        employee_code: entry.employee_code,
        employee_name: entry.employee_name,
        branch_id: entry.branch_id,
        branch_name: entry.branch_name,
        department_id: entry.department_id,
        department_name: entry.department_name,
        section_id: entry.section_id,
        section_name: entry.section_name,
        monthlySales: {},
      };
    }

    if (!employeeMap[key].monthlySales[monthKey]) {
      employeeMap[key].monthlySales[monthKey] = 0;
    }

    employeeMap[key].monthlySales[monthKey] += parseFloat(
      entry.sales_amount || 0
    );
  });

  // Convert to array and calculate totals
  return Object.values(employeeMap).map((emp) => {
    const totalSales = Object.values(emp.monthlySales).reduce(
      (sum, sales) => sum + sales,
      0
    );

    return {
      ...emp,
      salesMade: totalSales,
      monthlySales: emp.monthlySales,
    };
  });
};

/**
 * Get overall statistics
 */
export const getOverallStats = (
  branchTargets = [],
  departmentTargets = [],
  sectionTargets = [],
  entryTargets = []
) => {
  // Calculate total target (from branch targets)
  const totalTarget = branchTargets.reduce(
    (sum, branch) => sum + parseFloat(branch.target_amount || 0),
    0
  );

  // Calculate total sales from all entries
  const totalSales = entryTargets.reduce(
    (sum, entry) => sum + parseFloat(entry.sales_amount || 0),
    0
  );

  const targetLeft = Math.max(0, totalTarget - totalSales);
  const achievementPerc =
    totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0;

  return {
    totalTarget,
    totalSales,
    targetLeft,
    achievementPerc,
  };
};

/**
 * Get percentage color based on achievement
 */
export const getPercentageColor = (percentage) => {
  if (percentage < 25) return "red.600";
  if (percentage < 50) return "orange.600";
  if (percentage < 75) return "yellow.600";
  return "green.600";
};
