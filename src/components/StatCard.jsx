export default function StatCard({ label, value, icon, trend }) {
  return (
    <div className="glass-card hover-glow rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-text-secondary">{label}</span>
        {icon && <span className="text-text-secondary">{icon}</span>}
      </div>
      <div className="text-[28px] font-bold tracking-tight">{value}</div>
      {trend !== undefined && (
        <div className={`text-xs mt-1 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
          {trend >= 0 ? '+' : ''}{trend}% vs prev. period
        </div>
      )}
    </div>
  );
}
