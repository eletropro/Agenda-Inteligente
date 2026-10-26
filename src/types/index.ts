export type ServiceType = 
  | 'visita_tecnica'
  | 'reuniao'
  | 'manutencao'
  | 'consulta'
  | 'ligacao'
  | 'pessoal'
  | 'outro';

export type Priority = 'baixa' | 'media' | 'alta' | 'urgente';

export type AppointmentStatus = 'pendente' | 'concluido' | 'cancelado';

export type ReminderLeadTime = '24h' | '48h' | '72h' | '1h' | '30m' | 'custom';

export type ReminderStatus = 'pendente' | 'enviado' | 'falhou' | 'cancelado';

export interface Appointment {
  id: string;
  title: string;
  serviceType: ServiceType;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  clientName: string;
  clientPhone?: string;
  location: string;
  description: string;
  notes: string;
  priority: Priority;
  status: AppointmentStatus;
  reminderLeadTime: ReminderLeadTime;
  reminderTime: string; // ISO string
  reminderStatus: ReminderStatus;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
}

export type AppointmentDraft = Omit<
  Appointment,
  'id' | 'createdAt' | 'updatedAt' | 'reminderStatus' | 'status' | 'reminderTime' | 'recurrence'
> & {
  id?: string;
  status?: AppointmentStatus;
  reminderStatus?: ReminderStatus;
  reminderTime?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  hasConflict?: boolean;
  conflictDetails?: string;
  needClarification?: boolean;
  clarificationMessage?: string;
};

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserSettings {
  timezone: string;
  defaultReminderLeadTime: ReminderLeadTime;
  enableSound: boolean;
  enableWebNotifications: boolean;
  soundVolume: number;
  theme: ThemeMode;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface VoiceProcessResult {
  transcription: string;
  intent: 'CREATE_APPOINTMENTS' | 'UPDATE_APPOINTMENT' | 'CANCEL_APPOINTMENT' | 'COMPLETE_APPOINTMENT' | 'ADD_NOTE' | 'QUERY_SCHEDULE' | 'UNCLEAR';
  appointments: AppointmentDraft[];
  message: string;
  queryAnswer?: string;
  targetEventId?: string;
  clarificationRequired?: boolean;
}
