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
import {
  createMaterialCategory,
  updateMaterialCategory,
} from "@/api/helpers/materials";
import useMaterialCategoryById from "@/api/customHooks/useMaterialCategoryById";

const VALIDATION_SCHEMA = Yup.object({
  category_name: Yup.string().required("Category name is required"),
});

const INITIAL_VALUES = {
  category_name: "",
  is_active: true,
};

export default function MaterialsForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const materialId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const { materialsCategory } = useMaterialCategoryById(materialId);

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if ((isEditMode || isViewMode) && materialsCategory) {
      setInitialValues({
        category_name: materialsCategory.category_name,
        is_active: materialsCategory.is_active,
      });
    }
  }, [isEditMode, isViewMode, materialsCategory]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Material Category";
    }

    if (isEditMode) {
      return "Edit Material Category";
    }

    // return `EB Consumption : #${ebConsumption?.id ?? ""}`;
    return `Material Category`;
  };

  const handleSubmit = (values) => {
    const data = {
      ...values,
      is_active: values.is_active ? values.is_active == 1 : true,
    };

    const promise = isEditMode
      ? updateMaterialCategory(materialId, data)
      : createMaterialCategory(data);

    toast.promise(promise, {
      loading: isEditMode
        ? "Updating material category..."
        : "Adding new material category...",
      success: (response) => {
        if (response.code === 200) {
          router.push("/materials/category");
          return isEditMode ? "Material Updated!" : "Material Added!";
        } else {
          throw new Error(response.message);
        }
      },
      error: (err) => {
        console.error(err);
        return isEditMode
          ? "Error updating material category!"
          : "Error adding material category!";
      },
    });
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_materials_category";
    }

    return "view_materials_category";
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm headerBand title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit }) => {
            return (
              <Flex flexDirection="column" gap="22px">
                <CustomInput
                  label="Category Name"
                  name="category_name"
                  type="text"
                  viewOnly={isViewMode}
                />

                <Flex gap="22px" justifyContent="flex-end">
                  <Link href="/materials/category">
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
