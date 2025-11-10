import React, { useMemo } from 'react';
import type { Lead } from '../types';
import { DocumentArrowDownIcon } from './Icons';

interface OrganizedListProps {
  leads: Lead[];
}

const OrganizedList: React.FC<OrganizedListProps> = ({ leads }) => {

  const groupedLeads = useMemo(() => {
    if (!leads) return {};
    return leads.reduce((acc, lead) => {
      const location = lead.location || 'Localização Desconhecida';
      const industry = lead.industry || 'Ramo Desconhecido';
      
      if (!acc[location]) {
        acc[location] = {};
      }
      if (!acc[location][industry]) {
        acc[location][industry] = [];
      }
      acc[location][industry].push(lead);
      return acc;
    }, {} as Record<string, Record<string, Lead[]>>);
  }, [leads]);

  const handleExportToCSV = () => {
    const headers = [
      "Localização",
      "Ramo",
      "Empresa",
      "Contato Chave",
      "Telefone",
      "Email",
      "Site",
      "Endereço",
      "Status",
      "Resumo",
      "Racional"
    ];

    const csvRows = [headers.join(',')];

    const escapeCSV = (str: string | undefined | null) => {
        if (str === null || str === undefined) return '';
        const s = String(str);
        // Se a string contiver vírgula, aspas duplas ou nova linha, coloque-a entre aspas duplas.
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            // Também duplique quaisquer aspas duplas existentes.
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    // Itera através dos dados agrupados e ordenados para corresponder à organização da interface do usuário
    Object.keys(groupedLeads).sort().forEach(location => {
      let isFirstOfLocation = true;
      Object.keys(groupedLeads[location]).sort().forEach(industry => {
        let isFirstOfIndustry = true;
        groupedLeads[location][industry].forEach(lead => {
          const row = [
              isFirstOfLocation ? escapeCSV(location) : '',
              isFirstOfIndustry ? escapeCSV(industry) : '',
              escapeCSV(lead.companyName),
              escapeCSV(lead.keyContacts),
              escapeCSV(lead.phone),
              escapeCSV(lead.email),
              escapeCSV(lead.website),
              escapeCSV(lead.address),
              escapeCSV(lead.status),
              escapeCSV(lead.summary),
              escapeCSV(lead.reasonWhy)
          ];
          csvRows.push(row.join(','));
          isFirstOfLocation = false;
          isFirstOfIndustry = false;
        });
      });
    });


    const csvString = csvRows.join('\n');
    // Adiciona BOM para melhor compatibilidade do Excel com caracteres especiais
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_export_${date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (leads.length === 0) {
    return <div className="text-center py-16 text-gray-500 dark:text-gray-400">Nenhum lead disponível para listar. Gere novos leads na aba CRM.</div>
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Leads por Localização e Ramo</h2>
            <button
                onClick={handleExportToCSV}
                className="flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700"
            >
                <DocumentArrowDownIcon className="w-5 h-5" />
                Exportar para Excel
            </button>
        </div>
        
        <div className="space-y-6">
            {Object.keys(groupedLeads).sort().map(location => (
                <div key={location}>
                    <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">{location}</h3>
                    {Object.keys(groupedLeads[location]).sort().map(industry => (
                        <div key={industry} className="mb-4">
                            <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">{industry}</h4>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" className="px-4 py-2">Empresa</th>
                                            <th scope="col" className="px-4 py-2">Site</th>
                                            <th scope="col" className="px-4 py-2">Contato Chave</th>
                                            <th scope="col" className="px-4 py-2">Telefone</th>
                                            <th scope="col" className="px-4 py-2">Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedLeads[location][industry].map(lead => (
                                            <tr key={lead.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{lead.companyName}</td>
                                                <td className="px-4 py-2">
                                                    {lead.website ? (
                                                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                                                        Visitar
                                                    </a>
                                                    ) : 'N/A'}
                                                </td>
                                                <td className="px-4 py-2">{lead.keyContacts}</td>
                                                <td className="px-4 py-2">{lead.phone || 'N/A'}</td>
                                                <td className="px-4 py-2">{lead.email || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </div>
  );
};

export default OrganizedList;