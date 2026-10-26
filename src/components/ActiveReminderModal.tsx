import React from 'react';
import { BellRing, Calendar, Clock, MapPin, X, Check, ArrowRight } from 'lucide-react';
import { Appointment } from '../types/index';

interface ActiveReminderModalProps {
  event: Appointment | null;
  isOpen: boolean;
  onDismiss: () => void;
  onOpenDetails: (event: Appointment) => void;
}

export const ActiveReminderModal: React.FC<ActiveReminderModalProps> = ({
  event,
  isOpen,
  onDismiss,
  onOpenDetails,
}) => {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500 shadow-2xl p-6 sm:p-7 animate-in zoom-in-95">
        
        {/* Animated Bell Badge */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 animate-bounce">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Alerta de Compromisso
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              LEMBRETE DE COMPROMISSO
            </h3>
          </div>
          <button
            onClick={onDismiss}
            className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reminder Content */}
        <div className="my-5 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Você tem um compromisso agendado:
          </p>
          <div className="text-base font-bold text-blue-900 dark:text-blue-100">
            {event.title}
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
              <span><strong>Data:</strong> {event.date.split('-').reverse().join('/')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
              <span><strong>Horário:</strong> {event.startTime} às {event.endTime}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span><strong>Local:</strong> {event.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Dispensar
          </button>
          <button
            onClick={() => {
              onOpenDetails(event);
              onDismiss();
            }}
            className="flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 active:scale-95 transition"
          >
            <span>Ver Detalhes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
