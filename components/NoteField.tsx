"use client";

import { useState, useRef, useEffect } from "react";

interface NoteFieldProps {
  label: string;   // e.g. "sleep", "tennis", "general"
  value: string;
  onChange: (v: string) => void;
}

export default function NoteField({ label, value, onChange }: NoteFieldProps) {
  const [isOpen, setIsOpen] = useState(!!value);
  const [isDone, setIsDone] = useState(!!value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize on value changes
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && !isDone) {
      textareaRef.current?.focus();
    }
  }, [isOpen, isDone]);

  function handleDone() {
    if (!value.trim()) {
      setIsOpen(false);
      setIsDone(false);
    } else {
      setIsDone(true);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setIsDone(false); }}
        className="text-sm text-blue-500 font-medium py-1"
      >
        + Add {label} notes
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-start">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          const el = e.target;
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
        }}
        rows={1}
        placeholder={`${label} notes…`}
        className="flex-1 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none overflow-hidden focus:outline-none focus:border-blue-300"
        style={{ minHeight: "2.25rem" }}
      />
      <button
        onClick={() => {
          if (isDone) {
            setIsDone(false);
            setTimeout(() => {
              const el = textareaRef.current;
              if (!el) return;
              el.focus();
              el.setSelectionRange(el.value.length, el.value.length);
            }, 0);
          } else {
            handleDone();
          }
        }}
        className="shrink-0 text-sm font-medium text-blue-500 py-2 px-1"
      >
        {isDone ? "Edit note" : "Done"}
      </button>
    </div>
  );
}
