import { GoogleGenAI } from "@google/genai";
import type { Lead } from '../types';
import { LeadStatus } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateLeads = async (
  productCriteria: string,
  locationCriteria: string,
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Com base na localização do usuário (se fornecida) e na região de "${locationCriteria}", use o Google Maps e a Pesquisa Google para gerar uma lista de até 50 empresas brasileiras que atuam no setor de "${productCriteria}". Foque em encontrar empresas de pequeno e médio porte, além das grandes. Investigue também o LinkedIn para encontrar contatos chave.

A resposta DEVE ser um array JSON válido, e nada mais. Não inclua texto explicativo antes ou depois do JSON.

Para cada empresa, forneça os seguintes campos no objeto JSON:
- companyName: Nome da empresa.
- industry: Setor de atuação da empresa.
- location: Cidade e Estado da empresa.
- address: Endereço físico completo, se disponível.
- phone: Número de telefone principal, se disponível.
- email: Endereço de e-mail geral, se disponível.
- website: URL do site oficial, se disponível.
- summary: Um breve resumo sobre a empresa e seus produtos.
- reasonWhy: Uma análise concisa do motivo pelo qual esta empresa é um bom lead.
- potentialNeeds: Uma lista de tipos específicos de componentes eletrônicos que a empresa provavelmente precisa.
- keyContacts: Departamentos ou cargos chave para contato (ex: Engenharia, Compras).`,
      config: {
        systemInstruction: `Você é um especialista em geração de leads B2B para a indústria de componentes eletrônicos no Brasil. Sua tarefa é usar as ferramentas de busca fornecidas para identificar e formatar informações detalhadas sobre empresas que seriam excelentes clientes. Forneça respostas em português do Brasil, estritamente no formato JSON solicitado.`,
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

    const leadsData: Omit<Lead, 'id' | 'status'>[] = JSON.parse(jsonString);

    if (!Array.isArray(leadsData)) {
      throw new Error("A API não retornou uma lista de leads válida.");
    }

    return leadsData.map(leadData => ({
      ...leadData,
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
      2.  **Saudação:** Dirija-se aos "${lead.keyContacts}".
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