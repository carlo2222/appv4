// @ts-nocheck
async function request(path, { method = 'GET', token, body, isFormData = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isFormData && body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // risposta senza corpo
  }

  if (!response.ok) {
    const err = new Error(data?.error || `Errore ${response.status}`);
    err.status = response.status;
    err.problems = data?.problems;
    throw err;
  }
  return data;
}

export const adminLogin = (email, password) => request('/admin/login', { method: 'POST', body: { email, password } });

export const adminListUsers = (token) => request('/admin/users', { token });
export const adminCreateUser = (token, data) => request('/admin/users', { method: 'POST', token, body: data });
export const adminUpdateUser = (token, id, patch) => request(`/admin/users/${id}`, { method: 'PATCH', token, body: patch });
export const adminResetPassword = (token, id, newPassword) =>
  request(`/admin/users/${id}/reset-password`, { method: 'POST', token, body: { newPassword } });
export const adminDeleteUser = (token, id) => request(`/admin/users/${id}`, { method: 'DELETE', token });

export const adminListQuestions = (token, filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return request(`/admin/questions${params ? `?${params}` : ''}`, { token });
};
export const adminCreateQuestion = (token, q) => request('/admin/questions', { method: 'POST', token, body: q });
export const adminUpdateQuestion = (token, id, patch) => request(`/admin/questions/${id}`, { method: 'PATCH', token, body: patch });
export const adminDeleteQuestion = (token, id) => request(`/admin/questions/${id}`, { method: 'DELETE', token });
export const adminImportQuestions = (token, file, mode) => {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/admin/questions/import?mode=${mode}`, { method: 'POST', token, body: formData, isFormData: true });
};

export const adminGetStats = (token) => request('/admin/stats', { token });
