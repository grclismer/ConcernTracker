import React from 'react';
import { XMarkIcon, ArrowDownTrayIcon, EyeIcon } from '@heroicons/react/24/outline';

interface FileViewerProps {
  url: string;
  onClose: () => void;
}

export default function FileViewer({ url, onClose }: FileViewerProps) {
  const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  const isPdf = url.match(/\.pdf$/i);
  const fileName = url.split('/').pop()?.split('-').slice(1).join('-') || 'Attachment';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute top-4 right-4 flex items-center gap-4 z-50">
        <a 
          href={url} 
          download 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          title="Download"
        >
          <ArrowDownTrayIcon className="w-6 h-6" />
        </a>
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          title="Close"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full max-w-5xl max-h-full flex flex-col items-center justify-center">
        {isImage ? (
          <div className="relative group">
            <img 
              src={url} 
              alt="Attachment" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'bg-white border border-slate-200 p-8 rounded-2xl text-center text-red-600 font-bold shadow-xl';
                  errorDiv.innerHTML = '<p>⚠️ Failed to load image</p><p class="text-xs text-slate-500 mt-2 font-normal">Please ensure the "concern-attachments" bucket exists and is set to PUBLIC in Supabase.</p>';
                  parent.appendChild(errorDiv);
                }
              }}
            />
          </div>
        ) : isPdf ? (
          <div className="w-full h-[85vh] bg-white rounded-lg overflow-hidden shadow-2xl">
            <iframe 
              src={`${url}#toolbar=0`} 
              className="w-full h-full border-none"
              title="PDF Viewer"
            />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-12 rounded-3xl flex flex-col items-center text-center max-w-md shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 border border-indigo-100">
              <EyeIcon className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{fileName}</h3>
            <p className="text-slate-500 mb-8 font-medium">This file type cannot be previewed directly. You can download it to view the contents.</p>
            <div className="flex gap-4 w-full">
               <a 
                href={url} 
                download 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <ArrowDownTrayIcon className="w-5 h-5" /> Download
              </a>
              <button 
                onClick={onClose}
                className="flex-1 py-3 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-bold transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
