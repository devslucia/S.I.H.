"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2, CheckCircle } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
  continuous?: boolean;
  status?: "idle" | "listening" | "processing" | "ready";
}

export function VoiceInput({
  onTranscript,
  language = "es-AR",
  continuous = false,
  status: externalStatus,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript;
      onTranscript(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  if (!isSupported) return null;

  const effectiveStatus = externalStatus || (isListening ? "listening" : "idle");

  const statusStyles: Record<string, string> = {
    idle: "bg-border text-muted hover:text-accent hover:bg-accent/10 border border-border",
    listening: "bg-error/20 text-error animate-pulse border border-error/50",
    processing: "bg-warning/20 text-warning animate-spin border border-warning/50",
    ready: "bg-success/20 text-success border border-success/50",
  };

  const titles: Record<string, string> = {
    idle: "Dictar por voz",
    listening: "Detener dictado",
    processing: "Procesando con IA...",
    ready: "Resultado listo",
  };

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      disabled={effectiveStatus === "processing"}
      className={`p-2 rounded-lg transition-all ${statusStyles[effectiveStatus]}`}
      title={titles[effectiveStatus]}
    >
      {effectiveStatus === "processing" ? (
        <Loader2 size={16} />
      ) : effectiveStatus === "ready" ? (
        <CheckCircle size={16} />
      ) : isListening ? (
        <MicOff size={16} />
      ) : (
        <Mic size={16} />
      )}
    </button>
  );
}
