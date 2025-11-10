import React, { useState } from 'react';
import type { Lead } from '../types';
import { LeadStatus } from '../types';
import LeadCard from './LeadCard';

interface KanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onSelectLead: (lead: Lead) => void;
  onGenerateEmail: (lead: Lead) => void;
  onToggleSave: (leadId: string) => void;
  emptyMessage?: string;
}

const statusOrder: LeadStatus[] = [
  LeadStatus.New,
  LeadStatus.Contacted,
  LeadStatus.FollowUp,
  LeadStatus.Qualified,
  LeadStatus.Unqualified,
];

const KanbanColumn: React.FC<{
  status: LeadStatus;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onGenerateEmail: (lead: Lead) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, leadId: string) => void;
  onDrop: (status: LeadStatus) => void;
  onToggleSave: (leadId: string) => void;
}> = ({ status, leads, onSelectLead, onGenerateEmail, onDragStart, onDrop, onToggleSave }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = () => {
    onDrop(status);
    setIsOver(false);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 min-w-[280px] p-3 bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors ${isOver ? 'bg-indigo-100 dark:bg-indigo-900/50' : ''}`}
    >
      <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 px-1">{status} <span className="text-sm text-gray-500">({leads.length})</span></h3>
      <div className="space-y-4 h-full">
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onSelect={onSelectLead}
            onGenerateEmail={onGenerateEmail}
            onDragStart={onDragStart}
            onToggleSave={onToggleSave}
          />
        ))}
      </div>
    </div>
  );
};


const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onStatusChange, onSelectLead, onGenerateEmail, onToggleSave, emptyMessage }) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (newStatus: LeadStatus) => {
    if (draggedLeadId) {
      onStatusChange(draggedLeadId, newStatus);
      setDraggedLeadId(null);
    }
  };

  const leadsByStatus = statusOrder.reduce((acc, status) => {
    acc[status] = leads.filter(lead => lead.status === status);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  if (leads.length === 0) {
    return <div className="text-center py-16 text-gray-500 dark:text-gray-400">{emptyMessage || 'Nenhum lead encontrado. Gere novos leads, salve-os como favoritos ou ajuste seus filtros.'}</div>
  }

  return (
    <div className="flex-grow flex gap-4 overflow-x-auto p-2 -mx-2">
      {statusOrder.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          leads={leadsByStatus[status]}
          onSelectLead={onSelectLead}
          onGenerateEmail={onGenerateEmail}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
};

export default KanbanBoard;