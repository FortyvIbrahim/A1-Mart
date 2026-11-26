import { DEFAULT_MODULE_ID, MENU_MODULES } from "@/constants/Menu";
import { findActiveEntry } from "@/constants/navigation";

export const MODULE_RAIL_WIDTH_PX = 40;

export function filterMenuByPermissions(menuTree, permissions) {
  const permissionSet = new Set(permissions || []);

  return (menuTree || [])
    .map((menuItem) => {
      if (!Array.isArray(menuItem.subMenu)) {
        return menuItem;
      }

      const filteredSubMenu = menuItem.subMenu.filter((subItem) => {
        if (!subItem.permission_key) return true;
        return permissionSet.has(subItem.permission_key);
      });

      return { ...menuItem, subMenu: filteredSubMenu };
    })
    .filter((menuItem) => {
      if (!Array.isArray(menuItem.subMenu)) {
        return true;
      }
      return menuItem.subMenu.length > 0;
    });
}

export function moduleHasVisibleMenu(menuTree, permissions) {
  return filterMenuByPermissions(menuTree, permissions).length > 0;
}

export function getVisibleModuleIds(permissions) {
  return Object.keys(MENU_MODULES).filter((id) =>
    moduleHasVisibleMenu(MENU_MODULES[id].menu, permissions)
  );
}

export function findModuleIdForPath(pathname) {
  if (!pathname) return null;

  for (const moduleId of Object.keys(MENU_MODULES)) {
    const menu = MENU_MODULES[moduleId].menu || [];
    const hasPath = menu.some((section) =>
      section.subMenu?.some((item) => item.location === pathname)
    );
    if (hasPath) return moduleId;
  }

  return null;
}

export function resolveModuleIdFromPath(pathname, visibleModuleIds) {
  const fromPath = findModuleIdForPath(pathname);
  if (fromPath && visibleModuleIds.includes(fromPath)) return fromPath;
  if (visibleModuleIds.includes(DEFAULT_MODULE_ID)) return DEFAULT_MODULE_ID;
  return visibleModuleIds[0] ?? DEFAULT_MODULE_ID;
}

/**
 * Resolves which workspace/section/page the current path belongs to, among the
 * menus the user can see. Longest matching location wins, so nested routes
 * like `/employees/edit/12` resolve to the Employees page.
 */
export function resolveActiveNav(pathname, permissions) {
  let best = null;
  for (const workspaceId of getVisibleModuleIds(permissions)) {
    const sections = filterMenuByPermissions(
      MENU_MODULES[workspaceId]?.menu,
      permissions
    );
    const hit = findActiveEntry(sections, pathname);
    if (hit && (!best || hit.item.location.length > best.item.location.length)) {
      best = { workspaceId, ...hit };
    }
  }
  return best;
}
