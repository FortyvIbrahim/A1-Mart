import React, { useRef } from "react";
import {
  Box,
  Text,
  Grid,
  Flex,
  VStack,
  HStack,
  Badge,
  FormatNumber,
  Button,
  CloseButton,
} from "@chakra-ui/react";
import { Drawer } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import CalendarDots from "@/components/CalendarDots";
import AgGrid from "@/components/AgGrid";
import moment from "moment";

const UserDetailsPanel = ({
  isOpen,
  onClose,
  userData,
  userId,
  dateRange,
  isHighestSales,
  isHighestBills,
  isLowestSales,
  isLowestBills,
}) => {
  if (!isOpen || !userData) return null;

  const gridRef = useRef(null);

  const formatCurrency = (value) => (
    <FormatNumber value={value} style="currency" currency="INR" />
  );

  const formatDate = (date) => moment(date).format("DD/MM/YYYY");

  const renderSalesType = (sales, type, reason) => {
    const isExcess = type === "excess";

    if (sales == 0) {
      return "-";
    }

    const content = (
      <Flex
        gap="2px"
        color={isExcess ? "green.600" : "red.600"}
        w="fit-content"
      >
        <Text>{isExcess ? "+" : "-"}</Text>
        <Text>
          <FormatNumber value={sales} style="currency" currency="INR" />
        </Text>
      </Flex>
    );

    if (reason) {
      return (
        <Flex direction="column" gap={1}>
          {content}
          <Text fontSize="xs" color="gray.500">
            {reason}
          </Text>
        </Flex>
      );
    }

    return content;
  };

  const colDefs = [
    {
      field: "date",
      headerName: "Date",
      width: 100,
      resizable: true,
      cellRenderer: (props) => moment(props.value).format("DD/MM/YYYY"),
      valueGetter: (props) => moment(props.data.date),
      sort: "desc",
    },
    {
      field: "total_sales",
      headerName: "Total Sales",
      width: 120,
      resizable: true,
      cellRenderer: (props) => (
        <FormatNumber value={props.value} style="currency" currency="INR" />
      ),
      valueGetter: (props) => parseFloat(props.data.total_sales),
    },
    {
      field: "cash_sales",
      headerName: "Cash",
      width: 120,
      resizable: true,
      cellRenderer: (props) =>
        renderSalesType(
          props.data.cash_sales,
          props.data.cash_type,
          props.data.cash_reason
        ),
      valueGetter: (props) => parseFloat(props.data.cash_sales),
    },
    {
      field: "card_sales",
      headerName: "Card",
      width: 120,
      resizable: true,
      cellRenderer: (props) =>
        renderSalesType(
          props.data.card_sales,
          props.data.card_type,
          props.data.card_reason
        ),
      valueGetter: (props) => parseFloat(props.data.card_sales),
    },
    {
      field: "paytm_sales",
      headerName: "Paytm",
      width: 120,
      resizable: true,
      cellRenderer: (props) =>
        renderSalesType(
          props.data.paytm_sales,
          props.data.paytm_type,
          props.data.paytm_reason
        ),
      valueGetter: (props) => parseFloat(props.data.paytm_sales),
    },
    {
      field: "no_of_bills",
      headerName: "Bills",
      width: 80,
      resizable: true,
    },
    {
      field: "no_of_items",
      headerName: "Items",
      width: 80,
      resizable: true,
    },
  ];

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      size="lg"
    >
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Title>
              <Flex justify="space-between" align="center">
                <Flex gap={4}>
                  <Text fontSize="xl" fontWeight="bold" color="brand600">
                    {userData.employee_name}
                  </Text>

                  {/* Badges */}
                  {(isHighestSales ||
                    isHighestBills ||
                    isLowestSales ||
                    isLowestBills) && (
                    <Flex gap={2} wrap="wrap" alignItems="center">
                      {isHighestSales && (
                        <Badge
                          colorPalette="green"
                          variant="solid"
                          size="sm"
                          h="fit-content"
                        >
                          🏆 Highest Sales
                        </Badge>
                      )}
                      {isHighestBills && (
                        <Badge
                          colorPalette="blue"
                          variant="solid"
                          size="sm"
                          h="fit-content"
                        >
                          📊 Highest Bills
                        </Badge>
                      )}
                      {isLowestSales && (
                        <Badge
                          colorPalette="red"
                          variant="solid"
                          size="sm"
                          h="fit-content"
                        >
                          📉 Lowest Sales
                        </Badge>
                      )}
                      {isLowestBills && (
                        <Badge
                          colorPalette="orange"
                          variant="solid"
                          size="sm"
                          h="fit-content"
                        >
                          📊 Lowest Bills
                        </Badge>
                      )}
                    </Flex>
                  )}
                </Flex>

                <CloseButton onClick={onClose} />
              </Flex>
            </Drawer.Title>
          </Drawer.Header>

          <Drawer.Body>
            <Flex flexDirection="column" gap={6}>
              {/* Calendar Dots */}
              <CustomContainer
                title="Daily Records Calendar"
                color="secondary"
                size="sm"
              >
                <CalendarDots
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  records={userData.data}
                  title=""
                />
              </CustomContainer>

              {/* Statistics */}
              <CustomContainer title="Statistics" color="secondary" size="sm">
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Box>
                    <Text fontSize="xs" color="gray.600" fontWeight="medium">
                      Total Sales
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="brand600">
                      {formatCurrency(userData.total_sales)}
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
                  <Box>
                    <Text fontSize="xs" color="gray.600" fontWeight="medium">
                      Total Items
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="gray.700">
                      {userData.total_no_of_items.toLocaleString()}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.600" fontWeight="medium">
                      Avg Bill Value
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="gray.700">
                      {formatCurrency(
                        userData.total_sales / userData.total_no_of_bills
                      )}
                    </Text>
                  </Box>
                </Grid>
              </CustomContainer>

              {/* Records Table */}
              <CustomContainer title="All Records" color="secondary" size="sm">
                <Box>
                  <AgGrid
                    tableKey="user-details-panel-records"
                    ref={gridRef}
                    rowData={userData.data}
                    columnDefs={colDefs}
                    defaultColDef={{
                      sortable: true,
                      filter: true,
                      resizable: true,
                    }}
                    pagination={true}
                    paginationPageSize={10}
                    suppressRowClickSelection={true}
                    animateRows={true}
                  />
                </Box>
              </CustomContainer>
            </Flex>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
};

export default UserDetailsPanel;
