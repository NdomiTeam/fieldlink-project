'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  type Application,
  type CompanyApplicant,
  type Student,
  adminApi,
  authApi,
  companyApi,
  getStudentSessionToken,
  setPortalToken,
  setStudentSessionToken,
  studentApi,
} from '@/lib/api'
import {
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
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  LogOut,
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

const AVATAR_COLORS = ['lilac', 'peach', 'mint', 'blue']
function colorFor(name: string) {
  const sum = name.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}
function initialsFor(name: string) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}
function mapToApplicantStatus(status: Application['status']): ApplicantStatus {
  if (status === 'rejected_by_company' || status === 'rejected_by_admin' || status === 'expired') return 'Rejected'
  if (status === 'accepted_by_company' || status === 'awaiting_student_confirmation' || status === 'confirmed') return 'Approved'
  return 'Under review'
}
function formatWhen(iso: string) {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const navItems = [
  { id: 'student' as const, label: 'Student view', icon: GraduationCap },
  { id: 'company' as const, label: 'Company portal', icon: Building2 },
  { id: 'admin' as const, label: 'Admin overview', icon: LayoutDashboard },
]

const DOCUMENT_TILES = [
  { key: 'introduction_letter', title: 'University introduction letter', subtitle: 'Official letter from your university' },
  { key: 'national_id', title: 'National ID or student ID', subtitle: 'NIDA number or university ID card' },
  { key: 'cv', title: 'Curriculum vitae (CV)', subtitle: 'Your latest CV or résumé' },
]

function Brand() {
  return (
    <a className="brand" href="#home" aria-label="Fieldlink home">
      <img src="/Field Link Logo.png" alt="Fieldlink" className="brand-logo" />
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
  student,
  sessionError,
  applications,
  payment,
  onPay,
  paying,
  files,
  onFile,
  uploading,
  uploadError,
  onConfirm,
}: {
  student: Student | null
  sessionError: string | null
  applications: Application[]
  payment: { id: string } | null
  onPay: () => void
  paying: boolean
  files: Record<string, File | null>
  onFile: (key: string, file: File | null) => void
  uploading: boolean
  uploadError: string | null
  onConfirm: (applicationId: string) => void
}) {
  const [activeTab, setActiveTab] = useState('Overview')
  const paid = Boolean(payment)
  const completeDocs = DOCUMENT_TILES.every((tile) => Boolean(files[tile.key]))

  const awaitingConfirmation = applications.filter((a) => a.status === 'awaiting_student_confirmation')
  const confirmedApplication = applications.find((a) => a.status === 'confirmed')
  const deadline = awaitingConfirmation[0]?.confirmation_deadline ?? null
  const [secondsRemaining, setSecondsRemaining] = useState(0)

  useEffect(() => {
    if (!deadline) { setSecondsRemaining(0); return }
    const compute = () => Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
    setSecondsRemaining(compute())
    const interval = window.setInterval(() => setSecondsRemaining(compute()), 1000)
    return () => window.clearInterval(interval)
  }, [deadline])

  const countdownHours = Math.floor(secondsRemaining / 3600)
  const countdownMinutes = Math.floor((secondsRemaining % 3600) / 60)
  const countdownSeconds = secondsRemaining % 60

  const steps = [
    { title: 'Payment received', detail: paid ? 'TZS 10,000 · Covers 3 applications' : 'Complete payment to continue', done: paid },
    { title: 'Documents submitted', detail: completeDocs ? '3 documents · Submitted' : 'Upload your required documents', done: completeDocs },
    { title: 'Under company review', detail: completeDocs ? 'Usually takes 2–5 working days' : 'Starts after documents are submitted', done: applications.some((a) => a.status !== 'pending_admin') },
    { title: 'Placement decision', detail: 'We’ll notify you as soon as there’s an update', done: Boolean(confirmedApplication) },
  ]

  if (!student) {
    return (
      <div className="page-content student-content">
        <section className="welcome-card">
          <div className="welcome-copy">
            <span className="welcome-tag"><Sparkles size={13} /> FIELD PLACEMENT</span>
            <h1>Open this from the Ndomi app</h1>
            <p>{sessionError || 'This page only works when you arrive here through the “Request Field” button inside the Ndomi app, which signs you in automatically.'}</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-content student-content">
      <section className="welcome-card">
        <div className="welcome-orb orb-one" /><div className="welcome-orb orb-two" />
        <div className="welcome-copy">
          <span className="welcome-tag"><Sparkles size={13} /> FIELD PLACEMENT</span>
          <h1>Your next chapter<br className="mobile-break" /> starts here, {student.name.split(' ')[0]}.</h1>
          <p>Your field placement journey, all in one place. Let’s get you ready for the real world.</p>
          <div className="welcome-meta"><span><GraduationCap size={15} /> {student.university_name || 'University not set'}</span><span className="meta-divider" /><span><BriefcaseBusiness size={15} /> {student.field_of_study || 'Field of study not set'}</span></div>
        </div>
        <div className="welcome-illustration" aria-hidden="true"><div className="illu-circle"><GraduationCap size={62} strokeWidth={1.25} /></div><div className="illu-spark spark-a">✳</div><div className="illu-spark spark-b">✦</div><div className="illu-line" /></div>
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
                <div className="step-body"><div className="step-icon payment-icon"><WalletCards size={19} /></div><div><h3>Secure your placement</h3><p>One-time fee, submits your application to up to 3 companies</p></div></div>
                {!paid ? <div className="payment-form">
                  <div className="price-row"><span>Application fee</span><strong>TZS 10,000</strong></div>
                  <Button className="pay-button" onClick={onPay} disabled={paying}>{paying ? 'Processing…' : 'Pay TZS 10,000'} <ArrowRight data-icon="inline-end" /></Button>
                  <div className="secure-note"><WalletCards size={12} /> Demo payment · no charge is processed yet</div>
                </div> : <div className="completed-message"><div className="completed-icon"><Check size={16} /></div><div><strong>Payment complete</strong><span>Payment ID {payment?.id.slice(0, 8)}</span></div><span className="amount-paid">TZS 10,000</span></div>}
              </article>

              <article id="uploads" className={`checklist-card ${paid ? completeDocs ? 'is-complete' : 'is-current' : 'is-locked'}`}>
                <div className="checklist-top"><div className={`step-index ${completeDocs ? 'complete' : ''}`}>{completeDocs ? <Check size={16} /> : '02'}</div><div className="step-status">{!paid ? <StatusPill>Locked</StatusPill> : completeDocs ? <StatusPill variant="success">Complete</StatusPill> : <StatusPill variant="blue">Ready for you</StatusPill>}</div></div>
                <div className="step-body"><div className="step-icon document-icon"><FileCheck2 size={19} /></div><div><h3>Share your documents</h3><p>PDF, PNG or JPEG, up to 10 MB per file</p></div></div>
                {!paid ? <div className="locked-hint"><LockKeyhole size={15} /> Your upload area unlocks after payment</div> : <div className="upload-list">
                  {applications.length === 0 && <p className="upload-demo-note">No field spaces from your Ndomi selection have reached FieldLink yet, you can still upload your documents and they’ll attach once they do.</p>}
                  {DOCUMENT_TILES.map((tile) => (
                    <UploadTile key={tile.key} id={tile.key} title={tile.title} subtitle={tile.subtitle} file={files[tile.key] ?? null} onFile={(file) => onFile(tile.key, file)} />
                  ))}
                  {uploadError && <p className="auth-error" role="alert">{uploadError}</p>}
                  {uploading && <p className="upload-demo-note">Uploading…</p>}
                  {completeDocs && !uploading && <div className="upload-success"><CheckCircle2 size={16} /> All required documents are in. Your application is ready for review.</div>}
                </div>}
              </article>
            </div>
          </section>

          <section className="workflow-section tracker-section" id="status">
            <SectionHeading eyebrow="APPLICATION TRACKER" title="Your journey at a glance" action={<button className="quiet-link" onClick={() => setActiveTab('My status')}>Full status <ArrowRight size={14} /></button>} />
            <div className="timeline-card"><div className="timeline-progress" />{steps.map((step, i) => <div key={step.title} className={`timeline-step ${step.done ? 'done' : ''}`}><div className="timeline-marker">{step.done ? <Check size={13} /> : <span>{String(i + 1).padStart(2, '0')}</span>}</div><div className="timeline-copy"><strong>{step.title}</strong><span>{step.detail}</span></div></div>)}</div>
          </section>
        </div>

        <aside className="student-aside">
          {confirmedApplication ? (
            <section className="accepted-card">
              <div className="accepted-check"><CheckCircle2 size={22} /></div>
              <StatusPill variant="success">Placement confirmed</StatusPill>
              <h3>You’re going places.</h3>
              <p>Your placement with <strong>{confirmedApplication.field_spaces?.company_profiles?.name || confirmedApplication.field_spaces?.title}</strong> is confirmed. They’ll be in touch soon with next steps.</p>
            </section>
          ) : awaitingConfirmation.length > 0 ? (
            <section className="choice-card">
              <div className="choice-heading"><span className="choice-icon"><BadgeCheck size={18} /></span><span className="choice-label">MULTIPLE OFFERS</span></div>
              <h3>You’re in demand.</h3>
              <p>{awaitingConfirmation.length} companies would love to have you. Choose your preferred placement before time runs out.</p>
              <div className="countdown"><div className="countdown-title"><Clock3 size={14} /> TIME TO DECIDE</div><div className="countdown-digits"><div><strong>{String(countdownHours).padStart(2, '0')}</strong><span>HOURS</span></div><i>:</i><div><strong>{String(countdownMinutes).padStart(2, '0')}</strong><span>MINUTES</span></div><i>:</i><div><strong>{String(countdownSeconds).padStart(2, '0')}</strong><span>SECONDS</span></div></div></div>
              <div className="offer-list">
                {awaitingConfirmation.map((application) => {
                  const companyName = application.field_spaces?.company_profiles?.name || application.field_spaces?.title || 'Company'
                  return (
                    <div className="offer-item" key={application.id}>
                      <div className="company-monogram">{companyName[0]}</div>
                      <div className="offer-info"><strong>{companyName}</strong><span>{application.field_spaces?.title}</span></div>
                      <button className="accept-button" onClick={() => onConfirm(application.id)} disabled={secondsRemaining === 0} aria-label={`Confirm and accept ${companyName}`}><Check size={14} /><span>Confirm &amp; Accept</span></button>
                    </div>
                  )
                })}
              </div>
              <div className="choice-warning"><span>!</span><p>{secondsRemaining === 0 ? 'Your confirmation window has expired. Unclaimed placement slots have been released.' : 'Confirm your final choice within 72 hours. Other slots are automatically released once you accept.'}</p></div>
            </section>
          ) : applications.length > 0 ? (
            <section className="choice-card">
              <h3>Your applications</h3>
              <div className="offer-list">
                {applications.map((application) => {
                  const companyName = application.field_spaces?.company_profiles?.name || application.field_spaces?.title || 'Company'
                  return (
                    <div className="offer-item" key={application.id}>
                      <div className="company-monogram">{companyName[0]}</div>
                      <div className="offer-info"><strong>{companyName}</strong><span>{application.field_spaces?.title}</span></div>
                      <StatusPill variant={mapToApplicantStatus(application.status) === 'Approved' ? 'success' : mapToApplicantStatus(application.status) === 'Rejected' ? 'danger' : 'warning'}>{mapToApplicantStatus(application.status)}</StatusPill>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : (
            <section className="choice-card"><p className="empty-list">No applications yet. They’ll appear here once a field space from your Ndomi selection reaches FieldLink.</p></section>
          )}
          <section className="help-card"><div className="help-icon"><LifeBuoy size={18} /></div><div><h4>Need a hand?</h4><p>Our placement team is here for you.</p><button onClick={() => window.alert('Support team: placements@fieldlink.co.tz')}>Get in touch <ArrowRight size={13} /></button></div><div className="help-decoration">?</div></section>
          <div className="aside-caption"><ShieldCheck size={14} /> Your information is private and protected</div>
        </aside>
      </div>
    </div>
  )
}

function UploadTile({ id, title, subtitle, file, onFile }: { id: string; title: string; subtitle: string; file: File | null; onFile: (file: File | null) => void }) {
  return (
    <label className={`upload-tile ${file ? 'uploaded' : ''}`} htmlFor={`upload-${id}`}>
      <input id={`upload-${id}`} type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" onChange={(event) => { const selected = event.target.files?.[0] ?? null; if (selected && selected.size > 10 * 1024 * 1024) { window.alert('Please choose a file smaller than 10 MB.'); event.target.value = ''; return } onFile(selected) }} />
      <span className="upload-file-icon">{file ? <FileCheck2 size={18} /> : <Upload size={17} />}</span>
      <span className="upload-file-copy"><strong>{title}</strong><small>{file ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB` : subtitle}</small></span>
      <span className="upload-action">{file ? <><Check size={13} /> Uploaded</> : 'Choose file'}</span>
    </label>
  )
}

function CompanyView({ applicants, loading, error, onAccept, onReject }: { applicants: CompanyApplicant[]; loading: boolean; error: string | null; onAccept: (id: string) => void; onReject: (id: string) => void }) {
  const [filter, setFilter] = useState('All applicants')
  const [query, setQuery] = useState('')
  const rows = useMemo(
    () => applicants.map((applicant) => ({
      applicant,
      status: mapToApplicantStatus(applicant.status),
      name: applicant.students?.name || 'Unknown student',
    })),
    [applicants],
  )
  const filteredRows = rows.filter((row) => (filter === 'All applicants' || row.status === filter) && row.name.toLowerCase().includes(query.toLowerCase()))
  const reviewCount = rows.filter((row) => row.status === 'Under review').length

  return <div className="page-content portal-content"><div className="portal-welcome"><div><p className="eyebrow">COMPANY PORTAL</p><h1>Good morning.</h1><p>Here’s what’s happening with your field placement candidates.</p></div></div>
    <div className="stat-grid"><MetricCard label="Total applicants" value={String(rows.length).padStart(2, '0')} note="Across all open roles" icon={<UsersRound size={17} />} trend="View pipeline" /><MetricCard label="Needs your review" value={String(reviewCount).padStart(2, '0')} note="Ready for a decision" icon={<Clock3 size={17} />} accent="amber" trend="Take a look" /><MetricCard label="Students approved" value={String(rows.filter((row) => row.status === 'Approved').length).padStart(2, '0')} note="For this placement cycle" icon={<BadgeCheck size={17} />} accent="green" trend="On track" /></div>
    <div className="portal-list-card"><div className="portal-list-header"><div><p className="eyebrow">CANDIDATE PIPELINE</p><h2>Your applicants <span className="count-badge">{rows.length}</span></h2></div></div><div className="list-controls"><label className="search-box"><Search size={15} /><input aria-label="Search applicants" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by student name..." /></label><div className="filter-pills" role="group" aria-label="Filter applicants">{['All applicants', 'Under review', 'Approved', 'Rejected'].map((option) => <button key={option} className={filter === option ? 'active' : ''} onClick={() => setFilter(option)}>{option}</button>)}</div></div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="applicant-list">
        {loading && <div className="empty-list">Loading applicants…</div>}
        {!loading && filteredRows.map(({ applicant, status, name }) => (
          <article className="applicant-row" key={applicant.id}>
            <div className={`applicant-avatar avatar-${colorFor(name)}`}>{initialsFor(name)}</div>
            <div className="applicant-info"><strong>{name}</strong><span>{applicant.students?.university_name || 'University not set'}</span><small>{applicant.field_spaces?.title}</small></div>
            <div className="applicant-date">Applied {formatWhen(applicant.created_at)}</div>
            <div className="applicant-actions">
              <StatusPill variant={status === 'Approved' ? 'success' : status === 'Rejected' ? 'danger' : 'warning'}>{status}</StatusPill>
              {applicant.status === 'approved_to_company' && <><button className="icon-action approve-action" aria-label={`Approve ${name}`} onClick={() => onAccept(applicant.id)}><Check size={15} /></button><button className="icon-action reject-action" aria-label={`Reject ${name}`} onClick={() => onReject(applicant.id)}><X size={15} /></button></>}
            </div>
          </article>
        ))}
        {!loading && filteredRows.length === 0 && <div className="empty-list">No applicants match this filter.</div>}
      </div>
      <div className="list-footer"><span>Showing {filteredRows.length} of {rows.length} applicants</span></div>
    </div>
  </div>
}

function AdminView({ applications, loading, error, onApprove, onReject }: { applications: CompanyApplicant[]; loading: boolean; error: string | null; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  const pending = applications.filter((a) => a.status === 'pending_admin')
  return <div className="page-content portal-content"><div className="portal-welcome"><div><p className="eyebrow">FIELDLINK ADMINISTRATION</p><h1>The big picture.</h1><p>Keep Tanzania’s next generation moving forward.</p></div><div className="portal-avatar admin-avatar"><ShieldCheck size={21} /></div></div>
    <div className="admin-stat-grid"><MetricCard label="Pending review" value={String(pending.length).padStart(2, '0')} note="Waiting on admin approval" icon={<UsersRound size={17} />} trend="Review now" /><MetricCard label="Total applications" value={String(applications.length).padStart(2, '0')} note="All statuses" icon={<WalletCards size={17} />} accent="green" trend="View all" /></div>
    <div className="admin-content-grid">
      <section className="admin-panel">
        <div className="panel-title"><div><p className="eyebrow">STUDENT APPLICATIONS</p><h2>Pending admin review <span className="count-badge">{pending.length}</span></h2></div></div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {loading && <div className="empty-list">Loading…</div>}
        {!loading && pending.length === 0 && <div className="empty-state"><CheckCircle2 size={20} /><span>Nothing waiting on admin review right now.</span></div>}
        {!loading && pending.map((application) => (
          <div className="company-review" key={application.id}>
            <div className="company-review-icon"><Building2 size={19} /></div>
            <div className="company-review-info"><strong>{application.students?.name}</strong><span>{application.field_spaces?.company_profiles?.name || application.field_spaces?.title}</span><small><FileCheck2 size={13} /> Applied {formatWhen(application.created_at)}</small></div>
            <button className="review-button" onClick={() => onApprove(application.id)}><Check size={14} /> Approve</button>
            <button className="icon-action reject-action" aria-label="Reject" onClick={() => onReject(application.id)}><X size={15} /></button>
          </div>
        ))}
      </section>
      <section className="admin-panel activity-panel">
        <div className="panel-title"><div><p className="eyebrow">SYSTEM ACTIVITY</p><h2>Release log</h2></div></div>
        <div className="empty-list">Activity log isn’t wired up yet, this will show real approvals/releases once built.</div>
      </section>
    </div>
  </div>
}

function MetricCard({ label, value, note, icon, accent = 'blue', trend }: { label: string; value: string; note: string; icon: React.ReactNode; accent?: string; trend: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon metric-${accent}`}>{icon}</span></div><strong className="metric-value">{value}</strong><div className="metric-bottom"><span>{note}</span><span className="metric-trend">{trend} <ArrowUpRight size={11} /></span></div></article>
}

function LoginView({ onLogin, initialRole }: { onLogin: (portal: Portal) => void; initialRole: 'company' | 'admin' }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<'company' | 'admin'>(initialRole)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (mode === 'register' && role === 'admin' && !name.trim()) { setError('Enter your full name to continue.'); return }
    if (!email.includes('@') || password.length < 8) { setError('Enter a valid work email and a password of at least 8 characters.'); return }
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'register') {
        if (role === 'company') await authApi.companyRegister(email, password)
        else await authApi.adminRegister(email, password, name)
        setRegistrationSubmitted(true)
        return
      }
      const result = role === 'company' ? await authApi.companyLogin(email, password) : await authApi.adminLogin(email, password)
      setPortalToken(role, result.accessToken)
      onLogin(role)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="auth-shell"><div className="auth-card"><Brand /><p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'JOIN OUR PARTNER NETWORK'}</p><h1>{mode === 'login' ? 'Sign in to Fieldlink' : 'Create your partner account'}</h1><p className="auth-subtitle">{mode === 'login' ? 'Manage placements and help students find their path.' : 'Connect with talented students across Tanzania.'}</p><div className="auth-role-toggle" role="group" aria-label="Choose account type"><button className={role === 'company' ? 'active' : ''} onClick={() => setRole('company')}><Building2 size={15} /> Company</button><button className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}><ShieldCheck size={15} /> Admin</button></div>{mode === 'register' && role === 'admin' && <label className="auth-field">Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>}{mode === 'register' && role === 'company' && <p className="auth-notice">Company registration is checked against an approved company on Ndomi by this email, no separate approval needed.</p>}<label className="auth-field">Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.co.tz" /></label><label className="auth-field">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>{error && <p className="auth-error" role="alert">{error}</p>}{registrationSubmitted && <p className="auth-notice" role="status">{role === 'admin' ? 'Registration received. An existing admin must approve this account before it can be used.' : 'Account created. You can sign in now.'}</p>}<Button className="auth-submit" onClick={handleSubmit} disabled={submitting || registrationSubmitted}>{submitting ? 'Please wait…' : registrationSubmitted ? 'Request received' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight data-icon="inline-end" /></Button><p className="auth-switch">{mode === 'login' ? 'New to Fieldlink?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setRegistrationSubmitted(false); setError('') }}>{mode === 'login' ? 'Register your company' : 'Sign in'}</button></p><button className="auth-back" onClick={() => onLogin('student')}>← Return to student portal</button><div className="auth-security"><LockKeyhole size={13} /> Partner sign-in</div></div><div className="auth-side-note"><span>FIELDLINK PARTNER NETWORK</span><h2>Good work deserves<br />good people.</h2><p>Find the right student talent, support their growth, and build a stronger future for Tanzania.</p></div></div>
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
  const [student, setStudent] = useState<Student | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [payment, setPayment] = useState<{ id: string } | null>(null)
  const [paying, setPaying] = useState(false)
  const [files, setFiles] = useState<Record<string, File | null>>({ introduction_letter: null, national_id: null, cv: null })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [authorizedRole, setAuthorizedRole] = useState<'company' | 'admin' | null>(null)
  const [pendingRole, setPendingRole] = useState<'company' | 'admin'>('company')
  const [companyApplicants, setCompanyApplicants] = useState<CompanyApplicant[]>([])
  const [companyLoading, setCompanyLoading] = useState(false)
  const [companyError, setCompanyError] = useState<string | null>(null)
  const [adminApplications, setAdminApplications] = useState<CompanyApplicant[]>([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)

  const refreshApplications = async () => {
    try {
      const apps = await studentApi.listApplications()
      setApplications(apps)
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to load applications')
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ssoToken = params.get('t')

    async function init() {
      if (ssoToken) {
        try {
          const result = await studentApi.exchangeSsoToken(ssoToken)
          setStudentSessionToken(result.sessionToken)
          setStudent(result.student)
          await refreshApplications()
        } catch (err) {
          setSessionError(err instanceof Error ? err.message : 'That login link is invalid or has expired.')
        }
        return
      }
      const existing = getStudentSessionToken()
      if (existing) {
        try {
          const me = await studentApi.me()
          setStudent(me)
          await refreshApplications()
        } catch (err) {
          setSessionError(err instanceof Error ? err.message : 'Your session has expired, please go back to the Ndomi app.')
        }
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (portal === 'company' && authorizedRole === 'company') {
      setCompanyLoading(true)
      companyApi.listApplications()
        .then(setCompanyApplicants)
        .catch((err) => setCompanyError(err instanceof Error ? err.message : 'Failed to load applicants'))
        .finally(() => setCompanyLoading(false))
    }
    if (portal === 'admin' && authorizedRole === 'admin') {
      setAdminLoading(true)
      adminApi.listApplications()
        .then(setAdminApplications)
        .catch((err) => setAdminError(err instanceof Error ? err.message : 'Failed to load applications'))
        .finally(() => setAdminLoading(false))
    }
  }, [portal, authorizedRole])

  const onPay = async () => {
    setPaying(true)
    try {
      const result = await studentApi.createPayment('demo')
      setPayment(result)
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  const onFile = async (key: string, file: File | null) => {
    setFiles((current) => ({ ...current, [key]: file }))
    if (!file || applications.length === 0) return
    setUploading(true)
    setUploadError(null)
    try {
      await Promise.all(applications.map((application) => studentApi.uploadDocument(application.id, key, file)))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onConfirm = async (applicationId: string) => {
    try {
      await studentApi.confirmApplication(applicationId)
      await refreshApplications()
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to confirm')
    }
  }

  const onCompanyAccept = async (id: string) => {
    await companyApi.accept(id)
    setCompanyApplicants(await companyApi.listApplications())
  }
  const onCompanyReject = async (id: string) => {
    await companyApi.reject(id)
    setCompanyApplicants(await companyApi.listApplications())
  }
  const onAdminApprove = async (id: string) => {
    await adminApi.approve(id)
    setAdminApplications(await adminApi.listApplications())
  }
  const onAdminReject = async (id: string) => {
    await adminApi.reject(id)
    setAdminApplications(await adminApi.listApplications())
  }

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
  const displayName = portal === 'student' ? (student?.name || 'Student') : portal === 'company' ? 'Company' : 'Fieldlink Admin'

  return <div className="app-shell">
    {portal !== 'login' && <aside className="sidebar"><div className="sidebar-brand"><Brand /></div><div className="sidebar-profile"><div className="profile-avatar">{initialsFor(displayName)}</div><div className="profile-copy"><strong>{displayName}</strong><span>{portal === 'student' ? (student?.university_name || 'Student') : portal === 'company' ? 'Company partner' : 'System administrator'}</span></div><ChevronDown size={15} /></div><div className="sidebar-label">WORKSPACE</div><nav className="side-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={portal === id ? 'active' : ''} onClick={() => selectPortal(id)}><Icon size={17} /><span>{label}</span></button>)}<button onClick={() => selectPortal('login')}><LockKeyhole size={17} /><span>Partner sign in</span><ArrowUpRight className="nav-external" size={13} /></button></nav><div className="sidebar-bottom"><div className="sidebar-help"><span className="help-mini-icon"><LifeBuoy size={15} /></span><div><strong>Need some help?</strong><span>Visit our help centre</span></div><ChevronRight size={14} /></div><button className="sidebar-logout" onClick={() => { setAuthorizedRole(null); selectPortal('login') }}><LogOut size={16} /> Sign out</button></div></aside>}
    <main className={`main-area ${portal === 'login' ? 'login-area' : ''}`}>
      {portal !== 'login' && <header className="topbar"><div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} /><strong>{title}</strong></div><div className="topbar-actions"><button className={`notification-button ${notificationOpen ? 'opened' : ''}`} aria-label="Notifications" onClick={() => setNotificationOpen(!notificationOpen)}><Bell size={17} /><span /></button>{notificationOpen && <div className="notification-popover"><strong>You’re all caught up</strong><span>New updates will show here.</span></div>}<div className="workspace-menu-wrap"><button className="workspace-switcher" onClick={() => setMenuOpen(!menuOpen)}><span className="switcher-avatar">{initialsFor(displayName)}</span><span>{displayName}</span><ChevronDown size={14} /></button>{menuOpen && <div className="workspace-menu">{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => selectPortal(id)}><Icon size={15} />{label}</button>)}<button onClick={() => selectPortal('login')}><LockKeyhole size={15} />Partner sign in</button></div>}</div></div></header>}
      {portal === 'student' && <StudentView student={student} sessionError={sessionError} applications={applications} payment={payment} onPay={onPay} paying={paying} files={files} onFile={onFile} uploading={uploading} uploadError={uploadError} onConfirm={onConfirm} />}
      {portal === 'company' && <CompanyView applicants={companyApplicants} loading={companyLoading} error={companyError} onAccept={onCompanyAccept} onReject={onCompanyReject} />}
      {portal === 'admin' && <AdminView applications={adminApplications} loading={adminLoading} error={adminError} onApprove={onAdminApprove} onReject={onAdminReject} />}
      {portal === 'login' && <LoginView initialRole={pendingRole} onLogin={completeLogin} />}
      {portal !== 'login' && <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{(portal === 'student' ? [{ id: 'student' as Portal, label: 'Home', icon: LayoutDashboard }, { id: 'student' as Portal, label: 'Uploads', icon: Upload }, { id: 'student' as Portal, label: 'My status', icon: FileCheck2 }, { id: 'student' as Portal, label: 'Profile', icon: UserRound }] : [{ id: portal, label: 'Home', icon: LayoutDashboard }, { id: portal, label: portal === 'company' ? 'Applicants' : 'Partners', icon: UsersRound }, { id: portal, label: 'Activity', icon: Clock3 }, { id: 'login' as Portal, label: 'Sign out', icon: LogOut }]).map(({ id, label, icon: Icon }, index) => <button key={`${label}-${index}`} className={index === 0 ? 'selected' : ''} onClick={() => handleMobileNavigation(portal, id, index, selectPortal, () => { setAuthorizedRole(null); selectPortal('login') })}><Icon size={19} /><span>{label}</span></button>)}</nav>}
      {portal !== 'login' && <footer className="app-footer"><span>© 2025 Fieldlink Tanzania</span><span>Made for your next step <span className="footer-heart">↗</span></span><a href="#privacy">Privacy &amp; safety</a></footer>}
    </main>
  </div>
}
