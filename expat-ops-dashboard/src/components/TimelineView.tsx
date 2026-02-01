import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Trash2 } from 'lucide-react';
import type { Step } from '../firestoreService';
import type { RelocationConfig } from './RelocationConfig';

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
    todo: 'bg-slate-100 text-slate-500 border-slate-200',
    progress: 'bg-blue-100 text-blue-600 border-blue-200',
    done: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  };

  const getStatusLabel = (status: Step['status']) => {
    const labels = { todo: 'Todo', progress: 'In Progress', done: 'Done' };
    return labels[status];
  };

  return (
    <motion.div
      layout
      draggable
      onDragStart={() => (dragItem.current = index)}
      onDragEnter={() => (dragOverItem.current = index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="group relative bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-all cursor-move"
    >
      <div className="flex gap-3">
        <div className="text-slate-300 pt-1 flex-shrink-0">
          <GripVertical size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex gap-2 items-start mb-2">
            <input
              type="date"
              value={step.date ? new Date(step.date).toISOString().split('T')[0] : ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value + 'T00:00:00Z') : null;
                onUpdateStep(step.id, 'date', date);
              }}
              className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(step.id, step.status);
              }}
              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${statusStyles[step.status]}`}
            >
              {getStatusLabel(step.status)}
            </button>
          </div>

          <h4 className="text-sm font-bold text-slate-900 mb-1">{step.title}</h4>
          {step.notes && (
            <p className="text-xs text-slate-600 line-clamp-2 mb-2">{step.notes}</p>
          )}

          <div className="flex gap-2 items-center text-xs">
            <span className="text-slate-400">Est: <span className="font-bold text-slate-600">€{step.budgetEstimated}</span></span>
            <span className="text-slate-300">•</span>
            <span className={step.budgetActual > step.budgetEstimated ? 'text-red-500' : 'text-slate-400'}>
              Real: <span className="font-bold">${step.budgetActual}</span>
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteStep(step.id);
          }}
          className="text-slate-300 hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
};
