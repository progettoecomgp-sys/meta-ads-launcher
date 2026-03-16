import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function OnboardingGuard({ children }) {
  const { settings } = useApp();

  // Skip onboarding for email/password users (no Facebook connection)
  // They'll configure their token manually in Settings
  if (!settings.facebookUserName && !settings.onboardingCompleted) {
    return children;
  }

  // Facebook users must complete onboarding
  if (settings.facebookUserName && !settings.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
