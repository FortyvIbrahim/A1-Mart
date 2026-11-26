"use client";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Button, Flex, Grid } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createTargetEntry } from "@/api/helpers/employee_target";

const VALIDATION_SCHEMA = Yup.object({
  date: Yup.date().required("Required"),
  sales_amount: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be at least 0")
    .required("Required"),
});

const INITIAL_VALUES = {
  date: new Date(),
  sales_amount: null,
};

export default function TargetEmployeeForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const branchTargetId = mode[1];

  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  // useEffect(() => {
  //   if ((isEditMode || isViewMode) && target) {
  //     setInitialValues({
  //       branch_id: target.branch_id,
  //       target_month: target.target_month,
  //       target_amount: target.target_amount,
  //     });
  //   }
  // }, [isEditMode, isViewMode, target]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Target Entry";
    }

    if (isEditMode) {
      return "Edit Target Entry";
    }

    return `Target Entry : #${branchTargetId ?? ""}`;
  };

  const handleSubmit = async (values) => {
    try {
      toast.promise(createTargetEntry(values), {
        loading: "Adding new target entry...",
        success: (response) => {
          if (response.code === 200) {
            router.push("/target");
            return "Target entry added successfully!";
          } else {
            throw new Error(response.message);
          }
        },
        error: (err) => {
          console.error(err);
          return "Error adding target entry!";
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error adding target entry!");
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_sales_target";
    }

    return "view_sales_target";
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit }) => {
            return (
              <Flex flexDirection="column" gap="22px">
                <Grid
                  templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                  gap="22px"
                >
                  <CustomInput
                    label="Date"
                    name="date"
                    method="date-picker"
                    viewOnly={isViewMode}
                  />

                  <CustomInput
                    label="Sales Amount"
                    name="sales_amount"
                    type="number"
                    viewOnly={isViewMode}
                  />
                </Grid>

                <Flex gap="22px" justifyContent="flex-end">
                  <Link href="/target">
                    <Button variant="subtle">Back</Button>
                  </Link>
                  {(isCreateMode || isEditMode) && (
                    <Button onClick={handleSubmit}>
                      {isCreateMode ? "Create" : "Update"}
                    </Button>
                  )}
                </Flex>
              </Flex>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}
