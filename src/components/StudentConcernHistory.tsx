import { useState, useEffect } from 'react'
import { useConcerns } from '../hooks/useConcerns'
import type { Concern, ConcernCategory } from '../hooks/useConcerns'
import { 
  FolderIcon, 
  TagIcon, 
  MagnifyingGlassIcon, 
  ClipboardDocumentListIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

interface StudentConcernHistoryProps {
  email: string
  onConcernClick?: (concern: Concern) => void
}

const statusColors: Record<string, string> = {
  Submitted: 'bg-blue-50 text-blue-700 border-blue-100',
  Routed: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  Read: 'bg-purple-50 text-purple-700 border-purple-100',
  Screened: 'bg-amber-50 text-amber-700 border-amber-100',
  Resolved: 'bg-green-50 text-green-700 border-green-100',
  Escalated: 'bg-red-50 text-red-700 border-red-100'
}

export default function StudentConcernHistory({ email, onConcernClick }: StudentConcernHistoryProps) {
  const { fetchMyConcerns, loading } = useConcerns()
  const [history, setHistory] = useState<Concern[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ConcernCategory | 'All'>('All')

  useEffect(() => {
    const loadHistory = async () => {
      const data = await fetchMyConcerns(email)
      setHistory(data)
    }
    loadHistory()
  }, [email])

  const filteredConcerns = history.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                         c.concern_number.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-8 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 mb-8 sm:mb-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 flex-shrink-0">
            <ClipboardDocumentListIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Concern History</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Track and manage your submitted concerns.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative group w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or code..."
              className="bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full shadow-sm"
            />
          </div>
          
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none min-w-[160px] cursor-pointer shadow-sm"
            >
              <option value="All">All Categories</option>
              <option value="Academic">Academic</option>
              <option value="Financial">Financial</option>
              <option value="Welfare">Welfare</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading && history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="text-gray-500 font-medium">Fetching your history...</p>
        </div>
      ) : filteredConcerns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mb-6 shadow-md border border-slate-100">📤</div>
          <p className="text-slate-600 font-bold text-lg">No concerns found</p>
          <p className="text-slate-400 text-sm mt-2 max-w-xs text-center leading-relaxed">
            {search || selectedCategory !== 'All' 
              ? 'Try adjusting your search terms or filters to find what you\'re looking for.' 
              : 'You haven\'t submitted any concerns yet. All your future requests will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-h-[600px] overflow-y-auto pr-2 sm:pr-3 custom-scrollbar p-1">
          {filteredConcerns.map((concern) => (
            <button 
              key={concern.id}
              onClick={() => onConcernClick?.(concern)}
              className="bg-slate-50/50 border border-slate-200 hover:border-indigo-500 hover:bg-white rounded-2xl p-4 sm:p-6 text-left transition-all duration-300 group relative overflow-hidden flex flex-col shadow-sm hover:shadow-indigo-100"
            >
              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                  {concern.concern_number}
                </span>
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase tracking-wider ${statusColors[concern.status] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                  {concern.status}
                </span>
              </div>
              
              <h4 className="text-slate-900 font-bold text-xl mb-6 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2">
                {concern.title}
              </h4>
              
              <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FolderIcon className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{concern.category}</span>
                  </div>
                  {concern.sub_category && (
                    <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                      <TagIcon className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider truncate max-w-[140px]">{concern.sub_category}</span>
                    </div>
                  )}
                </div>
                
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {new Date(concern.submitted_at).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {/* Hover highlight effect */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
          background-clip: padding-box;
        }
      `}</style>
    </div>
  )
}
