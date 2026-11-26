import {
  Box,
  Input,
  InputGroup,
  IconButton,
  Text,
  VStack,
  Portal,
  NativeSelect,
} from "@chakra-ui/react";
import { FaTimes } from "react-icons/fa";
import React, { useState, useRef, useEffect, useMemo } from "react";

function FilterDropdown({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
  allOptionLabel,
  /** Value for the first "all / total" option (default ""). Use a non-empty value so native selects fire onChange when choosing "total" again. */
  allOptionValue = "",
  searchable = false,
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const updateMenuPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (!isSearchOpen || !searchable) return;

    updateMenuPosition();

    const handleClickOutside = (event) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsSearchOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updateMenuPosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isSearchOpen, searchable]);

  const selectedOptionLabel = useMemo(() => {
    if (!Array.isArray(options)) return "";
    return options.find((item) => item.value == value)?.label ?? "";
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    if (!searchTerm) return options;
    return options.filter((opt) =>
      String(opt.label).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleClear = () => {
    if (onChange) {
      onChange({ target: { value: allOptionValue } });
    }
    setSearchTerm("");
    setIsSearchOpen(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    // If user clears all text and there was a selected value, clear the selection
    if (newValue === "" && value !== null && value !== "") {
      if (onChange) {
        onChange({ target: { value: allOptionValue } });
      }
    }

    if (!isSearchOpen) setIsSearchOpen(true);
  };

  const handleInputBlur = () => {
    // Reset search term to show selected label when input loses focus
    if (value !== null && value !== "") {
      setSearchTerm("");
    }
  };

  const handleOptionSelect = (optionValue) => {
    if (onChange) {
      onChange({ target: { value: optionValue } });
    }
    setIsSearchOpen(false);
    setSearchTerm("");
  };

  if (searchable) {
    return (
      <VStack align="start" spacing={1}>
        <Text fontSize="xs" fontWeight="medium" color="brand600">
          {label}
        </Text>
        <>
          <InputGroup
            endElement={
              value !== null && value !== "" && !disabled ? (
                <IconButton
                  mr="-12px"
                  p="0"
                  size="xs"
                  variant="ghost"
                  color="gray.300"
                  _hover={{ color: "brand500" }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClear();
                  }}
                  aria-label="Clear selection"
                >
                  <FaTimes />
                </IconButton>
              ) : undefined
            }
          >
            <Input
              ref={inputRef}
              placeholder={placeholder || `Search ${label.toLowerCase()}...`}
              value={searchTerm || selectedOptionLabel}
              onChange={handleInputChange}
              onFocus={() => {
                updateMenuPosition();
                setIsSearchOpen(true);
              }}
              onBlur={handleInputBlur}
              disabled={disabled}
              autoComplete="off"
              color={value === "" ? "gray.400" : "black"}
            />
          </InputGroup>
          {isSearchOpen && (
            <Portal>
              <Box
                ref={menuRef}
                position="absolute"
                top={menuPosition.top}
                left={menuPosition.left}
                width={menuPosition.width}
                maxH="200px"
                mt="4px"
                bg="white"
                borderWidth="1px"
                borderRadius="md"
                borderColor="gray.200"
                boxShadow="sm"
                overflowY="auto"
                zIndex={1400}
              >
                {allOptionLabel && (
                  <Box
                    as="button"
                    type="button"
                    w="100%"
                    textAlign="left"
                    px="3"
                    py="2"
                    color="black"
                    _hover={{ bg: "gray.100" }}
                    onClick={() => handleOptionSelect(allOptionValue)}
                  >
                    <Text fontSize="sm">{allOptionLabel}</Text>
                  </Box>
                )}
                {filteredOptions.length === 0 ? (
                  <Box px="3" py="2">
                    <Text fontSize="sm" color="gray.500">
                      No results
                    </Text>
                  </Box>
                ) : (
                  filteredOptions.map((item) => (
                    <Box
                      as="button"
                      type="button"
                      key={item.value}
                      w="100%"
                      textAlign="left"
                      px="3"
                      py="2"
                      color="black"
                      _hover={{ bg: "gray.100" }}
                      onClick={() => handleOptionSelect(item.value)}
                    >
                      <Text fontSize="sm">{item.label}</Text>
                    </Box>
                  ))
                )}
              </Box>
            </Portal>
          )}
        </>
      </VStack>
    );
  }

  // Default non-searchable dropdown
  return (
    <VStack align="start" spacing={1}>
      <Text fontSize="xs" fontWeight="medium" color="brand600">
        {label}
      </Text>
      <NativeSelect.Root width="100%">
        <NativeSelect.Field
          placeholder={placeholder}
          value={value ?? ""}
          color={value === "" || value == null ? "gray.400" : "black"}
          disabled={disabled}
          onChange={onChange}
        >
          <option value={allOptionValue}>{allOptionLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </VStack>
  );
}

export default FilterDropdown;
