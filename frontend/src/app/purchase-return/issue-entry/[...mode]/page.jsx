"use client";

import React, { useState, useMemo } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Formik } from "formik";
import * as Yup from "yup";
import FileUploaderWithColumnMapping from "@/components/FileUploaderWithColumnMapping";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import AgGrid from "@/components/AgGrid";
import {
  Box,
  Text,
  Flex,
  Grid,
  Button,
  Accordion,
  Badge,
  VStack,
  HStack,
  Icon,
  Separator,
  FormatNumber,
} from "@chakra-ui/react";
import { FaFileExcel, FaUser, FaBoxOpen, FaChevronDown } from "react-icons/fa";
import { parseSupplierCentricExcel } from "@/utils/parseSupplierCentricExcel";
import {
  buildFormValuesFromApi,
  buildFormValuesFromParsed,
  EMPTY_INITIAL,
  getIssueEntryValidationErrors,
} from "@/utils/purchaseReturns";
import useBranches from "@/api/customHooks/useBranches";
import useEmployee from "@/api/customHooks/useEmployee";
import useMasterList from "@/api/customHooks/useMasterList";
import useProducts from "@/api/customHooks/useProducts";
import usePurchaseReturnById from "@/api/customHooks/usePurchaseReturnById";
import {
  createPurchaseReturn,
  updatePurchaseReturn,
} from "@/api/helpers/purchaseReturns";
import { uploadAsset } from "@/api/helpers/assets";
import toast from "react-hot-toast";
import { DRIVER_DESIGNATION_ID } from "@/constants/designation";

const PR_EXCEL_TARGET_COLUMNS = [
  { key: "buyer", label: "Buyer", suggestedKey: "BUYER" },
  {
    key: "supplier_name",
    label: "Supplier Name",
    suggestedKey: "Supplier Name",
  },
  { key: "outlet_name", label: "Outlet Name", suggestedKey: "Outlet Name" },
  { key: "pr_date", label: "PR Date", suggestedKey: "PR Date" },
  { key: "pr_no", label: "PR No", suggestedKey: "PR No(T)" },
  { key: "item_name", label: "Item Name", suggestedKey: "Item Name" },
  { key: "qty", label: "Qty", suggestedKey: "Qty" },
  { key: "total_amt", label: "Total Amt", suggestedKey: "Total Amt" },
];

/** Memoized grid so it only re-renders when items or tableKey change */
const ItemsGrid = React.memo(function ItemsGrid({ items, tableKey }) {
  return (
    <AgGrid
      rowData={items ?? []}
      columnDefs={ITEMS_COLUMN_DEFS}
      defaultRows={8}
      tableKey={tableKey}
      showColumnSettings={false}
      pagination={false}
      gridOptions={{
        domLayout: "autoHeight",
        headerHeight: 36,
        rowHeight: 36,
      }}
    />
  );
});

const VALIDATION_SCHEMA = Yup.object({
  driver_id: Yup.mixed().required("Required"),
  receiving_branch_id: Yup.mixed().required("Required"),
  attachment: Yup.mixed().nullable(),
  buyers: Yup.array().of(
    Yup.object({
      buyer_name: Yup.string(),
      employee_code: Yup.mixed().nullable(),
      suppliers: Yup.array().of(
        Yup.object({
          supplier_name: Yup.string(),
          master_id: Yup.mixed().nullable(),
          no_of_boxes: Yup.string(),
          items: Yup.array(),
        })
      ),
    })
  ),
}).test("no-of-boxes-when-mapped", "", function (value) {
  if (!value?.buyers?.length) return true;
  const { errors: noOfBoxesErrors } = getIssueEntryValidationErrors(value);
  const paths = Object.keys(noOfBoxesErrors);
  if (paths.length === 0) return true;
  const inner = paths.map(
    (path) => new Yup.ValidationError(noOfBoxesErrors[path], value, path)
  );
  return this.createError({ path: "buyers", message: "", inner });
});

const ITEMS_COLUMN_DEFS = [
  {
    field: "product_image_url",
    headerName: "Image",
    type: "image",
  },
  { field: "item_name", headerName: "Item" },
  { field: "outlet_name", headerName: "Outlet" },
  { field: "pr_no", headerName: "PR No" },
  { field: "pr_date", headerName: "PR Date", type: "date" },
  {
    field: "qty",
    headerName: "Qty",
  },
  {
    field: "total_amount",
    headerName: "Amount",
    type: "currency",
    valueGetter: (params) => parseFloat(params.data?.total_amount) || null,
  },
];

export default function IssueEntryFormPage({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const isCreateMode = mode[0] === "create";
  const isEditMode = mode[0] === "edit";
  const isViewMode = mode[0] === "view";
  const recordId = mode?.[1] ?? null;

  const [parsedData, setParsedData] = useState(null);

  const { branches } = useBranches();
  const { employees } = useEmployee({
    filterInactive: true,
    allBranches: true,
  });

  const driverEmployees = employees.filter(
    (e) => e.designation_id == DRIVER_DESIGNATION_ID
  );

  const { masterList: rawMasterList } = useMasterList();
  const masterList = rawMasterList.filter((item) => item.person_type === 1);

  const { products } = useProducts();
  const { purchaseReturn, loading: loadingRecord } = usePurchaseReturnById(
    isEditMode || isViewMode ? recordId : null
  );

  const branchOptions = useMemo(
    () =>
      (branches || []).map((b) => ({
        value: b.branch_id,
        label: b.branch_name ?? b.name ?? String(b.branch_id ?? "—"),
      })),
    [branches]
  );

  const matchedEmployeeByCode = useMemo(() => {
    const map = {};
    (employees || []).forEach((e) => {
      if (e.employee_code) map[e.employee_code] = e;
    });
    return map;
  }, [employees]);

  const formInitialValues = useMemo(() => {
    if (isEditMode || isViewMode) {
      if (purchaseReturn) {
        return buildFormValuesFromApi(purchaseReturn, {
          employees: employees || [],
          masterList: masterList || [],
          branches: branches || [],
        });
      }
      return EMPTY_INITIAL;
    }
    if (parsedData) {
      return buildFormValuesFromParsed(parsedData, {
        branches: branches || [],
        employees: employees || [],
        masterList: masterList || [],
        products: products || [],
      });
    }
    return EMPTY_INITIAL;
  }, [
    isEditMode,
    isViewMode,
    purchaseReturn,
    parsedData,
    branches,
    employees,
    masterList,
    products,
  ]);

  const showForm =
    (!!parsedData && formInitialValues.buyers?.length > 0) ||
    ((isEditMode || isViewMode) && !!purchaseReturn);

  /** Set of "employee_code|supplier_id" for (emp, supplier) pairs that have delivered (for view badge) */
  const deliveredSupplierKeys = useMemo(() => {
    const set = new Set();
    if (!purchaseReturn?.employees?.length) return set;
    for (const emp of purchaseReturn.employees) {
      const ec = emp.employee_code ?? "";
      for (const s of emp.suppliers || []) {
        if (Array.isArray(s.delivered) && s.delivered.length > 0) {
          const sid = s.supplier_id ?? s.master_id ?? "";
          set.add(`${ec}|${sid}`);
        }
      }
    }
    return set;
  }, [purchaseReturn]);

  const getTitle = () => {
    if (isCreateMode) return "Create Purchase Return Issue Entry";
    if (isEditMode) return "Edit Purchase Return Issue Entry";
    return "View Purchase Return Issue Entry";
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) return "add_purchase_return_issue_entry";
    return "view_purchase_return_issue_entry";
  };

  const handleDataMapped = (data) => {
    setParsedData(data);
  };

  const handleClearParsed = () => {
    setParsedData(null);
  };

  const onSubmit = async (values) => {
    try {
      let attachmentUrl = values.attachment ?? null;
      if (attachmentUrl && typeof attachmentUrl !== "string") {
        const toastId = toast.loading("Uploading attachment...");
        try {
          const response = await uploadAsset(
            attachmentUrl,
            attachmentUrl.name ?? "attachment",
            "purchase-returns",
            "file"
          );
          toast.dismiss(toastId);
          if (response?.code === 200 && response?.remoteUrl) {
            attachmentUrl = response.remoteUrl;
          } else {
            throw new Error(response?.message || "Failed to upload file");
          }
        } catch (err) {
          toast.dismiss(toastId);
          toast.error("Error uploading attachment!");
          throw err;
        }
      }

      const payload = {
        driver_id: values.driver_id,
        receiving_branch_id:
          values.receiving_branch_id != null &&
          values.receiving_branch_id !== ""
            ? values.receiving_branch_id
            : undefined,
        attachment: attachmentUrl || undefined,
        employees: (values.buyers || []).map((b) => ({
          employee_code: b.employee_code ?? "",
          suppliers: (b.suppliers || []).map((s) => ({
            supplier_id:
              s.master_id != null && s.master_id !== ""
                ? s.master_id
                : undefined,
            no_of_boxes: Number(s.no_of_boxes) || 0,
            items: (s.items || [])
              .filter((it) => it.product_id != null && it.product_id !== "")
              .map((it) => ({
                product_id: Number(it.product_id),
                qty: Number(it.qty) || 0,
                total_amount:
                  it.total_amount != null ? Number(it.total_amount) : undefined,
                pr_date: it.pr_date || undefined,
                pr_no: it.pr_no || undefined,
                outlet_id:
                  it.outlet_id != null ? Number(it.outlet_id) : undefined,
              })),
          })),
        })),
      };

      if (isCreateMode) {
        await toast.promise(createPurchaseReturn(payload), {
          loading: "Creating purchase return...",
          success: (response) => {
            const id =
              response?.data?.purchase_return_id ??
              response?.purchase_return_id;
            if (response?.code === 200 || id != null) {
              router.push("/purchase-return/issue-entry");
              return "Purchase return created successfully!";
            }
            throw new Error(
              response?.message || "Error creating purchase return"
            );
          },
          error: (err) => err?.message || "Error creating purchase return",
        });
      } else if (isEditMode) {
        await toast.promise(updatePurchaseReturn(recordId, payload), {
          loading: "Updating purchase return...",
          success: (response) => {
            if (response?.success) {
              router.push("/purchase-return/issue-entry");
              return "Purchase return updated successfully!";
            }
            throw new Error(
              response?.message || "Error updating purchase return"
            );
          },
          error: (err) => err?.message || "Error updating purchase return",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if ((isEditMode || isViewMode) && loadingRecord) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm headerBand title={getTitle()} fullWidth>
          <Flex justifyContent="center" p={8}>
            <Text>Loading...</Text>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((isEditMode || isViewMode) && !purchaseReturn && !loadingRecord) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm headerBand title={getTitle()} fullWidth>
          <Flex flexDirection="column" gap={4} alignItems="center" p={8}>
            <Text>Purchase return not found</Text>
            <Link href="/purchase-return/issue-entry">
              <Button variant="subtle" colorPalette="gray">
                Back to list
              </Button>
            </Link>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm headerBand title={getTitle()} fullWidth>
        {!showForm && isCreateMode && (
          <Box px={{ base: 2, md: 0 }}>
            <Text mb="8px" fontSize="sm" fontWeight="semibold">
              Upload Excel (XLSX/CSV)
            </Text>
            <Text mb={{ base: 3, md: 4 }} fontSize="xs" color="gray.600">
              Map your file columns below, then the file is parsed into JSON.
              After parsing, the form will show with buyers and suppliers.
            </Text>
            <Flex gap={{ base: 3, md: 4 }} alignItems="flex-start">
              <Box flex={1} minW={0}>
                <FileUploaderWithColumnMapping
                  targetColumns={PR_EXCEL_TARGET_COLUMNS}
                  onDataMapped={handleDataMapped}
                  customParser={parseSupplierCentricExcel}
                  showToast={true}
                  fileUploaderProps={{
                    color: "brand",
                    size: "md",
                    showClipboardButton: false,
                  }}
                />
              </Box>
            </Flex>
          </Box>
        )}

        {showForm && (
          <Formik
            initialValues={formInitialValues}
            enableReinitialize
            validationSchema={VALIDATION_SCHEMA}
            onSubmit={onSubmit}
          >
            {({ values, errors, setFieldValue, handleSubmit }) => {
              const {
                missingNoOfBoxes,
                missingEmployeeNames,
                missingSupplierNames,
                missingProductNames,
                missingOutletNames,
              } = getIssueEntryValidationErrors(values);
              const hasMissingMappings =
                missingNoOfBoxes.length > 0 ||
                missingEmployeeNames.length > 0 ||
                missingSupplierNames.length > 0 ||
                missingProductNames.length > 0 ||
                missingOutletNames.length > 0;

              return (
                <VStack
                  align="stretch"
                  gap={{ base: 4, md: 6 }}
                  spacing={{ base: 4, md: 6 }}
                  px={{ base: 2, md: 0 }}
                >
                  {isCreateMode && (
                    <Flex justifyContent="flex-end" w="100%">
                      <Button
                        size="sm"
                        variant="subtle"
                        colorPalette="red"
                        onClick={handleClearParsed}
                      >
                        Clear All
                      </Button>
                    </Flex>
                  )}

                  <Accordion.Root
                    multiple
                    defaultValue={values.buyers?.length ? ["buyer-0"] : []}
                    gap="0"
                  >
                    {values.buyers?.map((buyer, buyerIndex) => {
                      const itemCount = buyer.suppliers?.reduce(
                        (s, sup) => s + (sup.items?.length ?? 0),
                        0
                      );
                      const matchedEmployee = buyer.employee_code
                        ? matchedEmployeeByCode[buyer.employee_code]
                        : null;
                      const employeeImageUrl =
                        matchedEmployee?.profile_img_url ?? null;

                      return (
                        <Accordion.Item
                          key={`buyer-${buyerIndex}`}
                          value={`buyer-${buyerIndex}`}
                          bg="gray.50"
                          borderRadius="lg"
                          borderWidth="1px"
                          borderColor="gray.200"
                          overflow="hidden"
                          mb={{ base: 4, md: 6 }}
                        >
                          <Accordion.ItemTrigger
                            _hover={{ bg: "gray.100" }}
                            px={{ base: 3, md: 5 }}
                            py={{ base: 3, md: 4 }}
                            transition="background 0.2s"
                          >
                            <Flex
                              alignItems="center"
                              justifyContent="space-between"
                              w="100%"
                              gap={{ base: 2, md: 4 }}
                              flexWrap="wrap"
                            >
                              <HStack
                                gap={{ base: 2, md: 4 }}
                                spacing={{ base: 2, md: 4 }}
                                minW={0}
                                flex={1}
                              >
                                <Box
                                  flexShrink={0}
                                  w={{ base: "8", md: "10" }}
                                  h={{ base: "8", md: "10" }}
                                  borderRadius="full"
                                  overflow="hidden"
                                  bg="white"
                                  borderWidth="1px"
                                  borderColor="gray.200"
                                  position="relative"
                                >
                                  {employeeImageUrl ? (
                                    <Image
                                      src={employeeImageUrl}
                                      alt=""
                                      fill
                                      style={{ objectFit: "cover" }}
                                      unoptimized
                                    />
                                  ) : (
                                    <Flex
                                      w="100%"
                                      h="100%"
                                      alignItems="center"
                                      justifyContent="center"
                                      color="brand.500"
                                    >
                                      <Icon
                                        as={FaUser}
                                        boxSize={{ base: 4, md: 5 }}
                                      />
                                    </Flex>
                                  )}
                                </Box>
                                <VStack
                                  align="start"
                                  gap="0"
                                  alignItems="flex-start"
                                  spacing="0"
                                >
                                  <Text
                                    fontSize={{ base: "sm", md: "md" }}
                                    fontWeight="semibold"
                                    color="gray.800"
                                    noOfLines={2}
                                  >
                                    {buyer.buyer_name || "—"}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {buyer.suppliers?.length ?? 0} supplier(s) ·{" "}
                                    {itemCount} item(s)
                                  </Text>
                                </VStack>
                              </HStack>
                              <HStack gap="2" spacing="2" flexShrink={0}>
                                {buyer.employee_code != null && (
                                  <Badge
                                    size="sm"
                                    colorPalette="green"
                                    variant="subtle"
                                  >
                                    {buyer.employee_code}
                                  </Badge>
                                )}
                                {buyer.employee_code == null &&
                                  buyer.buyer_name && (
                                    <Badge
                                      size="sm"
                                      colorPalette="orange"
                                      variant="subtle"
                                    >
                                      Not Mapped
                                    </Badge>
                                  )}
                                <Accordion.ItemIndicator>
                                  <Icon
                                    as={FaChevronDown}
                                    boxSize="4"
                                    color="gray.500"
                                  />
                                </Accordion.ItemIndicator>
                              </HStack>
                            </Flex>
                          </Accordion.ItemTrigger>
                          <Accordion.ItemContent
                            px={{ base: 3, md: 5 }}
                            pb={{ base: 4, md: 5 }}
                            pt="0"
                          >
                            <Accordion.Root multiple gap="0">
                              {buyer.suppliers?.map((supplier, supIndex) => {
                                const totalAmt = supplier.items?.reduce(
                                  (s, it) => s + (Number(it.total_amount) || 0),
                                  0
                                );
                                const totalQty = supplier.items?.reduce(
                                  (s, it) => s + (Number(it.qty) || 0),
                                  0
                                );
                                return (
                                  <Accordion.Item
                                    key={`sup-${buyerIndex}-${supIndex}`}
                                    value={`sup-${buyerIndex}-${supIndex}`}
                                    bg="white"
                                    borderRadius="md"
                                    borderWidth="1px"
                                    borderColor="gray.200"
                                    overflow="hidden"
                                    mb={{ base: 3, md: 4 }}
                                  >
                                    <Accordion.ItemTrigger
                                      _hover={{ bg: "gray.50" }}
                                      px={{ base: 3, md: 4 }}
                                      py={{ base: 2, md: 3 }}
                                    >
                                      <Flex
                                        alignItems="center"
                                        justifyContent="space-between"
                                        w="100%"
                                        flexWrap="wrap"
                                        gap="2"
                                      >
                                        <HStack
                                          gap="2"
                                          spacing="2"
                                          minW={0}
                                          flex={1}
                                        >
                                          <Icon
                                            as={FaBoxOpen}
                                            boxSize="4"
                                            color="gray.500"
                                          />
                                          <Text
                                            fontSize={{ base: "xs", md: "sm" }}
                                            fontWeight="medium"
                                            noOfLines={2}
                                          >
                                            {supplier.supplier_name || "—"}
                                          </Text>
                                          <Badge
                                            size="xs"
                                            colorPalette="gray"
                                            variant="outline"
                                          >
                                            {supplier.items?.length ?? 0} items
                                          </Badge>
                                        </HStack>
                                        <HStack gap="3" spacing="3">
                                          {!isViewMode &&
                                            supplier.master_id != null && (
                                              <Badge
                                                size="sm"
                                                colorPalette="green"
                                                variant="subtle"
                                              >
                                                Mapped
                                              </Badge>
                                            )}
                                          {!isViewMode &&
                                            supplier.master_id == null &&
                                            supplier.supplier_name && (
                                              <Badge
                                                size="sm"
                                                colorPalette="orange"
                                                variant="subtle"
                                              >
                                                Not Mapped
                                              </Badge>
                                            )}
                                          {isViewMode &&
                                            deliveredSupplierKeys.has(
                                              `${buyer.employee_code ?? ""}|${
                                                supplier.master_id ?? ""
                                              }`
                                            ) && (
                                              <Badge
                                                size="sm"
                                                colorPalette="blue"
                                                variant="subtle"
                                              >
                                                Returned
                                              </Badge>
                                            )}
                                          {(supplier.no_of_boxes == null ||
                                            String(
                                              supplier.no_of_boxes ?? ""
                                            ).trim() === "") && (
                                            <Badge
                                              size="sm"
                                              colorPalette="red"
                                              variant="subtle"
                                            >
                                              Not Filled
                                            </Badge>
                                          )}
                                          <Accordion.ItemIndicator>
                                            <Icon
                                              as={FaChevronDown}
                                              boxSize="3"
                                              color="gray.400"
                                            />
                                          </Accordion.ItemIndicator>
                                        </HStack>
                                      </Flex>
                                    </Accordion.ItemTrigger>
                                    <Accordion.ItemContent
                                      px={{ base: 3, md: 4 }}
                                      pb={{ base: 3, md: 4 }}
                                      pt="0"
                                    >
                                      <Flex
                                        gap={{ base: 4, md: 6 }}
                                        flexWrap="wrap"
                                        alignItems="flex-start"
                                        flexDirection={{
                                          base: "column",
                                          md: "row",
                                        }}
                                      >
                                        <CustomInput
                                          name={`buyers.${buyerIndex}.suppliers.${supIndex}.no_of_boxes`}
                                          label="No of Boxes"
                                          labelStyle={{
                                            fontSize: "xs",
                                            fontWeight: "medium",
                                          }}
                                          debounceMs={400}
                                          type="number"
                                          min={0}
                                          placeholder="0"
                                          readOnly={isViewMode}
                                          size="sm"
                                          width={{ base: "100%", md: "140px" }}
                                        />
                                        <Box flex="1" minW={0} w="100%">
                                          <HStack
                                            justify="space-between"
                                            mb="2"
                                            flexWrap="wrap"
                                            gap="1"
                                          >
                                            <Text
                                              fontSize="xs"
                                              fontWeight="medium"
                                              color="gray.600"
                                            >
                                              Items
                                            </Text>
                                            <Text
                                              fontSize="xs"
                                              color="gray.500"
                                            >
                                              Qty: {totalQty} ·{" "}
                                              <FormatNumber
                                                value={totalAmt}
                                                style="currency"
                                                currency="INR"
                                              />
                                            </Text>
                                          </HStack>
                                          <Box overflow="auto" w="100%">
                                            <ItemsGrid
                                              items={supplier.items}
                                              tableKey={`issue-entry-items-${buyerIndex}-${supIndex}`}
                                            />
                                          </Box>
                                        </Box>
                                      </Flex>
                                    </Accordion.ItemContent>
                                  </Accordion.Item>
                                );
                              })}
                            </Accordion.Root>
                          </Accordion.ItemContent>
                        </Accordion.Item>
                      );
                    })}
                  </Accordion.Root>

                  <Grid
                    templateColumns={{ base: "1fr", md: "1fr" }}
                    gap={{ base: 4, md: 6 }}
                    w="100%"
                  >
                    <CustomInput
                      name="driver_id"
                      label="Driver"
                      method="searchable-dropdown"
                      placeholder="Select driver"
                      options={(driverEmployees || []).map((e) => ({
                        value: e.employee_code,
                        label: e.employee_name
                          ? `${e.employee_name} (${e.employee_code})`
                          : e.employee_code,
                      }))}
                      viewOnly={isViewMode}
                    />
                    <CustomInput
                      name="receiving_branch_id"
                      label="Receiving Branch"
                      method="searchable-dropdown"
                      placeholder="Select branch"
                      options={branchOptions}
                      viewOnly={isViewMode}
                    />
                    <CustomInput
                      name="attachment"
                      label="Attachment"
                      method="file"
                      viewOnly={isViewMode}
                    />
                  </Grid>

                  {hasMissingMappings && !isViewMode && (
                    <Box
                      w="100%"
                      mt={2}
                      pt={4}
                      border="1px solid"
                      borderColor="red.200"
                      bg="red.50"
                      borderRadius="md"
                      px={4}
                      py={3}
                    >
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color="red.700"
                        mb={3}
                      >
                        Please fix the following:
                      </Text>
                      <VStack align="stretch" gap={3} spacing={0}>
                        {missingNoOfBoxes.length > 0 && (
                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              color="red.600"
                              mb={1}
                            >
                              No of Boxes required (employee, supplier, product
                              & outlet mapped)
                            </Text>
                            <VStack align="stretch" gap={1} spacing={0}>
                              {missingNoOfBoxes.map((row, i) => (
                                <Text key={i} fontSize="xs" color="red.700">
                                  {row.buyerName} → {row.supplierName}
                                </Text>
                              ))}
                            </VStack>
                          </Box>
                        )}
                        {missingEmployeeNames.length > 0 && (
                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              color="red.600"
                              mb={1}
                            >
                              Employee
                            </Text>
                            <Text fontSize="xs" color="red.700">
                              {missingEmployeeNames.join(", ")}
                            </Text>
                          </Box>
                        )}
                        {missingSupplierNames.length > 0 && (
                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              color="red.600"
                              mb={1}
                            >
                              Supplier
                            </Text>
                            <Text fontSize="xs" color="red.700">
                              {missingSupplierNames.join(", ")}
                            </Text>
                          </Box>
                        )}
                        {missingProductNames.length > 0 && (
                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              color="red.600"
                              mb={1}
                            >
                              Product
                            </Text>
                            <Text fontSize="xs" color="red.700">
                              {missingProductNames.join(", ")}
                            </Text>
                          </Box>
                        )}
                        {missingOutletNames.length > 0 && (
                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              color="red.600"
                              mb={1}
                            >
                              Outlet
                            </Text>
                            <Text fontSize="xs" color="red.700">
                              {missingOutletNames.join(", ")}
                            </Text>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  )}

                  <Flex
                    gap="4"
                    justifyContent="flex-end"
                    pt="2"
                    flexDirection={{ base: "column", md: "row" }}
                    w="100%"
                  >
                    <Link href="/purchase-return/issue-entry">
                      <Button
                        variant="subtle"
                        colorPalette="gray"
                        w={{ base: "100%", md: "auto" }}
                      >
                        Back
                      </Button>
                    </Link>
                    {!isViewMode && (
                      <Button
                        colorPalette="brand"
                        onClick={() => handleSubmit()}
                        w={{ base: "100%", md: "auto" }}
                      >
                        {isCreateMode ? "Create" : "Update"}
                      </Button>
                    )}
                  </Flex>
                </VStack>
              );
            }}
          </Formik>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}
