import {
  Box,
  Flex,
  Text,
  Badge,
  VStack,
  HStack,
} from "@chakra-ui/react";
import React from "react";
import Image from "next/image";
import EmptyImage from "../EmptyImage";
import Link from "next/link";
import { formatStockDisplay } from "@/utils/stockFormat";

const ProductCardPrice = React.memo(function ProductCardPrice({
  product,
  totalStock,
  /** When set (e.g. mobile price checker), card opens Check Price instead of navigating. */
  onOpenPriceCheck,
}) {
  const inStock = totalStock > 0;
  const formattedStock = formatStockDisplay(totalStock);
  const { product_name, product_id } = product;
  const historyHref = `/products/price-checker/${product_id}`;

  const getAverageMRP = () => {
    return (
      product.stock_price
        ?.filter((item) => item.cost_price > 0)
        .reduce((acc, curr) => acc + Number(curr.cost_price || 0), 0) /
        product.stock_price?.length || 0
    );
  };

  const getAverageRate = () => {
    return (
      product.stock_price
        ?.filter((item) => item.selling_price > 0)
        .reduce((acc, curr) => acc + Number(curr.selling_price || 0), 0) /
        product.stock_price?.length || 0
    );
  };

  const imageCell = (
    <Flex w="100px" h="100px" flexShrink={0}>
      {product.image_url ? (
        <Image
          src={product.image_url}
          alt={product_name}
          width={100}
          height={100}
        />
      ) : (
        <EmptyImage width={100} height={100} />
      )}
    </Flex>
  );

  const productDetailsColumn = (
    <VStack
      align="stretch"
      flex={1}
      spacing={2}
      justifyContent="center"
      minW={0}
    >
      <Text
        fontSize="sm"
        fontWeight="medium"
        color="gray.800"
        noOfLines={2}
      >
        {product_name}
      </Text>

      <HStack spacing={3} flexWrap="wrap" fontSize="xs" color="gray.600">
        <Text>
          Code: <span style={{ fontWeight: "bold" }}>{product_id}</span>
        </Text>
        <Text>
          Rate:{" "}
          <span style={{ fontWeight: "bold" }}>
            {getAverageRate().toFixed(2)}
          </span>
        </Text>
        <Text>
          MRP:{" "}
          <span style={{ fontWeight: "bold" }}>
            {getAverageMRP().toFixed(2)}
          </span>
        </Text>
      </HStack>

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
      </Flex>
    </VStack>
  );

  const cardInner = (
    <Flex gap={3} align="flex-start">
      {imageCell}
      {productDetailsColumn}
    </Flex>
  );

  if (onOpenPriceCheck) {
    return (
      <Box
        as="button"
        type="button"
        w="100%"
        textAlign="left"
        bg="white"
        borderRadius="md"
        p={4}
        borderWidth="1px"
        borderColor="gray.200"
        mb={3}
        cursor="pointer"
        onClick={() => onOpenPriceCheck(product)}
        _hover={{ bg: "gray.50" }}
        _active={{ bg: "gray.100" }}
      >
        {cardInner}
      </Box>
    );
  }

  return (
    <Link href={historyHref}>
      <Box
        bg="white"
        borderRadius="md"
        p={4}
        borderWidth="1px"
        borderColor="gray.200"
        mb={3}
      >
        {cardInner}
      </Box>
    </Link>
  );
});

ProductCardPrice.displayName = "ProductCard";

export default ProductCardPrice;
