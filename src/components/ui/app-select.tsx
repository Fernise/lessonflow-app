"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type AppSelectOption = {
  value: string;
  label: string;
};

type AppSelectProps = {
  options: AppSelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
};

export function AppSelect({
  options,
  value,
  defaultValue,
  onChange,
  name,
  placeholder = "Select option",
  className = "",
  menuClassName = ""
}: AppSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue || options[0]?.value || "");
  const currentValue = value !== undefined ? value : internalValue;
  const selectedIndex = useMemo(
    () => Math.max(0, options.findIndex((option) => option.value === currentValue)),
    [options, currentValue]
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const selectedOption = options.find((option) => option.value === currentValue);

  function commit(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open && (event.key === "Enter" || event.key === " " || event.key === "ArrowDown")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(options.length - 1, current + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) commit(option.value);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={name ? `${name}-menu` : undefined}
        onKeyDown={onKeyDown}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-[#1F2937] shadow-sm transition duration-150 hover:border-rose-300 focus:outline-none focus:ring-2 focus:ring-[#FF4F7B]"
      >
        <span className={selectedOption ? "text-[#1F2937]" : "text-slate-500"}>{selectedOption?.label || placeholder}</span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          id={name ? `${name}-menu` : undefined}
          role="listbox"
          className={`absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-rose-100 bg-white p-1.5 shadow-[0_14px_28px_rgba(15,23,42,0.14)] backdrop-blur ${menuClassName}`}
        >
          {options.map((option, index) => {
            const selected = option.value === currentValue;
            const active = index === activeIndex;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(option.value)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    selected
                      ? "bg-[#FFF5F8] font-semibold text-[#FF4F7B]"
                      : active
                        ? "bg-rose-50 text-slate-800"
                        : "text-slate-700 hover:bg-rose-50"
                  }`}
                >
                  <span>{option.label}</span>
                  {selected ? <Check size={15} className="text-[#FF4F7B]" aria-hidden="true" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
