export const calculateIncentive = (params) => {
    const { employee, grns, wmsPurchaseEntries, stickering, accountsSheet, incentives } = params;

    const filteredGrns = grns.filter((item) => {
        if (item.employee_id !== employee.employee_code) {
            return false;
        }
        return true;
    });

    const filteredWMSPurchaseEntries = wmsPurchaseEntries.filter((item) => {
        if (item.handled_by !== employee.employee_code) {
            return false;
        }

        return true;
    });

    const filteredStickering = stickering.filter((item) => {
        if (item.employee_code !== employee.employee_code) {
            return false;
        }
        return true;
    });

    const filteredAccountsSheet = accountsSheet.filter((item) => {
        if (item.employee_id !== employee.employee_code) {
            return false;
        }
        return true;
    });

    switch (employee.incentive_type_resolved) {
        case "grn":
            return calculateGRNIncentive(filteredGrns, incentives.grn);
        case "purchase-data-entry":
            return calculateWMSPurchaseEntryIncentive(filteredWMSPurchaseEntries, incentives.purchaseDataEntry);
        case "stickering":
            return calculateStickeringIncentive(filteredStickering, incentives.stickering);
        case "billing-checker":
            return calculateBillingCheckerIncentive(filteredAccountsSheet, incentives.billingChecker);
        case "billing-operator":
            return calculateBillingCheckerIncentive(filteredAccountsSheet, incentives.billingOperator);
        default:
            return null;
    }
};

const calculateBillingCheckerIncentive = (accountsSheet, billingCheckerIncentives) => {
    const totalAmountGrouped = accountsSheet.reduce((acc, item) => {
        if (!acc[item.cluster_size]) {
            acc[item.cluster_size] = 0;
        }
        acc[item.cluster_size] += parseFloat(item.total_sales);
        return acc;
    }, { small: 0, medium: 0, large: 0 });

    const groupedIncentives = billingCheckerIncentives.reduce((acc, item) => {
        if (!acc[item.cluster_size]) {
            acc[item.cluster_size] = [];
        }
        acc[item.cluster_size].push(item);
        return acc;
    }, { small: [], medium: [], large: [] });

    const smallIncentive = getIncentiveValue(groupedIncentives.small, totalAmountGrouped.small);
    const mediumIncentive = getIncentiveValue(groupedIncentives.medium, totalAmountGrouped.medium);
    const largeIncentive = getIncentiveValue(groupedIncentives.large, totalAmountGrouped.large);

    const totalObject = {
        small: smallIncentive,
        medium: mediumIncentive,
        large: largeIncentive,
        total: smallIncentive.value + mediumIncentive.value + largeIncentive.value,
    }

    return totalObject;
}

const calculateStickeringIncentive = (stickering, stickeringIncentives) => {
    // const totalAmount = grn.reduce((acc, item) => {
    //     return acc + parseFloat(item.purchase_acknowledgment.amount);
    // }, 0);

    // return getIncentiveValue(grnIncentives, totalAmount);

    const groupedIncentives = stickeringIncentives.reduce((acc, item) => {
        if (!item.material_type) {
            return acc;
        }

        if (!acc[item.material_type]) {
            acc[item.material_type] = [];
        }

        acc[item.material_type].push(item);

        return acc;
    }, { "single": [], "double": [], "looping": [] });

    const totals = stickering.reduce((acc, item) => {
        if (!item.material_type) {
            return acc;
        }

        if (!acc[item.material_type]) {
            acc[item.material_type] = 0
        }

        acc[item.material_type] += parseFloat(item.qty);

        return acc
    }, { "single": 0, "double": 0, "looping": 0 })

    const singleIncentive = getIncentiveValue(groupedIncentives.single, totals.single);
    const doubleIncentive = getIncentiveValue(groupedIncentives.double, totals.double);
    const loopingIncentive = getIncentiveValue(groupedIncentives.looping, totals.looping);

    const totalObject = {
        single: singleIncentive,
        double: doubleIncentive,
        looping: loopingIncentive,
        total: singleIncentive.value + doubleIncentive.value + loopingIncentive.value,
    }

    return totalObject;
};

const calculateGRNIncentive = (grn, grnIncentives) => {
    const totalAmount = grn.reduce((acc, item) => {
        return acc + parseFloat(item.purchase_acknowledgment.amount);
    }, 0);

    return getIncentiveValue(grnIncentives, totalAmount);
};

const calculateWMSPurchaseEntryIncentive = (wmsPurchaseEntries, wmsPurchaseEntryIncentives) => {
    const totalAmount = wmsPurchaseEntries.reduce((acc, item) => {
        return acc + parseFloat(item.invoice_amount);
    }, 0);

    return getIncentiveValue(wmsPurchaseEntryIncentives, totalAmount);
};

const getIncentiveValue = (incentives, totalValue) => {
    const incentive = incentives.find((item) => {
        return item.selected_month === null;
    });

    let value = null;
    let calculationValue = null;

    if (incentive) {
        switch (incentive.incentive_type) {
            case "single_percentage":
                value = totalValue * (incentive.value / 100);
                calculationValue = incentive.value
                break;
            case "fixed":
                value = totalValue * incentive.value;
                calculationValue = incentive.value
                break;
            case "ranged_percentage":
                calculationValue = getValueFromRange(incentive, totalValue, "percentage");
                value = totalValue * (calculationValue / 100);
                break;
            case "ranged_fixed":
                calculationValue = getValueFromRange(incentive, totalValue, "fixed");
                value = totalValue * calculationValue;
                break;
            default: value = null;
        }
    }

    return { value, actualValue: totalValue, calculationValue: calculationValue ? parseFloat(calculationValue) : null, type: incentive?.incentive_type || null };
}

const getValueFromRange = (incentive, totalValue, type) => {
    const { ranges } = incentive;

    const range = ranges.find((item) => {
        const start = item.start || 0;
        const end = item.end || Infinity;

        return totalValue >= start && totalValue <= end;
    })

    if (type === "percentage") {
        return range ? range.percentage : null;
    }

    return range ? range.fixed : null;
}