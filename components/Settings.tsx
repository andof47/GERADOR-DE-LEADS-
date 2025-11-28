import React, { useRef, useState } from 'react';
import { TrashIcon, DocumentArrowDownIcon, DocumentArrowUpIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import type { Lead } from '../types';
import { LeadStatus } from '../types';


interface SettingsProps {
  onClearAllLeads: () => void;
  leads: Lead[];
  onRestoreLeads: (leads: Lead[]) => void;
}

type StatusType = 'info' | 'success' | 'error';

const Settings: React.FC<SettingsProps> = ({ onClearAllLeads, leads, onRestoreLeads }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<StatusType>('info');

  const showFinalStatus = (message: string, type: StatusType) => {
    setProgress(100);
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => {
        setIsProcessing(false);
        setStatusMessage('');
        setProgress(0);
    }, 4000);
  }

  const handleExportBackup = () => {
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Iniciando exportação...');
    setStatusType('info');

    if (leads.length === 0) {
      showFinalStatus("Não há leads para exportar.", 'error');
      return;
    }
    
    // Simulate a short delay for UX
    setTimeout(() => {
        try {
          setProgress(50);
          setStatusMessage('Gerando arquivo de backup...');
          const jsonString = JSON.stringify(leads, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const date = new Date().toISOString().split('T')[0];
          link.download = `backup_leads_IA_${date}.json`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setProgress(100);
          showFinalStatus("Backup exportado com sucesso!", 'success');
        } catch (error) {
          console.error("Erro ao exportar backup:", error);
          showFinalStatus("Falha ao exportar backup.", 'error');
        }
    }, 500);
  };

  const handleRestoreClick = () => {
    if (isProcessing) return;
    fileInputRef.current?.click();
  };

  const handleRestoreBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Restaurar este backup substituirá TODOS os leads atuais. Deseja continuar?")) {
      if (event.target) event.target.value = '';
      return;
    }

    const reader = new FileReader();

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Lendo arquivo...');
    setStatusType('info');

    reader.onload = (e) => {
        try {
            setProgress(30);
            setStatusMessage('Validando dados...');

            const text = e.target?.result;
            if (typeof text !== 'string') {
              throw new Error("Falha ao ler o conteúdo do arquivo.");
            }

            const restoredLeads = JSON.parse(text);
            
            if (!Array.isArray(restoredLeads)) {
                throw new Error("O arquivo de backup não é uma lista de leads válida.");
            }
            
            setProgress(60);
            setStatusMessage('Sanitizando e importando leads...');
            
            // Comprehensive sanitization to ensure data integrity
            const sanitizedLeads: Lead[] = restoredLeads.map((lead: any) => ({
                id: lead.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                companyName: lead.companyName || 'Nome da Empresa Desconhecido',
                industry: lead.industry || 'Setor Desconhecido',
                location: lead.location || 'Localização Desconhecida',
                summary: lead.summary || '',
                reasonWhy: lead.reasonWhy || '',
                potentialNeeds: Array.isArray(lead.potentialNeeds) ? lead.potentialNeeds : [],
                keyContacts: Array.isArray(lead.keyContacts) ? lead.keyContacts : (typeof lead.keyContacts === 'string' && lead.keyContacts.length > 0 ? [lead.keyContacts] : []),
                status: Object.values(LeadStatus).includes(lead.status) ? lead.status : LeadStatus.New,
                isSaved: typeof lead.isSaved === 'boolean' ? lead.isSaved : false,
                address: lead.address || undefined,
                phone: lead.phone || undefined,
                email: lead.email || undefined,
                website: lead.website || undefined,
                notes: Array.isArray(lead.notes) ? lead.notes : [],
                tasks: Array.isArray(lead.tasks) ? lead.tasks : [],
            }));

            onRestoreLeads(sanitizedLeads);

            setProgress(100);
            showFinalStatus(`Sucesso! ${sanitizedLeads.length} leads restaurados.`, 'success');

        } catch (error) {
            console.error("Erro ao restaurar backup:", error);
            showFinalStatus(`Falha ao restaurar: ${(error as Error).message}`, 'error');
        } finally {
            // Reset the input so the same file can be selected again
            if (event.target) event.target.value = '';
        }
    };

    reader.onerror = () => {
        showFinalStatus("Ocorreu um erro ao ler o arquivo.", 'error');
        if (event.target) event.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleClearAll = () => {
    if(window.confirm("Você tem certeza que deseja apagar TODOS os leads? Esta ação não pode ser desfeita sem um backup.")){
        setIsProcessing(true);
        setProgress(0);
        setStatusMessage('Limpando dados...');
        setStatusType('info');
        setTimeout(() => {
          try {
              onClearAllLeads();
              showFinalStatus("Todos os dados foram limpos com sucesso.", 'success');
          } catch (error) {
              showFinalStatus("Ocorreu um erro ao limpar os dados.", 'error');
          }
        }, 500);
    }
  }
  
  const statusIcon: { [key in StatusType]: React.ReactNode } = {
    info: null,
    success: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
    error: <XCircleIcon className="w-5 h-5 text-red-500" />,
  };

  const statusColor: { [key in StatusType]: string } = {
      info: 'text-gray-600 dark:text-gray-400',
      success: 'text-green-600 dark:text-green-400',
      error: 'text-red-600 dark:text-red-400',
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mx-auto w-full">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Configurações</h2>
      
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Backup e Restauração de Dados</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Exporte todos os dados do sistema para um arquivo JSON seguro ou restaure a partir de um backup anterior.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <button
                onClick={handleExportBackup}
                disabled={isProcessing}
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
                <DocumentArrowDownIcon className="w-5 h-5" />
                Exportar Backup (JSON)
            </button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleRestoreBackup}
                accept=".json"
                className="hidden"
            />
            <button
                onClick={handleRestoreClick}
                disabled={isProcessing}
                className="inline-flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                <DocumentArrowUpIcon className="w-5 h-5" />
                Restaurar de Backup
            </button>
        </div>
      </div>

      <div className="border border-red-400 dark:border-red-700 rounded-lg p-4">
        <h3 className="text-lg font-bold text-red-700 dark:text-red-500">Zona de Perigo</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            A ação abaixo é permanente e não pode ser desfeita sem um backup. Ela removerá <span className="font-bold">TODOS</span> os leads, incluindo os favoritos, e redefinirá o aplicativo ao seu estado original.
        </p>
        <div className="mt-4">
            <button 
                onClick={handleClearAll}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed"
            >
                <TrashIcon className="w-5 h-5" />
                Limpar Todos os Dados
            </button>
        </div>
      </div>
      
      {isProcessing && (
        <div className="mt-6 w-full">
            <div className="flex items-center gap-3 mb-2">
                {statusIcon[statusType]}
                <p className={`text-sm font-medium ${statusColor[statusType]}`}>{statusMessage}</p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                    className={`h-2.5 rounded-full transition-all duration-300 ${statusType === 'success' ? 'bg-green-600' : statusType === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
