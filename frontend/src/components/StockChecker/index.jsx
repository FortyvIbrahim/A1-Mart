import { Button, Flex, IconButton, Input } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

function StockCheckerInput({
  totalStock,
  productId,
  onSave,
  initialCheckedStock = null,
  stockCircleId,
}) {
  const [stock, setStock] = useState(
    initialCheckedStock !== null ? String(initialCheckedStock) : ""
  );

  // Update stock when initialCheckedStock changes
  useEffect(() => {
    if (initialCheckedStock !== null && initialCheckedStock !== undefined) {
      setStock(String(initialCheckedStock));
    }
  }, [initialCheckedStock]);

  const handleSave = () => {
    if (stock === undefined || stock === null || stock === "") {
      toast.error("Please enter a valid stock");
      return;
    }

    if (stock != totalStock) {
      toast.error("Stock does not match with total stock");
      return;
    }

    onSave({
      productId,
      checkedStock: stock,
      ...(stockCircleId != null && stockCircleId !== ""
        ? { stockCircleId }
        : {}),
    });
  };

  return (
    <Flex gap={2} p={{ base: 1, md: 2 }} align="center">
      <Input
        type="number"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
      />

      <IconButton size="sm" variant="subtle" onClick={handleSave}>
        <i className="fa fa-save" />
      </IconButton>
    </Flex>
  );
}

export default StockCheckerInput;
