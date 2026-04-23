import React, { useState, useEffect } from 'react';
import { 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  AcademicCapIcon,
  BanknotesIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useConcerns } from '../hooks/useConcerns';
import type { ConcernCategory } from '../hooks/useConcerns';
import type { CurrentUser } from '../hooks/useAuth';

interface SubmitConcernFormProps {
  user: CurrentUser;
}

export default function SubmitConcernForm({ user }: SubmitConcernFormProps) {
  const { submitConcern, loading, error: submitError, uploadFile } = useConcerns();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ConcernCategory | ''>('');
  const [subCategory, setSubCategory] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [email, setEmail] = useState(user.email);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('concerntrack_draft');
    if (savedDraft) {
      setShowDraftBanner(true);
    }
  }, []);

  // Success message auto-hide
  useEffect(() => {
    if (successId) {
      const timer = setTimeout(() => setSuccessId(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [successId]);

  const handleRestoreDraft = () => {
    const savedDraft = localStorage.getItem('concerntrack_draft');
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      setTitle(draft.title || '');
      setDescription(draft.description || '');
      setCategory(draft.category || '');
      setSubCategory(draft.subCategory || '');
      setIsAnonymous(draft.isAnonymous || false);
      setEmail(draft.email || user.email);
      setFileUrl(draft.fileUrl || null);
    }
    setShowDraftBanner(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('concerntrack_draft');
    setShowDraftBanner(false);
  };

  const handleSaveDraft = () => {
    const draft = { title, description, category, subCategory, isAnonymous, email, fileUrl };
    localStorage.setItem('concerntrack_draft', JSON.stringify(draft));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!category) newErrors.category = "Please select a category";
    if (title.length < 5) newErrors.title = "Please enter a brief title (min 5 chars)";
    if (description.length < 20) newErrors.description = "Please describe your concern in detail (min 20 characters)";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) newErrors.email = "Please enter a valid email address";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const concernNumber = await submitConcern({
        title,
        description,
        category: category as ConcernCategory,
        subCategory: subCategory || undefined,
        isAnonymous,
        studentId: user.id,
        studentName: user.fullName,
        studentNumber: user.studentId || 'N/A',
        program: user.program || 'N/A',
        email,
        fileUrl: fileUrl || undefined
      });

      setSuccessId(concernNumber);
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setSubCategory('');
      setIsAnonymous(false);
      setEmail(user.email);
      setFileUrl(null);
      localStorage.removeItem('concerntrack_draft');
    } catch (err) {
      console.error('Submission failed:', err);
    }
  };

  const subCategories: Record<string, string[]> = {
    Academic: [
      "Grade Appeal", "Section Transfer", "Subject Conflict", "Enrollment Issue", 
      "TOR / Records Request", "Missing Grade", "Curriculum / Prerequisite Issue", 
      "Teacher Concern", "Other Academic Concern"
    ],
    Financial: [
      "Tuition Fee Dispute", "Scholarship / Grant Issue", "Payment Not Credited", 
      "Refund Request", "Miscellaneous Fee Concern", "Receipt / OR Issue", 
      "Other Financial Concern"
    ],
    Welfare: [
      "Mental Health Support", "Bullying / Harassment", "Physical Safety Concern", 
      "Discrimination", "Medical / Health Issue", "Personal Crisis", 
      "Unsafe Environment", "Other Welfare Concern"
    ]
  };

  const routingInfo: Record<string, string> = {
    Academic: "Registrar / Department Head",
    Financial: "Finance Office / Cashier",
    Welfare: "Student Affairs Office"
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-8">
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2 text-slate-900">Submit a concern</h2>
          <p className="text-slate-500">Your concern will be routed to the correct department automatically.</p>
        </div>

        {showDraftBanner && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-indigo-700 text-sm font-medium">You have a saved draft. Would you like to restore it?</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRestoreDraft} className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm">Restore</button>
              <button onClick={handleDiscardDraft} className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">Discard</button>
            </div>
          </div>
        )}

        {successId && (
          <div className="mb-8 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start space-x-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-700 font-medium">Your concern has been submitted successfully!</p>
              <p className="text-green-600 text-sm mt-1">Reference ID: <span className="font-bold">{successId}</span>. You can track your concern status using this ID in the Status Tracker tab.</p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{submitError}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!isAnonymous && (
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Full name</label>
                <input 
                  type="text" 
                  value={user.fullName}
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 opacity-60 cursor-not-allowed"
                />
              </div>
            )}
            <div className={isAnonymous ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium text-slate-500 mb-1">Student ID</label>
              <input 
                type="text" 
                value={user.studentId || 'N/A'}
                readOnly
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 opacity-60 cursor-not-allowed"
              />
            </div>
          </div>

                    {/* Reading Student Info from Profile */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-5 border rounded-xl mb-6 transition-all duration-300 ${isAnonymous ? 'bg-indigo-50 border-indigo-100 opacity-70' : 'bg-slate-50 border-slate-200'}`}>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <div className="text-slate-900 font-bold bg-white px-3 py-2 rounded-lg border border-slate-100 text-sm shadow-sm">
                  {isAnonymous ? 'ANONYMOUS' : user.fullName}
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Student ID</label>
                <div className="text-slate-900 font-bold bg-white px-3 py-2 rounded-lg border border-slate-100 text-sm shadow-sm">
                  {isAnonymous ? 'HIDDEN' : user.studentId}
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
                <div className="text-slate-900 font-bold bg-white px-3 py-2 rounded-lg border border-slate-100 text-sm truncate shadow-sm">
                  {isAnonymous ? 'MASKED' : user.email}
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Program</label>
                <div className="text-slate-900 font-bold bg-white px-3 py-2 rounded-lg border border-slate-100 text-sm shadow-sm">
                  {isAnonymous ? '---' : user.program}
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Year Level</label>
                <div className="text-slate-900 font-bold bg-white px-3 py-2 rounded-lg border border-slate-100 text-sm shadow-sm">
                  {isAnonymous ? '---' : (user.yearLevel ? `${user.yearLevel}${user.yearLevel === '1' ? 'st' : user.yearLevel === '2' ? 'nd' : user.yearLevel === '3' ? 'rd' : 'th'} Year` : 'N/A')}
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Section</label>
                <div className="text-slate-900 font-bold bg-white px-3 py-2 rounded-lg border border-slate-100 text-sm shadow-sm">
                  {isAnonymous ? '---' : (user.section || 'N/A')}
                </div>
              </div>
              {isAnonymous && (
                <div className="md:col-span-3 mt-2">
                  <p className="text-[10px] text-indigo-600 font-medium italic">✨ Your identity will be hidden from the department staff. Admin retains a record for audit only.</p>
                </div>
              )}
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Email address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="For notifications"
                className={`w-full bg-white border ${errors.email ? 'border-red-500' : 'border-slate-200'} rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-4">Category</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Academic Card */}
                <div 
                  onClick={() => { setCategory('Academic'); setSubCategory(''); }}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-all shadow-sm ${category === 'Academic' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                      <AcademicCapIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-bold text-slate-900">Academic</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">Concerns about grades, sections, subjects, enrollment, records, and teacher issues.</p>
                </div>

                {/* Financial Card */}
                <div 
                  onClick={() => { setCategory('Financial'); setSubCategory(''); }}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-all shadow-sm ${category === 'Financial' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                      <BanknotesIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="font-bold text-slate-900">Financial</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">Concerns about tuition fees, scholarships, payments, refunds, and receipts.</p>
                </div>

                {/* Welfare Card */}
                <div 
                  onClick={() => { setCategory('Welfare'); setSubCategory(''); }}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-all shadow-sm ${category === 'Welfare' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                      <UserGroupIcon className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="font-bold text-slate-900">Welfare</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">Concerns about mental health, bullying, harassment, safety, and student well-being.</p>
                </div>
              </div>
              
              {category && (
                <p className="text-xs text-slate-500 mt-3">
                  → Will be routed to: <span className="text-indigo-600 font-bold">
                    {category === 'Welfare' && subCategory === 'Medical / Health Issue' 
                      ? 'Clinic' 
                      : routingInfo[category]}
                  </span>
                </p>
              )}
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>

            {category && (
              <div className="animate-in fade-in duration-200">
                <label className="block text-sm font-medium text-slate-500 mb-1">Specific concern type (optional)</label>
                <select 
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors appearance-none shadow-sm"
                >
                  <option value="">Select specific type...</option>
                  {subCategories[category].map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Concern title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary"
                className={`w-full bg-white border ${errors.title ? 'border-red-500' : 'border-slate-200'} rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm`}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Detailed description</label>
            <textarea 
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your concern in detail..."
              className={`w-full bg-white border ${errors.description ? 'border-red-500' : 'border-slate-200'} rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-y shadow-sm`}
            ></textarea>
            <div className="flex justify-between mt-1">
              {errors.description ? <p className="text-red-500 text-xs">{errors.description}</p> : <div />}
              <span className={`text-xs font-bold ${description.length > 490 ? 'text-red-600' : 'text-slate-400'}`}>
                {description.length} / 500
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-500">
              Attachments <span className="text-[10px] uppercase tracking-widest ml-2 text-slate-400">(Image, PDF, DOCX)</span>
            </label>
                      <div 
              className={`relative border-2 border-dashed rounded-2xl p-8 transition-all group flex flex-col items-center justify-center text-center overflow-hidden ${
                fileUrl ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-indigo-300 bg-slate-50'
              }`}
            >
              {/* File name in top left */}
              {fileName && (
                <div className="absolute top-3 left-4 flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[150px]">
                    {fileName}
                  </span>
                </div>
              )}

              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 ${fileUrl ? 'hidden' : ''}`}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      setFileName(file.name);
                      const url = await uploadFile(file);
                      setFileUrl(url);
                    } catch (err) {
                      console.error('Upload failed:', err);
                      setFileName(null);
                    }
                  }
                }}
              />
              
              <div className="relative z-10">
                {fileUrl ? (
                  <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto shadow-sm">
                      <CheckCircleIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-slate-900 font-bold mb-1">File Uploaded!</p>
                    <p className="text-green-600 text-xs font-bold uppercase tracking-tight">Attachment ready for submission</p>
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
                        setFileUrl(null); 
                        setFileName(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="mt-4 text-xs text-red-600 hover:text-red-700 font-black uppercase tracking-widest z-30 relative py-1 px-3 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 transition-all active:scale-95 shadow-sm"
                    >
                      Remove File
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300">
                      <CloudArrowUpIcon className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <p className="text-slate-900 font-bold mb-1">Click or drag to upload</p>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.1em]">Max size 5MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-4 pt-4 border-t border-slate-100">
            <div className="flex items-center h-5 mt-1">
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white ${
                  isAnonymous ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <div 
                  className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
                    isAnonymous ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="text-sm">
              <label 
                onClick={() => setIsAnonymous(!isAnonymous)} 
                className="font-bold text-slate-900 select-none cursor-pointer inline-block"
              >
                Submit anonymously
              </label>
              <p className="text-slate-500 mt-1 leading-relaxed text-xs">Your name is hidden from department staff. Admin retains a sealed record for audit purposes only.</p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-4">
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto">
              {draftSaved && <span className="text-green-600 text-xs font-bold uppercase tracking-widest mr-4">Draft saved!</span>}
              <button 
                type="button"
                onClick={handleSaveDraft}
                className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-sm transition-all active:scale-95 w-full sm:w-auto shadow-sm"
                disabled={loading}
              >
                Save draft
              </button>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center active:scale-95 w-full sm:w-auto"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  Submit concern 
                  <span className="ml-2">→</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
