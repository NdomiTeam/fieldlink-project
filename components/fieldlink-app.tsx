'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react'

type Portal = 'student' | 'company' | 'admin' | 'login'
type ApplicantStatus = 'Under review' | 'Approved' | 'Rejected'

type Applicant = {
  name: string
  initials: string
  school: string
  program: string
  date: string
  status: ApplicantStatus
  color: string
}

type StudentProfile = {
  name: string
  university: string
  sector: string
  studentId: string
}

const defaultStudentProfile: StudentProfile = {
  name: 'Amina Kweka',
  university: 'University of Dar es Salaam',
  sector: 'Environmental Science',
  studentId: 'FL–2025–0842',
}

const initialApplicants: Applicant[] = [
  { name: 'Amina Kweka', initials: 'AK', school: 'University of Dar es Salaam', program: 'Environmental Science', date: 'Today, 09:42', status: 'Under review', color: 'lilac' },
  { name: 'David Mushi', initials: 'DM', school: 'Ardhi University', program: 'Civil Engineering', date: 'Today, 08:15', status: 'Under review', color: 'peach' },
  { name: 'Neema Joseph', initials: 'NJ', school: 'Sokoine University', program: 'Agricultural Economics', date: 'Yesterday', status: 'Approved', color: 'mint' },
  { name: 'Brian Mwakalinga', initials: 'BM', school: 'University of Dodoma', program: 'Information Systems', date: 'Yesterday', status: 'Under review', color: 'blue' },
]

const navItems = [
  { id: 'student' as const, label: 'Student view', icon: GraduationCap },
  { id: 'company' as const, label: 'Company portal', icon: Building2 },
  { id: 'admin' as const, label: 'Admin overview', icon: LayoutDashboard },
]

function Brand() {
  return (
    <a className="brand" href="#home" aria-label="Fieldlink home">
      <span className="brand-mark"><span /><span /><span /><span /></span>
      <span>fieldlink<span className="brand-period">.</span></span>
    </a>
  )
}

function StatusPill({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'blue' }) {
  return <span className={`status-pill status-${variant}`}><span className="status-dot" />{children}</span>
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="section-heading">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{description && <p className="section-description">{description}</p>}</div>
      {action}
    </div>
  )
}

function StudentView({
  paid,
  onPay,
  files,
  onFile,
  studentProfile = defaultStudentProfile,
  acceptedCompany,
  onAccept,
}: {
  paid: boolean
  onPay: () => void
  files: Record<string, File | null>
  onFile: (key: string, file: File | null) => void
  studentProfile?: StudentProfile
  acceptedCompany: string | null
  onAccept: (company: string) => void
}) {
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa')
  const [activeTab, setActiveTab] = useState('Overview')
  const [secondsRemaining, setSecondsRemaining] = useState(72 * 60 * 60)
  const completeDocs = Boolean(files.letter && files.cv)

  useEffect(() => {
    const interval = window.setInterval(() => setSecondsRemaining((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const countdownHours = Math.floor(secondsRemaining / 3600)
  const countdownMinutes = Math.floor((secondsRemaining % 3600) / 60)
  const countdownSeconds = secondsRemaining % 60
  const steps = [
    { title: 'Payment received', detail: paid ? 'TZS 25,000 · Just now' : 'Complete payment to continue', done: paid },
    { title: 'Documents submitted', detail: completeDocs ? '2 documents · Just now' : 'Upload your letter and CV', done: completeDocs },
    { title: 'Under company review', detail: completeDocs ? 'Usually takes 2–5 working days' : 'Starts after documents are submitted', done: false },
    { title: 'Placement decision', detail: 'We’ll notify you as soon as there’s an update', done: false },
  ]

  return (
    <div className="page-content student-content">
      <section className="welcome-card">
        <div className="welcome-orb orb-one" /><div className="welcome-orb orb-two" />
        <div className="welcome-copy">
          <span className="welcome-tag"><Sparkles size={13} /> FIELD PLACEMENT 2025 / 26</span>
          <h1>Your next chapter<br className="mobile-break" /> starts here, {studentProfile.name.split(' ')[0]}.</h1>
          <p>Your field placement journey, all in one place. Let’s get you ready for the real world.</p>
          <div className="welcome-meta"><span><GraduationCap size={15} /> {studentProfile.university}</span><span className="meta-divider" /><span><BriefcaseBusiness size={15} /> {studentProfile.sector}</span></div>
        </div>
        <div className="welcome-illustration" aria-hidden="true"><div className="illu-circle"><GraduationCap size={62} strokeWidth={1.25} /></div><div className="illu-spark spark-a">✳</div><div className="illu-spark spark-b">✦</div><div className="illu-line" /></div>
        <div className="welcome-index"><span>YOUR STUDENT ID</span><strong>{studentProfile.studentId}</strong></div>
      </section>

      <div className="mobile-student-tabs" role="tablist" aria-label="Student sections">
        {['Overview', 'Documents', 'My status'].map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'selected' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </div>

      <div className={`student-grid ${activeTab !== 'Overview' ? `tab-${activeTab.toLowerCase().replace(' ', '-')}` : ''}`}>
        <div className="student-primary">
          <section className="workflow-section" id="payment">
            <SectionHeading eyebrow="YOUR CHECKLIST" title="A few things to get started" description="Finish each step to put your application in motion." />
            <div className="checklist">
              <article className={`checklist-card payment-step ${paid ? 'is-complete' : 'is-current'}`}>
                <div className="checklist-top"><div className={`step-index ${paid ? 'complete' : ''}`}>{paid ? <Check size={16} /> : '01'}</div><div className="step-status">{paid ? <StatusPill variant="success">Paid</StatusPill> : <StatusPill variant="warning">Action needed</StatusPill>}</div></div>
                <div className="step-body"><div className="step-icon payment-icon"><WalletCards size={19} /></div><div><h3>Secure your placement</h3><p>One-time field placement processing fee</p></div></div>
                {!paid ? <div className="payment-form">
                  <div className="price-row"><span>Application fee</span><strong>TZS 25,000</strong></div>
                  <label className="field-label" htmlFor="payment-method">Choose payment method</label>
                  <div className="payment-methods" id="payment-method" role="radiogroup" aria-label="Payment method">
                    {['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Bank card'].map((method, index) => <button key={method} type="button" role="radio" aria-checked={paymentMethod === method} className={`payment-option ${paymentMethod === method ? 'selected' : ''}`} onClick={() => setPaymentMethod(method)}><span className={`payment-logo logo-${index}`}>{index === 3 ? <CreditCard size={16} /> : method === 'M-Pesa' ? 'M' : method === 'Tigo Pesa' ? 'T' : 'A'}</span><span>{method}</span>{paymentMethod === method && <CheckCircle2 className="method-check" size={15} />}</button>)}
                  </div>
                  <Button className="pay-button" onClick={onPay}>Pay TZS 25,000 <ArrowRight data-icon="inline-end" /></Button>
                  <div className="secure-note"><WalletCards size={12} /> Demo payment · no charge is processed</div>
                </div> : <div className="completed-message"><div className="completed-icon"><Check size={16} /></div><div><strong>Payment complete</strong><span>Receipt FL-PAY-29418 · View receipt <ArrowRight size={12} /></span></div><span className="amount-paid">TZS 25,000</span></div>}
              </article>

              <article id="uploads" className={`checklist-card ${paid ? completeDocs ? 'is-complete' : 'is-current' : 'is-locked'}`}>
                <div className="checklist-top"><div className={`step-index ${completeDocs ? 'complete' : ''}`}>{completeDocs ? <Check size={16} /> : '02'}</div><div className="step-status">{!paid ? <StatusPill>Locked</StatusPill> : completeDocs ? <StatusPill variant="success">Complete</StatusPill> : <StatusPill variant="blue">Ready for you</StatusPill>}</div></div>
                <div className="step-body"><div className="step-icon document-icon"><FileCheck2 size={19} /></div><div><h3>Share your documents</h3><p>PDF or image, up to 10 MB per file</p></div></div>
                {!paid ? <div className="locked-hint"><LockKeyhole size={15} /> Your upload area unlocks after payment</div> : <div className="upload-list">
                  <UploadTile title="University attachment letter" subtitle="Official letter from your university" file={files.letter} onFile={(file) => onFile('letter', file)} />
                  <UploadTile title="Curriculum vitae (CV)" subtitle="Your latest CV or résumé" file={files.cv} onFile={(file) => onFile('cv', file)} />
                  {completeDocs && <div className="upload-success"><CheckCircle2 size={16} /> All required documents are in. Your application is ready for review.</div>}
                  <p className="upload-demo-note">Preview only: files are not transmitted or stored on a server.</p>
                </div>}
              </article>
            </div>
          </section>

          <section className="workflow-section tracker-section" id="status">
            <SectionHeading eyebrow="APPLICATION TRACKER" title="Your journey at a glance" action={<button className="quiet-link" onClick={() => setActiveTab('My status')}>Full status <ArrowRight size={14} /></button>} />
            <div className="timeline-card"><div className="timeline-progress" />{steps.map((step, i) => <div key={step.title} className={`timeline-step ${step.done ? 'done' : i === (paid ? completeDocs ? 2 : 1 : 0) ? 'active' : ''}`}><div className="timeline-marker">{step.done ? <Check size={13} /> : <span>{String(i + 1).padStart(2, '0')}</span>}</div><div className="timeline-copy"><strong>{step.title}</strong><span>{step.detail}</span></div>{i === 0 && paid && <span className="timeline-date">Today</span>}</div>)}</div>
          </section>
        </div>

        <aside className="student-aside">
          {!acceptedCompany ? <section className="choice-card"><div className="choice-heading"><span className="choice-icon"><BadgeCheck size={18} /></span><span className="choice-label">MULTIPLE OFFERS</span></div><h3>You’re in demand.</h3><p>Two companies would love to have you. Choose your preferred placement before time runs out.</p><div className="countdown"><div className="countdown-title"><Clock3 size={14} /> TIME TO DECIDE</div><div className="countdown-digits"><div><strong>{String(countdownHours).padStart(2, '0')}</strong><span>HOURS</span></div><i>:</i><div><strong>{String(countdownMinutes).padStart(2, '0')}</strong><span>MINUTES</span></div><i>:</i><div><strong>{String(countdownSeconds).padStart(2, '0')}</strong><span>SECONDS</span></div></div></div><div className="offer-list">{[{ name: 'GreenEarth Tanzania', role: 'Environmental Field Officer', location: 'Dar es Salaam' }, { name: 'TANESCO', role: 'Sustainability Intern', location: 'Morogoro' }].map((company) => <div className="offer-item" key={company.name}><div className="company-monogram">{company.name === 'TANESCO' ? 'T' : 'G'}</div><div className="offer-info"><strong>{company.name}</strong><span>{company.role}</span><small>{company.location}</small></div><button className="accept-button" onClick={() => onAccept(company.name)} disabled={secondsRemaining === 0} aria-label={`Confirm and accept ${company.name}`}><Check size={14} /><span>Confirm &amp; Accept</span></button></div>)}</div><div className="choice-warning"><span>!</span><p>{secondsRemaining === 0 ? 'Your confirmation window has expired. Unclaimed placement slots have been released.' : 'Confirm your final choice within 72 hours. Other slots are automatically released once you accept.'}</p></div></section> : <section className="accepted-card"><div className="accepted-check"><CheckCircle2 size={22} /></div><StatusPill variant="success">Placement confirmed</StatusPill><h3>You’re going places.</h3><p>You accepted your field placement with <strong>{acceptedCompany}</strong>. They’ll be in touch soon with next steps.</p><button className="quiet-link" onClick={() => document.getElementById('status')?.scrollIntoView({ behavior: 'smooth' })}>View placement details <ArrowRight size={14} /></button></section>}
          <section className="help-card"><div className="help-icon"><LifeBuoy size={18} /></div><div><h4>Need a hand?</h4><p>Our placement team is here for you.</p><button onClick={() => window.alert('Support team: placements@fieldlink.co.tz')}>Get in touch <ArrowRight size={13} /></button></div><div className="help-decoration">?</div></section>
          <div className="aside-caption"><ShieldCheck size={14} /> Your information is private and protected</div>
        </aside>
      </div>
    </div>
  )
}

function UploadTile({ title, subtitle, file, onFile }: { title: string; subtitle: string; file: File | null; onFile: (file: File | null) => void }) {
  const inputId = title.toLowerCase().includes('letter') ? 'attachment-upload' : 'cv-upload'
  return (
    <label className={`upload-tile ${file ? 'uploaded' : ''}`} htmlFor={inputId}>
      <input id={inputId} type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" onChange={(event) => { const selected = event.target.files?.[0] ?? null; if (selected && selected.size > 10 * 1024 * 1024) { window.alert('Please choose a file smaller than 10 MB.'); event.target.value = ''; return } onFile(selected) }} />
      <span className="upload-file-icon">{file ? <FileCheck2 size={18} /> : <Upload size={17} />}</span>
      <span className="upload-file-copy"><strong>{title}</strong><small>{file ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB` : subtitle}</small>{file && <span className="upload-progress" role="progressbar" aria-label={`${title} upload complete`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}><span /></span>}</span>
      <span className="upload-action">{file ? <><Check size={13} /> Uploaded</> : 'Choose file'}</span>
    </label>
  )
}

function CompanyView({ applicants, onApplicantStatus }: { applicants: Applicant[]; onApplicantStatus: (name: string, status: ApplicantStatus) => void }) {
  const [filter, setFilter] = useState('All applicants')
  const [query, setQuery] = useState('')
  const filteredApplicants = useMemo(() => applicants.filter((applicant) => (filter === 'All applicants' || applicant.status === filter) && applicant.name.toLowerCase().includes(query.toLowerCase())), [applicants, filter, query])
  const reviewCount = applicants.filter((applicant) => applicant.status === 'Under review').length

  return <div className="page-content portal-content"><div className="portal-welcome"><div><p className="eyebrow">GREENEARTH TANZANIA · PARTNER PORTAL</p><h1>Good morning, Sarah.</h1><p>Here’s what’s happening with your field placement candidates.</p></div><div className="portal-avatar">SG</div></div>
    <div className="stat-grid"><MetricCard label="Total applicants" value={String(applicants.length).padStart(2, '0')} note="Across all open roles" icon={<UsersRound size={17} />} trend="View pipeline" /><MetricCard label="Needs your review" value={String(reviewCount).padStart(2, '0')} note="Ready for a decision" icon={<Clock3 size={17} />} accent="amber" trend="Take a look" /><MetricCard label="Students approved" value={String(applicants.filter((item) => item.status === 'Approved').length).padStart(2, '0')} note="For this placement cycle" icon={<BadgeCheck size={17} />} accent="green" trend="On track" /></div>
    <div className="portal-list-card"><div className="portal-list-header"><div><p className="eyebrow">CANDIDATE PIPELINE</p><h2>Your applicants <span className="count-badge">{applicants.length}</span></h2></div><button className="outline-button"><Plus size={15} /> Post a placement</button></div><div className="list-controls"><label className="search-box"><Search size={15} /><input aria-label="Search applicants" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by student name..." /></label><div className="filter-pills" role="group" aria-label="Filter applicants">{['All applicants', 'Under review', 'Approved', 'Rejected'].map((option) => <button key={option} className={filter === option ? 'active' : ''} onClick={() => setFilter(option)}>{option}</button>)}</div></div><div className="applicant-list">{filteredApplicants.map((applicant) => <article className="applicant-row" key={applicant.name}><div className={`applicant-avatar avatar-${applicant.color}`}>{applicant.initials}</div><div className="applicant-info"><strong>{applicant.name}</strong><span>{applicant.school}</span><small>{applicant.program}</small></div><div className="applicant-date">Applied {applicant.date}</div><div className="applicant-docs"><button className="doc-link" onClick={() => window.alert(`${applicant.name}’s attachment letter is ready to view.`)}><FileText size={14} /> Letter <ArrowUpRight size={11} /></button><button className="doc-link" onClick={() => window.alert(`${applicant.name}’s CV is ready to view.`)}><FileText size={14} /> CV <ArrowUpRight size={11} /></button></div><div className="applicant-actions"><StatusPill variant={applicant.status === 'Approved' ? 'success' : applicant.status === 'Rejected' ? 'danger' : 'warning'}>{applicant.status}</StatusPill>{applicant.status === 'Under review' && <><button className="icon-action approve-action" aria-label={`Approve ${applicant.name}`} onClick={() => onApplicantStatus(applicant.name, 'Approved')}><Check size={15} /></button><button className="icon-action reject-action" aria-label={`Reject ${applicant.name}`} onClick={() => onApplicantStatus(applicant.name, 'Rejected')}><X size={15} /></button></>}</div></article>)}{filteredApplicants.length === 0 && <div className="empty-list">No applicants match this filter.</div>}</div><div className="list-footer"><span>Showing {filteredApplicants.length} of {applicants.length} applicants</span><button>View all applicants <ArrowRight size={13} /></button></div></div>
    <div className="portal-tip"><Sparkles size={16} /><div><strong>A quick tip for better matches</strong><span>Reviewing applications within 5 days helps students find their placement sooner.</span></div><button aria-label="Dismiss tip"><X size={15} /></button></div>
  </div>
}

function AdminView({ applicants }: { applicants: Applicant[] }) {
  const [companyApproved, setCompanyApproved] = useState(false)
  const approved = applicants.filter((applicant) => applicant.status === 'Approved').length
  return <div className="page-content portal-content"><div className="portal-welcome"><div><p className="eyebrow">FIELDLINK ADMINISTRATION</p><h1>The big picture.</h1><p>Keep Tanzania’s next generation moving forward.</p></div><div className="portal-avatar admin-avatar"><ShieldCheck size={21} /></div></div>
    <div className="admin-stat-grid"><MetricCard label="Verified students" value="2,418" note="+12% this month" icon={<UsersRound size={17} />} trend="Healthy growth" /><MetricCard label="Payments collected" value="TZS 60.4M" note="2,418 successful payments" icon={<WalletCards size={17} />} accent="green" trend="View report" /><MetricCard label="Active placements" value={String(approved + 184).padStart(3, '0')} note="Across 86 partner companies" icon={<BriefcaseBusiness size={17} />} accent="purple" trend="View placements" /></div>
    <div className="admin-content-grid"><section className="admin-panel"><div className="panel-title"><div><p className="eyebrow">PARTNER ONBOARDING</p><h2>Company applications <span className="count-badge">{companyApproved ? '0' : '1'}</span></h2></div><button className="quiet-link">All companies <ArrowRight size={14} /></button></div>{!companyApproved ? <div className="company-review"><div className="company-review-icon"><Building2 size={19} /></div><div className="company-review-info"><strong>Kilimanjaro Fresh Produce Ltd.</strong><span>Arusha, Tanzania · 3 days ago</span><small><FileCheck2 size={13} /> Registration documents submitted</small></div><button className="review-button" onClick={() => setCompanyApproved(true)}><Check size={14} /> Approve partner</button><button className="subtle-icon-button" aria-label="More company actions"><MoreHorizontal size={18} /></button></div> : <div className="empty-state"><CheckCircle2 size={20} /><span>Kilimanjaro Fresh Produce is now an approved partner.</span></div>}</section>
      <section className="admin-panel activity-panel"><div className="panel-title"><div><p className="eyebrow">SYSTEM ACTIVITY</p><h2>Release log</h2></div><span className="live-indicator">LIVE</span></div><div className="activity-list"><div className="activity-item"><span className="activity-icon release"><ArrowDownRight size={15} /></span><div><strong>Placement slot released</strong><span>East African Breweries · 72-hour window expired</span><small>Today, 10:24 AM</small></div></div><div className="activity-item"><span className="activity-icon release"><ArrowDownRight size={15} /></span><div><strong>Placement slot released</strong><span>Ministry of Agriculture · Student withdrew</span><small>Yesterday, 4:18 PM</small></div></div><div className="activity-item"><span className="activity-icon success"><Check size={15} /></span><div><strong>Offer accepted</strong><span>GreenEarth Tanzania · Amina Kweka</span><small>Yesterday, 1:05 PM</small></div></div><div className="activity-item"><span className="activity-icon payment"><WalletCards size={15} /></span><div><strong>Payment verified</strong><span>24 student application fees processed</span><small>Nov 03, 9:30 AM</small></div></div></div><button className="activity-footer">View system audit log <ArrowRight size={13} /></button></section></div>
    <div className="admin-bottom-note"><LockKeyhole size={15} /><span>Admin actions are logged and auditable. Last system sync: 2 minutes ago.</span></div>
  </div>
}

function MetricCard({ label, value, note, icon, accent = 'blue', trend }: { label: string; value: string; note: string; icon: React.ReactNode; accent?: string; trend: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon metric-${accent}`}>{icon}</span></div><strong className="metric-value">{value}</strong><div className="metric-bottom"><span>{note}</span><span className="metric-trend">{trend} <ArrowUpRight size={11} /></span></div></article>
}

function LoginView({ onLogin, initialRole }: { onLogin: (portal: Portal) => void; initialRole: 'company' | 'admin' }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<'company' | 'admin'>(initialRole)
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false)
  const handleSubmit = () => {
    if (mode === 'register' && !companyName.trim()) { setError('Enter your name or organization to continue.'); return }
    if (!email.includes('@') || password.length < 8) { setError('Enter a valid work email and a password of at least 8 characters.'); return }
    setError('')
    if (mode === 'register') { setRegistrationSubmitted(true); return }
    onLogin(role)
  }
  return <div className="auth-shell"><div className="auth-card"><Brand /><p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'JOIN OUR PARTNER NETWORK'}</p><h1>{mode === 'login' ? 'Sign in to Fieldlink' : 'Create your partner account'}</h1><p className="auth-subtitle">{mode === 'login' ? 'Manage placements and help students find their path.' : 'Connect with talented students across Tanzania.'}</p><div className="auth-role-toggle" role="group" aria-label="Choose account type"><button className={role === 'company' ? 'active' : ''} onClick={() => setRole('company')}><Building2 size={15} /> Company</button><button className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}><ShieldCheck size={15} /> Admin</button></div>{mode === 'register' && <label className="auth-field">{role === 'company' ? 'Company name' : 'Full name'}<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder={role === 'company' ? 'Your organization' : 'Your name'} /></label>}<label className="auth-field">Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.co.tz" /></label><label className="auth-field">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>{error && <p className="auth-error" role="alert">{error}</p>}{registrationSubmitted && <p className="auth-notice" role="status">Registration received. Admin and company accounts require approval before portal access.</p>}<Button className="auth-submit" onClick={handleSubmit} disabled={registrationSubmitted}>{registrationSubmitted ? 'Request received' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight data-icon="inline-end" /></Button><p className="auth-switch">{mode === 'login' ? 'New to Fieldlink?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setRegistrationSubmitted(false); setError('') }}>{mode === 'login' ? 'Register your company' : 'Sign in'}</button></p><button className="auth-back" onClick={() => onLogin('student')}>← Return to student portal</button><div className="auth-security"><LockKeyhole size={13} /> Preview only · partner sign-in is simulated</div></div><div className="auth-side-note"><span>FIELDLINK PARTNER NETWORK</span><h2>Good work deserves<br />good people.</h2><p>Find the right student talent, support their growth, and build a stronger future for Tanzania.</p><div className="auth-partner-logos"><span>GREENEARTH</span><span>TANESCO</span><span>UDSM</span></div></div></div>
}

function handleMobileNavigation(currentPortal: Portal, destination: Portal, index: number, navigate: (portal: Portal) => void, signOut: () => void) {
  if (destination === 'login') {
    signOut()
    return
  }
  if (destination !== currentPortal) {
    navigate(destination)
    return
  }
  if (currentPortal === 'student' && index === 1) document.getElementById('uploads')?.scrollIntoView({ behavior: 'smooth' })
  if (currentPortal === 'student' && index === 2) document.getElementById('status')?.scrollIntoView({ behavior: 'smooth' })
  if (currentPortal === 'student' && index === 3) window.scrollTo({ top: 0, behavior: 'smooth' })
}

export default function FieldlinkApp() {
  const [portal, setPortal] = useState<Portal>('student')
  const [studentProfile, setStudentProfile] = useState(defaultStudentProfile)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setStudentProfile((profile) => ({
      name: params.get('name')?.trim() || profile.name,
      university: params.get('university')?.trim() || profile.university,
      sector: params.get('sector')?.trim() || profile.sector,
      studentId: params.get('studentId')?.trim() || profile.studentId,
    }))
  }, [])
  const [authorizedRole, setAuthorizedRole] = useState<'company' | 'admin' | null>(null)
  const [pendingRole, setPendingRole] = useState<'company' | 'admin'>('company')
  const [paid, setPaid] = useState(false)
  const [files, setFiles] = useState<Record<string, File | null>>({ letter: null, cv: null })
  const [acceptedCompany, setAcceptedCompany] = useState<string | null>(null)
  const [applicants, setApplicants] = useState(initialApplicants)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)

  const setApplicantStatus = (name: string, status: ApplicantStatus) => setApplicants((current) => current.map((applicant) => applicant.name === name ? { ...applicant, status } : applicant))
  const selectPortal = (value: Portal) => {
    setMenuOpen(false)
    if (value === 'company' || value === 'admin') {
      if (authorizedRole !== value) {
        setPendingRole(value)
        setPortal('login')
        return
      }
    }
    if (value === 'login') {
      setPortal('login')
      return
    }
    setPortal(value)
  }
  const completeLogin = (role: Portal) => {
    if (role === 'company' || role === 'admin') setAuthorizedRole(role)
    setPortal(role)
  }
  const title = portal === 'student' ? 'Student dashboard' : portal === 'company' ? 'Company portal' : portal === 'admin' ? 'Admin overview' : 'Partner access'

  return <div className="app-shell">
    {portal !== 'login' && <aside className="sidebar"><div className="sidebar-brand"><Brand /><span className="sidebar-tag">PLACEMENTS</span></div><div className="sidebar-profile"><div className="profile-avatar">{studentProfile.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="profile-copy"><strong>{portal === 'student' ? studentProfile.name : portal === 'company' ? 'Sarah Green' : 'Fieldlink Admin'}</strong><span>{portal === 'student' ? `Student · ${studentProfile.university}` : portal === 'company' ? 'GreenEarth Tanzania' : 'System administrator'}</span></div><ChevronDown size={15} /></div><div className="sidebar-label">WORKSPACE</div><nav className="side-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={portal === id ? 'active' : ''} onClick={() => selectPortal(id)}><Icon size={17} /><span>{label}</span>{id === 'company' && <span className="nav-count">3</span>}</button>)}<button onClick={() => selectPortal('login')}><LockKeyhole size={17} /><span>Partner sign in</span><ArrowUpRight className="nav-external" size={13} /></button></nav><div className="sidebar-bottom"><div className="sidebar-help"><span className="help-mini-icon"><LifeBuoy size={15} /></span><div><strong>Need some help?</strong><span>Visit our help centre</span></div><ChevronRight size={14} /></div><button className="sidebar-logout" onClick={() => { setAuthorizedRole(null); selectPortal('login') }}><LogOut size={16} /> Sign out</button><div className="sidebar-version">FIELDLINK © 2025 <span>v1.4.2</span></div></div></aside>}
    <main className={`main-area ${portal === 'login' ? 'login-area' : ''}`}>
      {portal !== 'login' && <header className="topbar"><div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} /><strong>{title}</strong></div><div className="topbar-actions"><span className="cycle-tag"><span className="cycle-dot" /> 2025 / 26 cycle</span><button className={`notification-button ${notificationOpen ? 'opened' : ''}`} aria-label="Notifications" onClick={() => setNotificationOpen(!notificationOpen)}><Bell size={17} /><span /></button>{notificationOpen && <div className="notification-popover"><strong>You’re all caught up</strong><span>New updates will show here.</span></div>}<div className="workspace-menu-wrap"><button className="workspace-switcher" onClick={() => setMenuOpen(!menuOpen)}><span className="switcher-avatar">{portal === 'student' ? studentProfile.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() : portal === 'company' ? 'SG' : 'FA'}</span><span>{portal === 'student' ? studentProfile.name : portal === 'company' ? 'GreenEarth TZ' : 'Fieldlink Admin'}</span><ChevronDown size={14} /></button>{menuOpen && <div className="workspace-menu">{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => selectPortal(id)}><Icon size={15} />{label}</button>)}<button onClick={() => selectPortal('login')}><LockKeyhole size={15} />Partner sign in</button></div>}</div></div></header>}
      {portal === 'student' && <StudentView paid={paid} onPay={() => setPaid(true)} files={files} onFile={(key, file) => setFiles((current) => ({ ...current, [key]: file }))} studentProfile={studentProfile} acceptedCompany={acceptedCompany} onAccept={setAcceptedCompany} />}
      {portal === 'company' && <CompanyView applicants={applicants} onApplicantStatus={setApplicantStatus} />}
      {portal === 'admin' && <AdminView applicants={applicants} />}
      {portal === 'login' && <LoginView initialRole={pendingRole} onLogin={completeLogin} />}
      {portal !== 'login' && <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{(portal === 'student' ? [{ id: 'student' as Portal, label: 'Home', icon: LayoutDashboard }, { id: 'student' as Portal, label: 'Uploads', icon: Upload }, { id: 'student' as Portal, label: 'My status', icon: FileCheck2 }, { id: 'student' as Portal, label: 'Profile', icon: UserRound }] : [{ id: portal, label: 'Home', icon: LayoutDashboard }, { id: portal, label: portal === 'company' ? 'Applicants' : 'Partners', icon: UsersRound }, { id: portal, label: 'Activity', icon: Clock3 }, { id: 'login' as Portal, label: 'Sign out', icon: LogOut }]).map(({ id, label, icon: Icon }, index) => <button key={`${label}-${index}`} className={index === 0 ? 'selected' : ''} onClick={() => handleMobileNavigation(portal, id, index, selectPortal, () => { setAuthorizedRole(null); selectPortal('login') })}><Icon size={19} /><span>{label}</span></button>)}</nav>}
      {portal !== 'login' && <footer className="app-footer"><span>© 2025 Fieldlink Tanzania</span><span>Made for your next step <span className="footer-heart">↗</span></span><a href="#privacy">Privacy & safety</a></footer>}
    </main>
  </div>
}
