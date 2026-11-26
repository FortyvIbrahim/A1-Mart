import { useFormikContext } from "formik";
import React, { useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { Box, Text, VStack, IconButton, Grid } from "@chakra-ui/react";
import Image from "next/image";
import EmptyImage from "@/components/EmptyImage";
import toast from "react-hot-toast";

function ImageUploader({
  name,
  accept = { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".svg"] },
  maxSize = 5242880, // 5MB
  value,
  multiple = false,
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
      if (multiple) {
        const currentImages = Array.isArray(value)
          ? value
          : value
          ? [value]
          : [];
        const newFiles = acceptedFiles.map((file) => {
          // Create object URL for preview
          return file;
        });
        setFieldValue(name, [...currentImages, ...newFiles]);
      } else {
        if (acceptedFiles.length > 0) {
          setFieldValue(name, acceptedFiles[0]);
        }
      }
    },
    [name, setFieldValue, value, multiple, disabled]
  );

  const onDropRejected = useCallback(
    (fileRejections) => {
      const errorMessages = fileRejections.map((rejection) => {
        const { file, errors: rejectionErrors } = rejection;
        const messages = [];

        rejectionErrors.forEach((error) => {
          if (error.code === "file-too-large") {
            messages.push(
              `Image "${
                file.name
              }" is too large. Maximum size is ${formatFileSize(maxSize)}.`
            );
          } else if (error.code === "file-invalid-type") {
            messages.push(
              `Image "${file.name}" has an invalid type. Please use JPEG, PNG, GIF, WebP, or SVG.`
            );
          } else {
            messages.push(`Image "${file.name}": ${error.message}`);
          }
        });

        return messages.join(" ");
      });

      errorMessages.forEach((errorMsg) => {
        toast.error(errorMsg, { duration: 5000 });
      });
    },
    [maxSize, formatFileSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept,
    maxSize,
    multiple,
    disabled: !!disabled,
  });

  const removeImage = (index) => {
    if (disabled) return;
    if (multiple) {
      const currentImages = Array.isArray(value) ? value : value ? [value] : [];
      const updatedImages = currentImages.filter((_, i) => i !== index);
      setFieldValue(name, updatedImages.length > 0 ? updatedImages : null);
    } else {
      setFieldValue(name, null);
    }
  };

  const images = useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const getImageUrl = (image) => {
    if (image instanceof File) {
      return URL.createObjectURL(image);
    }
    if (typeof image === "string") {
      return image;
    }
    return null;
  };

  const getImageName = (image, index) => {
    if (image instanceof File) {
      return image.name;
    }
    if (typeof image === "string") {
      const parts = image.split("/");
      return parts[parts.length - 1].split("?")[0] || `Image ${index + 1}`;
    }
    return `Image ${index + 1}`;
  };

  return (
    <Box
      {...getRootProps()}
      w="100%"
      p={4}
      border="2px dashed"
      borderColor={isDragActive ? "brand.400" : "gray.300"}
      borderRadius="md"
      bg={isDragActive ? "brand.50" : "gray.50"}
      cursor={disabled ? "not-allowed" : "pointer"}
      opacity={disabled ? 0.65 : 1}
      transition="all 0.2s"
      _hover={
        disabled
          ? undefined
          : {
              borderColor: "brand.400",
              bg: "brand.50",
            }
      }
      minH={images.length > 0 ? "auto" : "120px"}
    >
      <input {...getInputProps()} />
      <VStack spacing={4} align="stretch">
        {/* Upload prompt - show when no images or always in multiple mode */}
        {images.length === 0 || multiple ? (
          <VStack spacing={2} textAlign="center">
            <i
              className="fa fa-cloud-upload"
              style={{
                fontSize: "24px",
                color: "var(--chakra-colors-brand-500)",
              }}
            />
            <Text fontSize="sm" color="gray.600">
              {isDragActive
                ? "Drop the image(s) here"
                : multiple
                ? "Drag & drop images here, or click to select"
                : "Drag & drop an image here, or click to select"}
            </Text>
            {maxSize && (
              <Text fontSize="xs" color="gray.500">
                Max size: {formatFileSize(maxSize)}
              </Text>
            )}
          </VStack>
        ) : null}

        {/* Image previews */}
        {images.length > 0 && (
          <>
            {!multiple && images.length === 1 ? (
              // Single image - centered
              <Box display="flex" justifyContent="center" alignItems="center">
                {images.map((image, index) => {
                  const imageUrl = getImageUrl(image);
                  const imageName = getImageName(image, index);

                  return (
                    <Box
                      key={index}
                      position="relative"
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      overflow="hidden"
                      bg="white"
                      maxW="300px"
                      w="100%"
                      _hover={{
                        borderColor: "brand.400",
                        boxShadow: "md",
                      }}
                      transition="all 0.2s"
                    >
                      <Box
                        position="relative"
                        width="100%"
                        paddingTop="100%"
                        bg="gray.50"
                      >
                        {imageUrl ? (
                          image instanceof File ? (
                            <Box
                              position="absolute"
                              top="0"
                              left="0"
                              right="0"
                              bottom="0"
                              padding="8px"
                            >
                              <Box
                                as="img"
                                src={imageUrl}
                                alt={imageName}
                                width="100%"
                                height="100%"
                                objectFit="contain"
                              />
                            </Box>
                          ) : (
                            <Image
                              src={imageUrl}
                              alt={imageName}
                              fill
                              style={{
                                objectFit: "contain",
                                padding: "8px",
                              }}
                            />
                          )
                        ) : (
                          <Box
                            position="absolute"
                            top="0"
                            left="0"
                            right="0"
                            bottom="0"
                          >
                            <EmptyImage width="100%" height="100%" />
                          </Box>
                        )}
                      </Box>
                      <Box p={2} borderTopWidth="1px" borderColor="gray.200">
                        <Text
                          fontSize="xs"
                          color="gray.600"
                          noOfLines={1}
                          mb={1}
                        >
                          {imageName}
                        </Text>
                        {image instanceof File && (
                          <Text fontSize="2xs" color="gray.500">
                            {formatFileSize(image.size)}
                          </Text>
                        )}
                      </Box>
                      <IconButton
                        position="absolute"
                        top={2}
                        right={2}
                        size="xs"
                        variant="solid"
                        colorPalette="red"
                        disabled={disabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        aria-label="Remove image"
                        borderRadius="full"
                        opacity={0.9}
                        _hover={{
                          opacity: 1,
                        }}
                      >
                        <i className="fa fa-times" />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              // Multiple images - grid layout
              <Grid
                templateColumns={{
                  base: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                  lg: "repeat(4, 1fr)",
                }}
                gap={4}
              >
                {images.map((image, index) => {
                  const imageUrl = getImageUrl(image);
                  const imageName = getImageName(image, index);

                  return (
                    <Box
                      key={index}
                      position="relative"
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      overflow="hidden"
                      bg="white"
                      _hover={{
                        borderColor: "brand.400",
                        boxShadow: "md",
                      }}
                      transition="all 0.2s"
                    >
                      <Box
                        position="relative"
                        width="100%"
                        paddingTop="100%"
                        bg="gray.50"
                      >
                        {imageUrl ? (
                          image instanceof File ? (
                            <Box
                              position="absolute"
                              top="0"
                              left="0"
                              right="0"
                              bottom="0"
                              padding="8px"
                            >
                              <Box
                                as="img"
                                src={imageUrl}
                                alt={imageName}
                                width="100%"
                                height="100%"
                                objectFit="contain"
                              />
                            </Box>
                          ) : (
                            <Image
                              src={imageUrl}
                              alt={imageName}
                              fill
                              style={{
                                objectFit: "contain",
                                padding: "8px",
                              }}
                            />
                          )
                        ) : (
                          <Box
                            position="absolute"
                            top="0"
                            left="0"
                            right="0"
                            bottom="0"
                          >
                            <EmptyImage width="100%" height="100%" />
                          </Box>
                        )}
                      </Box>
                      <Box p={2} borderTopWidth="1px" borderColor="gray.200">
                        <Text
                          fontSize="xs"
                          color="gray.600"
                          noOfLines={1}
                          mb={1}
                        >
                          {imageName}
                        </Text>
                        {image instanceof File && (
                          <Text fontSize="2xs" color="gray.500">
                            {formatFileSize(image.size)}
                          </Text>
                        )}
                      </Box>
                      <IconButton
                        position="absolute"
                        top={2}
                        right={2}
                        size="xs"
                        variant="solid"
                        colorPalette="red"
                        disabled={disabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        aria-label="Remove image"
                        borderRadius="full"
                        opacity={0.9}
                        _hover={{
                          opacity: 1,
                        }}
                      >
                        <i className="fa fa-times" />
                      </IconButton>
                    </Box>
                  );
                })}
              </Grid>
            )}
          </>
        )}
      </VStack>
    </Box>
  );
}

export default ImageUploader;
