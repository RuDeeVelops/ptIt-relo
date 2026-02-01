import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Trash2 } from 'lucide-react';
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
  onSort: (steps: Step[]) => void;
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
  onSort,
}: TimelineViewProps) => {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

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

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const draggedItem = sortedSteps[dragItem.current];
    const newSteps = sortedSteps.filter((_, i) => i !== dragItem.current);
    newSteps.splice(dragOverItem.current, 0, draggedItem);
    
    dragItem.current = null;
    dragOverItem.current = null;
    onSort(newSteps);
  };

  const isBeforeRelocation = (step: Step) => {
    if (!config.relocationDate || !step.date) return true;
    return new Date(step.date) < new Date(config.relocationDate);
  };

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
          <div className="space-y-4">
            {/* PRE-RELOCATION ZONE */}
            {config.relocationDate && (
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pl-4">
                  📍 Before Relocation
                </div>
                <div className="space-y-3 pl-4 pr-4 py-4 bg-blue-50/30 rounded-lg border border-blue-100/50">
                  {sortedSteps
                    .filter(s => s.date && isBeforeRelocation(s))
                    .map((step, index) => (
                      <TimelineCard
                        key={step.id}
                        step={step}
                        index={index}
                        dragItem={dragItem}
                        dragOverItem={dragOverItem}
                        onDragEnd={handleSort}
                        onUpdateStep={onUpdateStep}
                        onDeleteStep={onDeleteStep}
                        onToggleStatus={onToggleStatus}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* POST-RELOCATION ZONE */}
            {config.relocationDate && (
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pl-4">
                  🎯 After Relocation
                </div>
                <div className="space-y-3 pl-4 pr-4 py-4 bg-emerald-50/30 rounded-lg border border-emerald-100/50">
                  {sortedSteps
                    .filter(s => !s.date || !isBeforeRelocation(s))
                    .map((step, index) => (
                      <TimelineCard
                        key={step.id}
                        step={step}
                        index={index}
                        dragItem={dragItem}
                        dragOverItem={dragOverItem}
                        onDragEnd={handleSort}
                        onUpdateStep={onUpdateStep}
                        onDeleteStep={onDeleteStep}
                        onToggleStatus={onToggleStatus}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* NO RELOCATION DATE SET */}
            {!config.relocationDate && (
              <div className="space-y-3 pl-4 pr-4 py-4 bg-slate-50 rounded-lg border border-slate-100">
                {sortedSteps.map((step, index) => (
                  <TimelineCard
                    key={step.id}
                    step={step}
                    index={index}
                    dragItem={dragItem}
                    dragOverItem={dragOverItem}
                    onDragEnd={handleSort}
                    onUpdateStep={onUpdateStep}
                    onDeleteStep={onDeleteStep}
                    onToggleStatus={onToggleStatus}
                  />
                ))}
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
  index,
  dragItem,
  dragOverItem,
  onDragEnd,
  onUpdateStep,
  onDeleteStep,
  onToggleStatus,
}: {
  step: Step;
  index: number;
  dragItem: any;
  dragOverItem: any;
  onDragEnd: () => void;
  onUpdateStep: (id: string, field: keyof Step, value: any) => void;
  onDeleteStep: (id: string) => void;
  onToggleStatus: (id: string, status: Step['status']) => void;
}) => {
  const statusStyles = {
    todo: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
    progress: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
    done: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100',
  };

  const getStatusLabel = (status: Step['status']) => {
    const labels = { todo: '📋 Todo', progress: '🔄 In Progress', done: '✅ Done' };
    return labels[status];
  };

  // Get today's date for the date picker min value
  const today = new Date().toISOString().split('T')[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden"
    >
      {/* Drag Handle - Only this area is draggable */}
      <div
        draggable
        onDragStart={() => (dragItem.current = index)}
        onDragEnter={() => (dragOverItem.current = index)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => e.preventDefault()}
        className="absolute left-0 top-0 bottom-0 w-8 bg-slate-50 border-r border-slate-100 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-100 transition-colors"
      >
        <GripVertical size={14} className="text-slate-400" />
      </div>

      {/* Card Content */}
      <div className="ml-8 p-4">
        {/* Top Row: Phase & Status */}
        <div className="flex items-center justify-between mb-3">
          <input
            value={step.phase}
            onChange={(e) => onUpdateStep(step.id, 'phase', e.target.value)}
            placeholder="Phase..."
            className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-transparent hover:bg-blue-50 focus:bg-blue-50 rounded px-1.5 py-0.5 outline-none border border-transparent focus:border-blue-200 transition-all max-w-[120px]"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(step.id, step.status);
            }}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${statusStyles[step.status]}`}
          >
            {getStatusLabel(step.status)}
          </button>
        </div>

        {/* Title */}
        <input
          value={step.title}
          onChange={(e) => onUpdateStep(step.id, 'title', e.target.value)}
          placeholder="Task title..."
          className="w-full text-base font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-slate-50 rounded px-2 py-1 outline-none border border-transparent focus:border-slate-200 transition-all mb-2"
        />

        {/* Notes */}
        <textarea
          value={step.notes}
          onChange={(e) => onUpdateStep(step.id, 'notes', e.target.value)}
          placeholder="Add notes..."
          rows={2}
          className="w-full text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-lg px-3 py-2 outline-none border border-slate-100 focus:border-slate-300 transition-all resize-none mb-3"
        />

        {/* Bottom Row: Date & Budget */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">📅</span>
            <input
              type="date"
              value={formatDateForInput(step.date)}
              min={today}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value + 'T00:00:00Z') : null;
                onUpdateStep(step.id, 'date', date);
              }}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            />
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
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDeleteStep(step.id);
        }}
        className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
};
