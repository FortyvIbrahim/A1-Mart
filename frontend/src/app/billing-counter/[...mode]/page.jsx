"use client";

import useBillingCounterById from "@/api/customHooks/useBillingCounterById";
import {
  createBillingCounter,
  updateBillingCounter,
} from "@/api/helpers/billing_counter";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Box, Button, Flex, Grid } from "@chakra-ui/react";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as Yup from "yup";
import useBranches from "@/api/customHooks/useBranches";

const VALIDATION_SCHEMA = Yup.object().shape({
  counter_name: Yup.string()
    .max(200, "Must be less than 200 characters")
    .required("Required"),
  branch_id: Yup.number().positive("Branch is required").required("Required"),
});

const INITIAL_VALUES = {
  counter_name: "",
  branch_id: null,
  counter_code: "",
};

function BillingCounterForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const counterId = mode[1];
  const { billingCounter, fetchData } = useBillingCounterById(counterId);
  const { branches } = useBranches();
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if ((isEditMode || isViewMode) && counterId) {
      fetchData();
    }
  }, [isEditMode, isViewMode, counterId]);

  useEffect(() => {
    if (billingCounter) {
      setInitialValues({
        counter_name: billingCounter.counter_name || "",
        branch_id: billingCounter.branch_id || null,
        counter_code: billingCounter.counter_code || "",
      });
    }
  }, [billingCounter]);

  const handleSubmit = async (values) => {
    if (isCreateMode) {
      toast.promise(createBillingCounter(values), {
        loading: "Creating billing counter...",
        success: (data) => {
          if (data.code === 200) {
            router.push("/billing-counter");
            return data.message || "Billing counter created successfully!";
          }
          throw data;
        },
        error: (err) => {
          console.log(err);
          return err.msg || err.message || "Error creating billing counter!";
        },
      });
    } else if (isEditMode) {
      toast.promise(updateBillingCounter(counterId, values), {
        loading: "Updating billing counter...",
        success: (data) => {
          if (data.code === 200) {
            router.push("/billing-counter");
            return data.message || "Billing counter updated successfully!";
          }
          throw data;
        },
        error: (err) => {
          console.log(err);
          return err.msg || err.message || "Error updating billing counter!";
        },
      });
    }
  };

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Billing Counter";
    }
    if (isEditMode) {
      return `Edit Billing Counter : #${counterId ?? ""}`;
    }
    return `Billing Counter : #${counterId ?? ""}`;
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_billing_counter";
    }
    return "view_billing_counter";
  };

  const branchOptions = branches
    .filter((branch) => branch.is_active !== false)
    .map((branch) => ({
      value: branch.branch_id,
      label: branch.branch_name,
    }));

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit }) => (
            <Box>
              <Flex flexDirection="column" gap="22px">
                <Grid
                  templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                  gap="22px"
                >
                  <CustomInput
                    label="Counter Name"
                    isRequired
                    placeholder="Enter counter name"
                    name="counter_name"
                    method="text"
                    type="text"
                    viewOnly={isViewMode}
                  />

                  <CustomInput
                    label="Branch"
                    isRequired
                    placeholder="Select branch"
                    name="branch_id"
                    method="dropdown"
                    options={branchOptions}
                    viewOnly={isViewMode}
                  />

                  <CustomInput
                    label="Counter Code"
                    placeholder="Enter counter code"
                    name="counter_code"
                    method="text"
                    type="text"
                    viewOnly={isViewMode}
                  />
                </Grid>
              </Flex>
              <Flex gap="22px" justifyContent="flex-end" mt="22px">
                <Link href="/billing-counter">
                  <Button variant="subtle">Back</Button>
                </Link>
                {(isCreateMode || isEditMode) && (
                  <Button onClick={handleSubmit}>
                    {isCreateMode ? "Create" : "Update"}
                  </Button>
                )}
              </Flex>
            </Box>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default BillingCounterForm;
