"use client";

import useProductById from "@/api/customHooks/useProductById";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Button, Flex, Grid, Text, Box } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateProduct } from "@/api/helpers/products";
import { uploadAsset } from "@/api/helpers/assets";
import { capitalizeWords } from "@/utils/string";
import Image from "next/image";
import EmptyImage from "@/components/EmptyImage";

const VALIDATION_SCHEMA = Yup.object({
  image_url: Yup.mixed()
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
  product_id: "",
  de_name: "",
  category_name: "",
  subcategory_name: "",
  department_name: "",
  brand_name: "",
  image_url: null,
};

function ProductsForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const productId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const { product, loading, refetch } = useProductById(productId);

  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if (product && (isEditMode || isViewMode)) {
      setInitialValues({
        product_id: product.product_id || "",
        de_name: product.de_name || "",
        category_name: capitalizeWords(product.category_name || ""),
        subcategory_name: capitalizeWords(product.subcategory_name || ""),
        department_name: capitalizeWords(product.department_name || ""),
        brand_name: capitalizeWords(product.brand_name || ""),
        image_url: product.image_url || null,
      });
    }
  }, [isEditMode, isViewMode, product]);

  const getTitle = () => {
    if (isEditMode) {
      return "Edit Product";
    }
    return `Product : #${product?.product_id ?? ""}`;
  };

  const handleSubmit = async (values) => {
    if (!isEditMode) return;

    try {
      const { image_url } = values;
      let finalImageUrl = null;

      if (!image_url) {
        finalImageUrl = null;
      } else if (typeof image_url === "string") {
        // If it's already a URL string, use it as is
        finalImageUrl = image_url;
      } else if (image_url instanceof File) {
        // Upload new file to S3
        const toastId = toast.loading("Uploading image...");
        let response = null;

        try {
          response = await uploadAsset(
            image_url,
            product.gf_item_name || `product-${product.product_id}`,
            "products",
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
          finalImageUrl = response.remoteUrl;
        } else {
          throw new Error(response.message);
        }
      }

      // Only update if image_url has changed
      const hasChanged =
        image_url instanceof File || finalImageUrl !== product.image_url;

      if (hasChanged) {
        const data = {
          image_url: finalImageUrl,
        };

        toast.promise(updateProduct(productId, data), {
          loading: "Updating product image...",
          success: (response) => {
            if (response.code === 200) {
              refetch();
              return "Product image updated successfully!";
            } else {
              throw new Error(response.message);
            }
          },
          error: (err) => {
            console.error(err);
            return "Error updating product image!";
          },
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating product!");
    }
  };

  const getPermissionKey = () => {
    if (isEditMode) {
      return "add_products";
    }
    return "view_products";
  };

  if (loading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm title={getTitle()}>
          <Text>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (!product) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm title={getTitle()}>
          <Text>Product not found</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, values }) => {
            return (
              <Flex flexDirection="column" gap="22px">
                <Grid
                  templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                  gap="22px"
                >
                  <CustomInput
                    label="Product ID"
                    name="product_id"
                    type="text"
                    viewOnly={true}
                  />

                  <CustomInput
                    label="DE Name"
                    name="de_name"
                    type="text"
                    viewOnly={true}
                  />

                  <CustomInput
                    label="Category Name"
                    name="category_name"
                    type="text"
                    viewOnly={true}
                  />

                  <CustomInput
                    label="Subcategory Name"
                    name="subcategory_name"
                    type="text"
                    viewOnly={true}
                  />

                  <CustomInput
                    label="Department Name"
                    name="department_name"
                    type="text"
                    viewOnly={true}
                  />

                  <CustomInput
                    label="Brand Name"
                    name="brand_name"
                    type="text"
                    viewOnly={true}
                  />

                  <CustomInput
                    label="Image URL"
                    name="image_url"
                    method="image-upload"
                    accept="image/*"
                    viewOnly={isViewMode}
                  />
                </Grid>

                {isEditMode && (
                  <Flex gap="22px" justifyContent="flex-end">
                    <Link href="/products">
                      <Button variant="subtle">Back</Button>
                    </Link>
                    <Button onClick={handleSubmit}>Update</Button>
                  </Flex>
                )}

                {isViewMode && (
                  <Flex gap="22px" justifyContent="flex-end">
                    <Link href="/products">
                      <Button variant="subtle">Back</Button>
                    </Link>
                    <Link href={`/products/edit/${productId}`}>
                      <Button>Edit</Button>
                    </Link>
                  </Flex>
                )}
              </Flex>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ProductsForm;
