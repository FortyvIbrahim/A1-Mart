"use client";

import useDesignation from "@/api/customHooks/useDesignation";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import Permissions from "@/components/Permissions";
import { PERMISSIONS } from "@/constants/permissions";
import { Button, Flex } from "@chakra-ui/react";
import { Formik } from "formik";
import Link from "next/link";
import React, { use, useEffect, useState } from "react";
import * as Yup from "yup";
import { INCENTIVE_TYPES } from "@/constants/incentive_type";
import { useRouter } from "next/navigation";

const DETAILS_VALIDATION_SCHEMA = Yup.object().shape({
  incentive_type: Yup.string().nullable().optional(),
  working_days: Yup.number()
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue == null) return null;
      return value;
    })
    .nullable()
    .typeError("Working days must be a number")
    .integer("Working days must be an integer")
    .min(0, "Working days cannot be negative")
    .max(7, "Working days cannot be more than 7"),
});

const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS).flatMap((group) =>
  group.items
    ? Object.values(group.items).flatMap((item) =>
        Object.values(item.permissions || {})
      )
    : []
);

function DesignationsForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const designationId = mode[1];

  const { designation, handleUpdateDesignation } =
    useDesignation(designationId);

  const [designationName, setDesignationName] = useState("");
  const [permissions, setPermissions] = useState([]);

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if (designation) {
      setDesignationName(designation.designation_name);
      const formattedPermissions = designation.permissions.map(
        (item) => item.permission_key
      );
      setPermissions(formattedPermissions);
    }
  }, [designation]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Designation";
    }

    if (isEditMode) {
      return `Edit Designation : ${designationName}`;
    }

    // return `EB Consumption : #${ebConsumption?.id ?? ""}`;
    return `Designation : ${designationName}`;
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_designations";
    }

    return "view_designations";
  };

  const onPermissionsChange = (permission, value) => {
    if (value) {
      setPermissions((prev) => [...prev, permission]);
    } else {
      setPermissions((prev) => prev.filter((p) => p !== permission));
    }
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer title={getTitle()} fullWidth>
        <Flex flexDirection="column" gap="22px" w="100%">
          <Formik
            initialValues={{
              incentive_type: designation?.incentive_type || "",
              working_days:
                designation?.working_days !== undefined &&
                designation?.working_days !== null
                  ? designation.working_days
                  : "",
            }}
            enableReinitialize
            validationSchema={DETAILS_VALIDATION_SCHEMA}
            onSubmit={(values) => {
              handleUpdateDesignation(designationId, {
                incentive_type: values.incentive_type,
                working_days:
                  values.working_days === "" || values.working_days == null
                    ? null
                    : Number(values.working_days),
              });
              router.push("/designations");
            }}
          >
            {({ handleSubmit }) => (
              <CustomContainer title="Details" size="sm" color="secondary">
                <Flex flexDirection="column" gap="22px">
                  <CustomInput
                    label="Incentive Type"
                    name="incentive_type"
                    method="dropdown"
                    options={Object.values(INCENTIVE_TYPES).map((item) => ({
                      value: item.key,
                      label: item.label,
                    }))}
                    placeholder="Select incentive type"
                    viewOnly={isViewMode}
                  />
                  <CustomInput
                    label="Working Days (per week)"
                    name="working_days"
                    type="number"
                    placeholder="e.g. 6"
                    viewOnly={isViewMode}
                  />

                  <Flex gap="22px" justifyContent="flex-end">
                    <Link href="/designations">
                      <Button variant="subtle">Back</Button>
                    </Link>
                    {(isCreateMode || isEditMode) && (
                      <Button onClick={handleSubmit}>
                        {isCreateMode ? "Create" : "Update"}
                      </Button>
                    )}
                  </Flex>
                </Flex>
              </CustomContainer>
            )}
          </Formik>

          <CustomContainer title="Permissions" size="sm" color="secondary">
            {!isViewMode && (
              <Flex justifyContent="flex-end" mb="12px" gap="12px">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPermissions([])}
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPermissions(ALL_PERMISSION_KEYS)}
                >
                  Select All
                </Button>
              </Flex>
            )}

            <Permissions
              permissions={permissions}
              onPermissionsChange={onPermissionsChange}
            />

            <Flex gap="22px" justifyContent="flex-end">
              <Link href="/designations">
                <Button variant="subtle">Back</Button>
              </Link>
              {(isCreateMode || isEditMode) && (
                <Button
                  onClick={() =>
                    handleUpdateDesignation(designationId, { permissions })
                  }
                >
                  {isCreateMode ? "Create" : "Update"}
                </Button>
              )}
            </Flex>
          </CustomContainer>
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DesignationsForm;
