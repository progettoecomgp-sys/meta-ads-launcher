import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
const mockGetSession = vi.fn().mockResolvedValue({
  data: { session: { user: { id: 'user-123' } } },
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    from: mockFrom,
  },
}));

const { logAction } = await import('../../utils/auditLog');

describe('logAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
    });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('inserts audit log with correct user_id and action', async () => {
    logAction('campaign.launch', { campaignId: 'c1' });

    // Wait for fire-and-forget promises
    await new Promise((r) => setTimeout(r, 10));

    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      action: 'campaign.launch',
      details: { campaignId: 'c1' },
    });
  });

  it('does not insert when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    logAction('test.action');
    await new Promise((r) => setTimeout(r, 10));

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('uses empty details by default', async () => {
    logAction('settings.update');
    await new Promise((r) => setTimeout(r, 10));

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      action: 'settings.update',
      details: {},
    });
  });
});
