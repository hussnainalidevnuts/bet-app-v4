"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isPinned, setIsPinned] = useState(false);

  // Use useCallback to ensure stable function references
  const handleSetIsCollapsed = useCallback((value) => {
    console.log("Setting isCollapsed to:", value);
    setIsCollapsed(value);
  }, []);

  const handleSetIsPinned = useCallback((value) => {
    console.log("Setting isPinned to:", value);
    setIsPinned(value);
  }, []);

  const contextValue = {
    isCollapsed,
    setIsCollapsed: handleSetIsCollapsed,
    isPinned,
    setIsPinned: handleSetIsPinned,
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useCustomSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useCustomSidebar must be used within a SidebarProvider");
  }
  return context;
};
