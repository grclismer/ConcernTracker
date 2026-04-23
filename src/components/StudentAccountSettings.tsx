import { useState, useEffect } from 'react'
import type { CurrentUser } from '../hooks/useAuth'
import ChangePasswordSection from './ChangePasswordSection'
import StudentConcernHistory from './StudentConcernHistory'

interface StudentAccountSettingsProps {
  user: CurrentUser
  onBack: () => void
  onUpdateProfile: (data: any) => Promise<void>
  onUpdatePassword: (newPassword: string) => Promise<void>
}

export default function StudentAccountSettings({ user, onBack, onUpdateProfile, onUpdatePassword }: StudentAccountSettingsProps) {
  const [fullName, setFullName] = useState('')
  const [program, setProgram] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [section, setSection] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isIrregular, setIsIrregular] = useState(false)

  useEffect(() => {
    setFullName(user.fullName || '')
    setProgram(user.program || '')
    setYearLevel(user.yearLevel || '')
    setSection(user.section || '')
    setEmail(user.email || '')
    setIsIrregular(user.section === 'Irregular')
  }, [user])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), type === 'success' ? 3000 : 4000)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onUpdateProfile({ fullName, program, yearLevel, section, email })
      showToast('Profile updated successfully', 'success')
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 text-white text-sm px-6 py-4 rounded-2xl shadow-2xl z-50 transition-all duration-500 animate-in slide-in-from-right-full ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <div className="flex items-center gap-3">
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <button onClick={onBack} className="text-slate-500 hover:text-slate-900 mb-2 flex items-center gap-2 transition-colors text-[10px] font-black uppercase tracking-widest">
            <span>←</span> Back to Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                👤
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Profile Information</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                  />
                  <p className="mt-2 text-[10px] text-slate-400 italic">Changing your email will require verification.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">Program</label>
                  <input
                    type="text"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    placeholder="e.g. BSIT"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={isIrregular}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsIrregular(checked);
                        setSection(checked ? 'Irregular' : '');
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                      I am an Irregular Student
                    </span>
                  </label>
                  <p className="mt-1.5 text-[10px] text-slate-400 font-medium ml-6">Irregular students do not have a permanent assigned section.</p>
                </div>

                <div className={`md:col-span-2 grid ${isIrregular ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">Year Level</label>
                    <select
                      value={yearLevel}
                      onChange={(e) => setYearLevel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none shadow-sm font-bold"
                    >
                      <option value="">Select...</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  
                  {!isIrregular && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">Section</label>
                      <input
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="e.g. A"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">Student ID</label>
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-slate-400 cursor-not-allowed">
                    {user.studentId}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400 italic">Student ID cannot be changed.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Security / Sidebar */}
        <div className="space-y-6">
          <ChangePasswordSection 
            onUpdatePassword={onUpdatePassword}
            onSuccess={() => showToast('Password updated successfully', 'success')}
            onError={(err) => showToast(err, 'error')}
          />
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center shadow-sm">
            <h4 className="text-sm font-bold text-indigo-700 mb-2">Need help?</h4>
            <p className="text-xs text-indigo-600/60 leading-relaxed">
              Contact the Registrar's Office for Student ID or core academic record corrections.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
