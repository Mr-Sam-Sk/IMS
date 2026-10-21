export type AccountRole = 'admin' | 'business'

export type Account = {
  id: string
  role: AccountRole
  name: string
  email: string
  username: string
  businessName?: string
  passwordSalt: string
  passwordHash: string
  createdAt: string
}

export type NewAccount = Omit<Account, 'id' | 'passwordSalt' | 'passwordHash' | 'createdAt'> & { password: string }

const accountsKey = 'fieldwork-accounts-v1'
const sessionKey = 'fieldwork-session-v1'
const passwordIterations = 310_000

function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function decode(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function derivePassword(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: passwordIterations, hash: 'SHA-256' }, key, 256)
  return encode(new Uint8Array(bits))
}

export function readAccounts(): Account[] {
  try {
    const accounts = JSON.parse(localStorage.getItem(accountsKey) ?? '[]') as Account[]
    return Array.isArray(accounts) ? accounts : []
  } catch {
    return []
  }
}

export function writeAccounts(accounts: Account[]) {
  localStorage.setItem(accountsKey, JSON.stringify(accounts))
}

export function readSessionId() {
  return localStorage.getItem(sessionKey)
}

export function writeSessionId(id: string | null) {
  if (id) localStorage.setItem(sessionKey, id)
  else localStorage.removeItem(sessionKey)
}

export async function createAccount(input: NewAccount): Promise<Account> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return {
    id: crypto.randomUUID(),
    role: input.role,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    username: input.username.trim().toLowerCase(),
    businessName: input.businessName?.trim(),
    passwordSalt: encode(salt),
    passwordHash: await derivePassword(input.password, salt),
    createdAt: new Date().toISOString(),
  }
}

export async function verifyPassword(account: Account, password: string) {
  const hash = await derivePassword(password, decode(account.passwordSalt))
  return hash === account.passwordHash
}

export function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = crypto.getRandomValues(new Uint8Array(14))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}
