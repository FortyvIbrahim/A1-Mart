"use client";

import React, { use, useMemo } from "react";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Flex, Text, Spinner } from "@chakra-ui/react";
import usePurchaseEntriesByProductId from "@/api/customHooks/usePurchaseEntriesByProductId";

function ProductPriceList({ params }) {
  const { product_id } = use(params);
  const { entries, loading } = usePurchaseEntriesByProductId(product_id);

  const productName = useMemo(() => {
    if (entries.length > 0 && entries[0]?.product?.product_name) {
      return entries[0].product.product_name;
    }
    return `Product #${product_id}`;
  }, [entries, product_id]);

  const colDefs = useMemo(
    () => [
      {
        field: "supplier",
        headerName: "Supplier",
        valueGetter: (params) => params.data?.supplier?.name ?? "—",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "invoice_no",
        headerName: "Invoice No",
        minWidth: 120,
      },
      {
        field: "invoice_date",
        headerName: "Invoice Date",
        type: "date",
        minWidth: 120,
      },
      {
        field: "quantity",
        headerName: "Qty",
        type: "number",
        minWidth: 80,
      },
      {
        field: "rate",
        headerName: "Rate",
        type: "currency",
        minWidth: 100,
      },
    ],
    []
  );

  if (loading) {
    return (
      <GlobalWrapper permissionKey="view_price_checker">
        <Flex justify="center" align="center" p={8}>
          <Spinner size="lg" />
        </Flex>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey="view_price_checker">
      <Flex flexDirection="column" gap="22px">
        <CustomContainer title={productName} color="brand">
          {entries.length === 0 ? (
            <Flex justify="center" p={6}>
              <Text color="gray.500">No purchase entries found for this product.</Text>
            </Flex>
          ) : (
            <AgGrid
              rowData={entries}
              columnDefs={colDefs}
              noMobileVersion
              tableKey={`price-checker-${product_id}`}
            />
          )}
        </CustomContainer>
      </Flex>
    </GlobalWrapper>
  );
}

export default ProductPriceList;
