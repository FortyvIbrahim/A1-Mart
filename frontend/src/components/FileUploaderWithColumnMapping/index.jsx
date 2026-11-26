"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import CustomFileUploader from "@/components/CustomInput/CustomFileUploader";
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Text,
  VStack,
  HStack,
  Box,
  Flex,
  NativeSelect,
  Field,
} from "@chakra-ui/react";
import { FaTimes, FaCheck } from "react-icons/fa";
import toast from "react-hot-toast";
import { normalizeImportValueForColumn } from "@/utils/importValues";

/**
 * FileUploaderWithColumnMapping Component
 *
 * A component that uses CustomFileUploader to upload files, then opens a dialog
 * to map file columns to target columns. Returns mapped data as an array of objects.
 *
 * @param {Object} props
 * @param {Array<{key: string, label: string, required?: boolean, suggestedKey?: string, type?: 'date'|'number'|'string'}>} props.targetColumns - Array of target columns to map to. Each object should have 'key' and 'label' properties. Optional: 'required', 'suggestedKey', and 'type' ('date' | 'number' | 'string'). If type is set, values are converted accordingly; otherwise date conversion only runs when the column name/label/key contains date-related text (e.g. date, dob, day).
 * @param {Function} props.onDataMapped - Callback function that receives the mapped data array. Called when mapping is confirmed.
 * @param {Object} props.fileUploaderProps - Additional props to pass to CustomFileUploader
 * @param {boolean} props.disabled - If true, prevents file uploads and shows an error message when user tries to upload
 * @param {Function} [props.renderer] - Optional render function receiving { openFileSelector }. When provided, this view is rendered instead of the default dropzone; use openFileSelector() to open the file dialog.
 * @param {boolean} props.showToast - If true, shows a success toast when the mapping is confirmed.
 * @param {Function} [props.customParser] - Optional. When provided, the column mapping dialog is still shown; on confirm, raw rows are reordered to match target column order, then customParser(reorderedRawRows) is called and the result is passed to onDataMapped. Requires targetColumns so the user can map file columns to the expected order.
 * @param {Function} [props.onFileSelected] - Called when a file is selected with the file object (or null when cleared).
 * @param {Function} [props.onProcessingChange] - Called with true/false while the uploaded file is being read and parsed.
 * @returns {JSX.Element}
 *
 * @example
 * ```jsx
 * <FileUploaderWithColumnMapping
 *   targetColumns={[
 *     { key: 'name', label: 'Full Name', required: true, suggestedKey: 'name' },
 *     { key: 'dob', label: 'Date of Birth', type: 'date' },
 *     { key: 'amount', label: 'Amount', type: 'number' },
 *     { key: 'notes', label: 'Notes', type: 'string' }
 *   ]}
 *   onDataMapped={(mappedData) => { ... }}
 * />
 * ```
 */
function FileUploaderWithColumnMapping({
  targetColumns = [],
  onDataMapped,
  fileUploaderProps = {},
  disabled = false,
  renderer,
  showToast = true,
  customParser,
  onFileSelected,
  onProcessingChange,
}) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [columnMapping, setColumnMapping] = useState({});
  const [fileColumns, setFileColumns] = useState([]);
  const openRef = useRef(null);

  const openFileSelector = useCallback(() => {
    if (typeof openRef.current === "function") {
      openRef.current();
    }
  }, []);

  // Extract column names from uploaded file
  useEffect(() => {
    if (fileData && fileData.length > 0) {
      // Get all unique keys from the first data object

      const fileDataKeys = fileData.map((item, index) => ({
        totalKeys: Object.keys(item).length,
        index,
      }));
      const properDataIndex = fileDataKeys.sort(
        (a, b) => b.totalKeys - a.totalKeys
      )[0].index;

      const columns = Object.keys(fileData[properDataIndex]).filter(
        (key) => key && key.trim() !== ""
      );
      setFileColumns(columns);
      setIsMappingDialogOpen(true);

      // Initialize mapping with suggested keys or empty values
      const initialMapping = {};
      targetColumns.forEach((col) => {
        // If suggestedKey is provided, try to find a matching column
        if (col.suggestedKey) {
          // Try exact match first (case-insensitive)
          const exactMatch = columns.find(
            (fileCol) =>
              fileCol.toLowerCase().trim() ===
              col.suggestedKey.toLowerCase().trim()
          );
          if (exactMatch) {
            initialMapping[col.key] = exactMatch;
          } else {
            // Try partial match (contains the suggested key)
            const partialMatch = columns.find(
              (fileCol) =>
                fileCol
                  .toLowerCase()
                  .includes(col.suggestedKey.toLowerCase()) ||
                col.suggestedKey.toLowerCase().includes(fileCol.toLowerCase())
            );
            initialMapping[col.key] = partialMatch || "";
          }
        } else {
          initialMapping[col.key] = "";
        }
      });
      setColumnMapping(initialMapping);
    }
  }, [fileData, targetColumns]);

  const handleFileUpload = (file, data, raw) => {
    if (disabled) {
      toast.error("Please clear existing data before uploading a new file");
      return;
    }

    if (!file || !data) {
      setUploadedFile(null);
      setFileData(null);
      setRawData(null);
      setIsMappingDialogOpen(false);
      if (typeof onFileSelected === "function") onFileSelected(null);
      return;
    }

    setUploadedFile(file);
    setFileData(data);
    setRawData(raw);
    if (typeof onFileSelected === "function") onFileSelected(file);
  };

  const handleMappingChange = (targetColumnKey, fileColumnName) => {
    setColumnMapping((prev) => ({
      ...prev,
      [targetColumnKey]: fileColumnName,
    }));
  };

  const handleConfirmMapping = () => {
    // Validate that all required columns are mapped
    const unmappedRequiredColumns = targetColumns.filter(
      (col) =>
        col.required &&
        (!columnMapping[col.key] || columnMapping[col.key] === "")
    );

    if (unmappedRequiredColumns.length > 0) {
      toast.error(
        `Please map all required columns. Unmapped: ${unmappedRequiredColumns
          .map((c) => c.label)
          .join(", ")}`
      );
      return;
    }

    try {
      if (typeof customParser === "function" && rawData != null && Array.isArray(rawData) && rawData.length > 0) {
        const headerRow = rawData[0];
        const cellStr = (v) =>
          v == null ? "" : (typeof v === "string" ? v.trim() : String(v).trim());
        const getRawIndex = (fileColName) =>
          headerRow.findIndex((c) => cellStr(c) === (fileColName || "").trim());

        const reorderedRows = rawData.map((row) =>
          targetColumns.map((_, i) => {
            const fileCol = columnMapping[targetColumns[i].key];
            const idx = getRawIndex(fileCol);
            return idx >= 0 ? (row[idx] ?? "") : "";
          })
        );

        const parsed = customParser(reorderedRows);
        if (parsed != null && onDataMapped) {
          onDataMapped(parsed);
          showToast && toast.success("File parsed successfully");
        }
      } else {
        // Transform the data based on mapping: apply type/column-aware conversion
        const mappedData = fileData.map((row) => {
          const mappedRow = {};
          targetColumns.forEach((targetCol) => {
            const sourceColumn = columnMapping[targetCol.key];
            const raw =
              sourceColumn && sourceColumn !== ""
                ? row[sourceColumn] ?? null
                : null;
            mappedRow[targetCol.key] = normalizeImportValueForColumn(
              raw,
              targetCol,
              sourceColumn ?? ""
            );
          });
          return mappedRow;
        });

        if (onDataMapped) {
          onDataMapped(mappedData);
        }
        showToast && toast.success(`Successfully mapped ${mappedData.length} rows`);
      }

      // Close dialog and clear states that trigger the dialog
      setIsMappingDialogOpen(false);
      setFileData(null);
      setRawData(null);
      setColumnMapping({});
      setFileColumns([]);
      setUploadedFile(null);
    } catch (err) {
      toast.error(err?.message || "Failed to parse file");
    }
  };

  const handleCancelMapping = () => {
    setIsMappingDialogOpen(false);
    setUploadedFile(null);
    setFileData(null);
    setRawData(null);
    setColumnMapping({});
    setFileColumns([]);
  };

  // Create options for dropdown (include empty option)
  const fileColumnOptions = useMemo(() => {
    return [
      { value: "", label: "Select column..." },
      ...fileColumns.map((col) => ({
        value: col,
        label: col,
      })),
    ];
  }, [fileColumns]);

  const fileUploader = (
    <CustomFileUploader
      onFileUpload={handleFileUpload}
      uploadedFile={uploadedFile}
      fileData={fileData}
      triggerOnly={!!renderer}
      onOpenReady={
        renderer
          ? (open) => {
              openRef.current = open;
            }
          : undefined
      }
      onProcessingChange={onProcessingChange}
      {...fileUploaderProps}
    />
  );

  return (
    <>
      {renderer ? (
        <>
          {fileUploader}
          {renderer({ openFileSelector })}
        </>
      ) : (
        fileUploader
      )}

      {/* Column Mapping Dialog */}
      {isMappingDialogOpen && (
        <Flex
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={1000}
          justifyContent="center"
          alignItems="center"
          h="100dvh"
        >
          <Dialog.Root
            open={isMappingDialogOpen}
            onOpenChange={(e) => {
              if (!e.open) {
                handleCancelMapping();
              }
            }}
          >
            <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <DialogContent
              mx={4}
              borderRadius="6px"
              overflow="hidden"
              maxW="2xl"
              maxH="90vh"
            >
              <DialogHeader pb={2}>
                <HStack spacing={3}>
                  <Text fontSize="md" fontWeight="semibold" color="gray.800">
                    Map Columns
                  </Text>
                </HStack>
              </DialogHeader>

              <DialogBody pt={4} overflowY="auto">
                <VStack spacing={4} align="stretch">
                  <Text color="gray.600" fontSize="sm" lineHeight="1.5" mb={2}>
                    Map the columns from your file to the target columns. Select
                    which file column corresponds to each target column.
                  </Text>

                  {targetColumns.map((targetCol) => (
                    <Field.Root key={targetCol.key} orientation="vertical">
                      <Field.Label
                        fontSize="sm"
                        fontWeight="medium"
                        color="gray.700"
                      >
                        {targetCol.label}
                        {targetCol.required && (
                          <Text as="span" color="red.500" ml={1}>
                            *
                          </Text>
                        )}
                      </Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={columnMapping[targetCol.key] || ""}
                          onChange={(e) =>
                            handleMappingChange(targetCol.key, e.target.value)
                          }
                          color={
                            columnMapping[targetCol.key] ? "black" : "gray.400"
                          }
                        >
                          {fileColumnOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                  ))}

                  {fileColumns.length === 0 && (
                    <Box
                      p={3}
                      bg="yellow.50"
                      borderWidth="1px"
                      borderColor="yellow.200"
                      borderRadius="md"
                    >
                      <Text fontSize="sm" color="yellow.800">
                        No columns found in the uploaded file. Please check the
                        file format.
                      </Text>
                    </Box>
                  )}
                </VStack>
              </DialogBody>

              <DialogFooter pt={4} gap={3}>
                <Button
                  variant="outline"
                  colorScheme="gray"
                  onClick={handleCancelMapping}
                  leftIcon={<FaTimes />}
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="brand"
                  onClick={handleConfirmMapping}
                  leftIcon={<FaCheck />}
                >
                  Confirm Mapping
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog.Root>
        </Flex>
      )}
    </>
  );
}

export default FileUploaderWithColumnMapping;
