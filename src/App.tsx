import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Building2,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileText,
  LogOut,
  LayoutDashboard,
  Menu,
  PackagePlus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  TriangleAlert,
  Truck,
  Users,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'
import { AccessScreen, BusinessesView, ProfileView, type BusinessDraft } from './Access'
import { createAccount, readAccounts, readSessionId, type Account, verifyPassword, writeAccounts, writeSessionId } from './auth'

type View = 'Overview' | 'Materials' | 'Orders' | 'People' | 'Payroll' | 'Businesses' | 'Profile'
type Attendance = 'Present' | 'Absent'
type Direction = 'Sale' | 'Purchase'
type Material = {
  id: string
  name: string
  sku: string
  category: string
  unit: string
  quantity: number
  reorderAt: number
  cost: number
  price: number
  supplier: string
}
type Employee = {
  id: string
  name: string
  role: string
  department: string
  monthlySalary: number
  fixedDeduction: number
  attendance: Attendance
  absentDays: number
}
type Order = {
  id: string
  direction: Direction
  materialId: string
  partner: string
  item: string
  quantity: number
  amount: number
  date: string
  status: 'Completed' | 'Pending'
}
type AppData = { materials: Material[]; employees: Employee[]; orders: Order[] }
type Modal = 'material' | 'transaction' | 'employee' | 'deduction' | null

const legacyStorageKey = 'fieldwork-ims-v1'
const dataStorageKey = (accountId: string) => `fieldwork-ims-v1-${accountId}`
const today = new Date()
const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(today)
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const compactCurrency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 1, notation: 'compact' })

const starterData: AppData = {
  materials: [
    { id: 'MAT-1048', name: 'Cold-rolled steel sheet', sku: 'STL-240', category: 'Raw material', unit: 'sheets', quantity: 286, reorderAt: 90, cost: 4200, price: 5800, supplier: 'Meridian Metals' },
    { id: 'MAT-1047', name: 'Industrial fastener kit', sku: 'FST-118', category: 'Components', unit: 'kits', quantity: 74, reorderAt: 80, cost: 1800, price: 2900, supplier: 'Northline Supply' },
    { id: 'MAT-1046', name: 'Polycarbonate panel', sku: 'PLY-032', category: 'Raw material', unit: 'panels', quantity: 142, reorderAt: 45, cost: 3100, price: 4900, supplier: 'Clearview Works' },
    { id: 'MAT-1045', name: 'Protective work gloves', sku: 'PPE-006', category: 'Safety', unit: 'pairs', quantity: 38, reorderAt: 50, cost: 700, price: 1200, supplier: 'Northline Supply' },
    { id: 'MAT-1044', name: 'Hydraulic seal set', sku: 'HYD-510', category: 'Components', unit: 'sets', quantity: 215, reorderAt: 60, cost: 1200, price: 2400, supplier: 'Atlas Industrial' },
    { id: 'MAT-1043', name: 'Shipping carton, large', sku: 'PKG-081', category: 'Packaging', unit: 'cartons', quantity: 19, reorderAt: 40, cost: 300, price: 600, supplier: 'Box & Board Co.' },
  ],
  employees: [
    { id: 'EMP-021', name: 'Maya Chen', role: 'Production lead', department: 'Production', monthlySalary: 42000, fixedDeduction: 1200, attendance: 'Present', absentDays: 1 },
    { id: 'EMP-020', name: 'Jordan Ellis', role: 'Warehouse associate', department: 'Warehouse', monthlySalary: 31000, fixedDeduction: 650, attendance: 'Present', absentDays: 0 },
    { id: 'EMP-019', name: 'Priya Nair', role: 'Quality inspector', department: 'Quality', monthlySalary: 36500, fixedDeduction: 900, attendance: 'Absent', absentDays: 2 },
    { id: 'EMP-018', name: 'Luis Romero', role: 'Procurement officer', department: 'Operations', monthlySalary: 39000, fixedDeduction: 0, attendance: 'Present', absentDays: 0 },
    { id: 'EMP-017', name: 'Avery Brooks', role: 'Dispatch coordinator', department: 'Warehouse', monthlySalary: 33500, fixedDeduction: 1450, attendance: 'Present', absentDays: 1 },
  ],
  orders: [
    { id: 'FW-483921', direction: 'Sale', materialId: 'MAT-1048', partner: 'Apex Fabrication', item: 'Cold-rolled steel sheet', quantity: 24, amount: 139200, date: '2026-10-21', status: 'Completed' },
    { id: 'FW-483917', direction: 'Purchase', materialId: 'MAT-1048', partner: 'Meridian Metals', item: 'Cold-rolled steel sheet', quantity: 80, amount: 336000, date: '2026-10-21', status: 'Pending' },
    { id: 'FW-483901', direction: 'Sale', materialId: 'MAT-1044', partner: 'Cedar Works', item: 'Hydraulic seal set', quantity: 18, amount: 43200, date: '2026-10-20', status: 'Completed' },
    { id: 'FW-483884', direction: 'Purchase', materialId: 'MAT-1047', partner: 'Northline Supply', item: 'Industrial fastener kit', quantity: 60, amount: 108000, date: '2026-10-20', status: 'Completed' },
    { id: 'FW-483870', direction: 'Sale', materialId: 'MAT-1046', partner: 'Harbor Equipment', item: 'Polycarbonate panel', quantity: 12, amount: 58800, date: '2026-10-19', status: 'Completed' },
  ],
}

function readData(accountId: string): AppData {
  try {
    const saved = localStorage.getItem(dataStorageKey(accountId))
    if (!saved) return starterData
    const parsed = JSON.parse(saved) as Partial<AppData>
    const materials = Array.isArray(parsed.materials) ? parsed.materials : starterData.materials
    const employees = Array.isArray(parsed.employees) ? parsed.employees : starterData.employees
    const orders = Array.isArray(parsed.orders) ? parsed.orders.map((savedOrder) => {
      const legacyOrder = savedOrder as Order & { materialId?: string }
      const matchingMaterial = materials.find((material) => material.name === legacyOrder.item)
      const starterOrder = starterData.orders.find((order) => order.id === legacyOrder.id)
      return {
        ...legacyOrder,
        materialId: legacyOrder.materialId ?? matchingMaterial?.id ?? starterOrder?.materialId ?? '',
        status: legacyOrder.status ?? 'Completed',
      }
    }) : starterData.orders
    return { materials, employees, orders }
  } catch {
    return starterData
  }
}

function money(value: number) {
  return currency.format(value)
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function App() {
  const [accounts, setAccounts] = useState<Account[]>(readAccounts)
  const [sessionId, setSessionId] = useState<string | null>(readSessionId)
  const activeAccount = accounts.find((account) => account.id === sessionId) ?? null
  const [data, setData] = useState<AppData>(starterData)
  const [dataOwnerId, setDataOwnerId] = useState<string | null>(null)
  const [pathname, setPathname] = useState(window.location.pathname)
  const [modal, setModal] = useState<Modal>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All materials')
  const [transactionError, setTransactionError] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [accessError, setAccessError] = useState('')

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (activeAccount?.role === 'business') {
      setData(readData(activeAccount.id))
      setDataOwnerId(activeAccount.id)
    } else {
      setDataOwnerId(null)
    }
  }, [activeAccount?.id, activeAccount?.role])

  useEffect(() => {
    if (activeAccount?.role === 'business' && dataOwnerId === activeAccount.id) {
      localStorage.setItem(dataStorageKey(activeAccount.id), JSON.stringify(data))
    }
  }, [activeAccount?.id, activeAccount?.role, data, dataOwnerId])

  useEffect(() => {
    if (!activeAccount) {
      const hasAdmin = accounts.some((account) => account.role === 'admin')
      const validLoginRoute = pathname === '/admin/login' || (hasAdmin && pathname === '/business/login')
      if (!validLoginRoute) navigate(hasAdmin ? '/business/login' : '/admin/login', true)
      return
    }
    const isAllowedRoute = activeAccount.role === 'admin'
      ? pathname === '/admin' || pathname === '/admin/profile'
      : ['/business', '/business/materials', '/business/orders', '/business/people', '/business/payroll', '/business/profile'].includes(pathname)
    if (!isAllowedRoute) navigate(activeAccount.role === 'admin' ? '/admin' : '/business', true)
  }, [accounts, activeAccount?.id, activeAccount?.role, pathname])

  function navigate(path: string, replace = false) {
    if (window.location.pathname !== path) {
      if (replace) window.history.replaceState({}, '', path)
      else window.history.pushState({}, '', path)
    }
    setPathname(path)
  }

  function setView(nextView: View) {
    if (!activeAccount) return
    const routes: Record<View, string> = activeAccount.role === 'admin'
      ? { Businesses: '/admin', Profile: '/admin/profile', Overview: '/admin', Materials: '/admin', Orders: '/admin', People: '/admin', Payroll: '/admin' }
      : { Overview: '/business', Materials: '/business/materials', Orders: '/business/orders', People: '/business/people', Payroll: '/business/payroll', Profile: '/business/profile', Businesses: '/business' }
    navigate(routes[nextView])
  }

  function routeView(role: Account['role']): View {
    if (role === 'admin') return pathname === '/admin/profile' ? 'Profile' : 'Businesses'
    const routes: Record<string, View> = {
      '/business': 'Overview',
      '/business/materials': 'Materials',
      '/business/orders': 'Orders',
      '/business/people': 'People',
      '/business/payroll': 'Payroll',
      '/business/profile': 'Profile',
    }
    return routes[pathname] ?? 'Overview'
  }

  const lowStock = data.materials.filter((item) => item.quantity <= item.reorderAt)
  const presentCount = data.employees.filter((employee) => employee.attendance === 'Present').length
  const salesThisMonth = data.orders.filter((order) => order.direction === 'Sale').reduce((sum, order) => sum + order.amount, 0)
  const inventoryValue = data.materials.reduce((sum, item) => sum + item.quantity * item.cost, 0)
  const filteredMaterials = useMemo(() => data.materials.filter((item) => {
    const matchesQuery = `${item.name} ${item.sku} ${item.supplier}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (category === 'All materials' || item.category === category)
  }), [data.materials, query, category])
  const categories = ['All materials', ...new Set(data.materials.map((item) => item.category))]

  function updateData(next: (current: AppData) => AppData) {
    setData((current) => next(current))
  }

  function openModal(nextModal: Modal, id: string | null = null) {
    setEditId(id)
    setTransactionError('')
    setModal(nextModal)
  }

  async function setupAdmin(fields: { name: string; email: string; username: string; password: string }) {
    if (accounts.length > 0) return
    if (!/^[a-zA-Z0-9._-]+$/.test(fields.username.trim())) {
      setAccessError('Use only letters, numbers, periods, underscores, or hyphens in the username.')
      return
    }
    const admin = await createAccount({ ...fields, role: 'admin' })
    writeAccounts([admin])
    writeSessionId(admin.id)
    setAccounts([admin])
    setSessionId(admin.id)
    navigate('/admin')
    setAccessError('')
  }

  async function login(username: string, password: string) {
    const account = accounts.find((item) => item.username === username.toLowerCase())
    if (!account || !(await verifyPassword(account, password))) {
      setAccessError('Username or password is incorrect.')
      return
    }
    writeSessionId(account.id)
    setSessionId(account.id)
    navigate(account.role === 'admin' ? '/admin' : '/business')
    setAccessError('')
  }

  function logout() {
    writeSessionId(null)
    setSessionId(null)
    navigate(accounts.some((account) => account.role === 'admin') ? '/business/login' : '/admin/login')
    setModal(null)
  }

  async function createBusiness(draft: BusinessDraft) {
    const username = draft.username.toLowerCase()
    const email = draft.email.toLowerCase()
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) return 'Use only letters, numbers, periods, underscores, or hyphens in the username.'
    if (accounts.some((account) => account.username === username)) return 'That username is already in use.'
    if (accounts.some((account) => account.email === email)) return 'That email address is already in use.'
    const business = await createAccount({ ...draft, username, email, role: 'business' })
    const firstBusiness = !accounts.some((account) => account.role === 'business')
    const legacyData = firstBusiness ? localStorage.getItem(legacyStorageKey) : null
    if (legacyData) {
      localStorage.setItem(dataStorageKey(business.id), legacyData)
      localStorage.removeItem(legacyStorageKey)
    }
    const nextAccounts = [...accounts, business]
    writeAccounts(nextAccounts)
    setAccounts(nextAccounts)
    return null
  }

  function saveProfile(profile: { name: string; email: string; businessName: string }) {
    if (!activeAccount) return
    const nextAccounts = accounts.map((account) => account.id === activeAccount.id ? {
      ...account,
      name: profile.name,
      email: profile.email.toLowerCase(),
      businessName: account.role === 'business' ? profile.businessName : account.businessName,
    } : account)
    writeAccounts(nextAccounts)
    setAccounts(nextAccounts)
  }

  function submitMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const current = data.materials.find((item) => item.id === editId)
    const material: Material = {
      id: current?.id ?? `MAT-${String(Date.now()).slice(-4)}`,
      name: String(form.get('name')).trim(),
      sku: String(form.get('sku')).trim().toUpperCase(),
      category: String(form.get('category')),
      unit: String(form.get('unit')).trim(),
      quantity: Number(form.get('quantity')),
      reorderAt: Number(form.get('reorderAt')),
      cost: Number(form.get('cost')),
      price: Number(form.get('price')),
      supplier: String(form.get('supplier')).trim() || 'Unassigned',
    }
    updateData((currentData) => ({
      ...currentData,
      materials: current ? currentData.materials.map((item) => item.id === current.id ? material : item) : [material, ...currentData.materials],
    }))
    setModal(null)
  }

  function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const item = data.materials.find((material) => material.id === form.get('materialId'))
    const direction = String(form.get('direction')) as Direction
    const quantity = Number(form.get('quantity'))
    const unitPrice = Number(form.get('unitPrice'))
    if (!item || quantity <= 0 || unitPrice < 0) return
    if (direction === 'Sale' && quantity > item.quantity) {
      setTransactionError(`Only ${item.quantity} ${item.unit} available. Adjust the quantity or record a purchase first.`)
      return
    }
    const order: Order = {
      id: `FW-${String(Date.now()).slice(-6)}`,
      direction,
      materialId: item.id,
      partner: String(form.get('partner')).trim() || (direction === 'Sale' ? 'Walk-in customer' : item.supplier),
      item: item.name,
      quantity,
      amount: quantity * unitPrice,
      date: today.toISOString().slice(0, 10),
      status: direction === 'Purchase' ? String(form.get('orderStatus')) as Order['status'] : 'Completed',
    }
    updateData((currentData) => ({
      ...currentData,
      materials: currentData.materials.map((material) => material.id === item.id
        ? { ...material, quantity: material.quantity + (direction === 'Purchase' ? order.status === 'Completed' ? quantity : 0 : -quantity) }
        : material),
      orders: [order, ...currentData.orders],
    }))
    setModal(null)
  }

  function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const employee: Employee = {
      id: `EMP-${String(Date.now()).slice(-3)}`,
      name: String(form.get('name')).trim(),
      role: String(form.get('role')).trim(),
      department: String(form.get('department')),
      monthlySalary: Number(form.get('monthlySalary')),
      fixedDeduction: Number(form.get('fixedDeduction')),
      attendance: 'Present',
      absentDays: 0,
    }
    updateData((currentData) => ({ ...currentData, employees: [employee, ...currentData.employees] }))
    setModal(null)
  }

  function submitDeduction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const amount = Number(form.get('amount'))
    updateData((currentData) => ({
      ...currentData,
      employees: currentData.employees.map((employee) => employee.id === editId ? { ...employee, fixedDeduction: amount } : employee),
    }))
    setModal(null)
  }

  function toggleAttendance(id: string) {
    updateData((currentData) => ({
      ...currentData,
      employees: currentData.employees.map((employee) => {
        if (employee.id !== id) return employee
        const absent = employee.attendance === 'Present'
        return { ...employee, attendance: absent ? 'Absent' : 'Present', absentDays: Math.max(0, employee.absentDays + (absent ? 1 : -1)) }
      }),
    }))
  }

  function receiveOrder(id: string) {
    const order = data.orders.find((item) => item.id === id)
    if (!order || order.direction !== 'Purchase' || order.status !== 'Pending') return
    if (!data.materials.some((item) => item.id === order.materialId)) {
      window.alert('This material is no longer in the catalog. Re-add it before receiving this order.')
      return
    }
    updateData((currentData) => ({
      ...currentData,
      materials: currentData.materials.map((item) => item.id === order.materialId ? { ...item, quantity: item.quantity + order.quantity } : item),
      orders: currentData.orders.map((item) => item.id === id ? { ...item, status: 'Completed' } : item),
    }))
  }

  function removeMaterial(id: string) {
    if (!window.confirm('Remove this material from your catalog?')) return
    updateData((currentData) => ({ ...currentData, materials: currentData.materials.filter((item) => item.id !== id) }))
  }

  if (!activeAccount) return <AccessScreen setup={accounts.length === 0} audience={pathname === '/admin/login' ? 'admin' : 'business'} error={accessError} onSetup={setupAdmin} onLogin={login} />

  const isAdmin = activeAccount.role === 'admin'
  if (!isAdmin && dataOwnerId !== activeAccount.id) {
    return <main className="workspace-loading"><div className="brand-mark"><Boxes size={21} /></div><strong>Opening business workspace</strong></main>
  }
  const currentView = routeView(activeAccount.role)
  const navItems: { label: View; icon: typeof LayoutDashboard }[] = isAdmin
    ? [{ label: 'Businesses', icon: Building2 }, { label: 'Profile', icon: UserRound }]
    : [
      { label: 'Overview', icon: LayoutDashboard },
      { label: 'Materials', icon: Boxes },
      { label: 'Orders', icon: ShoppingCart },
      { label: 'People', icon: Users },
      { label: 'Payroll', icon: WalletCards },
      { label: 'Profile', icon: UserRound },
    ]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Boxes size={21} strokeWidth={2.2} /></div>
          <div><strong>fieldwork</strong><span>OPERATIONS SUITE</span></div>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
        </div>
        <div className="workspace-select">
          <div className="workspace-icon">{initials(isAdmin ? 'Admin' : activeAccount.businessName ?? activeAccount.name).slice(0, 1)}</div>
          <div className="workspace-copy"><strong>{isAdmin ? 'Fieldwork admin' : activeAccount.businessName}</strong><span>{isAdmin ? 'Account management' : 'Business workspace'}</span></div>
          {isAdmin ? <ShieldCheck size={15} /> : <ChevronDown size={15} />}
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
              <button key={label} className={`nav-item ${currentView === label ? 'nav-item-active' : ''}`} onClick={() => { setView(label); setMobileNavOpen(false) }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
                {!isAdmin && label === 'Materials' && lowStock.length > 0 && <span className="nav-count">{lowStock.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {!isAdmin && <div className="sidebar-note">
            <div className="note-icon"><ClipboardCheck size={17} /></div>
            <div><strong>Daily check-in</strong><span>{presentCount} of {data.employees.length} on site</span></div>
            <ArrowUpRight size={15} />
          </div>}
          <button className="profile-row" onClick={() => setView('Profile')}>
            <div className="avatar avatar-dark">{initials(activeAccount.name)}</div>
            <div className="profile-copy"><strong>{activeAccount.name}</strong><span>{isAdmin ? 'Administrator' : activeAccount.businessName}</span></div>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>

      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumb"><span>{isAdmin ? 'Fieldwork Admin' : activeAccount.businessName}</span><span className="breadcrumb-slash">/</span><strong>{currentView}</strong></div>
          </div>
          <div className="topbar-actions">
            <span className="topbar-date"><CalendarDays size={15} /> {dateLabel}</span>
            {!isAdmin && <button className="icon-button notification-button" aria-label={`${lowStock.length} stock alerts`} onClick={() => setView('Materials')}><Bell size={18} />{lowStock.length > 0 && <i />}</button>}
            <button className="icon-button" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={18} /></button>
            <button className="avatar avatar-top profile-avatar-button" aria-label="Edit profile" onClick={() => setView('Profile')}>{initials(activeAccount.name)}</button>
          </div>
        </header>

        <div className="page-content">
          {isAdmin && currentView === 'Businesses' && <BusinessesView businesses={accounts.filter((account) => account.role === 'business')} onCreate={createBusiness} />}
          {currentView === 'Profile' && <ProfileView account={activeAccount} onSave={saveProfile} />}
          {!isAdmin && currentView === 'Overview' && <Overview
            materials={data.materials}
            employees={data.employees}
            orders={data.orders}
            lowStock={lowStock}
            presentCount={presentCount}
            salesThisMonth={salesThisMonth}
            inventoryValue={inventoryValue}
            setView={setView}
            openModal={openModal}
          />}
          {!isAdmin && currentView === 'Materials' && <MaterialsView
            materials={filteredMaterials}
            allMaterials={data.materials}
            query={query}
            setQuery={setQuery}
            category={category}
            setCategory={setCategory}
            categories={categories}
            openModal={openModal}
            removeMaterial={removeMaterial}
          />}
          {!isAdmin && currentView === 'Orders' && <OrdersView orders={data.orders} openModal={openModal} onReceive={receiveOrder} />}
          {!isAdmin && currentView === 'People' && <PeopleView employees={data.employees} toggleAttendance={toggleAttendance} openModal={openModal} />}
          {!isAdmin && currentView === 'Payroll' && <PayrollView employees={data.employees} openModal={openModal} />}
        </div>
      </main>

      {modal && <ModalFrame title={modalTitle(modal, Boolean(editId))} close={() => setModal(null)}>
        {modal === 'material' && <MaterialForm material={data.materials.find((item) => item.id === editId)} onSubmit={submitMaterial} onCancel={() => setModal(null)} />}
        {modal === 'transaction' && <TransactionForm materials={data.materials} error={transactionError} onSubmit={submitTransaction} onCancel={() => setModal(null)} />}
        {modal === 'employee' && <EmployeeForm onSubmit={submitEmployee} onCancel={() => setModal(null)} />}
        {modal === 'deduction' && <DeductionForm employee={data.employees.find((item) => item.id === editId)} onSubmit={submitDeduction} onCancel={() => setModal(null)} />}
      </ModalFrame>}
    </div>
  )
}

function modalTitle(modal: Modal, editing: boolean) {
  if (modal === 'material') return editing ? 'Edit material' : 'Add material'
  if (modal === 'transaction') return 'Record a movement'
  if (modal === 'employee') return 'Add team member'
  return 'Update payroll deductions'
}

function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="heading-actions">{actions}</div>}</div>
}

function Overview({ materials, employees, orders, lowStock, presentCount, salesThisMonth, inventoryValue, setView, openModal }: {
  materials: Material[]; employees: Employee[]; orders: Order[]; lowStock: Material[]; presentCount: number; salesThisMonth: number; inventoryValue: number; setView: (view: View) => void; openModal: (modal: Modal, id?: string | null) => void
}) {
  const recentOrders = orders.slice(0, 4)
  const chart = Array.from({ length: 7 }, (_, index) => {
    const day = new Date()
    day.setHours(12, 0, 0, 0)
    day.setDate(day.getDate() - (6 - index))
    const key = day.toISOString().slice(0, 10)
    return {
      label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(day).slice(0, 1),
      amount: orders.filter((order) => order.direction === 'Sale' && order.date === key).reduce((sum, order) => sum + order.amount, 0),
    }
  })
  return <>
    <PageHeading eyebrow={dateLabel.toUpperCase()} title="Good morning, Alex" description="Here’s the pulse of your operation today." actions={<><button className="button button-secondary" onClick={() => openModal('transaction')}><ArrowDownLeft size={16} /> Record movement</button><button className="button button-primary" onClick={() => openModal('material')}><Plus size={17} /> Add material</button></>} />
    <section className="metric-grid" aria-label="Business overview">
      <MetricCard label="Inventory value" value={compactCurrency.format(inventoryValue)} detail={`${materials.length} active materials`} icon={<Boxes size={18} />} tone="green" trend="+8.2%" trendText="vs last month" />
      <MetricCard label="Sales this month" value={compactCurrency.format(salesThisMonth)} detail={`${orders.filter((order) => order.direction === 'Sale').length} recorded sales`} icon={<ArrowUpRight size={19} />} tone="blue" trend="+12.4%" trendText="vs last month" />
      <MetricCard label="Open orders" value={String(orders.filter((order) => order.status === 'Pending').length).padStart(2, '0')} detail="Purchase orders awaiting" icon={<Truck size={18} />} tone="orange" trend="Needs review" trendText="1 supplier order" />
      <MetricCard label="Team on site" value={`${presentCount}/${employees.length}`} detail="Attendance recorded today" icon={<Users size={18} />} tone="plum" trend={`${employees.length - presentCount} away`} trendText="today" />
    </section>

    <section className="overview-grid">
      <div className="panel sales-panel">
        <div className="panel-heading"><div><div className="section-kicker">PERFORMANCE</div><h2>Sales activity</h2></div><button className="period-select">This week <ChevronDown size={14} /></button></div>
        <div className="sales-summary"><strong>{compactCurrency.format(salesThisMonth)}</strong><span className="positive-change"><ArrowUpRight size={14} /> 12.4%</span><span className="muted-label">monthly volume</span></div>
        <div className="chart-wrap" role="img" aria-label="Weekly sales trend showing an overall increase">
          <div className="chart-y-labels"><span>₹3L</span><span>₹2L</span><span>₹1L</span><span>₹0</span></div>
          <div className="bar-chart">{chart.map((day, index) => <div className="chart-column" key={`${day.label}-${index}`}><div className={`chart-bar ${day.amount > 0 ? 'chart-bar-highlight' : ''}`} style={{ height: `${Math.max(day.amount > 0 ? 8 : 3, Math.min(100, day.amount / 300000 * 100))}%` }}><span className="bar-tooltip">{money(day.amount)}</span></div><span className="chart-day">{day.label}</span></div>)}</div>
        </div>
      </div>
      <div className="panel stock-panel">
        <div className="panel-heading"><div><div className="section-kicker">ACTION NEEDED</div><h2>Reorder watch</h2></div><button className="text-button" onClick={() => setView('Materials')}>View stock <ArrowUpRight size={14} /></button></div>
        <div className="stock-alert-list">{lowStock.length ? lowStock.slice(0, 4).map((item) => <div className="stock-alert-row" key={item.id}><div className="stock-alert-icon"><TriangleAlert size={16} /></div><div className="stock-alert-info"><strong>{item.name}</strong><span>{item.sku} · reorder at {item.reorderAt} {item.unit}</span></div><div className="stock-remaining"><strong>{item.quantity}</strong><span>{item.unit} left</span></div></div>) : <div className="empty-state compact-empty">All materials are above their reorder points.</div>}</div>
        {lowStock.length > 0 && <button className="alert-footer" onClick={() => openModal('transaction')}>Create a purchase order <ArrowUpRight size={15} /></button>}
      </div>
    </section>

    <section className="panel recent-panel">
      <div className="panel-heading"><div><div className="section-kicker">LATEST ACTIVITY</div><h2>Recent orders</h2></div><button className="text-button" onClick={() => setView('Orders')}>All orders <ArrowUpRight size={14} /></button></div>
      <OrdersTable orders={recentOrders} />
    </section>
    <div className="overview-footnote"><span><Clock3 size={14} /> Last synced just now</span><span>{employees.length} team members · {materials.length} catalog items</span></div>
  </>
}

function MetricCard({ label, value, detail, icon, tone, trend, trendText }: { label: string; value: string; detail: string; icon: ReactNode; tone: string; trend: string; trendText: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon metric-${tone}`}>{icon}</span></div><div className="metric-value">{value}</div><div className="metric-bottom"><span>{detail}</span><span className={tone === 'orange' ? 'metric-note' : 'metric-trend'}>{trend}</span><span className="trend-context">{trendText}</span></div></article>
}

function MaterialsView({ materials, allMaterials, query, setQuery, category, setCategory, categories, openModal, removeMaterial }: {
  materials: Material[]; allMaterials: Material[]; query: string; setQuery: (value: string) => void; category: string; setCategory: (value: string) => void; categories: string[]; openModal: (modal: Modal, id?: string | null) => void; removeMaterial: (id: string) => void
}) {
  return <>
    <PageHeading eyebrow="STOCK CONTROL" title="Materials" description="Keep the right materials moving, from receiving dock to dispatch." actions={<><button className="button button-secondary" onClick={() => openModal('transaction')}><ArrowDownLeft size={16} /> Record movement</button><button className="button button-primary" onClick={() => openModal('material')}><Plus size={17} /> Add material</button></>} />
    <section className="material-summary-row"><div className="summary-stat"><span>Catalog value</span><strong>{money(allMaterials.reduce((sum, item) => sum + item.quantity * item.cost, 0))}</strong></div><div className="summary-stat"><span>Active items</span><strong>{allMaterials.length}</strong></div><div className="summary-stat summary-warning"><span>Below reorder point</span><strong>{allMaterials.filter((item) => item.quantity <= item.reorderAt).length}</strong></div><div className="summary-stat"><span>Suppliers</span><strong>{new Set(allMaterials.map((item) => item.supplier)).size}</strong></div></section>
    <section className="panel table-panel">
      <div className="table-toolbar"><div className="table-toolbar-title"><div><div className="section-kicker">MATERIAL REGISTER</div><h2>All materials <span className="count-pill">{materials.length}</span></h2></div></div><div className="table-controls"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search materials" aria-label="Search materials" /></label><label className="filter-select"><SlidersHorizontal size={15} /><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div></div>
      {materials.length ? <div className="table-scroll"><table><thead><tr><th>Material</th><th>Category</th><th>In stock</th><th>Unit cost</th><th>Supplier</th><th>Stock health</th><th aria-label="Actions" /></tr></thead><tbody>{materials.map((item) => {
        const isLow = item.quantity <= item.reorderAt
        const ratio = Math.min(100, item.quantity / Math.max(item.reorderAt * 2, 1) * 100)
        return <tr key={item.id}><td><div className="material-name"><span className="item-symbol"><PackagePlus size={17} /></span><span><strong>{item.name}</strong><small>{item.sku}</small></span></div></td><td><span className="category-label">{item.category}</span></td><td><strong className={isLow ? 'quantity-low' : ''}>{item.quantity}</strong><span className="unit-label"> {item.unit}</span></td><td>{money(item.cost)}</td><td>{item.supplier}</td><td><div className="stock-health"><div className="stock-track"><span className={isLow ? 'stock-bar-low' : ''} style={{ width: `${ratio}%` }} /></div><small>{isLow ? 'Reorder' : 'Healthy'}</small></div></td><td><div className="row-actions"><button className="row-action" title="Edit material" aria-label={`Edit ${item.name}`} onClick={() => openModal('material', item.id)}><FileText size={15} /></button><button className="row-action row-action-danger" title="Remove material" aria-label={`Remove ${item.name}`} onClick={() => removeMaterial(item.id)}><X size={15} /></button></div></td></tr>
      })}</tbody></table></div> : <div className="empty-state">No materials match that search. Try another name or category.</div>}
      <div className="table-footer"><span>Showing {materials.length} of {allMaterials.length} materials</span><span>Stock value uses current unit cost</span></div>
    </section>
  </>
}

function OrdersView({ orders, openModal, onReceive }: { orders: Order[]; openModal: (modal: Modal, id?: string | null) => void; onReceive: (id: string) => void }) {
  const totalSales = orders.filter((order) => order.direction === 'Sale').reduce((sum, order) => sum + order.amount, 0)
  const totalPurchases = orders.filter((order) => order.direction === 'Purchase').reduce((sum, order) => sum + order.amount, 0)
  return <>
    <PageHeading eyebrow="BUYING & SELLING" title="Orders" description="A single view of every sale and purchase moving through your operation." actions={<button className="button button-primary" onClick={() => openModal('transaction')}><Plus size={17} /> Record order</button>} />
    <section className="material-summary-row order-summary"><div className="summary-stat"><span>All orders</span><strong>{orders.length}</strong></div><div className="summary-stat"><span>Sales recorded</span><strong>{money(totalSales)}</strong></div><div className="summary-stat"><span>Purchases recorded</span><strong>{money(totalPurchases)}</strong></div><div className="summary-stat summary-warning"><span>Awaiting receipt</span><strong>{orders.filter((order) => order.status === 'Pending').length}</strong></div></section>
    <section className="panel table-panel"><div className="table-toolbar"><div><div className="section-kicker">ORDER REGISTER</div><h2>All activity <span className="count-pill">{orders.length}</span></h2></div><span className="table-period"><CalendarDays size={15} /> All dates</span></div><OrdersTable orders={orders} showStatus onReceive={onReceive} /><div className="table-footer"><span>Sales reduce stock; purchases add stock when received.</span><span>Amounts shown in INR</span></div></section>
  </>
}

function OrdersTable({ orders, showStatus = false, onReceive }: { orders: Order[]; showStatus?: boolean; onReceive?: (id: string) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>Order</th><th>Type</th><th>Customer / supplier</th><th>Item</th><th>Qty</th><th>Date</th><th>Amount</th>{showStatus && <th>Status</th>}</tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong className="order-id">{order.id}</strong></td><td><span className={`direction-tag ${order.direction === 'Sale' ? 'direction-sale' : 'direction-purchase'}`}>{order.direction === 'Sale' ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}{order.direction}</span></td><td>{order.partner}</td><td className="order-item-cell">{order.item}</td><td>{order.quantity}</td><td>{shortDate(order.date)}</td><td><strong>{money(order.amount)}</strong></td>{showStatus && <td><div className="order-status-cell"><span className={`status-tag ${order.status === 'Completed' ? 'status-complete' : 'status-pending'}`}><i />{order.status}</span>{order.status === 'Pending' && order.direction === 'Purchase' && <button className="receive-button" onClick={() => onReceive?.(order.id)}>Receive</button>}</div></td>}</tr>)}</tbody></table>{orders.length === 0 && <div className="empty-state">No orders recorded yet. Record a sale or purchase to get started.</div>}</div>
}

function PeopleView({ employees, toggleAttendance, openModal }: { employees: Employee[]; toggleAttendance: (id: string) => void; openModal: (modal: Modal, id?: string | null) => void }) {
  const absentCount = employees.length - employees.filter((employee) => employee.attendance === 'Present').length
  return <>
    <PageHeading eyebrow="TEAM & ATTENDANCE" title="People" description="See who’s in today and keep attendance close to the work." actions={<button className="button button-primary" onClick={() => openModal('employee')}><Plus size={17} /> Add team member</button>} />
    <section className="people-banner"><div className="people-banner-icon"><CalendarDays size={19} /></div><div><strong>Today’s attendance</strong><span>{dateLabel} · Record changes as they happen</span></div><div className="attendance-totals"><span className="present-dot" /> {employees.length - absentCount} present <span className="attendance-divider" /><span className="absent-dot" /> {absentCount} absent</div></section>
    <section className="panel table-panel"><div className="table-toolbar"><div><div className="section-kicker">TEAM DIRECTORY</div><h2>Team members <span className="count-pill">{employees.length}</span></h2></div><div className="table-period"><Users size={15} /> {new Set(employees.map((item) => item.department)).size} departments</div></div>
      <div className="table-scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Monthly base</th><th>Attendance today</th><th>Absences this month</th><th /></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td><div className="employee-name"><div className={`avatar employee-avatar avatar-${employee.id.slice(-1)}`}>{initials(employee.name)}</div><span><strong>{employee.name}</strong><small>{employee.id}</small></span></div></td><td>{employee.department}</td><td>{employee.role}</td><td>{money(employee.monthlySalary)}</td><td><button className={`attendance-toggle ${employee.attendance === 'Present' ? 'attendance-present' : 'attendance-absent'}`} onClick={() => toggleAttendance(employee.id)}><i />{employee.attendance}<span className="toggle-hint">Change</span></button></td><td>{employee.absentDays} {employee.absentDays === 1 ? 'day' : 'days'}</td><td><button className="row-action" title="Edit payroll deductions" aria-label={`Edit deductions for ${employee.name}`} onClick={() => openModal('deduction', employee.id)}><WalletCards size={15} /></button></td></tr>)}</tbody></table></div>
      <div className="table-footer"><span>Attendance changes update estimated payroll deductions.</span><button className="text-button" onClick={() => openModal('employee')}>Add another member <ArrowUpRight size={14} /></button></div>
    </section>
  </>
}

function PayrollView({ employees, openModal }: { employees: Employee[]; openModal: (modal: Modal, id?: string | null) => void }) {
  const gross = employees.reduce((sum, employee) => sum + employee.monthlySalary, 0)
  const deductions = employees.reduce((sum, employee) => sum + employee.fixedDeduction + employee.monthlySalary / 26 * employee.absentDays, 0)
  const net = gross - deductions
  return <>
    <PageHeading eyebrow="PAY & DEDUCTIONS" title="Payroll overview" description="A live estimate based on monthly salary, recorded absence, and fixed deductions." actions={<button className="button button-secondary" onClick={() => window.print()}><FileText size={16} /> Print summary</button>} />
    <section className="payroll-period"><div><div className="section-kicker">CURRENT PAY PERIOD</div><strong>October 1 – October 31, 2026</strong><span>Estimates use a 26-day working month.</span></div><div className="period-pill"><CalendarDays size={15} /> October 2026</div></section>
    <section className="payroll-metrics"><div className="payroll-metric"><span>Gross payroll</span><strong>{money(gross)}</strong><small>Before deductions</small></div><div className="payroll-metric"><span>Estimated deductions</span><strong className="deduction-value">−{money(deductions)}</strong><small>Fixed + attendance</small></div><div className="payroll-metric payroll-net"><span>Estimated take-home</span><strong>{money(net)}</strong><small>{employees.length} team members</small></div></section>
    <section className="panel table-panel"><div className="table-toolbar"><div><div className="section-kicker">PAYROLL REGISTER</div><h2>Individual estimates</h2></div><div className="table-period"><Clock3 size={15} /> Updated live</div></div>
      <div className="table-scroll"><table><thead><tr><th>Employee</th><th>Monthly base</th><th>Absence deduction</th><th>Other deductions</th><th>Take-home estimate</th><th /></tr></thead><tbody>{employees.map((employee) => {
        const absentDeduction = employee.monthlySalary / 26 * employee.absentDays
        const takeHome = Math.max(0, employee.monthlySalary - absentDeduction - employee.fixedDeduction)
        return <tr key={employee.id}><td><div className="employee-name"><div className={`avatar employee-avatar avatar-${employee.id.slice(-1)}`}>{initials(employee.name)}</div><span><strong>{employee.name}</strong><small>{employee.department}</small></span></div></td><td>{money(employee.monthlySalary)}</td><td className="deduction-value">−{money(absentDeduction)}</td><td>{money(employee.fixedDeduction)} <button className="inline-edit" aria-label={`Edit deductions for ${employee.name}`} onClick={() => openModal('deduction', employee.id)}>Edit</button></td><td><strong className="take-home-value">{money(takeHome)}</strong></td><td><span className="payroll-ready"><Check size={13} /> Calculated</span></td></tr>
      })}</tbody></table></div><div className="table-footer"><span>Calculation: base salary − (base ÷ 26 × absent days) − fixed deductions.</span><span>Review local tax and policy rules before issuing payroll.</span></div>
    </section>
  </>
}

function ModalFrame({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><div className="section-kicker">FIELDWORK · OPERATIONS</div><h2 id="modal-title">{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={18} /></button></div>{children}</section></div>
}

function MaterialForm({ material, onSubmit, onCancel }: { material?: Material; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="modal-form" onSubmit={onSubmit}><div className="form-grid"><label className="form-wide">Material name<input name="name" defaultValue={material?.name} placeholder="e.g. Stainless steel fastener" required autoFocus /></label><label>SKU<input name="sku" defaultValue={material?.sku} placeholder="STL-001" required /></label><label>Category<select name="category" defaultValue={material?.category ?? 'Raw material'}><option>Raw material</option><option>Components</option><option>Packaging</option><option>Safety</option><option>Finished goods</option></select></label><label>Quantity<input name="quantity" type="number" min="0" step="1" defaultValue={material?.quantity ?? 0} required /></label><label>Unit<input name="unit" defaultValue={material?.unit ?? 'units'} placeholder="units, kg, boxes" required /></label><label>Reorder point<input name="reorderAt" type="number" min="0" step="1" defaultValue={material?.reorderAt ?? 10} required /></label><label>Unit cost<input name="cost" type="number" min="0" step="0.01" defaultValue={material?.cost ?? 0} required /></label><label>Sale price<input name="price" type="number" min="0" step="0.01" defaultValue={material?.price ?? 0} required /></label><label className="form-wide">Supplier<input name="supplier" defaultValue={material?.supplier} placeholder="Supplier or vendor" /></label></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit"><Check size={16} /> {material ? 'Save changes' : 'Add material'}</button></div></form>
}

function TransactionForm({ materials, error, onSubmit, onCancel }: { materials: Material[]; error: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const [direction, setDirection] = useState<Direction>('Sale')
  const [orderStatus, setOrderStatus] = useState<Order['status']>('Pending')
  const [selectedId, setSelectedId] = useState(materials[0]?.id ?? '')
  const selected = materials.find((item) => item.id === selectedId)
  return <form className="modal-form" onSubmit={onSubmit}><div className="transaction-switch"><button type="button" className={direction === 'Sale' ? 'switch-selected' : ''} onClick={() => { setDirection('Sale'); setOrderStatus('Completed') }}><ArrowUpRight size={16} /> Sale</button><button type="button" className={direction === 'Purchase' ? 'switch-selected' : ''} onClick={() => { setDirection('Purchase'); setOrderStatus('Pending') }}><ArrowDownLeft size={16} /> Purchase</button></div><input type="hidden" name="direction" value={direction} /><input type="hidden" name="orderStatus" value={direction === 'Purchase' ? orderStatus : 'Completed'} /><div className="form-grid"><label className="form-wide">Material<select name="materialId" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} required>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.quantity} {item.unit} available</option>)}</select></label><label>Quantity<input name="quantity" type="number" min="1" step="1" defaultValue="1" required /></label><label>Unit price<input key={`${direction}-${selectedId}`} name="unitPrice" type="number" min="0" step="0.01" defaultValue={direction === 'Sale' ? selected?.price ?? 0 : selected?.cost ?? 0} required /></label>{direction === 'Purchase' && <label>Order status<select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value as Order['status'])}><option value="Pending">Pending receipt</option><option value="Completed">Received</option></select></label>}<label className={direction === 'Purchase' ? '' : 'form-wide'}>{direction === 'Sale' ? 'Customer' : 'Supplier'}<input name="partner" defaultValue={direction === 'Purchase' ? selected?.supplier : ''} placeholder={direction === 'Sale' ? 'Customer name' : 'Supplier name'} /></label></div>{error && <div className="form-error"><TriangleAlert size={15} /> {error}</div>}<div className="stock-effect"><span>Stock impact</span><strong>{direction === 'Sale' ? 'Quantity decreases when recorded' : orderStatus === 'Completed' ? 'Quantity increases now that it is received' : 'Quantity increases when this order is received'}</strong></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit"><Check size={16} /> {direction === 'Purchase' && orderStatus === 'Pending' ? 'Create purchase order' : `Record ${direction.toLowerCase()}`}</button></div></form>
}

function EmployeeForm({ onSubmit, onCancel }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="modal-form" onSubmit={onSubmit}><div className="form-grid"><label className="form-wide">Full name<input name="name" placeholder="Employee name" required autoFocus /></label><label>Role<input name="role" placeholder="Job title" required /></label><label>Department<select name="department"><option>Production</option><option>Warehouse</option><option>Operations</option><option>Quality</option><option>Finance</option><option>Sales</option></select></label><label>Monthly base salary<input name="monthlySalary" type="number" min="0" step="0.01" required /></label><label>Fixed deductions<input name="fixedDeduction" type="number" min="0" step="0.01" defaultValue="0" required /></label></div><div className="form-hint"><Check size={14} /> New team members are marked present for today.</div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit"><Check size={16} /> Add team member</button></div></form>
}

function DeductionForm({ employee, onSubmit, onCancel }: { employee?: Employee; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="modal-form" onSubmit={onSubmit}><div className="deduction-person"><div className="avatar avatar-dark">{employee ? initials(employee.name) : '?'}</div><div><strong>{employee?.name}</strong><span>{employee?.role}</span></div></div><label className="form-label-block">Fixed monthly deductions<input name="amount" type="number" min="0" step="0.01" defaultValue={employee?.fixedDeduction ?? 0} required autoFocus /></label><p className="form-help">Absence deductions are calculated separately from the attendance record.</p><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit"><Check size={16} /> Save deduction</button></div></form>
}

export default App
