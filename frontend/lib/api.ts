export const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
type Options = RequestInit & { auth?: boolean };
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || body?.message || 'Something went wrong');
  return body.data as T;
}
export const money = (paise = 0) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
