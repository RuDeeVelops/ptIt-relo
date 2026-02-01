import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

export interface RelocationConfig {
  startDate: Date | null;
  relocationDate: Date | null;
  endDate: Date | null;
}

interface RelocationConfigProps {
  config: RelocationConfig;
  onUpdate: (config: RelocationConfig) => void;
}

export const RelocationConfigPanel = ({ config, onUpdate }: RelocationConfigProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set';
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  const handleUpdate = (field: keyof RelocationConfig, value: string) => {
    const date = value ? new Date(value) : null;
    onUpdate({
      ...config,
      [field]: date
    });
  };

  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full max-w-6xl mx-auto flex items-center justify-between hover:bg-slate-50 p-3 rounded transition"
      >
        <div className="text-left">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Relocation Timeline
          </h3>
          <div className="flex gap-4 text-sm text-slate-600">
            <span>Start: <span className="font-bold text-slate-900">{formatDate(config.startDate)}</span></span>
            <span>•</span>
            <span>Move: <span className="font-bold text-slate-900">{formatDate(config.relocationDate)}</span></span>
            <span>•</span>
            <span>End: <span className="font-bold text-slate-900">{formatDate(config.endDate)}</span></span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} className="text-slate-400" />
        </motion.div>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="max-w-6xl mx-auto px-3 pb-4 pt-2 border-t border-slate-100 grid grid-cols-3 gap-4"
        >
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase mb-2">Process Start</label>
            <input
              type="date"
              value={config.startDate ? config.startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => handleUpdate('startDate', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase mb-2">🚀 Relocation Day</label>
            <input
              type="date"
              value={config.relocationDate ? config.relocationDate.toISOString().split('T')[0] : ''}
              onChange={(e) => handleUpdate('relocationDate', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase mb-2">Process End</label>
            <input
              type="date"
              value={config.endDate ? config.endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => handleUpdate('endDate', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};
