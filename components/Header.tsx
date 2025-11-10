import React from 'react';
import { ChipIcon, ListBulletIcon, Cog6ToothIcon, StarIcon } from './Icons';
import { BuildingOfficeIcon } from './Icons';

export type ActiveView = 'crm' | 'list' | 'favorites' | 'settings';

interface HeaderProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView }) => {

    const navItems = [
        { id: 'crm', label: 'CRM (Kanban)', icon: <BuildingOfficeIcon className="w-5 h-5 mr-2" /> },
        { id: 'list', label: 'Lista Organizada', icon: <ListBulletIcon className="w-5 h-5 mr-2" /> },
        { id: 'favorites', label: 'Favoritos', icon: <StarIcon className="w-5 h-5 mr-2" /> },
        { id: 'settings', label: 'Configurações', icon: <Cog6ToothIcon className="w-5 h-5 mr-2" /> },
    ];

    return (
        <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <ChipIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                            Gerador de Leads IA
                            <span className="hidden sm:block text-sm font-normal text-gray-500 dark:text-gray-400">para Componentes Eletrônicos</span>
                        </h1>
                    </div>
                </div>
                <nav className="flex space-x-4">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id as ActiveView)}
                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-t-md transition-colors
                                ${activeView === item.id
                                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-700/50'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );
};

export default Header;