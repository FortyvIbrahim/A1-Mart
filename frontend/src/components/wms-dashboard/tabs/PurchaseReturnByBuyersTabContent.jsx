import React from "react";
import {
  Accordion,
  Badge,
  Box,
  Flex,
  HStack,
  Icon,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FaBoxOpen } from "react-icons/fa";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";

function PurchaseReturnByBuyersTabContent({
  purchaseReturnBuyerFilter,
  purchaseReturnBuyerOptions,
  setPurchaseReturnBuyerFilter,
  filteredPurchaseReturnByBuyer,
  purchaseReturnSupplierItemsColDefs,
}) {
  return (
    <>
      <Flex mb={3} maxW={{ base: "100%", md: "320px" }}>
        <CustomInput
          method="searchable-dropdown"
          name="purchase_return_buyer_filter"
          label="Buyer"
          placeholder="All Buyers"
          value={purchaseReturnBuyerFilter}
          options={[
            { label: "All Buyers", value: "" },
            ...purchaseReturnBuyerOptions,
          ]}
          onChange={(next) =>
            setPurchaseReturnBuyerFilter(next == null ? "" : String(next))
          }
        />
      </Flex>
      {filteredPurchaseReturnByBuyer.length === 0 ? (
        <Flex minH="180px" align="center" justify="center">
          <Text color="gray.500">No purchase return data.</Text>
        </Flex>
      ) : (
        <Stack gap={4}>
          {filteredPurchaseReturnByBuyer.map((buyerData) => (
            <CustomContainer
              key={buyerData.buyerName}
              title={`Buyer: ${buyerData.buyerName}`}
              fullWidth
              size="sm"
            >
              {buyerData.suppliers.length === 0 ? (
                <Flex minH="140px" align="center" justify="center">
                  <Text color="gray.500">No pending suppliers.</Text>
                </Flex>
              ) : (
                <Accordion.Root multiple gap={0}>
                  {buyerData.suppliers.map((sup, si) => (
                    <Accordion.Item
                      key={`${buyerData.buyerName}-${sup.supplier_id}-${si}`}
                      value={`supplier-${buyerData.buyerName}-${si}`}
                      bg="gray.50"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="gray.200"
                      overflow="hidden"
                      mb={4}
                    >
                      <Accordion.ItemTrigger
                        _hover={{ bg: "gray.100" }}
                        px={4}
                        py={3}
                      >
                        <Flex
                          alignItems="center"
                          justifyContent="space-between"
                          w="100%"
                        >
                          <HStack gap={3}>
                            <Icon as={FaBoxOpen} boxSize="4" color="gray.500" />
                            <Text fontWeight="semibold" fontSize="md">
                              {sup.supplierName || "—"}
                            </Text>
                            <Badge
                              size="sm"
                              variant="outline"
                              colorPalette="gray"
                            >
                              {sup.items.length} item(s)
                            </Badge>
                            <Badge
                              size="sm"
                              colorPalette="blue"
                              variant="subtle"
                            >
                              No of boxes: {sup.no_of_boxes}
                            </Badge>
                          </HStack>
                          <Accordion.ItemIndicator />
                        </Flex>
                      </Accordion.ItemTrigger>
                      <Accordion.ItemContent px={4} pb={4} pt={0}>
                        <VStack align="stretch" gap={4} mt={2}>
                          <Box
                            bg="white"
                            borderRadius="md"
                            borderWidth="1px"
                            borderColor="gray.200"
                            p={4}
                          >
                            {sup.items.length === 0 ? (
                              <Text fontSize="sm" color="gray.500">
                                No items
                              </Text>
                            ) : (
                              <AgGrid
                                rowData={sup.items}
                                columnDefs={purchaseReturnSupplierItemsColDefs}
                                tableKey={`purchase-return-buyer-${buyerData.buyerName}-sup-${si}`}
                                defaultRows={Math.min(sup.items.length, 10)}
                                pagination={sup.items.length > 10}
                                gridOptions={{
                                  domLayout: "normal",
                                  headerHeight: 36,
                                  rowHeight: 36,
                                }}
                              />
                            )}
                          </Box>
                        </VStack>
                      </Accordion.ItemContent>
                    </Accordion.Item>
                  ))}
                </Accordion.Root>
              )}
            </CustomContainer>
          ))}
        </Stack>
      )}
    </>
  );
}

export default PurchaseReturnByBuyersTabContent;
