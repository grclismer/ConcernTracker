import React, { useState } from 'react';
import { 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon, 
  CheckIcon, 
  ArrowLeftIcon, 
  PaperClipIcon, 
  ChevronRightIcon 
} from '@heroicons/react/24/outline';
import { useConcerns } from '../hooks/useConcerns';
import type { Concern, AuditEntry } from '../hooks/useConcerns';
import type { CurrentUser } from '../hooks/useAuth';
import { format, differenceInDays } from 'date-fns';
import StudentConcernHistory from './StudentConcernHistory';
import FileViewer from './FileViewer';

interface StatusTrackerProps {
  user: CurrentUser;
}

export default function StatusTracker({ user }: StatusTrackerProps) {
  const [result, setResult] = useState<Concern | null>(null);
  const [searching, setSearching] = useState(false);
  const [showFile, setShowFile] = useState<string | null>(null);
  const { fetchConcernById } = useConcerns();

  const handleTrack = async (id: string) => {
    if (!id.trim()) return;
    setSearching(true);
    setResult(null);

    try {
      const found = await fetchConcernById(id.trim().toUpperCase());
      if (found) {
        setResult(found);
      }
    } catch (err) {
      console.error('Tracking failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const steps = ['Submitted', 'Routed', 'Read', 'Screened', 'Resolved'];
  const currentIndex = result
    ? (result.status === 'Escalated' ? steps.indexOf('Screened') : steps.indexOf(result.status))
    : -1;

  const getDaysOpen = (date: string) => differenceInDays(new Date(), new Date(date));

  return (
    <div className="max-w-4xl mx-auto pb-12 px-4 sm:px-6">
      {searching ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="text-gray-400 font-bold text-lg animate-pulse">Tracking Concern...</p>
        </div>
      ) : result ? (
        /* Detailed View */
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setResult(null)}
            className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            <ArrowLeftIcon className="w-3 h-3" /> Back to Tracker
          </button>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 sm:p-8 border-b border-slate-100 relative">
              <span className={`absolute top-6 sm:top-8 right-6 sm:right-8 px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-widest ${result.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-100' :
                result.status === 'Escalated' ? 'bg-red-50 text-red-700 border-red-100' :
                  'bg-indigo-50 text-indigo-700 border-indigo-100'
                }`}>
                {result.status}
              </span>

              <h3 className="text-xl sm:text-2xl font-bold mb-1 text-slate-900">{result.concern_number}</h3>
              <p className="text-slate-800 font-semibold mb-1 text-sm sm:text-base">{result.title}</p>
              <p className="text-slate-500 text-xs sm:text-sm mb-4">Submitted {format(new Date(result.submitted_at), 'MMM dd, yyyy')}</p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs sm:text-sm mt-6">
                <span className="text-slate-600 flex items-center">
                  <span className="font-black text-slate-400 mr-2 text-[10px] uppercase tracking-widest">Dept</span> {result.department}
                </span>
                <span className="text-slate-600 flex items-center">
                  <span className="font-black text-slate-400 mr-2 text-[10px] uppercase tracking-widest">Category</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2"></span>
                  {result.category}
                </span>
                <span className={`flex items-center font-black text-[10px] uppercase tracking-widest ${getDaysOpen(result.submitted_at) > 2 ? 'text-red-600' : 'text-green-600'}`}>
                  Open for {getDaysOpen(result.submitted_at)} days
                </span>
              </div>

              {result.status === 'Escalated' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-xs sm:text-sm leading-relaxed font-medium">
                    Your concern has been escalated due to an SLA breach. Our team is prioritizing this.
                  </p>
                </div>
              )}

              {result.description && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Concern Description</h4>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{result.description}</p>
                </div>
              )}

              {result.file_url && (
                <div className="mt-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Attached File</h4>
                  <button 
                    onClick={() => setShowFile(result.file_url!)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 group transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                        <PaperClipIcon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[150px] sm:max-w-[200px]">
                          {result.file_url.split('/').pop()?.split('-').slice(1).join('-') || 'Attachment'}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to preview</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 sm:p-8 bg-slate-50/50">
              <div className="flex items-center justify-between mb-12 relative">
                {steps.map((step, idx) => {
                  const isCompleted = idx <= currentIndex;
                  const isCurrent = idx === currentIndex;

                  return (
                    <div key={step} className="flex flex-col items-center relative flex-1">
                      {idx < steps.length - 1 && (
                        <div className={`absolute top-4 left-1/2 w-full h-[2px] ${idx < currentIndex ? 'bg-green-500' : 'bg-slate-200'}`} />
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-4 z-10 transition-all duration-500 ${isCompleted ? 'bg-green-500 shadow-lg shadow-green-200' : 'bg-slate-200'}`}>
                        {isCompleted ? <CheckIcon className="w-4 h-4 text-white" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                      </div>
                      <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>{step}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Activity Timeline</h4>
                {result.audit_trail?.slice().reverse().map((entry: AuditEntry, idx: number) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shadow-md shadow-indigo-200" />
                      {idx < result.audit_trail!.length - 1 && <div className="w-[1px] h-full bg-slate-200 my-1" />}
                    </div>
                    <div className="pb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900">{entry.action}</span>
                        <span className="text-[10px] text-slate-400 font-medium tracking-tighter uppercase">{format(new Date(entry.timestamp), 'MMM dd, h:mm a')}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{entry.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History View */
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <StudentConcernHistory 
            email={user.email} 
            onConcernClick={(concern) => {
              handleTrack(concern.concern_number);
            }} 
          />
        </div>
      )}

      {showFile && (
        <FileViewer 
          url={showFile} 
          onClose={() => setShowFile(null)} 
        />
      )}
    </div>
  );
}
