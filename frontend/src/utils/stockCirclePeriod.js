import moment from "moment";

/**
 * Days until the circle period end (negative = overdue). Mirrors stock checker hub logic.
 */
export function calculateDaysLeft({
  period_type,
  period,
  period_start_date,
  period_end_date,
}) {
  let endDate = null;

  if (period_type === "daily" || period_type === "monthly") {
    if (period_end_date) {
      endDate = moment(period_end_date);
    }
  } else if (period_type === "yearly") {
    if (period) {
      const match = period.match(/(\d{4})-(\d{4})/);
      if (match) {
        const endYear = parseInt(match[2], 10);
        endDate = moment(`${endYear}-03-31`, "YYYY-MM-DD");
      }
    }
  } else if (period_type === "biyearly") {
    if (period) {
      const endPart = period.split(" - ")[1];
      if (endPart) {
        endDate = moment(endPart.trim(), "DD MMM YYYY");
      }
    }
  } else if (period_type === "quarterly") {
    if (period) {
      const parts = period.split(" - ");
      if (parts.length === 2) {
        const endPart = parts[1].trim();
        const parsed = moment(endPart, "DD MMM YYYY", true);
        if (parsed.isValid()) {
          endDate = parsed;
        }
      }
      if (!endDate || !endDate.isValid()) {
        const match = period.match(/Q\d\s(\d{4})\s\((\w{3})\s-\s(\w{3})\)/);
        if (match) {
          const year = parseInt(match[1], 10);
          const endMonth = match[3];
          const monthIndex = moment().month(endMonth).month();
          endDate = moment(
            `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
            "YYYY-MM"
          ).endOf("month");
        }
      }
    }
  } else if (period_type === "term") {
    if (period) {
      const parts = period.split(" - ");
      if (parts.length === 2) {
        const endPart = parts[1].trim();
        const parsed = moment(endPart, "DD MMM YYYY", true);
        if (parsed.isValid()) {
          endDate = parsed;
        }
      }
    }
  }

  if (!endDate || !endDate.isValid()) {
    return null;
  }

  const today = moment().startOf("day");
  const end = endDate.startOf("day");
  return end.diff(today, "days");
}
