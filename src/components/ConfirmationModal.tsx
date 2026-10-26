import React, { useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  User,
  Bell,
  Trash2,
  Edit2,
  AlertTriangle,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { AppointmentDraft, ReminderLeadTime, ServiceType } from '../types/index';
import { ApiClient } from '../services/api';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: AppointmentDraft[];
  onConfirmSuccess: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  drafts: initialDrafts,
  onConfirmSuccess,
}) => {
  const [drafts, setDrafts] = useState<AppointmentDraft[]>(initialDrafts);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when initialDrafts changes
  React.useEffect(() => {
    setDrafts(initialDrafts);
    setEditingIndex(null);
    setSaveSuccess(false);
    setError(null);
  }, [initialDrafts]);

  if (!isOpen || drafts.length === 0) return null;

  const handleDeleteDraft = (index: number) => {
    const updated = drafts.filter((_, i) => i !== index);
    setDrafts(updated);
    if (updated.length === 0) {
      onClose();
    }
  };

  const handleUpdateDraft = (index: number, updates: Partial<AppointmentDraft>) => {
    const updated = [...drafts];
    updated[index] = { ...updated[index], ...updates };
    setDrafts(updated);
    setEditingIndex(null);
  };

  const handleConfirmAndSaveAll = async () => {
    if (isSubmitting || drafts.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await ApiClient.batchCreateEvents(drafts);
      setSaveSuccess(true);
      setTimeout(() => {
        onConfirmSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Batch save error:', err);
      setError(err.message || 'Erro ao salvar os compromissos. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Revisão de Compromissos Identificados
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Encontrei {drafts.length} compromisso{drafts.length > 1 ? 's' : ''}. Confira antes de salvar na agenda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success toast */}
        {saveSuccess && (
          <div className="my-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 font-semibold animate-in zoom-in-95">
            <Check className="w-5 h-5" />
            Compromisso{drafts.length > 1 ? 's' : ''} salvo com sucesso!
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="my-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm text-rose-800 dark:text-rose-200">
            {error}
          </div>
        )}

        {/* Drafts List */}
        <div className="my-5 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {drafts.map((draft, idx) => {
            const isEditing = editingIndex === idx;

            return (
              <div
                key={idx}
                className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-5 transition hover:border-blue-300 dark:hover:border-blue-700"
              >
                {/* Conflict Alert Banner */}
                {draft.hasConflict && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Aviso de Conflito: {draft.conflictDetails || 'Já existe um evento neste horário!'}</span>
                  </div>
                )}

                {/* Clarification prompt if time was ambiguous */}
                {draft.needClarification && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-200 font-medium">
                    <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Dúvida interpretativa: {draft.clarificationMessage || 'Por favor, confira o horário.'}</span>
                  </div>
                )}

                {isEditing ? (
                  /* Edit Form */
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Título do compromisso
                      </label>
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(e) => handleUpdateDraft(idx, { title: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Data
                        </label>
                        <input
                          type="date"
                          value={draft.date}
                          onChange={(e) => handleUpdateDraft(idx, { date: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Início (24h)
                        </label>
                        <input
                          type="time"
                          value={draft.startTime}
                          onChange={(e) => handleUpdateDraft(idx, { startTime: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Término (24h)
                        </label>
                        <input
                          type="time"
                          value={draft.endTime}
                          onChange={(e) => handleUpdateDraft(idx, { endTime: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Cliente / Pessoa
                        </label>
                        <input
                          type="text"
                          value={draft.clientName}
                          onChange={(e) => handleUpdateDraft(idx, { clientName: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Local / Endereço
                        </label>
                        <input
                          type="text"
                          value={draft.location}
                          onChange={(e) => handleUpdateDraft(idx, { location: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white"
                      >
                        Pronto
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display View */
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {draft.title}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
                            {draft.serviceType.replace('_', ' ')}
                          </span>
                        </h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingIndex(idx)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Editar este compromisso"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDraft(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Remover este compromisso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>
                          <strong>Data:</strong> {formatDateDisplay(draft.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>
                          <strong>Horário:</strong> {draft.startTime} às {draft.endTime}
                        </span>
                      </div>
                      {draft.clientName && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>
                            <strong>Cliente:</strong> {draft.clientName}
                          </span>
                        </div>
                      )}
                      {draft.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>
                            <strong>Local:</strong> {draft.location}
                          </span>
                        </div>
                      )}
                      <div className="col-span-full flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                        <Bell className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>
                          <strong>Lembrete Sonoro:</strong> 1 dia antes às {draft.startTime} (padrão)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition"
          >
            Cancelar Tudo
          </button>

          <button
            onClick={handleConfirmAndSaveAll}
            disabled={isSubmitting || drafts.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/25 active:scale-95 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando na agenda...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirmar e Salvar Todos ({drafts.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
