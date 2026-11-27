import { useFormikContext } from "formik";
import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Box,
  Text,
  VStack,
  HStack,
  IconButton,
  Button,
} from "@chakra-ui/react";
import toast from "react-hot-toast";

function MultipleFileUploader({
  name,
  accept,
  maxSize = 5242880,
  value = [],
  disabled = false,
}) {
  const { setFieldValue } = useFormikContext();

  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }, []);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (disabled) return;
      const currentFiles = Array.isArray(value) ? value : [];
      const newFiles = acceptedFiles.map((file) => ({
        file,
        isNew: true,
        uri: null,
      }));
      setFieldValue(name, [...currentFiles, ...newFiles]);
    },
    [name, setFieldValue, value, disabled]
  );

  const onDropRejected = useCallback(
    (fileRejections) => {
      const errorMessages = fileRejections.map((rejection) => {
        const { file, errors: rejectionErrors } = rejection;
        const messages = [];

        rejectionErrors.forEach((error) => {
          if (error.code === "file-too-large") {
            messages.push(
              `File "${
                file.name
              }" is too large. Maximum size is ${formatFileSize(maxSize)}.`
            );
          } else if (error.code === "file-invalid-type") {
            const acceptedTypes = accept
              ? typeof accept === "string"
                ? accept
                : Object.keys(accept)
                    .map((key) => accept[key].join(", "))
                    .join(", ")
              : "any file type";
            messages.push(
              `File "${file.name}" has an invalid type. Accepted types: ${acceptedTypes}.`
            );
          } else if (error.code === "too-many-files") {
            messages.push(`Too many files. ${error.message}`);
          } else {
            messages.push(`File "${file.name}": ${error.message}`);
          }
        });

        return messages.join(" ");
      });

      // Show toast for each error
      errorMessages.forEach((errorMsg) => {
        toast.error(errorMsg, { duration: 5000 });
      });
    },
    [maxSize, accept, formatFileSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept,
    maxSize,
    multiple: true,
    disabled: !!disabled,
  });

  const removeFile = (index) => {
    if (disabled) return;
    const currentFiles = Array.isArray(value) ? value : [];
    const updatedFiles = currentFiles.filter((_, i) => i !== index);
    setFieldValue(name, updatedFiles);
  };

  const getFileName = (fileItem) => {
    if (typeof fileItem === "string") {
      // It's a URI string
      return fileItem.split("/").pop().split("?")[0];
    }
    if (fileItem?.file) {
      return fileItem.file.name;
    }
    if (fileItem?.uri) {
      return fileItem.uri.split("/").pop().split("?")[0];
    }
    if (fileItem?.file_url) {
      return fileItem.file_url.split("/").pop().split("?")[0];
    }
    return "-";
  };

  const isUri = (fileItem) => {
    return (
      typeof fileItem === "string" ||
      (fileItem?.uri && !fileItem?.file) ||
      (fileItem?.file_url && !fileItem?.file)
    );
  };

  return (
    <VStack spacing={3} align="stretch" w="100%">
      <Box
        {...getRootProps()}
        p={4}
        border="1.5px dashed"
        borderColor={isDragActive ? "#F47721" : "#EFA46D"}
        borderRadius="10px"
        bg={isDragActive ? "#FFF5ED" : "#FFFBF8"}
        cursor={disabled ? "not-allowed" : "pointer"}
        opacity={disabled ? 0.65 : 1}
        transition="all 0.2s"
        _hover={
          disabled
            ? undefined
            : {
                borderColor: "#F47721",
                bg: "#FFF5ED",
              }
        }
        textAlign="center"
      >
        <input {...getInputProps()} accept={accept} />
        <VStack spacing={2}>
          <i
            className="fa fa-cloud-upload"
            style={{
              fontSize: "24px",
              color: "var(--chakra-colors-brand-500)",
            }}
          />
          <Text fontSize="sm" color="gray.600">
            {isDragActive
              ? "Drop the files here"
              : "Drag & drop files here, or click to select"}
          </Text>
          {maxSize && (
            <Text fontSize="xs" color="gray.500">
              Max size: {formatFileSize(maxSize)}
            </Text>
          )}
        </VStack>
      </Box>

      {Array.isArray(value) && value.length > 0 && (
        <VStack spacing={2} align="stretch">
          {value.map((fileItem, index) => (
            <HStack
              key={index}
              p={3}
              bg="white"
              borderWidth="1px"
              borderRadius="md"
              justify="space-between"
            >
              <HStack spacing={3}>
                <i
                  className="fa fa-file"
                  style={{ color: "var(--chakra-colors-brand-500)" }}
                />
                <Text fontSize="sm" noOfLines={1}>
                  {getFileName(fileItem)}
                </Text>
                {isUri(fileItem) && (
                  <Text fontSize="xs" color="gray.500">
                    (Existing)
                  </Text>
                )}
              </HStack>
              <IconButton
                size="xs"
                variant="ghost"
                colorPalette="red"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                aria-label="Remove file"
              >
                <i className="fa fa-times" />
              </IconButton>
            </HStack>
          ))}
        </VStack>
      )}
    </VStack>
  );
}

export default MultipleFileUploader;
