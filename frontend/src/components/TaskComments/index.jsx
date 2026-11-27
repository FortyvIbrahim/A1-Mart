"use client";

import { useState, useRef } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { uploadAsset } from "@/api/helpers/assets";
import { useUser } from "@/contexts/UserContext";
import useTaskComments from "@/api/customHooks/useTaskComments";
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
      bg="#FFF5ED"
      color="#C95C18"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      fontWeight="600"
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
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="12px"
      p={{ base: "16px", md: "24px" }}
      w="100%"
    >
      <Text fontSize="16px" lineHeight="22px" fontWeight="600" color="fg" mb="12px">
        {`Comments (${comments.length})`}
      </Text>

      {loadingComments ? (
        <Text fontSize="13px" color="fg.muted" py="12px">
          Loading comments...
        </Text>
      ) : comments.length > 0 ? (
        <VStack gap="0" align="stretch" mb="16px">
          {comments.map((comment, index) => (
            <Box key={comment.task_comment_id || index}>
              {index > 0 && (
                <Box borderTop="1px solid" borderColor="border.subtle" my="8px" />
              )}
              <Box py="12px" px="0">
                <HStack align="flex-start" spacing="12px">
                  {/* User Avatar */}
                  <Avatar size="sm" name={comment.created_by_name || "User"}>
                    {getInitials(comment.created_by_name || "User")}
                  </Avatar>

                  {/* Comment Content */}
                  <Flex flex={1} direction="column" gap="6px">
                    <HStack justify="space-between" align="center">
                      <Text fontSize="12px" fontWeight="600" color="fg">
                        {capitalizeWords(comment.created_by_name) ||
                          "Unknown User"}
                      </Text>
                      <Text fontSize="12px" color="fg.muted">
                        {formatTimeAgo(comment.created_at)}
                      </Text>
                    </HStack>

                    <Text fontSize="13.5px" color="fg" lineHeight="1.5">
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
                              p="5px 10px"
                              bg="#FFF5ED"
                              borderRadius="8px"
                              borderWidth="1px"
                              borderColor="border"
                              spacing="6px"
                              as="a"
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              _hover={{ bg: "#FDE9DA" }}
                              maxW="220px"
                            >
                              <FaPaperclip
                                size="10px"
                                color="#C95C18"
                                flexShrink={0}
                              />
                              <Text
                                fontSize="12px"
                                color="#C95C18"
                                fontWeight="500"
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
        <Text fontSize="13px" color="fg.muted" textAlign="left" mb="16px">
          No comments yet. Be the first to comment!
        </Text>
      )}

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
            <VStack gap="12px" align="stretch">
              <Box>
                <Text fontSize="12px" fontWeight="500" color="fg.muted" mb="6px">
                  Comment
                </Text>
                <Flex gap="10px" align="center">
                  <Textarea
                    placeholder="Add a comment..."
                    value={values.message}
                    onChange={(e) => setFieldValue("message", e.target.value)}
                    rows={1}
                    minH="44px"
                    h="44px"
                    py="11px"
                    px="14px"
                    fontSize="13px"
                    bg="white"
                    borderRadius="8px"
                    resize="none"
                    borderColor={
                      errors.message && touched.message ? "red.400" : "border"
                    }
                    _focus={{
                      borderColor: "#F47721",
                      boxShadow: "none",
                    }}
                  />

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <Button
                    type="button"
                    variant="subtle"
                    h="44px"
                    px="18px"
                    flexShrink={0}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Attach
                  </Button>
                </Flex>

                {errors.message && touched.message && (
                  <Text fontSize="12px" color="red.500" mt="6px">
                    {errors.message}
                  </Text>
                )}
              </Box>

              {/* File Attachments */}
              {values.files && values.files.length > 0 && (
                <HStack spacing="6px" flexWrap="wrap">
                  {values.files.map((fileItem, index) => (
                    <HStack
                      key={index}
                      p="4px 8px"
                      bg="#FFF5ED"
                      borderRadius="8px"
                      borderWidth="1px"
                      borderColor="border"
                      spacing="6px"
                      maxW="200px"
                    >
                      <Text
                        fontSize="12px"
                        color="fg"
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
              <Flex justify="flex-start" pt="2px">
                <Button
                  type="button"
                  bg="#F47721"
                  color="white"
                  _hover={{ bg: "#E06612" }}
                  h="40px"
                  px="20px"
                  borderRadius="8px"
                  onClick={handleSubmit}
                >
                  Comment
                </Button>
              </Flex>
            </VStack>
          );
        }}
      </Formik>
    </Box>
  );
}
