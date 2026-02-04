import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { 
  Plus, 
  Plane,
  LogOut,
  Users,
  X,
  Download
} from 'lucide-react';
import { signInWithGoogle, signOut, onAuthChange } from './authService';
import { 
  addStep, 
  updateStep, 
  deleteStep, 
  subscribeToUserSteps,
  getUserSettings,
  saveUserSettings,
  type Step
} from './firestoreService';
import { type RelocationConfig } from './components/RelocationConfig';
import { TimelineView } from './components/TimelineView';

// --- COMPONENTI UI ---

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
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
      >
        Sign in with Google
      </button>
    </div>
  </div>
);

// --- APP PRINCIPALE ---

export default function ExpatDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [relocationConfig, setRelocationConfig] = useState<RelocationConfig>({
    startDate: null,
    relocationDate: null,
    endDate: null,
  });

  // Load user settings (relocation config) from Firestore
  const loadUserSettings = useCallback(async (userId: string) => {
    console.log('Loading user settings for:', userId);
    const settings = await getUserSettings(userId);
    console.log('Loaded settings:', settings);
    if (settings) {
      setRelocationConfig({
        startDate: settings.relocationStartDate ? new Date(settings.relocationStartDate) : null,
        relocationDate: settings.relocationDate ? new Date(settings.relocationDate) : null,
        endDate: settings.relocationEndDate ? new Date(settings.relocationEndDate) : null,
      });
      setTeamMembers(settings.teamMembers || []);
    }
  }, []);

  // Save relocation config to Firestore
  const handleRelocationConfigUpdate = useCallback((config: RelocationConfig) => {
    setRelocationConfig(config);
    if (user) {
      const settingsToSave = {
        relocationStartDate: config.startDate?.toISOString() ?? null,
        relocationDate: config.relocationDate?.toISOString() ?? null,
        relocationEndDate: config.endDate?.toISOString() ?? null,
        teamMembers: teamMembers,
      };
      console.log('Saving settings:', settingsToSave);
      saveUserSettings(user.uid, settingsToSave)
        .then(() => console.log('Settings saved successfully'))
        .catch(err => console.error('Error saving settings:', err));
    }
  }, [user, teamMembers]);

  // Save team members separately
  const handleTeamMembersUpdate = useCallback((members: string[]) => {
    setTeamMembers(members);
    if (user) {
      saveUserSettings(user.uid, { teamMembers: members })
        .catch(err => console.error('Error saving team members:', err));
    }
  }, [user]);

  // Auth state listener
  useEffect(() => {
    const unsubFunc = onAuthChange((authUser) => {
      setUser(authUser);
      
      if (authUser) {
        // Load user settings
        loadUserSettings(authUser.uid);
        
        // Subscribe to user's steps from Firestore
        const unsubSteps = subscribeToUserSteps(authUser.uid, (firestoreSteps) => {
          setSteps(firestoreSteps);
          setIsLoaded(true);
        });
        setUnsubscribe(() => unsubSteps);
      } else {
        // Not logged in - show empty
        setSteps([]);
        setIsLoaded(true);
        if (unsubscribe) unsubscribe();
      }
    });

    return () => unsubFunc();
  }, [loadUserSettings]);

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

  const handleUpdateStep = (id: string, field: keyof Step, value: any) => {
    // Update local state immediately for UX
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    
    // Save to Firestore if logged in (fire and forget)
    if (user && !id.startsWith('demo-')) {
      updateStep(id, { [field]: value } as any).catch(err => 
        console.error('Error saving to Firebase:', err)
      );
    }
  };

  const handleToggleStatus = (id: string, current: Step['status']) => {
    const next: Record<Step['status'], Step['status']> = {
      'todo': 'progress',
      'progress': 'done',
      'done': 'todo'
    };
    handleUpdateStep(id, 'status', next[current]);
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
        budgetDeferred: 0,
        status: 'todo',
        date: null,
        orderIndex: steps.length,
      });

      // Local state will be updated by Firestore listener
    } catch (error) {
      console.error('Error adding step:', error);
    }
  };

  // KPI
  const totalEst = steps.reduce((sum, s) => sum + s.budgetEstimated, 0);
  const totalAct = steps.reduce((sum, s) => sum + s.budgetActual, 0);
  const totalDeferred = steps.reduce((sum, s) => sum + (s.budgetDeferred || 0), 0);
  const progress = Math.round((steps.filter(s => s.status === 'done').length / steps.length) * 100) || 0;

  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Export functions
  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    // Handle Firestore Timestamp
    if (date && typeof date.toDate === 'function') return date.toDate();
    // Handle ISO string or other string formats
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const exportAsJSON = () => {
    const exportData = {
      project: 'EXPAT OPS 2026',
      route: 'Alghero → Cascais',
      exportedAt: new Date().toISOString(),
      config: {
        startDate: relocationConfig.startDate?.toISOString() ?? null,
        relocationDate: relocationConfig.relocationDate?.toISOString() ?? null,
        endDate: relocationConfig.endDate?.toISOString() ?? null,
      },
      teamMembers,
      summary: {
        totalTasks: steps.length,
        completedTasks: steps.filter(s => s.status === 'done').length,
        inProgressTasks: steps.filter(s => s.status === 'progress').length,
        todoTasks: steps.filter(s => s.status === 'todo').length,
        budgetEstimated: totalEst,
        budgetActual: totalAct,
        budgetOptional: totalDeferred,
        progress: `${progress}%`,
      },
      tasks: steps.map(s => ({
        id: s.id,
        title: s.title,
        notes: s.notes,
        status: s.status,
        date: s.date instanceof Date ? s.date.toISOString() : s.date,
        assignee: s.assignee || null,
        budgetEstimated: s.budgetEstimated,
        budgetActual: s.budgetActual,
        budgetOptional: s.budgetDeferred || 0,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expat-ops-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportAsMarkdown = () => {
    const formatDate = (date: Date | string | null) => {
      const d = parseDate(date);
      if (!d) return 'Not set';
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Group tasks by month
    const sortedSteps = [...steps].sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });

    const groupedByMonth: Record<string, typeof steps> = {};
    const undated: typeof steps = [];

    sortedSteps.forEach(step => {
      const d = parseDate(step.date);
      if (!d) {
        undated.push(step);
      } else {
        const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        if (!groupedByMonth[label]) groupedByMonth[label] = [];
        groupedByMonth[label].push(step);
      }
    });

    const statusEmoji = { todo: '⬜', progress: '🔄', done: '✅' };

    let md = `# EXPAT OPS 2026\n`;
    md += `**Route:** Alghero → Cascais\n\n`;
    md += `**Exported:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
    md += `---\n\n`;

    md += `## Timeline\n`;
    md += `- **Start Date:** ${formatDate(relocationConfig.startDate)}\n`;
    md += `- **Relocation Date:** ${formatDate(relocationConfig.relocationDate)}\n`;
    md += `- **End Date:** ${formatDate(relocationConfig.endDate)}\n\n`;

    if (teamMembers.length > 0) {
      md += `## Team\n`;
      teamMembers.forEach(m => {
        const count = steps.filter(s => s.assignee === m).length;
        md += `- **${m}** (${count} tasks)\n`;
      });
      md += `\n`;
    }

    md += `## Summary\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Tasks | ${steps.length} |\n`;
    md += `| Completed | ${steps.filter(s => s.status === 'done').length} |\n`;
    md += `| In Progress | ${steps.filter(s => s.status === 'progress').length} |\n`;
    md += `| Todo | ${steps.filter(s => s.status === 'todo').length} |\n`;
    md += `| Budget (Est.) | €${totalEst.toLocaleString()} |\n`;
    md += `| Budget (Actual) | €${totalAct.toLocaleString()} |\n`;
    md += `| Budget (Optional) | €${totalDeferred.toLocaleString()} |\n`;
    md += `| Progress | ${progress}% |\n\n`;

    md += `---\n\n`;
    md += `## Tasks by Month\n\n`;

    Object.entries(groupedByMonth).forEach(([month, tasks]) => {
      md += `### ${month}\n\n`;
      tasks.forEach(task => {
        const d = parseDate(task.date);
        const dateStr = d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No date';
        const assigneeStr = task.assignee || 'Unassigned';
        md += `${statusEmoji[task.status]} **${task.title}**\n`;
        md += `   📅 ${dateStr} | 👤 ${assigneeStr}\n`;
        if (task.notes) md += `   > ${task.notes.replace(/\n/g, '\n   > ')}\n`;
        md += `\n`;
      });
    });

    if (undated.length > 0) {
      md += `### Unscheduled\n\n`;
      undated.forEach(task => {
        const assigneeStr = task.assignee || 'Unassigned';
        md += `${statusEmoji[task.status]} **${task.title}**\n`;
        md += `   📅 No date | 👤 ${assigneeStr}\n`;
        if (task.notes) md += `   > ${task.notes.replace(/\n/g, '\n   > ')}\n`;
        md += `\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expat-ops-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center text-slate-400">Loading...</div>;

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen h-screen bg-slate-100 text-slate-800 font-sans flex flex-col overflow-hidden">
      
      {/* HEADER */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 z-20 shadow-sm px-4 py-3">
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
              <span className="text-[10px] font-bold text-amber-500 uppercase">Optional</span>
              <span className="text-sm font-bold text-amber-600">€ {totalDeferred.toLocaleString()}</span>
            </div>
            <div className="h-6 w-px bg-slate-300"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
              <span className="text-sm font-black text-emerald-500">{progress}%</span>
            </div>
          </div>

          {/* TEAM MEMBERS */}
          <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
            <Users size={14} className="text-purple-500" />
            <div className="flex items-center gap-1 flex-wrap">
              {teamMembers.map((member, i) => {
                const taskCount = steps.filter(s => s.assignee === member).length;
                return (
                  <span 
                    key={i} 
                    className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  >
                    {member}
                    <span className="bg-purple-500 text-white text-[8px] px-1 rounded-full">{taskCount}</span>
                    <button
                      onClick={() => handleTeamMembersUpdate(teamMembers.filter((_, idx) => idx !== i))}
                      className="text-purple-400 hover:text-purple-700 ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
              <button
                onClick={() => {
                  const name = prompt('Add team member name:');
                  if (name && name.trim() && !teamMembers.includes(name.trim())) {
                    handleTeamMembersUpdate([...teamMembers, name.trim()]);
                  }
                }}
                className="text-purple-500 hover:text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-purple-100 transition"
              >
                + Add
              </button>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <div className="text-xs text-slate-500">{user?.email}</div>
            
            {/* Export Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)} 
                className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 transition" 
                title="Export"
              >
                <Download size={18} />
              </button>
              {showExportMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 min-w-[140px]">
                    <button
                      onClick={exportAsJSON}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span className="text-slate-400">{ }</span>
                      <span>Export JSON</span>
                    </button>
                    <button
                      onClick={exportAsMarkdown}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span className="text-slate-400">#</span>
                      <span>Export Markdown</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <button onClick={handleAddStep} className="bg-slate-900 text-white p-2 rounded hover:bg-slate-700 transition" title="Aggiungi">
              <Plus size={18} />
            </button>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <TimelineView
          steps={steps}
          config={relocationConfig}
          teamMembers={teamMembers}
          onUpdateConfig={handleRelocationConfigUpdate}
          onUpdateStep={handleUpdateStep}
          onDeleteStep={handleDeleteStep}
          onToggleStatus={handleToggleStatus}
        />
      </main>
    </div>
  );
}
