import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Step } from '../firestoreService';
import type { RelocationConfig } from './RelocationConfig';

// Helper to safely parse dates from Firestore
const parseDate = (date: any): Date | null => {
  if (!date) return null;
  if (date?.toDate && typeof date.toDate === 'function') {
    return date.toDate();
  }
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }
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
}: CarouselViewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [[page, direction], setPage] = useState([0, 0]);

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

  const paginate = (newDirection: number) => {
    const newIndex = (currentIndex + newDirection + sortedSteps.length) % sortedSteps.length;
    setCurrentIndex(newIndex);
    setPage([page + newDirection, newDirection]);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      paginate(1);
    } else if (info.offset.x > swipeThreshold) {
      paginate(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') paginate(-1);
    if (e.key === 'ArrowRight') paginate(1);
  };

  const isBeforeRelocation = (step: Step): boolean | null => {
    const relocationDate = parseDate(config.relocationDate);
    const stepDate = parseDate(step.date);
    if (!relocationDate || !stepDate) return null;
    return stepDate < relocationDate;
  };

  const getDaysToRelocation = (step: Step): number | null => {
    const relocationDate = parseDate(config.relocationDate);
    const stepDate = parseDate(step.date);
    if (!stepDate || !relocationDate) return null;
    const diffTime = stepDate.getTime() - relocationDate.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  if (sortedSteps.length === 0) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <p className="text-slate-400 text-lg mb-4">No tasks yet</p>
          <p className="text-slate-500 text-sm">Add a task to get started</p>
        </div>
      </div>
    );
  }

  const currentStep = sortedSteps[currentIndex];
  const stepDate = parseDate(currentStep?.date);
  const isBefore = isBeforeRelocation(currentStep);
  const daysToMove = getDaysToRelocation(currentStep);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
  };

  return (
    <div 
      className="min-h-[calc(100vh-200px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col px-4 py-6 sm:py-10"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* CHUNKY MONTH/YEAR HEADER */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="text-6xl sm:text-8xl font-black text-white/90 tracking-tighter leading-none">
          {stepDate ? stepDate.toLocaleString('en-US', { month: 'short' }).toUpperCase() : '---'}
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-white/50 mt-1">
          {stepDate ? stepDate.getFullYear() : '----'}
        </div>
        {daysToMove !== null && (
          <div className={`inline-block mt-3 text-sm font-bold px-4 py-1.5 rounded-full ${
            daysToMove === 0 
              ? 'bg-red-500/30 text-red-200' 
              : daysToMove < 0 
                ? 'bg-blue-500/30 text-blue-200'
                : 'bg-emerald-500/30 text-emerald-200'
          }`}>
            {daysToMove === 0 
              ? '🚀 Move day!' 
              : daysToMove < 0 
                ? `${Math.abs(daysToMove)} days before move` 
                : `${daysToMove} days after move`}
          </div>
        )}
      </div>

      {/* CARD CAROUSEL */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-[400px]">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            className="w-full max-w-md mx-auto cursor-grab active:cursor-grabbing touch-pan-y"
          >
            <CarouselCard
              step={currentStep}
              isBefore={isBefore}
              onUpdateStep={onUpdateStep}
              onToggleStatus={onToggleStatus}
              onDeleteStep={onDeleteStep}
            />
          </motion.div>
        </AnimatePresence>

        {/* Side navigation arrows - desktop */}
        <button
          onClick={() => paginate(-1)}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-20"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          onClick={() => paginate(1)}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-20"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="mt-6 sm:mt-8">
        {/* Mobile arrows + dots */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => paginate(-1)}
            className="sm:hidden p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Dot indicators */}
          <div className="flex gap-2 items-center">
            {sortedSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  const diff = i - currentIndex;
                  setCurrentIndex(i);
                  setPage([page + diff, diff > 0 ? 1 : -1]);
                }}
                className={`rounded-full transition-all ${
                  i === currentIndex 
                    ? 'bg-white w-6 h-2' 
                    : 'bg-white/30 w-2 h-2 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => paginate(1)}
            className="sm:hidden p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Counter */}
        <div className="text-center mt-4 text-sm text-white/40">
          {currentIndex + 1} of {sortedSteps.length}
        </div>

        {/* Swipe hint - mobile only */}
        <div className="sm:hidden text-center mt-2 text-xs text-white/30">
          Swipe to navigate
        </div>
      </div>
    </div>
  );
};

const CarouselCard = ({
  step,
  isBefore,
  onUpdateStep,
  onToggleStatus,
  onDeleteStep,
}: {
  step: Step;
  isBefore: boolean | null;
  onUpdateStep: (id: string, field: keyof Step, value: any) => void;
  onToggleStatus: (id: string, status: Step['status']) => void;
  onDeleteStep: (id: string) => void;
}) => {
  const bgColor = isBefore === null 
    ? 'from-slate-600 to-slate-700' 
    : isBefore 
      ? 'from-blue-600 to-blue-700' 
      : 'from-emerald-600 to-emerald-700';

  const statusStyles = {
    todo: 'bg-white/20 text-white border-white/30',
    progress: 'bg-yellow-400/30 text-yellow-100 border-yellow-400/50',
    done: 'bg-emerald-400/30 text-emerald-100 border-emerald-400/50',
  };

  const getStatusLabel = (status: Step['status']) => {
    const labels = { todo: '📋 Todo', progress: '🔄 Working', done: '✅ Done' };
    return labels[status];
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${step.title || 'this task'}"? This cannot be undone.`)) {
      onDeleteStep(step.id);
    }
  };

  return (
    <div className={`bg-gradient-to-br ${bgColor} rounded-2xl p-6 text-white shadow-2xl border border-white/10`}>
      {/* Date picker */}
      <div className="mb-4">
        <label className="text-xs font-bold text-white/50 uppercase block mb-1">Date</label>
        <input
          type="date"
          value={formatDateForInput(step.date)}
          onChange={(e) => {
            const date = e.target.value ? new Date(e.target.value + 'T00:00:00Z') : null;
            onUpdateStep(step.id, 'date', date);
          }}
          className="w-full text-sm font-semibold text-white bg-white/10 border border-white/20 rounded-lg px-3 py-2 focus:bg-white/20 outline-none"
        />
      </div>

      {/* Title */}
      <input
        value={step.title}
        onChange={(e) => onUpdateStep(step.id, 'title', e.target.value)}
        placeholder="Task title..."
        className="w-full text-xl font-bold text-white bg-transparent hover:bg-white/5 focus:bg-white/10 rounded-lg px-2 py-2 mb-3 outline-none border border-transparent focus:border-white/20 transition-all"
      />

      {/* Notes */}
      <textarea
        value={step.notes}
        onChange={(e) => onUpdateStep(step.id, 'notes', e.target.value)}
        placeholder="Add notes..."
        rows={3}
        className="w-full text-sm text-white/80 bg-white/5 hover:bg-white/10 focus:bg-white/15 rounded-lg px-3 py-2 mb-4 outline-none border border-white/10 focus:border-white/30 transition-all resize-none"
      />

      {/* Budget row */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-white/20">
        <div>
          <label className="text-xs font-bold text-white/50 uppercase block mb-1">Est. Budget</label>
          <div className="flex items-center bg-white/10 rounded-lg px-3 py-2 border border-white/10">
            <span className="text-white/50 mr-1">€</span>
            <input
              type="number"
              value={step.budgetEstimated}
              onChange={(e) => onUpdateStep(step.id, 'budgetEstimated', parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-white font-bold outline-none text-right"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-white/50 uppercase block mb-1">Actual</label>
          <div className={`flex items-center rounded-lg px-3 py-2 border ${
            step.budgetActual > step.budgetEstimated
              ? 'bg-red-500/30 border-red-400/50'
              : 'bg-white/10 border-white/10'
          }`}>
            <span className="text-white/50 mr-1">€</span>
            <input
              type="number"
              value={step.budgetActual}
              onChange={(e) => onUpdateStep(step.id, 'budgetActual', parseFloat(e.target.value) || 0)}
              className={`w-full bg-transparent font-bold outline-none text-right ${
                step.budgetActual > step.budgetEstimated ? 'text-red-200' : 'text-white'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Status & Delete */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onToggleStatus(step.id, step.status)}
          className={`text-sm font-bold px-4 py-2 rounded-lg border transition-all ${statusStyles[step.status]}`}
        >
          {getStatusLabel(step.status)}
        </button>
        <button
          onClick={handleDelete}
          className="p-2 rounded-lg text-red-300 hover:text-red-100 hover:bg-red-500/30 transition-all"
          title="Delete task"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
