import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { facebookLogin, exchangeForLongLivedToken } from '../utils/facebookAuth';
import { logAction } from '../utils/auditLog';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    logAction('auth.login', { method: 'email' });
    return data;
  }, []);

  // Facebook Login: FB popup → exchange token → sign in/up Supabase
  // Returns { accessToken, expiresIn, userName } (the Meta API token data)
  const signInWithFacebook = useCallback(async () => {
    // Step 1: FB popup
    const fbResult = await facebookLogin();

    // Step 2: Exchange for long-lived token + get auth credentials
    const { accessToken, expiresIn, userName, email, authPassword } = await exchangeForLongLivedToken(fbResult.accessToken);

    // Step 3: Sign in to Supabase (try login first, then sign up)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: authPassword });

    if (signInError) {
      // User doesn't exist yet — sign up
      const { error: signUpError } = await supabase.auth.signUp({ email, password: authPassword });
      if (signUpError) throw signUpError;

      // Auto-confirm: try to sign in immediately (Supabase may require email confirmation)
      const { error: retryError } = await supabase.auth.signInWithPassword({ email, password: authPassword });
      if (retryError) {
        throw new Error('Account created. Please check your email to confirm, then try again.');
      }
    }

    logAction('auth.login', { method: 'facebook', userName });
    return { accessToken, expiresIn, userName };
  }, []);

  const signOut = useCallback(async () => {
    logAction('auth.logout', {});
    // Revoke Meta token before signing out
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('access_token')
          .eq('user_id', data.session.user.id)
          .single();

        if (settings?.access_token) {
          // Revoke Meta token via backend (best-effort, don't block logout)
          fetch('/api/auth/facebook/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: settings.access_token }),
          }).catch(() => {});

          // Clear token from DB
          await supabase
            .from('user_settings')
            .update({ access_token: null, token_expires_at: null })
            .eq('user_id', data.session.user.id);
        }
      }
    } catch {
      // Don't block logout if revocation fails
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email) => {
    const redirectTo = window.location.origin + '/reset-password';
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setPasswordRecovery(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, passwordRecovery, signUp, signIn, signInWithFacebook, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
