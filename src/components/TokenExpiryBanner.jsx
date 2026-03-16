import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function TokenExpiryBanner() {
  const { settings } = useApp();
  const { signInWithFacebook } = useAuth();

  if (!settings.accessToken || !settings.tokenExpiresAt) return null;

  const expiresAt = new Date(settings.tokenExpiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

  // Token already expired
  if (daysLeft <= 0) {
    return (
      <div className="mx-8 mt-4 p-3 glass-card border-danger/20 rounded-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-danger flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm text-danger font-medium">
            Your Meta API token has expired. Reconnect to continue launching ads.
          </p>
        </div>
        <button
          onClick={() => signInWithFacebook().catch(() => {})}
          className="px-3 py-1.5 bg-danger hover:bg-red-600 text-white text-xs font-semibold rounded-md transition-colors flex-shrink-0"
        >
          Reconnect
        </button>
      </div>
    );
  }

  // Token expiring within 7 days
  if (daysLeft <= 7) {
    return (
      <div className="mx-8 mt-4 p-3 glass-card border-warning/20 rounded-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-warning font-medium">
            Your Meta API token expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. Reconnect to avoid interruption.
          </p>
        </div>
        <button
          onClick={() => signInWithFacebook().catch(() => {})}
          className="px-3 py-1.5 bg-warning hover:bg-amber-600 text-white text-xs font-semibold rounded-md transition-colors flex-shrink-0"
        >
          Reconnect
        </button>
      </div>
    );
  }

  return null;
}
