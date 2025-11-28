import React from 'react';
import { LeadStatus } from '../types';
import type { Lead } from '../types';
import { TrashIcon } from './Icons';

interface FilterBarProps {
  filters: { searchText: string; status: LeadStatus | 'all' };
  setFilters: React.Dispatch<React.SetStateAction<{ searchText: string; status: LeadStatus | 'all' }>>;
  allLeads: Lead[];
  onClearResults?: () => void;
  clearButtonLabel?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters, allLeads, onClearResults, clearButtonLabel }) => {

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchText: e.target.value }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, status: e.target.value as LeadStatus | 'all' }));
  };

  return (
    <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex flex-col sm:flex-row items-center gap-4">
      <div className="w-full sm:w-2/5">
        <input
          type="text"
          placeholder="Buscar por nome da empresa..."
          value={filters.searchText}
          onChange={handleSearchChange}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="w-full sm:w-1/5">
        <select
          value={filters.status}
          onChange={handleStatusChange}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Todos os Status</option>
          {Object.values(LeadStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
      <div className="w-full sm:w-2/5 flex flex-col sm:flex-row items-center justify-end gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          Total de Leads: <span className="font-bold">{allLeads.length}</span>
        </p>
        {onClearResults && clearButtonLabel && (
          <button
            onClick={onClearResults}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-red-600 text-white font-semibold py-2 px-3 rounded-md text-sm hover:bg-red-700 transition-colors disabled:bg-red-400"
            title="Limpa todos os leads que não estão favoritados"
          >
            <TrashIcon className="w-4 h-4" />
            <span>{clearButtonLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;