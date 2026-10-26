import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bell,
  Check,
  Edit2,
  Trash2,
  List,
  Grid3X3,
  Columns,
  Square,
  Sparkles,
} from 'lucide-react';
import { Appointment, ServiceType } from '../types/index';

interface CalendarViewProps {
  events: Appointment[];
  currentDate: Date;
  onDateChange: (newDate: Date) => void;
  onSelectEvent: (event: Appointment) => void;
  onQuickToggleComplete: (event: Appointment) => void;
  onQuickCancel: (event: Appointment) => void;
  onOpenCreateModal: (defaultDate?: string) => void;
}

export type ViewMode = 'month' | 'week' | 'day' | 'list';

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  currentDate,
  onDateChange,
  onSelectEvent,
  onQuickToggleComplete,
  onQuickCancel,
  onOpenCreateModal,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'concluido' | 'cancelado'>('todos');
  const [serviceFilter, setServiceFilter] = useState<string>('todos');

  const pad = (n: number) => String(n).padStart(2, '0');
  const currentDateStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (statusFilter !== 'todos' && e.status !== statusFilter) return false;
    if (serviceFilter !== 'todos' && e.serviceType !== serviceFilter) return false;
    return true;
  });

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    onDateChange(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    onDateChange(next);
  };

  const handleGoToday = () => {
    onDateChange(new Date());
  };

  // Color styles per service type
  const getServiceBadgeStyle = (type: ServiceType) => {
    switch (type) {
      case 'visita_tecnica':
        return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800';
      case 'reuniao':
        return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800';
      case 'manutencao':
        return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800';
      case 'consulta':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800';
      case 'ligacao':
        return 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-800';
      case 'pessoal':
        return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
    }
  };

  const getServiceDotColor = (type: ServiceType) => {
    switch (type) {
      case 'visita_tecnica':
        return 'bg-amber-500';
      case 'reuniao':
        return 'bg-blue-500';
      case 'manutencao':
        return 'bg-purple-500';
      case 'consulta':
        return 'bg-emerald-500';
      case 'ligacao':
        return 'bg-cyan-500';
      case 'pessoal':
        return 'bg-rose-500';
      default:
        return 'bg-slate-500';
    }
  };

  // Check if a day has conflicts
  const hasDayConflicts = (dayEvents: Appointment[]) => {
    const active = dayEvents.filter((e) => e.status !== 'cancelado');
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        if (active[i].startTime === active[j].startTime) return true;
      }
    }
    return false;
  };

  // Month navigation labels
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate);
  const titleDisplay = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // --- MONTH VIEW CALCULATIONS ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthGridDays: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    monthGridDays.push({
      day: d,
      dateStr: `${y}-${pad(m)}-${pad(d)}`,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    monthGridDays.push({
      day: d,
      dateStr: `${year}-${pad(month + 1)}-${pad(d)}`,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete grid
  const remainingCells = 42 - monthGridDays.length;
  for (let d = 1; d <= (remainingCells <= 7 ? remainingCells : remainingCells - 7); d++) {
    const m = month === 11 ? 1 : month + 2;
    const y = month === 11 ? year + 1 : year;
    monthGridDays.push({
      day: d,
      dateStr: `${y}-${pad(m)}-${pad(d)}`,
      isCurrentMonth: false,
    });
  }

  // --- WEEK VIEW CALCULATIONS ---
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Sunday
  const weekDays: { date: Date; dateStr: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d);
    weekDays.push({ date: d, dateStr, label: weekday });
  }

  // Today reference
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return (
    <div className="space-y-4">
      {/* View Switcher & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        
        {/* Navigation & Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
              title="Período anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
              title="Próximo período"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white px-2 truncate">
            {viewMode === 'day'
              ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(currentDate)
              : titleDisplay}
          </h2>
        </div>

        {/* View Mode Tabs & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Mês</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>Dia</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendentes</option>
            <option value="concluido">Concluídos</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>
      </div>

      {/* --- 1. MONTH VIEW --- */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {monthGridDays.map((cell, idx) => {
              const dayEvents = filteredEvents.filter((e) => e.date === cell.dateStr);
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === currentDateStr;
              const hasConflict = hasDayConflicts(dayEvents);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    const [y, m, d] = cell.dateStr.split('-').map(Number);
                    onDateChange(new Date(y, m - 1, d));
                  }}
                  onDoubleClick={() => onOpenCreateModal(cell.dateStr)}
                  className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-2xl border transition flex flex-col justify-between cursor-pointer ${
                    cell.isCurrentMonth
                      ? 'bg-slate-50/50 dark:bg-slate-800/30'
                      : 'bg-slate-100/40 dark:bg-slate-900/40 opacity-40'
                  } ${
                    isSelected
                      ? 'ring-2 ring-blue-500 border-blue-400 dark:border-blue-500'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Conflict icon */}
                    {hasConflict && (
                      <span title="Conflito de horário detectado!">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      </span>
                    )}
                  </div>

                  {/* Day Events preview */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate border flex items-center gap-1 shadow-2xs hover:scale-102 transition ${getServiceBadgeStyle(
                          ev.serviceType
                        )} ${ev.status === 'concluido' ? 'line-through opacity-70' : ''}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getServiceDotColor(ev.serviceType)}`} />
                        <span className="truncate">{ev.startTime} {ev.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-slate-500 font-semibold px-1">
                        +{dayEvents.length - 2} mais
                      </div>
                    )}
                  </div>

                  {/* Bottom indicator dots if more */}
                  <div className="flex items-center gap-1 h-1.5">
                    {dayEvents.map((ev, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${getServiceDotColor(ev.serviceType)}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 2. WEEK VIEW --- */}
      {viewMode === 'week' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {weekDays.map((dayObj, idx) => {
              const dayEvents = filteredEvents.filter((e) => e.date === dayObj.dateStr);
              const isToday = dayObj.dateStr === todayStr;
              const isSelected = dayObj.dateStr === currentDateStr;

              return (
                <div
                  key={idx}
                  onClick={() => onDateChange(dayObj.date)}
                  className={`flex flex-col min-h-[350px] rounded-2xl border p-2.5 transition cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-slate-300'
                  }`}
                >
                  <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">{dayObj.label}</p>
                    <span
                      className={`inline-flex w-7 h-7 items-center justify-center text-sm font-bold rounded-full mt-1 ${
                        isToday ? 'bg-blue-600 text-white' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {dayObj.date.getDate()}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className={`p-2 rounded-xl border text-xs font-medium space-y-1 shadow-2xs hover:shadow-xs transition ${getServiceBadgeStyle(
                          ev.serviceType
                        )} ${ev.status === 'concluido' ? 'opacity-70 line-through' : ''}`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{ev.startTime}</span>
                          <span className={`w-2 h-2 rounded-full ${getServiceDotColor(ev.serviceType)}`} />
                        </div>
                        <div className="font-semibold truncate">{ev.title}</div>
                        {ev.clientName && <div className="text-[10px] truncate">👤 {ev.clientName}</div>}
                        {ev.location && <div className="text-[10px] truncate">📍 {ev.location}</div>}
                      </div>
                    ))}
                    {dayEvents.length === 0 && (
                      <div className="text-[11px] text-slate-400 text-center py-6">
                        Livre
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 3. DAY VIEW --- */}
      {viewMode === 'day' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(currentDate)}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {filteredEvents.filter((e) => e.date === currentDateStr).length} compromisso(s) para este dia
              </p>
            </div>
            <button
              onClick={() => onOpenCreateModal(currentDateStr)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition"
            >
              + Adicionar neste dia
            </button>
          </div>

          {/* Timeline of day events */}
          <div className="space-y-3">
            {filteredEvents
              .filter((e) => e.date === currentDateStr)
              .map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  className={`p-4 sm:p-5 rounded-2xl border transition hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${getServiceBadgeStyle(
                    ev.serviceType
                  )} ${ev.status === 'concluido' ? 'opacity-70' : ''}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black tracking-tight">{ev.startTime} — {ev.endTime}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/60 dark:bg-black/40">
                        {ev.serviceType.replace('_', ' ')}
                      </span>
                      {ev.status === 'concluido' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
                          Concluído
                        </span>
                      )}
                      {ev.status === 'cancelado' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold">
                          Cancelado
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {ev.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-90">
                      {ev.clientName && (
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>Cliente: {ev.clientName}</span>
                        </div>
                      )}
                      {ev.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Local: {ev.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 font-semibold text-blue-800 dark:text-blue-300">
                        <Bell className="w-3.5 h-3.5" />
                        <span>Lembrete: um dia antes, às {ev.startTime}</span>
                      </div>
                    </div>

                    {ev.notes && (
                      <p className="text-xs italic opacity-80 pt-1">
                        Obs: {ev.notes}
                      </p>
                    )}
                  </div>

                  {/* Quick action buttons */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onQuickToggleComplete(ev)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                        ev.status === 'concluido'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-white'
                      }`}
                      title={ev.status === 'concluido' ? 'Reabrir compromisso' : 'Marcar como concluído'}
                    >
                      <Check className="w-4 h-4" />
                      <span>{ev.status === 'concluido' ? 'Concluído' : 'Concluir'}</span>
                    </button>

                    <button
                      onClick={() => onSelectEvent(ev)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-white border transition"
                      title="Editar detalhes"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

            {filteredEvents.filter((e) => e.date === currentDateStr).length === 0 && (
              <div className="text-center py-12 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                <CalendarIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Nenhum compromisso para este dia
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Grave um áudio falando sobre sua rotina ou adicione manualmente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 4. LIST / AGENDA CHRONOLOGICAL VIEW --- */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Lista Cronológica de Compromissos ({filteredEvents.length})
            </h3>
            <button
              onClick={() => onOpenCreateModal()}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              + Novo Compromisso
            </button>
          </div>

          <div className="space-y-3">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                className={`p-4 rounded-2xl border transition hover:border-blue-400 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${getServiceBadgeStyle(
                  ev.serviceType
                )} ${ev.status === 'concluido' ? 'opacity-70' : ''}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-black/10 dark:bg-white/10">
                      {ev.date.split('-').reverse().join('/')}
                    </span>
                    <span className="text-xs font-bold">{ev.startTime} - {ev.endTime}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/40 font-semibold">
                      {ev.serviceType.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {ev.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs opacity-90">
                    {ev.clientName && <span>Cliente: <strong>{ev.clientName}</strong></span>}
                    {ev.location && <span>Local: <strong>{ev.location}</strong></span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onQuickToggleComplete(ev)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold border"
                    title={ev.status === 'concluido' ? 'Reabrir' : 'Concluir'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                Nenhum compromisso encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
