import { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { 
  Trash2, 
  Plus, 
  RotateCcw, 
  Plane,
  GripVertical,
  LogOut
} from 'lucide-react';
import { signInWithGoogle, signOut, onAuthChange } from './authService';
import { 
  addStep, 
  updateStep, 
  deleteStep, 
  subscribeToUserSteps
} from './firestoreService';

// --- LOCAL TYPES ---

type StepStatus = 'todo' | 'progress' | 'done';

interface Step {
  id: string;
  phase: string;
  title: string;
  notes: string;
  budgetEstimated: number;
  budgetActual: number;
  status: StepStatus;
}

// --- DEMO DATA ---
const DEMO_PLAN: Step[] = [
  {
    id: 'demo-0-1',
    phase: '0. Strategia',
    title: 'Master Udacity / Woolf',
    notes: 'Verifica accreditamento EQF Level 7 per IFICI "Route C". Sblocca il regime fiscale senza certificazione Startup.',
    budgetEstimated: 600,
    budgetActual: 0,
    status: 'progress'
  },
  {
    id: 'demo-0-2',
    phase: '0. Strategia',
    title: 'Assetto Fiscale',
    notes: '2026-27: Recibo Verde (Freelance). 2028: Unipessoal Lda + IFICI. Mantenere fatturato estero.',
    budgetEstimated: 0,
    budgetActual: 0,
    status: 'todo'
  },
  {
    id: 'demo-1-1',
    phase: '1. Uscita IT',
    title: 'Garage Alghero',
    notes: 'Affitto 12 mesi per stoccaggio. Evita costi di spedizione immediati se si decide di tornare.',
    budgetEstimated: 1800,
    budgetActual: 0,
    status: 'todo'
  },
];

// --- COMPONENTI UI ---

const StatusBadge = ({ status, onClick }: { status: StepStatus, onClick: () => void }) => {
  const styles = {
    todo: 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200',
    progress: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',
    done: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200'
  };
  
  const labels = { todo: 'Da Fare', progress: 'In Corso', done: 'Fatto' };

  return (
    <button 
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors ${styles[status]}`}
    >
      {labels[status]}
    </button>
  );
};

const CompactBudgetInput = ({ value, onChange, isActual }: { value: number, onChange: (val: number) => void, isActual?: boolean }) => (
  <div className={`flex items-center rounded px-1.5 py-0.5 border ${isActual ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white'}`}>
    <span className={`text-[10px] mr-1 ${isActual ? 'text-blue-400' : 'text-slate-400'}`}>€</span>
    <input 
      type="number" 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-12 bg-transparent text-xs font-semibold focus:outline-none text-right"
      placeholder="0"
    />
  </div>
);

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
      <div className="flex justify-center mb-6">
        <div className="bg-blue-600 text-white p-3 rounded-lg">
          <Plane size={32} />
        </div>
      </div>
      <h1 className="text-3xl font-black text-center text-slate-900 mb-2">EXPAT OPS 2026</h1>
      <p className="text-center text-slate-500 mb-8">Alghero → Cascais</p>
      
      <button
        onClick={onLogin}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors mb-4"
      >
        Sign in with Google
      </button>
      
      <div className="bg-slate-50 p-4 rounded-lg text-center">
        <p className="text-xs text-slate-500 mb-3">Demo Preview</p>
        <div className="space-y-2">
          {DEMO_PLAN.slice(0, 2).map(step => (
            <div key={step.id} className="text-left bg-white p-2 rounded border border-slate-200">
              <p className="text-xs font-bold text-blue-600">{step.phase}</p>
              <p className="text-sm font-semibold text-slate-900">{step.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// --- APP PRINCIPALE ---

export default function ExpatDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  
  // Drag & Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Auth state listener
  useEffect(() => {
    const unsubFunc = onAuthChange((authUser) => {
      setUser(authUser);
      
      if (authUser) {
        // Subscribe to user's steps from Firestore
        const unsubSteps = subscribeToUserSteps(authUser.uid, (firestoreSteps) => {
          // Convert Firestore documents to local format
          const localSteps: Step[] = firestoreSteps.map(fStep => ({
            id: fStep.id,
            phase: fStep.phase,
            title: fStep.title,
            notes: fStep.notes,
            budgetEstimated: fStep.budgetEstimated,
            budgetActual: fStep.budgetActual,
            status: fStep.status,
          }));
          setSteps(localSteps);
          setIsLoaded(true);
        });
        setUnsubscribe(() => unsubSteps);
      } else {
        // Not logged in, show demo
        setSteps(DEMO_PLAN);
        setIsLoaded(true);
        if (unsubscribe) unsubscribe();
      }
    });

    return () => unsubFunc();
  }, []);

  // --- HANDLERS ---

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSort = () => {
    let _steps = [...steps];
    const draggedItemContent = _steps.splice(dragItem.current!, 1)[0];
    _steps.splice(dragOverItem.current!, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setSteps(_steps);
  };

  const handleUpdateStep = async (id: string, field: keyof Step, value: any) => {
    // Update local state immediately for UX
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    
    // Save to Firestore if logged in
    if (user && !id.startsWith('demo-')) {
      try {
        await updateStep(id, { [field]: value } as any);
      } catch (error) {
        console.error('Error saving to Firebase:', error);
      }
    }
  };

  const handleToggleStatus = async (id: string, current: StepStatus) => {
    const next: Record<StepStatus, StepStatus> = {
      'todo': 'progress',
      'progress': 'done',
      'done': 'todo'
    };
    await handleUpdateStep(id, 'status', next[current]);
  };

  const handleDeleteStep = async (id: string) => {
    if (confirm('Eliminare questa scheda?')) {
      setSteps(prev => prev.filter(s => s.id !== id));
      
      if (user && !id.startsWith('demo-')) {
        try {
          await deleteStep(id);
        } catch (error) {
          console.error('Error deleting from Firebase:', error);
        }
      }
    }
  };

  const handleAddStep = async () => {
    if (!user) {
      alert('Effettua il login per aggiungere nuovi step');
      return;
    }

    try {
      await addStep({
        phase: 'Nuova Fase',
        title: 'Nuovo Task',
        notes: '',
        budgetEstimated: 0,
        budgetActual: 0,
        status: 'todo'
      });

      // Local state will be updated by Firestore listener
    } catch (error) {
      console.error('Error adding step:', error);
    }
  };

  const handleResetToDemo = () => {
    if (confirm('Ripristinare il demo plan?')) {
      setSteps(DEMO_PLAN);
    }
  };

  // KPI
  const totalEst = steps.reduce((sum, s) => sum + s.budgetEstimated, 0);
  const totalAct = steps.reduce((sum, s) => sum + s.budgetActual, 0);
  const progress = Math.round((steps.filter(s => s.status === 'done').length / steps.length) * 100) || 0;

  if (!isLoaded) return <div className="flex h-screen items-center justify-center text-slate-400">Loading...</div>;

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-1.5 rounded">
              <Plane size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-none">EXPAT OPS 2026</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alghero → Cascais</p>
            </div>
          </div>

          {/* KPI */}
          <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Budget</span>
              <span className="text-sm font-bold">€ {totalEst.toLocaleString()}</span>
            </div>
            <div className="h-6 w-px bg-slate-300"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Reale</span>
              <span className={`text-sm font-bold ${totalAct > totalEst ? 'text-red-500' : 'text-blue-600'}`}>
                € {totalAct.toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-300"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
              <span className="text-sm font-black text-emerald-500">{progress}%</span>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <div className="text-xs text-slate-500">{user?.email}</div>
            <button onClick={handleAddStep} className="bg-slate-900 text-white p-2 rounded hover:bg-slate-700 transition" title="Aggiungi">
              <Plus size={18} />
            </button>
            <button onClick={handleResetToDemo} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition" title="Reset">
              <RotateCcw size={18} />
            </button>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              draggable
              onDragStart={() => (dragItem.current = index)}
              onDragEnter={() => (dragOverItem.current = index)}
              onDragEnd={handleSort}
              onDragOver={(e) => e.preventDefault()}
              className={`
                group relative bg-white rounded-lg border flex flex-col transition-all duration-200 hover:shadow-md
                ${step.status === 'done' ? 'opacity-60 bg-slate-50 border-slate-200' : 'border-slate-200'}
                ${dragItem.current === index ? 'opacity-0' : ''}
              `}
            >
              
              <div className="absolute top-2 left-2 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 p-1">
                <GripVertical size={14} />
              </div>

              <div className="p-3 pl-8 flex flex-col h-full gap-2">
                
                <div className="flex justify-between items-start">
                  <div className="w-full">
                    <input 
                      value={step.phase}
                      onChange={(e) => handleUpdateStep(step.id, 'phase', e.target.value)}
                      className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-transparent focus:bg-blue-50 rounded w-full outline-none mb-0.5"
                    />
                    <input 
                      value={step.title}
                      onChange={(e) => handleUpdateStep(step.id, 'title', e.target.value)}
                      className="text-sm font-bold text-slate-900 bg-transparent focus:bg-slate-50 rounded w-full outline-none"
                      placeholder="Titolo..."
                    />
                  </div>
                </div>

                <textarea 
                  value={step.notes}
                  onChange={(e) => handleUpdateStep(step.id, 'notes', e.target.value)}
                  className="w-full text-xs text-slate-500 bg-slate-50 border border-transparent focus:border-blue-100 focus:bg-white rounded p-1.5 resize-none flex-grow outline-none min-h-[60px]"
                  placeholder="Note..."
                />

                <div className="flex items-end justify-between mt-1 pt-2 border-t border-slate-100">
                  
                  <div className="flex gap-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Est.</span>
                      <CompactBudgetInput value={step.budgetEstimated} onChange={(v) => handleUpdateStep(step.id, 'budgetEstimated', v)} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Real</span>
                      <CompactBudgetInput value={step.budgetActual} onChange={(v) => handleUpdateStep(step.id, 'budgetActual', v)} isActual />
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <button 
                      onClick={() => handleDeleteStep(step.id)}
                      className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                    <StatusBadge status={step.status} onClick={() => handleToggleStatus(step.id, step.status)} />
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
