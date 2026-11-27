"use client";

import useEmployee from "@/api/customHooks/useEmployee";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import TaskComments from "@/components/TaskComments";
import { capitalizeWords } from "@/utils/string";
import { Box, Button, Flex, Grid, HStack, Text, VStack } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { createTask, updateTask } from "@/api/helpers/tasks";
import useTaskById from "@/api/customHooks/useTaskById";
import { uploadAsset } from "@/api/helpers/assets";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const VALIDATION_SCHEMA = Yup.object().shape({
  title: Yup.string().required("Required"),
  description: Yup.string().required("Required"),
  status: Yup.string()
    .oneOf(["open", "in_progress", "done", "closed"])
    .required("Required"),
  priority: Yup.string()
    .oneOf(["low", "medium", "high", "urgent"])
    .required("Required"),
  assigned_to: Yup.mixed().nullable(),
  voice_note: Yup.mixed()
    .test("is-file-or-string", "Must be a valid file or URL", function (value) {
      if (!value) return true; // Optional field
      if (typeof value === "string") return true; // URL string
      if (value instanceof File || value instanceof Blob) return true; // File/Blob
      return false;
    })
    .nullable(),
});

const INITIAL_VALUES = {
  title: "",
  description: "",
  status: "open",
  priority: "medium",
  assigned_to: null,
  files: [],
  voice_note: null,
};

export default function TaskForm({ params }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { mode } = use(params);
  const taskId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const { task } = useTaskById(taskId);
  const { employees } = useEmployee({ allBranches: true });

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  const type = searchParams.get("type");
  const myTaskMode = type === "my";

  const filteredEmployees = employees
    .filter((item) => !item.terminated)
    .map((item) => ({
      value: item.employee_code,
      label: `${item.employee_code} - ${capitalizeWords(item.employee_name)}`,
    }));

  useEffect(() => {
    if ((isEditMode || isViewMode) && task) {
      // Initialize files - task.files is an array of objects with:
      // { file_id, task_id, s3_url, created_at }
      let existingFiles = [];
      if (task.files && Array.isArray(task.files)) {
        existingFiles = task.files.map((file) => ({
          id: file.file_id,
          uri: file.s3_url,
          isNew: false,
        }));
      }

      setInitialValues({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "open",
        priority: task.priority || "medium",
        assigned_to: task.assigned_to || null,
        files: existingFiles,
        voice_note: task.voice_recording || task.voice_note || null,
      });
    }
  }, [isEditMode, isViewMode, task]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Task";
    }

    if (isEditMode) {
      return "Edit Task";
    }

    return "Task Details";
  };

  const resolvedTaskId = task?.task_id ?? task?.id ?? taskId ?? "";
  const taskCode = resolvedTaskId
    ? `TASK-${String(resolvedTaskId).padStart(3, "0")}`
    : "";

  const statusLabel =
    STATUS_OPTIONS.find((opt) => opt.value === (task?.status || initialValues.status))
      ?.label ??
    task?.status ??
    "-";

  const priorityLabel =
    PRIORITY_OPTIONS.find(
      (opt) => opt.value === (task?.priority || initialValues.priority)
    )?.label ??
    task?.priority ??
    "-";

  const assignedToDisplay = (() => {
    const code = task?.assigned_to || initialValues.assigned_to;
    if (!code) return "-";
    const matched = filteredEmployees.find((emp) => emp.value == code);
    if (matched) return matched.label;
    if (task?.assigned_to_name) {
      return `${code} - ${capitalizeWords(task.assigned_to_name)}`;
    }
    return code;
  })();

  const attachedFiles = Array.isArray(initialValues.files)
    ? initialValues.files
    : [];
  const voiceNoteUrl =
    typeof initialValues.voice_note === "string"
      ? initialValues.voice_note
      : task?.voice_recording || null;

  const handleSubmit = async (values) => {
    try {
      let files = [];
      let files_to_create = [];
      let files_to_delete = [];
      let voice_recording = undefined;

      // Handle voice recording upload
      if (values.voice_note) {
        if (values.voice_note instanceof File) {
          // New recording - upload it
          const toastId = toast.loading("Uploading voice recording...");
          try {
            const response = await uploadAsset(
              values.voice_note,
              values.voice_note.name,
              "tasks",
              "audio"
            );
            toast.dismiss(toastId);
            if (response.code === 200) {
              voice_recording = response.remoteUrl;
            } else {
              throw new Error(response.message);
            }
          } catch (err) {
            toast.dismiss(toastId);
            toast.error("Error uploading voice recording!");
            throw err;
          }
        } else if (typeof values.voice_note === "string") {
          // Existing recording URL - use as is
          voice_recording = values.voice_note;
        }
      } else if (!isCreateMode && task?.voice_recording) {
        // In edit mode, if voice_note is null/undefined but task had voice_recording, it was deleted
        voice_recording = null;
      }

      if (isCreateMode) {
        // For create: upload all new files and get URIs
        if (values.files && values.files.length > 0) {
          const uploadPromises = values.files
            .filter((fileItem) => fileItem.isNew && fileItem.file)
            .map(async (fileItem) => {
              const toastId = toast.loading(
                `Uploading ${fileItem.file.name}...`
              );
              try {
                const response = await uploadAsset(
                  fileItem.file,
                  fileItem.file.name,
                  "tasks",
                  "file"
                );
                toast.dismiss(toastId);
                if (response.code === 200) {
                  return response.remoteUrl;
                } else {
                  throw new Error(response.message);
                }
              } catch (err) {
                toast.dismiss(toastId);
                toast.error(`Error uploading ${fileItem.file.name}!`);
                throw err;
              }
            });

          files = await Promise.all(uploadPromises);
        }
      } else {
        // For update: separate existing files, new files, and files to delete
        const existingFiles = values.files.filter(
          (fileItem) => !fileItem.isNew
        );

        // Get original file IDs for comparison
        const originalFiles = task.files || [];
        const originalFileIds = originalFiles
          .map((f) => f.file_id)
          .filter((id) => id !== null && id !== undefined);

        const currentFileIds = existingFiles
          .map((f) => f.id)
          .filter((id) => id !== null);

        // Files to delete: files that were in original but not in current
        files_to_delete = originalFileIds.filter(
          (id) => !currentFileIds.includes(id)
        );

        // Files to create: upload new files
        if (values.files && values.files.length > 0) {
          const newFiles = values.files.filter(
            (fileItem) => fileItem.isNew && fileItem.file
          );

          if (newFiles.length > 0) {
            const uploadPromises = newFiles.map(async (fileItem) => {
              const toastId = toast.loading(
                `Uploading ${fileItem.file.name}...`
              );
              try {
                const response = await uploadAsset(
                  fileItem.file,
                  fileItem.file.name,
                  "tasks",
                  "file"
                );
                toast.dismiss(toastId);
                if (response.code === 200) {
                  return response.remoteUrl;
                } else {
                  throw new Error(response.message);
                }
              } catch (err) {
                toast.dismiss(toastId);
                toast.error(`Error uploading ${fileItem.file.name}!`);
                throw err;
              }
            });

            files_to_create = await Promise.all(uploadPromises);
          }
        }
      }

      const data = {
        title: values.title,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        assigned_to: values.assigned_to || null,
        ...(voice_recording !== undefined
          ? { voice_recording: voice_recording }
          : {}),
        ...(isCreateMode
          ? { files: files.length > 0 ? files : undefined }
          : {
              files_to_create:
                files_to_create.length > 0 ? files_to_create : undefined,
              files_to_delete:
                files_to_delete.length > 0 ? files_to_delete : undefined,
            }),
      };

      const promise = isEditMode ? updateTask(taskId, data) : createTask(data);

      toast.promise(promise, {
        loading: isEditMode ? "Updating task..." : "Adding new task...",
        success: (response) => {
          if (response.code === 200) {
            router.push(myTaskMode ? "/tasks/mine" : "/tasks");
            return isEditMode ? "Task Updated!" : "Task Added!";
          } else {
            throw new Error(response.message);
          }
        },
        error: (err) => {
          console.error(err);
          return isEditMode ? "Error updating task!" : "Error adding task!";
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error saving task!");
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_tasks";
    }

    return "view_tasks";
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer
        pageForm
        headerBand
        title={getTitle()}
        subtitle={isViewMode && taskCode ? taskCode : undefined}
      >
        {isViewMode ? (
          <Flex direction="column" gap="20px">
            <Box
              bg="white"
              borderWidth="1px"
              borderColor="border"
              borderRadius="12px"
              p={{ base: "16px", md: "24px" }}
            >
              <Text
                fontSize="16px"
                lineHeight="22px"
                fontWeight="600"
                color="fg"
                mb="18px"
              >
                Task information
              </Text>

              <Flex direction="column" gap="18px">
                <Grid
                  templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                  gap="18px"
                >
                  <Box>
                    <Text fontSize="12px" color="fg.muted" mb="4px">
                      Title
                    </Text>
                    <Text fontSize="14px" fontWeight="500" color="fg">
                      {initialValues.title || "-"}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="12px" color="fg.muted" mb="4px">
                      Status
                    </Text>
                    <Text fontSize="14px" fontWeight="500" color="fg">
                      {statusLabel}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="12px" color="fg.muted" mb="4px">
                      Priority
                    </Text>
                    <Text fontSize="14px" fontWeight="500" color="fg">
                      {priorityLabel}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="12px" color="fg.muted" mb="4px">
                      Assigned To
                    </Text>
                    <Text fontSize="14px" fontWeight="500" color="fg">
                      {assignedToDisplay}
                    </Text>
                  </Box>
                </Grid>

                <Box>
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Description
                  </Text>
                  <Text
                    fontSize="14px"
                    fontWeight="500"
                    color="fg"
                    whiteSpace="pre-wrap"
                  >
                    {initialValues.description || "-"}
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Files
                  </Text>
                  {attachedFiles.length === 0 ? (
                    <Text fontSize="14px" fontWeight="500" color="fg">
                      No files attached
                    </Text>
                  ) : (
                    <VStack align="stretch" gap="8px">
                      {attachedFiles.map((fileItem, index) => {
                        const fileUrl =
                          typeof fileItem === "string"
                            ? fileItem
                            : fileItem?.uri || fileItem?.file_url;
                        const fileName =
                          (fileUrl && fileUrl.split("/").pop().split("?")[0]) ||
                          `File ${index + 1}`;
                        return (
                          <HStack
                            key={fileItem?.id ?? index}
                            p="8px 12px"
                            bg="#FFF5ED"
                            borderWidth="1px"
                            borderColor="border"
                            borderRadius="8px"
                            w="fit-content"
                            maxW="100%"
                          >
                            <Text
                              as="a"
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              fontSize="13px"
                              fontWeight="500"
                              color="#C95C18"
                              _hover={{ textDecoration: "underline" }}
                            >
                              {fileName}
                            </Text>
                          </HStack>
                        );
                      })}
                    </VStack>
                  )}
                </Box>

                <Box>
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Voice Note
                  </Text>
                  {voiceNoteUrl ? (
                    <audio
                      controls
                      src={voiceNoteUrl}
                      style={{ maxWidth: "400px", marginTop: "4px" }}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  ) : (
                    <Text fontSize="14px" fontWeight="500" color="fg">
                      No recording
                    </Text>
                  )}
                </Box>

                <Flex justifyContent="flex-end" pt="4px">
                  <Link href={myTaskMode ? "/tasks/mine" : "/tasks"}>
                    <Button variant="subtle">Back</Button>
                  </Link>
                </Flex>
              </Flex>
            </Box>

            {taskId && <TaskComments taskId={taskId} />}
          </Flex>
        ) : (
          <Formik
            initialValues={initialValues}
            validationSchema={VALIDATION_SCHEMA}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ handleSubmit }) => {
              return (
                <Flex flexDirection="column" gap="22px">
                  <Grid
                    templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                    gap="22px"
                  >
                    <CustomInput
                      label="Title"
                      name="title"
                      type="text"
                      isRequired
                      viewOnly={myTaskMode}
                    />
                    <CustomInput
                      label="Status"
                      name="status"
                      method="dropdown"
                      placeholder="Select status"
                      options={STATUS_OPTIONS}
                      isRequired
                    />
                    <CustomInput
                      label="Priority"
                      name="priority"
                      method="dropdown"
                      placeholder="Select priority"
                      options={PRIORITY_OPTIONS}
                      isRequired
                      viewOnly={myTaskMode}
                    />
                    <CustomInput
                      label="Assigned To"
                      name="assigned_to"
                      method="searchable-dropdown"
                      placeholder="Select employee"
                      options={filteredEmployees}
                      viewOnly={myTaskMode}
                    />
                  </Grid>
                  <CustomInput
                    label="Description"
                    name="description"
                    type="text"
                    viewOnly={myTaskMode}
                  />

                  <CustomInput
                    label="Files"
                    name="files"
                    method="multiple-files"
                    accept="*/*"
                    viewOnly={myTaskMode}
                  />

                  <CustomInput
                    label="Voice Note"
                    name="voice_note"
                    method="voice-recorder"
                  />

                  <Flex gap="22px" justifyContent="flex-end">
                    <Link href={myTaskMode ? "/tasks/mine" : "/tasks"}>
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
        )}
      </CustomContainer>

      {/* Comments Section - Edit mode */}
      {isEditMode && taskId && (
        <Box mt="20px">
          <TaskComments taskId={taskId} />
        </Box>
      )}
    </GlobalWrapper>
  );
}
