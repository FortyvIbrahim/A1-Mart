"use client";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Badge, Button, Flex, Grid, Table, Text } from "@chakra-ui/react";
import { FieldArray, Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useBranches from "@/api/customHooks/useBranches";
import toast from "react-hot-toast";
import useTargetBranchesById from "@/api/customHooks/useTargetBranchesById";
import useDepartments from "@/api/customHooks/useDepartments";
import moment from "moment";
import { createTargetDepartment } from "@/api/helpers/target_department";
import useTargetDepartments from "@/api/customHooks/useTargetDepartments";
import useSections from "@/api/customHooks/useSections";
import useTargetDepartmentsById from "@/api/customHooks/useTargetDepartmentsById";
import { capitalizeWords } from "@/utils/string";
import { createTargetSection } from "@/api/helpers/target_section";
import useTargetSections from "@/api/customHooks/useTargetSections";

const INITIAL_VALUES = {
  branch_id: null,
  target_month: null,
  target_amount: null,
  targets: [],
};

const VALIDATION_SCHEMA = Yup.object({
  branch_id: Yup.mixed().required("Required"),
  target_month: Yup.string().required("Required"),
  target_amount: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be at least 0")
    .required("Required"),
  targets: Yup.array()
    .of(
      Yup.object({
        department_id: Yup.mixed(), // not user-editable
        department_name: Yup.string(), // not user-editable
        target: Yup.number()
          .typeError("Must be a number")
          .min(0, "Must be at least 0")
          .nullable(),
      })
    )
    .min(1, "At least one department is required")
    .test(
      "sum-matches-target-amount",
      "Total Target must equal Target Amount",
      function (items) {
        const total = (items || []).reduce((sum, item) => {
          const value = Number(item?.target ?? 0);
          return sum + (isNaN(value) ? 0 : value);
        }, 0);
        const targetAmount = Number(this.parent?.target_amount);
        if (isNaN(targetAmount)) return true; // handled by target_amount validator
        return total === targetAmount;
      }
    ),
});

export default function TargetSectionForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const branchTargetId = mode[1];

  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  const { targets: sectionTargets } = useTargetSections();
  const { target } = useTargetDepartmentsById(branchTargetId);
  const { sections } = useSections({
    branch_id: target?.branch_id,
    department_id: target?.department_id,
  });

  const { branches } = useBranches();
  const filteredBranches = branches.map((branch) => ({
    value: branch.branch_id,
    label: branch.branch_name,
  }));

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if (target && sections && sectionTargets) {
      const mappedTargets = {};
      sectionTargets
        .filter(
          (item) =>
            item.branch_id == target.branch_id &&
            moment(item.target_date).isSame(target.target_date, "month") &&
            item.department_id == target.department_id
        )
        .forEach((item) => {
          mappedTargets[item.section_id] = item;
        });

      const targetsArray = sections.map((item) => ({
        section_id: item.section_id,
        section_name:
          item.section_name !== "" ? item.section_name : item.section_code,
        target: mappedTargets[item.section_id]?.target_amount,
      }));
      setInitialValues({
        branch_id: target.branch_id,
        department_name: capitalizeWords(target.department_name),
        department_id: target.department_id,
        target_month: target.target_date,
        target_amount: target.target_amount,
        targets: targetsArray,
      });
    }
  }, [isEditMode, isViewMode, target, sections, sectionTargets]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Section Target";
    }

    if (isEditMode) {
      return "Edit Section Target";
    }

    return `Section Target : #${branchTargetId ?? ""}`;
  };

  const handleSubmit = async (values) => {
    try {
      const data = values.targets
        .filter(
          (item) => (item.target && item.target !== "") || item.target === 0
        )
        .map((item) => ({
          branch_id: values.branch_id,
          department_id: values.department_id,
          section_id: item.section_id,
          target_amount: item.target,
          target_date: moment(values.target_month).format("YYYY-MM-DD"),
        }));

      toast.promise(createTargetSection(data), {
        loading: "Adding new section target...",
        success: (response) => {
          if (response.code === 200) {
            router.push("/target/section");
            return "Section target added successfully!";
          } else {
            throw new Error(response.message);
          }
        },
        error: (err) => {
          console.error(err);
          return "Error adding section target!";
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error adding section target!");
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_target_section";
    }

    return "view_target_section";
  };

  const getTotalComponent = (values) => {
    let total = 0;

    if (values.targets && values.targets.length > 0) {
      values.targets.forEach((item) => {
        if (item.target && !isNaN(item.target)) {
          total += parseFloat(item.target);
        }
      });
    }

    return (
      <Flex w="100%" justifyContent="flex-end" pr={3} gap="10px" mt="12px">
        <Badge size="lg" colorPalette="secondary">{`Total : ${total}`}</Badge>
        {total != target.target_amount && (
          <Badge colorPalette="red">Total Target does not match</Badge>
        )}
      </Flex>
    );
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
          {({ handleSubmit, values, errors }) => {
            return (
              <Flex flexDirection="column" gap="22px">
                <Grid
                  templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
                  gap="22px"
                  mb="22px"
                >
                  <CustomInput
                    label="Select Branch"
                    isRequired
                    placeholder="Click here to select branch..."
                    name="branch_id"
                    method="dropdown"
                    options={filteredBranches}
                    viewOnly
                  />

                  <CustomInput
                    label="Department"
                    name="department_name"
                    viewOnly
                  />

                  <CustomInput
                    label="Target Month"
                    name="target_month"
                    type="month"
                    method="date-picker"
                    viewOnly
                  />

                  <CustomInput
                    label="Target Amount"
                    name="target_amount"
                    type="number"
                    viewOnly
                  />
                </Grid>

                <CustomContainer title="Sections" size="sm" color="secondary">
                  {values.targets && values.targets.length > 0 ? (
                    <FieldArray name="targets">
                      {(arrayHelpers) => (
                        <div>
                          <Table.Root
                            variant="striped"
                            sx={{
                              "tbody tr:nth-of-type(odd) td": {
                                background: "#f7f7f7", // your custom stripe color
                              },
                            }}
                          >
                            <Table.Header>
                              <Table.Row>
                                <Table.ColumnHeader>
                                  Section Name
                                </Table.ColumnHeader>
                                <Table.ColumnHeader>
                                  Target Amount
                                </Table.ColumnHeader>
                              </Table.Row>
                            </Table.Header>
                            <Table.Body>
                              {values.targets.map((item, idx) => (
                                <Table.Row key={`${item.material_id}-${idx}`}>
                                  <Table.Cell>
                                    <CustomInput
                                      name={`targets.${idx}.section_name`}
                                      viewOnly={true}
                                    />
                                  </Table.Cell>
                                  <Table.Cell>
                                    <CustomInput
                                      name={`targets.${idx}.target`}
                                      type="number"
                                      min={0}
                                      value={item.quantity}
                                      placeholder="Target"
                                      viewOnly={isViewMode}
                                    />
                                  </Table.Cell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table.Root>

                          {!isViewMode && getTotalComponent(values)}

                          {!isViewMode &&
                            errors.targets &&
                            typeof errors.targets === "string" && (
                              <Flex justifyContent="flex-end" pr={3} mt="8px">
                                <Text color="red" fontSize="sm">
                                  {errors.targets}
                                </Text>
                              </Flex>
                            )}
                        </div>
                      )}
                    </FieldArray>
                  ) : // <EmptyData />
                  null}
                </CustomContainer>

                <Flex gap="22px" justifyContent="flex-end">
                  <Link href="/target/section">
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
