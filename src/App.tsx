import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import LoginPage from './components/LoginPage'
import RegisterForm from './components/RegisterForm'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import SubmitConcernForm from './components/SubmitConcernForm'
import StatusTracker from './components/StatusTracker'
import AdminDashboard from './components/AdminDashboard'
import StudentAccountSettings from './components/StudentAccountSettings'
import AdminAccountSettings from './components/AdminAccountSettings'
import SuperAdminDashboard from './components/SuperAdminDashboard'

export default function App() {
  const {
    user, loading,
    studentLogin, adminLogin,
    studentRegister, adminRegister,
    updateStudentProfile, updateAdminProfile, updatePassword,
    logout
  } = useAuth()

  const [screen, setScreen] = useState<'login' | 'register-student' | 'register-admin' | 'forgot' | 'settings'>('login')
  const [forgotRole, setForgotRole] = useState<'student' | 'admin'>('student')
  const [activeTab, setActiveTab] = useState<'submit' | 'tracker'>('submit')

  // ── PASSWORD RESET FLOW ────────────────────────
  // Check if user landed here from password reset email link BEFORE any other checks
  // Supabase appends #access_token= and type=recovery to URL when user clicks reset link
  // This must be checked BEFORE loading spinner, user check, and role-based routing
  const isResetFlow = window.location.hash.includes('access_token') &&
    window.location.hash.includes('type=recovery')

  if (isResetFlow) {
    return <ResetPassword />
  }

  // Show loading spinner while checking session
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
    </div>
  )

  // ── NOT LOGGED IN ──────────────────────────────
  if (!user) {
    if (screen === 'register-student') return (
      <RegisterForm
        role="student"
        onBack={() => setScreen('login')}
        onRegister={studentRegister}
      />
    )
    if (screen === 'register-admin') return (
      <RegisterForm
        role="admin"
        onBack={() => setScreen('login')}
        onRegister={adminRegister}
      />
    )
    if (screen === 'forgot') return (
      <ForgotPassword
        role={forgotRole}
        onBack={() => setScreen('login')}
      />
    )
    return (
      <LoginPage
        onStudentLogin={studentLogin}
        onAdminLogin={adminLogin}
        onStudentRegister={() => setScreen('register-student')}
        onAdminRegister={() => setScreen('register-admin')}
        onForgotPassword={(role) => { setForgotRole(role); setScreen('forgot') }}
      />
    )
  }

  // ── SUPER ADMIN ────────────────────────────────
  if (user.role === 'superadmin') {
    if (screen === 'settings') return (
      <AdminAccountSettings
        user={user}
        onBack={() => setScreen('login')}
        onUpdateProfile={updateAdminProfile}
        onUpdatePassword={updatePassword}
      />
    )
    return (
      <SuperAdminDashboard
        user={user}
        onLogout={logout}
        onSettings={() => setScreen('settings')}
      />
    )
  }

  // ── ADMIN ──────────────────────────────────────
  if (user.role === 'admin') {
    if (screen === 'settings') return (
      <AdminAccountSettings
        user={user}
        onBack={() => setScreen('login')}
        onUpdateProfile={updateAdminProfile}
        onUpdatePassword={updatePassword}
      />
    )

    // Check approval status
    if (!user.isApproved) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-10 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
            
            <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-amber-500/5">
              <span className="text-5xl animate-pulse">⏳</span>
            </div>
            
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Pending Approval</h2>
            <div className="mb-8">
              <p className="text-slate-500 leading-relaxed">
                Welcome, <span className="text-slate-900 font-medium">{user.fullName}</span>.
              </p>
              <p className="text-slate-500 leading-relaxed mt-2 text-sm">
                Your account for the <span className="text-indigo-600 font-bold">{user.department}</span> is currently under review by the System Administrator.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm text-indigo-600 flex items-start gap-3">
                <span className="text-lg">ℹ️</span>
                <p className="text-left leading-relaxed">
                  Dashboard access is restricted until your credentials are verified. You will be able to manage student concerns once approved.
                </p>
              </div>
              
              <button
                onClick={logout}
                className="w-full py-4 px-6 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-indigo-300 text-slate-900 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 group shadow-sm"
              >
                <span>Sign out</span>
                <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">⇥</span>
              </button>
            </div>

            <p className="mt-8 text-[11px] text-slate-400 uppercase tracking-widest font-bold">
              ConcernTrack Security System
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/20">C</div>
              <span className="text-slate-900 font-bold text-sm tracking-tight hidden xs:block">ConcernTrack</span>
            </div>
            <span className="px-3 sm:px-4 py-1.5 font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-full text-[10px] sm:text-xs uppercase tracking-[0.2em] flex-shrink-0">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <span className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest hidden md:block">{user.fullName}</span>
            <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
              <button onClick={() => setScreen('settings')} className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors" title="Account Settings">
                <span className="text-lg">⚙</span>
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <button onClick={logout} className="p-1.5 text-slate-500 hover:text-red-600 transition-colors" title="Sign out">
                <span className="text-lg">⇥</span>
              </button>
            </div>
          </div>
        </nav>
        <main className="p-4 sm:p-6">
          <AdminDashboard user={user} />
        </main>
      </div>
    )
  }

  // ── STUDENT ────────────────────────────────────
  if (screen === 'settings') return (
    <StudentAccountSettings
      user={user}
      onBack={() => {
        setScreen('login');
        setActiveTab('submit');
      }}
      onUpdateProfile={updateStudentProfile}
      onUpdatePassword={updatePassword}
    />
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/20">C</div>
            <span className="text-slate-900 font-bold text-sm tracking-tight hidden xs:block">ConcernTrack</span>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'submit' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
            >Submit</button>
            <button
              onClick={() => setActiveTab('tracker')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'tracker' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
            >Tracker</button>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <span className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest hidden md:block">{user.fullName}</span>
          <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
            <button onClick={() => setScreen('settings')} className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors" title="Account Settings">
              <span className="text-lg">⚙</span>
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <button onClick={logout} className="p-1.5 text-slate-500 hover:text-red-600 transition-colors" title="Sign out">
              <span className="text-lg">⇥</span>
            </button>
          </div>
        </div>
      </nav>
      <main className="p-4 sm:p-6">
        {activeTab === 'submit' && <SubmitConcernForm user={user} />}
        {activeTab === 'tracker' && <StatusTracker user={user} />}
      </main>
    </div>
  )
}
