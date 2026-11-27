"use client";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import RangeSelector from "@/components/RangeSelector";
import IncentiveTypeRadioGroup from "@/components/IncentiveCommon/IncentiveTypeRadioGroup";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { ErrorMessage, Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { validateRanges } from "@/utils/rangeValidation";
import useIncentiveCommonById from "@/api/customHooks/useIncentiveCommonById";
import {
  createIncentiveCommon,
  updateIncentiveCommon,
  getIncentiveCommonByTypeAndMonth,
} from "@/api/helpers/incentive_common";
import toast from "react-hot-toast";
import moment from "moment";
import { CLUSTER_SIZES } from "@/constants/clusterSizes";

const INITIAL_VALUES = {
  selected_month: null,
  cluster_size: null,
  incentive_type: "single_percentage", // single_percentage, ranged_percentage, fixed, ranged_fixed
  single_percentage: null,
  ranged_percentage: [],
  fixed: null,
  ranged_fixed: [],
};

const getValidationSchema = (showClusterSelection) =>
  Yup.object().shape({
    selected_month: Yup.date().nullable(),
    incentive_type: Yup.string()
      .oneOf(
        ["single_percentage", "ranged_percentage", "fixed", "ranged_fixed"],
        "Invalid incentive type"
      )
      .required("Incentive type is required"),
    single_percentage: Yup.number()
      .nullable()
      .when("incentive_type", {
        is: "single_percentage",
        then: (schema) =>
          schema
            .required("Percentage is required")
            .min(0, "Percentage must be ≥ 0")
            .max(100, "Percentage must be ≤ 100"),
        otherwise: (schema) => schema.nullable(),
      }),
    ranged_percentage: Yup.array()
      .nullable()
      .when("incentive_type", {
        is: "ranged_percentage",
        then: (schema) =>
          schema
            .min(1, "At least one range is required")
            .test(
              "valid-ranges",
              "All ranges must be valid",
              function (ranges) {
                if (!ranges || ranges.length === 0) return false;
                const validation = validateRanges(ranges);
                if (!validation.isValid) {
                  return this.createError({
                    message: validation.errors[0]?.error || "Invalid ranges",
                  });
                }
                // Validate that each range has a percentage
                for (let i = 0; i < ranges.length; i++) {
                  const range = ranges[i];
                  if (
                    range.percentage === null ||
                    range.percentage === undefined ||
                    range.percentage === ""
                  ) {
                    return this.createError({
                      message: `Range ${i + 1}: Percentage is required`,
                    });
                  }
                  if (range.percentage < 0 || range.percentage > 100) {
                    return this.createError({
                      message: `Range ${
                        i + 1
                      }: Percentage must be between 0 and 100`,
                    });
                  }
                }
                return true;
              }
            ),
        otherwise: (schema) => schema.nullable(),
      }),
    fixed: Yup.number()
      .nullable()
      .when("incentive_type", {
        is: "fixed",
        then: (schema) =>
          schema
            .required("Fixed value is required")
            .min(0, "Fixed value must be ≥ 0"),
        otherwise: (schema) => schema.nullable(),
      }),
    ranged_fixed: Yup.array()
      .nullable()
      .when("incentive_type", {
        is: "ranged_fixed",
        then: (schema) =>
          schema
            .min(1, "At least one range is required")
            .test(
              "valid-ranges",
              "All ranges must be valid",
              function (ranges) {
                if (!ranges || ranges.length === 0) return false;
                const validation = validateRanges(ranges);
                if (!validation.isValid) {
                  return this.createError({
                    message: validation.errors[0]?.error || "Invalid ranges",
                  });
                }
                // Validate that each range has a fixed value
                for (let i = 0; i < ranges.length; i++) {
                  const range = ranges[i];
                  if (
                    range.fixed === null ||
                    range.fixed === undefined ||
                    range.fixed === ""
                  ) {
                    return this.createError({
                      message: `Range ${i + 1}: Fixed value is required`,
                    });
                  }
                  if (range.fixed < 0) {
                    return this.createError({
                      message: `Range ${i + 1}: Fixed value must be ≥ 0`,
                    });
                  }
                }
                return true;
              }
            ),
        otherwise: (schema) => schema.nullable(),
      }),
    ...(showClusterSelection
      ? {
          cluster_size: Yup.string()
            .oneOf(["small", "medium", "large"], "Invalid cluster size")
            .required("Cluster size is required"),
        }
      : {}),
  });

export default function IncentiveCommonForm({
  params,
  type,
  basePath,
  title,
  permissionKey,
  showClusterSelection = false,
}) {
  const router = useRouter();
  const { mode } = use(params);
  const incentiveId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingEntryId, setExistingEntryId] = useState(null);
  const [existingEntryInfo, setExistingEntryInfo] = useState(null);
  const { incentive, loading: loadingIncentive } =
    useIncentiveCommonById(incentiveId);

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  // Fetch existing data when month (and cluster_size when showClusterSelection) is selected (create mode only)
  // Works with both month selected and month null
  const fetchExistingIncentive = async (month, clusterSize, setFieldValue) => {
    if (!isCreateMode) return;
    // When showClusterSelection, we need cluster_size to check existing; skip if not selected
    if (showClusterSelection && (clusterSize == null || clusterSize === "")) {
      setExistingEntryId(null);
      setExistingEntryInfo(null);
      return;
    }

    try {
      setLoadingExisting(true);
      // Format month if provided, otherwise pass null
      // API expects a date format (any date within the month), so use first day of month
      const monthString = month
        ? moment(month).startOf("month").format("YYYY-MM-DD")
        : null;
      const response = await getIncentiveCommonByTypeAndMonth(
        type,
        monthString,
        showClusterSelection ? clusterSize : undefined
      );

      if (response.code === 200 && response.data) {
        // Handle both array and single object responses
        const matchMonth = (item) => {
          if (!item.selected_month && !monthString) return true;
          if (!item.selected_month || !monthString) return false;
          return (
            moment(item.selected_month).format("YYYY-MM") ===
            moment(monthString).format("YYYY-MM")
          );
        };
        const matchCluster = (item) =>
          !showClusterSelection ||
          item.cluster_size === clusterSize ||
          item.cluster_type === clusterSize;

        const existing = Array.isArray(response.data)
          ? response.data.filter(
              (item) => matchMonth(item) && matchCluster(item)
            )[0]
          : response.data;

        if (existing) {
          // Existing entry found - block the form
          setExistingEntryId(existing.incentive_common_id);
          setExistingEntryInfo({
            selected_month: existing.selected_month,
            ...(showClusterSelection && {
              cluster_size: existing.cluster_size ?? existing.cluster_type,
            }),
          });
        } else {
          // No existing entry - clear the block
          setExistingEntryId(null);
          setExistingEntryInfo(null);
        }
      } else {
        // No existing entry - clear the block
        setExistingEntryId(null);
        setExistingEntryInfo(null);
      }
    } catch (err) {
      console.error("Error fetching existing incentive:", err);
    } finally {
      setLoadingExisting(false);
    }
  };

  // Initial check for existing entry when form loads in create mode (no month selected)
  // Skip when showClusterSelection: we need cluster_size to determine existing entry
  useEffect(() => {
    if (isCreateMode && !incentiveId && !showClusterSelection) {
      // Check for existing entry with no month on initial load
      const checkInitial = async () => {
        try {
          setLoadingExisting(true);
          const response = await getIncentiveCommonByTypeAndMonth(type, null);

          if (response.code === 200 && response.data) {
            // Handle both array and single object responses
            const existing = Array.isArray(response.data)
              ? response.data.find((item) => !item.selected_month)
              : !response.data.selected_month
              ? response.data
              : null;

            if (existing) {
              // Existing entry found with no month - block the form
              setExistingEntryId(existing.incentive_common_id);
              setExistingEntryInfo({
                selected_month: existing.selected_month,
              });
            } else {
              // No existing entry - clear the block
              setExistingEntryId(null);
              setExistingEntryInfo(null);
            }
          } else {
            // No existing entry - clear the block
            setExistingEntryId(null);
            setExistingEntryInfo(null);
          }
        } catch (err) {
          console.error("Error fetching existing incentive:", err);
        } finally {
          setLoadingExisting(false);
        }
      };
      checkInitial();
    }
  }, [isCreateMode, incentiveId, type, showClusterSelection]);

  useEffect(() => {
    if ((isEditMode || isViewMode) && incentive) {
      // Transform API data to form values
      const formValues = {
        selected_month: incentive.selected_month
          ? moment(incentive.selected_month).toDate()
          : null,
        cluster_size: incentive.cluster_size ?? incentive.cluster_type ?? null,
        incentive_type: incentive.incentive_type || "single_percentage",
        single_percentage: null,
        ranged_percentage: [],
        fixed: null,
        ranged_fixed: [],
      };

      switch (incentive.incentive_type) {
        case "single_percentage":
          formValues.single_percentage = incentive.value;
          break;
        case "ranged_percentage":
          formValues.ranged_percentage =
            (incentive.ranges || []).map((range) => ({
              start: range.start,
              end: range.end,
              startOperator: range.start_operator,
              endOperator: range.end_operator,
              percentage: range.percentage,
            })) || [];
          break;
        case "fixed":
          formValues.fixed = incentive.value;
          break;
        case "ranged_fixed":
          formValues.ranged_fixed =
            (incentive.ranges || []).map((range) => ({
              start: range.start,
              end: range.end,
              startOperator: range.start_operator,
              endOperator: range.end_operator,
              fixed: range.fixed,
            })) || [];
          break;
      }

      setInitialValues(formValues);
    }
  }, [isEditMode, isViewMode, incentive]);

  const getTitleText = () => {
    if (isCreateMode) {
      return `Add ${title}`;
    }
    if (isEditMode) {
      return `Edit ${title}`;
    }
    return `View ${title} : #${incentive?.incentive_common_id ?? ""}`;
  };

  const handleSubmit = async (values) => {
    try {
      // Block submission if existing entry is found
      if (existingEntryId && isCreateMode) {
        toast.error(
          "An entry already exists for this month. Please edit the existing entry."
        );
        return;
      }

      // Check for existing entry in create mode (fallback check)
      // Works with both month selected and month null; when showClusterSelection also match cluster_size
      if (isCreateMode) {
        // API expects a date format (any date within the month), so use first day of month
        const monthString = values.selected_month
          ? moment(values.selected_month).startOf("month").format("YYYY-MM-DD")
          : null;
        const clusterSize = showClusterSelection
          ? values.cluster_size
          : undefined;
        const existing = await getIncentiveCommonByTypeAndMonth(
          type,
          monthString,
          clusterSize
        );

        const data = existing?.code === 200 ? existing.data : null;
        const monthMatch = (item) =>
          !monthString
            ? !item.selected_month
            : item.selected_month &&
              moment(item.selected_month).format("YYYY-MM") ===
                moment(monthString).format("YYYY-MM");
        const clusterMatch = (item) =>
          !showClusterSelection ||
          item.cluster_size === values.cluster_size ||
          item.cluster_type === values.cluster_size;

        const existingEntry = Array.isArray(data)
          ? data.find((item) => monthMatch(item) && clusterMatch(item))
          : data && monthMatch(data) && clusterMatch(data)
          ? data
          : null;

        if (existingEntry) {
          const existingId = existingEntry.incentive_common_id;
          const monthText = existingEntry.selected_month
            ? moment(existingEntry.selected_month).format("MMM YYYY")
            : "no month";
          const clusterText =
            showClusterSelection &&
            (existingEntry.cluster_size ?? existingEntry.cluster_type)
              ? ` and cluster ${
                  existingEntry.cluster_size ?? existingEntry.cluster_type
                }`
              : "";
          toast.error(
            `An entry already exists${
              existingEntry.selected_month ? ` for ${monthText}` : " (no month)"
            }${clusterText}. Please edit the existing entry or choose a different month${
              showClusterSelection ? "/cluster" : ""
            }.`
          );
          router.push(`${basePath}/edit/${existingId}`);
          return;
        }
      }

      // Format the data based on incentive type
      // Format selected_month as first day of month (YYYY-MM-DD)
      const submitData = {
        type: type,
        incentive_type: values.incentive_type,
        selected_month: values.selected_month
          ? moment(values.selected_month).startOf("month").format("YYYY-MM-DD")
          : null,
        ...(showClusterSelection && values.cluster_size
          ? { cluster_size: values.cluster_size }
          : {}),
      };

      switch (values.incentive_type) {
        case "single_percentage":
          submitData.value = values.single_percentage;
          submitData.ranges = null;
          break;
        case "ranged_percentage":
          submitData.value = null;
          submitData.ranges = values.ranged_percentage.map((range) => ({
            start: range.start,
            end: range.end,
            start_operator: range.startOperator,
            end_operator: range.endOperator,
            percentage: range.percentage,
          }));
          break;
        case "fixed":
          submitData.value = values.fixed;
          submitData.ranges = null;
          break;
        case "ranged_fixed":
          submitData.value = null;
          submitData.ranges = values.ranged_fixed.map((range) => ({
            start: range.start,
            end: range.end,
            start_operator: range.startOperator,
            end_operator: range.endOperator,
            fixed: range.fixed,
          }));
          break;
      }

      const promise = isEditMode
        ? updateIncentiveCommon(incentiveId, submitData)
        : createIncentiveCommon(submitData);

      toast.promise(promise, {
        loading: isEditMode ? `Updating ${title}...` : `Creating ${title}...`,
        success: (response) => {
          if (response.code === 200) {
            router.push(basePath);
            return isEditMode ? `${title} updated!` : `${title} created!`;
          } else {
            throw response.message;
          }
        },
        error: (err) => {
          if (err) {
            return err;
          }

          return isEditMode
            ? `Error updating ${title}!`
            : `Error creating ${title}!`;
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error submitting form!");
    }
  };

  return (
    <GlobalWrapper permissionKey={permissionKey}>
      <CustomContainer pageForm headerBand backHref={basePath} title={getTitleText()}>
        <Formik
          initialValues={initialValues}
          validationSchema={getValidationSchema(showClusterSelection)}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, values, setFieldValue }) => {
            return (
              <Flex flexDirection="column" gap="22px">
                {/* Month Selection */}
                <Grid
                  templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                  gap="22px"
                >
                  {showClusterSelection && (
                    <CustomInput
                      label="Cluster Size"
                      name="cluster_size"
                      method="dropdown"
                      placeholder="Select cluster size..."
                      options={CLUSTER_SIZES}
                      viewOnly={isViewMode}
                      isRequired
                      onChange={async (e) => {
                        const newCluster = e.target.value;
                        setFieldValue("cluster_size", newCluster);
                        setExistingEntryId(null);
                        setExistingEntryInfo(null);
                        if (isCreateMode) {
                          await fetchExistingIncentive(
                            values.selected_month ?? null,
                            newCluster,
                            setFieldValue
                          );
                        }
                      }}
                    />
                  )}

                  <CustomInput
                    label="Month"
                    name="selected_month"
                    type="month"
                    method="date-picker"
                    placeholder="Optional"
                    viewOnly={isViewMode}
                    showClearButton={true}
                    onChange={async (date) => {
                      setFieldValue("selected_month", date);
                      // Clear existing entry state when month changes
                      setExistingEntryId(null);
                      setExistingEntryInfo(null);
                      // Fetch existing data when month is selected or cleared
                      if (isCreateMode) {
                        await fetchExistingIncentive(
                          date ?? null,
                          values.cluster_size ?? null,
                          setFieldValue
                        );
                      }
                    }}
                  />
                </Grid>

                {loadingExisting && (
                  <Text fontSize="sm" color="gray.500">
                    Checking for existing configuration...
                  </Text>
                )}

                {/* Existing Entry Warning */}
                {existingEntryId && isCreateMode && (
                  <Box
                    p="16px"
                    border="2px solid"
                    borderColor="orange.300"
                    borderRadius="md"
                    bgColor="orange.50"
                  >
                    <Flex
                      flexDirection="row"
                      gap="12px"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Flex flexDirection="column" gap="12px">
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="orange.800"
                        >
                          Entry Already Exists
                        </Text>
                        <Text fontSize="sm" color="orange.700">
                          An entry already exists
                          {values.selected_month
                            ? ` for ${moment(values.selected_month).format(
                                "MMM YYYY"
                              )}`
                            : " (no month)"}
                          {showClusterSelection && values.cluster_size
                            ? ` and cluster ${values.cluster_size}`
                            : ""}
                          . Please edit the existing entry or change the month
                          {showClusterSelection ? "/cluster" : ""}.
                        </Text>
                      </Flex>

                      <Button
                        colorScheme="orange"
                        size="sm"
                        onClick={() => {
                          router.push(`${basePath}/edit/${existingEntryId}`);
                        }}
                      >
                        Click here to edit
                      </Button>
                    </Flex>
                  </Box>
                )}

                {/* Radio Buttons for Incentive Types */}
                <Box
                  position="relative"
                  opacity={existingEntryId && isCreateMode ? 0.5 : 1}
                  pointerEvents={
                    existingEntryId && isCreateMode ? "none" : "auto"
                  }
                >
                  <Flex flexDirection="column" gap="18px">
                    <IncentiveTypeRadioGroup
                      value={values.incentive_type}
                      disabled={isViewMode}
                      onChange={(val) => setFieldValue("incentive_type", val)}
                    />

                    {values.incentive_type === "single_percentage" && (
                      <Grid
                        templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                        gap="22px"
                      >
                        <CustomInput
                          label="Percentage (%)"
                          name="single_percentage"
                          type="number"
                          placeholder="Enter percentage (0-100)"
                          viewOnly={isViewMode}
                          isRequired
                        />
                      </Grid>
                    )}

                    {values.incentive_type === "ranged_percentage" && (
                      <Box>
                        <RangeSelector
                          name="ranged_percentage"
                          label="Percentage Ranges"
                          valueField="percentage"
                          existingRanges={values.ranged_percentage || []}
                          viewOnly={isViewMode}
                        />
                        <ErrorMessage name="ranged_percentage">
                          {(msg) => (
                            <Text fontSize="xs" color="red.500" mt="8px">
                              {msg}
                            </Text>
                          )}
                        </ErrorMessage>
                      </Box>
                    )}

                    {values.incentive_type === "fixed" && (
                      <Grid
                        templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                        gap="22px"
                      >
                        <CustomInput
                          label="Fixed Value"
                          name="fixed"
                          type="number"
                          placeholder="Enter fixed value"
                          viewOnly={isViewMode}
                          isRequired
                        />
                      </Grid>
                    )}

                    {values.incentive_type === "ranged_fixed" && (
                      <Box>
                        <RangeSelector
                          name="ranged_fixed"
                          label="Fixed Value Ranges"
                          valueField="fixed"
                          existingRanges={values.ranged_fixed || []}
                          viewOnly={isViewMode}
                        />
                        <ErrorMessage name="ranged_fixed">
                          {(msg) => (
                            <Text fontSize="xs" color="red.500" mt="8px">
                              {msg}
                            </Text>
                          )}
                        </ErrorMessage>
                      </Box>
                    )}
                  </Flex>
                </Box>

                {/* Action Buttons */}
                <Flex gap="12px" justifyContent="flex-end">
                  <Link href={basePath}>
                    <Button variant="subtle">{isViewMode ? "Back" : "Cancel"}</Button>
                  </Link>
                  {(isCreateMode || isEditMode) && (
                    <Button
                      onClick={handleSubmit}
                      disabled={existingEntryId && isCreateMode}
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
