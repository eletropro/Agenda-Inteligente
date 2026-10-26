import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  FileText,
  Bell,
  Trash2,
  CheckCircle2,
  XCircle,
  Save,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Appointment, Priority, ReminderLeadTime, ServiceType } from '../types/index';
import { ApiClient } from '../services/api';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Appointment | null;
  onEventUpdated: () => void;
  onEventDeleted: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
  onEventUpdated,
  onEventDeleted,
}) => {
  if (!isOpen || !event) return null;

  const [formData, setFormData] = useState<Appointment>({ ...event });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setFormData({ ...event });
    setError(null);
  }, [event]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await ApiClient.updateEvent(event.id, formData);
      onEventUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleComplete = async () => {
    setIsSaving(true);
    const newStatus = formData.status === 'concluido' ? 'pendente' : 'concluido';
    try {
      await ApiClient.updateEvent(event.id, { status: newStatus });
      onEventUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar situação.');
    } finally {
      setIsSaving(false);
    }
  };

  const [confirmAction, setConfirmAction] = useState<'delete' | 'cancel' | null>(null);

  const handleCancelAppointment = async () => {
    setIsSaving(true);
    try {
      await ApiClient.updateEvent(event.id, { status: 'cancelado' });
      onEventUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar.');
    } finally {
      setIsSaving(false);
      setConfirmAction(null);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await ApiClient.deleteEvent(event.id);
      onEventDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir.');
    } finally {
      setIsSaving(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Detalhes do Compromisso
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {formData.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
            {error}
          </div>
        )}

        {/* Form Body */}
        <div className="my-5 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Título
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Serviço
              </label>
              <select
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as ServiceType })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="visita_tecnica">Visita Técnica</option>
                <option value="reuniao">Reunião</option>
                <option value="manutencao">Manutenção Preventiva</option>
                <option value="consulta">Consulta</option>
                <option value="ligacao">Ligação Telefônica</option>
                <option value="pessoal">Compromisso Pessoal</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Prioridade
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          {/* Date & Time (24h) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data (DD/MM/AAAA)
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Horário de Início (24h)
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Horário de Término
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Client & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Cliente / Contato
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                placeholder="(61) 99999-9999"
                value={formData.clientPhone || ''}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Localização / Endereço
            </label>
            <input
              type="text"
              placeholder="Ex: Águas Claras, Sala 402"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Reminder Lead Time */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
              <Bell className="w-4 h-4 text-blue-600" />
              Lembrete Sonoro Automático
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Antecedência:</label>
                <select
                  value={formData.reminderLeadTime}
                  onChange={(e) => setFormData({ ...formData, reminderLeadTime: e.target.value as ReminderLeadTime })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value="24h">1 dia antes (no mesmo horário - padrão)</option>
                  <option value="48h">2 dias antes</option>
                  <option value="72h">3 dias antes</option>
                  <option value="1h">1 hora antes</option>
                  <option value="30m">30 minutos antes</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Status do Lembrete:</label>
                <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                  {formData.reminderStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observações
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Levar ferramentas e contrato impresso..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* In-place action confirmation banner */}
        {confirmAction && (
          <div className="my-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-rose-800 dark:text-rose-200">
              {confirmAction === 'delete'
                ? 'Deseja realmente excluir este compromisso?'
                : 'Deseja desmarcar este compromisso?'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmAction === 'delete' ? handleDelete : handleCancelAppointment}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {confirmAction === 'delete' ? 'Excluir' : 'Desmarcar'}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmAction('delete')}
              disabled={isSaving}
              className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
              title="Excluir este compromisso"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setConfirmAction('cancel')}
              disabled={isSaving || formData.status === 'cancelado'}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Desmarcar
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleComplete}
              disabled={isSaving}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                formData.status === 'concluido'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {formData.status === 'concluido' ? 'Reabrir' : 'Concluir'}
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 active:scale-95 transition"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
