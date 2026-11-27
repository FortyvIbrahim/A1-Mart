"use client";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Box, Button, Flex, Grid, IconButton, Table, Text } from "@chakra-ui/react";
import { FieldArray, Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import useMasterList from "@/api/customHooks/useMasterList";
import { capitalizeWords } from "@/utils/string";
import useMaterials from "@/api/customHooks/useMaterials";
import {
  createStockAddition,
  updateStockAddition,
} from "@/api/helpers/stock_addition";
import moment from "moment";
import useStockAdditionById from "@/api/customHooks/useStockAdditionById";

const VALIDATION_SCHEMA = Yup.object({
  invoice_number: Yup.string().required("Required"),
  invoice_date: Yup.string().required("Required"),
  supplier_id: Yup.string().required("Required"),
  stock_addition: Yup.array().of(
    Yup.object().shape({
      product_id: Yup.string().required("Required"),
      quantity: Yup.number().required("Required"),
      remark: Yup.string().optional(),
    })
  ),
});

const INITIAL_VALUES = {
  invoice_number: "",
  invoice_date: "",
  supplier_id: null,
  stock_addition: [
    {
      product_id: "",
      quantity: "",
      remark: "",
    },
  ],
};

export default function MaterialsForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const stockAdditionId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const { stockAddition } = useStockAdditionById(stockAdditionId);
  const { materials } = useMaterials();
  const materialsOptions = materials.map((material) => ({
    value: material.material_id,
    label: material.name,
  }));

  const { masterList } = useMasterList();
  const suppliers = masterList
    .filter((sup) => sup.person_type === 1 && sup.status === 1)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({ ...item, name: capitalizeWords(item.name) }));

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if ((isEditMode || isViewMode) && stockAddition) {
      setInitialValues({
        invoice_number: stockAddition.invoice_number,
        invoice_date: stockAddition.invoice_date,
        supplier_id: stockAddition.supplier_id,
        stock_addition: stockAddition.items?.map((item) => ({
          product_id: item.material_id,
          quantity: item.quantity,
          remark: item.remark,
        })),
      });
    }
  }, [isEditMode, isViewMode, stockAddition]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Stock Addition";
    }

    if (isEditMode) {
      return "Edit Stock Addition";
    }

    return `Stock Addition : #${stockAddition?.stock_addition_id ?? ""}`;
  };

  const handleSubmit = async (values) => {
    try {
      const data = {
        invoice_number: values.invoice_number,
        invoice_date: moment(values.invoice_date).format("YYYY-MM-DD"),
        supplier_id: values.supplier_id,
        items: values.stock_addition.map((item) => ({
          material_id: item.product_id,
          quantity: item.quantity,
          remark: item.remark,
        })),
      };

      const promise = isEditMode
        ? updateStockAddition(stockAdditionId, data)
        : createStockAddition(data);

      toast.promise(promise, {
        loading: isEditMode
          ? "Updating stock addition..."
          : "Adding new stock addition...",
        success: (response) => {
          if (response.stock_addition_id || response.success) {
            router.push("/materials/stock-addition");
            return isEditMode
              ? "Stock addition Updated!"
              : "Stock addition Added!";
          } else {
            throw new Error(response.message);
          }
        },
        error: (err) => {
          console.error(err);
          return isEditMode
            ? "Error updating stock addition!"
            : "Error adding stock addition!";
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error adding stock addition!");
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_stock_addition";
    }

    return "view_stock_addition";
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm headerBand title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, values }) => {
            return (
              <Flex flexDirection="column" gap="20px">
                <Box
                  bg="white"
                  borderWidth="1px"
                  borderColor="border"
                  borderRadius="12px"
                  p={{ base: "16px", md: "20px" }}
                >
                  <Grid
                    templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
                    gap="20px"
                  >
                    <CustomInput
                      label="Invoice Number"
                      name="invoice_number"
                      type="text"
                      placeholder="Enter invoice number"
                      viewOnly={isViewMode}
                    />
                    <CustomInput
                      label="Invoice Date"
                      name="invoice_date"
                      type="date"
                      method="date-picker"
                      placeholder="Select invoice date"
                      viewOnly={isViewMode}
                    />
                    <CustomInput
                      label="Supplier"
                      name="supplier_id"
                      placeholder="Select supplier"
                      method="searchable-dropdown"
                      options={suppliers.map((sup) => ({
                        label: sup.name,
                        value: sup.master_id,
                      }))}
                      viewOnly={isViewMode}
                    />
                  </Grid>
                </Box>

                <Flex direction="column" gap="12px">
                  <Text fontSize="15px" lineHeight="20px" fontWeight="600" color="fg">
                    Items
                  </Text>
                  <Box
                    bg="white"
                    borderWidth="1px"
                    borderColor="border"
                    borderRadius="12px"
                    overflow="hidden"
                  >
                    {values.stock_addition && values.stock_addition.length > 0 ? (
                      <FieldArray name="stock_addition">
                        {(arrayHelpers) => (
                          <Box>
                            <Table.Root
                              css={{
                                "& thead th": {
                                  bg: "#FFF5ED",
                                  color: "#637188",
                                  fontWeight: "600",
                                  fontSize: "12px",
                                  borderBottomColor: "#F1E3D9",
                                },
                                "& tbody tr:nth-of-type(odd) td": {
                                  bg: "#FFFFFF",
                                },
                                "& tbody tr:nth-of-type(even) td": {
                                  bg: "#FFF5ED",
                                },
                                "& tbody td": {
                                  borderBottomColor: "#F1E3D9",
                                },
                              }}
                            >
                              <Table.Header>
                                <Table.Row bg="#FFF5ED">
                                  <Table.ColumnHeader bg="#FFF5ED">
                                    Material
                                  </Table.ColumnHeader>
                                  <Table.ColumnHeader bg="#FFF5ED" textAlign="center">
                                    Quantity
                                  </Table.ColumnHeader>
                                  <Table.ColumnHeader bg="#FFF5ED" textAlign="center">
                                    Remark
                                  </Table.ColumnHeader>
                                  {!isViewMode && (
                                    <Table.ColumnHeader bg="#FFF5ED" textAlign="center" w="64px" />
                                  )}
                                </Table.Row>
                              </Table.Header>
                              <Table.Body>
                                {values.stock_addition.map((item, idx) => (
                                  <Table.Row key={`${item.material_id}-${idx}`}>
                                    <Table.Cell>
                                      <CustomInput
                                        name={`stock_addition.${idx}.product_id`}
                                        options={materialsOptions}
                                        method="searchable-dropdown"
                                        placeholder="Select Material"
                                        viewOnly={isViewMode}
                                      />
                                    </Table.Cell>
                                    <Table.Cell textAlign="center">
                                      <Flex justify="center">
                                        <CustomInput
                                          name={`stock_addition.${idx}.quantity`}
                                          type="number"
                                          min={1}
                                          value={item.quantity}
                                          placeholder="Quantity"
                                          viewOnly={isViewMode}
                                        />
                                      </Flex>
                                    </Table.Cell>
                                    <Table.Cell textAlign="center">
                                      <Flex justify="center">
                                        <CustomInput
                                          name={`stock_addition.${idx}.remark`}
                                          value={item.remark}
                                          placeholder="Remark"
                                          viewOnly={isViewMode}
                                        />
                                      </Flex>
                                    </Table.Cell>
                                    {!isViewMode && (
                                      <Table.Cell textAlign="center">
                                        {values.stock_addition.length > 1 && (
                                          <IconButton
                                            colorPalette="red"
                                            variant="ghost"
                                            size="sm"
                                            title="Remove"
                                            onClick={() => arrayHelpers.remove(idx)}
                                          >
                                            <i className="fa fa-trash" />
                                          </IconButton>
                                        )}
                                      </Table.Cell>
                                    )}
                                  </Table.Row>
                                ))}
                              </Table.Body>
                            </Table.Root>

                            {(isCreateMode || isEditMode) && (
                              <Flex p="14px" justifyContent="flex-end">
                                <Button
                                  bg="#F47721"
                                  color="white"
                                  _hover={{ bg: "#E06612" }}
                                  onClick={() =>
                                    arrayHelpers.push({
                                      product_id: "",
                                      quantity: "",
                                      remark: "",
                                    })
                                  }
                                >
                                  Add Row
                                </Button>
                              </Flex>
                            )}
                          </Box>
                        )}
                      </FieldArray>
                    ) : null}
                  </Box>
                </Flex>

                <Flex gap="12px" justifyContent="flex-end">
                  <Link href="/materials/stock-addition">
                    <Button variant="subtle">Back</Button>
                  </Link>
                  {(isCreateMode || isEditMode) && (
                    <Button
                      bg="#F47721"
                      color="white"
                      _hover={{ bg: "#E06612" }}
                      onClick={handleSubmit}
                    >
                      {isCreateMode ? "Create" : "Update"}
                    </Button>
                  )}
                </Flex>
              </Flex>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}
