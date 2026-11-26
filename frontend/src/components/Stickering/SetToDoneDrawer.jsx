"use client";

import CustomInput from "@/components/CustomInput";
import { updateStickeringEntry } from "@/api/helpers/stickering";
import {
  Button,
  CloseButton,
  Drawer,
  Flex,
  Grid,
  Portal,
  Text,
} from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import CustomContainer from "../CustomContainer";
import { useMemo, useState } from "react";

const VALIDATION_SCHEMA = Yup.object().shape({
  packing: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be ≥ 0")
    .nullable(),
  loose: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be ≥ 0")
    .nullable(),
  pur_ret: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be ≥ 0")
    .nullable(),
  wastage: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be ≥ 0")
    .nullable(),
});

const INITIAL_VALUES = {
  packing: null,
  loose: null,
  pur_ret: null,
  wastage: null,
};

export default function SetToDoneDrawer({
  isOpen,
  setIsOpen,
  selectedRecord,
  onSuccess,
}) {
  const [calculatedPacking, setCalculatedPacking] = useState(null);
  const handleSubmit = async (values) => {
    if (!selectedRecord) return;

    const packing =
      values.packing !== null &&
      values.packing !== undefined &&
      values.packing !== ""
        ? parseInt(values.packing)
        : null;
    const loose =
      values.loose !== null && values.loose !== undefined && values.loose !== ""
        ? parseInt(values.loose)
        : null;
    const pur_ret =
      values.pur_ret !== null &&
      values.pur_ret !== undefined &&
      values.pur_ret !== ""
        ? parseInt(values.pur_ret)
        : null;
    const wastage =
      values.wastage !== null &&
      values.wastage !== undefined &&
      values.wastage !== ""
        ? parseInt(values.wastage)
        : null;

    const storeUom = selectedRecord?.store_uom ?? null;

    if (storeUom) {
      const totalPacked = packing * storeUom;
      const totalQty = totalPacked + loose + pur_ret + wastage;
      if (totalQty !== selectedRecord.qty) {
        toast.error(
          `Total quantity does not match, check the quantities (${
            selectedRecord.qty - totalQty
          } is missing)`
        );
        return;
      }
    }

    const updateData = {
      status: "done",
      packing,
      loose,
      pur_ret,
      wastage,
    };

    toast.promise(
      updateStickeringEntry(selectedRecord.stickering_id, updateData),
      {
        loading: "Updating status to done...",
        success: (response) => {
          if (response.code === 200) {
            setIsOpen(false);
            if (onSuccess) {
              onSuccess();
            }
            return "Status updated to done successfully!";
          } else {
            throw new Error(
              response.message || response.msg || "Failed to update status"
            );
          }
        },
        error: (err) => {
          console.error(err);
          return err.message || err.msg || "Error updating status!";
        },
      }
    );
  };

  const getCalculatedInitialValues = () => {
    if (!selectedRecord) {
      return INITIAL_VALUES;
    }

    if (
      selectedRecord &&
      selectedRecord.packing === null &&
      selectedRecord.loose === null &&
      selectedRecord.pur_ret === null &&
      selectedRecord.wastage === null &&
      selectedRecord?.store_uom
    ) {
      const suom = selectedRecord?.store_uom ?? null;
      const packing = selectedRecord?.qty / suom;
      setCalculatedPacking(packing);

      return {
        packing: packing,
        loose: selectedRecord.loose ?? null,
        pur_ret: selectedRecord.pur_ret ?? null,
        wastage: selectedRecord.wastage ?? null,
      };
    }

    setCalculatedPacking(selectedRecord.packing ?? null);
    return {
      packing: selectedRecord.packing ?? null,
      loose: selectedRecord.loose ?? null,
      pur_ret: selectedRecord.pur_ret ?? null,
      wastage: selectedRecord.wastage ?? null,
    };
  };

  const initialValues = useMemo(
    () => getCalculatedInitialValues(),
    [selectedRecord]
  );

  const packingLabel = useMemo(() => {
    return `Store UOM Packing ${
      calculatedPacking
        ? `(${calculatedPacking} x ${selectedRecord?.store_uom} = ${
            calculatedPacking * selectedRecord?.store_uom
          })`
        : ""
    }`;
  }, [calculatedPacking, selectedRecord?.store_uom]);

  const drawerContent = ({ values }) => (
    <Grid templateColumns="repeat(1, 1fr)" gap="22px">
      <CustomContainer size="sm">
        <Flex flexDirection="column" gap="12px">
          <Flex alignItems="center" gap="12px">
            <Text fontWeight="medium" fontSize="sm" color="brand.500">
              Total Quantity :
            </Text>
            <Text fontWeight="medium" fontSize="lg" color="brand.800">
              {selectedRecord?.qty || "-"}
            </Text>
          </Flex>

          <Flex alignItems="center" gap="12px">
            <Text fontWeight="medium" fontSize="sm" color="brand.500">
              Store UOM :
            </Text>
            <Text fontWeight="medium" fontSize="lg" color="brand.800">
              {selectedRecord?.store_uom || "-"}
            </Text>
          </Flex>
        </Flex>
      </CustomContainer>
      <CustomInput
        label={packingLabel}
        name="packing"
        type="number"
        placeholder="Enter packing quantity"
        min={0}
        onChange={(e) => {
          setCalculatedPacking(e.target.value);
        }}
      />
      <CustomInput
        label="Loose"
        name="loose"
        type="number"
        placeholder="Enter loose quantity"
        min={0}
      />
      <CustomInput
        label="Pur Ret"
        name="pur_ret"
        type="number"
        placeholder="Enter purchase return quantity"
        min={0}
      />
      <CustomInput
        label="Wastage"
        name="wastage"
        type="number"
        placeholder="Enter wastage quantity"
        min={0}
      />
    </Grid>
  );

  if (!selectedRecord) return null;

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={VALIDATION_SCHEMA}
      onSubmit={handleSubmit}
      enableReinitialize
      key={selectedRecord?.stickering_id}
    >
      {({ handleSubmit, values }) => (
        <Drawer.Root
          size="md"
          open={isOpen}
          onOpenChange={(e) => setIsOpen(e.open)}
        >
          <Portal>
            <Drawer.Backdrop />
            <Drawer.Positioner padding="4">
              <Drawer.Content rounded="md">
                <Drawer.Header>
                  <Drawer.Title color="brand600">
                    {`Set to Done - ${selectedRecord.product_name || "Item"}`}
                  </Drawer.Title>
                </Drawer.Header>
                <Drawer.Body>{drawerContent({ values })}</Drawer.Body>
                <Drawer.Footer p="16px">
                  <Flex gap="22px" justifyContent="flex-end">
                    <Button variant="subtle" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit}>Update Status</Button>
                  </Flex>
                </Drawer.Footer>
                <Drawer.CloseTrigger asChild>
                  <CloseButton size="sm" />
                </Drawer.CloseTrigger>
              </Drawer.Content>
            </Drawer.Positioner>
          </Portal>
        </Drawer.Root>
      )}
    </Formik>
  );
}
