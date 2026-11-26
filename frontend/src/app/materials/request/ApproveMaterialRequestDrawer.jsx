"use client";

import React, { useEffect, useState } from "react";
import CustomDrawer from "@/components/CustomDrawer";
import { getMaterialRequestById } from "@/api/helpers/material_requests";
import { Box, Button, Checkbox, Flex, Input, Text } from "@chakra-ui/react";
import CustomInput from "@/components/CustomInput";

function buildRows(requestData) {
  if (!requestData?.items?.length) return [];
  return requestData.items.map((item) => {
    const requestedQty = Number(item.quantity) || 0;
    const availableStock = Number(item.material?.live_stock) || 0;
    const prefilledQty =
      requestedQty > availableStock ? availableStock : requestedQty;
    return {
      material_id: item.material_id,
      material_name: item.material?.name ?? "-",
      available_stock: availableStock,
      requested_qty: requestedQty,
      approved_qty: prefilledQty,
      create_as_new: false,
      remark: item.remark ?? "",
    };
  });
}

function ApproveMaterialRequestDrawer({
  isOpen,
  onClose,
  requestId,
  onConfirm,
}) {
  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !requestId) {
      setRequestData(null);
      setRows([]);
      return;
    }
    setLoading(true);
    getMaterialRequestById(requestId)
      .then((res) => {
        if (res.status === 200 && res.data) {
          setRequestData(res.data);
          setRows(buildRows(res.data));
        } else {
          setRequestData(null);
          setRows([]);
        }
      })
      .catch(() => {
        setRequestData(null);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, requestId]);

  const setRowField = (idx, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const content = (
    <Box width="100%" overflowY="auto" maxH="calc(100vh - 220px)">
      {loading ? (
        <Text color="gray.600">Loading...</Text>
      ) : rows.length === 0 ? (
        <Text color="gray.600">No items to show.</Text>
      ) : (
        <Flex flexDirection="column" gap="4" width="100%">
          {rows.map((row, idx) => (
            <Box
              key={`${row.material_id}-${idx}`}
              width="100%"
              minW="0"
              borderWidth="1px"
              borderLeftWidth="4px"
              borderLeftColor="brand.500"
              borderColor="gray.200"
              borderRadius="lg"
              p="5"
              bg="white"
              _dark={{
                bg: "gray.800",
                borderColor: "gray.600",
                borderLeftColor: "brand.400",
              }}
              shadow="sm"
              transition="box-shadow 0.2s, border-color 0.2s"
              _hover={{
                shadow: "md",
                borderColor: "brand.200",
                _dark: { borderColor: "brand.600" },
              }}
            >
              <Text
                fontSize="md"
                fontWeight="600"
                color="brand.600"
                _dark={{ color: "brand.300" }}
                mb="4"
                noOfLines={2}
              >
                {row.material_name}
              </Text>
              <Flex gap="6" mb="4" flexWrap="wrap">
                <Box
                  px="3"
                  py="2"
                  borderRadius="md"
                  bg="brand.50"
                  _dark={{ bg: "brand.900/30" }}
                >
                  <Text
                    fontSize="xs"
                    color="brand.600"
                    fontWeight="medium"
                    _dark={{ color: "brand.300" }}
                  >
                    Available
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color="gray.800"
                    _dark={{ color: "gray.100" }}
                  >
                    {row.available_stock}
                  </Text>
                </Box>
                <Box
                  px="3"
                  py="2"
                  borderRadius="md"
                  bg="gray.100"
                  _dark={{ bg: "gray.700" }}
                >
                  <Text
                    fontSize="xs"
                    color="gray.600"
                    fontWeight="medium"
                    _dark={{ color: "gray.400" }}
                  >
                    Requested
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color="gray.800"
                    _dark={{ color: "gray.100" }}
                  >
                    {row.requested_qty}
                  </Text>
                </Box>
                {row.requested_qty > row.available_stock && (
                  <Box
                    px="3"
                    py="2"
                    borderRadius="md"
                    bg="orange.50"
                    _dark={{ bg: "orange.900/30" }}
                  >
                    <Text
                      fontSize="xs"
                      color="orange.600"
                      fontWeight="medium"
                      _dark={{ color: "orange.300" }}
                    >
                      Pending qty
                    </Text>
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      color="gray.800"
                      _dark={{ color: "gray.100" }}
                    >
                      {Math.max(0, row.requested_qty - row.approved_qty)}
                    </Text>
                  </Box>
                )}
              </Flex>
              <Box mb="4">
                <Text
                  fontSize="xs"
                  color="gray.600"
                  fontWeight="medium"
                  mb="2"
                  _dark={{ color: "gray.400" }}
                >
                  Quantity
                </Text>
                <CustomInput
                  type="number"
                  value={row.approved_qty}
                  onChange={(e) => {
                    const v = e.target.value;
                    const n = v === "" ? 0 : Math.max(0, parseInt(v, 10));
                    setRowField(idx, "approved_qty", Number.isNaN(n) ? 0 : n);
                  }}
                />
              </Box>
              {row.requested_qty > row.available_stock && (
                <Flex align="center" gap="2">
                  <Checkbox.Root
                    checked={row.create_as_new}
                    onCheckedChange={(e) =>
                      setRowField(idx, "create_as_new", e?.checked === true)
                    }
                    size="sm"
                    colorPalette="brand"
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Root>
                  <Text
                    fontSize="sm"
                    color="gray.600"
                    _dark={{ color: "gray.400" }}
                  >
                    Create as new
                  </Text>
                </Flex>
              )}
            </Box>
          ))}
        </Flex>
      )}
    </Box>
  );

  const handleConfirm = async () => {
    if (!requestId || !onConfirm) return;
    setSubmitting(true);
    try {
      await onConfirm(requestId, rows);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomDrawer
      title="Approve Material Request"
      isOpen={isOpen}
      setIsOpen={(open) => {
        if (!open) onClose();
      }}
      size="md"
      content={content}
      footer={
        <Flex gap="2" justify="flex-end">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            colorPalette="brand"
            onClick={handleConfirm}
            disabled={loading || rows.length === 0 || submitting}
          >
            Confirm
          </Button>
        </Flex>
      }
    />
  );
}

export default ApproveMaterialRequestDrawer;
