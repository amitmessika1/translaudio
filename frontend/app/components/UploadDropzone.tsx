"use client";

import React, { useState } from "react";

type Props = {
  fileLabel: string;
  onPickFile: (file: File) => void;
};

export default function UploadDropzone({ fileLabel, onPickFile }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  function pickFirst(files: FileList | null) {
    if (!files || files.length === 0) return;
    onPickFile(files[0]);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        pickFirst(e.dataTransfer.files);
      }}
      className={[
        "rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200",
        isDragging ? "border-indigo-500 bg-indigo-50 scale-[1.02]" : "border-zinc-300 bg-white hover:border-indigo-400",
      ].join(" ")}
    >
      <div className="mt-4 text-xl text-zinc-700">
        <label className="cursor-pointer font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
          Choose a file
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => pickFirst(e.target.files)}
            className="hidden"
          />
        </label>
      </div>

      <div className="mt-4 text-base text-zinc-500 font-medium">{fileLabel}</div>
    </div>
  );
}