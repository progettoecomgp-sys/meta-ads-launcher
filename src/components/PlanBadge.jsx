const PLAN_COLORS = {
  free: 'bg-gray-100 text-gray-600',
  pro: 'bg-accent/10 text-accent',
  agency: 'bg-purple-100 text-purple-700',
};

export default function PlanBadge({ plan = 'free' }) {
  const label = plan.charAt(0).toUpperCase() + plan.slice(1);
  const cls = PLAN_COLORS[plan] || PLAN_COLORS.free;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}
