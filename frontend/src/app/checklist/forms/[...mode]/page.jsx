"use client";

import useDesignations from "@/api/customHooks/useDesignations";
import {
  createChecklistForm,
  getChecklistFormById,
  updateChecklistForm,
} from "@/api/helpers/checklist_forms";
import CreateQuestionModal from "@/components/Checklist/CreateQuestionModal";
import QuestionCard from "@/components/Checklist/QuestionCard";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { CHECKLIST_FORM_ROUTES } from "@/constants/routes";
import {
  mapChecklistFormFromApi,
  mapChecklistFormToApi,
} from "@/utils/checklistFormPayload";
import { Button, Flex, Grid } from "@chakra-ui/react";
import { FieldArray, Formik } from "formik";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as Yup from "yup";

const FORM_SCHEMA = Yup.object().shape({
  title: Yup.string().required("Required"),
  designation_id: Yup.array()
    .min(1, "Select at least one designation")
    .required("Required"),
  questions: Yup.array(),
});

const EMPTY_FORM = {
  title: "",
  questions: [],
  designation_id: [],
};

function ChecklistFormPage({ params }) {
  const router = useRouter();
  const { mode } = use(params);

  const { designations } = useDesignations();

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";
  const formId = mode[1] ? parseInt(mode[1], 10) : null;

  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [initialValues, setInitialValues] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(!isCreateMode);
  /** Keeps FieldArray helpers so CreateQuestionModal can sit outside the page Formik (avoids nested Formik breaking question fields). */
  const questionsArrayHelpersRef = useRef(null);

  const loadForm = useMemo(() => {
    if (!formId || isNaN(formId)) return null;
    return async () => {
      setLoading(true);
      try {
        const res = await getChecklistFormById(formId);
        if (res.code === 200 && res.data) {
          const mapped = mapChecklistFormFromApi(res.data);
          setInitialValues(mapped ?? EMPTY_FORM);
        } else {
          toast.error(res.message || "Form not found");
          router.push(CHECKLIST_FORM_ROUTES.listing.path);
        }
      } catch {
        toast.error("Error loading checklist form");
        router.push(CHECKLIST_FORM_ROUTES.listing.path);
      } finally {
        setLoading(false);
      }
    };
  }, [formId, router]);

  useEffect(() => {
    if (isCreateMode) {
      setInitialValues({ ...EMPTY_FORM });
      setLoading(false);
      return;
    }
    if (loadForm) loadForm();
  }, [isCreateMode, loadForm]);

  const ensureQuestionId = (question, index) => {
    if (!question._id) {
      const stableKey = `question-${index}-${
        question.question || question.title || "untitled"
      }-${question.question_type || ""}`;
      return {
        ...question,
        _id: stableKey,
      };
    }
    return question;
  };

  const getTitle = () => {
    if (isCreateMode) return "Create Form";
    if (isEditMode) return "Edit Form";
    return "View Form";
  };

  const getPermissionKey = () => {
    if (isViewMode) return CHECKLIST_FORM_ROUTES.listing.permissionKey;
    return CHECKLIST_FORM_ROUTES.create.permissionKey;
  };

  const handleSubmit = async (values) => {
    const payload = mapChecklistFormToApi(values);
    try {
      if (isCreateMode) {
        const res = await createChecklistForm(payload);
        if (res.code === 200) {
          toast.success(res.message || "Created");
          router.push(CHECKLIST_FORM_ROUTES.listing.path);
          return;
        }
        throw res;
      }
      if (isEditMode && formId) {
        const res = await updateChecklistForm(formId, payload);
        if (res.code === 200) {
          toast.success(res.message || "Updated");
          router.push(CHECKLIST_FORM_ROUTES.listing.path);
          return;
        }
        throw res;
      }
    } catch (err) {
      toast.error(err?.message || "Request failed");
    }
  };

  if (loading && !isCreateMode) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer title={getTitle()}>
          <Flex p="22px">Loading…</Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={FORM_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, setFieldValue, values }) => {
            return (
              <Flex flexDirection="column" gap="22px">
                <Grid
                  templateColumns={{
                    base: "repeat(1, 1fr)",
                    md: "repeat(2, 1fr)",
                  }}
                  gap="22px"
                >
                  <CustomInput
                    label="Title"
                    isRequired
                    placeholder="Enter title"
                    name="title"
                    method="text"
                    type="text"
                    viewOnly={isViewMode}
                  />
                  <CustomInput
                    label="Select Report to"
                    isRequired
                    placeholder="Select Designation"
                    name="designation_id"
                    method="multiple-dropdown"
                    viewOnly={isViewMode}
                    options={designations
                      .sort((a, b) =>
                        a.designation_name.localeCompare(b.designation_name)
                      )
                      .map((designation) => ({
                        value: designation.designation_id,
                        label: designation.designation_name,
                      }))}
                  />
                </Grid>

                <CustomContainer title="Questions" size="sm">
                  <FieldArray
                    name="questions"
                    render={(arrayHelpers) => {
                      questionsArrayHelpersRef.current = arrayHelpers;
                      return (
                        <div>
                          <AnimatePresence mode="popLayout" initial={false}>
                            {values.questions?.map((question, index) => {
                              const questionWithId = ensureQuestionId(
                                structuredClone(question),
                                index
                              );
                              return (
                                <QuestionCard
                                  key={questionWithId._id}
                                  question={questionWithId}
                                  index={index}
                                  totalItems={values.questions?.length || 0}
                                  onMoveUp={(e) => {
                                    e.stopPropagation();
                                    if (index > 0) {
                                      const prev = values.questions[index - 1];
                                      arrayHelpers.replace(
                                        index - 1,
                                        questionWithId
                                      );
                                      arrayHelpers.replace(
                                        index,
                                        ensureQuestionId(
                                          structuredClone(prev),
                                          index
                                        )
                                      );
                                    }
                                  }}
                                  onMoveDown={(e) => {
                                    e.stopPropagation();
                                    if (
                                      index <
                                      (values.questions?.length || 0) - 1
                                    ) {
                                      const next = values.questions[index + 1];
                                      arrayHelpers.replace(
                                        index + 1,
                                        questionWithId
                                      );
                                      arrayHelpers.replace(
                                        index,
                                        ensureQuestionId(
                                          structuredClone(next),
                                          index
                                        )
                                      );
                                    }
                                  }}
                                  onRemove={(e) => {
                                    e.stopPropagation();
                                    arrayHelpers.remove(index);
                                  }}
                                  isViewMode={isViewMode}
                                  onClick={() => {
                                    setSelectedQuestion(
                                      structuredClone({
                                        ...questionWithId,
                                        index,
                                      })
                                    );
                                  }}
                                />
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      );
                    }}
                  />
                </CustomContainer>

                <Flex gap="22px" justifyContent="flex-end">
                  <Link href={CHECKLIST_FORM_ROUTES.listing.path}>
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
        <CreateQuestionModal
          viewOnly={isViewMode}
          setSelectedQuestion={setSelectedQuestion}
          selectedQuestion={selectedQuestion}
          onAddQuestion={(question) => {
            const arrayHelpers = questionsArrayHelpersRef.current;
            if (!arrayHelpers) return;
            const questionWithId = {
              ...structuredClone(question),
              _id: `question-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            };
            arrayHelpers.push(questionWithId);
          }}
          onUpdateQuestion={(question) => {
            const arrayHelpers = questionsArrayHelpersRef.current;
            if (!arrayHelpers) return;
            const questionWithId = ensureQuestionId(
              structuredClone(question),
              question.index
            );
            arrayHelpers.replace(question.index, questionWithId);
          }}
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ChecklistFormPage;
