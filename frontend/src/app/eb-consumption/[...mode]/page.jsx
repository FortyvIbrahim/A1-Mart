"use client";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Badge, Button, Flex, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useBranches from "@/api/customHooks/useBranches";
import toast from "react-hot-toast";
import moment from "moment";
import { createEBConsumption } from "@/api/helpers/eb_consumption";
import useEBConsumptions from "@/api/customHooks/useEBConsumptions";
import { useUser } from "@/contexts/UserContext";
import usePermission from "@/customHooks/usePermission";

const CONSUMPTION_VALIDATION_SCHEMA = Yup.object().shape({
  date: Yup.date().required("Required"),
  branch_id: Yup.string().required("Required"),
  opening_units: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be ≥ 0")
    .required("Required"),
  closing_units: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be ≥ 0")
    .required("Required"),
});

const INITIAL_VALUES = {
  date: new Date(),
  branch_id: "",
  opening_units: "",
  closing_units: "",
};

export default function EBConsumptionForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const { ebConsumptions } = useEBConsumptions();
  const [prevDataExists, setPrevDataExists] = useState(false);
  const [isStoreSelected, setIsStoreSelected] = useState(false);

  const { employeeData } = useUser();
  const canAccessAllBranches = usePermission("access_all_branches");

  const { branches } = useBranches();
  const filteredBranches = branches.map((branch) => ({
    value: branch.branch_id,
    label: branch.branch_name,
  }));

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if (!canAccessAllBranches && isCreateMode && employeeData) {
      setInitialValues({
        ...initialValues,
        branch_id: employeeData.branch_id,
      });
      setIsStoreSelected(true);
    } else {
      setIsStoreSelected(false);
    }
  }, [employeeData, isCreateMode, canAccessAllBranches]);

  const setLastEBConsumption = ({
    values,
    setFieldValue,
    date: dateProp,
    branch_id: branch_idProp,
  }) => {
    const date = dateProp ?? values.date;
    const branch_id = branch_idProp ?? values.branch_id;

    if (date && branch_id) {
      const filteredList = ebConsumptions
        .filter(
          (item) =>
            item.branch_id == branch_id &&
            moment(item.date).isBefore(date, "day")
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const lastEBConsumption = filteredList[filteredList.length - 1];

      if (lastEBConsumption) {
        setFieldValue("opening_units", lastEBConsumption.closing_units);
        setPrevDataExists(true);
      } else {
        setFieldValue("opening_units", "");
        setPrevDataExists(false);
      }
    } else {
      setFieldValue("opening_units", "");
      setPrevDataExists(false);
    }

    return null;
  };

  // useEffect(() => {
  //   if (isEditMode || isViewMode) {
  //     fetchData();
  //   }
  // }, [isEditMode, isViewMode]);

  // useEffect(() => {
  //   if (accountSheet) {
  //     setInitialValues({
  //       date: moment(accountSheet.date),
  //       employee_id: accountSheet.employee_id,
  //       no_of_bills: accountSheet.no_of_bills,
  //       no_of_items: accountSheet.no_of_items,
  //       total_sales: accountSheet.total_sales,
  //       cash: {
  //         sales: accountSheet.cash_sales,
  //         type: accountSheet.cash_type,
  //         reason: accountSheet.cash_reason,
  //       },
  //       card: {
  //         sales: accountSheet.card_sales,
  //         type: accountSheet.card_type,
  //         reason: accountSheet.card_reason,
  //       },
  //       paytm: {
  //         sales: accountSheet.paytm_sales,
  //         type: accountSheet.paytm_type,
  //         reason: accountSheet.paytm_reason,
  //       },
  //     });
  //   }
  // }, [accountSheet]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add EB Consumption";
    }

    if (isEditMode) {
      return "Edit EB Consumption";
    }

    // return `EB Consumption : #${ebConsumption?.id ?? ""}`;
    return `EB Consumption`;
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_eb_consumption";
    }

    return "view_eb_consumption";
  };

  const handleSubmit = (values) => {
    const data = {
      date: moment(values.date).format("YYYY-MM-DD"),
      branch_id: values.branch_id,
      closing_units: values.closing_units,
    };

    toast.promise(createEBConsumption(data), {
      loading: "Creating EB Consumption!",
      success: (data) => {
        if (data.code === 200) {
          router.push("/eb-consumption");
          return "Successfully Created EB Consumption!";
        } else {
          throw data;
        }
      },
      error: (err) => {
        console.log(err);
        return "Error Creating EB Consumption!";
      },
    });
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm breadcrumb="Checklist Management  /  EB Consumption" title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={CONSUMPTION_VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, setFieldValue, values }) => {
            return (
              <Flex flexDirection="column" gap="22px">
                <CustomInput
                  label="Date"
                  isRequired
                  placeholder="DD/MM/YYYY"
                  name="date"
                  type="date"
                  method="date-picker"
                  viewOnly={isViewMode}
                  onChange={(date) =>
                    setLastEBConsumption({
                      values,
                      setFieldValue,
                      date,
                    })
                  }
                />
                <CustomInput
                  label="Select Branch"
                  isRequired
                  placeholder="Click here to select employee..."
                  name="branch_id"
                  method="dropdown"
                  options={filteredBranches}
                  viewOnly={isViewMode}
                  disabled={isStoreSelected}
                  onChange={(e) =>
                    setLastEBConsumption({
                      values,
                      setFieldValue,
                      branch_id: e.target.value,
                    })
                  }
                />

                <Flex gap="22px">
                  <CustomInput
                    label="Opening Units"
                    isRequired
                    placeholder="0"
                    name="opening_units"
                    method="text"
                    type="number"
                    viewOnly={isViewMode}
                    disabled={prevDataExists}
                  />
                  <CustomInput
                    label="Closing Units"
                    isRequired
                    placeholder="0"
                    name="closing_units"
                    method="text"
                    type="number"
                    viewOnly={isViewMode}
                  />
                </Flex>

                <Badge
                  colorPalette="secondary"
                  size="lg"
                  w="fit-content"
                >{`Total Consumption: ${
                  values.closing_units - values.opening_units
                }`}</Badge>

                <Flex gap="22px" justifyContent="flex-end">
                  <Link href="/eb-consumption">
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
