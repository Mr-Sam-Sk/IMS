import { useState, type FormEvent } from 'react'
import { ArrowRight, Building2, Check, Copy, KeyRound, Plus, ShieldCheck, UserRound, X } from 'lucide-react'
import { type Account, generateTemporaryPassword } from './auth'

type AccessFields = { name: string; email: string; username: string; password: string }
export type BusinessDraft = AccessFields & { businessName: string }
type ProfileDraft = { name: string; email: string; businessName: string }

export function AccessScreen({ setup, audience, error, onSetup, onLogin }: {
  setup: boolean
  audience: 'admin' | 'business'
  error: string
  onSetup: (fields: AccessFields) => Promise<void>
  onLogin: (username: string, password: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const form = new FormData(event.currentTarget)
    if (setup) {
      await onSetup({
        name: String(form.get('name')).trim(),
        email: String(form.get('email')).trim(),
        username: String(form.get('username')).trim(),
        password: String(form.get('password')),
      })
    } else {
      await onLogin(String(form.get('username')).trim(), String(form.get('password')))
    }
    setBusy(false)
  }

  return <main className="access-shell">
    <section className="access-story">
      <div className="access-brand"><div className="brand-mark"><Building2 size={21} /></div><strong>fieldwork</strong></div>
      <div className="access-story-content"><div className="eyebrow">OPERATIONS, IN ONE PLACE</div><h1>Make the work<br />flow better.</h1><p>Inventory, orders, attendance, and payroll estimates for the people running your business.</p><div className="access-story-bottom"><span><ShieldCheck size={16} /> Your workspace is ready when you are</span><span>FIELDWORK OPERATIONS · 2026</span></div></div>
    </section>
    <section className="access-form-wrap"><div className="access-form-card">
      <div className="access-form-icon">{setup ? <ShieldCheck size={20} /> : <KeyRound size={20} />}</div>
      <div className="section-kicker">{setup ? 'FIRST-TIME SETUP' : audience === 'admin' ? 'ADMIN PORTAL' : 'BUSINESS WORKSPACE'}</div>
      <h2>{setup ? 'Create admin access' : audience === 'admin' ? 'Admin sign in' : 'Business sign in'}</h2>
      <p className="access-subtitle">{setup ? 'Set up the administrator who will create business workspaces.' : audience === 'admin' ? 'Sign in to manage business workspaces and access.' : 'Use the business username and password provided by your administrator.'}</p>
      <form className="access-form" onSubmit={submit}>
        {setup && <label>Administrator name<input name="name" autoComplete="name" placeholder="Your name" required autoFocus /></label>}
        {setup && <label>Administrator email<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required /></label>}
        <label>Username<input name="username" autoComplete="username" placeholder={setup ? 'Choose a username' : 'Your username'} title="Use letters, numbers, periods, underscores, or hyphens" required autoFocus={!setup} /></label>
        <label>Password<input name="password" type="password" autoComplete={setup ? 'new-password' : 'current-password'} placeholder={setup ? 'At least 12 characters' : 'Your password'} minLength={setup ? 12 : 1} required /></label>
        {error && <div className="access-error" role="alert">{error}</div>}
        <button className="button button-primary access-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : setup ? 'Create administrator' : audience === 'admin' ? 'Sign in as admin' : 'Sign in to business'} <ArrowRight size={16} /></button>
      </form>
      {!setup && <a className="access-switch-link" href={audience === 'admin' ? '/business/login' : '/admin/login'}>{audience === 'admin' ? 'Business sign in' : 'Administrator sign in'} <ArrowRight size={13} /></a>}
      <div className="access-security-note">This local demo stores accounts in this browser. Use test credentials only; production access requires a server-side identity service.</div>
    </div></section>
  </main>
}

export function BusinessesView({ businesses, onCreate }: {
  businesses: Account[]
  onCreate: (business: BusinessDraft) => Promise<string | null>
}) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [credentials, setCredentials] = useState<{ businessName: string; username: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const draft: BusinessDraft = {
      businessName: String(form.get('businessName')).trim(),
      name: String(form.get('name')).trim(),
      email: String(form.get('email')).trim(),
      username: String(form.get('username')).trim(),
      password: generateTemporaryPassword(),
    }
    const message = await onCreate(draft)
    if (message) {
      setError(message)
      return
    }
    setCredentials({ businessName: draft.businessName, username: draft.username, password: draft.password })
    setError('')
    setShowForm(false)
  }

  async function copyCredentials() {
    if (!credentials) return
    await navigator.clipboard.writeText(`Fieldwork login\nBusiness: ${credentials.businessName}\nUsername: ${credentials.username}\nTemporary password: ${credentials.password}`)
    setCopied(true)
  }

  return <>
    <div className="page-heading"><div><div className="eyebrow">ADMINISTRATION</div><h1>Business accounts</h1><p>Create workspaces and issue first-time login credentials.</p></div><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Create business</button></div>
    <section className="admin-summary"><div className="admin-summary-icon"><Building2 size={18} /></div><div><strong>{businesses.length} business {businesses.length === 1 ? 'workspace' : 'workspaces'}</strong><span>Each account has separate inventory and workforce records in this browser.</span></div><div className="admin-summary-badge"><ShieldCheck size={15} /> Admin</div></section>
    <section className="panel table-panel admin-table-panel"><div className="table-toolbar"><div><div className="section-kicker">ACCESS DIRECTORY</div><h2>Businesses <span className="count-pill">{businesses.length}</span></h2></div><span className="table-period"><UserRound size={15} /> Login access</span></div>
      {businesses.length ? <div className="table-scroll"><table><thead><tr><th>Business</th><th>Account owner</th><th>Username</th><th>Contact email</th><th>Created</th><th>Access</th></tr></thead><tbody>{businesses.map((business) => <tr key={business.id}><td><div className="business-cell"><span className="business-cell-icon"><Building2 size={16} /></span><strong>{business.businessName}</strong></div></td><td>{business.name}</td><td><span className="username-label">{business.username}</span></td><td>{business.email}</td><td>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(business.createdAt))}</td><td><span className="access-active"><i /> Active</span></td></tr>)}</tbody></table></div> : <div className="empty-state">No businesses yet. Create an account to issue the first login.</div>}
      <div className="table-footer"><span>Temporary passwords are displayed once at account creation.</span><span>Do not share credentials in public channels.</span></div>
    </section>
    {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="business-modal-title">
        <div className="modal-heading"><div><div className="section-kicker">ADMIN · NEW WORKSPACE</div><h2 id="business-modal-title">Create business login</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setShowForm(false)}><X size={18} /></button></div>
        <form className="modal-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="form-wide">Business name<input name="businessName" placeholder="e.g. Northstar Fabrication" required autoFocus /></label>
            <label>Account owner<input name="name" placeholder="Contact person" required /></label>
            <label>Contact email<input name="email" type="email" placeholder="owner@business.com" required /></label>
            <label className="form-wide">Login username<input name="username" autoComplete="off" title="Use letters, numbers, periods, underscores, or hyphens" placeholder="northstar" required /></label>
          </div>
          <div className="form-hint"><KeyRound size={14} /> A strong temporary password will be generated and shown once.</div>
          {error && <div className="access-error" role="alert">{error}</div>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="button button-primary" type="submit"><Plus size={16} /> Create account</button></div>
        </form>
      </section>
    </div>}
    {credentials && <div className="modal-backdrop" role="presentation"><section className="modal credential-modal" role="dialog" aria-modal="true" aria-labelledby="credentials-title"><div className="modal-heading"><div><div className="section-kicker">ACCOUNT CREATED</div><h2 id="credentials-title">Login for {credentials.businessName}</h2></div><button className="icon-button" aria-label="Close credentials" onClick={() => setCredentials(null)}><X size={18} /></button></div><div className="credential-body"><div className="credential-warning"><KeyRound size={17} /><span>Copy these credentials now. The temporary password will not be shown again.</span></div><div className="credential-value"><span>Username</span><strong>{credentials.username}</strong></div><div className="credential-value"><span>Temporary password</span><strong>{credentials.password}</strong></div><div className="credential-actions"><button className="button button-secondary" onClick={copyCredentials}><Copy size={15} /> {copied ? 'Copied' : 'Copy login'}</button><button className="button button-primary" onClick={() => setCredentials(null)}><Check size={15} /> Done</button></div></div></section></div>}
  </>
}

export function ProfileView({ account, onSave }: {
  account: Account
  onSave: (profile: ProfileDraft) => void
}) {
  const [saved, setSaved] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSave({
      name: String(form.get('name')).trim(),
      email: String(form.get('email')).trim(),
      businessName: String(form.get('businessName') ?? '').trim(),
    })
    setSaved(true)
  }

  return <>
    <div className="page-heading"><div><div className="eyebrow">ACCOUNT SETTINGS</div><h1>Profile</h1><p>Update the contact details shown for this login.</p></div></div>
    <section className="profile-layout"><div className="profile-intro"><div className="profile-large-avatar">{account.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><strong>{account.name}</strong><span>{account.role === 'admin' ? 'Administrator' : account.businessName}</span></div><div className="profile-username"><span>LOGIN USERNAME</span><strong>{account.username}</strong></div></div><form className="profile-edit panel" onSubmit={submit}><div className="section-kicker">PERSONAL DETAILS</div><h2>Edit profile</h2><div className="form-grid"><label className="form-wide">{account.role === 'admin' ? 'Administrator name' : 'Account owner'}<input name="name" defaultValue={account.name} required /></label>{account.role === 'business' && <label className="form-wide">Business name<input name="businessName" defaultValue={account.businessName} required /></label>}<label className="form-wide">Contact email<input name="email" type="email" defaultValue={account.email} required /></label></div><div className="profile-edit-footer"><span>{saved ? <><Check size={14} /> Profile saved</> : 'Login username cannot be changed here.'}</span><button className="button button-primary" type="submit"><Check size={15} /> Save profile</button></div></form></section>
  </>
}
