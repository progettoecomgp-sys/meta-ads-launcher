import { useState, useRef, useEffect } from 'react';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '../utils/constants';

export default function DropZone({ onFilesSelected, onFolderSelected, adSets, selectedUploadAdSets, onUploadAdSetChange, compact }) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef(null);
  const folderInputRef = useRef(null);
  const dragCounter = useRef(0);

  // Set webkitdirectory attribute imperatively (React doesn't support it as JSX prop)
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  function isValidFile(file) {
    return file.size > 0 && ACCEPTED_FILE_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE && !file.name.startsWith('.');
  }

  function validateFiles(fileList) {
    const valid = [];
    const errs = [];
    for (const file of fileList) {
      if (file.name.startsWith('.')) continue;
      if (file.size === 0) { errs.push(`${file.name}: empty file (0 bytes)`); }
      else if (!ACCEPTED_FILE_TYPES.includes(file.type)) { errs.push(`${file.name}: unsupported format`); }
      else if (file.size > MAX_FILE_SIZE) { errs.push(`${file.name}: exceeds 4GB limit`); }
      else { valid.push(file); }
    }
    return { valid, errors: errs };
  }

  function handleFiles(fileList) {
    const { valid, errors: errs } = validateFiles(fileList);
    setErrors(errs);
    if (errs.length > 0) setTimeout(() => setErrors([]), 5000);
    if (valid.length > 0) onFilesSelected(valid);
  }

  // Use modern File System Access API to pick a folder
  async function handleFolderPick() {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const folderName = dirHandle.name;
      const files = [];
      const errs = [];

      // Read all files in the selected folder (non-recursive, top level only)
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          if (file.name.startsWith('.')) continue;
          if (!isValidFile(file)) {
            if (!ACCEPTED_FILE_TYPES.includes(file.type)) errs.push(`${file.name}: unsupported format`);
            else errs.push(`${file.name}: invalid`);
            continue;
          }
          files.push(file);
        }
        // If it's a subfolder, read its files too
        if (entry.kind === 'directory') {
          const subFiles = [];
          for await (const subEntry of entry.values()) {
            if (subEntry.kind === 'file') {
              const file = await subEntry.getFile();
              if (file.name.startsWith('.')) continue;
              if (!isValidFile(file)) continue;
              subFiles.push(file);
            }
          }
          if (subFiles.length > 0) {
            // Subfolder becomes its own ad set
            if (onFolderSelected) {
              onFolderSelected([[entry.name, subFiles]]);
            }
          }
        }
      }

      setErrors(errs);
      if (errs.length > 0) setTimeout(() => setErrors([]), 5000);

      // Files in the root of the selected folder → ad set named after the folder
      if (files.length > 0 && onFolderSelected) {
        onFolderSelected([[folderName, files]]);
      }
    } catch (err) {
      // User cancelled the picker — ignore
      if (err.name !== 'AbortError') console.error('Folder pick error:', err);
    }
    setShowMenu(false);
  }

  // Fallback folder handler for browsers without showDirectoryPicker (e.g., Brave)
  function handleFolderInput(e) {
    const fileList = Array.from(e.target.files || []);
    e.target.value = '';
    if (fileList.length === 0) { setShowMenu(false); return; }

    // Group files by their folder using webkitRelativePath
    const folderMap = {};
    const errs = [];
    for (const file of fileList) {
      if (file.name.startsWith('.') || file.size === 0) continue;
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) { errs.push(`${file.name}: unsupported format`); continue; }
      if (file.size > MAX_FILE_SIZE) { errs.push(`${file.name}: exceeds 4GB limit`); continue; }
      // webkitRelativePath: "FolderName/file.jpg" or "FolderName/SubFolder/file.jpg"
      const parts = (file.webkitRelativePath || file.name).split('/');
      const folderName = parts.length > 1 ? parts[0] : 'Uploads';
      if (!folderMap[folderName]) folderMap[folderName] = [];
      folderMap[folderName].push(file);
    }

    setErrors(errs);
    if (errs.length > 0) setTimeout(() => setErrors([]), 5000);

    const folders = Object.entries(folderMap).filter(([, files]) => files.length > 0);
    if (folders.length > 0 && onFolderSelected) {
      onFolderSelected(folders);
    }
    setShowMenu(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDragEnter(e) { e.preventDefault(); dragCounter.current++; setIsDragging(true); }
  function handleDragOver(e) { e.preventDefault(); }
  function handleDragLeave(e) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) { dragCounter.current = 0; setIsDragging(false); }
  }

  const showAdSetSelector = adSets && adSets.length > 1 && onUploadAdSetChange;
  const selectedIds = selectedUploadAdSets || ['__all__'];
  const isAll = selectedIds.includes('__all__');

  const toggleAdSet = (id) => {
    if (!onUploadAdSetChange) return;
    if (id === '__all__') { onUploadAdSetChange(['__all__']); return; }
    let next;
    if (isAll) { next = [id]; }
    else if (selectedIds.includes(id)) { next = selectedIds.filter((x) => x !== id); if (next.length === 0) next = ['__all__']; }
    else { next = [...selectedIds, id]; if (next.length >= adSets.length) next = ['__all__']; }
    onUploadAdSetChange(next);
  };

  const supportsFolderPicker = typeof window.showDirectoryPicker === 'function';

  const handleFolderClick = () => {
    if (supportsFolderPicker) {
      handleFolderPick();
    } else {
      folderInputRef.current?.click();
    }
  };

  return (
    <div>
      {showAdSetSelector && (
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className="text-xs text-text-secondary font-medium mr-0.5">Upload to:</span>
          <button type="button" onClick={() => toggleAdSet('__all__')}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border transition-all ${isAll ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-white text-text-secondary hover:border-accent hover:text-accent'}`}>
            All Ad Sets
          </button>
          {adSets.map((as) => {
            const active = isAll || selectedIds.includes(as._id);
            return (
              <button key={as._id} type="button" onClick={() => toggleAdSet(as._id)}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border transition-all ${active && !isAll ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-white text-text-secondary hover:border-accent hover:text-accent'}`}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: as._color }} />
                <span className="truncate max-w-[120px]">{as.name || '(unnamed)'}</span>
              </button>
            );
          })}
        </div>
      )}
      <div
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => { if (!showMenu) setShowMenu(true); }}
        className={`
          border-2 border-dashed rounded-lg text-center cursor-pointer transition-all relative
          ${compact ? 'p-3' : 'p-10'}
          ${isDragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-accent/[0.02]'}
        `}
      >
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.mp4,.mov" className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; setShowMenu(false); }} />
        <input ref={folderInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.mp4,.mov" className="hidden"
          onChange={handleFolderInput} />

        {compact ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium text-text-secondary">Add more creatives</span>
            <span className="text-[10px] text-text-tertiary">(or drag & drop)</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Click to upload creatives</p>
              <p className="text-xs text-text-secondary mt-1">or drag & drop files here</p>
            </div>
            <p className="text-xs text-text-secondary">
              JPG, PNG, GIF, MP4, MOV — up to 4GB
            </p>
          </div>
        )}

        {/* Upload type menu */}
        {showMenu && (
          <div className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-center z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-3">
              <button type="button"
                onClick={() => { inputRef.current?.click(); }}
                className="flex flex-col items-center gap-2 px-6 py-4 rounded-lg border-2 border-border hover:border-accent hover:bg-accent/5 transition-all">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Files</span>
                <span className="text-[10px] text-text-secondary">Select individual files</span>
              </button>
              <button type="button"
                onClick={handleFolderClick}
                className="flex flex-col items-center gap-2 px-6 py-4 rounded-lg border-2 border-border hover:border-accent hover:bg-accent/5 transition-all">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-sm font-medium">Folder</span>
                <span className="text-[10px] text-text-secondary">Folder name → Ad Set</span>
              </button>
              <button type="button" onClick={() => setShowMenu(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-bg border border-border text-text-secondary hover:text-text flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}
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
