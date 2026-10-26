import { useState, useRef, useEffect, useCallback } from 'react';
import { soundService } from '../services/sound';

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  audioBase64: string | null;
  audioUrl: string | null;
  audioMimeType: string;
  audioLevels: number[];
  error: string | null;
  liveTranscript: string;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  handleFileUpload: (file: File) => Promise<void>;
  resetAudio: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const [audioLevels, setAudioLevels] = useState<number[]>([10, 20, 15, 30, 25, 40, 20, 10]);
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  const clearTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const stopWaveform = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  };

  const stopTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
  };

  const resetAudio = useCallback(() => {
    clearTimer();
    stopWaveform();
    stopTracks();
    stopSpeechRecognition();
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
    setAudioBlob(null);
    setAudioBase64(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setError(null);
    setLiveTranscript('');
  }, [audioUrl]);

  const startRecording = async () => {
    resetAudio();
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta captura de microfone.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Select best supported MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setAudioMimeType(mediaRecorder.mimeType || 'audio/webm');

      // AudioContext for visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevels = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        // sample 12 frequency bars
        const samples: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / 12));
        for (let i = 0; i < 12; i++) {
          const val = dataArray[i * step] || 0;
          samples.push(Math.max(12, Math.round((val / 255) * 100)));
        }
        setAudioLevels(samples);
        animFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();

      // Setup optional Web Speech API for instant live preview
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'pt-BR';

          recognition.onresult = (event: any) => {
            let currentText = '';
            for (let i = 0; i < event.results.length; i++) {
              currentText += event.results[i][0].transcript;
            }
            if (currentText) {
              setLiveTranscript(currentText);
            }
          };

          recognition.onerror = () => {
            // Non-fatal, Gemini backend will transcribe anyway
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (e) {
          // Non-fatal
        }
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        clearTimer();
        stopWaveform();
        stopTracks();
        stopSpeechRecognition();

        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64Data = res.split(',')[1] || '';
          setAudioBase64(base64Data);
        };
        reader.readAsDataURL(blob);
        setIsRecording(false);
        setIsPaused(false);
      };

      soundService.playRecordingBeep();
      mediaRecorder.start(250); // Emit chunks every 250ms
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permissão de microfone negada. Autorize o microfone nas configurações do seu navegador.');
      } else {
        setError(`Erro ao iniciar microfone: ${err.message || 'Dispositivo inacessível'}`);
      }
      resetAudio();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      try {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        clearTimer();
      } catch (e) {}
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      try {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        timerIntervalRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } catch (e) {}
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    resetAudio();
  };

  const handleFileUpload = async (file: File) => {
    resetAudio();
    setError(null);

    if (!file.type.startsWith('audio/')) {
      setError('Por favor, selecione um arquivo de áudio válido (MP3, WAV, M4A, WEBM, OGG).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('O arquivo excede o limite máximo recomendado de 25MB.');
      return;
    }

    try {
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      setAudioMimeType(file.type || 'audio/mp3');

      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64Data = res.split(',')[1] || '';
        setAudioBase64(base64Data);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(`Falha ao ler arquivo de áudio: ${err.message}`);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      stopWaveform();
      stopTracks();
      stopSpeechRecognition();
    };
  }, []);

  return {
    isRecording,
    isPaused,
    recordingDuration,
    audioBlob,
    audioBase64,
    audioUrl,
    audioMimeType,
    audioLevels,
    error,
    liveTranscript,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    handleFileUpload,
    resetAudio,
  };
}
