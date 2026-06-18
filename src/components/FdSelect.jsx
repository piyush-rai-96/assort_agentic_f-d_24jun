import { useEffect, useState } from "react";
import { Select } from "impact-ui";
import "./FdSelect.css";

/*
 * FdSelect — thin controlled wrapper around Impact UI's <Select>.
 * Impact UI's Select is a fully controlled react-select variant that expects
 * several pieces of state (open, current options, selected options). This
 * wrapper hides that boilerplate behind a simple value/onChange contract so
 * views can drop in single-select or multi-select dropdowns consistently.
 *
 *   options:   [{ value, label }]
 *   value:     the currently selected `value` (string) — or string[] when isMulti
 *   onChange:  (value) => void  — or (value[]) => void when isMulti
 *   isMulti:   boolean (default false)
 */
export default function FdSelect({
  label,
  value,
  options,
  onChange,
  width = 220,
  isWithSearch = false,
  isMulti = false,
}) {
  const findOption = (v) =>
    options.find((o) => String(o.value) === String(v)) || null;

  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState(options);
  const [isSelectAll, setIsSelectAll] = useState(false);

  // Multi-select: selectedOptions is an array; single: an object or null
  const [selectedOptions, setSelectedOptionsRaw] = useState(() => {
    if (isMulti) {
      const vals = Array.isArray(value) ? value : value ? [value] : [];
      return vals.map(findOption).filter(Boolean);
    }
    return findOption(value);
  });

  useEffect(() => {
    setCurrentOptions(options);
  }, [options]);

  useEffect(() => {
    if (isMulti) {
      const vals = Array.isArray(value) ? value : value ? [value] : [];
      setSelectedOptionsRaw(vals.map(findOption).filter(Boolean));
    } else {
      setSelectedOptionsRaw(findOption(value));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]);

  const handleChange = (sel) => {
    if (isMulti) {
      const arr = Array.isArray(sel) ? sel : sel ? [sel] : [];
      setSelectedOptionsRaw(arr);
      setIsSelectAll(arr.length === options.length);
      onChange(arr.map((o) => o.value));
    } else {
      const obj = Array.isArray(sel) ? sel[sel.length - 1] || null : sel;
      setSelectedOptionsRaw(obj);
      if (obj && obj.value !== undefined) onChange(obj.value);
    }
  };

  const setSelectedOptions = (next) => {
    if (isMulti) {
      const arr = Array.isArray(next) ? next : next ? [next] : [];
      setSelectedOptionsRaw(arr);
    } else {
      const obj = Array.isArray(next) ? next[next.length - 1] || null : next;
      setSelectedOptionsRaw(obj);
    }
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
        isMulti={isMulti}
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
        handleChange={handleChange}
        isSelectAll={isSelectAll}
        setIsSelectAll={setIsSelectAll}
        customPlaceholderAfterSelect={null}
      />
    </div>
  );
}
