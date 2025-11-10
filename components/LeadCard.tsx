import React from 'react';
import type { Lead } from '../types';
import { LeadStatus } from '../types';
import { BuildingOfficeIcon, MapPinIcon, StarIcon } from './Icons';

interface LeadCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  onGenerateEmail: (lead: Lead) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, leadId: string) => void;
  onToggleSave: (leadId: string) => void;
}

const statusColors: { [key in LeadStatus]: { border: string, bg: string, text: string } } = {
  [LeadStatus.New]: { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300'},
  [LeadStatus.Contacted]: { border: 'border-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300' },
  [LeadStatus.FollowUp]: { border: 'border-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-300' },
  [LeadStatus.Qualified]: { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300' },
  [LeadStatus.Unqualified]: { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300' },
};


const LeadCard: React.FC<LeadCardProps> = ({ lead, onSelect, onGenerateEmail, onDragStart, onToggleSave }) => {
  const colorTheme = statusColors[lead.status];

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-lg flex flex-col cursor-grab active:cursor-grabbing border-l-4 ${colorTheme.border} mb-4`}
    >
      <div className="p-4 flex-grow">
        <div className="flex justify-between items-start gap-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 pr-2 flex-grow">{lead.companyName}</h3>
            <div className="flex items-center flex-shrink-0 gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleSave(lead.id); }}
                    className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 p-1 rounded-full transition-colors"
                    title={lead.isSaved ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                    aria-label={lead.isSaved ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                >
                    <StarIcon solid={lead.isSaved} className="w-5 h-5" />
                </button>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorTheme.bg} ${colorTheme.text}`}>{lead.status}</span>
            </div>
        </div>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            <BuildingOfficeIcon className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{lead.industry}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
            <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{lead.location}</span>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mt-3 text-sm line-clamp-2">
          <strong>Racional:</strong> {lead.reasonWhy}
        </p>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 flex justify-end gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onGenerateEmail(lead); }}
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
        >
          Gerar E-mail
        </button>
        <button
          onClick={() => onSelect(lead)}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
        >
          Detalhes
        </button>
      </div>
    </div>
  );
};

export default LeadCard;