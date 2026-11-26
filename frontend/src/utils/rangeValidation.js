/**
 * Validates a single range
 * @param {Object} range - Range object with start, end, startOperator, endOperator
 * @param {Array} existingRanges - Array of existing ranges to check for overlaps
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateRange = (range, existingRanges = []) => {
  const { start, end, startOperator, endOperator } = range;

  // At least one limit must be set
  if (!start && !end) {
    return {
      isValid: false,
      error: "At least one limit (start or end) must be set",
    };
  }

  // If both limits are set, validate their relationship
  if (start !== null && start !== undefined && end !== null && end !== undefined) {
    // Both limits cannot be "more than" or both "less than"
    if (startOperator === "more_than" && endOperator === "more_than") {
      return {
        isValid: false,
        error: "Cannot have both limits as 'more than'",
      };
    }

    if (startOperator === "less_than" && endOperator === "less_than") {
      return {
        isValid: false,
        error: "Cannot have both limits as 'less than'",
      };
    }

    // If start is "more than" and end is "less than", start must be less than end
    if (startOperator === "more_than" && endOperator === "less_than") {
      if (start >= end) {
        return {
          isValid: false,
          error: "Start value must be less than end value",
        };
      }
    }

    // If start is "less than" and end is "more than", this is invalid
    if (startOperator === "less_than" && endOperator === "more_than") {
      return {
        isValid: false,
        error: "Invalid range: start cannot be 'less than' when end is 'more than'",
      };
    }

    // If both are same operator, validate accordingly
    if (startOperator === "more_than" && endOperator === "more_than") {
      return {
        isValid: false,
        error: "Invalid range configuration",
      };
    }

    if (startOperator === "less_than" && endOperator === "less_than") {
      return {
        isValid: false,
        error: "Invalid range configuration",
      };
    }
  }

  // Check for overlaps with existing ranges
  if (existingRanges.length > 0) {
    const overlapError = checkRangeOverlaps(range, existingRanges);
    if (overlapError) {
      return {
        isValid: false,
        error: overlapError,
      };
    }
  }

  return { isValid: true, error: null };
};

/**
 * Checks if a range overlaps with existing ranges
 * @param {Object} range - Range to check
 * @param {Array} existingRanges - Array of existing ranges
 * @returns {string|null} - Error message if overlap found, null otherwise
 */
export const checkRangeOverlaps = (range, existingRanges) => {
  const { start, end, startOperator, endOperator } = range;

  for (const existingRange of existingRanges) {
    const {
      start: existingStart,
      end: existingEnd,
      startOperator: existingStartOp,
      endOperator: existingEndOp,
    } = existingRange;

    // Skip if comparing with itself (by reference)
    if (range === existingRange) continue;

    // Check for overlaps based on operators
    const hasOverlap = checkSingleRangeOverlap(
      { start, end, startOperator, endOperator },
      {
        start: existingStart,
        end: existingEnd,
        startOperator: existingStartOp,
        endOperator: existingEndOp,
      }
    );

    if (hasOverlap) {
      return "This range overlaps with an existing range";
    }
  }

  return null;
};

/**
 * Checks if two ranges overlap
 */
const checkSingleRangeOverlap = (range1, range2) => {
  // Helper to get the actual range bounds
  const getBounds = (range) => {
    let min = -Infinity;
    let max = Infinity;

    if (range.start !== null && range.start !== undefined) {
      if (range.startOperator === "more_than") {
        min = range.start;
      } else if (range.startOperator === "less_than") {
        max = range.start;
      }
    }

    if (range.end !== null && range.end !== undefined) {
      if (range.endOperator === "more_than") {
        min = Math.max(min, range.end);
      } else if (range.endOperator === "less_than") {
        max = Math.min(max, range.end);
      }
    }

    return { min, max };
  };

  const bounds1 = getBounds(range1);
  const bounds2 = getBounds(range2);

  // Check if ranges overlap
  return bounds1.min < bounds2.max && bounds2.min < bounds1.max;
};

/**
 * Validates an array of ranges
 * @param {Array} ranges - Array of range objects
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
export const validateRanges = (ranges) => {
  const errors = [];

  ranges.forEach((range, index) => {
    const otherRanges = ranges.filter((_, i) => i !== index);
    const validation = validateRange(range, otherRanges);

    if (!validation.isValid) {
      errors.push({
        index,
        error: validation.error,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Formats a range for display
 * @param {Object} range - Range object
 * @returns {string} - Formatted range string
 */
export const formatRange = (range) => {
  const { start, end, startOperator, endOperator } = range;

  let display = "";

  if (start !== null && start !== undefined) {
    if (startOperator === "more_than") {
      display = `> ${start}`;
    } else if (startOperator === "less_than") {
      display = `< ${start}`;
    } else {
      display = `${start}`;
    }
  }

  if (end !== null && end !== undefined) {
    if (display) {
      display += " - ";
    }
    if (endOperator === "more_than") {
      display += `> ${end}`;
    } else if (endOperator === "less_than") {
      display += `< ${end}`;
    } else {
      display += `${end}`;
    }
  }

  return display || "No limits set";
};
