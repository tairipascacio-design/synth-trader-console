import { supabase } from '@/integrations/supabase/client';

/** Console identity does not authorize the independent Droplet API. */
export async function currentConsoleUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function isConsoleAdmin() {
  const user = await currentConsoleUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  return !error && data === true;
}

export async function signOutConsole() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}