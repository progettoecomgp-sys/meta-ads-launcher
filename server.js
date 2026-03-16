import * as Sentry from '@sentry/node';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createHmac, randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Initialize Sentry (skips gracefully if no DSN)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
  });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// --- Admin user IDs (Supabase auth UIDs) ---
const ADMIN_USER_IDS = new Set(
  (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
);

// --- Middleware ---
app.use(compression());
app.use((req, res, next) => {
  // Skip JSON parsing for Stripe webhook (needs raw body)
  if (req.path === '/api/billing/webhook') return next();
  express.json({ limit: '1mb' })(req, res, next);
});

// Trust Fly.io proxy for rate limiting
app.set('trust proxy', 1);

// --- Maintenance mode middleware ---
app.use(async (req, res, next) => {
  if (process.env.MAINTENANCE_MODE !== 'true') return next();
  // Always allow health check
  if (req.path === '/api/health') return next();
  // Allow admin bypass via JWT
  const user = await getUserFromToken(req);
  if (user && ADMIN_USER_IDS.has(user.id)) return next();
  // API requests → JSON 503
  if (req.path.startsWith('/api/')) {
    return res.status(503).json({ error: 'Service is undergoing maintenance. Please try again later.' });
  }
  // Browser requests → HTML maintenance page
  res.status(503).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maintenance — Bolt Ads</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb;color:#111827}.c{text-align:center;max-width:480px;padding:2rem}.icon{width:64px;height:64px;background:#4f46e5;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem}h1{font-size:1.5rem;font-weight:700;margin-bottom:.5rem}p{color:#6b7280;font-size:.875rem;line-height:1.6}</style></head><body><div class="c"><div class="icon"><svg width="32" height="32" fill="none" stroke="white" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div><h1>We'll be right back</h1><p>Bolt Ads is undergoing scheduled maintenance. We'll be back shortly. Thank you for your patience.</p></div></body></html>`);
});

// --- Security headers via Helmet ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://connect.facebook.net",
        "https://www.facebook.com",
        ...(process.env.SENTRY_DSN ? ["https://*.sentry.io"] : []),
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.fbcdn.net", "https://*.facebook.com"],
      connectSrc: [
        "'self'",
        "https://graph.facebook.com",
        "https://www.facebook.com",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://api.stripe.com",
        ...(process.env.SENTRY_DSN ? ["https://*.sentry.io"] : []),
      ],
      frameSrc: ["https://www.facebook.com", "https://web.facebook.com", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// --- Rate limiting ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 token exchange requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP for general API
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// --- Helper: verify Supabase JWT and extract user ID ---
async function getUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

// --- Admin middleware ---
async function requireAdmin(req, res, next) {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!ADMIN_USER_IDS.has(user.id)) return res.status(403).json({ error: 'Forbidden' });
  req.adminUser = user;
  next();
}

// Helper: get Supabase service client headers
function getServiceHeaders() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return {
    url: supabaseUrl,
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  };
}

// --- Token revocation endpoint ---
app.post('/api/auth/facebook/revoke', apiLimiter, async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid accessToken' });
  }

  try {
    const revokeRes = await fetch(
      `https://graph.facebook.com/v21.0/me/permissions?access_token=${encodeURIComponent(accessToken)}`,
      { method: 'DELETE' }
    );
    const revokeData = await revokeRes.json();

    if (revokeData.success) {
      res.json({ success: true });
    } else {
      // Token may already be invalid — still consider it a success
      res.json({ success: true, note: 'Token may already be revoked' });
    }
  } catch (err) {
    console.error('Token revocation error:', err);
    // Don't block logout if revocation fails
    res.json({ success: true, note: 'Revocation request failed, but logout proceeds' });
  }
});

// --- Exchange short-lived token for long-lived token ---
app.post('/api/auth/facebook/exchange', authLimiter, async (req, res) => {
  const { shortToken } = req.body;

  // Input validation
  if (!shortToken || typeof shortToken !== 'string' || shortToken.length > 500) {
    return res.status(400).json({ error: 'Missing or invalid shortToken' });
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return res.status(500).json({ error: 'Server missing META_APP_ID or META_APP_SECRET' });
  }

  try {
    // Exchange short-lived for long-lived token (60 days)
    const longUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    longUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longUrl.searchParams.set('client_id', appId);
    longUrl.searchParams.set('client_secret', appSecret);
    longUrl.searchParams.set('fb_exchange_token', shortToken);

    const longRes = await fetch(longUrl);
    const longData = await longRes.json();

    if (longData.error) {
      return res.status(400).json({ error: longData.error.message });
    }

    // Get user name, email, and ID
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${longData.access_token}`);
    const meData = await meRes.json();

    if (meData.error) {
      return res.status(400).json({ error: meData.error.message });
    }

    // Generate deterministic password for Supabase auth (HMAC of FB user ID)
    const fbUserId = meData.id;
    if (!fbUserId) {
      return res.status(400).json({ error: 'Could not retrieve Facebook user ID' });
    }

    const authPassword = createHmac('sha256', appSecret).update(fbUserId).digest('hex');

    // Fallback email if Facebook doesn't provide one
    const email = meData.email || `${fbUserId}@bolt-ads.com`;

    res.json({
      accessToken: longData.access_token,
      expiresIn: longData.expires_in || 5184000,
      userName: meData.name || '',
      email,
      authPassword,
    });
  } catch (err) {
    console.error('Token exchange error:', err);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// --- GDPR: Data export ---
app.post('/api/gdpr/export', apiLimiter, async (req, res) => {
  const { userId, supabaseToken } = req.body;
  if (!userId || !supabaseToken) {
    return res.status(400).json({ error: 'Missing userId or supabaseToken' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server missing Supabase configuration' });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const [settingsRes, historyRes, auditRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userId}&select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/launch_history?user_id=eq.${userId}&select=*&order=launched_at.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/audit_logs?user_id=eq.${userId}&select=action,details,created_at&order=created_at.desc&limit=500`, { headers }),
    ]);

    const [settings, history, audit] = await Promise.all([
      settingsRes.json(),
      historyRes.json(),
      auditRes.json(),
    ]);

    // Redact access token from export
    if (Array.isArray(settings)) {
      settings.forEach(s => { delete s.access_token; });
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      settings: settings || [],
      launch_history: history || [],
      audit_logs: audit || [],
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bolt-ads-data-export-${Date.now()}.json"`);
    res.json(exportData);
  } catch (err) {
    console.error('Data export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// --- GDPR: Account deletion ---
app.post('/api/gdpr/delete-account', apiLimiter, async (req, res) => {
  const { userId, supabaseToken, accessToken } = req.body;
  if (!userId || !supabaseToken) {
    return res.status(400).json({ error: 'Missing userId or supabaseToken' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server missing Supabase configuration' });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. Revoke Meta token if present
    if (accessToken) {
      try {
        await fetch(
          `https://graph.facebook.com/v21.0/me/permissions?access_token=${encodeURIComponent(accessToken)}`,
          { method: 'DELETE' }
        );
      } catch { /* best-effort */ }
    }

    // 2. Delete user data from all tables (RLS ensures user can only delete own data)
    await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userId}`, { method: 'DELETE', headers }),
      fetch(`${supabaseUrl}/rest/v1/launch_history?user_id=eq.${userId}`, { method: 'DELETE', headers }),
      fetch(`${supabaseUrl}/rest/v1/audit_logs?user_id=eq.${userId}`, { method: 'DELETE', headers }),
      fetch(`${supabaseUrl}/rest/v1/creatives?user_id=eq.${userId}`, { method: 'DELETE', headers }),
    ]);

    res.json({ success: true, message: 'Account data deleted. Sign out to complete.' });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Failed to delete account data' });
  }
});

// --- Enhanced health check ---
app.get('/api/health', async (req, res) => {
  const result = { api: 'ok', database: 'ok', timestamp: new Date().toISOString(), environment: process.env.APP_ENV || 'production' };

  // Test Supabase connectivity
  const svc = getServiceHeaders();
  if (svc) {
    try {
      const dbRes = await fetch(`${svc.url}/rest/v1/user_settings?select=user_id&limit=1`, {
        headers: svc.headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!dbRes.ok) result.database = 'error';
    } catch {
      result.database = 'error';
    }
  } else {
    result.database = 'error';
  }

  result.status = result.database === 'ok' ? 'ok' : 'degraded';
  res.status(result.status === 'ok' ? 200 : 503).json(result);
});

// ==================== FEATURE FLAGS ====================

// GET /api/feature-flags — public (authenticated)
// Admin sees all flags as true + raw data for management panel
// Normal user sees only enabled flags
app.get('/api/feature-flags', apiLimiter, async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing service key' });

  const isAdmin = ADMIN_USER_IDS.has(user.id);

  try {
    const flagsRes = await fetch(
      `${svc.url}/rest/v1/feature_flags?select=*&order=created_at.asc`,
      { headers: svc.headers }
    );
    if (!flagsRes.ok) return res.status(500).json({ error: 'Failed to fetch flags' });
    const rows = await flagsRes.json();

    const flags = {};
    for (const row of rows) {
      // Admin sees everything as enabled; normal users see only enabled flags
      if (isAdmin || row.enabled) {
        flags[row.key] = true;
      }
    }

    const result = { flags };
    if (isAdmin) result._raw = rows;
    res.json(result);
  } catch (err) {
    console.error('Feature flags error:', err);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Check if current user is admin
app.get('/api/admin/me', apiLimiter, requireAdmin, (req, res) => {
  res.json({ admin: true, id: req.adminUser.id });
});

// Admin stats
app.get('/api/admin/stats', apiLimiter, requireAdmin, async (req, res) => {
  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

  try {
    const [authRes, historyRes] = await Promise.all([
      fetch(`${svc.url}/auth/v1/admin/users?per_page=1`, { headers: svc.headers }),
      fetch(`${svc.url}/rest/v1/launch_history?select=id&limit=1`, { headers: { ...svc.headers, 'Range-Unit': 'items', 'Range': '0-0', 'Prefer': 'count=exact' } }),
    ]);

    let totalUsers = 0;
    if (authRes.ok) {
      // Supabase returns total in x-total-count header or we count from response
      const authData = await authRes.json();
      totalUsers = authData.total || (authData.users?.length ?? 0);
    }

    const totalLaunches = parseInt(historyRes.headers.get('content-range')?.split('/')[1] || '0', 10);

    res.json({ totalUsers, totalLaunches });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Admin user list
app.get('/api/admin/users', apiLimiter, requireAdmin, async (req, res) => {
  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

  try {
    // Get users from auth.users via admin API
    const authRes = await fetch(`${svc.url}/auth/v1/admin/users?per_page=500`, {
      headers: svc.headers,
    });
    if (!authRes.ok) {
      const err = await authRes.text();
      return res.status(500).json({ error: `Auth API error: ${err}` });
    }
    const authData = await authRes.json();
    const users = authData.users || [];

    // Get settings for all users
    const settingsRes = await fetch(`${svc.url}/rest/v1/user_settings?select=user_id,facebook_user_name,ad_account_id,onboarding_completed&limit=500`, {
      headers: svc.headers,
    });
    const settings = settingsRes.ok ? await settingsRes.json() : [];
    const settingsMap = {};
    for (const s of settings) settingsMap[s.user_id] = s;

    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
      facebookName: settingsMap[u.id]?.facebook_user_name || null,
      adAccountId: settingsMap[u.id]?.ad_account_id || null,
      onboardingCompleted: settingsMap[u.id]?.onboarding_completed || false,
    }));

    res.json(result);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: user audit logs
app.get('/api/admin/users/:id/audit-logs', apiLimiter, requireAdmin, async (req, res) => {
  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

  const userId = req.params.id;

  try {
    const logsRes = await fetch(
      `${svc.url}/rest/v1/audit_logs?user_id=eq.${userId}&select=action,details,created_at&order=created_at.desc&limit=100`,
      { headers: svc.headers }
    );
    if (!logsRes.ok) return res.status(500).json({ error: 'Failed to fetch audit logs' });
    const logs = await logsRes.json();
    res.json(logs);
  } catch (err) {
    console.error('Admin audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Admin: security report
app.get('/api/admin/security-report', apiLimiter, requireAdmin, (req, res) => {
  res.json({
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "facebook.net"],
      connectSrc: ["'self'", "graph.facebook.com", "supabase.co"],
    },
    rateLimiting: {
      auth: { windowMs: 900000, max: 10 },
      api: { windowMs: 60000, max: 60 },
    },
    headers: ['HSTS', 'X-Content-Type-Options', 'X-Frame-Options', 'Permissions-Policy'],
    sentryEnabled: !!process.env.SENTRY_DSN,
  });
});

// ==================== ADMIN FEATURE FLAGS ====================

// Toggle a feature flag
app.post('/api/admin/feature-flags', apiLimiter, requireAdmin, async (req, res) => {
  const { key, enabled } = req.body;
  if (!key || typeof key !== 'string' || typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Missing key (string) or enabled (boolean)' });
  }

  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing service key' });

  try {
    const updateRes = await fetch(
      `${svc.url}/rest/v1/feature_flags?key=eq.${encodeURIComponent(key)}`,
      {
        method: 'PATCH',
        headers: { ...svc.headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ enabled, updated_at: new Date().toISOString() }),
      }
    );
    if (!updateRes.ok) return res.status(500).json({ error: 'Failed to update flag' });
    const rows = await updateRes.json();

    // Audit log
    await fetch(`${svc.url}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: svc.headers,
      body: JSON.stringify({
        user_id: req.adminUser.id,
        action: 'admin.feature_flag.toggle',
        details: { key, enabled },
      }),
    });

    res.json(rows[0] || { key, enabled });
  } catch (err) {
    console.error('Feature flag toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle feature flag' });
  }
});

// Create or update a feature flag (upsert by key)
app.put('/api/admin/feature-flags', apiLimiter, requireAdmin, async (req, res) => {
  const { key, label, description, enabled } = req.body;
  if (!key || typeof key !== 'string' || !label || typeof label !== 'string') {
    return res.status(400).json({ error: 'Missing key or label' });
  }

  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing service key' });

  try {
    const upsertRes = await fetch(
      `${svc.url}/rest/v1/feature_flags`,
      {
        method: 'POST',
        headers: {
          ...svc.headers,
          'Prefer': 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({
          key,
          label,
          description: description || '',
          enabled: enabled ?? false,
          updated_at: new Date().toISOString(),
        }),
      }
    );
    if (!upsertRes.ok) return res.status(500).json({ error: 'Failed to upsert flag' });
    const rows = await upsertRes.json();

    // Audit log
    await fetch(`${svc.url}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: svc.headers,
      body: JSON.stringify({
        user_id: req.adminUser.id,
        action: 'admin.feature_flag.upsert',
        details: { key, label, enabled: enabled ?? false },
      }),
    });

    res.json(rows[0] || { key, label });
  } catch (err) {
    console.error('Feature flag upsert error:', err);
    res.status(500).json({ error: 'Failed to create/update feature flag' });
  }
});

// Delete a feature flag
app.delete('/api/admin/feature-flags/:key', apiLimiter, requireAdmin, async (req, res) => {
  const { key } = req.params;

  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing service key' });

  try {
    await fetch(
      `${svc.url}/rest/v1/feature_flags?key=eq.${encodeURIComponent(key)}`,
      { method: 'DELETE', headers: svc.headers }
    );

    // Audit log
    await fetch(`${svc.url}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: svc.headers,
      body: JSON.stringify({
        user_id: req.adminUser.id,
        action: 'admin.feature_flag.delete',
        details: { key },
      }),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Feature flag delete error:', err);
    res.status(500).json({ error: 'Failed to delete feature flag' });
  }
});

// ==================== IMPERSONATE USER ====================

app.post('/api/admin/impersonate', apiLimiter, requireAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

  try {
    // Log the impersonation
    await fetch(`${svc.url}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: svc.headers,
      body: JSON.stringify({
        user_id: req.adminUser.id,
        action: 'admin.impersonate',
        details: { target_user_id: userId },
      }),
    });

    // Fetch target user's settings + history
    const [settingsRes, historyRes, authRes] = await Promise.all([
      fetch(`${svc.url}/rest/v1/user_settings?user_id=eq.${userId}&select=*`, { headers: svc.headers }),
      fetch(`${svc.url}/rest/v1/launch_history?user_id=eq.${userId}&select=*&order=launched_at.desc&limit=50`, { headers: svc.headers }),
      fetch(`${svc.url}/auth/v1/admin/users/${userId}`, { headers: svc.headers }),
    ]);

    const settings = await settingsRes.json();
    const history = await historyRes.json();
    const authUser = authRes.ok ? await authRes.json() : null;

    // Redact access token
    if (Array.isArray(settings) && settings[0]) {
      delete settings[0].access_token;
    }

    res.json({
      email: authUser?.email || 'unknown',
      settings: Array.isArray(settings) ? settings[0] || null : null,
      history: Array.isArray(history) ? history : [],
    });
  } catch (err) {
    console.error('Impersonate error:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// ==================== 2FA (TOTP) ====================

app.post('/api/admin/2fa/setup', apiLimiter, requireAdmin, async (req, res) => {
  try {
    const { TOTP } = await import('otpauth');
    const totp = new TOTP({
      issuer: 'BoltAds',
      label: req.adminUser.email || 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    // Return the URI for QR code generation + the raw secret
    res.json({ uri: totp.toString(), secret: totp.secret.base32 });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: 'Failed to generate 2FA secret' });
  }
});

app.post('/api/admin/2fa/enable', apiLimiter, requireAdmin, async (req, res) => {
  const { secret, code } = req.body;
  if (!secret || !code) return res.status(400).json({ error: 'Missing secret or code' });

  try {
    const { TOTP, Secret } = await import('otpauth');
    const totp = new TOTP({
      issuer: 'BoltAds',
      label: req.adminUser.email || 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) return res.status(400).json({ error: 'Invalid code' });

    // Generate 8 backup codes
    const backupCodes = Array.from({ length: 8 }, () => randomBytes(4).toString('hex'));

    // Save to user_settings via service role
    const svc = getServiceHeaders();
    if (!svc) return res.status(500).json({ error: 'Missing service key' });

    await fetch(`${svc.url}/rest/v1/user_settings?user_id=eq.${req.adminUser.id}`, {
      method: 'PATCH',
      headers: svc.headers,
      body: JSON.stringify({
        totp_secret: secret,
        totp_enabled: true,
        totp_backup_codes: backupCodes,
      }),
    });

    res.json({ success: true, backupCodes });
  } catch (err) {
    console.error('2FA enable error:', err);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

app.post('/api/admin/2fa/validate', apiLimiter, requireAdmin, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing service key' });

  try {
    const settingsRes = await fetch(
      `${svc.url}/rest/v1/user_settings?user_id=eq.${req.adminUser.id}&select=totp_secret,totp_enabled,totp_backup_codes`,
      { headers: svc.headers }
    );
    const rows = await settingsRes.json();
    const settings = Array.isArray(rows) ? rows[0] : null;

    if (!settings?.totp_enabled || !settings?.totp_secret) {
      return res.json({ valid: true }); // 2FA not enabled, skip
    }

    // Check TOTP code
    const { TOTP, Secret } = await import('otpauth');
    const totp = new TOTP({
      issuer: 'BoltAds',
      label: req.adminUser.email || 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(settings.totp_secret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta !== null) return res.json({ valid: true });

    // Check backup codes
    const backupCodes = settings.totp_backup_codes || [];
    const idx = backupCodes.indexOf(code);
    if (idx !== -1) {
      // Consume the backup code
      backupCodes.splice(idx, 1);
      await fetch(`${svc.url}/rest/v1/user_settings?user_id=eq.${req.adminUser.id}`, {
        method: 'PATCH',
        headers: svc.headers,
        body: JSON.stringify({ totp_backup_codes: backupCodes }),
      });
      return res.json({ valid: true, usedBackupCode: true });
    }

    res.status(400).json({ valid: false, error: 'Invalid code' });
  } catch (err) {
    console.error('2FA validate error:', err);
    res.status(500).json({ error: 'Validation failed' });
  }
});

app.post('/api/admin/2fa/disable', apiLimiter, requireAdmin, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing service key' });

  try {
    // Verify current code before disabling
    const settingsRes = await fetch(
      `${svc.url}/rest/v1/user_settings?user_id=eq.${req.adminUser.id}&select=totp_secret,totp_enabled`,
      { headers: svc.headers }
    );
    const rows = await settingsRes.json();
    const settings = Array.isArray(rows) ? rows[0] : null;

    if (!settings?.totp_enabled) return res.json({ success: true });

    const { TOTP, Secret } = await import('otpauth');
    const totp = new TOTP({
      issuer: 'BoltAds',
      label: req.adminUser.email || 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(settings.totp_secret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) return res.status(400).json({ error: 'Invalid code' });

    await fetch(`${svc.url}/rest/v1/user_settings?user_id=eq.${req.adminUser.id}`, {
      method: 'PATCH',
      headers: svc.headers,
      body: JSON.stringify({ totp_secret: null, totp_enabled: false, totp_backup_codes: null }),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('2FA disable error:', err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// ==================== BILLING (STRIPE) ====================

// Stripe webhook needs raw body — register BEFORE json parser hits it
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) return res.status(200).send('Stripe not configured');

  try {
    const stripe = (await import('stripe')).default(stripeKey);
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    const svc = getServiceHeaders();
    if (!svc) return res.status(500).send('Missing service key');

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan || 'pro';
      if (userId) {
        await fetch(`${svc.url}/rest/v1/user_settings?user_id=eq.${userId}`, {
          method: 'PATCH',
          headers: svc.headers,
          body: JSON.stringify({
            stripe_customer_id: session.customer,
            plan,
            plan_expires_at: null, // active subscription
          }),
        });
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      // Downgrade to free
      await fetch(`${svc.url}/rest/v1/user_settings?stripe_customer_id=eq.${customerId}`, {
        method: 'PATCH',
        headers: svc.headers,
        body: JSON.stringify({ plan: 'free' }),
      });
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.post('/api/billing/create-checkout', apiLimiter, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(400).json({ error: 'Stripe not configured yet' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { plan } = req.body;
  const prices = { pro: 4900, agency: 14900 }; // cents
  const amount = prices[plan];
  if (!amount) return res.status(400).json({ error: 'Invalid plan' });

  try {
    const stripe = (await import('stripe')).default(stripeKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Bolt Ads ${plan.charAt(0).toUpperCase() + plan.slice(1)}` },
          unit_amount: amount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: { user_id: user.id, plan },
      success_url: `${req.headers.origin || 'https://bolt-ads.com'}/settings?billing=success`,
      cancel_url: `${req.headers.origin || 'https://bolt-ads.com'}/settings?billing=cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/billing/portal', apiLimiter, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(400).json({ error: 'Stripe not configured yet' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing service key' });

  try {
    const settingsRes = await fetch(
      `${svc.url}/rest/v1/user_settings?user_id=eq.${user.id}&select=stripe_customer_id`,
      { headers: svc.headers }
    );
    const rows = await settingsRes.json();
    const customerId = rows?.[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No billing account found' });

    const stripe = (await import('stripe')).default(stripeKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin || 'https://bolt-ads.com'}/settings`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

app.get('/api/billing/status', apiLimiter, async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const svc = getServiceHeaders();
  if (!svc) return res.status(500).json({ error: 'Missing service key' });

  try {
    const settingsRes = await fetch(
      `${svc.url}/rest/v1/user_settings?user_id=eq.${user.id}&select=plan,plan_expires_at,launches_this_month,launches_reset_at,stripe_customer_id`,
      { headers: svc.headers }
    );
    const rows = await settingsRes.json();
    const s = rows?.[0] || {};

    // Reset monthly counter if needed
    const now = new Date();
    const resetAt = s.launches_reset_at ? new Date(s.launches_reset_at) : null;
    let launchesThisMonth = s.launches_this_month || 0;
    if (!resetAt || resetAt < new Date(now.getFullYear(), now.getMonth(), 1)) {
      launchesThisMonth = 0;
      // Reset in DB
      await fetch(`${svc.url}/rest/v1/user_settings?user_id=eq.${user.id}`, {
        method: 'PATCH',
        headers: svc.headers,
        body: JSON.stringify({
          launches_this_month: 0,
          launches_reset_at: now.toISOString(),
        }),
      });
    }

    res.json({
      plan: s.plan || 'free',
      launchesThisMonth,
      launchLimit: s.plan === 'pro' || s.plan === 'agency' ? null : 3,
      hasStripe: !!s.stripe_customer_id,
    });
  } catch (err) {
    console.error('Billing status error:', err);
    res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

// --- Sentry error handler (must be after routes, before static) ---
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// --- Error handler middleware ---
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Static files with cache headers ---
const distPath = join(__dirname, 'dist');
// Hashed assets — cache forever
app.use('/assets', express.static(join(distPath, 'assets'), {
  maxAge: '1y',
  immutable: true,
}));
// Other static files (excluding index.html — handled by SPA fallback)
app.use(express.static(distPath, { index: false }));

// SPA fallback — always serve fresh index.html
app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
});
