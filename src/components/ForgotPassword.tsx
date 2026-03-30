import React, { useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

type ForgotPasswordProps = {
  role: 'student' | 'admin';
  onBack: () => void;
};

export default function ForgotPassword({ role, onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      /**
       * SUPABASE PASSWORD RESET
       * This function sends a password reset email to the user:
       * 
       * resetPasswordForEmail(email, options):
       * - Sends a reset link to the provided email address
       * - The link contains an access token valid for 1 hour
       * 
       * redirectTo parameter:
       * - Specifies where the user lands after clicking the reset link in their email
       * - Must match the redirect URL configured in Supabase auth settings
       * - In this case: http://localhost:5174/reset-password
       * 
       * What happens next:
       * - The user checks their email and clicks the reset link
       * - They are redirected to /reset-password with #access_token= in the URL
       * - The ResetPassword component detects this token and shows the password form
       * - User enters new password and submits
       * - Their password is updated in Supabase auth
       */
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:5174/reset-password'
      });

      if (error) throw error;

      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to send password reset email. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f1117]">
      <div className="w-full max-w-md bg-[#1a1d27] border border-[#2a2d3a] rounded-xl shadow-2xl p-8 relative overflow-hidden">
        
        {!success ? (
          <form onSubmit={handleSendResetLink} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Forgot your password?</h2>
              <p className="text-[#9ca3af] text-sm">
                Enter your registered email address and we'll send you a link to reset your password.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="your@email.com"
                  disabled={loading}
                  className={`w-full bg-[#0f1117] border ${error ? 'border-red-400' : 'border-[#2a2d3a]'} rounded-lg px-4 py-2.5 text-white placeholder-[#4b5563] focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all`}
                />
                {error && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <ExclamationCircleIcon className="w-3.5 h-3.5" /> {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>Send reset link <ArrowRightIcon className="w-4 h-4" /></>
                )}
              </button>

              <button
                type="button"
                onClick={onBack}
                className="w-full text-sm text-[#9ca3af] hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" /> Back to login
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-[#9ca3af] text-sm">
                We sent a password reset link to <span className="text-white font-medium">{email}</span>. Click the link in the email to reset your password.
              </p>
            </div>

            <p className="text-xs text-[#4b5563]">
              The reset link will expire in 1 hour for security reasons.
            </p>

            <button
              onClick={onBack}
              className="w-full py-2.5 bg-[#0f1117] border border-[#2a2d3a] hover:bg-[#2a2d3a] text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" /> Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
