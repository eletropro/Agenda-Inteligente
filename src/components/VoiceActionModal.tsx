import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Upload,
  X,
  Sparkles,
  Loader2,
  FileAudio,
  AlertCircle,
  HelpCircle,
  Send,
  Check,
} from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { ApiClient } from '../services/api';
import { VoiceProcessResult } from '../types/index';

interface VoiceActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  timezone: string;
  onProcessSuccess: (result: VoiceProcessResult) => void;
}

export const VoiceActionModal: React.FC<VoiceActionModalProps> = ({
  isOpen,
  onClose,
  timezone,
  onProcessSuccess,
}) => {
  const {
    isRecording,
    isPaused,
    recordingDuration,
    audioBlob,
    audioBase64,
    audioUrl,
    audioMimeType,
    audioLevels,
    error: recorderError,
    liveTranscript,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    handleFileUpload,
    resetAudio,
  } = useVoiceRecorder();

  const [activeTab, setActiveTab] = useState<'voice' | 'file' | 'text'>('voice');
  const [manualText, setManualText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [pendingAutoSend, setPendingAutoSend] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // If user requested "Parar e Enviar", trigger sending as soon as base64 is ready
  useEffect(() => {
    if (pendingAutoSend && audioBase64 && !isRecording && !isProcessing) {
      setPendingAutoSend(false);
      handleProcessAudio();
    }
  }, [pendingAutoSend, audioBase64, isRecording, isProcessing]);

  if (!isOpen) return null;

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    setApiError(null);
    setPendingAutoSend(false);
    await startRecording();
  };

  const handleStopAndSend = () => {
    setPendingAutoSend(true);
    setProcessingStatus('Preparando e enviando áudio...');
    stopRecording();
  };

  const handleProcessAudio = async () => {
    let base64 = audioBase64;
    if (!base64 && audioBlob) {
      base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1] || '');
        };
        reader.readAsDataURL(audioBlob);
      });
    }

    if (!base64) {
      setApiError('Aguarde o áudio ser processado ou grave novamente.');
      return;
    }

    setIsProcessing(true);
    setApiError(null);
    setProcessingStatus('Transcrevendo áudio com IA...');

    try {
      const result = await ApiClient.processVoice(base64, audioMimeType, timezone, liveTranscript);
      setProcessingStatus('Processando compromissos...');
      onProcessSuccess(result);
      handleClose();
    } catch (err: any) {
      console.error('Processing error:', err);
      setApiError(err.message || 'Falha ao processar o áudio. Tente novamente.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleProcessManualText = async () => {
    const textToProcess = manualText.trim() || liveTranscript.trim();
    if (!textToProcess) {
      setApiError('Por favor, digite ou fale os compromissos antes de prosseguir.');
      return;
    }

    setIsProcessing(true);
    setApiError(null);
    setProcessingStatus('Interpretando comando com IA...');

    try {
      const result = await ApiClient.processText(textToProcess, timezone);
      onProcessSuccess(result);
      handleClose();
    } catch (err: any) {
      console.error('Manual processing error:', err);
      setApiError(err.message || 'Falha ao interpretar o texto. Verifique os dados e tente novamente.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleClose = () => {
    cancelRecording();
    resetAudio();
    setManualText('');
    setApiError(null);
    setIsProcessing(false);
    onClose();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const fillExample = (exampleText: string) => {
    setManualText(exampleText);
    setActiveTab('text');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Falar com a Secretária Inteligente
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grave um áudio ou digite comandos em linguagem natural
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 my-5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'voice'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Mic className="w-4 h-4" />
            Gravar Áudio
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'file'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            Enviar Arquivo
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'text'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Digitar Texto
          </button>
        </div>

        {/* Errors */}
        {(recorderError || apiError) && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-rose-800 dark:text-rose-200">
              {recorderError || apiError}
            </div>
          </div>
        )}

        {/* TAB 1: Voice Recording */}
        {activeTab === 'voice' && (
          <div className="flex flex-col items-center py-4">
            {/* Visualizer & Recording Status */}
            <div className="relative flex flex-col items-center justify-center w-full min-h-[170px] rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 p-6 text-center">
              {isRecording ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      {isPaused ? 'Gravação Pausada' : 'Gravando sua voz...'}
                    </span>
                  </div>

                  {/* Waveform Frequency Bars */}
                  <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs my-2">
                    {audioLevels.map((lvl, idx) => (
                      <div
                        key={idx}
                        className="w-2 rounded-full bg-gradient-to-t from-blue-600 to-sky-400 transition-all duration-75"
                        style={{ height: `${Math.max(10, lvl)}%` }}
                      />
                    ))}
                  </div>

                  <div className="text-2xl font-mono font-bold text-slate-800 dark:text-white mt-1">
                    {formatTime(recordingDuration)}
                  </div>
                </>
              ) : audioUrl ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-4 h-4" />
                    Áudio gravado com sucesso ({formatTime(recordingDuration)})!
                  </div>
                  <audio controls src={audioUrl} className="w-full max-w-sm h-10 mt-1" />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Toque em <strong>"Enviar Áudio para Agendar"</strong> abaixo para processar.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                    <Mic className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Clique no botão abaixo para começar a falar
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                    Exemplo: "Na terça-feira às 8h visita para Fulano em Águas Claras"
                  </p>
                </div>
              )}
            </div>

            {/* Live speech recognition preview if available */}
            {liveTranscript && isRecording && (
              <div className="w-full mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-200 italic">
                "{liveTranscript}"
              </div>
            )}

            {/* Recording Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6 w-full">
              {!isRecording && !audioUrl && (
                <button
                  onClick={handleStartRecording}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/30 active:scale-95 transition"
                >
                  <Mic className="w-5 h-5" />
                  Iniciar Gravação
                </button>
              )}

              {isRecording && (
                <>
                  {isPaused ? (
                    <button
                      onClick={resumeRecording}
                      className="p-3.5 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-300 transition"
                      title="Retomar gravação"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={pauseRecording}
                      className="p-3.5 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-300 transition"
                      title="Pausar gravação"
                    >
                      <Pause className="w-5 h-5" />
                    </button>
                  )}

                  {/* Primary Action while recording: Stop and Send directly */}
                  <button
                    onClick={handleStopAndSend}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-500/30 active:scale-95 transition"
                  >
                    <Send className="w-5 h-5" />
                    <span>Parar e Enviar Áudio</span>
                  </button>

                  {/* Secondary: Stop recording to preview audio first */}
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white font-semibold text-xs sm:text-sm transition"
                    title="Parar e ouvir antes de enviar"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Parar</span>
                  </button>

                  <button
                    onClick={cancelRecording}
                    className="p-3.5 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition"
                    title="Cancelar gravação"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}

              {audioUrl && !isRecording && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                  <button
                    onClick={resetAudio}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Descartar e Regravar</span>
                  </button>

                  {/* PROMINENT ENVIAR AUDIO BUTTON */}
                  <button
                    onClick={handleProcessAudio}
                    disabled={isProcessing}
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black shadow-xl shadow-blue-500/30 active:scale-95 transition"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{processingStatus || 'Enviando áudio...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Enviar Áudio para Agendar</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Upload Audio File */}
        {activeTab === 'file' && (
          <div className="flex flex-col items-center py-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center min-h-[170px] rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-slate-800/40 p-6 text-center cursor-pointer transition"
            >
              <Upload className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Arraste um arquivo de áudio aqui ou clique para selecionar
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Formatos suportados: MP3, WAV, M4A, WEBM, OGG (até 25MB)
              </p>
            </div>

            {audioUrl && (
              <div className="w-full mt-4 flex flex-col items-center gap-3">
                <audio controls src={audioUrl} className="w-full max-w-sm h-10" />
                <button
                  onClick={handleProcessAudio}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{processingStatus || 'Enviando...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Arquivo de Áudio</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Text Input */}
        {activeTab === 'text' && (
          <div className="flex flex-col py-4">
            <textarea
              rows={4}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Exemplo: Na próxima terça-feira tenho uma visita técnica para o Fulano, em Águas Claras, às oito da manhã. Na quarta, reunião com o cliente João às duas da tarde, no escritório."
              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={handleProcessManualText}
                disabled={isProcessing || !manualText.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 active:scale-95 transition"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{processingStatus || 'Enviando...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Comando de Texto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Quick Test Prompt Examples */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            Exemplos rápidos de teste:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                fillExample(
                  'Na próxima terça-feira tenho uma visita técnica para o Fulano, em Águas Claras, às oito da manhã. Na quarta, reunião com o cliente João às duas da tarde, no escritório.'
                )
              }
              className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              🎯 2 Compromissos do briefing (Fulano + João)
            </button>
            <button
              onClick={() =>
                fillExample('Mude a visita técnica do Fulano para quarta-feira às nove.')
              }
              className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              ✏️ Comando: Mudar visita técnica
            </button>
            <button
              onClick={() => fillExample('Quais são meus compromissos de amanhã?')}
              className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              📅 Consulta: Compromissos de amanhã
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
