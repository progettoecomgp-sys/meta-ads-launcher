import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initFacebookSDK } from '../utils/facebookAuth';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { signInWithFacebook, signIn, signUp, user, loading } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  // Email/password state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Preload Facebook SDK
  useEffect(() => { initFacebookSDK().catch(() => {}); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleFacebookLogin = async () => {
    setConnecting(true);
    setError('');
    try {
      const { accessToken, expiresIn, userName } = await signInWithFacebook();

      // Save the Meta API token to user_settings after Supabase session is established
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
        await supabase.from('user_settings').upsert({
          user_id: session.user.id,
          access_token: accessToken,
          facebook_user_name: userName,
          token_expires_at: expiresAt,
        }, { onConflict: 'user_id' });
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Enter email and password');
      return;
    }
    setEmailLoading(true);
    setError('');
    try {
      if (isSignUp) {
        await signUp(email, password);
        // Try to sign in immediately (if auto-confirm is enabled)
        try {
          await signIn(email, password);
        } catch {
          setError('Account created! Check your email to confirm, then log in.');
          setIsSignUp(false);
          setEmailLoading(false);
          return;
        }
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <div className="absolute top-6 left-8 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-base font-bold">BoltAds</span>
        </div>

        <div className="w-full max-w-sm glass-card rounded-xl p-8">
          {/* Badge */}
          <div className="flex justify-center mb-6 -mt-2 -mx-2">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent/5 border border-accent/15 rounded-full text-xs font-medium text-accent">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Launch ads fast, no limits
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-center mb-2">Welcome back</h1>
          <p className="text-center text-text-secondary text-sm mb-8">
            Log in to access BoltAds
          </p>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3 bg-danger/10 border border-danger/20 rounded-md text-sm text-danger text-center">
              {error}
            </div>
          )}

          {/* Facebook Login Button */}
          <button
            onClick={handleFacebookLogin}
            disabled={connecting}
            className="w-full py-3.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-md text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2.5"
          >
            {connecting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continue with Facebook
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-secondary">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                placeholder="Email"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                placeholder="Password"
              />
            </div>
            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-3.5 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {emailLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                isSignUp ? 'Create Account' : 'Log In'
              )}
            </button>
          </form>

          {/* Toggle sign up / sign in */}
          <p className="text-center text-sm text-text-secondary mt-4">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-accent font-medium hover:underline"
            >
              {isSignUp ? 'Log In' : 'Sign Up'}
            </button>
          </p>

          {/* Info for email users */}
          <p className="text-center text-[11px] text-text-secondary mt-5">
            Email users can configure their Meta API token in Settings after login
          </p>
        </div>
      </div>

      {/* Right side — gradient panel */}
      <div className="hidden lg:flex w-[480px] flex-shrink-0 bg-gradient-to-br from-[#7C5CFC] to-[#5B44CC] text-white flex-col justify-center p-12">
        <h2 className="text-2xl font-bold leading-tight mb-3">
          Save yourself 100's of hours launching ad creatives
        </h2>
        <p className="text-sm text-white/70 mb-8">
          Bolt Ads helps you upload, manage, and launch your Facebook ad campaigns with powerful automation tools.
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-2xl font-bold">100's</p>
            <p className="text-xs text-white/60 mt-1">Ads launched instantly</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-2xl font-bold">88.2%</p>
            <p className="text-xs text-white/60 mt-1">Faster launch time</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="text-2xl font-bold">&infin;</div>
            <p className="text-xs text-white/60 mt-1">Unlimited ad accounts</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="text-2xl font-bold">&infin;</div>
            <p className="text-xs text-white/60 mt-1">Unlimited ad uploads</p>
          </div>
        </div>

        {/* Trust badge */}
        <div className="mt-8 flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold border-2 border-[#7C5CFC]">JD</div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold border-2 border-[#7C5CFC]">ML</div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold border-2 border-[#7C5CFC]">AK</div>
          </div>
          <p className="text-xs text-white/60">Trusted by ad managers worldwide</p>
        </div>
      </div>
    </div>
  );
}
