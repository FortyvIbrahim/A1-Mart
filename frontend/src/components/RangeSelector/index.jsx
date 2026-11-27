"use client";
import {
  Box,
  Button,
  Flex,
  Grid,
  Input,
  Text,
} from "@chakra-ui/react";
import { ErrorMessage, useFormikContext } from "formik";
import React from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { validateRange } from "@/utils/rangeValidation";
import CustomContainer from "../CustomContainer";
import CustomSelect from "../CustomSelect";

const RangeSelector = ({
  name,
  label,
  valueField = "value",
  existingRanges = [],
  viewOnly = false,
}) => {
  const { values, setFieldValue } = useFormikContext();
  const ranges = values[name] || [];

  const addRange = () => {
    const newRange = {
      start: null,
      end: null,
      startOperator: "more_than",
      endOperator: "less_than",
      [valueField]: "",
    };
    setFieldValue(name, [...ranges, newRange]);
  };

  const removeRange = (index) => {
    const newRanges = ranges.filter((_, i) => i !== index);
    setFieldValue(name, newRanges);
  };

  const updateRange = (index, field, value) => {
    const newRanges = [...ranges];
    newRanges[index] = {
      ...newRanges[index],
      [field]: value === "" ? null : value,
    };
    setFieldValue(name, newRanges);
  };

  const getRangeError = (range, index) => {
    const otherRanges = ranges.filter((_, i) => i !== index);
    const validation = validateRange(range, otherRanges);
    return validation.isValid ? null : validation.error;
  };

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb="16px">
        <Text fontSize="sm" fontWeight="medium">
          {label}
        </Text>
        {!viewOnly && (
          <Button size="xs" onClick={addRange} leftIcon={<FaPlus />}>
            Add Range
          </Button>
        )}
      </Flex>

      {ranges.length === 0 ? (
        <Box
          p="16px"
          border="1px dashed"
          borderColor="gray.300"
          borderRadius="md"
          textAlign="center"
        >
          <Text fontSize="sm" color="gray.500">
            No ranges added. Click "Add Range" to create one.
          </Text>
        </Box>
      ) : (
        <Flex flexDirection="column" gap="22px">
          {ranges.map((range, index) => {
            const rangeError = getRangeError(range, index);
            return (
              <CustomContainer key={index} title={`Range ${index + 1}`} size="sm" color="secondary">
                <Grid
                  templateColumns={{
                    base: "1fr",
                    md: "repeat(4, 1fr)",
                  }}
                  gap="12px"
                  mb="12px"
                >
                  {/* Start Operator */}
                  <Box>
                    <Text fontSize="xs" mb="4px" color="gray.600">
                      Start Operator
                    </Text>
                    <CustomSelect
                      h="40px"
                      allowEmpty={false}
                      disabled={viewOnly}
                      value={range.startOperator || "more_than"}
                      onChange={(val) =>
                        updateRange(index, "startOperator", val)
                      }
                      options={[
                        { value: "more_than", label: "More Than" },
                        { value: "less_than", label: "Less Than" },
                        { value: "none", label: "No Limit" },
                      ]}
                    />
                  </Box>

                  {/* Start Value */}
                  {range.startOperator !== "none" && (
                    <Box>
                      <Text fontSize="xs" mb="4px" color="gray.600">
                        Start Value
                      </Text>
                      <Input
                        type="number"
                        value={range.start ?? ""}
                        onChange={(e) =>
                          updateRange(
                            index,
                            "start",
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                        placeholder="Enter start value"
                        disabled={viewOnly}
                        readOnly={viewOnly}
                      />
                    </Box>
                  )}

                  {/* End Operator */}
                  <Box>
                    <Text fontSize="xs" mb="4px" color="gray.600">
                      End Operator
                    </Text>
                    <CustomSelect
                      h="40px"
                      allowEmpty={false}
                      disabled={viewOnly}
                      value={range.endOperator || "less_than"}
                      onChange={(val) =>
                        updateRange(index, "endOperator", val)
                      }
                      options={[
                        { value: "more_than", label: "More Than" },
                        { value: "less_than", label: "Less Than" },
                        { value: "none", label: "No Limit" },
                      ]}
                    />
                  </Box>

                  {/* End Value */}
                  {range.endOperator !== "none" && (
                    <Box>
                      <Text fontSize="xs" mb="4px" color="gray.600">
                        End Value
                      </Text>
                      <Input
                        type="number"
                        value={range.end ?? ""}
                        onChange={(e) =>
                          updateRange(
                            index,
                            "end",
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                        placeholder="Enter end value"
                        disabled={viewOnly}
                        readOnly={viewOnly}
                      />
                    </Box>
                  )}
                </Grid>

                {/* Value Field (Percentage or Fixed) */}
                <Box mb="8px">
                  <Text fontSize="xs" mb="4px" color="gray.600">
                    {valueField === "percentage" ? "Percentage (%)" : "Fixed Value"}
                  </Text>
                  <Input
                    type="number"
                    value={range[valueField] ?? ""}
                    onChange={(e) =>
                      updateRange(
                        index,
                        valueField,
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    placeholder={
                      valueField === "percentage"
                        ? "Enter percentage"
                        : "Enter fixed value"
                    }
                    disabled={viewOnly}
                    readOnly={viewOnly}
                  />
                </Box>

                {/* Error Message */}
                {rangeError && (
                  <Text fontSize="xs" color="red.500" mt="4px">
                    {rangeError}
                  </Text>
                )}

                {/* Remove Button */}
                {!viewOnly && (
                  <Flex justifyContent="flex-end" mt="8px">
                    <Button
                      size="xs"
                      variant="subtle"
                      colorPalette="red"
                      onClick={() => removeRange(index)}
                    >
                      Remove
                    </Button>
                  </Flex>
                )}
              </CustomContainer>
            );
          })}
        </Flex>
      )}
    </Box>
  );
};

export default RangeSelector;
