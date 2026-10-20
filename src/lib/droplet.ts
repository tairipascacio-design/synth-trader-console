import type { Database } from '@/integrations/supabase/types';

export type TableName = 'signals' | 'orders' | 'positions' | 'fills' | 'events';
export type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];

/** Same-origin only: Nginx routes /api/ghost to the Node service on the Droplet. */
export async function dropletRequest<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  if (typeof window === 'undefined') throw new Error('Abre la consola desde tu Droplet.');
  const response = await fetch(`/api/ghost/${path}`, {
    method: body === undefined ? 'GET' : method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('El servicio del Droplet no está instalado en esta dirección.');
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'El Droplet no respondió correctamente.');
  return result as T;
}

export type Operator = { email: string; role: 'admin' };
export async function currentOperator() {
  try { return await dropletRequest<Operator>('session'); } catch { return null; }
}
export async function signOut() { await dropletRequest('logout', {}); }