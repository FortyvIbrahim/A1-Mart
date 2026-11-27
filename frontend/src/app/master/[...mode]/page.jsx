"use client";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import EmployeeDropdownOption from "@/components/EmployeeDropdownOption";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Button, Flex } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createMasterList, updateMasterList } from "@/api/helpers/eb_master";
import useMasterListById from "@/api/customHooks/useMasterListById";
import useEmployee from "@/api/customHooks/useEmployee";

export const PERSON_TYPES = [
  { value: 1, label: "Supplier" },
  { value: 2, label: "Customer" },
  { value: 3, label: "Distributor" },
  { value: 4, label: "Vendor" },
  { value: 5, label: "Transport Master" },
];

const MASTER_VALIDATION_SCHEMA = Yup.object().shape({
  name: Yup.string()
    .min(2, "Must be at least 2 characters")
    .max(100, "Must be less than 100 characters")
    .required("Required"),
  phone: Yup.string()
    .matches(/^[0-9+\-\s()]+$/, "Please enter a valid phone number")
    .min(10, "Must be at least 10 digits")
    .max(15, "Must be less than 15 digits")
    .optional(),
  type: Yup.string()
    .oneOf(["1", "2", "3", "4", "5"], "Invalid type")
    .required("Required"),
  office_location: Yup.object()
    .shape({
      lat: Yup.number().required(),
      lng: Yup.number().required(),
    })
    .nullable()
    .optional(),
  warehouse_location_1: Yup.object()
    .shape({
      lat: Yup.number().required(),
      lng: Yup.number().required(),
    })
    .nullable()
    .optional(),
  warehouse_location_2: Yup.object()
    .shape({
      lat: Yup.number().required(),
      lng: Yup.number().required(),
    })
    .nullable()
    .optional(),
  buyer_ids: Yup.array().of(Yup.string()).optional(),
});

const INITIAL_VALUES = {
  name: "",
  phone: "",
  type: "",
  office_location: null,
  warehouse_location_1: null,
  warehouse_location_2: null,
  buyer_ids: [],
};

const mapEmployeeToOption = (emp) => ({
  value: emp.employee_code,
  label: `${emp.employee_name} (${emp.employee_code})`,
  employee_name: emp.employee_name,
  employee_code: emp.employee_code,
  profile_img_url: emp.profile_img_url ?? null,
  searchText: [emp.employee_name, emp.employee_code, emp.designation_name]
    .filter(Boolean)
    .join(" "),
});

const isEmployeeSelectedAsBuyer = (emp, selectedBuyerIds) =>
  selectedBuyerIds.has(String(emp.employee_code)) ||
  (emp.employee_id != null &&
    selectedBuyerIds.has(String(emp.employee_id)));

const buildBuyerEmployeeOptions = (employees, selectedBuyerIds = []) => {
  if (!employees?.length) return [];

  const selectedIds = new Set(selectedBuyerIds.map(String));

  return employees
    .filter(
      (emp) =>
        emp.terminated == 0 || isEmployeeSelectedAsBuyer(emp, selectedIds)
    )
    .map(mapEmployeeToOption);
};

function MasterFormFields({
  employees,
  buyerIds,
  isViewMode,
  isCreateMode,
  isEditMode,
  handleSubmit,
}) {
  const employeeOptions = useMemo(
    () => buildBuyerEmployeeOptions(employees, buyerIds),
    [employees, buyerIds]
  );

  return (
    <Flex flexDirection="column" gap="22px">
      <CustomInput
        label="Name"
        isRequired
        placeholder="Enter Name"
        name="name"
        type="text"
        method="text"
        viewOnly={isViewMode}
      />
      <CustomInput
        label="Contact Person"
        isRequired
        placeholder="Enter Contact Person Name"
        name="contact_person_name"
        type="text"
        method="text"
        viewOnly={isViewMode}
      />
      <CustomInput
        label="Phone"
        isRequired
        placeholder="Enter Phone"
        name="phone"
        type="text"
        method="text"
        viewOnly={isViewMode}
      />
      <CustomInput
        label="Select Type"
        isRequired
        placeholder="Click here to select type..."
        name="type"
        method="dropdown"
        options={PERSON_TYPES}
        viewOnly={isViewMode}
      />
      <CustomInput
        label="Buyers"
        placeholder="Select buyers..."
        name="buyer_ids"
        method="multiple-dropdown"
        options={employeeOptions}
        customRender={EmployeeDropdownOption}
        viewOnly={isViewMode}
      />
      <CustomInput
        label="Office Location"
        placeholder="Select location on map"
        name="office_location"
        method="location"
        viewOnly={isViewMode}
      />
      <CustomInput
        label="Warehouse Location 1"
        placeholder="Select location on map"
        name="warehouse_location_1"
        method="location"
        viewOnly={isViewMode}
      />
      <CustomInput
        label="Warehouse Location 2"
        placeholder="Select location on map"
        name="warehouse_location_2"
        method="location"
        viewOnly={isViewMode}
      />

      <Flex gap="22px" justifyContent="flex-end">
        <Link href="/master">
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
}

export default function MasterForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const masterId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  const { master } = useMasterListById(masterId);
  const { employees } = useEmployee({ allBranches: true, filterInactive: false });

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if ((isEditMode || isViewMode) && master) {
      setInitialValues({
        name: master.name,
        phone: master.phone ?? "",
        type: master.person_type,
        contact_person_name: master.contact_person_name ?? "",
        office_location: master.office_location ?? null,
        warehouse_location_1: master.warehouse_location_1 ?? null,
        warehouse_location_2: master.warehouse_location_2 ?? null,
        buyer_ids: Array.isArray(master.buyers)
          ? master.buyers
              .map((b) => b.employee_id ?? b.id)
              .filter(Boolean)
          : [],
      });
    }
  }, [isEditMode, isViewMode, master]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Master List";
    }

    if (isEditMode) {
      return "Edit Master List";
    }

    // return `EB Consumption : #${ebConsumption?.id ?? ""}`;
    return `Master List`;
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_master_list";
    }

    return "view_master_list";
  };

  const handleSubmit = (values) => {
    const data = {
      name: values.name,
      phone: values.phone === "" ? null : values.phone,
      contact_person_name:
        values.contact_person_name === "" ? null : values.contact_person_name,
      person_type: values.type,
      office_location: values.office_location || null,
      warehouse_location_1: values.warehouse_location_1 || null,
      warehouse_location_2: values.warehouse_location_2 || null,
      buyer_ids: Array.isArray(values.buyer_ids) ? values.buyer_ids : [],
    };

    const promise = isEditMode
      ? updateMasterList(masterId, data)
      : createMasterList(data);

    toast.promise(promise, {
      loading: isEditMode ? "Updating Master List!" : "Creating Master List!",
      success: (data) => {
        if (data.code === 200) {
          router.push("/master");
          return isEditMode
            ? "Successfully Updated Master List!"
            : "Successfully Created Master List!";
        } else {
          throw data;
        }
      },
      error: (err) => {
        console.error(err);
        return isEditMode
          ? "Error Updating Master List!"
          : "Error Creating Master List!";
      },
    });
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={MASTER_VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, values }) => (
            <MasterFormFields
              employees={employees}
              buyerIds={values.buyer_ids}
              isViewMode={isViewMode}
              isCreateMode={isCreateMode}
              isEditMode={isEditMode}
              handleSubmit={handleSubmit}
            />
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}
