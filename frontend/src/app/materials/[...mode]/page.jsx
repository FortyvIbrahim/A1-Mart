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
import useMaterialsCategory from "@/api/customHooks/useMaterialsCategory";
import toast from "react-hot-toast";
import { createMaterial, updateMaterial } from "@/api/helpers/materials";
import useMaterialById from "@/api/customHooks/useMaterialById";
import { uploadAsset } from "@/api/helpers/assets";
import useMasterList from "@/api/customHooks/useMasterList";
import { capitalizeWords } from "@/utils/string";

const UNITS = [
  { value: 1, label: "Kg" },
  { value: 2, label: "g" },
  { value: 3, label: "ml" },
  { value: 4, label: "L" },
  { value: 5, label: "Units" },
  { value: 6, label: "Pcs" },
  { value: 7, label: "Box" },
  { value: 8, label: "Bag" },
];

const VALIDATION_SCHEMA = Yup.object({
  name: Yup.string().required("Required"),
  description: Yup.string().nullable(),
  live_stock: Yup.number().nullable(),
  unit_id: Yup.string().nullable(),
  material_category_id: Yup.string().nullable(),
  supplier_id: Yup.string().nullable(),
  tax_percentage: Yup.number().nullable(),
  hsn_number: Yup.string().nullable(),
  image: Yup.mixed()
    .test("is-string-or-file", "Must be a valid URL or file", function (value) {
      if (!value) return true; // Allow empty values

      // Check if it's a string (URL)
      if (typeof value === "string") {
        // Basic URL validation
        const urlPattern =
          /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        return urlPattern.test(value);
      }

      // Check if it's a File object
      if (value instanceof File) {
        // Validate file type (images only)
        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/svg+xml",
        ];
        console.log(value.type);
        if (!allowedTypes.includes(value.type)) {
          return this.createError({
            message: "Must be an Image",
          });
        }
        return true;
      }

      return false;
    })
    .nullable(),
});

const INITIAL_VALUES = {
  name: "",
  description: "",
  live_stock: "",
  unit_id: null,
  material_category_id: "",
  image: null,
  is_active: true,
  supplier_id: null,
  tax_percentage: "",
  hsn_number: "",
};

export default function MaterialsForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const materialId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const { material } = useMaterialById(materialId);

  const { materialsCategory } = useMaterialsCategory();
  const { masterList } = useMasterList();
  const suppliers = masterList
    .filter((sup) => sup.person_type === 1 && sup.status === 1)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({ ...item, name: capitalizeWords(item.name) }));

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if ((isEditMode || isViewMode) && material) {
      setInitialValues({
        name: material.name,
        description: material.description,
        live_stock: material.live_stock,
        unit_id: material.unit_id,
        material_category_id: material.material_category_id,
        image: material.image_url || null,
        is_active: material.is_active,
        supplier_id: material.supplier_id,
        tax_percentage: material.tax_percentage || "",
        hsn_number: material.hsn_number || "",
      });
    }
  }, [isEditMode, isViewMode, material]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Material";
    }

    if (isEditMode) {
      return "Edit Material";
    }

    return `Material : #${material?.material_id ?? ""}`;
  };

  const handleSubmit = async (values) => {
    try {
      const { image } = values;
      let image_url = null;

      if (!image) {
        image_url = null;
      } else if (typeof image === "string") {
        image_url = image;
      } else {
        const toastId = toast.loading("Uploading image...");
        let response = null;

        try {
          response = await uploadAsset(
            image,
            values.name,
            "materials",
            "image"
          );
        } catch (err) {
          console.error(err);
          toast.dismiss(toastId);
          toast.error("Error uploading image!");
          throw err;
        }

        toast.dismiss(toastId);
        if (response.code === 200) {
          image_url = response.remoteUrl;
        } else {
          throw new Error(response.message);
        }
      }

      const data = {
        name: values.name,
        is_active:
          values.is_active !== undefined || values.is_active !== null
            ? values.is_active == 1
            : true,
        description: values.description ? values.description : null,
        live_stock: values.live_stock ? values.live_stock : null,
        unit_id: values.unit_id ? values.unit_id : null,
        material_category_id: values.material_category_id
          ? values.material_category_id
          : null,
        image_url,
        supplier_id: values.supplier_id ? values.supplier_id : null,
        tax_percentage: values.tax_percentage ? values.tax_percentage : null,
        hsn_number: values.hsn_number ? values.hsn_number : null,
      };

      const promise = isEditMode
        ? updateMaterial(materialId, data)
        : createMaterial(data);

      toast.promise(promise, {
        loading: isEditMode ? "Updating material..." : "Adding new material...",
        success: (response) => {
          if (response.code === 200) {
            router.push("/materials");
            return isEditMode ? "Material Updated!" : "Material Added!";
          } else {
            throw new Error(response.message);
          }
        },
        error: (err) => {
          console.error(err);
          return isEditMode
            ? "Error updating material!"
            : "Error adding material!";
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error adding material!");
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_materials";
    }

    return "view_materials";
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
                  templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
                  gap="22px"
                >
                  <CustomInput
                    label="Material Name"
                    name="name"
                    type="text"
                    viewOnly={isViewMode}
                  />
                  <CustomInput
                    label="Live Stock"
                    name="live_stock"
                    type="text"
                    viewOnly={isViewMode}
                  />
                  <CustomInput
                    label="Description"
                    name="description"
                    type="text"
                    viewOnly={isViewMode}
                  />
                  <CustomInput
                    label="Unit"
                    name="unit_id"
                    method="dropdown"
                    placeholder="Select unit"
                    options={UNITS}
                    viewOnly={isViewMode}
                  />
                  <CustomInput
                    label="Category"
                    name="material_category_id"
                    placeholder="Select category"
                    method="dropdown"
                    options={materialsCategory.map((cat) => ({
                      value: cat.material_category_id,
                      label: cat.category_name,
                    }))}
                    viewOnly={isViewMode}
                  />
                  <CustomInput
                    label="Supplier"
                    name="supplier_id"
                    placeholder="Select supplier"
                    method="dropdown"
                    options={suppliers.map((sup) => ({
                      label: sup.name,
                      value: sup.master_id,
                    }))}
                    viewOnly={isViewMode}
                  />
                  <CustomInput
                    label="Tax %"
                    name="tax_percentage"
                    type="text"
                    viewOnly={isViewMode}
                  />
                  <CustomInput
                    label="HSN Number"
                    name="hsn_number"
                    type="text"
                    viewOnly={isViewMode}
                  />

                  <CustomInput
                    label="Image"
                    name="image"
                    viewOnly={isViewMode}
                    method="file"
                    accept="image/*"
                  />
                </Grid>

                <Flex gap="22px" justifyContent="flex-end">
                  <Link href="/materials">
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
