import Modal from './Modal';

const PLANS = [
  {
    name: 'Free',
    price: '0',
    period: '14-day trial',
    features: ['3 launches/month', 'All creative types', 'Basic metrics'],
    current: true,
  },
  {
    name: 'Pro',
    price: '49',
    period: '/month',
    features: ['Unlimited launches', 'All creative types', 'Advanced metrics', 'Priority support'],
    recommended: true,
  },
  {
    name: 'Agency',
    price: '149',
    period: '/month',
    features: ['Unlimited launches', 'Multi-account (coming soon)', 'Team access', 'Dedicated support'],
  },
];

export default function UpgradeModal({ open, onClose, currentPlan = 'free', onSelectPlan }) {
  const handleCheckout = async (planName) => {
    if (onSelectPlan) {
      onSelectPlan(planName.toLowerCase());
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upgrade Your Plan" maxWidth="max-w-3xl">
      <p className="text-sm text-text-secondary mb-6">
        You've reached the launch limit for your current plan. Upgrade to continue launching ads.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.name.toLowerCase() === currentPlan;
          return (
            <div
              key={plan.name}
              className={`rounded-lg border p-5 flex flex-col glass-card ${
                plan.recommended
                  ? 'border-accent ring-1 ring-accent/20'
                  : ''
              }`}
            >
              {plan.recommended && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2">
                  Recommended
                </span>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-2xl font-bold">{plan.price === '0' ? 'Free' : `€${plan.price}`}</span>
                <span className="text-sm text-text-secondary ml-1">{plan.price !== '0' ? plan.period : plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 text-sm font-medium rounded-md border border-border text-text-secondary"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.name)}
                  className={`w-full py-2.5 text-sm font-medium rounded-md transition-colors ${
                    plan.recommended
                      ? 'bg-accent text-white hover:bg-accent-hover'
                      : 'border border-border text-text hover:bg-bg'
                  }`}
                >
                  {plan.price === '0' ? 'Downgrade' : 'Upgrade'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
