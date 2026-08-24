// Client for the admin user-management endpoints (Administrator only).
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export interface AdminUser {
  email: string
  firstName: string
  lastName: string
  roles: string[]
  deactivated?: boolean
  customerId?: string
  customerName?: string
  createdAt?: string
  updatedAt?: string
  lastLoginAt?: string
}

export type CountryCode = 'DE' | 'AT' | 'CH'

export interface CustomerAddress {
  street: string
  streetNumber: string
  postalCode: string
  city: string
  country: CountryCode
}

export interface Customer {
  id: string
  name: string
  address: CustomerAddress
}

export interface CustomerWithUsers extends Customer {
  users: { email: string; firstName: string; lastName: string; deactivated?: boolean }[]
}

/** DACH countries with German display labels. */
export const COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: 'CH', label: 'Schweiz' },
  { code: 'DE', label: 'Deutschland' },
  { code: 'AT', label: 'Österreich' },
]

export function countryLabel(code: CountryCode): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code
}

export class AdminError extends Error {
  code?: string
  status: number
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'AdminError'
    this.status = status
    this.code = code
  }
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function parseError(res: Response): Promise<AdminError> {
  let body: any = null
  try {
    body = await res.json()
  } catch {
    // no JSON body
  }
  return new AdminError(body?.error || `Fehler (${res.status})`, res.status, body?.code)
}

export async function listUsers(includeDeactivated: boolean): Promise<AdminUser[]> {
  const res = await fetch(`${apiBaseUrl}/admin/users?includeDeactivated=${includeDeactivated}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.users as AdminUser[]
}

export interface CreateUserInput {
  email: string
  firstName: string
  lastName: string
  roles: string[]
  /** Either an existing customer id … */
  customerId?: string
  /** … or a new customer to create and attach. */
  newCustomer?: { name: string; address: CustomerAddress }
  /** Send the invitation mail (portal link + how the login works, no code). */
  invite?: boolean
}

export interface CreateUserResult {
  user: AdminUser
  invited?: boolean
  /** Set when the account exists but the invitation could not be delivered. */
  inviteError?: string
}

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  const res = await fetch(`${apiBaseUrl}/admin/users`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as CreateUserResult
}

// ── Bulk import ──────────────────────────────────────────────────────────────

export interface ExtractedUser {
  firstName: string
  lastName: string
  email: string
}

export interface SkippedRow {
  value: string
  reason: string
}

export interface ParseResult {
  users: ExtractedUser[]
  /** Rows the server refused, each with a reason the dialog shows verbatim. */
  skipped: SkippedRow[]
  model: string
}

/** Reads the list out of the file's text. Writes nothing. */
export async function parseUserImport(text: string): Promise<ParseResult> {
  const res = await fetch(`${apiBaseUrl}/admin/users/import/parse`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as ParseResult
}

export interface ImportInput {
  users: ExtractedUser[]
  roles: string[]
  customerId?: string
  newCustomer?: { name: string; address: CustomerAddress }
  /** Send each created user the invitation mail. */
  invite?: boolean
}

export interface ImportRowResult {
  email: string
  status: 'created' | 'duplicate' | 'invalid'
  message?: string
  /** Only set on created rows when an invitation was requested. */
  invited?: boolean
}

export interface ImportResult {
  results: ImportRowResult[]
  created: number
  invited?: number
  customerId: string
}

export async function importUsers(input: ImportInput): Promise<ImportResult> {
  const res = await fetch(`${apiBaseUrl}/admin/users/import`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as ImportResult
}

export interface UpdateUserInput {
  firstName: string
  lastName: string
  roles: string[]
  customerId: string
}

/**
 * Edit an existing user. The email is the key, not a field: it is what people
 * log in with and what course progress and course instances reference, so it is
 * passed in the path and never in the body.
 */
export async function updateUser(email: string, input: UpdateUserInput): Promise<AdminUser> {
  const res = await fetch(`${apiBaseUrl}/admin/users/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.user as AdminUser
}

export async function listCustomers(): Promise<Customer[]> {
  const res = await fetch(`${apiBaseUrl}/admin/customers`, { headers: authHeaders() })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.customers as Customer[]
}

export async function listCustomersWithUsers(): Promise<CustomerWithUsers[]> {
  const res = await fetch(`${apiBaseUrl}/admin/customers?withUsers=true`, { headers: authHeaders() })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.customers as CustomerWithUsers[]
}

export async function createCustomer(name: string, address: CustomerAddress): Promise<Customer> {
  const res = await fetch(`${apiBaseUrl}/admin/customers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, address }),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.customer as Customer
}

export async function updateCustomer(id: string, name: string, address: CustomerAddress): Promise<Customer> {
  const res = await fetch(`${apiBaseUrl}/admin/customers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ name, address }),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.customer as Customer
}

// ── Orders ───────────────────────────────────────────────────────────────
export interface Order {
  id: string
  customerId: string
  customerName?: string
  courseId: string
  courseTitle?: string
  startDate: string
  endDate: string
  seats: number
  /** Consumed seats (one per user who started a module of the course). */
  usedSeats?: number
  createdAt: string
}

export interface CreateOrderInput {
  courseId: string
  customerId: string
  startDate: string
  endDate: string
  seats: number
}

export async function listOrders(): Promise<Order[]> {
  const res = await fetch(`${apiBaseUrl}/admin/orders`, { headers: authHeaders() })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.orders as Order[]
}

export async function createOrder(input: CreateOrderInput): Promise<{ id: string }> {
  const res = await fetch(`${apiBaseUrl}/admin/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.order
}

// ── Course instances (Durchführungen) ──────────────────────────────────────
export interface InstancePerson {
  email: string
  name: string
}

export interface CourseInstance {
  id: string
  courseId: string
  courseTitle?: string
  courseVersion?: number
  participants: InstancePerson[]
  trainers: InstancePerson[]
  startDate: string
  createdAt: string
}

export interface CreateInstanceInput {
  courseId: string
  participantEmails: string[]
  trainerEmails: string[]
  startDate: string
}

export async function listCourseInstances(): Promise<CourseInstance[]> {
  const res = await fetch(`${apiBaseUrl}/admin/course-instances`, { headers: authHeaders() })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.instances as CourseInstance[]
}

export async function createCourseInstance(input: CreateInstanceInput): Promise<{ id: string }> {
  const res = await fetch(`${apiBaseUrl}/admin/course-instances`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.instance
}

export async function updateCourseInstance(id: string, input: CreateInstanceInput): Promise<{ id: string }> {
  const res = await fetch(`${apiBaseUrl}/admin/course-instances/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.instance
}

export async function setDeactivated(email: string, deactivated: boolean): Promise<AdminUser> {
  const res = await fetch(`${apiBaseUrl}/admin/users/${encodeURIComponent(email)}/deactivated`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ deactivated }),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.user as AdminUser
}
