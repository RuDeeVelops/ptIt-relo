import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
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
  teamMembers: string[];
  onUpdateConfig: (config: RelocationConfig) => void;
  onUpdateStep: (id: string, field: keyof Step, value: any) => void;
  onDeleteStep: (id: string) => void;
  onToggleStatus: (id: string, status: Step['status']) => void;
}

interface MonthMarkerProps {
  date: Date;
  isRelocation: boolean;
  isActive: boolean;
  taskCount: number;
  onClick: () => void;
}

const MonthMarker = ({ date, isRelocation, isActive, taskCount, onClick }: MonthMarkerProps) => {
  const hasTask = taskCount > 0;
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-1.5 sm:p-2 rounded-lg transition-all min-w-0 ${
        isRelocation 
          ? 'bg-red-50 hover:bg-red-100 ring-2 ring-red-200' 
          : isActive
            ? 'bg-indigo-100 ring-2 ring-indigo-300 shadow-md scale-105'
            : hasTask 
              ? 'bg-blue-50 hover:bg-blue-100 cursor-pointer' 
              : 'opacity-50 hover:opacity-70'
      }`}
    >
      <div className={`text-xs sm:text-base md:text-xl font-black tracking-tighter leading-none ${
        isRelocation 
          ? 'text-red-500' 
          : isActive
            ? 'text-indigo-600'
            : hasTask 
              ? 'text-blue-600' 
              : 'text-slate-300'
      }`}>
        {date.toLocaleString('en-US', { month: 'short' }).toUpperCase()}
      </div>
      <div className={`text-[8px] sm:text-[10px] font-bold ${
        isRelocation ? 'text-red-500' : isActive ? 'text-indigo-500' : hasTask ? 'text-blue-500' : 'text-slate-400'
      }`}>
        {date.getFullYear()}
      </div>
      {isRelocation ? (
        <div className="text-[8px] sm:text-[10px] font-bold text-red-500 mt-0.5">🚀</div>
      ) : hasTask ? (
        <div className="mt-0.5 px-1.5 py-0.5 bg-blue-500 text-white text-[8px] sm:text-[10px] font-bold rounded-full leading-none">
          {taskCount}
        </div>
      ) : null}
    </button>
  );
};

export const TimelineView = ({
  steps,
  config,
  teamMembers,
  onUpdateConfig,
  onUpdateStep,
  onDeleteStep,
  onToggleStatus,
}: TimelineViewProps) => {
  const [showDateSettings, setShowDateSettings] = useState(false);
  const [showMonthsTimeline, setShowMonthsTimeline] = useState(true);
  const [currentVisibleMonth, setCurrentVisibleMonth] = useState<{ year: number; month: number } | null>(null);
  const taskZonesRef = useRef<HTMLDivElement>(null);
  const sortedSteps = useMemo(() => {
    const withDates = steps.filter(s => s.date);
    const noDates = steps.filter(s => !s.date);
    
    withDates.sort((a, b) => {
      const aDate = parseDate(a.date);
      const bDate = parseDate(b.date);
      const aTime = aDate ? aDate.getTime() : Infinity;
      const bTime = bDate ? bDate.getTime() : Infinity;
      return aTime - bTime;
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

  // Group steps by month for dividers
  const groupStepsByMonth = (stepsToGroup: Step[]) => {
    const groups: { key: string; year: number; month: number; steps: Step[] }[] = [];
    let currentGroup: { key: string; year: number; month: number; steps: Step[] } | null = null;
    
    stepsToGroup.forEach(step => {
      const stepDate = parseDate(step.date);
      if (!stepDate) return;
      
      const year = stepDate.getFullYear();
      const month = stepDate.getMonth();
      const key = `${year}-${month}`;
      
      if (!currentGroup || currentGroup.key !== key) {
        currentGroup = { key, year, month, steps: [step] };
        groups.push(currentGroup);
      } else {
        currentGroup.steps.push(step);
      }
    });
    
    return groups;
  };

  // Group ALL dated steps by month for unified horizontal view
  const allDatedSteps = sortedSteps.filter(s => s.date);
  const allStepsGrouped = groupStepsByMonth(allDatedSteps);

  // Count tasks per month
  const getTaskCountForMonth = (year: number, month: number): number => {
    return sortedSteps.filter(s => {
      const stepDate = parseDate(s.date);
      if (!stepDate) return false;
      return stepDate.getFullYear() === year && stepDate.getMonth() === month;
    }).length;
  };

  // Scroll to a given month in the task area
  const scrollToMonth = (year: number, month: number) => {
    const taskZones = taskZonesRef.current;
    if (!taskZones) return;

    const isDesktop = window.innerWidth >= 1024;

    if (isDesktop) {
      // On desktop, scroll to the month column directly
      const monthColumn = taskZones.querySelector(`[data-month-divider][data-year="${year}"][data-month="${month}"]`);
      if (monthColumn) {
        const containerRect = taskZones.getBoundingClientRect();
        const columnRect = monthColumn.getBoundingClientRect();
        const scrollLeft = taskZones.scrollLeft + (columnRect.left - containerRect.left) - 20;
        taskZones.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        
        // Flash highlight the column header
        const header = monthColumn.querySelector('div:first-child');
        if (header) {
          header.classList.add('ring-2', 'ring-blue-400', 'ring-inset');
          setTimeout(() => {
            header.classList.remove('ring-2', 'ring-blue-400', 'ring-inset');
          }, 2000);
        }
      }
    } else {
      // On mobile, scroll to the first task of that month
      const firstTask = sortedSteps.find(s => {
        const stepDate = parseDate(s.date);
        if (!stepDate) return false;
        return stepDate.getFullYear() === year && stepDate.getMonth() === month;
      });
      if (firstTask) {
        const element = document.getElementById(`task-${firstTask.id}`);
        if (element) {
          // Manually calculate scroll position relative to taskZones container
          const containerRect = taskZones.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const scrollTop = taskZones.scrollTop + (elementRect.top - containerRect.top) - 100; // 100px offset from top
          taskZones.scrollTo({ top: scrollTop, behavior: 'smooth' });
          
          // Flash highlight
          element.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
          }, 2000);
        }
      }
    }
    
    // Update current visible month
    setCurrentVisibleMonth({ year, month });
  };

  // Calculate dynamic month count between start and end dates
  const timelineMonths = useMemo(() => {
    const startDate = parseDate(config.startDate);
    const endDate = parseDate(config.endDate);
    const relocationDate = parseDate(config.relocationDate);
    
    if (!startDate || !endDate) return { months: [], relocationIndex: -1 };
    
    const months: Date[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (current <= end) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    
    // Find relocation month index for centering
    let relocationIndex = -1;
    if (relocationDate) {
      relocationIndex = months.findIndex(m => 
        m.getMonth() === relocationDate.getMonth() && 
        m.getFullYear() === relocationDate.getFullYear()
      );
    }
    
    return { months, relocationIndex };
  }, [config.startDate, config.endDate, config.relocationDate]);

  // Timeline scrolling with hover arrows
  const timelineRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [leftArrowHover, setLeftArrowHover] = useState(false);
  const [rightArrowHover, setRightArrowHover] = useState(false);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check scroll position to show/hide arrows
  const updateScrollIndicators = useCallback(() => {
    if (timelineRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = timelineRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  // Auto-scroll to center on relocation month on mount
  useEffect(() => {
    if (timelineRef.current && timelineMonths.relocationIndex >= 0) {
      const container = timelineRef.current;
      const flexContainer = container.firstElementChild as HTMLElement;
      if (flexContainer) {
        const relocationElement = flexContainer.children[timelineMonths.relocationIndex] as HTMLElement;
        if (relocationElement) {
          const containerWidth = container.offsetWidth;
          const elementLeft = relocationElement.offsetLeft;
          const elementWidth = relocationElement.offsetWidth;
          const scrollTo = elementLeft - (containerWidth / 2) + (elementWidth / 2);
          container.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
      }
      // Update indicators after centering
      setTimeout(updateScrollIndicators, 500);
    }
  }, [timelineMonths, updateScrollIndicators]);

  // Listen to scroll events
  useEffect(() => {
    const container = timelineRef.current;
    if (container) {
      updateScrollIndicators();
      container.addEventListener('scroll', updateScrollIndicators);
      window.addEventListener('resize', updateScrollIndicators);
      return () => {
        container.removeEventListener('scroll', updateScrollIndicators);
        window.removeEventListener('resize', updateScrollIndicators);
      };
    }
  }, [updateScrollIndicators, timelineMonths]);

  // Continuous scroll while hovering
  const startScrolling = useCallback((direction: 'left' | 'right') => {
    const scroll = () => {
      if (timelineRef.current) {
        const scrollAmount = direction === 'left' ? -8 : 8;
        timelineRef.current.scrollBy({ left: scrollAmount });
      }
    };
    scroll();
    scrollIntervalRef.current = setInterval(scroll, 20);
  }, []);

  const stopScrolling = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  // Sync vertical card scroll with horizontal timeline
  const scrollTimelineToMonth = useCallback((year: number, month: number) => {
    if (timelineRef.current && timelineMonths.months.length > 0) {
      const monthIndex = timelineMonths.months.findIndex(m => 
        m.getFullYear() === year && m.getMonth() === month
      );
      if (monthIndex >= 0) {
        const container = timelineRef.current;
        const flexContainer = container.firstElementChild as HTMLElement;
        if (flexContainer && flexContainer.children[monthIndex]) {
          const monthElement = flexContainer.children[monthIndex] as HTMLElement;
          const containerWidth = container.offsetWidth;
          const elementLeft = monthElement.offsetLeft;
          const elementWidth = monthElement.offsetWidth;
          const scrollTo = elementLeft - (containerWidth / 2) + (elementWidth / 2);
          container.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
      }
    }
  }, [timelineMonths.months]);

  // Handle task zones scroll to detect current visible month
  useEffect(() => {
    const taskZones = taskZonesRef.current;
    if (!taskZones) return;

    const handleScroll = () => {
      const isDesktop = window.innerWidth >= 1024; // lg breakpoint
      const containerRect = taskZones.getBoundingClientRect();
      
      let closestYear = 0;
      let closestMonthNum = 0;
      let found = false;

      if (isDesktop) {
        // DESKTOP: Find month columns by data-month-divider attribute
        const dividers = taskZones.querySelectorAll('[data-month-divider]');
        let closestDistance = Infinity;

        dividers.forEach((divider) => {
          const rect = divider.getBoundingClientRect();
          const distance = Math.abs(rect.left - containerRect.left - 50);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestYear = parseInt(divider.getAttribute('data-year') || '0');
            closestMonthNum = parseInt(divider.getAttribute('data-month') || '0');
            found = true;
          }
        });
      } else {
        // MOBILE: Find visible task cards and detect their month
        const taskCards = taskZones.querySelectorAll('[id^="task-"]');
        let closestDistance = Infinity;
        
        taskCards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          // Check if card is near the top of the visible area
          const distance = Math.abs(rect.top - containerRect.top - 100);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            // Extract task ID and find its date
            const taskId = card.id.replace('task-', '');
            const step = sortedSteps.find(s => s.id === taskId);
            if (step) {
              const stepDate = parseDate(step.date);
              if (stepDate) {
                closestYear = stepDate.getFullYear();
                closestMonthNum = stepDate.getMonth();
                found = true;
              }
            }
          }
        });
      }

      if (found && showMonthsTimeline) {
        if (!currentVisibleMonth || 
            currentVisibleMonth.year !== closestYear || 
            currentVisibleMonth.month !== closestMonthNum) {
          setCurrentVisibleMonth({ year: closestYear, month: closestMonthNum });
          scrollTimelineToMonth(closestYear, closestMonthNum);
        }
      }
    };

    taskZones.addEventListener('scroll', handleScroll);
    // Initialize on mount
    setTimeout(handleScroll, 100);
    return () => taskZones.removeEventListener('scroll', handleScroll);
  }, [showMonthsTimeline, currentVisibleMonth, scrollTimelineToMonth, sortedSteps]);

  // Initialize timeline position when it opens
  useEffect(() => {
    if (showMonthsTimeline && currentVisibleMonth) {
      scrollTimelineToMonth(currentVisibleMonth.year, currentVisibleMonth.month);
    }
  }, [showMonthsTimeline]);

  // Date config helpers
  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set';
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  const handleConfigUpdate = (field: keyof RelocationConfig, value: string) => {
    const date = value ? new Date(value) : null;
    onUpdateConfig({
      ...config,
      [field]: date
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* STICKY TIMELINE HEADER */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm px-4 py-3">
        <div className="max-w-6xl mx-auto">
          {/* Header Row with Title, Chevron Toggle, and Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Journey Timeline
              </h2>
              {/* Chevron to toggle months */}
              {config.startDate && config.endDate && timelineMonths.months.length > 0 && (
                <button
                  onClick={() => setShowMonthsTimeline(!showMonthsTimeline)}
                  className="p-1 rounded hover:bg-slate-100 transition-colors"
                  title={showMonthsTimeline ? 'Hide timeline' : 'Show timeline'}
                >
                  <motion.div
                    animate={{ rotate: showMonthsTimeline ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={16} className="text-slate-400" />
                  </motion.div>
                </button>
              )}
            </div>
            <button
              onClick={() => setShowDateSettings(!showDateSettings)}
              className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                showDateSettings 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Set Timeline Dates</span>
              <span className="sm:hidden">Dates</span>
              {!config.startDate && !config.endDate && (
                <span className="bg-amber-400 text-white text-[8px] px-1.5 py-0.5 rounded-full">!</span>
              )}
            </button>
          </div>

          {/* Collapsible Date Picker */}
          <AnimatePresence>
            {showDateSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {/* Date Summary */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-3 mb-3">
                  <span>Start: <span className={`font-bold ${config.startDate ? 'text-slate-800' : 'text-amber-500'}`}>{formatDate(config.startDate)}</span></span>
                  <span className="text-slate-300">•</span>
                  <span>🚀 Move: <span className={`font-bold ${config.relocationDate ? 'text-red-500' : 'text-amber-500'}`}>{formatDate(config.relocationDate)}</span></span>
                  <span className="text-slate-300">•</span>
                  <span>End: <span className={`font-bold ${config.endDate ? 'text-slate-800' : 'text-amber-500'}`}>{formatDate(config.endDate)}</span></span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 mb-3">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Process Start</label>
                    <input
                      type="date"
                      value={config.startDate ? config.startDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => handleConfigUpdate('startDate', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-red-500 uppercase mb-1.5">🚀 Relocation Day</label>
                    <input
                      type="date"
                      value={config.relocationDate ? config.relocationDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => handleConfigUpdate('relocationDate', e.target.value)}
                      className="px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-red-50"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Process End</label>
                    <input
                      type="date"
                      value={config.endDate ? config.endDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => handleConfigUpdate('endDate', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* COLLAPSIBLE MONTHS DISPLAY */}
          <AnimatePresence>
            {showMonthsTimeline && config.startDate && config.endDate && timelineMonths.months.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3">
                  <p className="text-[10px] text-slate-400 mb-2 text-center">Click a month to jump to its tasks</p>
              
                  {/* Timeline container with hover arrows */}
                  <div className="relative">
                    {/* Left Arrow */}
                <div 
                  className={`absolute left-0 top-0 bottom-0 z-10 flex items-center transition-opacity duration-300 ${
                    canScrollLeft ? 'opacity-30 hover:opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  onMouseEnter={() => { setLeftArrowHover(true); startScrolling('left'); }}
                  onMouseLeave={() => { setLeftArrowHover(false); stopScrolling(); }}
                >
                  <div className={`
                    flex items-center justify-center w-10 h-full cursor-pointer
                    bg-gradient-to-r from-slate-100 via-slate-100/80 to-transparent
                    transition-all duration-200
                    ${leftArrowHover ? 'from-slate-200' : ''}
                  `}>
                    <ChevronLeft 
                      size={24} 
                      className={`text-slate-500 transition-transform ${leftArrowHover ? 'scale-125 text-slate-700' : ''}`} 
                    />
                  </div>
                </div>

                {/* Scrollable months container - hidden scrollbar */}
                <div 
                  ref={timelineRef}
                  className="overflow-x-auto pb-3 pt-1 scrollbar-none"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <div className="flex gap-2 sm:gap-3 min-w-max justify-center px-12">
                    {timelineMonths.months.map((monthDate, i) => {
                      const relocationDate = parseDate(config.relocationDate);
                      const isRelocation = relocationDate &&
                        monthDate.getMonth() === relocationDate.getMonth() &&
                        monthDate.getFullYear() === relocationDate.getFullYear();
                      const taskCount = getTaskCountForMonth(monthDate.getFullYear(), monthDate.getMonth());
                      const isActive = currentVisibleMonth !== null &&
                        monthDate.getMonth() === currentVisibleMonth.month &&
                        monthDate.getFullYear() === currentVisibleMonth.year;

                      return (
                        <div key={i} className="flex-shrink-0 text-center">
                          <MonthMarker 
                            date={monthDate} 
                            isRelocation={!!isRelocation}
                            isActive={isActive && !isRelocation}
                            taskCount={taskCount}
                            onClick={() => scrollToMonth(monthDate.getFullYear(), monthDate.getMonth())}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Arrow */}
                <div 
                  className={`absolute right-0 top-0 bottom-0 z-10 flex items-center transition-opacity duration-300 ${
                    canScrollRight ? 'opacity-30 hover:opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  onMouseEnter={() => { setRightArrowHover(true); startScrolling('right'); }}
                  onMouseLeave={() => { setRightArrowHover(false); stopScrolling(); }}
                >
                  <div className={`
                    flex items-center justify-center w-10 h-full cursor-pointer
                    bg-gradient-to-l from-slate-100 via-slate-100/80 to-transparent
                    transition-all duration-200
                    ${rightArrowHover ? 'from-slate-200' : ''}
                  `}>
                    <ChevronRight 
                      size={24} 
                      className={`text-slate-500 transition-transform ${rightArrowHover ? 'scale-125 text-slate-700' : ''}`} 
                    />
                  </div>
                </div>
              </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SCROLLABLE TASK ZONES */}
      {/* Mobile: vertical scroll | Desktop: horizontal scroll with full height cards */}
      <div 
        ref={taskZonesRef} 
        className="flex-1 overflow-y-auto lg:overflow-y-hidden lg:overflow-x-auto px-4 pb-4 pt-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* DESKTOP: Unified Horizontal Timeline */}
        <div className="hidden lg:flex lg:gap-0 h-full min-h-0">
          {config.relocationDate && allStepsGrouped.length > 0 ? (
            <>
              {allStepsGrouped.map((group, groupIndex) => {
                const relocationDate = parseDate(config.relocationDate);
                const monthDate = new Date(group.year, group.month, 15);
                const isRelocationMonth = relocationDate && 
                  monthDate.getMonth() === relocationDate.getMonth() && 
                  monthDate.getFullYear() === relocationDate.getFullYear();
                const isBeforeRelo = relocationDate && monthDate < relocationDate;
                
                // Determine zone color
                const zoneColor = isRelocationMonth 
                  ? 'bg-red-50/50 border-red-200' 
                  : isBeforeRelo 
                    ? 'bg-blue-50/30 border-blue-100' 
                    : 'bg-emerald-50/30 border-emerald-100';
                const labelColor = isRelocationMonth 
                  ? 'text-red-600' 
                  : isBeforeRelo 
                    ? 'text-blue-600' 
                    : 'text-emerald-600';
                
                return (
                  <div 
                    key={group.key} 
                    data-month-divider
                    data-year={group.year}
                    data-month={group.month}
                    className={`flex-shrink-0 flex flex-col border-r last:border-r-0 ${zoneColor} ${groupIndex === 0 ? 'rounded-l-xl' : ''} ${groupIndex === allStepsGrouped.length - 1 && undatedSteps.length === 0 ? 'rounded-r-xl' : ''}`}
                    style={{ minWidth: `${Math.max(group.steps.length * 300 + 48, 340)}px` }}
                  >
                    {/* Month Header */}
                    <div className={`flex-shrink-0 px-4 py-3 border-b ${isRelocationMonth ? 'border-red-200 bg-red-50' : isBeforeRelo ? 'border-blue-100 bg-blue-50/70' : 'border-emerald-100 bg-emerald-50/70'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-black uppercase tracking-wide ${labelColor}`}>
                          {new Date(group.year, group.month).toLocaleDateString('en-US', { month: 'long' })}
                        </span>
                        <span className={`text-sm font-bold opacity-50 ${labelColor}`}>
                          {group.year}
                        </span>
                        {isRelocationMonth && <span className="text-base">🚀</span>}
                        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${isRelocationMonth ? 'bg-red-200 text-red-700' : isBeforeRelo ? 'bg-blue-200 text-blue-700' : 'bg-emerald-200 text-emerald-700'}`}>
                          {group.steps.length} task{group.steps.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    {/* Cards Row - Fills remaining height */}
                    <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-x-visible">
                      {group.steps.map((step) => (
                        <div key={step.id} className="w-[280px] flex-shrink-0 h-full">
                          <TimelineCardDesktop
                            step={step}
                            teamMembers={teamMembers}
                            onUpdateStep={onUpdateStep}
                            onDeleteStep={onDeleteStep}
                            onToggleStatus={onToggleStatus}
                            relocationDate={parseDate(config.relocationDate)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* Unscheduled Column */}
              {undatedSteps.length > 0 && (
                <div 
                  className="flex-shrink-0 flex flex-col bg-slate-50/50 border-l-2 border-slate-300 border-dashed rounded-r-xl"
                  style={{ minWidth: `${Math.max(undatedSteps.length * 300 + 48, 340)}px` }}
                >
                  <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-slate-100/80">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black uppercase tracking-wide text-slate-500">📋 Unscheduled</span>
                      <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                        {undatedSteps.length} task{undatedSteps.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 flex gap-4 p-4">
                    {undatedSteps.map((step) => (
                      <div key={step.id} className="w-[280px] flex-shrink-0 h-full">
                        <TimelineCardDesktop
                          step={step}
                          teamMembers={teamMembers}
                          onUpdateStep={onUpdateStep}
                          onDeleteStep={onDeleteStep}
                          onToggleStatus={onToggleStatus}
                          relocationDate={parseDate(config.relocationDate)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : !config.relocationDate ? (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-shrink-0 text-center py-4 px-6 bg-amber-50 rounded-t-xl border border-amber-200">
                <span className="text-amber-600 text-sm">⚠️ Set a <strong>Relocation Day</strong> above to organize tasks</span>
              </div>
              <div className="flex-1 min-h-0 flex gap-4 p-4 bg-slate-50 rounded-b-xl">
                {sortedSteps.map((step) => (
                  <div key={step.id} className="w-[280px] flex-shrink-0 h-full">
                    <TimelineCardDesktop
                      step={step}
                      teamMembers={teamMembers}
                      onUpdateStep={onUpdateStep}
                      onDeleteStep={onDeleteStep}
                      onToggleStatus={onToggleStatus}
                      relocationDate={null}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl">
              <div className="text-center py-12">
                <div className="text-4xl mb-2">📅</div>
                <div className="text-sm font-medium">No tasks with dates yet</div>
                <div className="text-xs opacity-60">Add dates to your tasks to see them here</div>
              </div>
            </div>
          )}
        </div>

        {/* MOBILE: Vertical Stacked Layout */}
        <div className="lg:hidden space-y-6">
          {config.relocationDate && (
            <>
              {/* Before Relocation */}
              {beforeSteps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <span className="text-lg">📍</span>
                    <span className="text-xs font-bold text-blue-600 uppercase">Before Relocation</span>
                    <span className="ml-auto text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{beforeSteps.length}</span>
                  </div>
                  <div className="space-y-3">
                    {beforeSteps.map((step) => (
                      <TimelineCardMobile
                        key={step.id}
                        step={step}
                        teamMembers={teamMembers}
                        onUpdateStep={onUpdateStep}
                        onDeleteStep={onDeleteStep}
                        onToggleStatus={onToggleStatus}
                        relocationDate={parseDate(config.relocationDate)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Relocation Day Marker */}
              <div className="flex items-center gap-3 px-2">
                <div className="flex-1 h-px bg-red-200"></div>
                <div className="flex items-center gap-1 px-3 py-1 bg-red-50 rounded-full border border-red-200">
                  <span>🚀</span>
                  <span className="text-[10px] font-bold text-red-600 uppercase">Move Day</span>
                </div>
                <div className="flex-1 h-px bg-red-200"></div>
              </div>

              {/* After Relocation */}
              {afterSteps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <span className="text-lg">🎯</span>
                    <span className="text-xs font-bold text-emerald-600 uppercase">After Relocation</span>
                    <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{afterSteps.length}</span>
                  </div>
                  <div className="space-y-3">
                    {afterSteps.map((step) => (
                      <TimelineCardMobile
                        key={step.id}
                        step={step}
                        teamMembers={teamMembers}
                        onUpdateStep={onUpdateStep}
                        onDeleteStep={onDeleteStep}
                        onToggleStatus={onToggleStatus}
                        relocationDate={parseDate(config.relocationDate)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Unscheduled */}
              {undatedSteps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <span className="text-lg">📋</span>
                    <span className="text-xs font-bold text-slate-500 uppercase">Unscheduled</span>
                    <span className="ml-auto text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{undatedSteps.length}</span>
                  </div>
                  <div className="space-y-3">
                    {undatedSteps.map((step) => (
                      <TimelineCardMobile
                        key={step.id}
                        step={step}
                        teamMembers={teamMembers}
                        onUpdateStep={onUpdateStep}
                        onDeleteStep={onDeleteStep}
                        onToggleStatus={onToggleStatus}
                        relocationDate={parseDate(config.relocationDate)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* No relocation date set */}
          {!config.relocationDate && (
            <div>
              <div className="text-center mb-4 py-3 px-4 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-amber-600 text-sm">⚠️ Set a <strong>Relocation Day</strong> above</span>
              </div>
              <div className="space-y-3">
                {sortedSteps.map((step) => (
                  <TimelineCardMobile
                    key={step.id}
                    step={step}
                    teamMembers={teamMembers}
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
  );
};

// ============================================
// MOBILE CARD - Original vertical layout design
// ============================================
const TimelineCardMobile = ({
  step,
  teamMembers,
  onUpdateStep,
  onDeleteStep,
  onToggleStatus,
  relocationDate,
}: {
  step: Step;
  teamMembers: string[];
  onUpdateStep: (id: string, field: keyof Step, value: any) => void;
  onDeleteStep: (id: string) => void;
  onToggleStatus: (id: string, status: Step['status']) => void;
  relocationDate: Date | null;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  
  // Local state to prevent cursor jumping and premature dispatch
  const [localNotes, setLocalNotes] = useState(step.notes);
  const [localDate, setLocalDate] = useState(formatDateForInput(step.date));
  
  // Sync local state when step prop changes (from external updates)
  useEffect(() => {
    setLocalNotes(step.notes);
  }, [step.notes]);
  
  useEffect(() => {
    setLocalDate(formatDateForInput(step.date));
  }, [step.date]);
  
  // Calculate days relative to relocation
  const getDaysToRelocation = () => {
    const stepDate = parseDate(step.date);
    if (!stepDate || !relocationDate) return null;
    const diffTime = stepDate.getTime() - relocationDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysToRelocation = getDaysToRelocation();
  
  // Parse date for the tag
  const stepDate = parseDate(step.date);
  
  // Determine tag color based on before/after relocation
  const getTagColor = () => {
    if (!stepDate) return 'bg-slate-100 text-slate-400';
    if (!relocationDate) return 'bg-slate-200 text-slate-600';
    if (stepDate < relocationDate) return 'bg-blue-500 text-white';
    if (stepDate.getTime() === relocationDate.getTime()) return 'bg-red-500 text-white';
    return 'bg-emerald-500 text-white';
  };
  
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
      id={`task-${step.id}`}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden"
    >
      <div className="flex">
        {/* Date Tag - Left Side */}
        <div className={`flex-shrink-0 w-[18%] min-w-[70px] max-w-[90px] flex flex-col items-center justify-center py-4 px-2 ${getTagColor()}`}>
          {stepDate ? (
            <>
              <div className="text-2xl sm:text-3xl font-black leading-none">
                {stepDate.getDate()}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wide opacity-90">
                {stepDate.toLocaleString('en-US', { month: 'short' })}
              </div>
              <div className="text-[10px] sm:text-xs font-bold opacity-80">
                {stepDate.getFullYear()}
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-bold opacity-60">—</div>
              <div className="text-[9px] font-medium opacity-60 uppercase">No date</div>
            </>
          )}
        </div>
        
        {/* Card Content */}
        <div className="flex-1 p-4 min-w-0">
        
        {/* Assignee Tag */}
        <div className="mb-2 relative">
          <button
            onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
              step.assignee 
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
            }`}
          >
            👤 {step.assignee || 'Unassigned'}
          </button>
          
          {showAssigneeDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 min-w-[120px]">
              <button
                onClick={() => {
                  onUpdateStep(step.id, 'assignee', '');
                  setShowAssigneeDropdown(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${!step.assignee ? 'text-purple-600 font-bold' : 'text-slate-500'}`}
              >
                Unassigned
              </button>
              {teamMembers.map((member) => (
                <button
                  key={member}
                  onClick={() => {
                    onUpdateStep(step.id, 'assignee', member);
                    setShowAssigneeDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 ${step.assignee === member ? 'text-purple-600 font-bold bg-purple-50' : 'text-slate-700'}`}
                >
                  {member}
                </button>
              ))}
              {teamMembers.length === 0 && (
                <div className="px-3 py-1.5 text-xs text-slate-400 italic">
                  Add team members in header
                </div>
              )}
            </div>
          )}
        </div>

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
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={() => {
                  if (localNotes !== step.notes) {
                    onUpdateStep(step.id, 'notes', localNotes);
                  }
                }}
                placeholder="Add notes, details, links..."
                rows={4}
                className="w-full text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-lg px-3 py-2 outline-none border border-slate-200 focus:border-blue-300 transition-all resize-none mb-3"
              />

              {/* Budget Row */}
              <div className="flex flex-wrap items-center gap-4 mb-3">
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-500 uppercase">Optional</span>
                  <div className="flex items-center bg-amber-50 rounded-lg px-2 py-1 border border-amber-200">
                    <span className="text-xs text-amber-400 mr-1">€</span>
                    <input
                      type="number"
                      value={step.budgetDeferred || 0}
                      onChange={(e) => onUpdateStep(step.id, 'budgetDeferred', parseFloat(e.target.value) || 0)}
                      className="w-16 bg-transparent text-sm font-bold text-amber-600 outline-none text-right"
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
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              onBlur={() => {
                if (localDate !== formatDateForInput(step.date)) {
                  const date = localDate ? new Date(localDate + 'T00:00:00Z') : null;
                  onUpdateStep(step.id, 'date', date);
                }
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
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-amber-500">Opt:</span>
              <div className="flex items-center bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200">
                <span className="text-[10px] text-amber-400">€</span>
                <input
                  type="number"
                  value={step.budgetDeferred || 0}
                  onChange={(e) => onUpdateStep(step.id, 'budgetDeferred', parseFloat(e.target.value) || 0)}
                  className="w-14 bg-transparent text-xs font-bold text-amber-600 outline-none text-right"
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
      </div>
    </motion.div>
  );
};

// ============================================
// DESKTOP CARD - New horizontal layout design
// ============================================
const TimelineCardDesktop = ({
  step,
  teamMembers,
  onUpdateStep,
  onDeleteStep,
  onToggleStatus,
  relocationDate,
}: {
  step: Step;
  teamMembers: string[];
  onUpdateStep: (id: string, field: keyof Step, value: any) => void;
  onDeleteStep: (id: string) => void;
  onToggleStatus: (id: string, status: Step['status']) => void;
  relocationDate: Date | null;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  
  // Local state to prevent cursor jumping and premature dispatch
  const [localNotes, setLocalNotes] = useState(step.notes);
  const [localDate, setLocalDate] = useState(formatDateForInput(step.date));
  
  // Sync local state when step prop changes (from external updates)
  useEffect(() => {
    setLocalNotes(step.notes);
  }, [step.notes]);
  
  useEffect(() => {
    setLocalDate(formatDateForInput(step.date));
  }, [step.date]);
  
  // Calculate days relative to relocation
  const getDaysToRelocation = () => {
    const stepDate = parseDate(step.date);
    if (!stepDate || !relocationDate) return null;
    const diffTime = stepDate.getTime() - relocationDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysToRelocation = getDaysToRelocation();
  
  // Parse date for the tag
  const stepDate = parseDate(step.date);
  
  // Determine tag color based on before/after relocation
  const getTagColor = () => {
    if (!stepDate) return 'bg-gradient-to-b from-slate-100 to-slate-200 text-slate-400';
    if (!relocationDate) return 'bg-gradient-to-b from-slate-200 to-slate-300 text-slate-600';
    if (stepDate < relocationDate) return 'bg-gradient-to-b from-blue-400 to-blue-600 text-white';
    if (stepDate.getTime() === relocationDate.getTime()) return 'bg-gradient-to-b from-red-400 to-red-600 text-white';
    return 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white';
  };
  
  const statusStyles = {
    todo: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 shadow-sm',
    progress: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 shadow-sm',
    done: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-sm',
  };

  const getStatusLabel = (status: Step['status']) => {
    const labels = { todo: '📋 Todo', progress: '🔄 In Progress', done: '✅ Done' };
    return labels[status];
  };

  return (
    <motion.div
      id={`task-${step.id}`}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all h-full flex flex-col"
      style={{ 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Header Section with Date Badge */}
      <div className="flex items-stretch rounded-t-2xl overflow-hidden">
        {/* Date Tag - Left Side */}
        <div className={`flex-shrink-0 w-20 flex flex-col items-center justify-center py-4 px-3 ${getTagColor()}`}>
          {stepDate ? (
            <>
              <div className="text-3xl font-black leading-none drop-shadow-sm">
                {stepDate.getDate()}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wide opacity-90 mt-0.5">
                {stepDate.toLocaleString('en-US', { month: 'short' })}
              </div>
            </>
          ) : (
            <>
              <div className="text-xl font-bold opacity-60">—</div>
              <div className="text-[9px] font-medium opacity-60 uppercase">No date</div>
            </>
          )}
        </div>
        
        {/* Title & Status Area */}
        <div className="flex-1 p-3 bg-gradient-to-r from-slate-50/50 to-transparent min-w-0">
          {/* Top Meta Row: Assignee & Days Badge */}
          <div className="flex items-center justify-between gap-2 mb-2">
            {/* Assignee Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full transition-all ${
                  step.assignee 
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                }`}
              >
                👤 {step.assignee || 'Unassigned'}
              </button>
              
              {showAssigneeDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 min-w-[140px]">
                  <button
                    onClick={() => {
                      onUpdateStep(step.id, 'assignee', '');
                      setShowAssigneeDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${!step.assignee ? 'text-purple-600 font-bold' : 'text-slate-500'}`}
                  >
                    Unassigned
                  </button>
                  {teamMembers.map((member) => (
                    <button
                      key={member}
                      onClick={() => {
                        onUpdateStep(step.id, 'assignee', member);
                        setShowAssigneeDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-purple-50 ${step.assignee === member ? 'text-purple-600 font-bold bg-purple-50' : 'text-slate-700'}`}
                    >
                      {member}
                    </button>
                  ))}
                  {teamMembers.length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-400 italic">
                      Add team members in header
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Days Badge */}
            {daysToRelocation !== null && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                daysToRelocation < 0 
                  ? 'bg-blue-100 text-blue-700' 
                  : daysToRelocation === 0 
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
              }`}>
                {daysToRelocation === 0 
                  ? '🚀 Move day!' 
                  : daysToRelocation < 0 
                    ? `${Math.abs(daysToRelocation)}d before` 
                    : `+${daysToRelocation}d after`}
              </span>
            )}
          </div>

          {/* Title Input */}
          <input
            value={step.title}
            onChange={(e) => onUpdateStep(step.id, 'title', e.target.value)}
            placeholder="Task title..."
            className="w-full text-sm font-bold text-slate-900 bg-transparent hover:bg-white focus:bg-white rounded-lg px-2 py-1.5 outline-none border border-transparent hover:border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      {/* Content Area - Grows to fill available space */}
      <div className="flex-1 flex flex-col p-4 pt-2 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {/* Status Button Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(step.id, step.status);
            }}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${statusStyles[step.status]}`}
          >
            {getStatusLabel(step.status)}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-all"
          >
            <span>{isExpanded ? 'Less' : 'More'}</span>
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} />
            </motion.div>
          </button>
        </div>

        {/* Notes Preview (when collapsed) */}
        {!isExpanded && step.notes && (
          <p 
            className="text-xs text-slate-500 line-clamp-2 mb-3 cursor-pointer hover:text-slate-700 bg-slate-50 rounded-lg p-2"
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
              className="space-y-3"
            >
              {/* Notes Textarea */}
              <textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={() => {
                  if (localNotes !== step.notes) {
                    onUpdateStep(step.id, 'notes', localNotes);
                  }
                }}
                placeholder="Add notes, details, links..."
                rows={5}
                className="w-full text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-xl px-3 py-2.5 outline-none border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
              />

              {/* Budget Section */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">💰 Budget</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-400">Estimated</label>
                    <div className="flex items-center bg-white rounded-lg px-2 py-1.5 border border-slate-200">
                      <span className="text-xs text-slate-400">€</span>
                      <input
                        type="number"
                        value={step.budgetEstimated}
                        onChange={(e) => onUpdateStep(step.id, 'budgetEstimated', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none text-right ml-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-400">Actual</label>
                    <div className={`flex items-center rounded-lg px-2 py-1.5 border ${
                      step.budgetActual > step.budgetEstimated 
                        ? 'bg-red-50 border-red-300' 
                        : 'bg-emerald-50 border-emerald-300'
                    }`}>
                      <span className="text-xs text-slate-400">€</span>
                      <input
                        type="number"
                        value={step.budgetActual}
                        onChange={(e) => onUpdateStep(step.id, 'budgetActual', parseFloat(e.target.value) || 0)}
                        className={`w-full bg-transparent text-sm font-bold outline-none text-right ml-1 ${
                          step.budgetActual > step.budgetEstimated ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-amber-500">Optional</label>
                    <div className="flex items-center bg-amber-50 rounded-lg px-2 py-1.5 border border-amber-300">
                      <span className="text-xs text-amber-400">€</span>
                      <input
                        type="number"
                        value={step.budgetDeferred || 0}
                        onChange={(e) => onUpdateStep(step.id, 'budgetDeferred', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-sm font-bold text-amber-600 outline-none text-right ml-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer - Date Picker & Actions */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <span className="text-sm">📅</span>
          <input
            type="date"
            value={localDate}
            onChange={(e) => setLocalDate(e.target.value)}
            onBlur={() => {
              if (localDate !== formatDateForInput(step.date)) {
                const date = localDate ? new Date(localDate + 'T00:00:00Z') : null;
                onUpdateStep(step.id, 'date', date);
              }
            }}
            className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent cursor-pointer hover:border-slate-300 transition-all"
          />
        </div>

        {/* Budget Summary (compact) */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="font-medium text-slate-400">€{step.budgetEstimated}</span>
          <span className="text-slate-300">/</span>
          <span className={`font-bold ${step.budgetActual > step.budgetEstimated ? 'text-red-500' : 'text-emerald-500'}`}>
            €{step.budgetActual}
          </span>
        </div>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete "${step.title || 'this task'}"? This cannot be undone.`)) {
              onDeleteStep(step.id);
            }
          }}
          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
          title="Delete task"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
};
