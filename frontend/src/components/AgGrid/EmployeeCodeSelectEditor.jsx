import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

/** AG Grid cell editor for string option values (e.g. employee_code). */
const EmployeeCodeSelectEditor = forwardRef((props, ref) => {
  const { value, onValueChange, options = [] } = props;
  const selectRef = useRef(null);
  const [currentValue, setCurrentValue] = useState(value ?? "");

  useImperativeHandle(ref, () => ({
    getValue: () => (currentValue === "" ? null : currentValue),
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  const handleChange = (e) => {
    const newValue = e.target.value === "" ? null : e.target.value;
    setCurrentValue(newValue ?? "");
    onValueChange(newValue);
  };

  useEffect(() => {
    selectRef.current?.focus();
  }, []);

  return (
    <select
      ref={selectRef}
      value={currentValue ?? ""}
      onChange={handleChange}
      style={{ width: "100%", height: "100%", padding: "0 10px" }}
    >
      <option disabled value="">
        Select buyer
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
});

EmployeeCodeSelectEditor.displayName = "EmployeeCodeSelectEditor";

export default EmployeeCodeSelectEditor;
