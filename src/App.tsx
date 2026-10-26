import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Mic,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CalendarCheck2,
  Bell,
  Sparkles,
  WifiOff,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Appointment, AppointmentDraft, UserSettings, VoiceProcessResult } from './types/index';
import { ApiClient } from './services/api';
import { soundService } from './services/sound';
import { notificationService } from './services/notifications';
import { useOnlineStatus } from './hooks/usePWA';

import { Header } from './components/Header';
import { CalendarView } from './components/CalendarView';
import { VoiceActionModal } from './components/VoiceActionModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { VoiceEditQueryModal } from './components/VoiceEditQueryModal';
import { EventDetailModal } from './components/EventDetailModal';
import { ManualCreateModal } from './components/ManualCreateModal';
import { SettingsModal } from './components/SettingsModal';
import { ActiveReminderModal } from './components/ActiveReminderModal';

export default function App() {
  const isOnline = useOnlineStatus();

  // App State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    timezone: 'America/Sao_Paulo',
    defaultReminderLeadTime: '24h',
    enableSound: true,
    enableWebNotifications: true,
    soundVolume: 0.8,
    theme: 'light',
  });
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    concluidos: 0,
    cancelados: 0,
    conflitos: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Modals state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [extractedDrafts, setExtractedDrafts] = useState<AppointmentDraft[]>([]);
  const [voiceResult, setVoiceResult] = useState<VoiceProcessResult | null>(null);
  const [isVoiceEditModalOpen, setIsVoiceEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualDefaultDate, setManualDefaultDate] = useState<string | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active reminder alert
  const [activeReminderEvent, setActiveReminderEvent] = useState<Appointment | null>(null);

  // Success toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedEvents, fetchedSettings, fetchedStats] = await Promise.all([
        ApiClient.getEvents({ search: searchQuery }),
        ApiClient.getSettings(),
        ApiClient.getStats(),
      ]);

      setEvents(fetchedEvents);
      setSettings(fetchedSettings);
      setStats(fetchedStats);
    } catch (err) {
      console.error('Error loading agenda data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Synchronize dark mode class based on settings.theme ('light' | 'dark' | 'system')
  useEffect(() => {
    const applyTheme = () => {
      let isDark = false;
      if (settings.theme === 'dark') {
        isDark = true;
      } else if (settings.theme === 'system') {
        isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = false;
      }
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    if (settings.theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  // Periodic Reminder Polling (runs every 15s)
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const due = await ApiClient.getDueReminders();
        if (due.length > 0) {
          const firstDue = due[0];
          setActiveReminderEvent(firstDue);

          // Play Web Audio synthesized bell chime if sound enabled
          if (settings.enableSound) {
            soundService.playReminderChime(settings.soundVolume);
          }

          // Trigger browser Web Notification
          if (settings.enableWebNotifications) {
            notificationService.showAppointmentNotification(firstDue, () => {
              setSelectedEvent(firstDue);
            });
          }
        }
      } catch (e) {
        // Silent fail during network drops
      }
    };

    // Run once after initial load then interval
    const timeout = setTimeout(checkReminders, 3000);
    const interval = setInterval(checkReminders, 15000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [settings]);

  // Handlers
  const handleVoiceProcessSuccess = (result: VoiceProcessResult) => {
    setVoiceResult(result);

    if (result.intent === 'CREATE_APPOINTMENTS' && result.appointments.length > 0) {
      setExtractedDrafts(result.appointments);
      setIsConfirmModalOpen(true);
    } else {
      // Voice action or query schedule
      setIsVoiceEditModalOpen(true);
    }
  };

  const handleDismissReminder = async () => {
    if (activeReminderEvent) {
      try {
        await ApiClient.acknowledgeReminder(activeReminderEvent.id, 'enviado');
      } catch (e) {}
      setActiveReminderEvent(null);
      loadData();
    }
  };

  const handleQuickToggleComplete = async (ev: Appointment) => {
    const newStatus = ev.status === 'concluido' ? 'pendente' : 'concluido';
    try {
      await ApiClient.updateEvent(ev.id, { status: newStatus });
      showToast(newStatus === 'concluido' ? 'Compromisso marcado como concluído!' : 'Compromisso reaberto!');
      loadData();
    } catch (e: any) {
      showToast(`Erro: ${e.message}`);
    }
  };

  const handleQuickCancel = async (ev: Appointment) => {
    try {
      await ApiClient.updateEvent(ev.id, { status: 'cancelado' });
      showToast('Compromisso desmarcado com sucesso.');
      loadData();
    } catch (e: any) {
      showToast(`Erro: ${e.message}`);
    }
  };

  const handleTestReminderSound = async () => {
    soundService.playReminderChime(settings.soundVolume);
    try {
      const res = await ApiClient.triggerTestReminder();
      showToast('Lembrete sonoro de teste disparado com sucesso!');
      loadData();
    } catch (e: any) {
      showToast('Alerta sonoro reproduzido.');
    }
  };

  const handleToggleDarkMode = async () => {
    const nextTheme: 'light' | 'dark' = isDarkMode ? 'light' : 'dark';
    const updated = { ...settings, theme: nextTheme };
    setSettings(updated);
    setIsDarkMode(nextTheme === 'dark');
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    showToast(nextTheme === 'dark' ? 'Tema escuro ativado!' : 'Tema claro ativado!');
    try {
      await ApiClient.updateSettings({ theme: nextTheme });
    } catch (e) {
      // Local state is already updated
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans">
      
      {/* Top Header */}
      <Header
        currentDate={currentDate}
        onGoToToday={() => setCurrentDate(new Date())}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onOpenManualCreate={() => {
          setManualDefaultDate(undefined);
          setIsManualModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onTestReminderSound={handleTestReminderSound}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl border border-slate-700 dark:border-slate-200 text-xs sm:text-sm font-semibold animate-in slide-in-from-bottom-5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-3 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong>Modo Offline Ativo:</strong> Você está desconectado. Seus compromissos em cache estão visíveis e novas gravações serão sincronizadas assim que a conexão retornar.
            </div>
          </div>
        )}

        {/* Hero Voice Scheduling Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white p-6 sm:p-8 shadow-xl shadow-blue-500/10">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-blue-100">
                <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                Secretária Pessoal Inteligente por Voz
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Fale naturalmente seus compromissos
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Grave um áudio dizendo: <em>"Na próxima terça-feira tenho visita técnica para o Fulano em Águas Claras às oito da manhã"</em>. O sistema interpreta datas, horários e cria lembretes sonoros com 24h de antecedência.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="flex items-center gap-2.5 px-5 sm:px-6 py-3 rounded-2xl bg-white text-blue-700 font-black text-sm shadow-lg shadow-black/10 hover:bg-blue-50 active:scale-95 transition"
              >
                <Mic className="w-5 h-5 text-blue-600 animate-pulse" />
                <span>Gravar por Voz</span>
              </button>

              <button
                onClick={() => {
                  setManualDefaultDate(undefined);
                  setIsManualModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur-md text-white font-semibold text-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Digitar Manualmente</span>
              </button>
            </div>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-indigo-500/30 blur-3xl pointer-events-none" />
          <div className="absolute left-1/2 -top-10 w-48 h-48 rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />
        </div>

        {/* Summary Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {stats.total}
              </div>
              <div className="text-xs text-slate-500 font-medium">Total Agendado</div>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {stats.pendentes}
              </div>
              <div className="text-xs text-slate-500 font-medium">Pendentes</div>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {stats.concluidos}
              </div>
              <div className="text-xs text-slate-500 font-medium">Concluídos</div>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
              stats.conflitos > 0
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {stats.conflitos}
              </div>
              <div className="text-xs text-slate-500 font-medium">Conflitos de Horário</div>
            </div>
          </div>
        </div>

        {/* Calendar Main Component */}
        <CalendarView
          events={events}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onSelectEvent={(ev) => setSelectedEvent(ev)}
          onQuickToggleComplete={handleQuickToggleComplete}
          onQuickCancel={handleQuickCancel}
          onOpenCreateModal={(date) => {
            setManualDefaultDate(date);
            setIsManualModalOpen(true);
          }}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Agenda Inteligente por Voz</span>
            <span>•</span>
            <span>Fuso Horário: {settings.timezone}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-blue-600 transition"
            >
              Configurar Lembretes & Som
            </button>
            <button
              onClick={handleTestReminderSound}
              className="hover:text-blue-600 transition flex items-center gap-1"
            >
              <Bell className="w-3.5 h-3.5 text-blue-500" />
              Testar Sino
            </button>
          </div>
        </div>
      </footer>

      {/* --- MODALS --- */}

      {/* 1. Voice Record & Command Modal */}
      <VoiceActionModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        timezone={settings.timezone}
        onProcessSuccess={handleVoiceProcessSuccess}
      />

      {/* 2. Confirmation Modal before booking */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        drafts={extractedDrafts}
        onConfirmSuccess={() => {
          showToast('Compromissos salvos com sucesso na agenda!');
          loadData();
        }}
      />

      {/* 3. Voice Edit & Query Modal */}
      <VoiceEditQueryModal
        isOpen={isVoiceEditModalOpen}
        onClose={() => setIsVoiceEditModalOpen(false)}
        result={voiceResult}
        onActionCompleted={() => {
          showToast('Ação por voz executada!');
          loadData();
        }}
      />

      {/* 4. Event Detail & Edit Modal */}
      <EventDetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        onEventUpdated={() => {
          showToast('Compromisso atualizado!');
          loadData();
        }}
        onEventDeleted={() => {
          showToast('Compromisso excluído com sucesso.');
          loadData();
        }}
      />

      {/* 5. Manual Create Modal */}
      <ManualCreateModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        defaultDate={manualDefaultDate}
        onCreated={() => {
          showToast('Compromisso criado com sucesso!');
          loadData();
        }}
      />

      {/* 6. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsUpdated={(newSettings) => {
          setSettings(newSettings);
          showToast('Preferências salvas!');
        }}
        onRefreshData={loadData}
      />

      {/* 7. Active Reminder Alert with Sound */}
      <ActiveReminderModal
        isOpen={!!activeReminderEvent}
        event={activeReminderEvent}
        onDismiss={handleDismissReminder}
        onOpenDetails={(ev) => {
          setSelectedEvent(ev);
          handleDismissReminder();
        }}
      />
    </div>
  );
}
