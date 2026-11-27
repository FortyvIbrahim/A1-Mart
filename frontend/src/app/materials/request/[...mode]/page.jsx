"use client";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Button, Flex, Table, Text } from "@chakra-ui/react";
import { FieldArray, Formik, useFormikContext } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useBranches from "@/api/customHooks/useBranches";
import useMaterialsCategory from "@/api/customHooks/useMaterialsCategory";
import useMaterials from "@/api/customHooks/useMaterials";
import toast from "react-hot-toast";
import {
  createMaterialRequests,
  updateMaterialRequest,
} from "@/api/helpers/material_requests";
import useMaterialRequestById from "@/api/customHooks/useMaterialRequestById";

const VALIDATION_SCHEMA = Yup.object({
  branch_id: Yup.string().required("Required"),
  items: Yup.array()
    .of(
      Yup.object({
        material_id: Yup.number().required(),
        quantity: Yup.mixed(), // optional
        remark: Yup.string(),
      })
    )
    .min(1, "At least one material is required")
    .test(
      "at-least-one-quantity",
      "At least one item must have a quantity filled",
      function (items) {
        if (!items || items.length === 0) return false;
        return items.some(
          (item) =>
            item.quantity !== "" &&
            item.quantity !== null &&
            item.quantity !== undefined &&
            Number(item.quantity) > 0
        );
      }
    ),
});

const INITIAL_VALUES = {
  branch_id: "",
  category_id: "",
  items: [],
};

export default function MaterialsRequestForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const materialId = mode[1];
  const { requestData, refetch } = useMaterialRequestById(materialId);
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const isApproved = requestData?.is_approved ?? false;

  const { branches: branchesUnfiltered } = useBranches();
  const { materialsCategory: materialsCategoryUnfiltered } =
    useMaterialsCategory();
  const { materials: materialsUnfiltered } = useMaterials();

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  const branches = branchesUnfiltered.filter((branch) => branch.is_active);
  const materialsCategory = materialsCategoryUnfiltered.filter(
    (category) => category.is_active || !isCreateMode
  );
  const materials = materialsUnfiltered.filter(
    (material) => material.is_active || !isCreateMode
  );

  useEffect(() => {
    if ((isEditMode || isViewMode) && requestData) {
      const firstCategoryId =
        requestData.items &&
        requestData.items.length > 0 &&
        requestData.items[0].material &&
        requestData.items[0].material.material_category_id
          ? requestData.items[0].material.material_category_id
          : "";
      setInitialValues({
        branch_id: requestData.outlet_id,
        category_id: firstCategoryId,
        items: (requestData.items || []).map((item) => ({
          material_id: item.material_id,
          quantity: item.quantity,
          remark: item.remark,
          name: item.material?.name || "",
          live_stock: item.material?.live_stock ?? null,
        })),
      });
    }
  }, [isEditMode, isViewMode, requestData]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Material Request";
    }

    if (isEditMode) {
      return "Edit Material Request";
    }

    // return `EB Consumption : #${ebConsumption?.id ?? ""}`;
    return `Material Request`;
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    const filteredItems = values.items
      .filter((item) => item.quantity && Number(item.quantity) > 0)
      .map((item) => ({
        material_id: item.material_id,
        quantity: Number(item.quantity),
        remark: item.remark,
      }));
    if (filteredItems.length === 0) {
      toast.error("Please enter quantity for at least one material.");
      setSubmitting(false);
      return;
    }

    const postData = { items: filteredItems, outlet_id: values.branch_id };

    try {
      const promise = isEditMode
        ? updateMaterialRequest(materialId, postData)
        : createMaterialRequests(postData);

      toast.promise(promise, {
        loading: isEditMode ? "Updating request..." : "Submitting request...",
        success: (response) => {
          if (isEditMode) {
            if (response.success || response.code === 200) {
              router.push("/materials/request");
              return "Material request updated!";
            }
            throw new Error("Error updating request!");
          } else {
            if (response.material_request_id) {
              router.push("/materials/request");
              return "Material request submitted!";
            }
            throw new Error("Error submitting request!");
          }
        },
        error: (err) => {
          return isEditMode
            ? "Error updating request!"
            : "Error submitting request!";
        },
      });
    } catch (err) {
      console.error(err);
      toast.error(
        isEditMode ? "Error updating request!" : "Error submitting request!"
      );
      setSubmitting(false);
    }
  };

  function SyncItemsWithCategory({ allMaterials }) {
    const { values, setFieldValue } = useFormikContext();
    useEffect(() => {
      if (isViewMode || isEditMode) return;

      let filtered;
      if (!values.category_id) {
        filtered = allMaterials.filter(
          (mat) =>
            !mat.material_category_id || mat.material_category_id === null
        );
      } else {
        filtered = allMaterials.filter(
          (mat) =>
            String(mat.material_category_id) === String(values.category_id)
        );
      }

      setFieldValue(
        "items",
        filtered.map((mat) => ({
          material_id: mat.material_id,
          quantity: "",
          remark: "",
          name: mat.name,
          live_stock: mat.live_stock,
        }))
      );
      // eslint-disable-next-line
    }, [values.category_id, allMaterials]);

    return null;
  }

  const handleApproveUnapprove = async (values) => {
    try {
      const filteredItems = values.items.map((item) => ({
        material_id: item.material_id,
        quantity: Number(item.quantity),
        remark: item.remark,
      }));

      const response = await updateMaterialRequest(materialId, {
        items: filteredItems,
        is_approved: isApproved ? 0 : 1,
      });
      if (response.success) {
        refetch();
        toast.success(`Marked as ${isApproved ? "pending" : "approved"}`);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error updating");
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_materials_request";
    }

    return "view_materials_request";
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
          {({ handleSubmit, values, errors }) => {
            return (
              <Flex flexDirection="column" gap="22px">
                {mode !== "view" && (
                  <SyncItemsWithCategory allMaterials={materials} />
                )}

                <Flex justifyContent="space-between">
                  <CustomInput
                    label="Branch"
                    name="branch_id"
                    method="dropdown"
                    placeholder="Select Branch"
                    options={branches.map((item) => ({
                      label: item.branch_name,
                      value: item.branch_id,
                    }))}
                    viewOnly={isViewMode}
                  />

                  {/* {isViewMode && (
                    <Flex justifyContent="flex-end">
                      <Button
                        variant={isApproved ? "subtle" : "solid"}
                        onClick={() => handleApproveUnapprove(values)}
                      >{`Mark as ${
                        isApproved ? "Pending" : "Approved"
                      }`}</Button>
                    </Flex>
                  )} */}
                </Flex>

                <CustomInput
                  label="Materials Category"
                  name="category_id"
                  method="dropdown"
                  placeholder="Select Materials Category"
                  options={materialsCategory.map((item) => ({
                    label: item.category_name,
                    value: item.material_category_id,
                  }))}
                  viewOnly={isViewMode}
                />

                <CustomContainer pageForm headerBand title="Items" size="sm" color="secondary">
                  {values.items && values.items.length > 0 ? (
                    <FieldArray name="items">
                      {(arrayHelpers) => (
                        <div>
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
                            mt="22px"
                          >
                            <Table.Header>
                              <Table.Row bg="#FFF5ED">
                                <Table.ColumnHeader bg="#FFF5ED">
                                  Material Name
                                </Table.ColumnHeader>
                                <Table.ColumnHeader bg="#FFF5ED">
                                  Available Stock
                                </Table.ColumnHeader>
                                <Table.ColumnHeader bg="#FFF5ED">
                                  Quantity
                                </Table.ColumnHeader>
                                <Table.ColumnHeader bg="#FFF5ED">
                                  Remark
                                </Table.ColumnHeader>
                              </Table.Row>
                            </Table.Header>
                            <Table.Body>
                              {values.items.map((item, idx) => (
                                <Table.Row key={`${item.material_id}-${idx}`}>
                                  <Table.Cell>
                                    <CustomInput
                                      name={`items.${idx}.name`}
                                      viewOnly={true}
                                    />
                                  </Table.Cell>
                                  <Table.Cell>
                                    <CustomInput
                                      name={`items.${idx}.live_stock`}
                                      viewOnly={true}
                                    />
                                  </Table.Cell>
                                  <Table.Cell>
                                    <CustomInput
                                      name={`items.${idx}.quantity`}
                                      type="number"
                                      min={1}
                                      value={item.quantity}
                                      placeholder="Quantity"
                                      viewOnly={isViewMode}
                                    />
                                  </Table.Cell>
                                  <Table.Cell>
                                    <CustomInput
                                      name={`items.${idx}.remark`}
                                      value={item.remark}
                                      placeholder="Remark"
                                      viewOnly={isViewMode}
                                    />
                                  </Table.Cell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table.Root>
                        </div>
                      )}
                    </FieldArray>
                  ) : // <EmptyData />
                  null}
                </CustomContainer>

                {!isViewMode &&
                  errors.items &&
                  typeof errors.items === "string" && (
                    <Flex justifyContent="flex-end">
                      <Text color="red" fontSize="sm">
                        {errors.items}
                      </Text>
                    </Flex>
                  )}

                <Flex gap="22px" justifyContent="flex-end">
                  <Link href="/materials/request">
                    <Button variant="subtle">Back</Button>
                  </Link>
                  {(isCreateMode || isEditMode) && (
                    <Button onClick={handleSubmit}>
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
