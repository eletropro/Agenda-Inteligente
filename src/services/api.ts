import { Appointment, AppointmentDraft, UserSettings, VoiceProcessResult } from '../types/index';

const LOCAL_STORAGE_KEY = 'agenda_inteligente_offline_events';
const LOCAL_SETTINGS_KEY = 'agenda_inteligente_offline_settings';

export class ApiClient {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
        ...options,
      });

      if (!res.ok) {
        let errorMsg = `Erro ${res.status}: ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch (_) {}
        throw new Error(errorMsg);
      }

      return await res.json();
    } catch (err: any) {
      console.warn(`API call failed for ${endpoint}:`, err.message);
      throw err;
    }
  }

  // AI Voice Processing
  public static async processVoice(
    audioBase64: string,
    mimeType: string,
    timezone: string,
    clientTranscript?: string
  ): Promise<VoiceProcessResult> {
    return this.request<VoiceProcessResult>('/api/ai/process-voice', {
      method: 'POST',
      body: JSON.stringify({
        audioBase64,
        mimeType,
        currentDateISO: new Date().toISOString(),
        timezone,
        clientTranscript: clientTranscript || '',
      }),
    });
  }

  // AI Text Processing
  public static async processText(text: string, timezone: string): Promise<VoiceProcessResult> {
    return this.request<VoiceProcessResult>('/api/ai/process-text', {
      method: 'POST',
      body: JSON.stringify({
        text,
        currentDateISO: new Date().toISOString(),
        timezone,
      }),
    });
  }

  // Events CRUD
  public static async getEvents(params?: {
    search?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    serviceType?: string;
  }): Promise<Appointment[]> {
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.date) query.set('date', params.date);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      if (params?.status) query.set('status', params.status);
      if (params?.serviceType) query.set('serviceType', params.serviceType);

      const qs = query.toString();
      const events = await this.request<Appointment[]>(`/api/events${qs ? `?${qs}` : ''}`);
      // Cache locally for offline backup
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
      } catch (e) {}
      return events;
    } catch (err) {
      // Offline fallback
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      throw err;
    }
  }

  public static async createEvent(draft: AppointmentDraft): Promise<Appointment> {
    return this.request<Appointment>('/api/events', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  }

  public static async batchCreateEvents(drafts: AppointmentDraft[]): Promise<Appointment[]> {
    return this.request<Appointment[]>('/api/events/batch', {
      method: 'POST',
      body: JSON.stringify({ drafts }),
    });
  }

  public static async updateEvent(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    return this.request<Appointment>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public static async deleteEvent(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/events/${id}`, {
      method: 'DELETE',
    });
  }

  // Reminders
  public static async getDueReminders(): Promise<Appointment[]> {
    return this.request<Appointment[]>('/api/reminders/due');
  }

  public static async acknowledgeReminder(id: string, status: 'enviado' | 'cancelado' = 'enviado'): Promise<void> {
    await this.request<{ success: boolean }>(`/api/reminders/${id}/ack`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  public static async triggerTestReminder(): Promise<{ success: boolean; event: Appointment }> {
    return this.request<{ success: boolean; event: Appointment }>('/api/reminders/test', {
      method: 'POST',
    });
  }

  // Settings & Stats
  public static async getSettings(): Promise<UserSettings> {
    try {
      const settings = await this.request<UserSettings>('/api/settings');
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
      return settings;
    } catch (e) {
      const cached = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (cached) return JSON.parse(cached);
      return {
        timezone: 'America/Sao_Paulo',
        defaultReminderLeadTime: '24h',
        enableSound: true,
        enableWebNotifications: true,
        soundVolume: 0.8,
        theme: 'light',
      };
    }
  }

  public static async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    return this.request<UserSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public static async getStats(): Promise<{
    total: number;
    pendentes: number;
    concluidos: number;
    cancelados: number;
    conflitos: number;
  }> {
    return this.request('/api/stats');
  }

  public static async getAuditLogs(): Promise<any[]> {
    return this.request('/api/audit');
  }

  public static async exportBackup(): Promise<any> {
    return this.request('/api/backup');
  }

  public static async importBackup(payload: any): Promise<{ count: number }> {
    return this.request('/api/backup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async resetDemo(): Promise<void> {
    await this.request('/api/system/reset-demo', {
      method: 'POST',
    });
  }
}
