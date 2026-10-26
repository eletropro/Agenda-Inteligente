import React, { useState } from 'react';
import {
  Settings,
  X,
  Bell,
  Volume2,
  Globe,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Check,
  AlertCircle,
  HelpCircle,
  Play,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { ReminderLeadTime, ThemeMode, UserSettings } from '../types/index';
import { ApiClient } from '../services/api';
import { soundService } from '../services/sound';
import { notificationService } from '../services/notifications';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSettingsUpdated: (updated: UserSettings) => void;
  onRefreshData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsUpdated,
  onRefreshData,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<UserSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'geral' | 'som' | 'backup' | 'seguranca'>('geral');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    notificationService.getPermission()
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await ApiClient.updateSettings(formData);
      onSettingsUpdated(updated);
      setStatusMessage('Configurações salvas com sucesso!');
      setTimeout(() => setStatusMessage(null), 2000);
    } catch (e: any) {
      setStatusMessage(`Erro ao salvar: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSound = () => {
    soundService.playReminderChime(formData.soundVolume);
  };

  const handleTestNotification = async () => {
    soundService.playReminderChime(formData.soundVolume);
    if (notificationService.getPermission() !== 'granted') {
      const perm = await notificationService.requestPermission();
      setNotificationPermission(perm);
    }
    notificationService.showSimpleNotification(
      'LEMBRETE DE COMPROMISSO (TESTE)',
      'Amanhã você tem: Visita técnica — Fulano.\nHorário: 08:00. Local: Águas Claras.'
    );
    setStatusMessage('Notificação de teste e som disparados!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleRequestNotificationPermission = async () => {
    const perm = await notificationService.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      setStatusMessage('Permissão concedida com sucesso!');
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await ApiClient.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-agenda-inteligente-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Backup exportado com sucesso!');
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (e: any) {
      setStatusMessage(`Erro ao exportar backup: ${e.message}`);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const json = JSON.parse(reader.result as string);
        const res = await ApiClient.importBackup(json);
        setStatusMessage(`Backup importado com sucesso! (${res.count} compromissos)`);
        onRefreshData();
        setTimeout(() => setStatusMessage(null), 3000);
      } catch (err: any) {
        setStatusMessage(`Falha ao importar backup: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetToDemo = async () => {
    try {
      await ApiClient.resetDemo();
      onRefreshData();
      setConfirmReset(false);
      setStatusMessage('Dados demonstrativos restaurados com sucesso!');
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (e: any) {
      setStatusMessage(`Erro ao restaurar: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Configurações da Agenda
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize notificações sonoras, fuso horário e backups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex items-center gap-1.5 my-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('geral')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeTab === 'geral'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Geral
          </button>
          <button
            onClick={() => setActiveTab('som')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeTab === 'som'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Lembretes & Som
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Backup & Dados
          </button>
          <button
            onClick={() => setActiveTab('seguranca')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeTab === 'seguranca'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Privacidade
          </button>
        </div>

        {/* Feedback message */}
        {statusMessage && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-blue-600" />
            {statusMessage}
          </div>
        )}

        {/* Content Tabs */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {/* TAB 1: Geral */}
          {activeTab === 'geral' && (
            <div className="space-y-4 text-xs sm:text-sm">
              {/* Theme Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Tema da Interface
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Light theme */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...formData, theme: 'light' as ThemeMode };
                      setFormData(next);
                      onSettingsUpdated(next);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition ${
                      formData.theme === 'light'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs">
                      <Sun className="w-4 h-4" />
                    </div>
                    <span className="text-xs">Claro</span>
                  </button>

                  {/* Dark theme */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...formData, theme: 'dark' as ThemeMode };
                      setFormData(next);
                      onSettingsUpdated(next);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition ${
                      formData.theme === 'dark'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-indigo-400 flex items-center justify-center shadow-2xs border border-slate-700">
                      <Moon className="w-4 h-4" />
                    </div>
                    <span className="text-xs">Escuro</span>
                  </button>

                  {/* System theme */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...formData, theme: 'system' as ThemeMode };
                      setFormData(next);
                      onSettingsUpdated(next);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition ${
                      formData.theme === 'system'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-2xs">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <span className="text-xs">Sistema</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  {formData.theme === 'dark'
                    ? '🌙 Tema escuro ativo: fundo escuro e textos em alto contraste para conforto visual à noite.'
                    : formData.theme === 'light'
                    ? '☀️ Tema claro ativo: ideal para ambientes bem iluminados e uso diurno.'
                    : '💻 Automático: acompanha automaticamente a preferência do seu sistema operacional.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fuso Horário Padrão
                </label>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="America/Sao_Paulo">América / São Paulo (Horário de Brasília - UTC-3)</option>
                    <option value="America/Manaus">América / Manaus (UTC-4)</option>
                    <option value="America/Belem">América / Belém (UTC-3)</option>
                    <option value="America/Cuiaba">América / Cuiabá (UTC-4)</option>
                    <option value="America/Rio_Branco">América / Rio Branco (UTC-5)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Antecedência Padrão dos Lembretes
                </label>
                <select
                  value={formData.defaultReminderLeadTime}
                  onChange={(e) => setFormData({ ...formData, defaultReminderLeadTime: e.target.value as ReminderLeadTime })}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="24h">1 dia antes no mesmo horário (24 horas - Padrão)</option>
                  <option value="48h">2 dias antes (48 horas)</option>
                  <option value="72h">3 dias antes (72 horas)</option>
                  <option value="1h">1 hora antes do início</option>
                  <option value="30m">30 minutos antes</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Exemplo: compromisso terça às 08:00 será lembrado na segunda-feira às 08:00.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Som & Notificações */}
          {activeTab === 'som' && (
            <div className="space-y-4 text-xs sm:text-sm">
              {/* Notification Permissions status */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Notificações do Navegador:
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      notificationPermission === 'granted'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : notificationPermission === 'denied'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {notificationPermission === 'granted'
                      ? 'Autorizado'
                      : notificationPermission === 'denied'
                      ? 'Bloqueado no Navegador'
                      : 'Não Solicitado'}
                  </span>
                </div>

                {notificationPermission !== 'granted' && (
                  <button
                    onClick={handleRequestNotificationPermission}
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    Solicitar Permissão de Notificações
                  </button>
                )}

                {notificationPermission === 'denied' && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">
                    As notificações estão bloqueadas. Para receber lembretes, clique no ícone de cadeado na barra de endereço do navegador e mude Notificações para "Permitir".
                  </p>
                )}
              </div>

              {/* Sound volume slider */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-blue-600" />
                    Sino do Lembrete (Sintetizador Web Audio)
                  </span>
                  <button
                    onClick={handleTestSound}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold hover:bg-blue-100 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Ouvir Sino
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Volume do Alerta</span>
                    <span>{Math.round(formData.soundVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={formData.soundVolume}
                    onChange={(e) => setFormData({ ...formData, soundVolume: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>

              {/* Test 24h prior reminder button */}
              <button
                onClick={handleTestNotification}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition"
              >
                <Bell className="w-4 h-4" />
                Disparar Teste Real de Lembrete Sonoro
              </button>
            </div>
          )}

          {/* TAB 3: Backup & Restore */}
          {activeTab === 'backup' && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Backup dos Compromissos
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Exporte todos os seus agendamentos para um arquivo JSON seguro ou importe de outro dispositivo.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleExportBackup}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Backup (JSON)
                  </button>

                  <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer transition">
                    <Upload className="w-4 h-4" />
                    Importar Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
                <h4 className="font-bold text-rose-900 dark:text-rose-200">
                  Restaurar Demonstração
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  Restaura os compromissos iniciais de exemplo (Visita técnica Fulano e Reunião João).
                </p>
                {confirmReset ? (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                      Confirmar restauração?
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToDemo}
                      className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      Sim, Restaurar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Dados
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Segurança e Privacidade */}
          {activeTab === 'seguranca' && (
            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                Segurança e Privacidade da Agenda
              </div>
              <p>
                • <strong>Sem exposição de credenciais:</strong> As chamadas para a inteligência artificial Gemini ocorrem exclusivamente pelo servidor backend proxy com cabeçalho telemetry validado. Nenhuma chave secreta trafega pelo navegador.
              </p>
              <p>
                • <strong>Persistência Segura:</strong> Seus dados são salvos em banco de dados persistente no backend e mantêm-se salvos mesmo ao fechar a aba ou reiniciar o dispositivo.
              </p>
              <p>
                • <strong>Privacidade de Áudio:</strong> As gravações são processadas diretamente para extração das informações e não são gravadas em logs permanentes no disco.
              </p>
              <p>
                • <strong>Lembretes com Som:</strong> As notificações utilizam a Web Notifications API com sintetizador harmônico de sino Web Audio API para total independência de arquivos externos de áudio.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Salvar Preferências
          </button>
        </div>
      </div>
    </div>
  );
};
