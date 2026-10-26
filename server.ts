import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './server/db';
import { processVoiceOrTextIntent, transcribeAudio } from './server/ai';
import { scheduler } from './server/scheduler';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Increase JSON body limit for audio recordings and uploaded audio files
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Start background reminder worker
scheduler.start();

// --- API ROUTES ---

// 1. Process Voice Audio (Transcribe + Semantic Parsing)
app.post('/api/ai/process-voice', async (req, res) => {
  try {
    const { audioBase64, mimeType, currentDateISO, timezone, clientTranscript } = req.body;
    if (!audioBase64 && !clientTranscript) {
      return res.status(400).json({ error: 'Nenhum dado de áudio ou texto falado fornecido.' });
    }

    // Step 1: Transcribe audio to Portuguese (with clientTranscript fallback)
    let transcription = '';
    try {
      transcription = await transcribeAudio(audioBase64 || '', mimeType || 'audio/webm', clientTranscript);
    } catch (transcribeErr: any) {
      if (clientTranscript && clientTranscript.trim()) {
        transcription = clientTranscript.trim();
      } else {
        throw transcribeErr;
      }
    }
    
    // Step 2: Semantic Intent Parsing & Appointment Extraction
    const result = await processVoiceOrTextIntent(
      transcription,
      currentDateISO,
      timezone || 'America/Sao_Paulo'
    );

    res.json(result);
  } catch (err: any) {
    console.error('Error in /api/ai/process-voice:', err);
    res.status(500).json({
      error: err.message || 'Erro ao processar áudio.',
    });
  }
});

// 2. Process Text Command (Direct text or edited transcription)
app.post('/api/ai/process-text', async (req, res) => {
  try {
    const { text, currentDateISO, timezone } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Texto não fornecido.' });
    }

    const result = await processVoiceOrTextIntent(
      text,
      currentDateISO,
      timezone || 'America/Sao_Paulo'
    );

    res.json(result);
  } catch (err: any) {
    console.error('Error in /api/ai/process-text:', err);
    res.status(500).json({
      error: err.message || 'Erro ao processar comando de texto.',
    });
  }
});

// 3. Events CRUD
app.get('/api/events', (req, res) => {
  try {
    const { search, date, startDate, endDate, status, serviceType } = req.query;
    const events = db.getAllEvents({
      search: search as string,
      date: date as string,
      startDate: startDate as string,
      endDate: endDate as string,
      status: status as string,
      serviceType: serviceType as string,
    });
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', (req, res) => {
  try {
    const eventDraft = req.body;
    if (!eventDraft.title || !eventDraft.date || !eventDraft.startTime) {
      return res.status(400).json({ error: 'Título, data e horário inicial são obrigatórios.' });
    }
    const created = db.createEvent(eventDraft);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/batch', (req, res) => {
  try {
    const { drafts } = req.body;
    if (!Array.isArray(drafts) || drafts.length === 0) {
      return res.status(400).json({ error: 'Lista de compromissos inválida.' });
    }
    const created = db.batchCreateEvents(drafts);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events/:id', (req, res) => {
  const event = db.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Compromisso não encontrado.' });
  res.json(event);
});

app.put('/api/events/:id', (req, res) => {
  try {
    const updated = db.updateEvent(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Compromisso não encontrado.' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/events/:id', (req, res) => {
  try {
    const success = db.deleteEvent(req.params.id);
    if (!success) return res.status(404).json({ error: 'Compromisso não encontrado.' });
    res.json({ success: true, message: 'Compromisso excluído com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Reminders & Notifications
app.get('/api/reminders/due', (_req, res) => {
  try {
    const due = db.getDueReminders();
    res.json(due);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reminders/:id/ack', (req, res) => {
  try {
    const { status } = req.body; // 'enviado' | 'falhou' | 'cancelado'
    db.markReminderStatus(req.params.id, status || 'enviado');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reminders/test', (_req, res) => {
  try {
    // Generate an instant test reminder for demonstration
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dateStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    const testEvent = db.createEvent({
      title: 'Teste de Lembrete Sonoro — Demonstração',
      serviceType: 'visita_tecnica',
      date: dateStr,
      startTime: '08:00',
      endTime: '09:00',
      clientName: 'Cliente Teste',
      location: 'Águas Claras, Brasília - DF',
      description: 'Lembrete sonoro com antecedência de 24 horas',
      notes: 'Notificação com som de alerta disparada para validação da plataforma.',
      priority: 'alta',
      reminderLeadTime: '24h',
      status: 'pendente',
    });

    // Artificially trigger reminder timestamp to now so it activates immediately
    db.updateEvent(testEvent.id, {
      reminderTime: new Date(Date.now() - 5000).toISOString(),
      reminderStatus: 'pendente',
    });

    res.json({ success: true, event: testEvent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. User Settings & Stats
app.get('/api/settings', (_req, res) => {
  res.json(db.getSettings());
});

app.put('/api/settings', (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', (_req, res) => {
  res.json(db.getStats());
});

app.get('/api/audit', (_req, res) => {
  res.json(db.getAuditLogs());
});

// 6. Backup & Restore
app.get('/api/backup', (_req, res) => {
  res.json(db.exportBackup());
});

app.post('/api/backup', (req, res) => {
  try {
    const result = db.importBackup(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/system/reset-demo', (_req, res) => {
  try {
    db.resetToDemo();
    res.json({ success: true, message: 'Dados restaurados para o padrão com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- VITE MIDDLEWARE & STATIC SERVING ---
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Agenda Inteligente] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
