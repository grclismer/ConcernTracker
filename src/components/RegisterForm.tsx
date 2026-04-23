import React, { useState, useEffect } from 'react';
import { 
  InformationCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

type RegisterFormProps = {
  role: 'student' | 'admin';
  onRegister: (data: any) => Promise<void>;
  onBack: () => void;
};

type Department = 'Admission Office' | 'Accounting Office' | 'Registrar' | 'Student Affairs Office' | 'Clinic';

export default function RegisterForm({ role, onRegister, onBack }: RegisterFormProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  
  // Form State
  const [studentData, setStudentData] = useState({
    fullName: '',
    studentId: '',
    program: '',
    yearLevel: '',
    section: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [adminData, setAdminData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '' as Department | '',
    jobTitle: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState({ label: '', colorClass: 'bg-transparent', widthClass: 'w-0' });
  const [isIrregular, setIsIrregular] = useState(false);

  // Password strength logic
  useEffect(() => {
    const pw = role === 'student' ? studentData.password : adminData.password;
    if (!pw) {
      setPasswordStrength({ label: '', colorClass: 'bg-transparent', widthClass: 'w-0' });
      return;
    }

    const hasLetters = /[a-zA-Z]/.test(pw);
    const hasNumbers = /\d/.test(pw);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
    const isLongEnough = pw.length >= 8;

    if (!isLongEnough || (hasLetters && !hasNumbers && !hasSpecial)) {
      setPasswordStrength({ label: 'Weak', colorClass: 'bg-red-500', widthClass: 'w-1/3' });
    } else if (isLongEnough && hasLetters && hasNumbers && !hasSpecial) {
      setPasswordStrength({ label: 'Medium', colorClass: 'bg-amber-500', widthClass: 'w-2/3' });
    } else if (isLongEnough && hasLetters && hasNumbers && hasSpecial) {
      setPasswordStrength({ label: 'Strong', colorClass: 'bg-green-500', widthClass: 'w-full' });
    } else {
      setPasswordStrength({ label: 'Weak', colorClass: 'bg-red-500', widthClass: 'w-1/3' });
    }
  }, [studentData.password, adminData.password, role]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (role === 'student') {
      if (!studentData.fullName.trim()) newErrors.fullName = "Required";
      if (!studentData.studentId.trim()) {
        newErrors.studentId = "Required";
      } else if (!/^\d{4}-\d{2}-\d{5}$/.test(studentData.studentId)) {
        newErrors.studentId = "Format: YYYY-MM-NNNNN (e.g. 2023-07-00126)";
      }
      if (!studentData.program.trim()) newErrors.program = "Required";
      if (!studentData.yearLevel) newErrors.yearLevel = "Required";
      if (!isIrregular && !studentData.section.trim()) newErrors.section = "Required";
      if (!studentData.email.trim()) {
        newErrors.email = "Required";
      } else if (!studentData.email.includes('@')) {
        newErrors.email = "Invalid email format";
      }
      if (!studentData.password) {
        newErrors.password = "Required";
      } else if (studentData.password.length < 8) {
        newErrors.password = "Minimum 8 characters";
      }
      if (studentData.confirmPassword !== studentData.password) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    } else {
      if (!adminData.firstName.trim()) newErrors.firstName = "Required";
      if (!adminData.lastName.trim()) newErrors.lastName = "Required";
      if (!adminData.email.trim()) {
        newErrors.email = "Required";
      } else if (!adminData.email.includes('@')) {
        newErrors.email = "Invalid email format";
      }
      if (!adminData.department) newErrors.department = "Select a department";
      if (!adminData.jobTitle.trim()) newErrors.jobTitle = "Required";
      if (!adminData.password) {
        newErrors.password = "Required";
      } else if (adminData.password.length < 8) {
        newErrors.password = "Minimum 8 characters";
      }
      if (adminData.confirmPassword !== adminData.password) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrorHeader(null);

    try {
      if (role === 'student') {
        const { confirmPassword, ...registerData } = studentData;
        await onRegister(registerData);
      } else {
        const { confirmPassword, ...registerData } = adminData;
        await onRegister(registerData);
      }
      
      const successMsg = role === 'admin' 
        ? "Account created successfully! Your account is pending approval from the System Administrator."
        : "Account created successfully!";
      setToast(successMsg);
      setTimeout(() => onBack(), 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorHeader(err.message || "Registration failed");
      setLoading(false);
    }
  };

  if (role === 'admin') {
    return (
      <div className="min-h-screen py-12 px-4 bg-slate-50">
        <div className="max-w-lg mx-auto mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Staff & admin sign-up</h1>
          <p className="text-slate-500 font-medium">Create your account. Access is limited to your assigned department only.</p>
        </div>

        <div className="max-w-lg mx-auto">
          {errorHeader && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600">
              <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold">{errorHeader}</p>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">First name</label>
                  <input 
                    type="text"
                    value={adminData.firstName}
                    onChange={(e) => setAdminData({...adminData, firstName: e.target.value})}
                    placeholder="e.g. Maria"
                    disabled={loading}
                    className={`w-full bg-slate-50 border ${errors.firstName ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Last name</label>
                  <input 
                    type="text"
                    value={adminData.lastName}
                    onChange={(e) => setAdminData({...adminData, lastName: e.target.value})}
                    placeholder="e.g. Santos"
                    disabled={loading}
                    className={`w-full bg-slate-50 border ${errors.lastName ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Institutional email</label>
                <input 
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData({...adminData, email: e.target.value})}
                  placeholder="m.santos@university.edu.ph"
                  disabled={loading}
                  className={`w-full bg-slate-50 border ${errors.email ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Department</label>
                <div className="relative">
                  <select 
                    value={adminData.department}
                    onChange={(e) => setAdminData({...adminData, department: e.target.value as Department})}
                    disabled={loading}
                    className={`w-full bg-slate-50 border ${errors.department ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none disabled:opacity-50 shadow-sm`}
                  >
                    <option value="" disabled>Select your department...</option>
                    <option value="Admission Office">Admission Office</option>
                    <option value="Accounting Office">Accounting Office</option>
                    <option value="Registrar">Registrar</option>
                    <option value="Student Affairs Office">Student Affairs Office</option>
                    <option value="Clinic">Clinic</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {errors.department && <p className="text-red-500 text-xs mt-1 font-medium">{errors.department}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Position / Job title</label>
                <input 
                  type="text"
                  value={adminData.jobTitle}
                  onChange={(e) => setAdminData({...adminData, jobTitle: e.target.value})}
                  placeholder="e.g. Admission Officer, Cashier Staff"
                  disabled={loading}
                  className={`w-full bg-slate-50 border ${errors.jobTitle ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
                />
                {errors.jobTitle && <p className="text-red-500 text-xs mt-1 font-medium">{errors.jobTitle}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Password</label>
                  <input 
                    type="password"
                    value={adminData.password}
                    onChange={(e) => setAdminData({...adminData, password: e.target.value})}
                    placeholder="••••••••"
                    disabled={loading}
                    className={`w-full bg-slate-50 border ${errors.password ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Confirm password</label>
                  <input 
                    type="password"
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData({...adminData, confirmPassword: e.target.value})}
                    placeholder="••••••••"
                    disabled={loading}
                    className={`w-full bg-slate-50 border ${errors.confirmPassword ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword}</p>}
                </div>
              </div>

              {adminData.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${passwordStrength.widthClass} ${passwordStrength.colorClass}`}></div>
                  </div>
                  <span className={`text-xs font-medium text-right min-w-[50px] ${passwordStrength.colorClass.replace('bg-', 'text-')}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}

              <div className="flex items-start gap-2 pt-2">
                <InformationCircleIcon className="w-4 h-4 text-slate-400 mt-0.5" />
                <p className="text-xs text-slate-400 font-medium">Account access requires approval from the System Admin before you can log in.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8 pt-4">
                <button 
                  type="button"
                  onClick={onBack}
                  disabled={loading}
                  className="px-4 py-2.5 border border-slate-300 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 rounded-lg font-bold transition-all disabled:opacity-50 shadow-sm"
                >
                  Back to login
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : <>Create account <ArrowRightIcon className="w-4 h-4" /></>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-green-600 text-white text-sm px-4 py-3 rounded-lg shadow-lg z-50 transition-opacity animate-in fade-in slide-in-from-bottom-4">
            {toast}
          </div>
        )}
      </div>
    );
  }

  // Student Register View
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-900">Create your account</h2>

        {errorHeader && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600">
            <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{errorHeader}</p>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Full name</label>
            <input 
              value={studentData.fullName}
              onChange={(e) => setStudentData({...studentData, fullName: e.target.value})}
              type="text" 
              placeholder="Juan dela Cruz" 
              disabled={loading}
              className={`w-full bg-slate-50 border ${errors.fullName ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
            />
            {errors.fullName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.fullName}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Student ID</label>
            <input 
              value={studentData.studentId}
              onChange={(e) => setStudentData({...studentData, studentId: e.target.value})}
              type="text" 
              placeholder="2023-07-00126" 
              disabled={loading}
              className={`w-full bg-slate-50 border ${errors.studentId ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
            />
            {errors.studentId && <p className="text-red-500 text-xs mt-1 font-medium">{errors.studentId}</p>}
          </div>

          <div className="flex items-center gap-2 pb-2">
            <input 
              type="checkbox"
              id="irregular-toggle"
              checked={isIrregular}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsIrregular(checked);
                setStudentData({
                  ...studentData,
                  section: checked ? 'Irregular' : ''
                });
              }}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="irregular-toggle" className="text-sm font-bold text-slate-700 cursor-pointer">
              I am an Irregular Student
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-500 mb-1">Program</label>
              <input 
                value={studentData.program}
                onChange={(e) => setStudentData({...studentData, program: e.target.value})}
                type="text" 
                placeholder="e.g. BSIT" 
                disabled={loading}
                className={`w-full bg-slate-50 border ${errors.program ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
              />
              {errors.program && <p className="text-red-500 text-xs mt-1 font-medium">{errors.program}</p>}
            </div>

            <div className={`md:col-span-1 grid ${isIrregular ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              <div className={isIrregular ? 'w-full' : ''}>
                <label className="block text-sm font-medium text-slate-500 mb-1">Year Level</label>
                <select
                  value={studentData.yearLevel}
                  onChange={(e) => setStudentData({...studentData, yearLevel: e.target.value})}
                  disabled={loading}
                  className={`w-full bg-slate-50 border ${errors.yearLevel ? 'border-red-400' : 'border-slate-200'} rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none disabled:opacity-50 shadow-sm`}
                >
                  <option value="">Year...</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              
              {!isIrregular && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Section</label>
                  <input 
                    value={studentData.section}
                    onChange={(e) => setStudentData({...studentData, section: e.target.value})}
                    type="text" 
                    placeholder="e.g. A" 
                    disabled={loading}
                    className={`w-full bg-slate-50 border ${errors.section ? 'border-red-400' : 'border-slate-200'} rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center disabled:opacity-50 shadow-sm`}
                  />
                </div>
              )}
            </div>
            {(errors.yearLevel || errors.section) && (
              <div className="md:col-span-2">
                <p className="text-red-500 text-xs font-medium">{errors.yearLevel || errors.section}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Email address</label>
            <input 
              value={studentData.email}
              onChange={(e) => setStudentData({...studentData, email: e.target.value})}
              type="email" 
              placeholder="juan@university.edu.ph" 
              disabled={loading}
              className={`w-full bg-slate-50 border ${errors.email ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Password</label>
            <input 
              value={studentData.password}
              onChange={(e) => setStudentData({...studentData, password: e.target.value})}
              type="password" 
              placeholder="••••••••"
              disabled={loading}
              className={`w-full bg-slate-50 border ${errors.password ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
            />
            {studentData.password && (
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${passwordStrength.widthClass} ${passwordStrength.colorClass}`}></div>
                </div>
                <span className={`text-xs font-bold min-w-[50px] text-right ${passwordStrength.colorClass.replace('bg-', 'text-')}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Confirm Password</label>
            <input 
              value={studentData.confirmPassword}
              onChange={(e) => setStudentData({...studentData, confirmPassword: e.target.value})}
              type="password" 
              placeholder="••••••••"
              disabled={loading}
              className={`w-full bg-slate-50 border ${errors.confirmPassword ? 'border-red-400' : 'border-slate-200'} rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm`}
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword}</p>}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-8 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={onBack}
            disabled={loading}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50 font-bold"
          >
            <ArrowLeftIcon className="w-4 h-4" /> Already have an account? Sign in
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white text-sm px-4 py-3 rounded-lg shadow-lg z-50 transition-opacity animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}
    </div>
  );
}
