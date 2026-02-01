import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface CarouselViewProps {
  steps: Step[];
  config: RelocationConfig;
  onUpdateStep: (id: string, field: keyof Step, value: any) => void;
  onDeleteStep: (id: string) => void;
  onToggleStatus: (id: string, status: Step['status']) => void;
  onSort: (steps: Step[]) => void;
}

export const CarouselView = ({
  steps,
  config,
  onUpdateStep,
  onDeleteStep,
  onToggleStatus,
  onSort,
}: CarouselViewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
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

  const prev = () => setCurrentIndex((prev) => (prev - 1 + sortedSteps.length) % sortedSteps.length);
  const next = () => setCurrentIndex((prev) => (prev + 1) % sortedSteps.length);

  const getPrevIndex = () => (currentIndex - 1 + sortedSteps.length) % sortedSteps.length;
  const getNextIndex = () => (currentIndex + 1) % sortedSteps.length;

  const isBeforeRelocation = (step: Step): boolean | null => {
    const relocationDate = parseDate(config.relocationDate);
    const stepDate = parseDate(step.date);
    
    if (!relocationDate) return null;
    if (!stepDate) return null;
    
    return stepDate < relocationDate;
  };

  // Calculate days to relocation for a step
  const getDaysToRelocation = (step: Step): number | null => {
    const relocationDate = parseDate(config.relocationDate);
    const stepDate = parseDate(step.date);
    if (!stepDate || !relocationDate) return null;
    const diffTime = stepDate.getTime() - relocationDate.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  if (sortedSteps.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-lg mb-4">No steps yet</p>
          <p className="text-slate-400 text-sm">Add a step to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4 py-12">
      {/* TOP INFO */}
      <div className="mb-8 text-center">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Journey Wheel
        </div>
        <div className="flex gap-2 justify-center items-center mb-6">
          <div className="text-xs font-bold text-slate-400">
            {currentIndex + 1} / {sortedSteps.length}
          </div>
        </div>
      </div>

      {/* CAROUSEL CONTAINER */}
      <div className="relative w-full max-w-2xl h-96 perspective">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* PREV CARD - LEFT */}
          <motion.div
            key={`prev-${getPrevIndex()}`}
            layoutId={`card-${getPrevIndex()}`}
            className="absolute left-0 w-64 pointer-events-none"
            animate={{
              opacity: 0.4,
              scale: 0.8,
              x: -120,
              zIndex: 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <CarouselCard
              step={sortedSteps[getPrevIndex()]}
              isFocused={false}
              isBeforeRelocation={isBeforeRelocation(sortedSteps[getPrevIndex()]) ?? true}
              daysToRelocation={getDaysToRelocation(sortedSteps[getPrevIndex()])}
            />
          </motion.div>

          {/* CENTER CARD - FOCUSED */}
          <motion.div
            key={`current-${currentIndex}`}
            layoutId={`card-${currentIndex}`}
            className="absolute w-96"
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              zIndex: 10,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            draggable
            onDragStart={() => (dragItem.current = currentIndex)}
            onDragEnter={() => (dragOverItem.current = currentIndex)}
            onDragEnd={handleSort}
            onDragOver={(e) => e.preventDefault()}
          >
            <CarouselCard
              step={sortedSteps[currentIndex]}
              isFocused={true}
              isBeforeRelocation={isBeforeRelocation(sortedSteps[currentIndex]) ?? true}
              daysToRelocation={getDaysToRelocation(sortedSteps[currentIndex])}
              onUpdateStep={onUpdateStep}
              onToggleStatus={onToggleStatus}
              onDeleteStep={onDeleteStep}
            />
          </motion.div>

          {/* NEXT CARD - RIGHT */}
          <motion.div
            key={`next-${getNextIndex()}`}
            layoutId={`card-${getNextIndex()}`}
            className="absolute right-0 w-64 pointer-events-none"
            animate={{
              opacity: 0.4,
              scale: 0.8,
              x: 120,
              zIndex: 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <CarouselCard
              step={sortedSteps[getNextIndex()]}
              isFocused={false}
              isBeforeRelocation={isBeforeRelocation(sortedSteps[getNextIndex()]) ?? true}
              daysToRelocation={getDaysToRelocation(sortedSteps[getNextIndex()])}
            />
          </motion.div>
        </div>
      </div>

      {/* NAVIGATION BUTTONS */}
      <div className="flex gap-4 mt-12 items-center">
        <button
          onClick={prev}
          className="p-3 rounded-full bg-slate-700/50 hover:bg-slate-600 text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex gap-2">
          {sortedSteps.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentIndex ? 'bg-blue-500 w-8' : 'bg-slate-600 w-2 hover:bg-slate-500'
              }`}
              animate={{ width: i === currentIndex ? 32 : 8 }}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="p-3 rounded-full bg-slate-700/50 hover:bg-slate-600 text-white transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* BOTTOM INFO */}
      <div className="mt-12 text-center text-xs text-slate-400">
        <p>Use arrow keys or buttons to navigate • Drag to reorder</p>
      </div>
    </div>
  );
};

const CarouselCard = ({
  step,
  isFocused,
  isBeforeRelocation,
  daysToRelocation,
  onUpdateStep,
  onToggleStatus,
  onDeleteStep,
}: {
  step: Step;
  isFocused: boolean;
  isBeforeRelocation: boolean;
  daysToRelocation: number | null;
  onUpdateStep?: (id: string, field: keyof Step, value: any) => void;
  onToggleStatus?: (id: string, status: Step['status']) => void;
  onDeleteStep?: (id: string) => void;
}) => {
  const bgColor = isBeforeRelocation ? 'from-blue-600 to-blue-700' : 'from-emerald-600 to-emerald-700';
  const statusStyles = {
    todo: 'bg-white/20 text-white border-white/30',
    progress: 'bg-yellow-400/20 text-yellow-100 border-yellow-400/30',
    done: 'bg-emerald-400/20 text-emerald-100 border-emerald-400/30',
  };

  const getStatusLabel = (status: Step['status']) => {
    const labels = { todo: 'Todo', progress: 'In Progress', done: 'Done' };
    return labels[status];
  };
  
  const getDaysLabel = () => {
    if (daysToRelocation === null) return null;
    if (daysToRelocation === 0) return '🚀 Move day!';
    if (daysToRelocation < 0) return `${Math.abs(daysToRelocation)} days before move`;
    return `${daysToRelocation} days after move`;
  };

  return (
    <motion.div
      className={`bg-gradient-to-br ${bgColor} rounded-2xl p-8 text-white shadow-2xl border border-white/10 backdrop-blur-sm ${
        isFocused ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      initial={{ rotateY: 45 }}
      animate={{ rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* DATE BADGE */}
      <div className="mb-6 pb-6 border-b border-white/20">
        {isFocused && onUpdateStep ? (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/60 uppercase">Date</label>
            <input
              type="date"
              value={formatDateForInput(step.date)}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value + 'T00:00:00Z') : null;
                onUpdateStep(step.id, 'date', date);
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-bold text-white bg-white/20 border border-white/30 rounded px-3 py-2 focus:bg-white/30 outline-none"
            />
            {getDaysLabel() && (
              <div className="text-xs font-bold text-white/80 bg-white/10 rounded-full px-3 py-1 text-center">
                {getDaysLabel()}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="text-5xl font-black text-white/90 mb-2">
              {parseDate(step.date)?.getDate() ?? '?'}
            </div>
            <div className="text-sm font-bold text-white/70 uppercase tracking-wide">
              {parseDate(step.date)?.toLocaleString('en-US', { month: 'short', year: 'numeric' }) ?? 'No date'}
            </div>
            {getDaysLabel() && (
              <div className="text-xs font-bold text-white/60 mt-2">
                {getDaysLabel()}
              </div>
            )}
          </>
        )}
      </div>

      {/* PHASE */}
      {isFocused && onUpdateStep ? (
        <input
          value={step.phase}
          onChange={(e) => onUpdateStep(step.id, 'phase', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-bold uppercase tracking-wider text-white/70 bg-white/10 rounded px-2 py-1 mb-3 w-full focus:bg-white/20 outline-none border border-white/10"
          placeholder="Phase..."
        />
      ) : (
        <div className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3">{step.phase}</div>
      )}

      {/* TITLE */}
      {isFocused && onUpdateStep ? (
        <input
          value={step.title}
          onChange={(e) => onUpdateStep(step.id, 'title', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-2xl font-black text-white bg-white/10 rounded px-3 py-2 mb-4 w-full focus:bg-white/20 outline-none border border-white/10"
          placeholder="Title..."
        />
      ) : (
        <h3 className="text-2xl font-black text-white mb-4 line-clamp-2">{step.title}</h3>
      )}

      {/* NOTES */}
      {isFocused && onUpdateStep ? (
        <textarea
          value={step.notes}
          onChange={(e) => onUpdateStep(step.id, 'notes', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full text-sm text-white/80 bg-white/10 rounded px-3 py-2 mb-6 focus:bg-white/20 outline-none border border-white/10 resize-none"
          placeholder="Notes..."
          rows={3}
        />
      ) : (
        step.notes && (
          <p className="text-sm text-white/80 mb-6 line-clamp-3">{step.notes}</p>
        )
      )}

      {/* BUDGET */}
      <div className="mb-6 pb-6 border-b border-white/20 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-white/60 uppercase">Est. Budget</span>
          {isFocused && onUpdateStep ? (
            <input
              type="number"
              value={step.budgetEstimated}
              onChange={(e) => onUpdateStep(step.id, 'budgetEstimated', parseFloat(e.target.value) || 0)}
              onClick={(e) => e.stopPropagation()}
              className="text-lg font-bold text-white bg-white/10 rounded px-2 py-1 w-24 focus:bg-white/20 outline-none border border-white/10 text-right"
            />
          ) : (
            <span className="text-lg font-bold text-white">€{step.budgetEstimated}</span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-white/60 uppercase">Actual</span>
          {isFocused && onUpdateStep ? (
            <input
              type="number"
              value={step.budgetActual}
              onChange={(e) => onUpdateStep(step.id, 'budgetActual', parseFloat(e.target.value) || 0)}
              onClick={(e) => e.stopPropagation()}
              className={`text-lg font-bold rounded px-2 py-1 w-24 focus:bg-white/20 outline-none border text-right ${
                step.budgetActual > step.budgetEstimated
                  ? 'bg-red-500/20 text-red-100 border-red-400/30'
                  : 'bg-white/10 text-white border-white/10'
              }`}
            />
          ) : (
            <span
              className={`text-lg font-bold ${
                step.budgetActual > step.budgetEstimated ? 'text-red-200' : 'text-white'
              }`}
            >
              €{step.budgetActual}
            </span>
          )}
        </div>
      </div>

      {/* STATUS & ACTIONS */}
      {isFocused && (onToggleStatus || onDeleteStep) ? (
        <div className="flex gap-2 items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus?.(step.id, step.status);
            }}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${statusStyles[step.status]}`}
          >
            {getStatusLabel(step.status)}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteStep?.(step.id);
            }}
            className="text-white/50 hover:text-red-300 ml-auto transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ) : (
        <div className={`text-xs font-bold px-3 py-1.5 rounded-lg border inline-block ${statusStyles[step.status]}`}>
          {getStatusLabel(step.status)}
        </div>
      )}
    </motion.div>
  );
};
