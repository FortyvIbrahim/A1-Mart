import React from "react";
import { Box, Grid, Text } from "@chakra-ui/react";

/** Figma "GRN Details" box: bordered r8 panel, 2 columns of orange label + 16/500 value. */
function Info({ title, value }) {
  return (
    <Box>
      <Text fontSize="11px" lineHeight="14px" color="#C95C18" mb="6px">
        {title}
      </Text>
      <Text fontSize="16px" lineHeight="20px" fontWeight="500" color="fg">
        {value ?? "-"}
      </Text>
    </Box>
  );
}

function GRNDetails({ grn }) {
  if (!grn) return null;

  return (
    <Box borderWidth="1px" borderColor="border" borderRadius="8px" p="16px" bg="white">
      <Text fontSize="14px" fontWeight="500" color="fg" mb="12px">
        GRN Details
      </Text>
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="16px">
        <Info title="GRN ID" value={grn.grn_id} />
        <Info title="Handled by" value={grn.employee?.employee_name || "-"} />
        {grn.is_product_stock_missing && (
          <>
            <Info title="Missing Qty" value={grn.missing_qty} />
            <Info title="Missing Value" value={grn.missing_value} />
          </>
        )}
      </Grid>
    </Box>
  );
}

export default GRNDetails;
