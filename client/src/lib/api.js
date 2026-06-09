// ─── API client ───────────────────────────────────────────────────────────────
// Thin wrapper around fetch that:
//  - Prepends /api to all paths
//  - Throws a structured error ({ status, errors }) on non-2xx responses
//  - Returns the parsed JSON body (or null for 204)

const BASE = '/api';

async function request(method, path, body, opts = {}) {
  const options = {
    method,
    headers: {},
    ...opts,
  };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, options);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.errors?.[0] ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.errors = data?.errors ?? [err.message];
    throw err;
  }
  return data;
}

// ─── File upload (multipart) ──────────────────────────────────────────────────
async function upload(path, formData) {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.errors?.[0] ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.errors = data?.errors ?? [err.message];
    throw err;
  }
  return data;
}

export const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  put:    (path, body)   => request('PUT',    path, body),
  delete: (path)         => request('DELETE', path),
  upload: (path, form)   => upload(path, form),
};
