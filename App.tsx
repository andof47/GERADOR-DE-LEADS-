import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { generateLeads, generateOutreachEmail } from './services/geminiService';
import type { Lead, Note, Task } from './types';
import { LeadStatus } from './types';
import Header, { type ActiveView } from './components/Header';
import Modal from './components/Modal';
import { SparklesIcon, CalendarDaysIcon, PlusIcon, TrashIcon } from './components/Icons';
import KanbanBoard from './components/KanbanBoard';
import FilterBar from './components/FilterBar';
import OrganizedList from './components/OrganizedList';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [productCriteria, setProductCriteria] = useState<string>('');
  const [locationCriteria, setLocationCriteria] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<{ searchText: string; status: LeadStatus | 'all' }>({ searchText: '', status: 'all' });
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  
  // States for Notes
  const [newNote, setNewNote] = useState('');

  // States for Tasks
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [generatedEmail, setGeneratedEmail] = useState<string>('');
  const [isEmailLoading, setIsEmailLoading] = useState<boolean>(false);

  const [activeView, setActiveView] = useState<ActiveView>('crm');

  const LOCAL_STORAGE_KEY = 'ai-lead-generator-crm-leads';

  useEffect(() => {
    try {
      const savedLeadsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedLeadsRaw) {
        const savedLeads = JSON.parse(savedLeadsRaw);
        if (Array.isArray(savedLeads)) {
          setLeads(savedLeads);
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
    if (!productCriteria.trim() || !locationCriteria.trim()) {
      setError('Por favor, preencha o setor e a localização para a busca.');
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
      
      const newLeads = await generateLeads(productCriteria, locationCriteria, userCoords);
      setLeads(prevLeads => {
        // 1. Manter APENAS os leads que já foram favoritados. Os outros da busca anterior são descartados.
        const favoritedLeads = prevLeads.filter(l => l.isSaved);
        
        // 2. Criar um conjunto de nomes de empresas já favoritadas para evitar duplicatas.
        const favoritedCompanyNames = new Set(favoritedLeads.map(l => l.companyName));

        // 3. Filtrar os novos leads para garantir que não estamos adicionando duplicatas dos já favoritados.
        const uniqueNewLeads = newLeads.filter(l => !favoritedCompanyNames.has(l.companyName));

        // 4. A nova lista de leads será os favoritados + os novos e únicos.
        return [...favoritedLeads, ...uniqueNewLeads];
      });
      setActiveView('crm'); // Muda para a aba CRM para ver os novos leads
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
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


  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (lead.isSaved) return false; // Não mostrar favoritos na visão principal do CRM
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

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(generatedEmail);
  };

  const handleClearAllLeads = () => {
    if(window.confirm("Você tem certeza que deseja apagar TODOS os leads? Esta ação não pode ser desfeita.")){
        setLeads([]);
    }
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'crm':
        return (
          <>
            <FilterBar filters={filters} setFilters={setFilters} allLeads={leads.filter(l => !l.isSaved)} />
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
        return <OrganizedList leads={leads.filter(l => !l.isSaved)} />;
      case 'settings':
        return <Settings onClearAllLeads={handleClearAllLeads} />;
      default:
        return null;
    }
  }


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans flex flex-col">
      <Header activeView={activeView} setActiveView={setActiveView} />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-4xl mx-auto w-full">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Gerar Novos Leads</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
              value={productCriteria}
              onChange={(e) => setProductCriteria(e.target.value)}
              placeholder="Produto ou Setor do Cliente (ex: automação)"
            />
            <input
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
              value={locationCriteria}
              onChange={(e) => setLocationCriteria(e.target.value)}
              placeholder="Localização (ex: Campinas, SP)"
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
                    <div key={note.id} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md text-sm">
                      <p className="whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-right">{new Date(note.date).toLocaleString('pt-BR')}</p>
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
                  />
                  <button onClick={() => handleAddNote(selectedLead.id)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 self-end">Salvar</button>
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