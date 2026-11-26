import moment from "moment";

export const roundOff = (value) => {
    return Math.round(value * 100) / 100;
}

export const transformPayrollData = (unformattedData, payrollMonth, mappedEmployees) => {

    const checkNull = (value) => {
        return value !== null && value !== "" && value !== undefined ? parseFloat(value) : null;
    }

    const employee = mappedEmployees[unformattedData.employee_code];

    const item = {
        ...unformattedData,
        incentive: checkNull(unformattedData.incentive),
        overtime_amt: checkNull(unformattedData.overtime_amt),
        lateness_amt: checkNull(unformattedData.lateness_amt),
        advance: checkNull(unformattedData.advance),
        penalty: checkNull(unformattedData.penalty),
        employee_esi: checkNull(unformattedData.employee_esi),
        employee_epf: checkNull(unformattedData.employee_epf),
        no_of_working_days: checkNull(unformattedData.no_of_working_days),
        actual_pay: checkNull(unformattedData.actual_pay),
        late_early_hours: checkNull(unformattedData.late_early_hours.toFixed(2)),
        employee: employee
    }

    const days_per_month = payrollMonth ? moment(payrollMonth).daysInMonth() : 0;
    const lop_days = days_per_month - item.no_of_working_days;
    const per_day_salary = item.actual_pay / days_per_month;
    const gross_pay = per_day_salary * days_per_month + (item.incentive ?? 0) + item.overtime_amt;
    const lop_amount = per_day_salary * lop_days;
    const net_pay = roundOff(gross_pay - lop_amount - item.lateness_amt - item.advance - item.penalty - item.employee_esi - item.employee_epf).toFixed(0);

    return {
        ...item,
        days_per_month,
        lop_days,
        per_day_salary,
        gross_pay,
        lop_amount,
        net_pay
    };
};