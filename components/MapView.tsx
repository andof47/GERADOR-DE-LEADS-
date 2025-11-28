
import React, { useEffect, useRef } from 'react';
import type { Lead } from '../types';

interface MapViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

const MapView: React.FC<MapViewProps> = ({ leads, onSelectLead }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Inicializar o mapa se ainda não existir
    if (mapRef.current && !mapInstanceRef.current) {
        const L = (window as any).L;
        if (!L) {
            console.error("Leaflet não foi carregado.");
            return;
        }

        // Coordenadas padrão (Brasil)
        mapInstanceRef.current = L.map(mapRef.current).setView([-14.2350, -51.9253], 4);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstanceRef.current);
    }

    // Função para atualizar marcadores
    const updateMarkers = () => {
        const L = (window as any).L;
        if (!L || !mapInstanceRef.current) return;

        // Limpar marcadores existentes
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        const bounds = L.latLngBounds([]);
        let hasValidMarkers = false;

        leads.forEach(lead => {
            if (lead.latitude && lead.longitude) {
                const marker = L.marker([lead.latitude, lead.longitude])
                    .addTo(mapInstanceRef.current)
                    .bindPopup(`
                        <div class="p-2">
                            <h3 class="font-bold text-sm">${lead.companyName}</h3>
                            <p class="text-xs text-gray-600">${lead.industry}</p>
                            <p class="text-xs mt-1">${lead.address || lead.location}</p>
                            <button 
                                id="btn-${lead.id}"
                                class="mt-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 w-full"
                            >
                                Ver Detalhes
                            </button>
                        </div>
                    `);
                
                // Adiciona evento ao abrir o popup para ligar o botão ao React
                marker.on('popupopen', () => {
                    const btn = document.getElementById(`btn-${lead.id}`);
                    if (btn) {
                        btn.onclick = () => onSelectLead(lead);
                    }
                });

                markersRef.current.push(marker);
                bounds.extend([lead.latitude, lead.longitude]);
                hasValidMarkers = true;
            }
        });

        // Ajustar zoom para mostrar todos os marcadores
        if (hasValidMarkers) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
    };

    updateMarkers();

    // Cleanup
    return () => {
        // Não destruímos o mapa aqui para evitar problemas de re-renderização rápida em React Strict Mode,
        // mas limpamos os marcadores.
        if (mapInstanceRef.current) {
             markersRef.current.forEach(marker => marker.remove());
             markersRef.current = [];
        }
    };

  }, [leads, onSelectLead]); 

  // Lidar com redimensionamento
  useEffect(() => {
      const timer = setTimeout(() => {
          if(mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
          }
      }, 100);
      return () => clearTimeout(timer);
  }, [leads]);


  const leadsWithCoords = leads.filter(l => l.latitude && l.longitude).length;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md h-[600px] flex flex-col">
        <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mapa de Oportunidades</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {leadsWithCoords} de {leads.length} leads com localização
            </span>
        </div>
        <div ref={mapRef} className="flex-grow w-full rounded-md border border-gray-200 dark:border-gray-700 z-0" />
        {leadsWithCoords === 0 && leads.length > 0 && (
            <p className="text-xs text-yellow-600 mt-2">
                Nota: Nenhum dos leads atuais possui coordenadas exatas. Tente gerar novos leads; a IA agora buscará a localização aproximada.
            </p>
        )}
    </div>
  );
};

export default MapView;
