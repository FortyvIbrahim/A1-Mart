"use client";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import RangeSelector from "@/components/RangeSelector";
import { CLUSTER_SIZES } from "@/constants/clusterSizes";
import { Box, Button, Flex, Grid, Tabs, Text } from "@chakra-ui/react";
import { ErrorMessage, Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { validateRanges } from "@/utils/rangeValidation";
import useSalesIncentiveById from "@/api/customHooks/useSalesIncentiveById";
import {
    createIncentiveSales,
    updateIncentiveSales,
    getIncentiveSalesByClusterTypeAndMonth,
} from "@/api/helpers/incentive_sales";
import toast from "react-hot-toast";
import moment from "moment";

const INITIAL_VALUES = {
    cluster_size: "",
    selected_month: null,
    incentive_type: "single_percentage", // single_percentage, ranged_percentage, fixed, ranged_fixed
    single_percentage: null,
    ranged_percentage: [],
    fixed: null,
    ranged_fixed: [],
};

const VALIDATION_SCHEMA = Yup.object().shape({
    cluster_size: Yup.string().required("Cluster size is required"),
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
                                        message: `Range ${i + 1}: Percentage must be between 0 and 100`,
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
});

export default function SalesIncentiveForm({ params }) {
    const router = useRouter();
    const { mode } = use(params);
    const incentiveId = mode[1];
    const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
    const [loadingExisting, setLoadingExisting] = useState(false);
    const [existingEntryId, setExistingEntryId] = useState(null);
    const [existingEntryInfo, setExistingEntryInfo] = useState(null);
    const { incentive, loading: loadingIncentive } = useSalesIncentiveById(
        incentiveId
    );

    const isCreateMode = mode[0] === "create";
    const isViewMode = mode[0] === "view";
    const isEditMode = mode[0] === "edit";

    // Fetch existing data when cluster_size is selected (create mode only)
    // Works with both month selected and month null
    const fetchExistingIncentive = async (clusterSize, month, setFieldValue) => {
        if (!clusterSize || !isCreateMode) return;

        try {
            setLoadingExisting(true);
            // Format month if provided, otherwise pass null
            // API expects a date format (any date within the month), so use first day of month
            const monthString = month ? moment(month).startOf('month').format("YYYY-MM-DD") : null;
            // Map cluster_size (form) to cluster_type (API)
            const response = await getIncentiveSalesByClusterTypeAndMonth(
                clusterSize,
                monthString
            );

            if (response.code === 200 && response.data) {
                // Handle both array and single object responses
                const existing = Array.isArray(response.data)
                    ? response.data.filter(item => {
                        // Compare months: both null or same month
                        if (!item.selected_month && !monthString) return true;
                        if (!item.selected_month || !monthString) return false;
                        // Compare if both dates are in the same month
                        return moment(item.selected_month).format("YYYY-MM") === moment(monthString).format("YYYY-MM");
                    })[0]
                    : response.data;

                if (existing) {
                    // Existing entry found - block the form
                    setExistingEntryId(existing.incentive_sales_id);
                    setExistingEntryInfo({
                        cluster_size: existing.cluster_type, // Map cluster_type (API) to cluster_size (form)
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

    useEffect(() => {
        if ((isEditMode || isViewMode) && incentive) {
            // Transform API data to form values
            // Map cluster_type (API) to cluster_size (form)
            const formValues = {
                cluster_size: incentive.cluster_type || "",
                selected_month: incentive.selected_month ? moment(incentive.selected_month).toDate() : null,
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

    const getTitle = () => {
        if (isCreateMode) {
            return "Add Sales Incentive";
        }
        if (isEditMode) {
            return "Edit Sales Incentive";
        }
        return `View Sales Incentive : #${incentive?.incentive_sales_id ?? ""}`;
    };

    const handleSubmit = async (values) => {
        try {
            // Block submission if existing entry is found
            if (existingEntryId && isCreateMode) {
                toast.error("An entry already exists for this cluster size and month. Please edit the existing entry.");
                return;
            }

            // Check for existing entry in create mode (fallback check)
            // Works with both month selected and month null
            if (isCreateMode && values.cluster_size) {
                // API expects a date format (any date within the month), so use first day of month
                const monthString = values.selected_month
                    ? moment(values.selected_month).startOf('month').format("YYYY-MM-DD")
                    : null;
                // Map cluster_size (form) to cluster_type (API)
                const existing = await getIncentiveSalesByClusterTypeAndMonth(
                    values.cluster_size,
                    monthString
                );

                if (existing.code === 200 && existing.data) {
                    const existingEntry = Array.isArray(existing.data)
                        ? existing.data[0]
                        : existing.data;

                    if (existingEntry) {
                        const existingId = existingEntry.incentive_sales_id;
                        const monthText = existingEntry.selected_month
                            ? moment(existingEntry.selected_month).format("MMM YYYY")
                            : "no month";
                        toast.error(
                            `An entry already exists for this cluster size${existingEntry.selected_month ? ` and ${monthText}` : " (no month)"}. Please edit the existing entry or choose a different month.`
                        );
                        router.push(`/incentive/sales/edit/${existingId}`);
                        return;
                    }
                }
            }

            // Format the data based on incentive type
            // Map cluster_size (form) to cluster_type (API)
            // Format selected_month as first day of month (YYYY-MM-DD)
            const submitData = {
                cluster_type: values.cluster_size,
                incentive_type: values.incentive_type,
                selected_month: values.selected_month ? moment(values.selected_month).startOf('month').format("YYYY-MM-DD") : null,
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
                ? updateIncentiveSales(incentiveId, submitData)
                : createIncentiveSales(submitData);

            toast.promise(promise, {
                loading: isEditMode
                    ? "Updating incentive sales..."
                    : "Creating incentive sales...",
                success: (response) => {
                    if (response.code === 200) {
                        router.push("/incentive/sales");
                        return isEditMode
                            ? "Incentive sales updated!"
                            : "Incentive sales created!";
                    } else {
                        throw response.message;
                    }
                },
                error: (err) => {
                    if (err) {
                        return err;
                    }

                    return isEditMode
                        ? "Error updating incentive sales!"
                        : "Error creating incentive sales!";
                },
            });
        } catch (err) {
            console.error(err);
            toast.error("Error submitting form!");
        }
    };

    const getPermissionKey = () => {
        if (isCreateMode || isEditMode) {
            return "add_sales_incentive"; // Update with actual permission key
        }
        return "view_sales_incentive"; // Update with actual permission key
    };

    return (
        <GlobalWrapper permissionKey={getPermissionKey()}>
            <CustomContainer title={getTitle()}>
                <Formik
                    initialValues={initialValues}
                    validationSchema={VALIDATION_SCHEMA}
                    onSubmit={handleSubmit}
                    enableReinitialize
                >
                    {({ handleSubmit, values, setFieldValue }) => {
                        return (
                            <Flex flexDirection="column" gap="22px">
                                {/* Cluster Size and Month Selection */}
                                <Grid
                                    templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                                    gap="22px"
                                >
                                    <CustomInput
                                        label="Cluster Size"
                                        name="cluster_size"
                                        placeholder="Select cluster size"
                                        method="dropdown"
                                        options={CLUSTER_SIZES}
                                        viewOnly={isViewMode}
                                        isRequired
                                        onChange={async (e) => {
                                            setFieldValue("cluster_size", e.target.value);
                                            // Clear existing entry state when cluster size changes
                                            setExistingEntryId(null);
                                            setExistingEntryInfo(null);
                                            // Fetch existing data when cluster_size is selected
                                            // Works with both month selected and month null
                                            if (e.target.value && isCreateMode) {
                                                await fetchExistingIncentive(
                                                    e.target.value,
                                                    values.selected_month || null,
                                                    setFieldValue
                                                );
                                            }
                                        }}
                                    />
                                    <CustomInput
                                        label="Month"
                                        name="selected_month"
                                        type="month"
                                        method="date-picker"
                                        placeholder="Select month (optional)"
                                        viewOnly={isViewMode}
                                        onChange={async (date) => {
                                            setFieldValue("selected_month", date);
                                            // Clear existing entry state when month changes
                                            setExistingEntryId(null);
                                            setExistingEntryInfo(null);
                                            // Fetch existing data when month is selected or cleared
                                            // Works with both month selected and month null
                                            if (values.cluster_size && isCreateMode) {
                                                await fetchExistingIncentive(
                                                    values.cluster_size,
                                                    date || null,
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
                                        <Flex flexDirection="row" gap="12px" justifyContent="space-between" alignItems="center">
                                            <Flex flexDirection="column" gap="12px">
                                                <Text fontSize="sm" fontWeight="medium" color="orange.800">
                                                    Entry Already Exists
                                                </Text>
                                                <Text fontSize="sm" color="orange.700">
                                                    An entry already exists for{" "}
                                                    <strong>
                                                        {CLUSTER_SIZES.find(
                                                            (cs) => cs.value === values.cluster_size
                                                        )?.label || values.cluster_size}
                                                    </strong>
                                                    {values.selected_month
                                                        ? ` and ${moment(values.selected_month).format("MMM YYYY")}`
                                                        : " (no month)"}
                                                    . Please edit the existing entry or change the cluster size/month.
                                                </Text>
                                            </Flex>

                                            <Button
                                                colorScheme="orange"
                                                size="sm"
                                                onClick={() => {
                                                    router.push(
                                                        `/incentive/sales/edit/${existingEntryId}`
                                                    );
                                                }}
                                            >
                                                Click here to edit
                                            </Button>
                                        </Flex>
                                    </Box>
                                )}

                                {/* Tabs for Incentive Types */}
                                <Box
                                    position="relative"
                                    opacity={existingEntryId && isCreateMode ? 0.5 : 1}
                                    pointerEvents={existingEntryId && isCreateMode ? "none" : "auto"}
                                >
                                    <Tabs.Root
                                        value={values.incentive_type}
                                        onValueChange={(details) => {
                                            setFieldValue("incentive_type", details.value);
                                        }}
                                        variant="line"
                                    >
                                        <Tabs.List>
                                            <Tabs.Trigger value="single_percentage">
                                                Single Percentage
                                            </Tabs.Trigger>
                                            <Tabs.Trigger value="ranged_percentage">
                                                Ranged Percentage
                                            </Tabs.Trigger>
                                            <Tabs.Trigger value="fixed">Fixed</Tabs.Trigger>
                                            <Tabs.Trigger value="ranged_fixed">Ranged Fixed</Tabs.Trigger>
                                        </Tabs.List>

                                        {/* Single Percentage Tab */}
                                        <Tabs.Content value="single_percentage">
                                            <Grid
                                                templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                                                gap="22px"
                                                mt="22px"
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
                                        </Tabs.Content>

                                        {/* Ranged Percentage Tab */}
                                        <Tabs.Content value="ranged_percentage">
                                            <Box mt="22px">
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
                                        </Tabs.Content>

                                        {/* Fixed Tab */}
                                        <Tabs.Content value="fixed">
                                            <Grid
                                                templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                                                gap="22px"
                                                mt="22px"
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
                                        </Tabs.Content>

                                        {/* Ranged Fixed Tab */}
                                        <Tabs.Content value="ranged_fixed">
                                            <Box mt="22px">
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
                                        </Tabs.Content>
                                    </Tabs.Root>
                                </Box>

                                {/* Action Buttons */}
                                <Flex gap="22px" justifyContent="flex-end">
                                    <Link href="/incentive/sales">
                                        <Button variant="subtle">Back</Button>
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
