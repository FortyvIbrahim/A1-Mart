import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Box } from "@chakra-ui/react";
import CustomInput from "@/components/CustomInput";

const normalizeEditorValue = (val) => {
  if (val != null && typeof val === "object" && val.target) {
    const next = val.target.value;
    return next === "" ? null : next;
  }
  return val === "" ? null : val;
};

/** AG Grid cell editor wrapping CustomInput dropdown / searchable-dropdown. */
const CustomInputSelectEditor = forwardRef((props, ref) => {
  const {
    value,
    onValueChange,
    options = [],
    placeholder = "Select",
    method = "searchable-dropdown",
  } = props;
  const menuPortalRef = useRef(null);
  const containerRef = useRef(null);
  const [currentValue, setCurrentValue] = useState(value ?? null);

  useImperativeHandle(ref, () => ({
    getValue: () => normalizeEditorValue(currentValue),
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  useEffect(() => {
    setCurrentValue(value ?? null);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const input = containerRef.current?.querySelector("input");
      input?.focus();
      if (method === "searchable-dropdown") {
        input?.click();
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [method]);

  const handleChange = (val) => {
    const next = normalizeEditorValue(val);
    setCurrentValue(next);
    onValueChange?.(next);
  };

  return (
    <Box
      ref={menuPortalRef}
      position="relative"
      overflow="visible"
      zIndex={9999}
      w="100%"
      minW={method === "searchable-dropdown" ? "280px" : "200px"}
      bg="white"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Box
        ref={containerRef}
        w="100%"
        css={{
          "& label": {
            display: "none !important",
            margin: "0 !important",
            padding: "0 !important",
            height: "0 !important",
            minHeight: "0 !important",
          },
        }}
      >
        <CustomInput
          name="ag_grid_custom_input_select"
          method={method}
          placeholder={placeholder}
          value={currentValue}
          options={options}
          onChange={handleChange}
          label=""
          menuPortalRef={method === "searchable-dropdown" ? menuPortalRef : undefined}
        />
      </Box>
    </Box>
  );
});

CustomInputSelectEditor.displayName = "CustomInputSelectEditor";

export default CustomInputSelectEditor;
