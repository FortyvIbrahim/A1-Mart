export function getNestedValue(source, path, defaultValue) {
  if (source == null) return defaultValue;
  if (path == null || path === "") return source;

  let keys;
  if (Array.isArray(path)) {
    keys = path;
  } else {
    // Handle both dot notation (items.0.material_id) and bracket notation (items[0].material_id)
    const pathString = String(path);
    keys = pathString
      .replace(/\[(\d+)\]/g, ".$1") // Convert [0] to .0
      .split(".")
      .filter(Boolean);
  }

  let current = source;
  for (const key of keys) {
    if (current == null) return defaultValue;
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  return current;
}
