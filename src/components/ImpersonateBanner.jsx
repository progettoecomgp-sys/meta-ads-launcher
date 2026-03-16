export default function ImpersonateBanner({ email, onExit }) {
  return (
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="text-sm font-medium text-warning">
          Viewing as <span className="font-bold">{email}</span>
        </span>
        <span className="text-xs text-warning/70 ml-1">— Read Only</span>
      </div>
      <button
        onClick={onExit}
        className="px-3 py-1 text-xs font-medium text-warning border border-warning/30 rounded-md hover:bg-warning/10 transition-colors"
      >
        Exit
      </button>
    </div>
  );
}
