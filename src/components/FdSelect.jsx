import { useEffect, useState } from "react";
import { Select } from "impact-ui";
import "./FdSelect.css";

/*
 * FdSelect — thin controlled wrapper around Impact UI's <Select>.
 * Impact UI's Select is a fully controlled react-select variant that expects
 * several pieces of state (open, current options, selected options). This
 * wrapper hides that boilerplate behind a simple value/onChange contract so
 * views can drop in single-select dropdowns the same way they'd use a native
 * <select>.
 *
 *   options:  [{ value, label }]
 *   value:    the currently selected `value`
 *   onChange: (value) => void
 */
export default function FdSelect({
  label,
  value,
  options,
  onChange,
  width = 220,
  isWithSearch = false,
}) {
  const findOption = (v) =>
    options.find((o) => String(o.value) === String(v)) || null;

  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState(options);
  // Single-select Impact UI Select expects `selectedOptions` as an object
  // ({ value, label }) — not an array — for both the trigger label and the
  // option-click path.
  const [selectedOptions, setSelectedOptionsRaw] = useState(() => findOption(value));

  useEffect(() => {
    setCurrentOptions(options);
  }, [options]);

  useEffect(() => {
    setSelectedOptionsRaw(findOption(value));
  }, [value, options]);

  // Normalize whatever the component hands back (object on click) into an object.
  const setSelectedOptions = (next) => {
    const obj = Array.isArray(next) ? next[next.length - 1] || null : next;
    setSelectedOptionsRaw(obj);
  };

  return (
    <div
      className="fd-select-wrap"
      style={{
        flex: `1 1 ${Math.min(width, 160)}px`,
        maxWidth: width,
        minWidth: 120,
      }}
    >
      <Select
        label={label}
        labelOrientation="top"
        placeholder="Select…"
        isMulti={false}
        isWithSearch={isWithSearch}
        searchPlaceholder="Search…"
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        withPortal
        width="100%"
        initialOptions={options}
        currentOptions={currentOptions}
        setCurrentOptions={setCurrentOptions}
        selectedOptions={selectedOptions}
        setSelectedOptions={setSelectedOptions}
        handleChange={(sel) => {
          const next = Array.isArray(sel) ? sel[sel.length - 1] : sel;
          if (next && next.value !== undefined) onChange(next.value);
        }}
        customPlaceholderAfterSelect={null}
      />
    </div>
  );
}
