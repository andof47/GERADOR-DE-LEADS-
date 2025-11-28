
import React, { useState, useRef, useEffect } from 'react';
import { ChipIcon, ListBulletIcon, Cog6ToothIcon, StarIcon, MapIcon, BellAlertIcon, XMarkIcon, CheckCircleIcon } from './Icons';
import { BuildingOfficeIcon } from './Icons';
import type { AppNotification } from '../types';

export type ActiveView = 'crm' | 'list' | 'favorites' | 'settings' | 'map';

interface HeaderProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    notifications: AppNotification[];
    onMarkAsRead: (id: string) => void;
    onClearNotifications: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, notifications, onMarkAsRead, onClearNotifications }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    const navItems = [
        { id: 'crm', label: 'CRM', icon: <BuildingOfficeIcon className="w-5 h-5 mr-2" /> },
        { id: 'map', label: 'Mapa', icon: <MapIcon className="w-5 h-5 mr-2" /> },
        { id: 'list', label: 'Lista', icon: <ListBulletIcon className="w-5 h-5 mr-2" /> },
        { id: 'favorites', label: 'Favoritos', icon: <StarIcon className="w-5 h-5 mr-2" /> },
        { id: 'settings', label: 'Config.', icon: <Cog6ToothIcon className="w-5 h-5 mr-2" /> },
    ];

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [notificationRef]);

    return (
        <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <ChipIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                            Gerador de Leads IA
                            <span className="hidden sm:block text-sm font-normal text-gray-500 dark:text-gray-400">para Componentes Eletrônicos</span>
                        </h1>
                    </div>
                    
                    <div className="relative" ref={notificationRef}>
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                            aria-label="Notificações"
                        >
                            <BellAlertIcon className="w-6 h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-30 animate-fade-in-up">
                                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Notificações</h3>
                                    {notifications.length > 0 && (
                                        <button onClick={onClearNotifications} className="text-xs text-gray-500 hover:text-red-500">
                                            Limpar todas
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                                            Nenhuma notificação no momento.
                                        </div>
                                    ) : (
                                        <ul>
                                            {notifications.map(notification => (
                                                <li key={notification.id} className={`border-b border-gray-100 dark:border-gray-700 last:border-0 ${notification.read ? 'bg-white dark:bg-gray-800 opacity-70' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
                                                    <div className="p-3 flex gap-3">
                                                        <div className="flex-grow">
                                                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{notification.title}</h4>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{notification.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1 text-right">
                                                                {new Date(notification.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                                            </p>
                                                        </div>
                                                        {!notification.read && (
                                                            <button 
                                                                onClick={() => onMarkAsRead(notification.id)}
                                                                className="self-start text-indigo-600 hover:text-indigo-800"
                                                                title="Marcar como lida"
                                                            >
                                                                <CheckCircleIcon className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-1 sm:pb-0">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id as ActiveView)}
                            className={`flex items-center whitespace-nowrap px-3 py-2 text-sm font-medium rounded-t-md transition-colors
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
