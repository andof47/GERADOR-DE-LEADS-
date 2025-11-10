import React from 'react';
import { LeadStatus } from '../types';
import type { Lead } from '../types';

interface FilterBarProps {
  filters: { searchText: string; status: LeadStatus | 'all' };
  setFilters: React.Dispatch<React.SetStateAction<{ searchText: string; status: LeadStatus | 'all' }>>;
  allLeads: Lead[];
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters, allLeads }) => {

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchText: e.target.value }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, status: e.target.value as LeadStatus | 'all' }));
  };

  return (
    <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex flex-col sm:flex-row items-center gap-4">
      <div className="w-full sm:w-1/2">
        <input
          type="text"
          placeholder="Buscar por nome da empresa..."
          value={filters.searchText}
          onChange={handleSearchChange}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="w-full sm:w-1/4">
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
      <div className="w-full sm:w-1/4 text-sm text-gray-600 dark:text-gray-400">
        <p>Total de Leads: <span className="font-bold">{allLeads.length}</span></p>
      </div>
    </div>
  );
};

export default FilterBar;