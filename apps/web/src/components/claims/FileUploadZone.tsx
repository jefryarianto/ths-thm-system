'use client';

import { useCallback, useRef, useState } from 'react';

export interface FileWithPreview {
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface FileUploadZoneProps {
  label: string;
  accept: string;
  maxFiles: number;
  maxSizeMB: number;
  onFilesChange: (files: FileWithPreview[]) => void;
  files: FileWithPreview[];
  onRemoveFile: (index: number) => void;
  uploading?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function FileUploadZone({
  label,
  accept,
  maxFiles,
  maxSizeMB,
  onFilesChange,
  files,
  onRemoveFile,
  uploading,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Hanya file JPG, PNG, WebP, dan PDF yang diizinkan';
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Ukuran file melebihi batas ${maxSizeMB}MB`;
    }
    return null;
  }, [maxSizeMB]);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles: FileWithPreview[] = [];
    Array.from(newFiles).forEach((f) => {
      const error = validateFile(f);
      if (error) {
        return;
      }
      validFiles.push({
        file: f,
        preview: URL.createObjectURL(f),
        progress: 0,
        status: 'pending',
      });
    });

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles].slice(0, maxFiles));
    }
  }, [files, maxFiles, onFilesChange, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    if (e.target) {
      e.target.value = '';
    }
  }, [handleFiles]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} <span className="text-gray-500">(maks {maxFiles} file, {maxSizeMB}MB/file)</span>
      </label>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
          dragActive ? 'border-navy-500 bg-navy-50 dark:bg-navy-900/20' : 'border-gray-300 dark:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label
          className="flex flex-col items-center gap-3 cursor-pointer p-4 -m-4 rounded-lg hover:bg-navy-50 dark:hover:bg-navy-900/20 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-upload mx-auto text-gray-400"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">Klik atau tarik file ke sini</p>
          <p className="text-xs text-gray-400">{accept}</p>
          {files.length >= maxFiles && (
            <p className="text-xs text-amber-500">Maksimal {maxFiles} file tercapai</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            onChange={handleInputChange}
            className="sr-only"
            disabled={uploading || files.length >= maxFiles}
            aria-label="Pilih file untuk upload"
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              {f.preview.startsWith('blob:') && f.file.type.startsWith('image/') ? (
                <img
                  src={f.preview}
                  alt={f.file.name}
                  className="w-20 h-20 object-cover rounded"
                  width={80}
                  height={80}
                />
              ) : f.file.type === 'application/pdf' ? (
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 flex items-center justify-center rounded">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-file-text text-red-500"
                  >
                    <path d="M14 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V2" />
                    <path d="M2 18h19" />
                    <path d="M2 22h19" />
                    <path d="M2 14h19" />
                    <path d="M2 10h19" />
                    <path d="M16 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V2" />
                  </svg>
                </div>
              ) : null}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(f.file.size / 1024).toFixed(1)} KB
                </p>

                {f.status === 'uploading' && (
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-navy-600 transition-all"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
                {f.status === 'error' && (
                  <p className="text-xs text-red-500 mt-1">{f.error}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {f.status === 'done' && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-check-circle text-green-500"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
                {!uploading && f.status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(i)}
                    className="text-gray-400 hover:text-red-500 transition"
                    aria-label="Hapus file"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-x-circle"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6" />
                      <path d="M9 9l6 6" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}