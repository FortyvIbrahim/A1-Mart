import React from "react";
import {
  Box,
  Text,
  Grid,
  Flex,
  VStack,
  Badge,
  FormatNumber,
} from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import CalendarDots from "@/components/CalendarDots";

const UserCard = ({
  userId,
  userData,
  dateRange,
  isHighestSales,
  isHighestBills,
  isLowestSales,
  isLowestBills,
  onClick,
}) => (
  <Box
    onClick={onClick}
    cursor="pointer"
    border="0.5px solid transparent"
    _hover={{
      border: "0.5px solid",
      borderColor: "brand.500",
    }}
    borderRadius="8px"
    transition="all 0.2s"
  >
    <CustomContainer
      color="brand"
      size="sm"
      title={
        <Flex justify="space-between" gap={2}>
          {userData.employee_name} {/* Badges */}
          {(isHighestSales ||
            isHighestBills ||
            isLowestSales ||
            isLowestBills) && (
            <Flex gap={2} justify="center">
              {isHighestSales && (
                <Badge colorPalette="green" variant="solid" size="sm">
                  🏆 Highest Sales
                </Badge>
              )}
              {isHighestBills && (
                <Badge colorPalette="blue" variant="solid" size="sm">
                  📊 Highest Bills
                </Badge>
              )}
              {isLowestSales && (
                <Badge colorPalette="red" variant="solid" size="sm">
                  📉 Lowest Sales
                </Badge>
              )}
              {isLowestBills && (
                <Badge colorPalette="orange" variant="solid" size="sm">
                  📊 Lowest Bills
                </Badge>
              )}
            </Flex>
          )}
        </Flex>
      }
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        transform: "translateY(-2px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <VStack spacing={4} align="stretch">
        {/* Key Metrics */}
        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          <Box>
            <Text fontSize="xs" color="gray.600" fontWeight="medium">
              Total Sales
            </Text>
            <Text fontSize="lg" fontWeight="bold" color="brand600">
              <FormatNumber
                value={userData.total_sales}
                style="currency"
                currency="INR"
              />
            </Text>
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.600" fontWeight="medium">
              Total Bills
            </Text>
            <Text fontSize="lg" fontWeight="bold" color="secondary600">
              {userData.total_no_of_bills.toLocaleString()}
            </Text>
          </Box>
        </Grid>

        {/* Data Count */}
        <Flex justify="space-between" align="center">
          <Text fontSize="xs" color="gray.500">
            {userData.data.length} records •{" "}
            {userData.total_no_of_items.toLocaleString()} items
          </Text>

          <Text fontSize="xs" color="gray.500">
            {userData.designation_name}
          </Text>
        </Flex>
      </VStack>
    </CustomContainer>
  </Box>
);

export default UserCard;
