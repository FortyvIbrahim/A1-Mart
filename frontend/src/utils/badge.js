/**
 * Priority maps for common badge values used in badge-column type
 * Lower numbers = higher priority (sorted first)
 */

// Status priority map
export const STATUS_PRIORITY = {
  // Task statuses
  open: 1,
  "in progress": 2,
  in_progress: 2,
  done: 3,
  closed: 4,

  // General statuses
  active: 1,
  inactive: 2,
  approved: 1,
  pending: 2,

  // Purchase order statuses
  raised: 1,
  "PE Created": 2,
  "pe created": 2,
  pe_created: 2,
  purchased: 3,

  // Default fallback
  default: 999,
};

// Priority level map
export const PRIORITY_LEVEL = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
  default: 999,
};

/**
 * Normalize a label for matching (handles spaces, underscores, case)
 * @param {string} label - The label to normalize
 * @returns {string} - Normalized label
 */
function normalizeLabel(label) {
  if (!label) return "";
  return label
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "_");
}

/**
 * Get priority value for a badge label
 * @param {string} label - The badge label
 * @param {Object} priorityMap - The priority map to use
 * @returns {number} - Priority value (lower = higher priority)
 */
export function getBadgePriority(label, priorityMap = STATUS_PRIORITY) {
  if (!label) return priorityMap.default || 999;

  const normalizedLabel = normalizeLabel(label);

  // Check exact match first (normalized)
  if (priorityMap[normalizedLabel] !== undefined) {
    return priorityMap[normalizedLabel];
  }

  // Check original label (for keys like "PE Created")
  const originalLabel = label.trim();
  if (priorityMap[originalLabel] !== undefined) {
    return priorityMap[originalLabel];
  }

  // Check for normalized key matches (e.g., "in progress" matches "in_progress")
  const labelKey = Object.keys(priorityMap).find((key) => {
    const normalizedKey = normalizeLabel(key);
    return (
      normalizedKey === normalizedLabel ||
      normalizedLabel.includes(normalizedKey) ||
      normalizedKey.includes(normalizedLabel)
    );
  });

  if (labelKey) {
    return priorityMap[labelKey];
  }

  return priorityMap.default || 999;
}

/**
 * Comparator factory function that creates a comparator based on custom order array
 * @param {Array<string>} customOrder - Array of values in desired sort order
 * @returns {Function} - Comparator function
 */
export function createCustomComparator(customOrder) {
  return (valueA, valueB) => {
    // Handle null/undefined values
    if (!valueA && !valueB) return 0;
    if (!valueA) return 1;
    if (!valueB) return -1;

    // Extract labels from badge objects or use value directly
    const labelA =
      typeof valueA === "object" && valueA !== null
        ? valueA.label || ""
        : String(valueA || "");
    const labelB =
      typeof valueB === "object" && valueB !== null
        ? valueB.label || ""
        : String(valueB || "");

    // Get indices in custom order array
    const indexA = customOrder.indexOf(labelA);
    const indexB = customOrder.indexOf(labelB);

    // If both found, sort by their position in custom order
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // If only one found, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // If neither found, sort alphabetically
    return labelA.localeCompare(labelB);
  };
}

/**
 * Comparator function for badge-column sorting (legacy support)
 * @param {Object} valueA - Badge object with {label, colorScheme}
 * @param {Object} valueB - Badge object with {label, colorScheme}
 * @param {Object} priorityMap - Optional custom priority map
 * @returns {number} - Comparison result (-1, 0, or 1)
 */
export function badgeComparator(valueA, valueB, priorityMap = STATUS_PRIORITY) {
  // Handle null/undefined values
  if (!valueA && !valueB) return 0;
  if (!valueA) return 1;
  if (!valueB) return -1;

  // Extract labels
  const labelA = valueA.label || "";
  const labelB = valueB.label || "";

  // Get priorities
  const priorityA = getBadgePriority(labelA, priorityMap);
  const priorityB = getBadgePriority(labelB, priorityMap);

  // Sort by priority first
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  // If same priority, sort alphabetically by label
  return labelA.localeCompare(labelB);
}
