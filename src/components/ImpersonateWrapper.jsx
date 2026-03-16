import { useApp } from '../context/AppContext';
import ImpersonateBanner from './ImpersonateBanner';

export default function ImpersonateWrapper({ children }) {
  const { impersonatedUser, exitImpersonation } = useApp();

  if (!impersonatedUser) return children;

  return (
    <>
      <ImpersonateBanner email={impersonatedUser.email} onExit={exitImpersonation} />
      {children}
    </>
  );
}
