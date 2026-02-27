import { useState, useEffect } from 'react';
import { ACCEPTED_IMAGE_TYPES, CTA_OPTIONS } from '../utils/constants';

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function getFileExt(name) {
  return name.split('.').pop().toUpperCase();
}

export default function CreativeCard({ creative, index, onToggleCustom, onUpdateField, onRemove }) {
  const [thumbnail, setThumbnail] = useState(null);
  const isImage = ACCEPTED_IMAGE_TYPES.includes(creative.file.type);

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(creative.file);
      setThumbnail(url);
      return () => URL.revokeObjectURL(url);
    } else {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      const url = URL.createObjectURL(creative.file);
      video.src = url;
      video.onloadeddata = () => { video.currentTime = 1; };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        canvas.getContext('2d').drawImage(video, 0, 0, 120, 120);
        setThumbnail(canvas.toDataURL());
        URL.revokeObjectURL(url);
      };
    }
  }, [creative.file, isImage]);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-[52px] h-[52px] rounded-lg overflow-hidden bg-bg flex-shrink-0 flex items-center justify-center">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* File type icon */}
        <div className="flex-shrink-0">
          {isImage ? (
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{index + 1}. {creative.file.name}</p>
          <p className="text-xs text-text-secondary">
            {formatSize(creative.file.size)} &bull; {getFileExt(creative.file.name)}
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-success font-medium">Ready</span>
        </div>

        {/* Custom toggle + remove */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="flex items-center gap-1.5 cursor-pointer select-none" title="Use custom copy for this creative">
            <input
              type="checkbox"
              checked={creative.useCustomCopy}
              onChange={() => onToggleCustom(creative.id)}
              className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent/30 cursor-pointer"
            />
            <span className="text-xs text-text-secondary">Custom</span>
          </label>
          <button
            onClick={() => onRemove(creative.id)}
            title="Remove"
            className="w-7 h-7 rounded-full bg-bg border border-border text-text-secondary hover:bg-danger hover:text-white hover:border-danger transition-colors flex items-center justify-center"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline custom fields */}
      {creative.useCustomCopy && (
        <div className="px-3 pb-3 pt-1 border-t border-border bg-bg/50 space-y-2">
          <div className="text-xs font-medium text-accent mb-1">Custom copy for this creative</div>
          <textarea
            rows={2}
            value={creative.primaryText}
            onChange={(e) => onUpdateField(creative.id, 'primaryText', e.target.value)}
            className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none bg-white"
            placeholder="Primary Text..."
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={creative.headline}
              onChange={(e) => onUpdateField(creative.id, 'headline', e.target.value)}
              className="border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
              placeholder="Headline..."
            />
            <input
              type="text"
              value={creative.description}
              onChange={(e) => onUpdateField(creative.id, 'description', e.target.value)}
              className="border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
              placeholder="Description..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="url"
              value={creative.linkUrl}
              onChange={(e) => onUpdateField(creative.id, 'linkUrl', e.target.value)}
              className="border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
              placeholder="Link URL..."
            />
            <select
              value={creative.cta}
              onChange={(e) => onUpdateField(creative.id, 'cta', e.target.value)}
              className="border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
            >
              {CTA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
