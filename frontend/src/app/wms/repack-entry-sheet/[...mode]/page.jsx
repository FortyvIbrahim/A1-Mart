"use client";

import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Button, Flex, Text, Box } from "@chakra-ui/react";
import { FieldArray, Formik } from "formik";
import * as Yup from "yup";
import { use, useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateStickeringEntry } from "@/api/helpers/stickering";
import useEmployee from "@/api/customHooks/useEmployee";
import useStickeringById from "@/api/customHooks/useStickeringById";
import usePurchaseAcknowledgments from "@/api/customHooks/usePurchaseAcknowledgments";
import { capitalizeWords, capitalizeWordsLatest } from "@/utils/string";
import {
  PurchaseAckRepackEntryRenderer,
  createPurchaseAcknowledgmentOptions,
} from "@/components/PurchaseAcknowledgment";
import useStickeringByPurchaseAck from "@/api/customHooks/useStickeringByPurchaseAck";
import { SKU_TYPES } from "@/constants/sku_mode";
import AgGrid from "@/components/AgGrid";

const VALIDATION_SCHEMA = Yup.object({
  purchase_acknowledgment_id: Yup.number()
    .transform((value, originalValue) => {
      // Handle empty string or null from dropdown
      if (
        originalValue === "" ||
        originalValue === null ||
        originalValue === undefined
      ) {
        return undefined;
      }
      return Number(originalValue);
    })
    .required("Required")
    .integer("Must be an integer")
    .positive("Must be positive"),
  supervisor_id: Yup.string().required("Required"),
  items: Yup.array().min(1, "At least one item is required!"),
});

const INITIAL_VALUES = {
  items: [],
  purchase_acknowledgment_id: "",
  supervisor_id: "",
};

export default function StickeringForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const purchaseAckId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  const { employees } = useEmployee({ allBranches: true });
  const { purchaseAcknowledgments } = usePurchaseAcknowledgments();

  const [selectedPurchaseAckId, setSelectedPurchaseAckId] = useState(null);
  const { stickering: selectedStickeringEntries } = useStickeringByPurchaseAck(
    selectedPurchaseAckId
  );
  const setFieldValueRef = useRef(null);

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if (setFieldValueRef.current) {
      if (selectedStickeringEntries && selectedStickeringEntries.length > 0) {
        const itemsWithSupervisor = selectedStickeringEntries.filter(
          (item) =>
            item.repack_supervisor_id !== null &&
            item.repack_supervisor_id !== undefined &&
            item.repack_supervisor_id !== ""
        );

        if (itemsWithSupervisor.length > 0) {
          setFieldValueRef.current(
            "supervisor_id",
            itemsWithSupervisor[0].repack_supervisor_id
          );
        }

        const formattedItems = selectedStickeringEntries.map((item) => {
          return {
            stickering_id: item.stickering_id,
            product_id: item.product_id,
            product_name: item.product_name || "",
            qty: item.qty,
            material_type: item.repln_mode || "",
            repack_supervisor_name: item.repack_supervisor_name || "",
            status: item.status || "open",
          };
        });
        setFieldValueRef.current("items", formattedItems);
      } else {
        setFieldValueRef.current("items", []);
        setFieldValueRef.current("supervisor_id", "");
      }

      if (purchaseAckId) {
        setFieldValueRef.current("purchase_acknowledgment_id", purchaseAckId);
      }
    }
  }, [selectedStickeringEntries, setFieldValueRef]);

  useEffect(() => {
    if (purchaseAckId && (isEditMode || isViewMode)) {
      setSelectedPurchaseAckId(parseInt(purchaseAckId));
    }
  }, [purchaseAckId, isEditMode, isViewMode]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Create Repack Entry Sheet";
    }
    if (isEditMode) {
      return "Edit Repack Entry Sheet";
    }
    return `Repack Entry Sheet : #${purchaseAckId ?? ""}`;
  };

  const handleSubmit = async (values) => {
    const toastId = toast.loading(
      isCreateMode
        ? "Creating repack sheet entries..."
        : "Updating repack sheet entries..."
    );

    try {
      for (const item of values.items) {
        await updateStickeringEntry(item.stickering_id, {
          repack_supervisor_id: values.supervisor_id,
        });
      }

      toast.success(
        isCreateMode
          ? "Repack sheet entries created successfully!"
          : "Repack sheet entries updated successfully!",
        {
          id: toastId,
        }
      );
      router.push(`/wms/repack-entry-sheet`);
    } catch (err) {
      console.error(err);
      toast.error("Error submitting job sheet entry!", {
        id: toastId,
      });
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_stickering";
    }
    return "view_stickering";
  };

  const supervisorOptions = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    return (
      employees
        // .filter(
        //   (emp) =>
        //     !emp.terminated && emp.designation_id === SUPERVISOR_DESIGNATION_ID
        // )
        .map((emp) => ({
          value: emp.employee_code,
          label: `${emp.employee_code} - ${capitalizeWords(emp.employee_name)}`,
        }))
    );
  }, [employees]);

  const purchaseAcknowledgmentOptions = useMemo(() => {
    return createPurchaseAcknowledgmentOptions(
      purchaseAcknowledgments.filter((item) => {
        if (isEditMode || isViewMode) {
          return true;
        }

        const totalItems =
          item.status_counts.open +
          item.status_counts.in_progress +
          item.status_counts.cancelled +
          item.status_counts.done;

        const jobSheetCreated =
          item.status_counts.open +
            item.status_counts.in_progress +
            item.status_counts.cancelled +
            item.status_counts.done !==
          0;
        const repackSheetCreated =
          item.repack_supervisor_entry_count >= totalItems;

        if (item.status_counts?.done <= 0 || repackSheetCreated) {
          return false;
        }

        return (
          (isCreateMode &&
            item.purchase_entry_id !== null &&
            jobSheetCreated &&
            item.is_job_entry_needed) ||
          isEditMode ||
          isViewMode
        );
      })
    );
  }, [purchaseAcknowledgments]);

  const colDefs = [
    {
      field: "product_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "product_name",
      headerName: "Product Name",
      type: "capitalized",
    },
    {
      field: "repack_supervisor_name",
      headerName: "Repack Supervisor Name",
      type: "capitalized",
    },
    {
      field: "qty",
      headerName: "Quantity",
      type: "number",
    },
    {
      field: "material_type",
      headerName: "SKU Type",
      type: "badge-column",
      valueGetter: (props) => {
        const material_type = props.data.material_type;
        const SKU_TYPE = SKU_TYPES[material_type] || SKU_TYPES.null;
        return {
          colorScheme: SKU_TYPE.colorPalette,
          label: SKU_TYPE.label,
        };
      },
    },
    {
      field: "status",
      headerName: "Job Work Status",
      type: "badge-column",
      valueGetter: (props) => {
        const status = props.data.status;
        const STATUS_MAP = {
          open: "red",
          in_progress: "red",
          cancelled: "red",
          done: "green",
        };
        return {
          colorScheme: STATUS_MAP[status],
          label: capitalizeWordsLatest(status.replaceAll("_", " ")),
        };
      },
    },
    {
      field: "repack_supervisor_name",
      headerName: "Repack Status",
      type: "badge-column",
      valueGetter: (props) => {
        const isSet =
          props.data.repack_supervisor_name !== null &&
          props.data.repack_supervisor_name !== undefined &&
          props.data.repack_supervisor_name !== "";

        return {
          colorScheme: isSet ? "green" : "red",
          label: isSet ? "Supervisor Set" : "Not Set",
        };
      },
    },
  ];

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, values, setFieldValue }) => {
            // Store setFieldValue in ref for use outside render
            setFieldValueRef.current = setFieldValue;

            return (
              <Flex flexDirection="column" gap="22px">
                <Box>
                  <CustomInput
                    label="Purchase Acknowledgment"
                    placeholder="Select purchase acknowledgment..."
                    name="purchase_acknowledgment_id"
                    method="searchable-dropdown"
                    options={purchaseAcknowledgmentOptions}
                    customRender={PurchaseAckRepackEntryRenderer}
                    isRequired
                    viewOnly={isViewMode || isEditMode}
                    onChange={(purchase_acknowledgment_id) => {
                      if (purchase_acknowledgment_id) {
                        setSelectedPurchaseAckId(
                          parseInt(purchase_acknowledgment_id)
                        );
                      } else {
                        setSelectedPurchaseAckId(null);
                      }
                    }}
                  />
                </Box>

                <Box>
                  <CustomInput
                    label="Supervisor"
                    placeholder="Click here to select supervisor..."
                    name="supervisor_id"
                    method="searchable-dropdown"
                    options={supervisorOptions}
                    viewOnly={isViewMode}
                  />
                </Box>

                {/* Items Table */}
                {values.items && values.items.length > 0 && (
                  <CustomContainer pageForm title="Items" size="sm" color="secondary">
                    <FieldArray name="items">
                      {(arrayHelpers) => (
                        <AgGrid
                          columnDefs={colDefs}
                          rowData={values.items}
                          tableKey="repack-entry-sheet-items"
                        />
                      )}
                    </FieldArray>
                  </CustomContainer>
                )}

                <Flex gap="22px" justifyContent="flex-end">
                  <Button
                    variant="subtle"
                    onClick={() => {
                      router.back();
                    }}
                  >
                    Back
                  </Button>
                  {(isCreateMode || isEditMode) &&
                    values.items &&
                    values.items.length > 0 && (
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
