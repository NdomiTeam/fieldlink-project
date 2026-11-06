const API_BASE = process.env.NEXT_PUBLIC_FIELDLINK_API_URL || 'http://localhost:4100'

type ApiResult<T> = { success: true; data: T; message?: string } | { success: false; error: string; code?: string }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  const json = (await res.json().catch(() => null)) as ApiResult<T> | null
  if (!res.ok || !json || json.success === false) {
    throw new Error((json && 'error' in json && json.error) || `Request failed (${res.status})`)
  }
  return json.data
}

// --- Student session (stored locally, issued once at SSO exchange) ---
const SESSION_KEY = 'fieldlink.studentSessionToken'
export function getStudentSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(SESSION_KEY)
}
export function setStudentSessionToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SESSION_KEY, token)
}
function studentAuthHeaders(): Record<string, string> {
  const token = getStudentSessionToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export type Student = {
  id: string
  ndomi_user_id: string
  name: string
  email: string
  phone: string | null
  picture: string | null
  university_name: string | null
  field_of_study: string | null
  year_of_study: string | null
  faculty_or_department: string | null
}

export type Application = {
  id: string
  status:
    | 'pending_admin'
    | 'approved_to_company'
    | 'rejected_by_admin'
    | 'accepted_by_company'
    | 'rejected_by_company'
    | 'awaiting_student_confirmation'
    | 'confirmed'
    | 'expired'
  confirmation_deadline: string | null
  field_space_id: string
  field_spaces?: { id: string; title: string; company_id: string; company_profiles?: { name: string; logo_url: string | null } }
}

export type Payment = { id: string; applications_included: number; applications_used: number }

export const studentApi = {
  exchangeSsoToken: (token: string) =>
    request<{ sessionToken: string; student: Student }>('/api/students/sso/exchange', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  me: () => request<Student>('/api/students/me', { headers: studentAuthHeaders() }),
  listApplications: () => request<Application[]>('/api/students/applications', { headers: studentAuthHeaders() }),
  createPayment: (provider: string) =>
    request<Payment>('/api/students/payments', {
      method: 'POST',
      headers: studentAuthHeaders(),
      body: JSON.stringify({ provider }),
    }),
  confirmApplication: (applicationId: string) =>
    request<void>(`/api/students/applications/${applicationId}/confirm`, {
      method: 'POST',
      headers: studentAuthHeaders(),
    }),
  uploadDocument: (applicationId: string, documentType: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ id: string }>(`/api/applications/${applicationId}/documents/${documentType}`, {
      method: 'POST',
      headers: studentAuthHeaders(),
      body: form,
    })
  },
}

// --- Company / admin portal session ---
const COMPANY_TOKEN_KEY = 'fieldlink.companyAccessToken'
const ADMIN_TOKEN_KEY = 'fieldlink.adminAccessToken'

function portalToken(role: 'company' | 'admin'): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(role === 'company' ? COMPANY_TOKEN_KEY : ADMIN_TOKEN_KEY)
}
export function setPortalToken(role: 'company' | 'admin', token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(role === 'company' ? COMPANY_TOKEN_KEY : ADMIN_TOKEN_KEY, token)
}
export function clearPortalToken(role: 'company' | 'admin') {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(role === 'company' ? COMPANY_TOKEN_KEY : ADMIN_TOKEN_KEY)
}
function portalAuthHeaders(role: 'company' | 'admin'): Record<string, string> {
  const token = portalToken(role)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export type CompanyApplicant = {
  id: string
  status: Application['status']
  created_at: string
  students?: { name: string; email: string; phone: string | null; university_name: string | null }
  field_spaces?: { id: string; title: string; company_profiles?: { name: string } }
}

export const authApi = {
  companyRegister: (email: string, password: string) =>
    request<{ id: string; name: string }>('/api/auth/company/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  companyLogin: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string }>('/api/auth/company/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  adminRegister: (email: string, password: string, name: string) =>
    request<{ id: string }>('/api/auth/admin/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  adminLogin: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string }>('/api/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
}

export const companyApi = {
  listApplications: () => request<CompanyApplicant[]>('/api/applications/company', { headers: portalAuthHeaders('company') }),
  accept: (applicationId: string) =>
    request<void>(`/api/applications/${applicationId}/company-accept`, { method: 'POST', headers: portalAuthHeaders('company') }),
  reject: (applicationId: string) =>
    request<void>(`/api/applications/${applicationId}/company-reject`, { method: 'POST', headers: portalAuthHeaders('company') }),
}

export const adminApi = {
  listApplications: (status?: string) =>
    request<CompanyApplicant[]>(`/api/applications/admin${status ? `?status=${status}` : ''}`, { headers: portalAuthHeaders('admin') }),
  approve: (applicationId: string) =>
    request<void>(`/api/applications/${applicationId}/admin-approve`, { method: 'POST', headers: portalAuthHeaders('admin') }),
  reject: (applicationId: string) =>
    request<void>(`/api/applications/${applicationId}/admin-reject`, { method: 'POST', headers: portalAuthHeaders('admin') }),
}
