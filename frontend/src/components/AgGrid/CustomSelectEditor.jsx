import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

const CustomSelectEditor = forwardRef((props, ref) => {
  const { value, onValueChange, options = [] } = props;
  const selectRef = useRef(null);
  const [currentValue, setCurrentValue] = useState(value);

  // Expose required methods to AG Grid
  useImperativeHandle(ref, () => ({
    getValue: () => {
      return currentValue;
    },
    isCancelBeforeStart: () => {
      return false;
    },
    isCancelAfterEnd: () => {
      return false;
    },
  }));

  const handleChange = (e) => {
    const newValue = e.target.value === "" ? null : parseInt(e.target.value);
    setCurrentValue(newValue);
    onValueChange(newValue);
  };

  // Focus the select when the editor is initialized
  useEffect(() => {
    if (selectRef.current) {
      selectRef.current.focus();
    }
  }, []);

  return (
    <select
      ref={selectRef}
      value={currentValue ?? ""}
      onChange={handleChange}
      style={{ width: "100%", height: "100%", padding: "0 10px" }}
    >
      <option disabled value={""}>
        Select
      </option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
});

CustomSelectEditor.displayName = "CustomSelectEditor";

export default CustomSelectEditor;
