"use client";

import { Badge, Button, Flex, Text } from "@chakra-ui/react";
import { useRef, useEffect, useState } from "react";
import useEmployee from "@/api/customHooks/useEmployee";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import moment from "moment";
import { removeTOTP } from "@/api/helpers/employee";
import toast from "react-hot-toast";
import usePermission from "@/customHooks/usePermission";
import { employeeColDefs } from "@/colDefs/employee";
import CustomInput from "@/components/CustomInput";

export default function Home() {
  const {
    employees: unfilteredEmployees,
    sync,
    refresh,
    removeEmployeeLogin,
  } = useEmployee();

  const [filter, setFilter] = useState("active");

  const employees = unfilteredEmployees.filter(
    (employee) => employee.terminated == (filter === "active" ? 0 : 1)
  );

  const allowMFAToggle = usePermission("allow_mfa_toggle");
  const allowAdd = usePermission("add_employees");

  const handleRemove2FA = async (employeeCode) => {
    try {
      const response = await removeTOTP(employeeCode);
      if (response.code === 200) {
        toast.success(response.msg || "2FA removed successfully");
        // Refresh the employee list to get updated 2FA status
        refresh();
      } else {
        toast.error(response.msg || "Failed to remove 2FA");
      }
    } catch (err) {
      const errorMsg = err.msg || err.message || "Error removing 2FA";
      if (err.code === 404) {
        toast.error("User not found for the given employee code");
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const getLastSync = () => {
    if (employees.length === 0) {
      return "-";
    }

    const sortedEmployees = employees.sort(
      (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
    );

    return moment(sortedEmployees[0].updated_at).fromNow();
  };

  return (
    <GlobalWrapper permissionKey="view_employees">
      <CustomContainer
        mainCard
        title="Employees List"
        rightSection={
          <Flex gap="12px" align="center">
            <Text fontSize="13px" color="#30384B">
              Last sync: {getLastSync()}
            </Text>

            <Button h="36px" px="14px" fontSize="13px" fontWeight="600" borderRadius="6px" onClick={sync}>
              <i className="fa fa-sync" />
              Sync Now
            </Button>
          </Flex>
        }
      >
        <Flex mb="16px" w={{ base: "100%", md: "309px" }}>
          <CustomInput
            label="Status"
            name="employee_status_filter"
            method="dropdown"
            options={[
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
            onChange={(e) => {
              setFilter(e.target.value);
            }}
          />
        </Flex>

        <AgGrid
          rowData={employees}
          columnDefs={employeeColDefs({
            allowAdd,
            allowMFAToggle,
            removeEmployeeLogin,
            handleRemove2FA,
          })}
          tableKey="employees"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}
