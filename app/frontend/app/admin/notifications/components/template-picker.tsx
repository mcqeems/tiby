"use client";

import { ChevronDown, FileText } from "lucide-react";
import type { NotificationTemplate } from "@tiby/ts-shared";

interface TemplatePickerProps {
  templates: NotificationTemplate[];
  value: string;
  onSelect: (template: NotificationTemplate | null) => void;
}

/** Dropdown of the system messages plus demo presets, grouped by origin. */
export default function TemplatePicker({
  templates,
  value,
  onSelect,
}: TemplatePickerProps) {
  const system = templates.filter((item) => item.source === "SYSTEM");
  const generalPresets = templates.filter(
    (item) => item.source === "PRESET" && !item.key.startsWith("PRESET_NAKES_"),
  );
  const nakesPresets = templates.filter(
    (item) => item.source === "PRESET" && item.key.startsWith("PRESET_NAKES_"),
  );
  const selected = templates.find((item) => item.key === value);

  const formatOptionLabel = (item: NotificationTemplate) =>
    item.audienceLabel ? `${item.title} (${item.audienceLabel})` : item.title;

  const handleChange = (key: string) => {
    if (key === "CUSTOM") {
      onSelect(null);
      return;
    }
    onSelect(templates.find((item) => item.key === key) ?? null);
  };

  return (
    <div>
      <label
        htmlFor="notification-template"
        className="mb-1.5 block text-xs font-semibold text-tiby-ink"
      >
        Template Pesan
      </label>
      <div className="relative">
        <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <select
          id="notification-template"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-9 pr-9 text-xs font-semibold text-tiby-ink outline-none focus:ring-2 focus:ring-tiby-teal-600"
        >
          <option value="CUSTOM">Tulis sendiri (kustom)</option>
          {system.length > 0 && (
            <optgroup label="Template sistem">
              {system.map((item) => (
                <option key={item.key} value={item.key}>
                  {formatOptionLabel(item)}
                </option>
              ))}
            </optgroup>
          )}
          {generalPresets.length > 0 && (
            <optgroup label="Preset simulasi">
              {generalPresets.map((item) => (
                <option key={item.key} value={item.key}>
                  {formatOptionLabel(item)}
                </option>
              ))}
            </optgroup>
          )}
          {nakesPresets.length > 0 && (
            <optgroup label="Preset alert faskes (Nakes)">
              {nakesPresets.map((item) => (
                <option key={item.key} value={item.key}>
                  {formatOptionLabel(item)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
      {selected?.audienceLabel && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-2.5 py-1 text-[11px] font-medium text-teal-800">
          Sasaran peran template:{" "}
          <span className="font-semibold">{selected.audienceLabel}</span>
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-tiby-muted">
        Memilih template mengisi judul, isi, dan tingkat kepentingan. Anda
        tetap bisa mengubahnya sebelum mengirim.
      </p>
    </div>
  );
}
