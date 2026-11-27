"use client";

import { LuCheck, LuChevronDown, LuChevronUp } from "react-icons/lu";
import CustomSelect from "@/components/CustomSelect";
import { getNestedValue } from "@/utils/object";
import {
  Box,
  Button,
  Field,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Switch,
  RadioGroup,
  Text,
  Portal,
  Grid,
  Checkbox,
  Wrap,
} from "@chakra-ui/react";
import { FaTimes } from "react-icons/fa";
import { ErrorMessage, FormikContext } from "formik";
import moment from "moment";
import React, {
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DatePicker from "react-datepicker";
import FileUploader from "./FileUploader";
import MultipleFileUploader from "./MultipleFileUploader";
import ImageUploader from "./ImageUploader";
import VoiceRecorder from "./VoiceRecorder";
import {
  GoogleLocationPickerModal,
  parseLocationValue,
} from "@/components/GoogleLocationPicker";
import { loadGoogleMaps } from "@/components/GoogleLocationPicker/loadGoogleMaps";
import Link from "next/link";
import Image from "next/image";
import EmptyImage from "@/components/EmptyImage";
import { VStack } from "@chakra-ui/react";

// all available methods are:
// date-picker
// dropdown
// searchable-dropdown
// multiple-dropdown
// file
// multiple-files
// image-upload
// voice-recorder
// radio
// checkbox-group (options = [{ value, label }], value = array of selected values)
// switch

export const CustomDateTimeInput = forwardRef(
  (
    {
      value,
      onClick,
      onChange,
      variant = "outline",
      style,
      disabled,
      placeholder,
      format = undefined,
      type = "date",
    },
    ref
  ) => {
    const getFormat = () => {
      if (type === "month") {
        return "MMM YYYY";
      }
      return "DD/MM/YYYY";
    };

    // Figma date field: placeholder in #637188 with an orange chevron.
    return (
      <Box position="relative" w="100%">
        <Input
          value={value ? moment(value, format).format(getFormat()) : ""}
          onChange={onChange}
          autoComplete="off"
          ref={ref}
          onClick={onClick}
          variant={variant}
          style={style}
          flex={1}
          pr="36px"
          disabled={disabled}
          placeholder={placeholder}
          _placeholder={{ color: "fg.muted" }}
        />
        {!value && (
          <Box
            position="absolute"
            right="12px"
            top="50%"
            transform="translateY(-50%)"
            color="#C95C18"
            pointerEvents="none"
            display="flex"
          >
            <LuChevronDown size={16} />
          </Box>
        )}
      </Box>
    );
  }
);
CustomDateTimeInput.displayName = "CustomDateTimeInput";

function CustomInput({
  name,
  method,
  placeholder,
  options = [],
  isRequired = false,
  labelOrientation = "vertical",
  label,
  onChange,
  viewOnly = false,
  labelStyle,
  rightAddon,
  errorPosition = "top",
  customRender,
  showClearButton = false,
  debounceMs,
  menuPortalRef,
  ...props
}) {
  // Support both Formik and non-Formik usage
  const formik = useContext(FormikContext);
  const isInFormik = !!formik;

  const formikValues = formik?.values;
  const formikHandleChange = formik?.handleChange;
  const formikHandleBlur = formik?.handleBlur;
  const formikSetFieldValue = formik?.setFieldValue;

  const hasExternalValue = Object.prototype.hasOwnProperty.call(props, "value");
  const [localValue, setLocalValue] = useState(
    hasExternalValue ? props.value : null
  );

  const [debouncedDisplayValue, setDebouncedDisplayValue] = useState("");
  const debounceTimerRef = useRef(null);
  const isDebounceEnabled =
    debounceMs != null && debounceMs > 0 && (isInFormik || onChange);

  // Keep local value in sync when used as a controlled component without Formik
  useEffect(() => {
    if (!isInFormik && hasExternalValue) {
      setLocalValue(props.value);
    }
  }, [props.value, hasExternalValue, isInFormik]);

  const fieldValue = isInFormik
    ? getNestedValue(formikValues, name, null)
    : hasExternalValue
      ? props.value
      : localValue;

  useEffect(() => {
    if (isDebounceEnabled) {
      const v = fieldValue;
      setDebouncedDisplayValue(v != null && v !== undefined ? String(v) : "");
    }
  }, [isDebounceEnabled, fieldValue]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationResolvedAddress, setLocationResolvedAddress] = useState("");
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  // Inside a modal dialog the menu must render in the dialog itself: a modal
  // blocks pointer events and focus outside its content, so a menu portalled
  // to <body> opens but cannot be clicked or typed into ("stuck" dropdown).
  const dialogContainerRef = useRef(null);
  const portalRef = menuPortalRef?.current
    ? menuPortalRef
    : dialogContainerRef.current
      ? dialogContainerRef
      : null;

  const updateMenuPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      dialogContainerRef.current = menuPortalRef?.current
        ? null
        : inputRef.current.closest('[role="dialog"], [role="alertdialog"]');
      if (menuPortalRef?.current || dialogContainerRef.current) {
        setMenuPosition({
          top: rect.bottom,
          left: rect.left,
          width: rect.width,
          fixed: true,
        });
      } else {
        setMenuPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          fixed: false,
        });
      }
    }
  };

  useEffect(() => {
    if (!isSearchOpen) return;

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

    const handleScrollOrResize = (event) => {
      if (
        event?.type === "scroll" &&
        menuRef.current &&
        event.target instanceof Node &&
        (menuRef.current === event.target ||
          menuRef.current.contains(event.target))
      ) {
        return;
      }
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
  }, [isSearchOpen]);

  const selectedOptionLabel = useMemo(() => {
    if (!Array.isArray(options)) return "";
    return options.find((item) => item.value == fieldValue)?.label ?? "";
  }, [options, fieldValue]);

  const selectedValuesArray = useMemo(() => {
    if (method !== "multiple-dropdown") return [];
    const raw = fieldValue;
    if (raw == null) return [];
    return Array.isArray(raw) ? raw : [raw];
  }, [method, fieldValue]);

  const filteredOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    if (!searchTerm) return options;
    const q = searchTerm.toLowerCase();
    return options.filter((opt) => {
      const haystack = String(
        opt.searchText != null && opt.searchText !== ""
          ? opt.searchText
          : opt.label ?? ""
      ).toLowerCase();
      return haystack.includes(q);
    });
  }, [options, searchTerm]);

  const locationParsed =
    method === "location" ? parseLocationValue(fieldValue) : null;
  const hasAddressInLocation =
    locationParsed?.address != null &&
    String(locationParsed.address).trim() !== "";
  const locationNeedsReverseGeocode =
    locationParsed?.lat != null &&
    locationParsed?.lng != null &&
    !hasAddressInLocation; // do not call Google API when address already exists

  useEffect(() => {
    if (method !== "location" || !locationNeedsReverseGeocode) {
      setLocationResolvedAddress("");
      return;
    }
    let cancelled = false;
    const { lat, lng } = locationParsed;
    loadGoogleMaps()
      .then((google) => {
        if (!google?.maps?.Geocoder || cancelled) return;
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (cancelled) return;
          if (status === "OK" && results?.[0]) {
            const resolvedAddr = results[0].formatted_address;
            setLocationResolvedAddress(resolvedAddr);
            if (formikSetFieldValue && name) {
              formikSetFieldValue(name, { lat, lng, address: resolvedAddr });
            }
          } else {
            setLocationResolvedAddress("");
          }
        });
      })
      .catch(() => setLocationResolvedAddress(""));
    return () => {
      cancelled = true;
    };
  }, [
    method,
    locationNeedsReverseGeocode,
    locationParsed?.lat,
    locationParsed?.lng,
  ]);

  const getInput = () => {
    switch (method) {
      case "timeframe": {
        const fromName = props.fromName || `${name}_from`;
        const toName = props.toName || `${name}_to`;

        const getValueFor = (field) => {
          if (isInFormik) return getNestedValue(formikValues, field, "");
          if (hasExternalValue) return props.value?.[field] ?? "";
          return "";
        };

        const setValueFor = (field, nextVal) => {
          if (formikSetFieldValue) {
            formikSetFieldValue(field, nextVal);
          }
          if (onChange) {
            onChange({ field, value: nextVal });
          }
        };

        const fromVal = getValueFor(fromName);
        const toVal = getValueFor(toName);
        const canClear =
          !viewOnly &&
          !props.disabled &&
          (String(fromVal || "").trim() !== "" ||
            String(toVal || "").trim() !== "");

        const handleClear = () => {
          setValueFor(fromName, "");
          setValueFor(toName, "");
        };

        return (
          <Flex gap="12px" w="100%" align="center">
            <Grid
              templateColumns={{ base: "1fr", md: "1fr 1fr" }}
              gap="12px"
              w="100%"
            >
              <Input
                type="time"
                placeholder="From"
                value={fromVal}
                disabled={props.disabled || viewOnly}
                onChange={(e) => setValueFor(fromName, e.target.value)}
              />
              <Input
                type="time"
                placeholder="To"
                value={toVal}
                disabled={props.disabled || viewOnly}
                onChange={(e) => setValueFor(toName, e.target.value)}
              />
            </Grid>
            {canClear && (
              <IconButton
                aria-label="Clear timeframe"
                size="xs"
                variant="ghost"
                color="gray.400"
                _hover={{ color: "brand.500" }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClear();
                }}
              >
                <FaTimes />
              </IconButton>
            )}
          </Flex>
        );
      }
      case "date-picker":
        const datePickerComponent = (
          <DatePicker
            portalId="root-portal"
            showMonthYearPicker={props.type === "month"}
            {...props}
            disabled={props.disabled || viewOnly}
            name={name}
            selected={(fieldValue && new Date(fieldValue)) || null}
            onChange={(date) => {
              if (props.disabled || viewOnly) return;
              if (formikSetFieldValue) {
                formikSetFieldValue(name, date);
              } else if (!hasExternalValue) {
                setLocalValue(date);
              }
              if (onChange) onChange(date);
            }}
            customInput={
              <CustomDateTimeInput
                disabled={props.disabled || viewOnly}
                placeholder={placeholder}
                type={props.type}
              />
            }
          />
        );

        if (showClearButton && fieldValue && !props.disabled && !viewOnly) {
          return (
            <Box position="relative" width="100%">
              {datePickerComponent}
              <IconButton
                position="absolute"
                right="8px"
                top="50%"
                transform="translateY(-50%)"
                p="0"
                size="xs"
                variant="ghost"
                color="gray.300"
                _hover={{ color: "brand500" }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFieldValue(name, null);
                  if (onChange) onChange(null);
                }}
                aria-label="Clear date"
                zIndex={1}
              >
                <FaTimes />
              </IconButton>
            </Box>
          );
        }

        return datePickerComponent;
      case "dropdown":
        return (
          <CustomSelect
            value={fieldValue ?? ""}
            placeholder={placeholder || "Select..."}
            options={options}
            disabled={props.disabled || viewOnly}
            h={props.h ?? "44px"}
            fontSize={props.fontSize ?? "13px"}
            portalContainer={portalRef}
            onBlur={() => {
              if (formikHandleBlur) {
                formikHandleBlur({ target: { name } });
              }
            }}
            onChange={(val) => {
              if (props.disabled || viewOnly) return;
              const syntheticEvent = { target: { name, value: val } };
              if (formikSetFieldValue) {
                formikSetFieldValue(name, val);
              } else if (formikHandleChange) {
                formikHandleChange(syntheticEvent);
              } else if (!hasExternalValue) {
                setLocalValue(val);
              }
              if (onChange) onChange(syntheticEvent);
            }}
          />
        );
      case "searchable-dropdown":
        const handleClear = () => {
          if (props.disabled || viewOnly) return;
          if (formikSetFieldValue) {
            formikSetFieldValue(name, null);
          } else if (!hasExternalValue) {
            setLocalValue(null);
          }
          setSearchTerm("");
          setIsSearchOpen(false);
          if (onChange) onChange(null);
        };

        const handleInputChange = (e) => {
          if (props.disabled || viewOnly) return;
          const newValue = e.target.value;
          setSearchTerm(newValue);

          // If user clears all text and there was a selected value, clear the selection
          if (newValue === "" && fieldValue !== null && fieldValue !== "") {
            if (formikSetFieldValue) {
              formikSetFieldValue(name, null);
            } else if (!hasExternalValue) {
              setLocalValue(null);
            }
            if (onChange) onChange(null);
          }

          if (!isSearchOpen) setIsSearchOpen(true);
        };

        const handleInputBlur = () => {
          // Reset search term to show selected label when input loses focus
          if (fieldValue !== null && fieldValue !== "") {
            setSearchTerm("");
          }
        };

        const dropdownPanelSx = {
          position: portalRef ? "fixed" : "absolute",
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
          maxH: "260px",
          mt: portalRef ? "4px" : "6px",
          bg: "white",
          borderWidth: "1px",
          borderRadius: "12px",
          borderColor: "border",
          p: "6px",
          boxShadow:
            "0 12px 32px rgba(31, 41, 55, 0.12), 0 2px 6px rgba(244, 119, 33, 0.06)",
          overflow: "hidden",
          zIndex: portalRef ? 9999 : 1400,
          pointerEvents: "auto",
        };

        return (
          <>
            <InputGroup
              endElement={
                fieldValue !== null && fieldValue !== "" && !props.disabled ? (
                  <IconButton
                    mr="-8px"
                    p="0"
                    size="xs"
                    variant="ghost"
                    color="gray.400"
                    _hover={{ color: "brand.500" }}
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
                {...props}
                ref={inputRef}
                placeholder={placeholder}
                value={searchTerm || selectedOptionLabel}
                disabled={props.disabled || viewOnly}
                borderColor={isSearchOpen ? "#F47721" : "border"}
                onChange={handleInputChange}
                onFocus={() => {
                  if (props.disabled || viewOnly) return;
                  updateMenuPosition();
                  setIsSearchOpen(true);
                }}
                onBlur={handleInputBlur}
                autoComplete="off"
                cursor={props.disabled || viewOnly ? "not-allowed" : "text"}
              />
            </InputGroup>
            {isSearchOpen && !props.disabled && !viewOnly && (
              <Portal {...(portalRef ? { container: portalRef } : {})}>
                <Box
                  ref={menuRef}
                  data-searchable-dropdown-panel
                  onMouseDown={(e) => e.stopPropagation()}
                  {...dropdownPanelSx}
                >
                  <Box overflowY="auto" maxH="240px">
                    {filteredOptions.length === 0 ? (
                      <Box px="12px" py="10px">
                        <Text fontSize="13px" color="fg.muted">
                          No results
                        </Text>
                      </Box>
                    ) : (
                      filteredOptions.map((item) => {
                        const isSelected = fieldValue != null && fieldValue == item.value;
                        return (
                          <Flex
                            as="button"
                            type="button"
                            key={item.value}
                            w="100%"
                            alignItems="center"
                            justifyContent="space-between"
                            gap="10px"
                            px="12px"
                            py="9px"
                            borderRadius="8px"
                            bg={isSelected ? "#FFF5ED" : "transparent"}
                            color={isSelected ? "#C95C18" : "fg"}
                            fontSize="13px"
                            fontWeight={isSelected ? "500" : "400"}
                            textAlign="left"
                            cursor="pointer"
                            transition="background-color 0.12s ease"
                            _hover={{ bg: "#FFF5ED" }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={() => {
                              if (props.disabled || viewOnly) return;
                              if (formikSetFieldValue) {
                                formikSetFieldValue(name, item.value);
                              } else if (!hasExternalValue) {
                                setLocalValue(item.value);
                              }
                              if (onChange) onChange(item.value);
                              setIsSearchOpen(false);
                              setSearchTerm("");
                            }}
                          >
                            <Box flex={1} minW={0}>
                              {customRender ? (
                                customRender(item)
                              ) : (
                                <Text truncate>{item.label}</Text>
                              )}
                            </Box>
                            {isSelected && (
                              <Box color="#F47721" flexShrink={0} display="flex">
                                <LuCheck size={15} />
                              </Box>
                            )}
                          </Flex>
                        );
                      })
                    )}
                  </Box>
                </Box>
              </Portal>
            )}
          </>
        );
      case "multiple-dropdown": {
        const handleToggleOption = (item) => {
          if (props.disabled || viewOnly) return;
          const current = selectedValuesArray;
          const has = current.some((v) => v == item.value);
          const next = has
            ? current.filter((v) => v != item.value)
            : [...current, item.value];
          if (formikSetFieldValue) {
            formikSetFieldValue(name, next);
          } else if (!hasExternalValue) {
            setLocalValue(next);
          }
          if (onChange) onChange(next);
        };

        const allFilteredValues = filteredOptions.map((o) => o.value);
        const allFilteredSelected =
          allFilteredValues.length > 0 &&
          allFilteredValues.every((v) =>
            selectedValuesArray.some((s) => s == v)
          );
        const valueFromSetString = (s) => {
          const opt = options?.find((o) => String(o.value) === s);
          if (opt) return opt.value;
          const n = Number(s);
          return !Number.isNaN(n) && String(n) === s ? n : s;
        };
        const handleSelectAll = () => {
          if (props.disabled || viewOnly) return;
          const currentSet = new Set(selectedValuesArray.map(String));
          allFilteredValues.forEach((v) => currentSet.add(String(v)));
          const next = Array.from(currentSet).map(valueFromSetString);
          if (formikSetFieldValue) formikSetFieldValue(name, next);
          else if (!hasExternalValue) setLocalValue(next);
          if (onChange) onChange(next);
        };
        const handleClearAll = () => {
          if (props.disabled || viewOnly) return;
          const currentSet = new Set(selectedValuesArray.map(String));
          allFilteredValues.forEach((v) => currentSet.delete(String(v)));
          const next = Array.from(currentSet).map(valueFromSetString);
          if (formikSetFieldValue) formikSetFieldValue(name, next);
          else if (!hasExternalValue) setLocalValue(next);
          if (onChange) onChange(next);
        };

        const triggerLabel =
          selectedValuesArray.length === 0
            ? ""
            : selectedValuesArray
              .map((v) => options?.find((o) => o.value == v)?.label ?? v)
              .join(", ");

        const multiDropdownPanelSx = {
          position: portalRef ? "fixed" : "absolute",
          top: menuPosition.top,
          left: menuPosition.left,
          width: "max(min(100%, 320px), 280px)",
          maxW: menuPosition.width,
          maxH: "340px",
          mt: portalRef ? "4px" : "6px",
          bg: "white",
          borderWidth: "1px",
          borderRadius: "12px",
          borderColor: "border",
          p: "6px",
          boxShadow:
            "0 12px 32px rgba(31, 41, 55, 0.12), 0 2px 6px rgba(244, 119, 33, 0.06)",
          overflow: "hidden",
          zIndex: portalRef ? 9999 : 1400,
          pointerEvents: "auto",
        };

        return (
          <>
            <InputGroup
              endElement={
                <Box color="#C95C18" pointerEvents="none" display="flex">
                  {isSearchOpen ? <LuChevronUp size={15} /> : <LuChevronDown size={15} />}
                </Box>
              }
            >
              <Input
                {...props}
                ref={inputRef}
                readOnly
                placeholder={placeholder}
                value={triggerLabel}
                borderColor={isSearchOpen ? "#F47721" : "border"}
                cursor={props.disabled || viewOnly ? "not-allowed" : "pointer"}
                disabled={props.disabled || viewOnly}
                onClick={() => {
                  if (props.disabled || viewOnly) return;
                  updateMenuPosition();
                  setIsSearchOpen(!isSearchOpen);
                }}
                onFocus={(e) => e.target.blur()}
              />
            </InputGroup>
            {isSearchOpen && !viewOnly && !props.disabled && (
              <Portal {...(portalRef ? { container: portalRef } : {})}>
                <Box
                  ref={menuRef}
                  data-multiple-dropdown-panel
                  onMouseDown={(e) => e.stopPropagation()}
                  {...multiDropdownPanelSx}
                >
                  <Box
                    px="6px"
                    pt="4px"
                    pb="8px"
                    mb="4px"
                    borderBottomWidth="1px"
                    borderColor="border.subtle"
                  >
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                      }}
                      size="sm"
                      h="36px"
                      borderRadius="8px"
                      autoComplete="off"
                      mb="8px"
                    />
                    <Flex gap="2" flexWrap="wrap">
                      <Button
                        size="xs"
                        variant="subtle"
                        colorPalette="brand"
                        onClick={handleSelectAll}
                      >
                        Select all
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        color="fg.muted"
                        onClick={handleClearAll}
                      >
                        Clear
                      </Button>
                    </Flex>
                  </Box>
                  <Box
                    overflowY="auto"
                    maxH="240px"
                    overscrollBehavior="contain"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {filteredOptions.length === 0 ? (
                      <Box px="12px" py="10px">
                        <Text fontSize="13px" color="fg.muted">
                          No results
                        </Text>
                      </Box>
                    ) : (
                      filteredOptions.map((item) => {
                        const isSelected = selectedValuesArray.some(
                          (v) => v == item.value
                        );
                        return (
                          <Flex
                            as="button"
                            type="button"
                            key={item.value}
                            w="100%"
                            alignItems="center"
                            justifyContent="space-between"
                            gap="10px"
                            px="12px"
                            py="9px"
                            borderRadius="8px"
                            bg={isSelected ? "#FFF5ED" : "transparent"}
                            color={isSelected ? "#C95C18" : "fg"}
                            fontSize="13px"
                            fontWeight={isSelected ? "500" : "400"}
                            textAlign="left"
                            cursor="pointer"
                            transition="background-color 0.12s ease"
                            _hover={{ bg: "#FFF5ED" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleOption(item);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Box flex={1} minW={0}>
                              {customRender ? (
                                customRender(item)
                              ) : (
                                <Text truncate>{item.label}</Text>
                              )}
                            </Box>
                            {isSelected && (
                              <Box color="#F47721" flexShrink={0} display="flex">
                                <LuCheck size={15} />
                              </Box>
                            )}
                          </Flex>
                        );
                      })
                    )}
                  </Box>
                </Box>
              </Portal>
            )}
          </>
        );
      }
      case "file":
        return (
          <FileUploader
            {...props}
            name={name}
            value={fieldValue}
            accept={props.accept}
          />
        );
      case "multiple-files":
        return (
          <MultipleFileUploader
            {...props}
            name={name}
            value={fieldValue}
            accept={props.accept}
          />
        );
      case "image-upload":
        return (
          <ImageUploader
            {...props}
            name={name}
            value={fieldValue}
            accept={props.accept}
            multiple={props.multiple || false}
            maxSize={props.maxSize}
          />
        );
      case "voice-recorder":
        return <VoiceRecorder {...props} name={name} value={fieldValue} />;
      case "radio":
        return (
          <RadioGroup.Root
            {...props}
            disabled={props.disabled || viewOnly}
            value={fieldValue}
            onValueChange={(e) => {
              if (props.disabled || viewOnly) return;
              if (formikSetFieldValue) {
                formikSetFieldValue(name, e.value);
              } else if (!hasExternalValue) {
                setLocalValue(e.value);
              }
              if (onChange) onChange(e.value);
            }}
          >
            <HStack gap="6">
              {options?.map((item) => (
                <RadioGroup.Item key={item.value} value={item.value}>
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText color="gray.700">
                    {item.label}
                  </RadioGroup.ItemText>
                </RadioGroup.Item>
              ))}
            </HStack>
          </RadioGroup.Root>
        );
      case "checkbox-group": {
        const arr = Array.isArray(fieldValue) ? fieldValue : [];
        const setValue = (next) => {
          if (formikSetFieldValue) {
            formikSetFieldValue(name, next);
          } else if (!hasExternalValue) {
            setLocalValue(next);
          }
          if (onChange) onChange(next);
        };
        return (
          <Wrap gap="3">
            {options?.map((item) => (
              <Checkbox.Root
                key={item.value}
                checked={arr.includes(item.value)}
                onClick={(e) => {
                  if (viewOnly || props.disabled) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const next = arr.includes(item.value)
                    ? arr.filter((x) => x !== item.value)
                    : [...arr, item.value];
                  setValue(next);
                }}
                disabled={props.disabled || viewOnly}
              >
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Label
                  color="gray.700"
                  cursor={viewOnly || props.disabled ? "default" : "pointer"}
                >
                  {item.label}
                </Checkbox.Label>
              </Checkbox.Root>
            ))}
          </Wrap>
        );
      }
      case "switch":
        return (
          <Switch.Root
            {...props}
            disabled={props.disabled || viewOnly}
            checked={Boolean(fieldValue)}
            onCheckedChange={(e) => {
              if (props.disabled || viewOnly) return;
              if (formikSetFieldValue) {
                formikSetFieldValue(name, e.checked);
              } else if (!hasExternalValue) {
                setLocalValue(e.checked);
              }
              if (onChange) onChange(e.checked);
            }}
          >
            <Switch.HiddenInput name={name} />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Label />
          </Switch.Root>
        );
      case "location": {
        const setLocationValue = (val) => {
          if (formikSetFieldValue) {
            formikSetFieldValue(name, val);
          } else if (!hasExternalValue) {
            setLocalValue(val);
          }
          if (onChange) onChange(val);
        };

        const displayText =
          locationParsed?.address ||
          locationResolvedAddress ||
          (locationParsed
            ? `${locationParsed.lat.toFixed(6)}, ${locationParsed.lng.toFixed(
              6
            )}`
            : "");

        return (
          <>
            <Flex gap={2} alignItems="center" flexWrap="wrap">
              <Input
                {...props}
                name={name}
                value={displayText}
                placeholder={placeholder || "Select location on map"}
                color="black"
                _placeholder={{ color: "gray.400" }}
                readOnly
                flex={1}
                minW="200px"
                disabled={props.disabled || viewOnly}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                colorPalette="brand"
                onClick={() => setLocationPickerOpen(true)}
                disabled={props.disabled || viewOnly}
              >
                Pick on map
              </Button>
            </Flex>
            <GoogleLocationPickerModal
              isOpen={locationPickerOpen && !props.disabled && !viewOnly}
              onClose={() => setLocationPickerOpen(false)}
              onSelect={(value) => {
                setLocationValue(value);
                setLocationPickerOpen(false);
              }}
              initialValue={fieldValue || null}
            />
          </>
        );
      }
      default: {
        const flushDebounced = () => {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
          }
          if (isDebounceEnabled) {
            const val = debouncedDisplayValue;
            if (formikSetFieldValue) {
              formikSetFieldValue(name, val);
            } else if (!hasExternalValue) {
              setLocalValue(val);
            }
            if (onChange) {
              const syntheticEvent = { target: { name, value: val } };
              onChange(syntheticEvent);
            }
          }
        };

        const handleDefaultChange = (e) => {
          if (props.disabled || viewOnly) return;
          const val = e.target.value;
          if (isDebounceEnabled) {
            setDebouncedDisplayValue(val);
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
              debounceTimerRef.current = null;
              if (formikSetFieldValue) {
                formikSetFieldValue(name, val);
              } else if (!hasExternalValue) {
                setLocalValue(val);
              }
              if (onChange) onChange(e);
            }, debounceMs);
          } else {
            if (formikHandleChange) {
              formikHandleChange(e);
            } else if (!hasExternalValue) {
              setLocalValue(val);
            }
            if (onChange) onChange(e);
          }
        };

        const handleDefaultBlur = (e) => {
          if (isDebounceEnabled) {
            flushDebounced();
          }
          if (formikHandleBlur) {
            formikHandleBlur(e);
          }
        };

        const inputValue = isDebounceEnabled
          ? debouncedDisplayValue
          : fieldValue;
        const inputElement = (
          <Input
            {...props}
            name={name}
            value={inputValue ?? ""}
            color="black"
            _placeholder={{ color: "gray.400" }}
            placeholder={placeholder}
            disabled={props.disabled || viewOnly}
            onChange={handleDefaultChange}
            onBlur={handleDefaultBlur}
            onWheel={(e) => e.target.blur()}
          />
        );

        if (rightAddon) {
          return (
            <InputGroup
              endElement={
                <Box
                  as="span"
                  display="inline-flex"
                  alignItems="center"
                  px={3}
                  mr="-12px"
                  bg="gray.100"
                  borderRightRadius="8px"
                  borderLeft="1px solid"
                  borderColor="gray.200"
                  fontSize="sm"
                  color="gray.700"
                  height="100%"
                >
                  {rightAddon}
                </Box>
              }
            >
              <Input
                {...props}
                name={name}
                value={inputValue ?? ""}
                color="black"
                _placeholder={{ color: "gray.400" }}
                placeholder={placeholder}
                disabled={props.disabled || viewOnly}
                onChange={handleDefaultChange}
                onBlur={handleDefaultBlur}
                onWheel={(e) => e.target.blur()}
              />
            </InputGroup>
          );
        }

        return inputElement;
      }
    }
  };

  const getViewMode = () => {
    if (method === "timeframe") {
      const fromName = props.fromName || `${name}_from`;
      const toName = props.toName || `${name}_to`;
      const fromV = isInFormik
        ? getNestedValue(formikValues, fromName, "")
        : "";
      const toV = isInFormik ? getNestedValue(formikValues, toName, "") : "";
      const f =
        fromV != null && String(fromV).trim() !== "" ? String(fromV) : "";
      const t = toV != null && String(toV).trim() !== "" ? String(toV) : "";
      if (!f && !t) return "-";
      if (f && t) return `${f} - ${t}`;
      if (f) return `From ${f}`;
      return `To ${t}`;
    }

    if (method === "date-picker") {
      if (fieldValue == null || fieldValue == undefined) return "-";

      if (props.type === "month") {
        return moment(fieldValue).format("MMM YYYY");
      }
      return moment(fieldValue).format("DD/MM/YYYY");
    }

    if (method === "dropdown" || method === "searchable-dropdown") {
      if (!fieldValue) {
        return "-";
      }

      return (
        options?.find((item) => item.value == fieldValue)?.label ?? "Not Found"
      );
    }

    if (method === "multiple-dropdown") {
      const arr = Array.isArray(fieldValue)
        ? fieldValue
        : fieldValue != null
          ? [fieldValue]
          : [];
      if (arr.length === 0) return "-";
      const labels = arr.map(
        (v) => options?.find((item) => item.value == v)?.label ?? v
      );
      return labels.join(", ");
    }

    if (method === "radio") {
      if (fieldValue === null || fieldValue === undefined) {
        return "-";
      }

      return (
        options?.find((item) => item.value == fieldValue)?.label ?? "Not Found"
      );
    }

    if (method === "checkbox-group") {
      const arr = Array.isArray(fieldValue) ? fieldValue : [];
      if (arr.length === 0) return "-";
      const labels = arr.map(
        (v) => options?.find((item) => item.value == v)?.label ?? v
      );
      return labels.join(", ");
    }

    if (method === "switch") {
      return fieldValue == true ? "Yes" : "No";
    }

    if (method === "location") {
      const parsed = parseLocationValue(fieldValue);
      if (!parsed) return "-";
      const displayAddress =
        parsed.address ||
        locationResolvedAddress ||
        `${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`;
      const mapsUrl = `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`;
      return (
        <Flex gap={2} alignItems="center" flexWrap="wrap">
          <Text flex={1} minW={0}>
            {displayAddress}
          </Text>
          <Link
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <Button size="sm" variant="outline" colorPalette="brand">
              View on map
            </Button>
          </Link>
        </Flex>
      );
    }

    if (method === "file") {
      const fileType = fieldValue?.split(".").pop();

      if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fileType)) {
        return (
          <Link href={fieldValue} target="_blank" download>
            <Image src={fieldValue} alt="File" width={100} height={100} />
          </Link>
        );
      }

      return typeof fieldValue === "string" && fieldValue !== "" ? (
        <Link href={fieldValue} target="_blank" download>
          <Button colorPalette="secondary" variant="subtle" size="xs">
            Open File
          </Button>
        </Link>
      ) : (
        fieldValue?.name ?? "-"
      );
    }

    if (method === "multiple-files") {
      const files = Array.isArray(fieldValue) ? fieldValue : [];

      if (!files || files.length === 0) {
        return (
          <Text fontSize="sm" color="gray.500">
            No files attached
          </Text>
        );
      }

      return (
        <VStack spacing={2} align="stretch">
          {files.map((fileItem, index) => {
            const fileName =
              typeof fileItem === "string"
                ? fileItem.split("/").pop().split("?")[0]
                : fileItem?.uri
                  ? fileItem.uri.split("/").pop().split("?")[0]
                  : fileItem?.file?.name || "-";
            const fileUrl =
              typeof fileItem === "string"
                ? fileItem
                : fileItem?.uri || fileItem?.file_url;

            return (
              <Box
                key={index}
                p={3}
                bg="gray.50"
                borderWidth="1px"
                borderRadius="md"
              >
                <Text
                  fontSize="sm"
                  as="a"
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="brand.600"
                  _hover={{ textDecoration: "underline" }}
                >
                  {fileName}
                </Text>
              </Box>
            );
          })}
        </VStack>
      );
    }

    if (method === "image-upload") {
      const images = Array.isArray(fieldValue)
        ? fieldValue.filter(
          (img) => img !== null && img !== undefined && img !== ""
        )
        : fieldValue && fieldValue !== "" && fieldValue !== null
          ? [fieldValue]
          : [];

      if (!images || images.length === 0) {
        return (
          <Text fontSize="sm" color="gray.500">
            No images uploaded
          </Text>
        );
      }

      const getImageUrl = (image) => {
        if (image instanceof File) {
          return URL.createObjectURL(image);
        }
        if (typeof image === "string") {
          const trimmed = image.trim();
          if (trimmed !== "" && trimmed !== "null" && trimmed !== "undefined") {
            return trimmed;
          }
        }
        return null;
      };

      // For view mode, check if we need to center single image
      // If multiple is explicitly true, use grid. Otherwise, center single images
      const shouldCenter = props.multiple !== true && images.length === 1;

      if (shouldCenter) {
        // Single image - centered
        const image = images[0];
        const imageUrl = getImageUrl(image);

        return (
          <Box display="flex" justifyContent="center" alignItems="center">
            <Box
              position="relative"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              overflow="hidden"
              bg="white"
              maxW="300px"
              w="100%"
            >
              <Box
                width="100%"
                minH="300px"
                bg="gray.50"
                display="flex"
                alignItems="center"
                justifyContent="center"
                padding="16px"
              >
                {imageUrl ? (
                  <Box
                    as="img"
                    src={imageUrl}
                    alt="Image"
                    maxW="100%"
                    maxH="100%"
                    width="auto"
                    height="auto"
                    style={{
                      objectFit: "contain",
                      display: "block",
                    }}
                    onError={(e) => {
                      console.error("Image failed to load:", imageUrl);
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <EmptyImage width="100%" height="100%" />
                )}
              </Box>
            </Box>
          </Box>
        );
      }

      // Multiple images - grid layout
      return (
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

            return (
              <Box
                key={index}
                position="relative"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                overflow="hidden"
                bg="white"
              >
                <Box
                  width="100%"
                  minH="200px"
                  bg="gray.50"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  padding="16px"
                >
                  {imageUrl ? (
                    <Box
                      as="img"
                      src={imageUrl}
                      alt={`Image ${index + 1}`}
                      maxW="100%"
                      maxH="100%"
                      width="auto"
                      height="auto"
                      style={{
                        objectFit: "contain",
                        display: "block",
                      }}
                      onError={(e) => {
                        console.error("Image failed to load:", imageUrl);
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <EmptyImage width="100%" height="100%" />
                  )}
                </Box>
              </Box>
            );
          })}
        </Grid>
      );
    }

    if (method === "voice-recorder") {
      if (!fieldValue) {
        return (
          <Text fontSize="sm" color="gray.500">
            No recording
          </Text>
        );
      }

      // For view mode, fieldValue is typically a URL string
      const audioUrl = typeof fieldValue === "string" ? fieldValue : null;

      return (
        <>
          {audioUrl && (
            <audio
              controls
              src={audioUrl}
              style={{ maxWidth: "400px", marginTop: "22px" }}
            >
              Your browser does not support the audio element.
            </audio>
          )}
        </>
      );
    }

    return fieldValue === "" ? "-" : fieldValue ?? "-";
  };

  const errorMessage = isInFormik ? (
    <Text color="red" textStyle="xs">
      <ErrorMessage
        name={name}
        style={{ fontSize: "12px", color: "red" }}
        w="fit-content"
      />
    </Text>
  ) : null;

  return (
    <Field.Root orientation={labelOrientation} gap="7px">
      <Field.Label color={viewOnly ? "brand.600" : "#30384B"} w="100%">
        <Flex justifyContent="space-between" w="100%" alignItems="center">
          <Text
            lineClamp={1}
            fontSize="12px"
            lineHeight="15px"
            fontWeight="500"
            {...labelStyle}
          >
            {label}
          </Text>
          {/* {isRequired && <Field.RequiredIndicator />} */}

          {errorPosition === "top" && errorMessage}
        </Flex>
      </Field.Label>

      {viewOnly ? getViewMode() : getInput()}

      {errorPosition === "bottom" && errorMessage}
    </Field.Root>
  );
}

export default CustomInput;
