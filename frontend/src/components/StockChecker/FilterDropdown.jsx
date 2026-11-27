import {
  Box,
  Flex,
  Input,
  InputGroup,
  IconButton,
  Text,
  VStack,
  Portal,
} from "@chakra-ui/react";
import { FaTimes } from "react-icons/fa";
import { LuCheck, LuChevronDown, LuChevronUp } from "react-icons/lu";
import React, { useState, useRef, useEffect, useMemo } from "react";
import CustomSelect from "@/components/CustomSelect";

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
              ) : (
                <Box color="#C95C18" pointerEvents="none" display="flex">
                  {isSearchOpen ? <LuChevronUp size={15} /> : <LuChevronDown size={15} />}
                </Box>
              )
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
              borderColor={isSearchOpen ? "#F47721" : "border"}
              color={value === "" ? "fg.muted" : "fg"}
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
                maxH="240px"
                mt="6px"
                bg="white"
                borderWidth="1px"
                borderRadius="12px"
                borderColor="border"
                p="6px"
                boxShadow="0 12px 32px rgba(31, 41, 55, 0.12), 0 2px 6px rgba(244, 119, 33, 0.06)"
                overflowY="auto"
                zIndex={1500}
              >
                {allOptionLabel && (
                  <Flex
                    as="button"
                    type="button"
                    w="100%"
                    alignItems="center"
                    justifyContent="space-between"
                    gap="8px"
                    px="12px"
                    py="9px"
                    borderRadius="8px"
                    bg={value === allOptionValue || value === "" || value == null ? "#FFF5ED" : "transparent"}
                    color={value === allOptionValue || value === "" || value == null ? "#C95C18" : "fg"}
                    fontSize="13px"
                    fontWeight={value === allOptionValue || value === "" || value == null ? "500" : "400"}
                    _hover={{ bg: "#FFF5ED" }}
                    onClick={() => handleOptionSelect(allOptionValue)}
                  >
                    <Text truncate>{allOptionLabel}</Text>
                    {(value === allOptionValue || value === "" || value == null) && (
                      <Box color="#F47721" flexShrink={0} display="flex">
                        <LuCheck size={15} />
                      </Box>
                    )}
                  </Flex>
                )}
                {filteredOptions.length === 0 ? (
                  <Box px="12px" py="10px">
                    <Text fontSize="13px" color="fg.muted">
                      No results
                    </Text>
                  </Box>
                ) : (
                  filteredOptions.map((item) => {
                    const selected = value != null && value !== "" && String(value) === String(item.value);
                    return (
                      <Flex
                        as="button"
                        type="button"
                        key={item.value}
                        w="100%"
                        alignItems="center"
                        justifyContent="space-between"
                        gap="8px"
                        px="12px"
                        py="9px"
                        borderRadius="8px"
                        bg={selected ? "#FFF5ED" : "transparent"}
                        color={selected ? "#C95C18" : "fg"}
                        fontSize="13px"
                        fontWeight={selected ? "500" : "400"}
                        _hover={{ bg: "#FFF5ED" }}
                        onClick={() => handleOptionSelect(item.value)}
                      >
                        <Text truncate>{item.label}</Text>
                        {selected && (
                          <Box color="#F47721" flexShrink={0} display="flex">
                            <LuCheck size={15} />
                          </Box>
                        )}
                      </Flex>
                    );
                  })
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
    <VStack align="start" spacing={1} w="100%">
      <Text fontSize="xs" fontWeight="medium" color="brand600">
        {label}
      </Text>
      <CustomSelect
        h="44px"
        fontSize="13px"
        value={value ?? allOptionValue}
        emptyValue={allOptionValue}
        emptyLabel={allOptionLabel}
        placeholder={placeholder || allOptionLabel}
        options={options}
        disabled={disabled}
        onChange={(val) => onChange?.({ target: { value: val } })}
        ariaLabel={label}
      />
    </VStack>
  );
}

export default FilterDropdown;
