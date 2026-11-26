"use client";

import axiosInstance from "@/api";
import useDesignation from "@/api/customHooks/useDesignation";
import { getDetails } from "@/api/helpers/user";
import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [userType, setUserType] = useState(null);
  const [designationId, setDesignationId] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);

  const [hydrated, setHydrated] = useState(false);
  const { designation, loading: designationLoading } = useDesignation(
    token !== null ? designationId : null,
    true
  );
  const permissions =
    designation?.permissions?.map((item) => item.permission_key) ?? [];

  const fetchDetails = async () => {
    try {
      const data = await getDetails();

      if (data.code === 200) {
        setEmployeeData(data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDetails();
    }
  }, [token]);

  // Load token and userType from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUserType = localStorage.getItem("userType");
    const designationId = localStorage.getItem("designationId");
    const employeeData = localStorage.getItem("employeeData");

    if (savedToken) {
      axiosInstance.updateToken(savedToken);
      setToken(savedToken);
    }
    if (savedUserType) {
      setUserType(savedUserType);
    }
    if (designationId) {
      setDesignationId(designationId);
    }
    if (employeeData) {
      setEmployeeData(JSON.parse(employeeData));
    }
    setHydrated(true);
  }, []);

  // Save token and userType to localStorage when they change
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (userType) {
      localStorage.setItem("userType", userType);
    } else {
      localStorage.removeItem("userType");
    }
  }, [userType]);

  useEffect(() => {
    if (designationId) {
      localStorage.setItem("designationId", designationId);
    } else {
      localStorage.removeItem("designationId");
    }
  }, [designationId]);

  useEffect(() => {
    if (employeeData) {
      localStorage.setItem("employeeData", JSON.stringify(employeeData));
    } else {
      localStorage.removeItem("employeeData");
    }
  }, [employeeData]);

  const login = ({
    newToken,
    newUserType,
    newDesignationId,
    newEmployeeData,
  }) => {
    if (newToken) {
      setToken(newToken);
    }

    if (newUserType) {
      setUserType(newUserType);
    }

    if (newDesignationId) {
      setDesignationId(newDesignationId);
    }

    if (newEmployeeData) {
      setEmployeeData(newEmployeeData);
    }
  };

  const logout = () => {
    setToken(null);
    setUserType(null);
    localStorage.removeItem("token");
    localStorage.removeItem("userType");

    if (typeof window !== "undefined") {
      window.location = "/login";
    }
  };

  const value = {
    token,
    userType,
    designationId,
    login,
    logout,
    isAuthenticated: !!token,
    permissions,
    // True until stored session is read and the designation's permissions load,
    // so pages don't flash "Access restricted" on a full reload.
    permissionsLoading:
      !hydrated || (!!token && !!designationId && designationLoading),
    employeeData,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
