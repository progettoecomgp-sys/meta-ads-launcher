import { useState, useRef } from 'react';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '../utils/constants';

export default function DropZone({ onFilesSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);
  const dragCounter = useRef(0);

  function validateFiles(fileList) {
    const valid = [];
    const errs = [];
    for (const file of fileList) {
      if (file.size === 0) {
        errs.push(`${file.name}: empty file (0 bytes)`);
      } else if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        errs.push(`${file.name}: unsupported format`);
      } else if (file.size > MAX_FILE_SIZE) {
        errs.push(`${file.name}: exceeds 4GB limit`);
      } else {
        valid.push(file);
      }
    }
    return { valid, errors: errs };
  }

  function handleFiles(fileList) {
    const { valid, errors: errs } = validateFiles(fileList);
    setErrors(errs);
    if (errs.length > 0) {
      setTimeout(() => setErrors([]), 5000);
    }
    if (valid.length > 0) {
      onFilesSelected(valid);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDragEnter(e) {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
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
          accept=".jpg,.jpeg,.png,.gif,.mp4,.mov"
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
            Accepts images (JPG, PNG & GIF) and videos (MP4 & MOV) up to 4GB
          </p>
        </div>
      </div>
      {errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-danger flex items-center gap-1">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
