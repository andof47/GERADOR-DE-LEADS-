
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { generateLeads, generateOutreachEmail } from './services/geminiService';
import type { Lead, Note, Task, AppNotification } from './types';
import { LeadStatus } from './types';
import Header, { type ActiveView } from './components/Header';
import Modal from './components/Modal';
import { SparklesIcon, CalendarDaysIcon, PlusIcon, TrashIcon, PencilIcon } from './components/Icons';
import KanbanBoard from './components/KanbanBoard';
import FilterBar from './components/FilterBar';
import OrganizedList from './components/OrganizedList';
import Settings from './components/Settings';
import MapView from './components/MapView';

const App: React.FC = () => {
  const [productCriteria, setProductCriteria] = useState<string>('');
  const [locationCriteria, setLocationCriteria] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<{ searchText: string; status: LeadStatus | 'all' }>({ searchText: '', status: 'all' });
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  
  // States for Notes
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState<{ id: string, content: string } | null>(null);

  // States for Tasks
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [generatedEmail, setGeneratedEmail] = useState<string>('');
  const [isEmailLoading, setIsEmailLoading] = useState<boolean>(false);

  const [activeView, setActiveView] = useState<ActiveView>('crm');

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const LOCAL_STORAGE_KEY = 'ai-lead-generator-crm-leads';
  const NOTIFICATION_CHECK_KEY = 'last-notification-check';

  // Function to Request Browser Notification Permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('Este navegador não suporta notificações de desktop.');
        return;
    }
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        await Notification.requestPermission();
    }
  };

  // Function to send Browser Notification
  const sendBrowserNotification = (title: string, body: string) => {
      if (Notification.permission === 'granted') {
          new Notification(title, {
              body,
              icon: '/vite.svg' // Using the vite default icon as placeholder
          });
      }
  };

  // Check for due tasks logic
  useEffect(() => {
    const checkDueTasks = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Prevent checking too often (e.g., only once per session or reload) to avoid spam
        // For this demo, we check on mount.
        
        const newNotifications: AppNotification[] = [];
        let overdueCount = 0;
        let todayCount = 0;

        leads.forEach(lead => {
            if (!lead.tasks) return;
            
            lead.tasks.forEach(task => {
                if (task.isCompleted) return;

                const dueDate = new Date(task.dueDate);
                // Ajuste de fuso para comparação correta da data (apenas dia)
                const dueDateMidnight = new Date(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());

                if (dueDateMidnight < today) {
                    overdueCount++;
                    newNotifications.push({
                        id: `notif-overdue-${task.id}`,
                        title: 'Tarefa Atrasada',
                        message: `"${task.content}" para ${lead.companyName} estava agendada para ${dueDate.toLocaleDateString('pt-BR', {timeZone: 'UTC'})}.`,
                        date: new Date().toISOString(),
                        read: false,
                        type: 'warning',
                        leadId: lead.id
                    });
                } else if (dueDateMidnight.getTime() === today.getTime()) {
                    todayCount++;
                    newNotifications.push({
                        id: `notif-today-${task.id}`,
                        title: 'Tarefa para Hoje',
                        message: `"${task.content}" para ${lead.companyName} vence hoje.`,
                        date: new Date().toISOString(),
                        read: false,
                        type: 'info',
                        leadId: lead.id
                    });
                }
            });
        });

        // Update internal notifications state
        if (newNotifications.length > 0) {
             setNotifications(prev => {
                // Filter out notifications that already exist to prevent duplicates on re-renders
                const existingIds = new Set(prev.map(n => n.id));
                const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
                return [...uniqueNew, ...prev];
             });

             // Send Browser Notification Summary
             if (overdueCount > 0 || todayCount > 0) {
                 const title = "Atualização de Tarefas";
                 const msg = `Você tem ${todayCount} tarefas para hoje e ${overdueCount} atrasadas.`;
                 sendBrowserNotification(title, msg);
             }
        }
    };

    // Check on mount if leads are loaded
    if (leads.length > 0) {
        requestNotificationPermission().then(() => {
            checkDueTasks();
        });
    }

  }, [leads.length]); // Depend only on length to avoid loops, assumes deep content doesn't change abruptly for notifs on mount

  useEffect(() => {
    try {
      const savedLeadsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedLeadsRaw) {
        const savedLeads = JSON.parse(savedLeadsRaw);
        if (Array.isArray(savedLeads)) {
          // Data sanitization for backward compatibility and robustness
          const sanitizedLeads = savedLeads.map(lead => ({
            ...lead,
            keyContacts: Array.isArray(lead.keyContacts) ? lead.keyContacts : (typeof lead.keyContacts === 'string' && lead.keyContacts.length > 0 ? [lead.keyContacts] : []),
            notes: Array.isArray(lead.notes) ? lead.notes : [],
            tasks: Array.isArray(lead.tasks) ? lead.tasks : [],
          }));
          setLeads(sanitizedLeads);
        }
      }
    } catch (e) {
      console.error("Falha ao carregar leads do localStorage", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(leads));
  }, [leads]);

  const handleGenerateLeads = async () => {
    if (!companyName.trim() && (!productCriteria.trim() || !locationCriteria.trim())) {
      setError('Por favor, preencha o nome da empresa OU o setor e a localização.');
      return;
    }

    const getUserCoordinates = (): Promise<{ latitude: number; longitude: number; }> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocalização não é suportada pelo seu navegador."));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }),
                (error) => reject(error)
            );
        });
    };

    setIsLoading(true);
    setError(null);
    try {
      let userCoords;
      try {
          userCoords = await getUserCoordinates();
      } catch (geoError: any) {
          console.warn("Não foi possível obter a geolocalização:", geoError.message);
          // Continua sem as coordenadas, não é um erro fatal.
      }
      
      const newLeads = await generateLeads(productCriteria, locationCriteria, companyName, userCoords);
      setLeads(prevLeads => {
        const favoritedLeads = prevLeads.filter(l => l.isSaved);
        const favoritedCompanyNames = new Set(favoritedLeads.map(l => l.companyName));
        const uniqueNewLeads = newLeads.filter(l => !favoritedCompanyNames.has(l.companyName));
        return [...favoritedLeads, ...uniqueNewLeads];
      });
      setActiveView('crm'); 
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setEditingNote(null); 
    setIsDetailModalOpen(true);
  };
  
  const handleGenerateEmailForLead = useCallback(async (lead: Lead) => {
    setEmailLead(lead);
    setIsEmailModalOpen(true);
    setIsEmailLoading(true);
    setGeneratedEmail('');
    try {
      const email = await generateOutreachEmail(lead);
      setGeneratedEmail(email);
    } catch (err: any) {
      setGeneratedEmail(`Erro ao gerar e-mail: ${err.message}`);
    } finally {
      setIsEmailLoading(false);
    }
  }, []);

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
  };
  
  const handleToggleSave = (leadId: string) => {
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, isSaved: !lead.isSaved } : lead
      )
    );
  };

  const handleAddNote = (leadId: string) => {
    if (!newNote.trim()) return;
    const note: Note = {
      id: `note-${Date.now()}`,
      content: newNote.trim(),
      date: new Date().toISOString(),
    };
    const updatedLeads = leads.map(lead => 
      lead.id === leadId 
        ? { ...lead, notes: [...(lead.notes || []), note] } 
        : lead
    );
    setLeads(updatedLeads);
    setSelectedLead(updatedLeads.find(l => l.id === leadId) || null);
    setNewNote('');
  };

  const handleStartEditingNote = (note: Note) => {
    setEditingNote({ id: note.id, content: note.content });
  };

  const handleCancelEditingNote = () => {
    setEditingNote(null);
  };

  const handleUpdateNote = (leadId: string) => {
    if (!editingNote) return;

    const updatedLeads = leads.map(lead => {
        if (lead.id === leadId) {
            const updatedNotes = (lead.notes || []).map(note =>
                note.id === editingNote.id 
                  ? { ...note, content: editingNote.content, date: new Date().toISOString() } 
                  : note
            );
            return { ...lead, notes: updatedNotes };
        }
        return lead;
    });
    setLeads(updatedLeads);
    setSelectedLead(updatedLeads.find(l => l.id === leadId) || null);
    setEditingNote(null);
  };

  const handleDeleteNote = (leadId: string, noteId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta anotação?")) {
        const updatedLeads = leads.map(lead => {
            if (lead.id === leadId) {
                const updatedNotes = (lead.notes || []).filter(note => note.id !== noteId);
                return { ...lead, notes: updatedNotes };
            }
            return lead;
        });
        setLeads(updatedLeads);
        setSelectedLead(updatedLeads.find(l => l.id === leadId) || null);
    }
  };


  const handleAddTask = (leadId: string) => {
    if (!newTaskContent.trim() || !newTaskDueDate) return;
    const task: Task = {
        id: `task-${Date.now()}`,
        content: newTaskContent.trim(),
        dueDate: newTaskDueDate,
        isCompleted: false,
    };
    const updatedLeads = leads.map(lead =>
        lead.id === leadId
            ? { ...lead, tasks: [...(lead.tasks || []), task] }
            : lead
    );
    setLeads(updatedLeads);
    setSelectedLead(updatedLeads.find(l => l.id === leadId) || null);
    setNewTaskContent('');
    setNewTaskDueDate('');
  };

  const handleToggleTask = (leadId: string, taskId: string) => {
    const updatedLeads = leads.map(lead => {
        if (lead.id === leadId) {
            const updatedTasks = (lead.tasks || []).map(task =>
                task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
            );
            return { ...lead, tasks: updatedTasks };
        }
        return lead;
    });
    setLeads(updatedLeads);
    setSelectedLead(updatedLeads.find(l => l.id === leadId) || null);
  };

  const handleDeleteTask = (leadId: string, taskId: string) => {
    const updatedLeads = leads.map(lead => {
        if (lead.id === leadId) {
            const updatedTasks = (lead.tasks || []).filter(task => task.id !== taskId);
            return { ...lead, tasks: updatedTasks };
        }
        return lead;
    });
    setLeads(updatedLeads);
    setSelectedLead(updatedLeads.find(l => l.id === leadId) || null);
  };

  // Notifications Handlers
  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (lead.isSaved) return false; 
      const matchesSearch = lead.companyName.toLowerCase().includes(filters.searchText.toLowerCase());
      const matchesStatus = filters.status === 'all' || lead.status === filters.status;
      return matchesSearch && matchesStatus;
    });
  }, [leads, filters]);

  const savedLeads = useMemo(() => {
    return leads.filter(lead => {
        if (!lead.isSaved) return false;
        const matchesSearch = lead.companyName.toLowerCase().includes(filters.searchText.toLowerCase());
        const matchesStatus = filters.status === 'all' || lead.status === filters.status;
        return matchesSearch && matchesStatus;
    });
  }, [leads, filters]);

  const allDisplayedLeads = useMemo(() => {
       return [...filteredLeads, ...savedLeads];
  }, [filteredLeads, savedLeads]);


  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(generatedEmail);
  };

  const handleClearAllLeads = () => {
    setLeads([]);
  }

  const handleClearUnsavedLeads = () => {
    if (window.confirm("Tem certeza que deseja limpar todos os leads não favoritados da visualização? Esta ação não pode ser desfeita.")) {
      setLeads(prevLeads => prevLeads.filter(lead => lead.isSaved));
    }
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'crm':
        return (
          <>
            <FilterBar 
              filters={filters} 
              setFilters={setFilters} 
              allLeads={leads.filter(l => !l.isSaved)}
              onClearResults={handleClearUnsavedLeads}
              clearButtonLabel="Limpar Resultados"
            />
            <KanbanBoard 
              leads={filteredLeads} 
              onStatusChange={handleStatusChange} 
              onSelectLead={handleSelectLead} 
              onGenerateEmail={handleGenerateEmailForLead}
              onToggleSave={handleToggleSave}
              emptyMessage="Nenhum lead encontrado. Gere novos leads ou ajuste seus filtros."
            />
          </>
        );
      case 'map':
        return (
            <>
                <FilterBar filters={filters} setFilters={setFilters} allLeads={leads} />
                <MapView leads={allDisplayedLeads} onSelectLead={handleSelectLead} />
            </>
        );
      case 'favorites':
        return (
          <>
            <FilterBar filters={filters} setFilters={setFilters} allLeads={leads.filter(l => l.isSaved)} />
            <KanbanBoard 
              leads={savedLeads} 
              onStatusChange={handleStatusChange} 
              onSelectLead={handleSelectLead} 
              onGenerateEmail={handleGenerateEmailForLead}
              onToggleSave={handleToggleSave}
              emptyMessage="Nenhum lead favoritado. Clique na estrela (⭐) de um lead para adicioná-lo aqui."
            />
          </>
        );
      case 'list':
        return (
          <>
            <FilterBar filters={filters} setFilters={setFilters} allLeads={leads.filter(l => !l.isSaved)} />
            <OrganizedList leads={filteredLeads} />
          </>
        );
      case 'settings':
        return <Settings 
                    onClearAllLeads={handleClearAllLeads} 
                    leads={leads} 
                    onRestoreLeads={setLeads}
                />;
      default:
        return null;
    }
  }


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans flex flex-col">
      <Header 
        activeView={activeView} 
        setActiveView={setActiveView} 
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onClearNotifications={handleClearNotifications}
      />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-4xl mx-auto w-full">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Gerar Novos Leads</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Busque por setor e localização para obter uma lista de empresas.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
              value={productCriteria}
              onChange={(e) => setProductCriteria(e.target.value)}
              placeholder="Produto ou Setor do Cliente (ex: automação)"
            />
            <div className="flex gap-2">
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
                value={locationCriteria}
                onChange={(e) => setLocationCriteria(e.target.value)}
                placeholder="Localização (ex: Campinas, SP)"
              />
              <button 
                onClick={() => setLocationCriteria('Brasil')}
                className="flex-shrink-0 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-semibold py-2 px-3 rounded-md text-sm"
                title="Buscar em todo o território nacional"
              >
                Brasil
              </button>
            </div>
          </div>
          
          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400 text-sm">OU</span>
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          
          <div>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da Empresa (ex: Multilaser)"
            />
          </div>

          <button
            onClick={handleGenerateLeads}
            disabled={isLoading}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {isLoading ? "Gerando..." : <><SparklesIcon className="w-5 h-5"/> Adicionar Leads com IA</>}
          </button>
        </div>

        {error && (
          <div className="max-w-4xl mx-auto mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mt-8 flex-grow flex flex-col">
          {renderActiveView()}
        </div>

        <Modal 
          isOpen={isDetailModalOpen} 
          onClose={() => setIsDetailModalOpen(false)} 
          title={`Detalhes de: ${selectedLead?.companyName}`}
        >
          {selectedLead && (
            <div className="space-y-6 text-gray-700 dark:text-gray-300">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Informações de Contato</h4>
                <div className="text-sm mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    {selectedLead.address && <p><strong>Endereço:</strong> {selectedLead.address}</p>}
                    {selectedLead.phone && <p><strong>Telefone:</strong> {selectedLead.phone}</p>}
                    {selectedLead.email && <p><strong>E-mail:</strong> <a href={`mailto:${selectedLead.email}`} className="text-indigo-500 hover:underline">{selectedLead.email}</a></p>}
                    {selectedLead.website && <p><strong>Site:</strong> <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{selectedLead.website}</a></p>}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Sumário e Racional da IA</h4>
                <div className="text-sm mt-2 space-y-3">
                    <div>
                        <p className="font-medium text-gray-600 dark:text-gray-400">Resumo da Empresa:</p>
                        <p>{selectedLead.summary}</p>
                    </div>
                    <div>
                        <p className="font-medium text-gray-600 dark:text-gray-400">Racional para Contato:</p>
                        <p>{selectedLead.reasonWhy}</p>
                    </div>
                    {selectedLead.potentialNeeds && selectedLead.potentialNeeds.length > 0 && (
                        <div>
                            <p className="font-medium text-gray-600 dark:text-gray-400">Necessidades Potenciais:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {selectedLead.potentialNeeds.map((need, index) => (
                                    <span key={index} className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 text-xs font-medium px-2.5 py-0.5 rounded-full">{need}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              </div>

              {/* Tasks Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Ações / Tarefas</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-4 pr-2">
                  {selectedLead.tasks?.length ? selectedLead.tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 p-2 rounded-md text-sm">
                      <input type="checkbox" checked={task.isCompleted} onChange={() => handleToggleTask(selectedLead.id, task.id)} className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-indigo-500" />
                      <div className="flex-grow">
                        <p className={`whitespace-pre-wrap ${task.isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>{task.content}</p>
                        <p className={`text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 ${new Date(task.dueDate) < new Date() && !task.isCompleted ? 'text-red-500 font-semibold' : ''}`}>
                          <CalendarDaysIcon className="w-3 h-3"/> Vencimento: {new Date(task.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteTask(selectedLead.id, task.id)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  )) : <p className="text-sm text-gray-500">Nenhuma tarefa adicionada.</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newTaskContent}
                    onChange={(e) => setNewTaskContent(e.target.value)}
                    placeholder="Nova tarefa... (ex: Ligar para o depto. de compras)"
                    className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 text-sm text-gray-500"
                  />
                  <button onClick={() => handleAddTask(selectedLead.id)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2"><PlusIcon className="w-5 h-5"/> Adicionar</button>
                </div>
              </div>


              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Anotações / Histórico</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-4 pr-2">
                  {selectedLead.notes?.length ? selectedLead.notes.map(note => (
                    <div key={note.id}>
                      {editingNote?.id === note.id ? (
                        <div className="bg-gray-200 dark:bg-gray-600 p-2 rounded-md">
                          <textarea
                            value={editingNote.content}
                            onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                            className="w-full p-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 text-sm"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button onClick={handleCancelEditingNote} className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white px-3 py-1 rounded-md">
                              Cancelar
                            </button>
                            <button onClick={() => handleUpdateNote(selectedLead.id)} className="text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1 rounded-md">
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md text-sm group relative">
                          <p className="whitespace-pre-wrap pr-16">{note.content}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(note.date).toLocaleString('pt-BR')}</p>
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleStartEditingNote(note)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" title="Editar anotação">
                                <PencilIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </button>
                              <button onClick={() => handleDeleteNote(selectedLead.id, note.id)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" title="Excluir anotação">
                                <TrashIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )) : <p className="text-sm text-gray-500">Nenhuma anotação adicionada.</p>}
                </div>
                <div className="flex gap-2">
                  <textarea 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Adicionar nova anotação..."
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 text-sm"
                    rows={2}
                    disabled={!!editingNote}
                  />
                  <button onClick={() => handleAddNote(selectedLead.id)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 self-end" disabled={!!editingNote}>Salvar</button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          title={`Rascunho de E-mail para: ${emailLead?.companyName}`}
        >
          {isEmailLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div>
              <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-700 p-4 rounded-md font-sans text-sm">{generatedEmail}</pre>
              <button onClick={copyEmailToClipboard} className="mt-4 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-300">Copiar</button>
            </div>
          )}
        </Modal>

      </main>
    </div>
  );
};

export default App;
