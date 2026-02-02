import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown } from 'lucide-react';
import type { Step } from '../firestoreService';
import type { RelocationConfig } from './RelocationConfig';

// Helper to safely parse dates from Firestore (handles Timestamp, Date, string, etc.)
const parseDate = (date: any): Date | null => {
  if (!date) return null;
  // Firestore Timestamp
  if (date?.toDate && typeof date.toDate === 'function') {
    return date.toDate();
  }
  // Already a Date
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }
  // String or number
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateForInput = (date: any): string => {
  const parsed = parseDate(date);
  if (!parsed) return '';
  return parsed.toISOString().split('T')[0];
};

interface TimelineViewProps {
  steps: Step[];
  config: RelocationConfig;
  onUpdateStep: (id: string, field: keyof Step, value: any) => void;
  onDeleteStep: (id: string) => void;
  onToggleStatus: (id: string, status: Step['status']) => void;
}

const MonthMarker = ({ date, isRelocation }: { date: Date; isRelocation: boolean }) => {
  return (
    <div className={`flex flex-col items-center ${ isRelocation ? 'opacity-100' : 'opacity-60'}`}>
      <div className={`text-3xl font-black tracking-tighter ${ isRelocation ? 'text-red-500' : 'text-slate-300' }`}>
        {date.toLocaleString('en-US', { month: 'numeric' })}
      </div>
      <div className={`text-xs font-bold ${ isRelocation ? 'text-red-500' : 'text-slate-400' }`}>
        {date.getFullYear()}
      </div>
      {isRelocation && (
        <div className="text-xs font-bold text-red-500 mt-1">🚀 MOVE</div>
      )}
    </div>
  );
};

export const TimelineView = ({
  steps,
  config,
  onUpdateStep,
  onDeleteStep,
  onToggleStatus,
}: TimelineViewProps) => {
  const sortedSteps = useMemo(() => {
    const withDates = steps.filter(s => s.date);
    const noDates = steps.filter(s => !s.date);
    
    withDates.sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : Infinity;
      const bDate = b.date ? new Date(b.date).getTime() : Infinity;
      return aDate - bDate;
    });
    
    return [...withDates, ...noDates];
  }, [steps]);

  const isBeforeRelocation = (step: Step): boolean | null => {
    const relocationDate = parseDate(config.relocationDate);
    const stepDate = parseDate(step.date);
    
    // If no relocation date set, can't determine
    if (!relocationDate) return null;
    // If step has no date, return null (undetermined)
    if (!stepDate) return null;
    
    return stepDate < relocationDate;
  };

  // Get steps grouped by phase
  const beforeSteps = sortedSteps.filter(s => isBeforeRelocation(s) === true);
  const afterSteps = sortedSteps.filter(s => isBeforeRelocation(s) === false);
  const undatedSteps = sortedSteps.filter(s => !s.date);

  return (
    <div className="space-y-8">
      {/* TIMELINE HEADER */}
      <div className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
            Journey Timeline
          </h2>

          {/* MONTHS DISPLAY */}
          {config.startDate && config.endDate && (
            <div className="mb-12 pb-8 border-b border-slate-100">
              <div className="grid grid-cols-12 gap-2">
                {Array.from({ length: 13 }).map((_, i) => {
                  const monthDate = new Date(config.startDate!);
                  monthDate.setMonth(monthDate.getMonth() + i);
                  const isRelocation =
                    config.relocationDate &&
                    monthDate.getMonth() === config.relocationDate.getMonth() &&
                    monthDate.getFullYear() === config.relocationDate.getFullYear();

                  return (
                    <div key={i} className="text-center">
                      <MonthMarker date={monthDate} isRelocation={!!isRelocation} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TIMELINE ZONES */}
          <div className="space-y-6">
            {/* PRE-RELOCATION ZONE */}
            {config.relocationDate && (
              <div>
                <div className="flex items-center gap-3 mb-4 pl-4">
                  <span className="text-lg">📍</span>
                  <div>
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                      Before Relocation
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Tasks before {parseDate(config.relocationDate)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="ml-auto text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {beforeSteps.length} tasks
                  </div>
                </div>
                <div className="space-y-3 pl-4 pr-4 py-4 bg-blue-50/30 rounded-lg border border-blue-100/50">
                  {beforeSteps.length > 0 ? beforeSteps.map((step) => (
                    <TimelineCard
                      key={step.id}
                      step={step}
                      onUpdateStep={onUpdateStep}
                      onDeleteStep={onDeleteStep}
                      onToggleStatus={onToggleStatus}
                      relocationDate={parseDate(config.relocationDate)}
                    />
                  )) : (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No tasks scheduled before relocation
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RELOCATION DAY MARKER */}
            {config.relocationDate && (
              <div className="flex items-center gap-4 px-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent"></div>
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full border border-red-200">
                  <span className="text-lg">🚀</span>
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Relocation Day</span>
                  <span className="text-xs font-bold text-red-500">
                    {parseDate(config.relocationDate)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent"></div>
              </div>
            )}

            {/* POST-RELOCATION ZONE */}
            {config.relocationDate && (
              <div>
                <div className="flex items-center gap-3 mb-4 pl-4">
                  <span className="text-lg">🎯</span>
                  <div>
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                      After Relocation
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Tasks after {parseDate(config.relocationDate)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {afterSteps.length} tasks
                  </div>
                </div>
                <div className="space-y-3 pl-4 pr-4 py-4 bg-emerald-50/30 rounded-lg border border-emerald-100/50">
                  {afterSteps.length > 0 ? afterSteps.map((step) => (
                    <TimelineCard
                      key={step.id}
                      step={step}
                      onUpdateStep={onUpdateStep}
                      onDeleteStep={onDeleteStep}
                      onToggleStatus={onToggleStatus}
                      relocationDate={parseDate(config.relocationDate)}
                    />
                  )) : (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No tasks scheduled after relocation
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* UNDATED TASKS - Show when relocation date is set and there are undated steps */}
            {config.relocationDate && undatedSteps.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4 pl-4">
                  <span className="text-lg">📋</span>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Unscheduled
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Tasks without a date — add dates to place on timeline
                    </div>
                  </div>
                  <div className="ml-auto text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {undatedSteps.length} tasks
                  </div>
                </div>
                <div className="space-y-3 pl-4 pr-4 py-4 bg-slate-50/50 rounded-lg border border-slate-200/50 border-dashed">
                  {undatedSteps.map((step) => (
                    <TimelineCard
                      key={step.id}
                      step={step}
                      onUpdateStep={onUpdateStep}
                      onDeleteStep={onDeleteStep}
                      onToggleStatus={onToggleStatus}
                      relocationDate={parseDate(config.relocationDate)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* NO RELOCATION DATE SET */}
            {!config.relocationDate && (
              <div>
                <div className="text-center mb-4 py-4 px-6 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-amber-600 text-sm">⚠️ Set a <strong>Relocation Day</strong> above to organize tasks into before/after phases</span>
                </div>
                <div className="space-y-3 pl-4 pr-4 py-4 bg-slate-50 rounded-lg border border-slate-100">
                  {sortedSteps.map((step) => (
                    <TimelineCard
                      key={step.id}
                      step={step}
                      onUpdateStep={onUpdateStep}
                      onDeleteStep={onDeleteStep}
                      onToggleStatus={onToggleStatus}
                      relocationDate={null}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TimelineCard = ({
  step,
  onUpdateStep,
  onDeleteStep,
  onToggleStatus,
  relocationDate,
}: {
  step: Step;
  onUpdateStep: (id: string, field: keyof Step, value: any) => void;
  onDeleteStep: (id: string) => void;
  onToggleStatus: (id: string, status: Step['status']) => void;
  relocationDate: Date | null;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate days relative to relocation
  const getDaysToRelocation = () => {
    const stepDate = parseDate(step.date);
    if (!stepDate || !relocationDate) return null;
    const diffTime = stepDate.getTime() - relocationDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysToRelocation = getDaysToRelocation();
  
  const statusStyles = {
    todo: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
    progress: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
    done: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100',
  };

  const getStatusLabel = (status: Step['status']) => {
    const labels = { todo: '📋 Todo', progress: '🔄 In Progress', done: '✅ Done' };
    return labels[status];
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all"
    >
      {/* Card Content */}
      <div className="p-4">
        {/* Top Row: Title & Status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <input
              value={step.title}
              onChange={(e) => onUpdateStep(step.id, 'title', e.target.value)}
              placeholder="Task title..."
              className="w-full text-base font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-slate-50 rounded px-2 py-1 outline-none border border-transparent focus:border-slate-200 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(step.id, step.status);
              }}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${statusStyles[step.status]}`}
            >
              {getStatusLabel(step.status)}
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} />
              </motion.div>
            </button>
          </div>
        </div>

        {/* Preview Notes (collapsed) */}
        {!isExpanded && step.notes && (
          <p 
            className="text-xs text-slate-500 truncate px-2 mb-2 cursor-pointer hover:text-slate-700"
            onClick={() => setIsExpanded(true)}
          >
            {step.notes}
          </p>
        )}

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Notes */}
              <textarea
                value={step.notes}
                onChange={(e) => onUpdateStep(step.id, 'notes', e.target.value)}
                placeholder="Add notes, details, links..."
                rows={4}
                className="w-full text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-lg px-3 py-2 outline-none border border-slate-200 focus:border-blue-300 transition-all resize-none mb-3"
              />

              {/* Budget Row */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Est. Budget</span>
                  <div className="flex items-center bg-white rounded-lg px-2 py-1 border border-slate-200">
                    <span className="text-xs text-slate-400 mr-1">€</span>
                    <input
                      type="number"
                      value={step.budgetEstimated}
                      onChange={(e) => onUpdateStep(step.id, 'budgetEstimated', parseFloat(e.target.value) || 0)}
                      className="w-16 bg-transparent text-sm font-bold text-slate-700 outline-none text-right"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Actual</span>
                  <div className={`flex items-center rounded-lg px-2 py-1 border ${
                    step.budgetActual > step.budgetEstimated 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <span className="text-xs text-slate-400 mr-1">€</span>
                    <input
                      type="number"
                      value={step.budgetActual}
                      onChange={(e) => onUpdateStep(step.id, 'budgetActual', parseFloat(e.target.value) || 0)}
                      className={`w-16 bg-transparent text-sm font-bold outline-none text-right ${
                        step.budgetActual > step.budgetEstimated ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Row: Date & Quick Budget Preview */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">📅</span>
            <input
              type="date"
              value={formatDateForInput(step.date)}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value + 'T00:00:00Z') : null;
                onUpdateStep(step.id, 'date', date);
              }}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            />
            {/* Days to/from relocation indicator */}
            {daysToRelocation !== null && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                daysToRelocation < 0 
                  ? 'bg-blue-100 text-blue-600' 
                  : daysToRelocation === 0 
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-600'
              }`}>
                {daysToRelocation === 0 
                  ? '🚀 Move day!' 
                  : daysToRelocation < 0 
                    ? `${Math.abs(daysToRelocation)}d before` 
                    : `${daysToRelocation}d after`}
              </span>
            )}
            {step.date && daysToRelocation === null && relocationDate === null && (
              <span className="text-[10px] text-amber-500 font-medium">
                ⚠️ Set relocation date
              </span>
            )}
          </div>

          {/* Budget */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">Est:</span>
              <div className="flex items-center bg-slate-50 rounded px-1.5 py-0.5 border border-slate-200">
                <span className="text-[10px] text-slate-400">€</span>
                <input
                  type="number"
                  value={step.budgetEstimated}
                  onChange={(e) => onUpdateStep(step.id, 'budgetEstimated', parseFloat(e.target.value) || 0)}
                  className="w-14 bg-transparent text-xs font-bold text-slate-700 outline-none text-right"
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">Real:</span>
              <div className={`flex items-center rounded px-1.5 py-0.5 border ${
                step.budgetActual > step.budgetEstimated 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <span className="text-[10px] text-slate-400">€</span>
                <input
                  type="number"
                  value={step.budgetActual}
                  onChange={(e) => onUpdateStep(step.id, 'budgetActual', parseFloat(e.target.value) || 0)}
                  className={`w-14 bg-transparent text-xs font-bold outline-none text-right ${
                    step.budgetActual > step.budgetEstimated ? 'text-red-600' : 'text-emerald-600'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${step.title || 'this task'}"? This cannot be undone.`)) {
                onDeleteStep(step.id);
              }
            }}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all flex-shrink-0"
            title="Delete task"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
