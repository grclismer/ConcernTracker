import React, { useState, useEffect } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ label: '', colorClass: 'bg-transparent', widthClass: 'w-0' });

  // Initialize the reset session when component loads
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Parse the URL hash to extract the access token and refresh token from the reset link
        // Example URL: http://localhost:5174/reset-password#access_token=...&type=recovery&refresh_token=...
        const hash = window.location.hash.slice(1); // Remove the # character
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          setError('This reset link is invalid or has expired. Please request a new one.');
          return;
        }

        // setSession() activates the access token and refresh token with Supabase
        // This authenticates the user using the recovery token from the reset email
        // The user is now logged in temporarily (with limited permissions) to reset their password
        // This is necessary before we can call updateUser() to change the password
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('This reset link has expired. Please request a new reset link.');
          return;
        }

        // Session is now active and ready for password reset
        setSessionReady(true);
      } catch (err: any) {
        console.error('Session initialization error:', err);
        setError('This reset link has expired. Please request a new reset link.');
      }
    };

    initializeSession();
  }, []);

  // Calculate password strength as user types
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength({ label: '', colorClass: 'bg-transparent', widthClass: 'w-0' });
      return;
    }

    const hasLetters = /[a-zA-Z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
    const isLongEnough = newPassword.length >= 8;

    if (!isLongEnough || (hasLetters && !hasNumbers && !hasSpecial)) {
      setPasswordStrength({ label: 'Weak', colorClass: 'bg-red-500', widthClass: 'w-1/3' });
    } else if (isLongEnough && hasLetters && hasNumbers && !hasSpecial) {
      setPasswordStrength({ label: 'Medium', colorClass: 'bg-amber-500', widthClass: 'w-2/3' });
    } else if (isLongEnough && hasLetters && hasNumbers && hasSpecial) {
      setPasswordStrength({ label: 'Strong', colorClass: 'bg-green-500', widthClass: 'w-full' });
    } else {
      setPasswordStrength({ label: 'Weak', colorClass: 'bg-red-500', widthClass: 'w-1/3' });
    }
  }, [newPassword]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form inputs
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // updateUser() changes the password for the currently authenticated user
      // We can call this now because setSession() has already authenticated us with the recovery token
      // This updates the user's password in the Supabase Auth system
      // After success, the old password no longer works and only the new password can be used to log in
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess(true);

      // Redirect user to login after 2 seconds so they can log in with their new password
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 2000);

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to reset password. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Show error state if session initialization failed
  if (!sessionReady && error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-8 relative overflow-hidden">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center border border-red-100 shadow-sm">
              <ExclamationCircleIcon className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Reset Link Expired</h2>
          <p className="text-slate-500 text-sm text-center mb-6">
            {error}
          </p>

          <button
            onClick={() => (window.location.href = window.location.origin)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            Go back to login
          </button>
        </div>
      </div>
    );
  }

  // Show success state after password is updated
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-8 relative overflow-hidden">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-100 shadow-sm">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Password Updated!</h2>
          <p className="text-slate-500 text-sm text-center mb-2">
            Your password has been successfully reset.
          </p>
          <p className="text-xs text-slate-400 text-center font-medium italic">
            Taking you back to login... Please wait.
          </p>

          <div className="mt-8 flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while session is being initialized
  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-8 relative overflow-hidden">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verifying reset link...</h2>
            <p className="text-slate-500 text-sm">
              Please wait while we activate your password reset.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show the password reset form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-8 relative overflow-hidden">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Set a new password</h2>
          <p className="text-slate-500 text-sm">
            Choose a strong password for your account.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 mb-4">
              <ExclamationCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
              disabled={loading}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm"
            />

            {newPassword && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${passwordStrength.widthClass} ${passwordStrength.colorClass}`}></div>
                </div>
                <span className={`text-[10px] font-bold uppercase min-w-[50px] text-right ${passwordStrength.colorClass.replace('bg-', 'text-')}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
              disabled={loading}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full mt-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Resetting...</span>
              </>
            ) : (
              'Reset password'
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-6 uppercase tracking-widest font-black">
          ConcernTrack Security System
        </p>
      </div>
    </div>
  );
}
