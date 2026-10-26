import React, { useState } from 'react';
import { Calendar, Mic, Search, Settings, Sun, Moon, WifiOff, Download, Sparkles, BellRing } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWA';

interface HeaderProps {
  currentDate: Date;
  onGoToToday: () => void;
  onOpenVoiceModal: () => void;
  onOpenManualCreate: () => void;
  onOpenSettings: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onTestReminderSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onGoToToday,
  onOpenVoiceModal,
  onOpenManualCreate,
  onOpenSettings,
  searchQuery,
  onSearchChange,
  isDarkMode,
  onToggleDarkMode,
  onTestReminderSound,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Format date in Brazilian Portuguese: "Segunda-feira, 26 de Outubro de 2026"
  const formattedToday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(currentDate);

  // Capitalize first letter
  const displayDate = formattedToday.charAt(0).toUpperCase() + formattedToday.slice(1);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
              <Calendar className="w-5 h-5" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-sky-400 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                <Mic className="w-2.5 h-2.5 text-blue-950" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  Agenda Inteligente
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  Por Voz
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {displayDate}
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-sm mx-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente, serviço, local..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Offline status indicator */}
            {!isOnline && (
              <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </span>
            )}

            {/* "Hoje" Button */}
            <button
              onClick={onGoToToday}
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition border border-slate-200 dark:border-slate-700 shadow-2xs"
              title="Voltar para a data de hoje"
            >
              Hoje
            </button>

            {/* Quick Manual Add Button */}
            <button
              onClick={onOpenManualCreate}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition shadow-2xs"
              title="Cadastrar compromisso manualmente"
            >
              <span>+ Novo</span>
            </button>

            {/* Voice Record Highlight Button */}
            <button
              onClick={onOpenVoiceModal}
              className="relative group flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-xs sm:text-sm shadow-md shadow-blue-500/25 active:scale-95 transition-all"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span className="font-semibold">Falar</span>
              <span className="hidden sm:inline">Compromisso</span>
            </button>

            {/* PWA Install Button */}
            {!isInstalled && isInstallable && (
              <button
                onClick={install}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 transition"
                title="Instalar aplicativo PWA"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar</span>
              </button>
            )}

            {!isInstalled && isIOS && (
              <button
                onClick={() => setShowIOSModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition"
                title="Instalar no iOS"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar</span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              title={isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              title="Configurações e lembretes"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Search input bar */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, serviço, data..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* iOS Safari Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Instalar no iPhone / iPad
            </h3>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              1. Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) no Safari.<br />
              2. Role a lista e selecione <strong>Adicionar à Tela de Início</strong>.<br />
              3. Toque em <strong>Adicionar</strong> no canto superior direito.
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
