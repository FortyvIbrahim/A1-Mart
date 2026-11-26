"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Box, Text, VStack, Icon, Button, HStack, Spinner } from "@chakra-ui/react";
import { FaFileExcel, FaUpload, FaTimes, FaPaste } from "react-icons/fa";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { parseStringCell } from "@/utils/importValues";

/**
 * Parse a single cell value from Excel/CSV.
 * - Date/number from xlsx: pass through (Excel already typed it).
 * - String: only parse as number (with comma strip) or date when string has / or - divider.
 */
function parseCellValue(value) {
  if (value == null) return null;
  if (value === "" || (typeof value === "string" && value.trim() === ""))
    return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? value : value;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseStringCell(value);
  return value;
}

function parseDateValues(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    if (row == null || typeof row !== "object") return row;
    const out = {};
    for (const key of Object.keys(row)) {
      out[key] = parseCellValue(row[key]);
    }
    return out;
  });
}

function CustomFileUploader({
  onFileUpload,
  uploadedFile,
  fileData,
  accept = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "application/vnd.ms-excel": [".xls"],
    "text/csv": [".csv"],
  },
  multiple = false,
  maxFiles = 1,
  color = "brand",
  size = "md",
  placeholder = "Drag & drop files here, or click to select",
  acceptedFileTypes = "Only .xlsx, .xls, and .csv files are accepted",
  showClipboardButton = false,
  triggerOnly = false,
  onOpenReady,
  onProcessingChange,
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const updateProcessing = useCallback(
    (processing) => {
      setIsProcessing(processing);
      if (typeof onProcessingChange === "function") {
        onProcessingChange(processing);
      }
    },
    [onProcessingChange]
  );
  const sizeStyles = {
    sm: {
      padding: { base: "16px", md: "20px" },
      iconSize: 6,
      fontSize: "sm",
      fontWeight: "medium",
      filePadding: "12px",
      previewPadding: "8px",
    },
    md: {
      padding: { base: "24px", md: "32px" },
      iconSize: 8,
      fontSize: "md",
      fontWeight: "semibold",
      filePadding: "16px",
      previewPadding: "12px",
    },
    lg: {
      padding: { base: "32px", md: "40px" },
      iconSize: 10,
      fontSize: "lg",
      fontWeight: "bold",
      filePadding: "20px",
      previewPadding: "16px",
    },
  };

  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        updateProcessing(true);
        const reader = new FileReader();

        const finishProcessing = () => {
          updateProcessing(false);
        };

        reader.onerror = () => {
          toast.error("Failed to read file. Please try again.");
          finishProcessing();
        };

        if (file.name.endsWith(".csv")) {
          // Handle CSV files - read as text and parse; raw so dates stay as serials, we normalize in mapping
          reader.onload = (e) => {
            try {
              const csvText = e.target.result;
              const workbook = XLSX.read(csvText, {
                type: "string",
                raw: true,
                cellDates: false,
              });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                raw: true,
                defval: "",
                cellDates: false,
              });
              const rawData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: "",
                raw: true,
              });
              const dataWithParsedDates = parseDateValues(jsonData);

              if (onFileUpload) {
                onFileUpload(file, dataWithParsedDates, rawData);
              }
            } catch (err) {
              toast.error(err?.message || "Failed to parse CSV file.");
            } finally {
              finishProcessing();
            }
          };
          reader.readAsText(file);
        } else {
          // Handle Excel files - raw + cellDates: false so date cells come as epoch (serial); we normalize in mapping
          reader.onload = (e) => {
            try {
              const data = e.target.result;
              const workbook = XLSX.read(data, {
                type: "binary",
                raw: true,
                cellDates: false,
              });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                raw: true,
                defval: "",
                cellDates: false,
              });
              const rawData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: "",
                raw: true,
              });
              const dataWithParsedDates = parseDateValues(jsonData);

              if (onFileUpload) {
                onFileUpload(file, dataWithParsedDates, rawData);
              }
            } catch (err) {
              toast.error(err?.message || "Failed to parse Excel file.");
            } finally {
              finishProcessing();
            }
          };
          reader.readAsBinaryString(file);
        }
      }
    },
    [onFileUpload, updateProcessing]
  );

  const { getRootProps, getInputProps, open, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      multiple,
      maxFiles,
    });

  useEffect(() => {
    if (triggerOnly && typeof onOpenReady === "function") {
      onOpenReady(open);
    }
  }, [triggerOnly, onOpenReady, open]);

  const removeFile = () => {
    if (onFileUpload) {
      onFileUpload(null, null);
    }
  };

  const handleClipboardPaste = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const processClipboardText = (clipboardText) => {
      if (!clipboardText || clipboardText.trim() === "") {
        toast.error("Clipboard is empty. Please copy a CSV string first.");
        return;
      }

      // Parse CSV string from clipboard - same method as file CSV parsing
      // Split by newlines and parse each line as CSV
      const lines = clipboardText
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);

      if (lines.length === 0) {
        toast.error(
          "No valid CSV lines found in clipboard. Please ensure the copied data contains CSV rows."
        );
        return;
      }

      // Parse CSV lines into array of arrays
      const parsedLines = lines.map((line) => {
        const result = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            // Handle escaped quotes ("")
            if (i + 1 < line.length && line[i + 1] === '"') {
              current += '"';
              i++; // Skip next quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim()); // Add last field
        return result;
      });

      // Convert to worksheet format (first row as headers)
      if (parsedLines.length < 2) {
        toast.error(
          "Invalid CSV format. The clipboard data must have at least a header row and one data row."
        );
        return;
      }

      const headers = parsedLines[0];
      const dataRows = parsedLines.slice(1);

      // Validate headers are not empty
      if (
        !headers ||
        headers.length === 0 ||
        headers.every((h) => !h || !h.trim())
      ) {
        toast.error(
          "Invalid CSV format. The header row appears to be empty or invalid."
        );
        return;
      }

      // Convert to array of objects matching XLSX.utils.sheet_to_json format
      // Also create structure compatible with parent handler expectations
      // Parent handler expects data starting at index 4, so we add empty rows to match
      const jsonData = [];

      // Add 4 empty objects to match the expected structure (indices 0-3 are skipped)
      for (let i = 0; i < 4; i++) {
        jsonData.push({});
      }

      // Add the actual data rows starting from index 4
      dataRows.forEach((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          // Handle various header formats and XLSX-style column names
          const cleanHeader = header.trim();
          if (cleanHeader) {
            const value = row[index] || "";
            // Add both the actual header name and XLSX-style __EMPTY_* names for compatibility
            obj[cleanHeader] = value;
            // Also map to common variations
            obj[cleanHeader.toLowerCase()] = value;
            obj[cleanHeader.toUpperCase()] = value;
          }
          // Map to XLSX column style (A=0, B=1, etc. -> __EMPTY_1, __EMPTY_2, etc.)
          // For columns after the first, XLSX uses __EMPTY_N format
          if (index > 0) {
            const xlsxCol = `__EMPTY_${index}`;
            obj[xlsxCol] = row[index] || "";
          }
        });
        jsonData.push(obj);
      });

      if (jsonData.length <= 4) {
        toast.error(
          "No valid data rows found in clipboard CSV. Please ensure the CSV contains data rows after the header."
        );
        return;
      }

      // Create a mock file object for compatibility with existing handlers
      const mockFile = {
        name: "clipboard.csv",
        size: clipboardText.length,
        type: "text/csv",
      };

      // Create raw data array (parsedLines is already the raw data)
      const rawData = parsedLines;

      const dataWithParsedDates = parseDateValues(jsonData);

      if (onFileUpload) {
        onFileUpload(mockFile, dataWithParsedDates, rawData);
      }
    };

    // Fallback method using paste event (works on Windows)
    const usePasteEventMethod = () => {
      // Create a temporary textarea element
      const textarea = document.createElement("textarea");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.style.opacity = "0";
      textarea.setAttribute("readonly", "");
      document.body.appendChild(textarea);

      // Show toast with instructions
      toast.loading(
        "Please press Ctrl+V (or Cmd+V on Mac) to paste your data...",
        {
          id: "paste-instruction",
        }
      );

      // Listen for paste event
      const handlePaste = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const pastedText =
          event.clipboardData?.getData("text/plain") ||
          textarea.value ||
          window.getSelection()?.toString();

        // Clean up
        if (document.body.contains(textarea)) {
          document.body.removeChild(textarea);
        }
        document.removeEventListener("paste", handlePaste);
        toast.dismiss("paste-instruction");

        if (pastedText && pastedText.trim()) {
          processClipboardText(pastedText);
        } else {
          toast.error(
            "No data was pasted. Please copy your CSV data and try again."
          );
        }
      };

      // Listen for paste event
      document.addEventListener("paste", handlePaste, { once: true });

      // Focus the textarea (this helps with paste detection)
      setTimeout(() => {
        textarea.focus();
        textarea.select();

        // If nothing was pasted after 10 seconds, clean up and show error
        setTimeout(() => {
          if (document.body.contains(textarea)) {
            document.body.removeChild(textarea);
            document.removeEventListener("paste", handlePaste);
            toast.dismiss("paste-instruction");
            toast.error(
              "Paste timeout. Please try again and make sure to press Ctrl+V (or Cmd+V on Mac) after clicking the button."
            );
          }
        }, 10000);
      }, 100);
    };

    // Try modern Clipboard API first
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.readText === "function"
    ) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        processClipboardText(clipboardText);
      } catch (error) {
        // If Clipboard API fails, fall back to paste event method
        if (
          error.name === "NotAllowedError" ||
          error.name === "SecurityError" ||
          error.name === "TypeError"
        ) {
          // Fall back to paste event method
          usePasteEventMethod();
        } else {
          toast.error(
            `Error reading from clipboard: ${
              error.message || "Unknown error"
            }. Please try using the file upload option instead.`
          );
          console.error("Clipboard error:", error);
        }
      }
    } else {
      // Fall back to paste event method if Clipboard API is not available
      usePasteEventMethod();
    }
  };

  if (triggerOnly) {
    return (
      <Box
        position="absolute"
        width={0}
        height={0}
        overflow="hidden"
        aria-hidden
      >
        <Box {...getRootProps()}>
          <input {...getInputProps()} />
        </Box>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {!uploadedFile && isProcessing && (
        <Box
          p={sizeStyles[size].padding}
          border="2px dashed"
          borderColor={`${color}.300`}
          borderRadius="lg"
          bg={`${color}.25`}
          textAlign="center"
        >
          <VStack spacing={4}>
            <Spinner size="xl" colorPalette={color} />
            <VStack spacing={1}>
              <Text
                fontSize={sizeStyles[size].fontSize}
                fontWeight={sizeStyles[size].fontWeight}
                color={`${color}.700`}
              >
                Processing file...
              </Text>
              <Text fontSize="sm" color={`${color}.600`}>
                Please wait while we read your file
              </Text>
            </VStack>
          </VStack>
        </Box>
      )}

      {/* File Upload Area */}
      {!uploadedFile && !isProcessing && (
        <Box
          {...getRootProps()}
          p={sizeStyles[size].padding}
          border="2px dashed"
          borderColor={
            isDragActive
              ? `${color}.400`
              : isDragReject
              ? "red.400"
              : `${color}.300`
          }
          borderRadius="lg"
          bg={
            isDragActive
              ? `${color}.50`
              : isDragReject
              ? "red.50"
              : `${color}.25`
          }
          cursor="pointer"
          transition="all 0.2s"
          _hover={{
            borderColor: `${color}.400`,
            bg: `${color}.50`,
          }}
          textAlign="center"
        >
          <input {...getInputProps()} />
          <VStack spacing={4}>
            <Icon
              as={FaUpload}
              boxSize={sizeStyles[size].iconSize}
              color={`${color}.400`}
            />
            <VStack spacing={2}>
              <Text
                fontSize={sizeStyles[size].fontSize}
                fontWeight={sizeStyles[size].fontWeight}
                color={`${color}.700`}
              >
                {isDragActive ? "Drop the file here..." : placeholder}
              </Text>
              <Text fontSize="sm" color={`${color}.600`}>
                {acceptedFileTypes}
              </Text>
            </VStack>

            {/* Clipboard Import Button */}
            {showClipboardButton && !uploadedFile && (
              <>
                <Text fontSize="sm" color={`${color}.600`}>
                  or
                </Text>
                <Button
                  leftIcon={<FaPaste />}
                  onClick={handleClipboardPaste}
                  colorScheme={color}
                  size={size}
                  variant="outline"
                >
                  Paste from Clipboard
                </Button>
              </>
            )}
          </VStack>
        </Box>
      )}

      {/* Uploaded File Display */}
      {uploadedFile && (
        <Box
          p={sizeStyles[size].filePadding}
          bg={`${color}.50`}
          border="1px solid"
          borderColor={`${color}.200`}
          borderRadius="md"
        >
          <VStack spacing={3} align="left">
            {fileData && (
              <Text fontSize="sm" color={`${color}.700`} textAlign="left">
                File loaded successfully! {fileData.length} rows found.
              </Text>
            )}

            <HStack justify="space-between" w="100%">
              <HStack spacing={3}>
                <VStack align="start" gap={-1}>
                  <Text fontWeight="semibold" color={`${color}.800`}>
                    {uploadedFile.name}
                  </Text>
                  <Text fontSize="sm" color={`${color}.600`}>
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </Text>
                </VStack>
              </HStack>
              <Button
                size="sm"
                variant="ghost"
                colorScheme="red"
                onClick={removeFile}
                leftIcon={<FaTimes />}
              >
                Remove
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}
    </VStack>
  );
}

export default CustomFileUploader;
