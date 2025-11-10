import React from 'react';
import { TrashIcon } from './Icons';

interface SettingsProps {
  onClearAllLeads: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClearAllLeads }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mx-auto w-full">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Configurações</h2>
      
      <div className="border border-red-300 dark:border-red-700 rounded-lg p-4">
        <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Zona de Perigo</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            As ações abaixo são permanentes e não podem ser desfeitas. Tenha certeza do que está fazendo.
        </p>
        <div className="mt-4">
            <button 
                onClick={onClearAllLeads}
                className="inline-flex items-center gap-2 bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                <TrashIcon className="w-5 h-5" />
                Limpar Todos os Leads
            </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
