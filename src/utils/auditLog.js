import { supabase } from '../lib/supabase';

/**
 * Log an action to the audit trail.
 * Fire-and-forget — never blocks the UI.
 *
 * @param {string} action - e.g. 'campaign.launch', 'settings.update', 'auth.login'
 * @param {object} details - action-specific metadata
 */
export function logAction(action, details = {}) {
  supabase.auth.getSession().then(({ data }) => {
    const userId = data?.session?.user?.id;
    if (!userId) return;

    supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      details,
    }).then(({ error }) => {
      if (error) console.error('Audit log failed:', error.message);
    });
  });
}
