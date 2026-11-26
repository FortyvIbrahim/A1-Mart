"use client";

import CustomDrawer from "@/components/CustomDrawer";
import CustomInput from "@/components/CustomInput";
import { Box, Button, Flex, Grid, Tabs, Text } from "@chakra-ui/react";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";

const VALIDATION_SCHEMA = Yup.object().shape({
  question: Yup.string().required("Required"),
  description: Yup.string().nullable(),
  fill_at_from: Yup.string().nullable(),
  fill_at_to: Yup.string().nullable(),
  question_type: Yup.string()
    .oneOf(
      ["boolean", "numeric", "text", "media", "date", "date_time"],
      "Invalid question type"
    )
    .required("Required"),
  is_required: Yup.boolean(),
  record_audio: Yup.boolean(),
  take_image: Yup.boolean(),
  is_image_optional: Yup.boolean(),
  take_video: Yup.boolean(),
  is_video_optional: Yup.boolean(),
  allow_comment: Yup.boolean(),
  is_comment_optional: Yup.boolean(),
});

const INITIAL_VALUES = {
  question: "",
  description: "",
  fill_at_from: "",
  fill_at_to: "",
  question_type: "",
  is_required: false,
  record_audio: false,
  take_image: false,
  is_image_optional: false,
  take_video: false,
  is_video_optional: false,
  allow_comment: false,
  is_comment_optional: false,
};

const QUESTION_TYPE_OPTIONS = [
  { value: "boolean", label: "Boolean" },
  { value: "numeric", label: "Numeric" },
  { value: "text", label: "Text" },
  { value: "media", label: "Media" },
  { value: "date", label: "Date" },
  { value: "date_time", label: "DateTime" },
];

const ValidationTab = memo(function ValidationTab({
  values,
  setFieldValue,
  viewOnly,
}) {
  const hasImage = Boolean(values.take_image);
  const hasVideo = Boolean(values.take_video);
  const hasComment = Boolean(values.allow_comment);

  return (
    <Grid templateColumns="repeat(1, 1fr)" gap="18px" pb="10px" mt="16px">
      <CustomInput
        label="Required"
        name="is_required"
        method="switch"
        labelOrientation="horizontal"
        labelStyle={{ w: "200px !important" }}
        viewOnly={viewOnly}
      />

      {/* <CustomInput
        label="Record audio"
        name="record_audio"
        method="switch"
        labelOrientation="horizontal"
        labelStyle={{ w: "200px !important" }}
        viewOnly={viewOnly}
      /> */}

      <CustomInput
        label="Take image"
        name="take_image"
        method="switch"
        labelOrientation="horizontal"
        labelStyle={{ w: "200px !important" }}
        viewOnly={viewOnly}
        onChange={(e) => {
          const next = Boolean(e?.target?.checked);
          if (!next) setFieldValue("is_image_optional", false);
        }}
      />
      {hasImage && (
        <CustomInput
          label="Image optional"
          name="is_image_optional"
          method="switch"
          labelOrientation="horizontal"
          labelStyle={{ w: "200px !important" }}
          viewOnly={viewOnly}
        />
      )}

      <CustomInput
        label="Take video"
        name="take_video"
        method="switch"
        labelOrientation="horizontal"
        labelStyle={{ w: "200px !important" }}
        viewOnly={viewOnly}
        onChange={(e) => {
          const next = Boolean(e?.target?.checked);
          if (!next) setFieldValue("is_video_optional", false);
        }}
      />
      {hasVideo && (
        <CustomInput
          label="Video optional"
          name="is_video_optional"
          method="switch"
          labelOrientation="horizontal"
          labelStyle={{ w: "200px !important" }}
          viewOnly={viewOnly}
        />
      )}

      <CustomInput
        label="Allow comment"
        name="allow_comment"
        method="switch"
        labelOrientation="horizontal"
        labelStyle={{ w: "200px !important" }}
        viewOnly={viewOnly}
        onChange={(e) => {
          const next = Boolean(e?.target?.checked);
          if (!next) setFieldValue("is_comment_optional", false);
        }}
      />
      {hasComment && (
        <CustomInput
          label="Comment optional"
          name="is_comment_optional"
          method="switch"
          labelOrientation="horizontal"
          labelStyle={{ w: "200px !important" }}
          viewOnly={viewOnly}
        />
      )}
    </Grid>
  );
});

const QuestionForm = memo(function QuestionForm({
  values,
  setFieldValue,
  shouldShowScoreWeightage,
  viewOnly,
}) {
  return (
    <Grid gap="22px">
      <CustomInput
        label="Title"
        placeholder="Enter question"
        name="question"
        method="text"
        type="text"
        viewOnly={viewOnly}
      />
      <CustomInput
        label="Description"
        placeholder="Enter description"
        name="description"
        method="text"
        type="text"
        viewOnly={viewOnly}
      />

      <CustomInput
        label="Fill At"
        name="fill_at"
        method="timeframe"
        fromName="fill_at_from"
        toName="fill_at_to"
        viewOnly={viewOnly}
      />

      <CustomInput
        label="Question Type"
        placeholder="Select question type"
        name="question_type"
        method="dropdown"
        options={QUESTION_TYPE_OPTIONS}
        viewOnly={viewOnly}
      />

      <Tabs.Root defaultValue="validation" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="validation">Validation</Tabs.Trigger>
          {shouldShowScoreWeightage(values) && (
            <Tabs.Trigger value="score_weightage">Score Weightage</Tabs.Trigger>
          )}
        </Tabs.List>
        <Tabs.Content value="validation">
          <ValidationTab
            values={values}
            setFieldValue={setFieldValue}
            viewOnly={viewOnly}
          />
        </Tabs.Content>
        <Tabs.Content value="score_weightage">
          <Box mt="16px">
            <Text fontSize="sm" color="gray.600">
              Score weightage configuration stays the same.
            </Text>
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Grid>
  );
});

function CreateQuestionModal({
  onAddQuestion,
  selectedQuestion,
  setSelectedQuestion,
  onUpdateQuestion,
  viewOnly = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  const isNewQuestion = !selectedQuestion;

  useEffect(() => {
    if (selectedQuestion) {
      setIsOpen(true);
      setInitialValues(selectedQuestion);
    } else {
      setInitialValues(INITIAL_VALUES);
    }
  }, [selectedQuestion]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedQuestion(null);
    }
  }, [isOpen]);

  const shouldShowScoreWeightage = useCallback((values) => {
    switch (values?.question_type) {
      case "boolean":
        return true;
      default:
        return false;
    }
  }, []);

  const handleSubmit = useCallback(
    (values) => {
      if (viewOnly) return;
      setIsOpen(false);

      if (isNewQuestion) {
        onAddQuestion(values);
      } else {
        onUpdateQuestion(values);
      }
    },
    [isNewQuestion, onAddQuestion, onUpdateQuestion, viewOnly]
  );

  const drawerTitle = useMemo(() => {
    if (viewOnly) return "View Question";
    return isNewQuestion ? "Create Question" : "Edit Question";
  }, [isNewQuestion, viewOnly]);

  /**
   * Formik must wrap only the drawer body, not the trigger. When this modal lived inside the
   * checklist form's Formik, nested providers caused CustomInput to bind to the outer form
   * (e.g. name="question" not under questions[]), so the question title could not be edited.
   */
  return (
    <CustomDrawer
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      size="md"
      title={drawerTitle}
      content={
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, setFieldValue }) => (
            <Form style={{ width: "100%" }}>
              <QuestionForm
                values={values}
                setFieldValue={setFieldValue}
                shouldShowScoreWeightage={shouldShowScoreWeightage}
                viewOnly={viewOnly}
              />
              <Flex gap="22px" justifyContent="flex-end" mt="24px">
                <Button
                  variant="subtle"
                  type="button"
                  onClick={() => setIsOpen(false)}
                >
                  {viewOnly ? "Close" : "Back"}
                </Button>
                {!viewOnly && (
                  <Button type="submit">
                    {isNewQuestion ? "Create" : "Update"}
                  </Button>
                )}
              </Flex>
            </Form>
          )}
        </Formik>
      }
      footer={null}
    >
      {!viewOnly && (
        <Button
          size="xs"
          onClick={() => {
            setSelectedQuestion(null);
            setInitialValues(structuredClone(INITIAL_VALUES));
            setIsOpen(true);
          }}
        >
          Add Question
        </Button>
      )}
    </CustomDrawer>
  );
}

export default CreateQuestionModal;
