"use client";

import { useState, useRef } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { uploadAsset } from "@/api/helpers/assets";
import { useUser } from "@/contexts/UserContext";
import useTaskComments from "@/api/customHooks/useTaskComments";
import CustomContainer from "@/components/CustomContainer";
import {
  Button,
  Flex,
  Text,
  VStack,
  Box,
  HStack,
  Textarea,
  IconButton,
} from "@chakra-ui/react";
import { FaPaperclip, FaTimes } from "react-icons/fa";
import moment from "moment";
import { capitalizeWords } from "@/utils/string";

const COMMENT_INITIAL_VALUES = {
  message: "",
  files: [],
};

const COMMENT_VALIDATION_SCHEMA = Yup.object().shape({
  message: Yup.string().required("Message is required"),
  files: Yup.array().nullable(),
});

// Helper function to get user initials for avatar
const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Avatar Component
const Avatar = ({ name, size = "sm", children }) => {
  const sizeMap = {
    sm: { width: "32px", height: "32px", fontSize: "12px" },
    md: { width: "40px", height: "40px", fontSize: "14px" },
    lg: { width: "48px", height: "48px", fontSize: "16px" },
  };

  const dimensions = sizeMap[size] || sizeMap.sm;
  const displayText = children || getInitials(name);

  return (
    <Box
      width={dimensions.width}
      height={dimensions.height}
      borderRadius="full"
      bg="brand100"
      color="brand700"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      fontWeight="medium"
      fontSize={dimensions.fontSize}
    >
      {displayText}
    </Box>
  );
};

// Helper function to format time ago
const formatTimeAgo = (dateString) => {
  if (!dateString) return "-";
  const commentDate = moment(dateString);
  return commentDate.fromNow();
};

export default function TaskComments({ taskId }) {
  const fileInputRef = useRef(null);
  const { employeeData } = useUser();
  const currentUserName = employeeData?.employee_name || "You";
  const {
    comments,
    loading: loadingComments,
    addComment,
  } = useTaskComments(taskId);

  const handleCommentSubmit = async (values, { resetForm }) => {
    if (!taskId) {
      toast.error("Task ID is required to add comments");
      return;
    }

    try {
      let fileUrls = [];

      // Upload files if any
      if (values.files && values.files.length > 0) {
        const newFiles = values.files.filter(
          (fileItem) => fileItem.isNew && fileItem.file
        );

        if (newFiles.length > 0) {
          const uploadPromises = newFiles.map(async (fileItem) => {
            const toastId = toast.loading(`Uploading ${fileItem.file.name}...`);
            try {
              const response = await uploadAsset(
                fileItem.file,
                fileItem.file.name,
                "tasks/comments",
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

          fileUrls = await Promise.all(uploadPromises);
        }
      }

      const commentData = {
        message: values.message,
        files: fileUrls.length > 0 ? fileUrls : undefined,
      };

      toast.promise(addComment(commentData), {
        loading: "Adding comment...",
        success: () => {
          resetForm();
          return "Comment added successfully!";
        },
        error: (err) => {
          console.error(err);
          return err.message || "Error adding comment!";
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error adding comment!");
    }
  };

  if (!taskId) {
    return null;
  }

  return (
    <VStack gap="22px" align="stretch" w="100%" mt="22px">
      {/* Comments List - Above Input */}
      <CustomContainer title={`Comments (${comments.length})`} size="sm">
        {loadingComments ? (
          <Text fontSize="sm" color="gray.500" textAlign="center" py="16px">
            Loading comments...
          </Text>
        ) : comments.length > 0 ? (
          <VStack gap="0" align="stretch">
            {comments.map((comment, index) => (
              <Box key={comment.task_comment_id || index}>
                {index > 0 && (
                  <Box borderTop="1px solid" borderColor="gray.100" my="8px" />
                )}
                <Box py="12px" px="0">
                  <HStack align="flex-start" spacing="10px">
                    {/* User Avatar */}
                    <Avatar size="sm" name={comment.created_by_name || "User"}>
                      {getInitials(comment.created_by_name || "User")}
                    </Avatar>

                    {/* Comment Content */}
                    <Flex flex={1} direction="column" gap="6px">
                      <HStack justify="space-between" align="center">
                        <Text
                          fontSize="xs"
                          fontWeight="medium"
                          color="gray.500"
                        >
                          {capitalizeWords(comment.created_by_name) ||
                            "Unknown User"}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {formatTimeAgo(comment.created_at)}
                        </Text>
                      </HStack>

                      <Text fontSize="sm" color="gray.900" lineHeight="1.5">
                        {comment.message || "-"}
                      </Text>

                      {/* File Attachments */}
                      {comment.files && comment.files.length > 0 && (
                        <HStack spacing="8px" mt="4px" flexWrap="wrap">
                          {comment.files.map((file, fileIndex) => {
                            const fileUrl = file.file_url || file;
                            const fileName =
                              fileUrl.split("/").pop().split("?")[0] ||
                              "Attachment";
                            return (
                              <HStack
                                key={fileIndex}
                                p="4px 8px"
                                bg="gray.50"
                                borderRadius="sm"
                                borderWidth="1px"
                                borderColor="gray.200"
                                spacing="6px"
                                as="a"
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                _hover={{ bg: "gray.100" }}
                                maxW="200px"
                              >
                                <FaPaperclip
                                  size="10px"
                                  color="var(--chakra-colors-gray-500)"
                                  flexShrink={0}
                                />
                                <Text
                                  fontSize="xs"
                                  color="brand.600"
                                  _hover={{ textDecoration: "underline" }}
                                  noOfLines={1}
                                  overflow="hidden"
                                  textOverflow="ellipsis"
                                  whiteSpace="nowrap"
                                  flex={1}
                                  minW={0}
                                >
                                  {fileName}
                                </Text>
                              </HStack>
                            );
                          })}
                        </HStack>
                      )}
                    </Flex>
                  </HStack>
                </Box>
              </Box>
            ))}
          </VStack>
        ) : (
          <Text fontSize="sm" color="gray.500" textAlign="center" py="16px">
            No comments yet. Be the first to comment!
          </Text>
        )}

        <hr style={{ marginBlock: "22px" }} />

        <Formik
          initialValues={COMMENT_INITIAL_VALUES}
          validationSchema={COMMENT_VALIDATION_SCHEMA}
          onSubmit={handleCommentSubmit}
        >
          {({ handleSubmit, values, setFieldValue, errors, touched }) => {
            const handleFileChange = (e) => {
              const files = Array.from(e.target.files || []);
              const currentFiles = Array.isArray(values.files)
                ? values.files
                : [];
              const newFiles = files.map((file) => ({
                file,
                isNew: true,
                uri: null,
              }));
              setFieldValue("files", [...currentFiles, ...newFiles]);
            };

            const removeFile = (index) => {
              const currentFiles = Array.isArray(values.files)
                ? values.files
                : [];
              const updatedFiles = currentFiles.filter((_, i) => i !== index);
              setFieldValue("files", updatedFiles);
            };

            return (
              <VStack spacing="12px" align="stretch">
                <HStack align="flex-start" spacing="10px">
                  {/* Comment Input Area */}
                  <Flex flex={1} direction="column" gap="8px">
                    <Flex gap="8px" align="center">
                      <Textarea
                        placeholder="Add a comment..."
                        value={values.message}
                        onChange={(e) =>
                          setFieldValue("message", e.target.value)
                        }
                        size="xs"
                        rows={1}
                        p="12px 12px"
                        resize="none"
                        borderColor={
                          errors.message && touched.message
                            ? "red.300"
                            : "gray.200"
                        }
                        _focus={{
                          borderColor: "brand.500",
                          boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
                        }}
                      />

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                      <IconButton
                        size="sm"
                        variant="subtle"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Attach file"
                      >
                        <FaPaperclip />
                      </IconButton>
                    </Flex>

                    {errors.message && touched.message && (
                      <Text fontSize="xs" color="red.500" mt="-4px">
                        {errors.message}
                      </Text>
                    )}

                    {/* File Attachments */}
                    {values.files && values.files.length > 0 && (
                      <HStack spacing="6px" flexWrap="wrap">
                        {values.files.map((fileItem, index) => (
                          <HStack
                            key={index}
                            p="4px 8px"
                            bg="gray.50"
                            borderRadius="sm"
                            borderWidth="1px"
                            borderColor="gray.200"
                            spacing="6px"
                            maxW="180px"
                          >
                            <Text
                              fontSize="xs"
                              color="gray.700"
                              noOfLines={1}
                              overflow="hidden"
                              textOverflow="ellipsis"
                              whiteSpace="nowrap"
                              flex={1}
                              minW={0}
                            >
                              {fileItem.file?.name || "File"}
                            </Text>
                            <IconButton
                              size="xs"
                              variant="ghost"
                              onClick={() => removeFile(index)}
                              aria-label="Remove file"
                              minW="16px"
                              h="16px"
                              flexShrink={0}
                            >
                              <FaTimes size="10px" />
                            </IconButton>
                          </HStack>
                        ))}
                      </HStack>
                    )}

                    {/* Action Buttons */}
                    <HStack justify="flex-end" mt="22px">
                      <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={
                          !values.message || values.message.trim() === ""
                        }
                      >
                        Comment
                      </Button>
                    </HStack>
                  </Flex>
                </HStack>
              </VStack>
            );
          }}
        </Formik>
      </CustomContainer>
    </VStack>
  );
}
