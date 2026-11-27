"use client";
import useProducts from "@/api/customHooks/useProducts";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import usePermission from "@/customHooks/usePermission";
import React from "react";
import { useRouter } from "next/navigation";
import { SKU_TYPES } from "@/constants/sku_mode";
import FileUploaderWithColumnMapping from "@/components/FileUploaderWithColumnMapping";
import { Button, Flex } from "@chakra-ui/react";
import toast from "react-hot-toast";

const IMPORT_IMAGES_TARGET_COLUMNS = [
  {
    key: "product_id",
    label: "Product ID",
    required: true,
    suggestedKey: "products_code",
    type: "string",
  },
  {
    key: "image_url",
    label: "Image URL",
    required: true,
    suggestedKey: "products_image",
    type: "string",
  },
];

function Products() {
  const router = useRouter();
  const { products, bulkUpdateImageUrls, syncProducts } = useProducts();

  const canEdit = usePermission("add_products");
  const canImportImages = usePermission("import_product_images");
  const canSyncProducts = usePermission("sync_products");

  const handleSyncProducts = () => {
    toast.promise(syncProducts(), {
      loading: "Syncing products...",
      success: (res) =>
        (res && typeof res === "object" && res.message) ||
        "Products synced successfully.",
      error: (err) =>
        err?.response?.data?.message || "Failed to sync products.",
    });
  };

  const handleImportImagesMapped = (mappedData) => {
    if (!mappedData?.length) return;
    const items = mappedData.map((row) => ({
      product_id: Number(row.product_id) || 0,
      image_url:
        row.image_url != null && String(row.image_url).trim() !== ""
          ? String(row.image_url).trim()
          : null,
    }));
    const valid = items.filter((i) => i.product_id > 0);
    if (!valid.length) {
      toast.error("No valid product IDs in the file.");
      return;
    }
    const count = valid.length;
    toast.promise(bulkUpdateImageUrls(valid), {
      loading: "Updating product images...",
      success: `Updated images for ${count} product(s).`,
      error: (err) =>
        err?.response?.data?.message || "Failed to update product images.",
    });
  };

  const colDefs = [
    {
      field: "product_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "image_url",
      headerName: "Image",
      type: "image",
      imageSettings: {
        objectFit: "contain",
      },
    },
    {
      field: "product_name",
      headerName: "Name",
      type: "capitalized",
    },
    {
      field: "ean_number",
      headerName: "EAN",
    },
    {
      field: "department_name",
      headerName: "Department",
    },
    {
      field: "category_name",
      headerName: "Category",
    },
    {
      field: "subcategory_name",
      headerName: "Subcategory",
    },
    {
      field: "brand_name",
      headerName: "Brand",
    },
    {
      field: "supplier_name",
      headerName: "Supplier",
      hideByDefault: true,
    },
    {
      field: "repln_mode",
      headerName: "SKU Type",
      type: "badge-column",
      valueGetter: (props) => {
        const replnMode = props.data.repln_mode || null;
        return {
          label: SKU_TYPES[replnMode]?.label || "UNSET",
          colorScheme: SKU_TYPES[replnMode].colorPalette || "gray",
        };
      },
    },
    {
      field: "product_id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        const items = [
          {
            label: "View",
            value: "view",
            onClick: () =>
              router.push(`/products/view/${props.data.product_id}`),
          },
        ];

        if (canEdit) {
          items.push({
            label: "Edit",
            value: "edit",
            onClick: () =>
              router.push(`/products/edit/${props.data.product_id}`),
          });
        }

        return items;
      },
    },
  ];

  return (
    <GlobalWrapper permissionKey="view_products">
      <CustomContainer mainCard
        title="Products"
        rightSection={
          (canSyncProducts || canImportImages) && (
            <Flex gap={2} align="center" flexWrap="wrap" justify="flex-end">
              {canSyncProducts && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncProducts}
                >
                  <i className="fa fa-sync" />
                  Sync Now
                </Button>
              )}
              {canImportImages && (
                <FileUploaderWithColumnMapping
                  showToast={false}
                  targetColumns={IMPORT_IMAGES_TARGET_COLUMNS}
                  onDataMapped={handleImportImagesMapped}
                  renderer={({ openFileSelector }) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openFileSelector}
                    >
                      Import Images
                    </Button>
                  )}
                />
              )}
            </Flex>
          )
        }
      >
        <AgGrid
          rowData={products}
          columnDefs={colDefs}
          gridOptions={{ rowHeight: 80 }}
          tableKey="products"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Products;
