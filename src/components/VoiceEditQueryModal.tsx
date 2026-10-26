import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  AlertCircle,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Trash2,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { Appointment, VoiceProcessResult } from '../types/index';
import { ApiClient } from '../services/api';

interface VoiceEditQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: VoiceProcessResult | null;
  onActionCompleted: () => void;
}

export const VoiceEditQueryModal: React.FC<VoiceEditQueryModalProps> = ({
  isOpen,
  onClose,
  result,
  onActionCompleted,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetEvent, setTargetEvent] = useState<Appointment | null>(null);
  const [actionDone, setActionDone] = useState(false);
  const [message, setMessage] = useState('');

  React.useEffect(() => {
    if (result?.targetEventId) {
      ApiClient.getEvents().then((events) => {
        const found = events.find((e) => e.id === result.targetEventId);
        if (found) setTargetEvent(found);
      });
    } else {
      setTargetEvent(null);
    }
    setActionDone(false);
    setMessage(result?.message || '');
  }, [result]);

  if (!isOpen || !result) return null;

  const handleExecuteVoiceAction = async () => {
    setIsSubmitting(true);
    try {
      if (result.intent === 'CANCEL_APPOINTMENT' && result.targetEventId) {
        await ApiClient.updateEvent(result.targetEventId, { status: 'cancelado' });
        setMessage('Compromisso desmarcado com sucesso.');
      } else if (result.intent === 'COMPLETE_APPOINTMENT' && result.targetEventId) {
        await ApiClient.updateEvent(result.targetEventId, { status: 'concluido' });
        setMessage('Compromisso marcado como concluído!');
      } else if (result.intent === 'UPDATE_APPOINTMENT' && result.targetEventId) {
        const updates: Partial<Appointment> = {};
        if ((result as any).newDate) updates.date = (result as any).newDate;
        if ((result as any).newTime) updates.startTime = (result as any).newTime;
        await ApiClient.updateEvent(result.targetEventId, updates);
        setMessage('Compromisso reagendado com sucesso!');
      } else if (result.intent === 'ADD_NOTE' && result.targetEventId && (result as any).noteToAdd) {
        const existingNotes = targetEvent?.notes ? `${targetEvent.notes}\n` : '';
        await ApiClient.updateEvent(result.targetEventId, {
          notes: `${existingNotes}${(result as any).noteToAdd}`,
        });
        setMessage('Observação adicionada ao compromisso.');
      }

      setActionDone(true);
      setTimeout(() => {
        onActionCompleted();
        onClose();
      }, 1200);
    } catch (err: any) {
      setMessage(`Erro ao executar alteração: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {result.intent === 'QUERY_SCHEDULE'
                  ? 'Consulta da Agenda'
                  : result.intent === 'CANCEL_APPOINTMENT'
                  ? 'Confirmar Cancelamento'
                  : result.intent === 'COMPLETE_APPOINTMENT'
                  ? 'Confirmar Conclusão'
                  : 'Atualização por Voz'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comando falado: "{result.transcription}"
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

        {/* Content */}
        <div className="my-6">
          {actionDone ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-medium">
              <Check className="w-5 h-5" />
              {message}
            </div>
          ) : result.intent === 'QUERY_SCHEDULE' ? (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-sm leading-relaxed">
              <p className="font-semibold mb-1">Resposta da Secretária:</p>
              <p>{result.queryAnswer || result.message}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {message || 'Deseja confirmar a ação identificada pela IA?'}
              </p>

              {targetEvent && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs sm:text-sm">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {targetEvent.title}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>Data: {targetEvent.date}</span>
                    <Clock className="w-4 h-4 text-indigo-500 ml-2" />
                    <span>Horário: {targetEvent.startTime}</span>
                  </div>
                  {targetEvent.location && (
                    <div className="text-slate-600 dark:text-slate-400">
                      Local: {targetEvent.location}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {result.intent === 'QUERY_SCHEDULE' || actionDone ? 'Fechar' : 'Voltar'}
          </button>

          {!actionDone && result.intent !== 'QUERY_SCHEDULE' && (
            <button
              onClick={handleExecuteVoiceAction}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 active:scale-95 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirmar Ação
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
