import fs from 'fs';
import path from 'path';
import { Appointment, AppointmentDraft, AuditLog, UserSettings } from '../src/types/index';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'agenda_db.json');

interface DatabaseSchema {
  events: Appointment[];
  settings: UserSettings;
  auditLogs: AuditLog[];
}

const DEFAULT_SETTINGS: UserSettings = {
  timezone: 'America/Sao_Paulo',
  defaultReminderLeadTime: '24h',
  enableSound: true,
  enableWebNotifications: true,
  soundVolume: 0.8,
  theme: 'light',
};

// Calculate ISO reminder timestamp based on date, startTime and leadTime
export function calculateReminderTime(date: string, startTime: string, leadTime: string): string {
  // Construct appointment start timestamp
  const startDateTime = new Date(`${date}T${startTime}:00`);
  if (isNaN(startDateTime.getTime())) {
    return new Date().toISOString();
  }

  let offsetMinutes = 24 * 60; // default 24 hours
  switch (leadTime) {
    case '30m':
      offsetMinutes = 30;
      break;
    case '1h':
      offsetMinutes = 60;
      break;
    case '24h':
      offsetMinutes = 24 * 60;
      break;
    case '48h':
      offsetMinutes = 48 * 60;
      break;
    case '72h':
      offsetMinutes = 72 * 60;
      break;
    default:
      offsetMinutes = 24 * 60;
      break;
  }

  const reminderDate = new Date(startDateTime.getTime() - offsetMinutes * 60 * 1000);
  return reminderDate.toISOString();
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = {
      events: [],
      settings: DEFAULT_SETTINGS,
      auditLogs: [],
    };
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          events: Array.isArray(parsed.events) ? parsed.events : [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        };
      } else {
        // Seed initial friendly demo events if database is brand new
        this.seedInitialData();
        this.save();
      }
    } catch (err) {
      console.error('Failed to initialize database, resetting to default:', err);
      this.data = {
        events: [],
        settings: DEFAULT_SETTINGS,
        auditLogs: [],
      };
      this.seedInitialData();
      this.save();
    }
  }

  private seedInitialData() {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    
    // Tomorrow
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    // Day after tomorrow
    const dayAfter = new Date(today.getTime() + 48 * 60 * 60 * 1000);
    const dayAfterStr = `${dayAfter.getFullYear()}-${pad(dayAfter.getMonth() + 1)}-${pad(dayAfter.getDate())}`;

    const seed1: Appointment = {
      id: 'demo-1',
      title: 'Visita técnica — Fulano',
      serviceType: 'visita_tecnica',
      date: tomorrowStr,
      startTime: '08:00',
      endTime: '09:30',
      clientName: 'Fulano Silva',
      clientPhone: '(61) 98765-4321',
      location: 'Águas Claras, Edifício Boulevard, Sala 402',
      description: 'Inspeção e diagnóstico de equipamento predial',
      notes: 'Trazer kit de chaves e multímetro.',
      priority: 'alta',
      status: 'pendente',
      reminderLeadTime: '24h',
      reminderTime: calculateReminderTime(tomorrowStr, '08:00', '24h'),
      reminderStatus: 'pendente',
      recurrence: 'none',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const seed2: Appointment = {
      id: 'demo-2',
      title: 'Reunião comercial — João',
      serviceType: 'reuniao',
      date: dayAfterStr,
      startTime: '14:00',
      endTime: '15:00',
      clientName: 'João Santos',
      clientPhone: '(61) 99888-1122',
      location: 'Escritório Central - Sala de Conferência',
      description: 'Apresentação da proposta de manutenção preventiva',
      notes: 'Levar cópias do contrato.',
      priority: 'media',
      status: 'pendente',
      reminderLeadTime: '24h',
      reminderTime: calculateReminderTime(dayAfterStr, '14:00', '24h'),
      reminderStatus: 'pendente',
      recurrence: 'none',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.events = [seed1, seed2];
    this.logAudit('SYSTEM_INIT', 'Banco de dados inicializado com dados demonstrativos');
  }

  private save() {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }

  public logAudit(action: string, details: string) {
    const entry: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.length = 500;
    }
    this.save();
  }

  public checkConflicts(date: string, startTime: string, endTime: string, excludeId?: string): { hasConflict: boolean; conflictingWith?: Appointment } {
    // Only check active appointments (not cancelled)
    const matchingDate = this.data.events.filter(
      (e) => e.date === date && e.status !== 'cancelado' && e.id !== excludeId
    );

    const parseMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    const newStart = parseMinutes(startTime);
    const newEnd = parseMinutes(endTime || startTime) + (startTime === endTime ? 60 : 0);

    for (const event of matchingDate) {
      const evStart = parseMinutes(event.startTime);
      const evEnd = parseMinutes(event.endTime || event.startTime) + (event.startTime === event.endTime ? 60 : 0);

      // Overlap condition: start1 < end2 AND start2 < end1
      if (newStart < evEnd && evStart < newEnd) {
        return { hasConflict: true, conflictingWith: event };
      }
    }

    return { hasConflict: false };
  }

  public getAllEvents(filters?: {
    search?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    serviceType?: string;
  }): Appointment[] {
    let result = [...this.data.events];

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.clientName.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q)
      );
    }

    if (filters?.date) {
      result = result.filter((e) => e.date === filters.date);
    }

    if (filters?.startDate) {
      result = result.filter((e) => e.date >= filters.startDate!);
    }

    if (filters?.endDate) {
      result = result.filter((e) => e.date <= filters.endDate!);
    }

    if (filters?.status && filters.status !== 'todos') {
      result = result.filter((e) => e.status === filters.status);
    }

    if (filters?.serviceType && filters.serviceType !== 'todos') {
      result = result.filter((e) => e.serviceType === filters.serviceType);
    }

    // Sort chronologically by date then startTime
    return result.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  }

  public getEventById(id: string): Appointment | undefined {
    return this.data.events.find((e) => e.id === id);
  }

  public createEvent(data: AppointmentDraft): Appointment {
    const id = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const reminderLeadTime = data.reminderLeadTime || this.data.settings.defaultReminderLeadTime || '24h';
    const reminderTime = calculateReminderTime(data.date, data.startTime, reminderLeadTime);

    const newEvent: Appointment = {
      id,
      title: data.title || 'Compromisso',
      serviceType: data.serviceType || 'outro',
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime || data.startTime,
      clientName: data.clientName || 'Não especificado',
      clientPhone: data.clientPhone || '',
      location: data.location || '',
      description: data.description || '',
      notes: data.notes || '',
      priority: data.priority || 'media',
      status: data.status || 'pendente',
      reminderLeadTime,
      reminderTime,
      reminderStatus: 'pendente',
      recurrence: data.recurrence || 'none',
      createdAt: now,
      updatedAt: now,
    };

    this.data.events.push(newEvent);
    this.logAudit('CREATE_EVENT', `Compromisso criado: ${newEvent.title} em ${newEvent.date} às ${newEvent.startTime}`);
    this.save();
    return newEvent;
  }

  public batchCreateEvents(drafts: AppointmentDraft[]): Appointment[] {
    const created: Appointment[] = [];
    for (const draft of drafts) {
      created.push(this.createEvent(draft));
    }
    return created;
  }

  public updateEvent(id: string, updates: Partial<Appointment>): Appointment | null {
    const index = this.data.events.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const current = this.data.events[index];
    const newDate = updates.date || current.date;
    const newStartTime = updates.startTime || current.startTime;
    const newLeadTime = updates.reminderLeadTime || current.reminderLeadTime;

    // Recalculate reminder time if date, time or lead time changed
    let reminderTime = current.reminderTime;
    let reminderStatus = updates.reminderStatus || current.reminderStatus;

    if (updates.date || updates.startTime || updates.reminderLeadTime) {
      reminderTime = calculateReminderTime(newDate, newStartTime, newLeadTime);
      if (reminderStatus === 'enviado') {
        // Reset reminder status so notification can fire for the rescheduled date
        reminderStatus = 'pendente';
      }
    }

    if (updates.status === 'cancelado') {
      reminderStatus = 'cancelado';
    }

    const updated: Appointment = {
      ...current,
      ...updates,
      reminderTime,
      reminderStatus,
      updatedAt: new Date().toISOString(),
    };

    this.data.events[index] = updated;
    this.logAudit('UPDATE_EVENT', `Compromisso atualizado: ${updated.title} (${updated.date} ${updated.startTime})`);
    this.save();
    return updated;
  }

  public deleteEvent(id: string): boolean {
    const index = this.data.events.findIndex((e) => e.id === id);
    if (index === -1) return false;

    const removed = this.data.events.splice(index, 1)[0];
    this.logAudit('DELETE_EVENT', `Compromisso excluído: ${removed.title} (${removed.date})`);
    this.save();
    return true;
  }

  public getDueReminders(): Appointment[] {
    const now = new Date();
    // Return appointments with pending reminders whose reminderTime is reached
    // and whose event date has not completely passed
    return this.data.events.filter((e) => {
      if (e.status === 'cancelado' || e.reminderStatus !== 'pendente') return false;
      const remDate = new Date(e.reminderTime);
      return remDate <= now;
    });
  }

  public markReminderStatus(id: string, status: 'enviado' | 'falhou' | 'cancelado') {
    const event = this.data.events.find((e) => e.id === id);
    if (event) {
      event.reminderStatus = status;
      event.updatedAt = new Date().toISOString();
      this.logAudit('REMINDER_TRIGGER', `Lembrete marcado como '${status}' para: ${event.title}`);
      this.save();
    }
  }

  public getStats() {
    const events = this.data.events;
    const total = events.length;
    const pendentes = events.filter((e) => e.status === 'pendente').length;
    const concluidos = events.filter((e) => e.status === 'concluido').length;
    const cancelados = events.filter((e) => e.status === 'cancelado').length;

    // Count conflicts
    let conflictCount = 0;
    for (let i = 0; i < events.length; i++) {
      if (events[i].status === 'cancelado') continue;
      for (let j = i + 1; j < events.length; j++) {
        if (events[j].status === 'cancelado') continue;
        if (events[i].date === events[j].date) {
          const s1 = events[i].startTime;
          const s2 = events[j].startTime;
          if (s1 === s2) {
            conflictCount++;
            break;
          }
        }
      }
    }

    return {
      total,
      pendentes,
      concluidos,
      cancelados,
      conflitos: conflictCount,
    };
  }

  public getSettings(): UserSettings {
    return { ...this.data.settings };
  }

  public updateSettings(updates: Partial<UserSettings>): UserSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.logAudit('SETTINGS_UPDATE', 'Configurações de usuário atualizadas');
    this.save();
    return this.data.settings;
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.data.auditLogs];
  }

  public exportBackup() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      ...this.data,
    };
  }

  public importBackup(payload: any) {
    if (!payload || !Array.isArray(payload.events)) {
      throw new Error('Arquivo de backup inválido');
    }
    this.data.events = payload.events;
    if (payload.settings) {
      this.data.settings = { ...DEFAULT_SETTINGS, ...payload.settings };
    }
    this.logAudit('BACKUP_IMPORT', `Backup importado com ${payload.events.length} compromissos`);
    this.save();
    return { count: payload.events.length };
  }

  public resetToDemo() {
    this.data.events = [];
    this.seedInitialData();
    this.save();
    return { success: true };
  }
}

export const db = new Database();
