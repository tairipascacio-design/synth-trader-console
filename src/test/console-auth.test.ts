import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ getUser: vi.fn(), signOut: vi.fn(), rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getUser: auth.getUser, signOut: auth.signOut }, rpc: auth.rpc },
}));
import { currentConsoleUser, isConsoleAdmin } from '@/lib/console-auth';

describe('Google console access independent of Droplet', () => {
  beforeEach(() => vi.resetAllMocks());

  it('accepts a validated Google session without a Droplet session request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    auth.getUser.mockResolvedValue({ data: { user: { id: 'google-user' } }, error: null });
    expect(await currentConsoleUser()).toEqual({ id: 'google-user' });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does not grant operator privileges to every signed-in Google account', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'google-user' } }, error: null });
    auth.rpc.mockResolvedValue({ data: false, error: null });
    expect(await isConsoleAdmin()).toBe(false);
    expect(auth.rpc).toHaveBeenCalledWith('has_role', { _user_id: 'google-user', _role: 'admin' });
  });

  it('accepts the existing server-validated administrator role', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'operator' } }, error: null });
    auth.rpc.mockResolvedValue({ data: true, error: null });
    expect(await isConsoleAdmin()).toBe(true);
  });
});