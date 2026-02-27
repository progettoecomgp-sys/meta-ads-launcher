import { useState, useRef } from 'react';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '../utils/constants';

export default function DropZone({ onFilesSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  function validateFiles(fileList) {
    const valid = [];
    const errors = [];
    for (const file of fileList) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: unsupported format`);
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 4GB limit`);
      } else {
        valid.push(file);
      }
    }
    return { valid, errors };
  }

  function handleFiles(fileList) {
    const { valid, errors } = validateFiles(fileList);
    if (errors.length > 0) {
      console.warn('File validation errors:', errors);
    }
    if (valid.length > 0) {
      onFilesSelected(valid);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
        ${isDragging
          ? 'border-accent bg-accent/5'
          : 'border-border hover:border-accent/50 hover:bg-accent/[0.02]'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.mp4,.mov"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium">Click to upload ad creatives</p>
          <p className="text-xs text-text-secondary mt-1">or drag & drop your selected ad creatives here</p>
        </div>
        <p className="text-xs text-text-secondary">
          Accepts images (JPG & PNG) and videos (MP4 & MOV) up to 4GB
        </p>
      </div>
    </div>
  );
}
