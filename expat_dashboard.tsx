import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  Plus, 
  RotateCcw, 
  Save, 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  Plane,
  GripVertical
} from 'lucide-react';

// --- TIPI E INTERFACCE ---

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

// --- MASTER PLAN: IL PIANO BLINDATO ALGHERO -> CASCAIS ---
const MASTER_PLAN: Step[] = [
  // FASE 0: STRATEGIA FISCALE
  {
    id: '0-1',
    phase: '0. Strategia',
    title: 'Master Udacity / Woolf',
    notes: 'Verifica accreditamento EQF Level 7 per IFICI "Route C". Sblocca il regime fiscale senza certificazione Startup.',
    budgetEstimated: 600,
    budgetActual: 0,
    status: 'progress'
  },
  {
    id: '0-2',
    phase: '0. Strategia',
    title: 'Assetto Fiscale',
    notes: '2026-27: Recibo Verde (Freelance). 2028: Unipessoal Lda + IFICI. Mantenere fatturato estero.',
    budgetEstimated: 0,
    budgetActual: 0,
    status: 'todo'
  },

  // FASE 1: USCITA ITALIA
  {
    id: '1-1',
    phase: '1. Uscita IT',
    title: 'Garage Alghero',
    notes: 'Affitto 12 mesi per stoccaggio. Evita costi di spedizione immediati se si decide di tornare.',
    budgetEstimated: 1800,
    budgetActual: 0,
    status: 'todo'
  },
  {
    id: '1-2',
    phase: '1. Uscita IT',
    title: 'The Purge',
    notes: 'Robivecchi locale per svuotare casa in un giorno. Vendere o buttare tutto il superfluo.',
    budgetEstimated: 500,
    budgetActual: 0,
    status: 'todo'
  },
  {
    id: '1-3',
    phase: '1. Uscita IT',
    title: 'Auto: Fase Italia',
    notes: 'Pagare 2 bolli pendenti e fare revisione. NON chiudere finanziamento Avvera ora. Tenere targhe IT.',
    budgetEstimated: 200,
    budgetActual: 0,
    status: 'todo'
  },
  {
    id: '1-4',
    phase: '1. Uscita IT',
    title: 'Fisco: Stop Acconti',
    notes: 'Commercialista: applicare "Metodo Previsionale". Non pagare acconti IRPEF 2026 a giugno/nov.',
    budgetEstimated: 0,
    budgetActual: 0,
    status: 'todo'
  },

  // FASE 2: TRANSIZIONE
  {
    id: '2-1',
    phase: '2. Transizione',
    title: 'Affitto Cascais',
    notes: 'Budget ingresso aggressivo: 1 mese + 2 caparra. Se no T2 subito -> Airbnb 1 mese.',
    budgetEstimated: 7500,
    budgetActual: 0,
    status: 'todo'
  },
  {
    id: '2-2',
    phase: '2. Transizione',
    title: 'La Traversata',
    notes: 'Ferry Porto Torres -> BCN. Auto -> Madrid -> Cascais. Benzina, pedaggi e hotel inclusi.',
    budgetEstimated: 900,
    budgetActual: 0,
    status: 'todo'
  },

  // FASE 3: SETUP PT
  {
    id: '3-1',
    phase: '3. Landing PT',
    title: 'Legal Package',
    notes: 'Avvocato per NIF, NISS, Conto Banca e CRUE (Residenza). Priorità assoluta all\'arrivo.',
    budgetEstimated: 2500,
    budgetActual: 0,
    status: 'todo'
  },
  {
    id: '3-2',
    phase: '3. Landing PT',
    title: 'Auto: Targa PT',
    notes: 'Entro 6 mesi: pratica Matriculação + Esenzione ISV (con prova 12 mesi residenza IT).',
    budgetEstimated: 700,
    budgetActual: 0,
    status: 'todo'
  },
  {
    id: '3-3',
    phase: '3. Landing PT',
    title: 'Auto: Radiazione IT',
    notes: 'SOLO DOPO aver ottenuto targhe PT. Fare pratica al PRA tramite consolato per stop bollo.',
    budgetEstimated: 150,
    budgetActual: 0,
    status: 'todo'
  },
  {
    id: '3-4',
    phase: '3. Landing PT',
    title: 'Iscrizione AIRE',
    notes: 'Appena ottenuto contratto e CRUE. Fondamentale per il "Clean Break" fiscale 2026.',
    budgetEstimated: 0,
    budgetActual: 0,
    status: 'todo'
  },
  {
    id: '4-1',
    phase: '4. Futuro',
    title: 'Spedizione Scatole',
    notes: 'Opzionale: se si resta, sblocco garage Alghero e spedizione finale.',
    budgetEstimated: 2000,
    budgetActual: 0,
    status: 'todo'
  }
];

// --- COMPONENTI UI COMPATTI ---

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

// --- APP PRINCIPALE ---

export default function ExpatDashboard() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Drag & Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    const savedData = localStorage.getItem('expat-ops-compact-2026');
    if (savedData) {
      try {
        setSteps(JSON.parse(savedData));
      } catch (e) {
        setSteps(MASTER_PLAN);
      }
    } else {
      setSteps(MASTER_PLAN);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('expat-ops-compact-2026', JSON.stringify(steps));
    }
  }, [steps, isLoaded]);

  // --- LOGICA ---

  const handleSort = () => {
    // Duplicate items
    let _steps = [...steps];
    // Remove and save the dragged item content
    const draggedItemContent = _steps.splice(dragItem.current!, 1)[0];
    // Switch the position
    _steps.splice(dragOverItem.current!, 0, draggedItemContent);
    // Reset positions
    dragItem.current = null;
    dragOverItem.current = null;
    // Update actual array
    setSteps(_steps);
  };

  const updateStep = (id: string, field: keyof Step, value: any) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const toggleStatus = (id: string, current: StepStatus) => {
    const next: Record<StepStatus, StepStatus> = {
      'todo': 'progress',
      'progress': 'done',
      'done': 'todo'
    };
    updateStep(id, 'status', next[current]);
  };

  const deleteStep = (id: string) => {
    if (confirm('Eliminare questa scheda?')) {
      setSteps(prev => prev.filter(s => s.id !== id));
    }
  };

  const addStep = () => {
    const newStep: Step = {
      id: Date.now().toString(),
      phase: 'Nuova Fase',
      title: 'Nuovo Task',
      notes: '',
      budgetEstimated: 0,
      budgetActual: 0,
      status: 'todo'
    };
    setSteps([newStep, ...steps]); // Aggiungi in cima
  };

  const resetToMaster = () => {
    if (confirm('Ripristinare il piano originale? Perderai le modifiche.')) {
      setSteps(MASTER_PLAN);
    }
  };

  // KPI
  const totalEst = steps.reduce((sum, s) => sum + s.budgetEstimated, 0);
  const totalAct = steps.reduce((sum, s) => sum + s.budgetActual, 0);
  const variance = totalAct - totalEst;
  const progress = Math.round((steps.filter(s => s.status === 'done').length / steps.length) * 100) || 0;

  if (!isLoaded) return <div className="flex h-screen items-center justify-center text-slate-400">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      
      {/* HEADER FISSO */}
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

          {/* MINI KPI NEL HEADER */}
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
            <div className="flex flex-col items-end w-12">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
              <span className="text-sm font-black text-emerald-500">{progress}%</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={addStep} className="bg-slate-900 text-white p-2 rounded hover:bg-slate-700 transition" title="Aggiungi">
              <Plus size={18} />
            </button>
            <button onClick={resetToMaster} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition" title="Reset">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {/* GRIGLIA DRAGGABILE */}
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
              
              {/* Maniglia Drag */}
              <div className="absolute top-2 left-2 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 p-1">
                <GripVertical size={14} />
              </div>

              {/* Contenuto Card */}
              <div className="p-3 pl-8 flex flex-col h-full gap-2">
                
                {/* Header Card */}
                <div className="flex justify-between items-start">
                  <div className="w-full">
                    <input 
                      value={step.phase}
                      onChange={(e) => updateStep(step.id, 'phase', e.target.value)}
                      className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-transparent focus:bg-blue-50 rounded w-full outline-none mb-0.5"
                    />
                    <input 
                      value={step.title}
                      onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                      className="text-sm font-bold text-slate-900 bg-transparent focus:bg-slate-50 rounded w-full outline-none"
                      placeholder="Titolo..."
                    />
                  </div>
                </div>

                {/* Note Area */}
                <textarea 
                  value={step.notes}
                  onChange={(e) => updateStep(step.id, 'notes', e.target.value)}
                  className="w-full text-xs text-slate-500 bg-slate-50 border border-transparent focus:border-blue-100 focus:bg-white rounded p-1.5 resize-none flex-grow outline-none min-h-[60px]"
                  placeholder="Note..."
                />

                {/* Footer: Budget & Actions */}
                <div className="flex items-end justify-between mt-1 pt-2 border-t border-slate-100">
                  
                  {/* Budget Inputs */}
                  <div className="flex gap-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Est.</span>
                      <CompactBudgetInput value={step.budgetEstimated} onChange={(v) => updateStep(step.id, 'budgetEstimated', v)} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Real</span>
                      <CompactBudgetInput value={step.budgetActual} onChange={(v) => updateStep(step.id, 'budgetActual', v)} isActual />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1">
                    <button 
                      onClick={() => deleteStep(step.id)}
                      className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                    <StatusBadge status={step.status} onClick={() => toggleStatus(step.id, step.status)} />
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State Help */}
        {steps.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p>Nessuno step presente. Inizia aggiungendone uno o resetta.</p>
            <button onClick={resetToMaster} className="mt-4 text-blue-600 font-bold hover:underline">Ripristina Default</button>
          </div>
        )}

      </main>
    </div>
  );
}