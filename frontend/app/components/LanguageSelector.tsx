"use client";

import React from "react";

type Language = {
  code: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  languages: Language[];
};

export default function LanguageSelector({ value, onChange, languages }: Props) {
  return (
    <div className="mt-6">
      <label className="block mb-2 text-sm font-medium text-zinc-700">
        Target language
      </label>

      <p className="mb-3 text-sm text-zinc-500">
        Choose the language you want the transcript translated to.
      </p>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-100"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}