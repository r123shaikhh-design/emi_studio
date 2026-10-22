
export const API = import.meta.env.VITE_API_URL || '';
const csrfToken = () => {
  const c = document.cookie.split('; ').find((x) => x.startsWith('XSRF-TOKEN='));
  return c ? decodeURIComponent(c.split('=')[1]) : null;
};

/** Calls the Spring Boot API. Throws an Error with .status and .fieldErrors on non-2xx responses. */
export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const t = csrfToken();
    if (t) headers['X-XSRF-TOKEN'] = t;
  }
  const res = await fetch(API + '/api' + path, {
    method, headers, credentials: 'include', body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error(data?.message || 'Request failed'), { status: res.status, fieldErrors: data?.fieldErrors || {} });
  }
  return data;
}

const nf = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const num = (v) => nf.format(v);
export const money = (v) => '₹' + nf.format(v);
export const errorText = (e) => {
  const f = Object.values(e.fieldErrors || {});
  return f.length ? f.join(' ') : e.message;
};
