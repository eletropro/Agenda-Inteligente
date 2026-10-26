import { GoogleGenAI, Type } from '@google/genai';
import { Appointment, AppointmentDraft, VoiceProcessResult } from '../src/types/index';
import { db } from './db';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string = 'audio/webm',
  clientTranscript?: string
): Promise<string> {
  // If client transcript already captured via browser Web Speech API, keep as fallback
  const validClientTranscript = clientTranscript?.trim();

  if (!process.env.GEMINI_API_KEY) {
    if (validClientTranscript) return validClientTranscript;
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }

  const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();
  const audioPart = {
    inlineData: {
      mimeType: cleanMimeType || 'audio/webm',
      data: audioBase64,
    },
  };

  // 1. Try gemini-3.5-transcribe with standard parts structure
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          {
            text: 'Transcreva este áudio com precisão para o português brasileiro. Retorne APENAS o texto falado, sem introduções, aspas ou explicações.',
          },
        ],
      },
    });

    const transcription = response.text?.trim() || '';
    if (transcription) {
      return transcription;
    }
  } catch (err: any) {
    console.warn('Transcription error with gemini-3.5-transcribe:', err?.message || err);
  }

  // 2. Try gemini-flash-latest for multimodal audio
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: {
        parts: [
          audioPart,
          {
            text: 'Transcreva este áudio em português brasileiro exatamente como foi falado. Retorne somente o texto da transcrição.',
          },
        ],
      },
    });
    const transcription = response.text?.trim() || '';
    if (transcription) {
      return transcription;
    }
  } catch (err: any) {
    console.warn('Transcription error with gemini-flash-latest:', err?.message || err);
  }

  // 3. Fallback to client speech recognition if available
  if (validClientTranscript) {
    console.log('Using browser speech recognition transcript fallback:', validClientTranscript);
    return validClientTranscript;
  }

  // 4. Friendly error message if completely silent or unparseable
  throw new Error('Não foi possível reconhecer a fala no áudio. Fale mais claramente ou use o campo de texto.');
}

export async function processVoiceOrTextIntent(
  text: string,
  clientCurrentDateISO?: string,
  timezone: string = 'America/Sao_Paulo'
): Promise<VoiceProcessResult> {
  const allEvents = db.getAllEvents();
  const refDate = clientCurrentDateISO ? new Date(clientCurrentDateISO) : new Date();

  // Helper date strings for reference prompt
  const pad = (n: number) => String(n).padStart(2, '0');
  const refDateStr = `${refDate.getFullYear()}-${pad(refDate.getMonth() + 1)}-${pad(refDate.getDate())}`;
  const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const dayName = daysOfWeek[refDate.getDay()];

  // Format existing upcoming events summary so AI can match "visita do Fulano", "reunião com João", etc.
  const existingSummary = allEvents
    .filter((e) => e.status !== 'cancelado')
    .slice(0, 30)
    .map(
      (e) =>
        `- ID: "${e.id}", Título: "${e.title}", Cliente: "${e.clientName}", Data: ${e.date}, Horário: ${e.startTime}, Tipo: ${e.serviceType}, Status: ${e.status}, Obs: "${e.notes}"`
    )
    .join('\n');

  const systemInstruction = `Você é a secretária inteligente do aplicativo "Agenda Inteligente por Voz".
Sua tarefa é interpretar o comando de voz ou texto em português brasileiro e classificar a intenção do usuário:
1. "CREATE_APPOINTMENTS": Quando o usuário menciona um ou vários compromissos a agendar.
2. "UPDATE_APPOINTMENT": Quando o usuário quer mudar data, horário ou detalhes de um compromisso existente (ex: "Mude a visita técnica do Fulano para quarta-feira às nove").
3. "CANCEL_APPOINTMENT": Quando o usuário quer desmarcar ou cancelar um compromisso (ex: "Desmarque a reunião com João").
4. "COMPLETE_APPOINTMENT": Quando o usuário quer marcar como feito/concluído (ex: "Conclua o serviço da empresa ABC").
5. "ADD_NOTE": Quando o usuário quer adicionar uma observação a um compromisso existente (ex: "Adicione a observação de levar as ferramentas para a visita de amanhã").
6. "QUERY_SCHEDULE": Quando o usuário pergunta sobre a agenda (ex: "Quais são meus compromissos de sexta-feira?", "O que tenho hoje?").
7. "UNCLEAR": Quando o comando for incompreensível ou faltar informação essencial.

CONTEXTO TEMPORAL OBRIGATÓRIO:
- Data atual de referência: ${refDateStr} (${dayName})
- Fuso horário: ${timezone}
- "hoje": ${refDateStr}
- "amanhã": calcular dia seguinte (+1 dia)
- "depois de amanhã": (+2 dias)
- "na próxima terça-feira" ou nomes de dias: calcule o dia exato da semana correspondente a partir de hoje (${dayName}). Nunca invente uma data no passado.
- Horários no formato 24h ("08:00", "14:00", "20:30"). Se disser "às duas da tarde", é "14:00". Se disser "às oito da manhã", é "08:00". Se for apenas "às oito", use o contexto; se for ambíguo, marque needClarification: true e faça a pergunta.
- Tipos de serviço aceitos: "visita_tecnica", "reuniao", "manutencao", "consulta", "ligacao", "pessoal", "outro".
- Prioridades aceitas: "baixa", "media", "alta", "urgente".
- NÃO invente clientes, telefones ou endereços se o usuário não falou.
- Se o usuário falar múltiplos compromissos em uma mesma frase (ex: "Na terça visita para Fulano às 8h. Na quarta reunião com João às 14h"), crie uma entrada na lista 'appointments' para CADA compromisso detectado!

Compromissos existentes no banco para referência:
${existingSummary || '(Nenhum compromisso cadastrado ainda)'}`;

  if (!process.env.GEMINI_API_KEY) {
    // Intelligent heuristic fallback if API key is not yet set
    return heuristicFallbackProcessor(text, refDate, allEvents);
  }

  try {
    const prompt = `Analise o comando do usuário:
"${text}"

Retorne um JSON estrito de acordo com o esquema.`;

    // Protect with an 8-second timeout so offline or invalid keys fall back cleanly
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout ao conectar com a API Gemini')), 8000)
    );

    const callPromise = ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              description: 'CREATE_APPOINTMENTS, UPDATE_APPOINTMENT, CANCEL_APPOINTMENT, COMPLETE_APPOINTMENT, ADD_NOTE, QUERY_SCHEDULE, ou UNCLEAR',
            },
            message: {
              type: Type.STRING,
              description: 'Mensagem explicativa para o usuário em português',
            },
            targetEventId: {
              type: Type.STRING,
              description: 'ID do evento existente correspondente, se identificado para UPDATE, CANCEL, COMPLETE ou ADD_NOTE',
            },
            targetSearchText: {
              type: Type.STRING,
              description: 'Texto chave para encontrar o evento se ID não for exato',
            },
            newDate: {
              type: Type.STRING,
              description: 'Nova data YYYY-MM-DD se o usuário pediu para mudar a data',
            },
            newTime: {
              type: Type.STRING,
              description: 'Novo horário HH:mm se o usuário pediu para mudar o horário',
            },
            noteToAdd: {
              type: Type.STRING,
              description: 'Observação a adicionar se a intenção for ADD_NOTE',
            },
            queryAnswer: {
              type: Type.STRING,
              description: 'Resposta falada direta se a intenção for QUERY_SCHEDULE',
            },
            clarificationRequired: {
              type: Type.BOOLEAN,
              description: 'Verdadeiro se faltar informação essencial ou houver ambiguidade grave',
            },
            appointments: {
              type: Type.ARRAY,
              description: 'Lista de compromissos extraídos para criação ou confirmação',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  serviceType: {
                    type: Type.STRING,
                    description: 'visita_tecnica, reuniao, manutencao, consulta, ligacao, pessoal, outro',
                  },
                  date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                  startTime: { type: Type.STRING, description: 'HH:mm no formato 24h' },
                  endTime: { type: Type.STRING, description: 'HH:mm no formato 24h' },
                  clientName: { type: Type.STRING },
                  clientPhone: { type: Type.STRING },
                  location: { type: Type.STRING },
                  description: { type: Type.STRING },
                  notes: { type: Type.STRING },
                  priority: { type: Type.STRING, description: 'baixa, media, alta, urgente' },
                  reminderLeadTime: { type: Type.STRING, description: '24h, 48h, 72h, 1h, 30m' },
                  needClarification: { type: Type.BOOLEAN },
                  clarificationMessage: { type: Type.STRING },
                },
                required: ['title', 'date', 'startTime', 'serviceType'],
              },
            },
          },
          required: ['intent', 'message'],
        },
      },
    });

    const response = await Promise.race([callPromise, timeoutPromise]);

    const parsed = JSON.parse(response.text?.trim() || '{}');

    // Post-process appointments: check for conflicts in the database
    const drafts: AppointmentDraft[] = (parsed.appointments || []).map((app: any) => {
      const conflict = db.checkConflicts(app.date, app.startTime, app.endTime || app.startTime);
      return {
        title: app.title || 'Compromisso',
        serviceType: app.serviceType || 'outro',
        date: app.date || refDateStr,
        startTime: app.startTime || '08:00',
        endTime: app.endTime || app.startTime || '09:00',
        clientName: app.clientName || 'Cliente',
        clientPhone: app.clientPhone || '',
        location: app.location || '',
        description: app.description || '',
        notes: app.notes || '',
        priority: app.priority || 'media',
        reminderLeadTime: app.reminderLeadTime || '24h',
        reminderTime: '',
        recurrence: 'none',
        hasConflict: conflict.hasConflict,
        conflictDetails: conflict.hasConflict
          ? `Conflito de horário com: ${conflict.conflictingWith?.title} (${conflict.conflictingWith?.startTime} - ${conflict.conflictingWith?.endTime})`
          : undefined,
        needClarification: !!app.needClarification,
        clarificationMessage: app.clarificationMessage,
      };
    });

    return {
      transcription: text,
      intent: parsed.intent || 'CREATE_APPOINTMENTS',
      appointments: drafts,
      message: parsed.message || 'Comando interpretado com sucesso.',
      queryAnswer: parsed.queryAnswer,
      targetEventId: parsed.targetEventId,
      clarificationRequired: parsed.clarificationRequired,
    };
  } catch (err: any) {
    console.error('Gemini interpretation error, switching to heuristic parser:', err);
    return heuristicFallbackProcessor(text, refDate, allEvents);
  }
}

// Fallback heuristic parser for offline or when API key is unavailable
function heuristicFallbackProcessor(
  text: string,
  refDate: Date,
  existingEvents: Appointment[]
): VoiceProcessResult {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lower = text.toLowerCase();

  // Check for Query intention
  if (lower.includes('quais') || lower.includes('o que tenho') || lower.includes('agenda de')) {
    let targetDateStr = '';
    if (lower.includes('hoje')) {
      targetDateStr = `${refDate.getFullYear()}-${pad(refDate.getMonth() + 1)}-${pad(refDate.getDate())}`;
    } else if (lower.includes('amanhã') || lower.includes('amanha')) {
      const tomorrow = new Date(refDate.getTime() + 24 * 60 * 60 * 1000);
      targetDateStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
    }

    const matches = targetDateStr
      ? existingEvents.filter((e) => e.date === targetDateStr && e.status !== 'cancelado')
      : existingEvents.filter((e) => e.status !== 'cancelado').slice(0, 5);

    const answer =
      matches.length === 0
        ? 'Você não possui compromissos agendados para este período.'
        : `Você possui ${matches.length} compromisso(s): ${matches
            .map((m) => `${m.title} às ${m.startTime} em ${m.location || 'local não informado'}`)
            .join('; ')}.`;

    return {
      transcription: text,
      intent: 'QUERY_SCHEDULE',
      appointments: [],
      message: answer,
      queryAnswer: answer,
    };
  }

  // Check for Cancellation
  if (lower.includes('desmarque') || lower.includes('cancele') || lower.includes('cancelar')) {
    const matched = existingEvents.find(
      (e) =>
        lower.includes(e.clientName.toLowerCase()) ||
        lower.includes(e.title.toLowerCase())
    );
    return {
      transcription: text,
      intent: 'CANCEL_APPOINTMENT',
      appointments: [],
      targetEventId: matched?.id,
      message: matched
        ? `Confirma o cancelamento de "${matched.title}" agendado para ${matched.date} às ${matched.startTime}?`
        : 'Identifiquei a intenção de cancelar, mas preciso que especifique qual compromisso.',
    };
  }

  // Check for Complete
  if (lower.includes('conclua') || lower.includes('concluir') || lower.includes('finalizar')) {
    const matched = existingEvents.find(
      (e) =>
        lower.includes(e.clientName.toLowerCase()) ||
        lower.includes(e.title.toLowerCase())
    );
    return {
      transcription: text,
      intent: 'COMPLETE_APPOINTMENT',
      appointments: [],
      targetEventId: matched?.id,
      message: matched
        ? `Confirma a conclusão de "${matched.title}"?`
        : 'Identifiquei a intenção de concluir um compromisso.',
    };
  }

  // Default: Create appointments extraction
  // Split by sentence punctuation or conjunctions to detect multiple appointments in one audio
  const rawSegments = text.split(/[.;]|\b(?=na quarta\b|na terça\b|na quinta\b|na sexta\b|na segunda\b|no sábado\b|no domingo\b|amanhã\b|depois de amanhã\b)/i)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  const segments = rawSegments.length > 0 ? rawSegments : [text];
  const drafts: AppointmentDraft[] = [];

  for (const seg of segments) {
    const draft = parseSingleSegmentDraft(seg, refDate);
    if (draft) {
      const conflict = db.checkConflicts(draft.date, draft.startTime, draft.endTime);
      draft.hasConflict = conflict.hasConflict;
      if (conflict.hasConflict) {
        draft.conflictDetails = `Conflito com: ${conflict.conflictingWith?.title} às ${conflict.conflictingWith?.startTime}`;
      }
      drafts.push(draft);
    }
  }

  // Fallback if none parsed
  if (drafts.length === 0) {
    const fallback = parseSingleSegmentDraft(text, refDate);
    if (fallback) drafts.push(fallback);
  }

  return {
    transcription: text,
    intent: 'CREATE_APPOINTMENTS',
    appointments: drafts,
    message: `Identifiquei ${drafts.length} compromisso(s) na mensagem.`,
  };
}

function parseSingleSegmentDraft(segment: string, refDate: Date): AppointmentDraft | null {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lower = segment.toLowerCase();

  // Calculate relative date
  let eventDate = new Date(refDate.getTime() + 24 * 60 * 60 * 1000); // default tomorrow
  if (lower.includes('hoje')) {
    eventDate = new Date(refDate);
  } else if (lower.includes('depois de amanhã') || lower.includes('depois de amanha')) {
    eventDate = new Date(refDate.getTime() + 48 * 60 * 60 * 1000);
  } else if (lower.includes('amanhã') || lower.includes('amanha')) {
    eventDate = new Date(refDate.getTime() + 24 * 60 * 60 * 1000);
  } else if (lower.includes('terça') || lower.includes('terca')) {
    eventDate = getNextDayOfWeek(refDate, 2);
  } else if (lower.includes('quarta')) {
    eventDate = getNextDayOfWeek(refDate, 3);
  } else if (lower.includes('quinta')) {
    eventDate = getNextDayOfWeek(refDate, 4);
  } else if (lower.includes('sexta')) {
    eventDate = getNextDayOfWeek(refDate, 5);
  } else if (lower.includes('sábado') || lower.includes('sabado')) {
    eventDate = getNextDayOfWeek(refDate, 6);
  } else if (lower.includes('domingo')) {
    eventDate = getNextDayOfWeek(refDate, 0);
  } else if (lower.includes('segunda')) {
    eventDate = getNextDayOfWeek(refDate, 1);
  }

  const dateStr = `${eventDate.getFullYear()}-${pad(eventDate.getMonth() + 1)}-${pad(eventDate.getDate())}`;

  // Time extraction
  let startTime = '08:00';
  if (lower.includes('duas da tarde') || lower.includes('14h') || lower.includes('14:00')) {
    startTime = '14:00';
  } else if (lower.includes('oito da manhã') || lower.includes('oito da manha') || lower.includes('08:00') || lower.includes('8h') || lower.includes('às 8') || lower.includes('as 8')) {
    startTime = '08:00';
  } else if (lower.includes('nove da manhã') || lower.includes('09:00') || lower.includes('9h')) {
    startTime = '09:00';
  } else if (lower.includes('dez da manhã') || lower.includes('10:00') || lower.includes('10h')) {
    startTime = '10:00';
  } else if (lower.includes('quinze') || lower.includes('15:00') || lower.includes('15h') || lower.includes('três da tarde')) {
    startTime = '15:00';
  } else if (lower.includes('oito')) {
    startTime = '08:00';
  }

  // Type extraction
  let serviceType: any = 'outro';
  if (lower.includes('visita')) serviceType = 'visita_tecnica';
  else if (lower.includes('reunião') || lower.includes('reuniao')) serviceType = 'reuniao';
  else if (lower.includes('manutenção') || lower.includes('manutencao')) serviceType = 'manutencao';
  else if (lower.includes('consulta')) serviceType = 'consulta';
  else if (lower.includes('ligação') || lower.includes('ligacao')) serviceType = 'ligacao';

  // Client name extraction
  let clientName = 'Cliente';
  if (lower.includes('fulano')) clientName = 'Fulano';
  else if (lower.includes('joão') || lower.includes('joao')) clientName = 'João';
  else if (lower.includes('maria')) clientName = 'Maria';
  else if (lower.includes('empresa abc')) clientName = 'Empresa ABC';

  // Location extraction
  let location = '';
  if (lower.includes('águas claras') || lower.includes('aguas claras')) location = 'Águas Claras';
  else if (lower.includes('escritório') || lower.includes('escritorio')) location = 'Escritório';

  const [sh] = startTime.split(':').map(Number);
  const endHour = (sh + 1) % 24;
  const endTime = `${pad(endHour)}:${startTime.split(':')[1]}`;

  return {
    title: `${serviceType === 'visita_tecnica' ? 'Visita técnica' : serviceType === 'reuniao' ? 'Reunião' : 'Compromisso'} — ${clientName}`,
    serviceType,
    date: dateStr,
    startTime,
    endTime,
    clientName,
    location,
    description: segment,
    notes: '',
    priority: 'media',
    reminderLeadTime: '24h',
    reminderTime: '',
    recurrence: 'none',
  };
}

function getNextDayOfWeek(fromDate: Date, targetDayOfWeek: number): Date {
  const result = new Date(fromDate);
  const currentDay = fromDate.getDay();
  let daysToAdd = targetDayOfWeek - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }
  result.setDate(result.getDate() + daysToAdd);
  return result;
}
