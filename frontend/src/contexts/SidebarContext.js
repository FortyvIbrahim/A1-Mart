"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

const SidebarContext = createContext();

const COLLAPSED_KEY = "a1-sidebar-collapsed";

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

function readCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved ? JSON.parse(saved) === true : false;
  } catch {
    return false;
  }
}

/**
 * Sidebar state for the Figma shell:
 * - `isCollapsed` — desktop sidebar collapsed to the icon rail (persisted)
 * - `isMobileOpen` — mobile drawer visibility
 *
 * `isMinimized`, `toggleMinimized` and `isPermanentlyExpanded` are kept as
 * aliases so any older consumer keeps working.
 */
export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleCollapsed,
        isMobileOpen,
        setIsMobileOpen,
        // legacy aliases
        isMinimized: isCollapsed,
        setIsMinimized: setIsCollapsed,
        toggleMinimized: toggleCollapsed,
        isPermanentlyExpanded: !isCollapsed,
        setIsPermanentlyExpanded: (v) => setIsCollapsed(!v),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
