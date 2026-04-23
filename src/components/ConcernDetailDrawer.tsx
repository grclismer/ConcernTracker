import { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ChevronRightIcon, 
  PaperAirplaneIcon, 
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  TagIcon,
  NoSymbolIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';
import FileViewer from './FileViewer';
import { useConcerns } from '../hooks/useConcerns';
import type { Concern, ConcernStatus, AuditEntry } from '../hooks/useConcerns';
import type { CurrentUser } from '../hooks/useAuth';
import { format } from 'date-fns';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  concern: Concern | null;
  currentUser: CurrentUser;
}

export default function ConcernDetailDrawer({ isOpen, onClose, concern, currentUser }: DrawerProps) {
  const [noteText, setNoteText] = useState('');
  const [statusUpdated, setStatusUpdated] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { updateConcernStatus, addAuditNote, loading } = useConcerns();

  // Clear states when drawer opens/closes or concern changes
  useEffect(() => {
    setNoteText('');
    setStatusUpdated(null);
    setLocalError(null);
    setAiSuggesting(false);
    setAiError(null);
  }, [isOpen, concern?.id]);

  const [showFile, setShowFile] = useState<string | null>(null);

  if (!isOpen || !concern) return null;

  const handleStatusUpdate = async (newStatus: ConcernStatus) => {
    setLocalError(null);
    try {
      await updateConcernStatus(concern.id, newStatus, currentUser.fullName);
      setStatusUpdated(newStatus);
      setTimeout(() => {
        setStatusUpdated(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to update status');
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setLocalError(null);
    try {
      await addAuditNote(concern.id, currentUser.fullName, noteText.trim());
      setNoteText('');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to add note');
    }
  };

  const suggestReply = async () => {
    if (!concern) return

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim()
    if (!apiKey || apiKey === 'your_actual_key_here') {
      setAiError('Gemini API key not found or is still using the placeholder in your .env file.')
      return
    }

    setAiSuggesting(true)
    setAiError(null)

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash'
    ]

    const statusContext: Record<string, string> = {
      Submitted: 'The concern has just been submitted and is under initial review.',
      Routed: `The concern has been routed to the ${concern.department} and is awaiting action.`,
      Read: `The concern has been read and reviewed by the ${concern.department} staff.`,
      Screened: `The concern has been screened and is currently being processed by the ${concern.department}.`,
      Escalated: 'The concern has been escalated to a supervisor due to urgency or SLA breach.',
      Resolved: 'The concern has been resolved by the department.'
    }

    const adviceByCategory: Record<string, string> = {
      Academic: 'Advise the student to prepare any relevant documents such as grades, class records, or enrollment forms. Mention they can follow up with the Registrar or their Program Head directly.',
      Financial: 'Advise the student to keep their official receipts, scholarship documents, or payment confirmations ready for verification. Mention the Finance Office operating hours if relevant.',
      Welfare: 'Assure the student that their concern is being handled with full confidentiality and care. Encourage them to reach out to the Guidance Office or Student Affairs for immediate support if needed.'
    }

    const prompt = `You are a professional staff member from ${concern.department} at a university in the Philippines. Write a meaningful, helpful, and empathetic official response to a student concern.

CONCERN DETAILS:
- Title: ${concern.title}
- Category: ${concern.category}
- Specific Type: ${concern.sub_category || 'General'}
- Department Handling: ${concern.department}
- Student Description: "${concern.description}"
- Current Status: ${concern.status}
- Status Context: ${statusContext[concern.status] || ''}

ADVICE TO INCLUDE:
${adviceByCategory[concern.category] || 'Advise the student on the next steps they should take.'}

WRITE A RESPONSE THAT:
1. Opens by directly acknowledging the specific concern by title — do NOT use generic openings like "Thank you for reaching out"
2. Clearly states the current status of their concern in plain language (e.g. "We have read your concern regarding [title] and it is currently being reviewed by our team.")
3. Gives specific practical advice relevant to their category (Academic/Financial/Welfare)
4. States a realistic next step or expected timeline (e.g. "You can expect a follow-up within 3 to 5 business days.")
5. Ends with an encouraging and professional closing that invites the student to follow up if needed

FORMAT:
- 4 to 5 sentences total
- Professional but warm and human tone
- Write in clear English
- Do not use bullet points — write in paragraph form
- Do not make up specific names, amounts, or exact dates
- Do not repeat the same sentence twice

IMPORTANT: Always write a COMPLETE response. Never cut off mid-sentence. Complete all 4-5 sentences fully before stopping.`

    let lastError = null

    for (const modelId of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048, // Increased for safety
              },
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
              ]
            })
          }
        )

        if (!response.ok) {
          const errData = await response.json()
          const msg = errData?.error?.message || ''
          // If quota reached or model not found, try next model
          if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('not found') || response.status === 404 || response.status === 429) {
            console.warn(`Model ${modelId} failed, trying next...`, msg)
            continue
          }
          throw new Error(msg || 'Failed to generate suggestion')
        }

        const data = await response.json()
        const candidate = data.candidates?.[0]
        const finishReason = candidate?.finishReason

        // If it stopped due to safety or tokens, we might want to try a DIFFERENT model to see if it handles it better
        if (finishReason && finishReason !== 'STOP') {
          console.warn(`Model ${modelId} stopped early (${finishReason}), trying next...`)
          continue
        }

        const suggestion = candidate?.content?.parts?.map((p: any) => p.text).join('') || ''
        if (!suggestion) continue

        setNoteText(suggestion.trim())
        setAiSuggesting(false)
        return // SUCCESS! Exit the function
      } catch (err: any) {
        lastError = err.message
        console.error(`Error with model ${modelId}:`, err)
      }
    }

    // If we get here, all models failed
    setAiError('Our AI models are temporarily reaching their limits. Please wait 1 to 2 minutes before trying again, or proceed with a manual note in the meantime. We apologize for the inconvenience.')
    setAiSuggesting(false)
  }


  const nextActions: Record<string, ConcernStatus[]> = {
    Submitted: ['Read', 'Escalated'],
    Routed: ['Read', 'Escalated'],
    Read: ['Screened', 'Escalated'],
    Screened: ['Resolved', 'Escalated'],
    Escalated: ['Resolved'],
    Resolved: []
  };

  const currentAvailableActions = nextActions[concern.status] || [];
  const isEscalated = concern.status === 'Escalated';
  const isResolved = concern.status === 'Resolved';

  const slaDays = Math.floor((Date.now() - new Date(concern.submitted_at).getTime()) / (1000 * 60 * 60 * 24));

  const getDotColor = (action: string) => {
    if (action.includes('Escalated')) return 'bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]';
    if (action.includes('Resolved')) return 'bg-green-500';
    if (action.includes('Read') || action.includes('Screened')) return 'bg-amber-500';
    if (action.includes('Submitted') || action.includes('Routed')) return 'bg-blue-500';
    return 'bg-gray-400'; // Notes or others
  };

  const getActionButtonStyle = (action: string) => {
    switch (action) {
      case 'Read': return 'border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 shadow-sm';
      case 'Screened': return 'border-amber-200 text-amber-600 bg-amber-50/50 hover:bg-amber-50 shadow-sm';
      case 'Resolved': return 'border-green-200 text-green-600 bg-green-50/50 hover:bg-green-50 shadow-sm';
      case 'Escalated': return 'border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 shadow-sm';
      default: return 'border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm';
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 transition-opacity"
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 right-0 w-full md:w-[480px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >

        {/* Header */}
        <div className="flex flex-col p-6 border-b border-slate-100 relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          <span className="text-slate-400 text-sm font-bold tracking-widest">{concern.concern_number}</span>
          <div className="flex items-center gap-2 mt-1 pr-8">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{concern.title}</h2>
            <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-bold">
              ✨ AI-assisted
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Status/Success Messages */}
          {statusUpdated && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <p className="text-green-700 text-sm font-bold">Status updated to {statusUpdated}</p>
            </div>
          )}

          {localError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{localError}</p>
            </div>
          )}

          {/* Badges Row */}
          <div className="flex flex-wrap gap-2 mb-1">
            <span className="px-2.5 py-1 text-xs font-bold rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest">{concern.category}</span>
            <span className="px-2.5 py-1 text-xs font-bold rounded bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-widest">{concern.department}</span>
            <span className={`px-2.5 py-1 text-xs font-bold rounded border flex items-center gap-1.5 uppercase tracking-widest ${isEscalated ? 'bg-red-50 text-red-600 border-red-100' :
              isResolved ? 'bg-green-50 text-green-600 border-green-100' :
                'bg-indigo-50 text-indigo-600 border-indigo-100'
              }`}>
              {(isEscalated || isResolved) && <span className={`w-1.5 h-1.5 rounded-full ${isEscalated ? 'bg-red-600' : 'bg-green-600'}`}></span>}
              {concern.status}
            </span>
          </div>
          {concern.sub_category && (
            <p className="text-xs text-slate-400 mb-6 px-1 italic">Type: {concern.sub_category}</p>
          )}

          {/* SLA Banner */}
          {!isResolved && (
            <div className={`mb-6 px-4 py-2 border rounded-lg text-sm font-bold ${slaDays > 5 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
              Open for {slaDays} days · {slaDays > 5 ? 'SLA Breached' : 'Within SLA'}
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
              {concern.description}
            </p>
          </div>

          {/* Student Info */}
          <div className="mb-6 pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Submitted by: <span className="text-slate-900 font-bold">{concern.student_name} {concern.student_name !== 'Anonymous' && `(${concern.student_number})`}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1 italic font-medium">
              Program: {concern.program}
            </p>
          </div>

          {/* Attachments Section */}
          {concern.file_url && (
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Attachments</h4>
              <button 
                onClick={() => setShowFile(concern.file_url!)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 group transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100">
                    <PaperClipIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
                      {concern.file_url.split('/').pop()?.split('-').slice(1).join('-') || 'Attachment'}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Click to view file</p>
                  </div>
                </div>
                <div className="w-8 h-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all shadow-sm">
                  <ChevronRightIcon className="w-4 h-4" />
                </div>
              </button>
            </div>
          )}

          <hr className="border-slate-100 my-6" />

          {/* Status Actions */}
          <div className="mb-8">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Update status:</h4>
            {isResolved ? (
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <p className="text-green-700 text-sm font-bold">This concern has been resolved.</p>
              </div>
            ) : currentAvailableActions.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {currentAvailableActions.map(action => (
                  <button
                    key={action}
                    disabled={loading}
                    onClick={() => handleStatusUpdate(action)}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${getActionButtonStyle(action)}`}
                  >
                    {loading ? 'Updating...' : `Mark as ${action}`}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm italic font-medium">No further actions available.</p>
            )}
          </div>

          {/* Add note section */}
          <div className="mt-4">
            {/* Header row with label and AI button */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-slate-600">
                  Add internal note
                </label>
              </div>
              <button
                onClick={suggestReply}
                disabled={aiSuggesting || concern.status === 'Resolved'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {aiSuggesting ? (
                  <>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <span>✨ Suggest Reply</span>
                )}
              </button>
            </div>

            {/* AI error */}
            {aiError && (
              <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-medium">
                {aiError}
              </div>
            )}

            {/* AI suggestion indicator */}
            {noteText && !aiSuggesting && (
              <div className="mb-2 text-xs text-indigo-600 flex items-center gap-1 font-bold italic">
                <span>✨</span>
                <span>AI draft loaded — review and edit before submitting</span>
              </div>
            )}

            {/* Textarea */}
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add an internal note... or click ✨ Suggest Reply to generate an AI draft"
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none transition-colors shadow-sm"
            />

            {/* Add note button */}
            <button
              onClick={handleAddNote}
              disabled={!noteText.trim() || loading}
              className="mt-2 w-full px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add note'}
            </button>
          </div>

          <hr className="border-slate-100 my-8" />

          {/* Activity Timeline */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Activity Timeline</h4>
            <div className="relative pl-5 space-y-8 before:absolute before:inset-y-1 before:left-[7px] before:w-px before:bg-slate-100">

              {concern.audit_trail?.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((entry: AuditEntry, idx: number) => {
                const dotColor = getDotColor(entry.action);

                return (
                  <div key={entry.id || idx} className="relative">
                    <span className={`absolute -left-[25px] top-1.5 w-3 h-3 rounded-full border-[2px] border-white ${dotColor}`}></span>

                    <div className="flex flex-col ml-1">
                      <h5 className="font-bold text-slate-900 text-[13px]">{entry.action}</h5>
                      <div className="flex flex-col text-slate-500 text-[11px] mt-1 space-y-0.5 font-medium">
                        <span>{format(new Date(entry.timestamp), 'MMM dd, yyyy · h:mm a').toUpperCase()} <span className="mx-1">·</span> {entry.actor}</span>
                        {entry.note && <span className="italic text-slate-400">"{entry.note}"</span>}
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        </div>

      </div>

      {showFile && (
        <FileViewer 
          url={showFile} 
          onClose={() => setShowFile(null)} 
        />
      )}
    </>
  );
}
