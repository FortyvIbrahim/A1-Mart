import {
  Box,
  Flex,
  Text,
  Badge,
  VStack,
  HStack,
} from "@chakra-ui/react";
import React, { useMemo } from "react";
import Image from "next/image";
import StockCheckerInput from "@/components/StockChecker";
import EmptyImage from "@/components/EmptyImage";
import { capitalizeWords } from "@/utils/string";
import { formatStockDisplay } from "@/utils/stockFormat";

const ProductCard = React.memo(function ProductCard({
  product,
  totalStock,
  initialCheckedStock,
  onSave,
  stockCircleId,
}) {
  const inStock = totalStock > 0;
  const formattedStock = formatStockDisplay(totalStock);
  const productCode = useMemo(
    () => product.product_code || product.product_id || "-",
    [product.product_code, product.product_id]
  );
  const productName = useMemo(
    () => capitalizeWords(product.product_name || "-"),
    [product.product_name]
  );
  const imageUrl =
    product.image_url ?? product.product_image_url ?? null;

  return (
    <Box
      bg="white"
      borderRadius="md"
      p={4}
      borderWidth="1px"
      borderColor="gray.200"
      mb={3}
    >
      <Flex gap={3} align="flex-start">
        <Flex w="100px" h="100px" flexShrink={0} borderRadius="md" overflow="hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={productName}
              width={100}
              height={100}
              style={{ objectFit: "contain" }}
            />
          ) : (
            <EmptyImage width={100} height={100} />
          )}
        </Flex>
        <VStack align="stretch" flex={1} spacing={2}>
          {/* Product Name */}
          <Text
            fontSize="sm"
            fontWeight="medium"
            color="gray.800"
            noOfLines={2}
          >
            {productName}
          </Text>

          {/* Product Details Row */}
          <HStack spacing={3} flexWrap="wrap" fontSize="xs" color="gray.600">
            <Text>Code: {productCode}</Text>
          </HStack>

          {/* Stock Status and Input */}
          <Flex gap={2} align="center" flexWrap="wrap" mt={1}>
            <Badge
              colorPalette={inStock ? "green" : "red"}
              variant="subtle"
              px={2}
              py={1}
              fontSize="xs"
            >
              <Text>
                {inStock ? "INSTOCK" : "OUT OF STOCK"} ({formattedStock})
              </Text>
            </Badge>

            <Flex gap={2} align="center" flex={1} minW="150px">
              <Box flex={1}>
                <StockCheckerInput
                  totalStock={totalStock}
                  productId={product.product_id}
                  stockCircleId={stockCircleId}
                  initialCheckedStock={initialCheckedStock}
                  onSave={onSave}
                />
              </Box>
            </Flex>
          </Flex>
        </VStack>
      </Flex>
    </Box>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
