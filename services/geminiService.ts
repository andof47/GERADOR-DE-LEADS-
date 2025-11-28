
import { GoogleGenAI } from "@google/genai";
import type { Lead } from '../types';
import { LeadStatus } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateLeads = async (
  productCriteria: string,
  locationCriteria: string,
  companyName: string,
  coordinates?: { latitude: number; longitude: number }
): Promise<Lead[]> => {
  try {
    const tools = [{ googleMaps: {} }, { googleSearch: {} }];
    const toolConfig: any = {};

    if (coordinates) {
        toolConfig.retrievalConfig = {
            latLng: coordinates
        };
    }

    const mainQuery = companyName.trim()
      ? `Foque sua busca na empresa específica: "${companyName.trim()}". Investigue-a profundamente para encontrar todos os detalhes solicitados.`
      : `Gere uma lista de até 50 empresas brasileiras que atuam no setor de "${productCriteria}".`;

    const locationQuery = locationCriteria.trim()
      ? `A busca deve ser focada na região de "${locationCriteria}".`
      : 'A busca deve ser focada no Brasil.';

    const prompt = `
${mainQuery}
${locationQuery}
Se a busca for por uma empresa específica, pode ignorar o limite de 50 e focar em retornar 1 resultado completo.

Para enriquecer a busca e encontrar os melhores leads, aplique as seguintes estratégias avançadas:
1.  **Fontes Especializadas:** Além das buscas gerais, investigue portais da indústria como o da ABINEE (Associação Brasileira da Indústria Elétrica e Eletrônica) para encontrar empresas associadas e validadas no setor.
2.  **Sinais de Compra (Eventos e Notícias):** Priorize empresas que foram mencionadas em notícias recentes sobre lançamentos de produtos, investimentos, ou que participaram de feiras do setor como a FIEE. Isso indica que são 'leads quentes'.
3.  **Sinais de Compra (Vagas de Emprego):** Procure por empresas que estão contratando para vagas como 'Engenheiro de Hardware', 'Desenvolvedor de Firmware' ou 'Comprador Técnico'. Isso é um forte indicador de que estão em um ciclo de desenvolvimento e compra de componentes.

Foque em encontrar empresas de pequeno e médio porte, além das grandes (a não ser que uma empresa grande específica seja solicitada). Para cada empresa encontrada, investigue também o LinkedIn para encontrar contatos chave.

A resposta DEVE ser um array JSON válido, e nada mais. Não inclua texto explicativo antes ou depois do JSON.

Para cada empresa, forneça os seguintes campos no objeto JSON:
- companyName: Nome da empresa.
- industry: Setor de atuação da empresa.
- location: Cidade e Estado da empresa.
- address: Endereço físico completo, se disponível.
- latitude: Latitude aproximada da empresa (tipo number).
- longitude: Longitude aproximada da empresa (tipo number).
- phone: Número de telefone principal, se disponível.
- email: Endereço de e-mail geral, se disponível.
- website: URL do site oficial, se disponível.
- summary: Um breve resumo sobre a empresa e seus produtos.
- reasonWhy: Uma análise concisa do motivo pelo qual esta empresa é um bom lead, mencionando qual das estratégias de busca a encontrou, se aplicável.
- potentialNeeds: Uma lista de tipos específicos de componentes eletrônicos que a empresa provavelmente precisa.
- keyContacts: Um array JSON de strings com departamentos ou cargos chave para contato (ex: ["Engenharia", "Compras"]).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: `Você é um especialista em geração de leads B2B para a indústria de componentes eletrônicos no Brasil. Sua tarefa é usar as ferramentas de busca fornecidas para identificar e formatar informações detalhadas sobre empresas que seriam excelentes clientes. Forneça respostas em português do Brasil, estritamente no formato JSON solicitado. Ao fornecer latitude e longitude, tente ser o mais preciso possível com base no endereço da empresa.`,
        tools: tools,
        ...(Object.keys(toolConfig).length > 0 && { toolConfig: toolConfig }),
      }
    });

    const textResponse = response.text.trim();
    let jsonString = textResponse;

    // A IA pode retornar o JSON dentro de um bloco de código markdown.
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = textResponse.match(jsonRegex);

    if (match && match[1]) {
      jsonString = match[1];
    } else {
        // Se não encontrar o bloco, tentamos encontrar o início de um array
        const startIndex = textResponse.indexOf('[');
        if (startIndex !== -1) {
            // E o fim correspondente
            const endIndex = textResponse.lastIndexOf(']');
            if (endIndex > startIndex) {
                jsonString = textResponse.substring(startIndex, endIndex + 1);
            }
        }
    }

    const leadsData: (Omit<Lead, 'id' | 'status' | 'isSaved' | 'keyContacts'> & { keyContacts: string | string[] })[] = JSON.parse(jsonString);

    if (!Array.isArray(leadsData)) {
      throw new Error("A API não retornou uma lista de leads válida.");
    }

    return leadsData.map(leadData => ({
      ...leadData,
      keyContacts: Array.isArray(leadData.keyContacts) 
          ? leadData.keyContacts 
          : (typeof leadData.keyContacts === 'string' && leadData.keyContacts.length > 0 ? [leadData.keyContacts] : []),
      id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: LeadStatus.New,
      isSaved: false,
    }));

  } catch (error) {
    console.error("Erro ao gerar leads:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Falha ao analisar a resposta da IA. A resposta pode não estar em formato JSON válido.");
    }
    // Adiciona log da resposta crua para depuração
    // console.error("Resposta crua da API:", (error as any).rawResponse);
    throw new Error("Ocorreu um erro ao comunicar com a API da Gemini ou processar a resposta.");
  }
};

export const generateOutreachEmail = async (lead: Lead): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Gere um e-mail de prospecção conciso e profissional em português do Brasil para "${lead.companyName}".
      
      **Informações do Lead:**
      - **Empresa:** ${lead.companyName}
      - **Setor:** ${lead.industry}
      - **Resumo:** ${lead.summary}
      - **Necessidades Potenciais:** ${lead.potentialNeeds.join(', ')}
      - **Racional:** ${lead.reasonWhy}

      **Instruções para o E-mail:**
      1.  **Assunto:** Crie um assunto curto e chamativo.
      2.  **Saudação:** Dirija-se aos "${lead.keyContacts.join(', ')}".
      3.  **Corpo:**
          - Apresente-se brevemente e sua empresa (um fornecedor de componentes eletrônicos de alta qualidade).
          - Mostre que você fez a lição de casa, mencionando algo específico sobre a "${lead.companyName}" com base nas informações fornecidas.
          - Conecte as necessidades potenciais deles com seus produtos.
          - Seja direto e proponha um próximo passo claro (ex: uma breve chamada de 15 minutos).
      4.  **Encerramento:** Termine com uma despedida profissional.
      5.  **Linguagem:** Mantenha um tom amigável, mas profissional.
      `,
      config: {
        systemInstruction: "Você é um assistente de vendas especialista em escrever e-mails de prospecção B2B para a indústria de eletrônicos.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao gerar e-mail:", error);
    throw new Error("Não foi possível gerar o rascunho do e-mail.");
  }
};
