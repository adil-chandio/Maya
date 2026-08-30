import { useState, useCallback, useRef, useEffect } from "react";

export interface VoiceSettings {
  ttsProvider: "browser" | "elevenlabs";
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  speechRate: number;
  speechPitch: number;
  continuousMode: boolean;
  language: string;
  selectedVoiceName: string; // browser voice name
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  ttsProvider: "browser",
  elevenLabsApiKey: "",
  elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM",
  speechRate: 1.05,
  speechPitch: 1.15,
  continuousMode: true,
  language: "en-US",
  selectedVoiceName: "", // auto-detect best
};

// ElevenLabs voices - warm, cute, friendly options
export const ELEVENLABS_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "🎀 Rachel - Sweet Female", desc: "Warm & friendly" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "🌸 Bella - Soft Female", desc: "Gentle & caring" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "✨ Elli - Young Female", desc: "Youthful & cute" },
  { id: "ErXwobaYiN019PkySvjV", name: "🎩 Antoni - Warm Male", desc: "Friendly & clear" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "🎙️ Adam - Clear Male", desc: "Calm & reliable" },
  { id: "VR6AewLTigWG4xSOukaG", name: "💪 Arnold - Deep Male", desc: "Strong & confident" },
];

// Voice priority - which voices sound best (neural > standard)
const VOICE_PRIORITY = [
  "Google UK English Female",
  "Google UK English Male",
  "Google US English",
  "Google",
  "Microsoft Zira",
  "Microsoft David",
  "Microsoft Mark",
  "Samantha",
  "Daniel",
  "Alex",
  "Karen",
  "Moira",
  "Tessa",
  "Fiona",
];

export function loadVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem("maya_voice_settings");
    if (raw) return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_VOICE_SETTINGS;
}

export function saveVoiceSettings(settings: VoiceSettings) {
  try {
    localStorage.setItem("maya_voice_settings", JSON.stringify(settings));
  } catch { /* ignore */ }
}

// Get all available browser voices
export function getBrowserVoices(): SpeechSynthesisVoice[] {
  if (!window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
}

// Find the best available voice
function findBestVoice(preferredName?: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() || [];
  if (!voices.length) return null;

  // If user selected a specific voice, use it
  if (preferredName) {
    const found = voices.find((v) => v.name === preferredName);
    if (found) return found;
  }

  // Auto-detect best English voice
  for (const priority of VOICE_PRIORITY) {
    const found = voices.find((v) => v.name.includes(priority) && v.lang.startsWith("en"));
    if (found) return found;
  }

  // Fallback: any English female voice
  const femaleVoice = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.toLowerCase().includes("female") ||
        v.name.toLowerCase().includes("samantha") ||
        v.name.toLowerCase().includes("zira") ||
        v.name.toLowerCase().includes("karen"))
  );
  if (femaleVoice) return femaleVoice;

  // Last fallback: any English voice
  return voices.find((v) => v.lang.startsWith("en")) || null;
}

// ElevenLabs TTS
async function ttsElevenLabs(text: string, apiKey: string, voiceId: string): Promise<string> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.8,
        style: 0.5,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail?.message || `ElevenLabs error ${response.status}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// Clean text for natural speech - removes markdown, punctuation, lists, URLs, emoji
function cleanTextForSpeech(raw: string): string {
  let text = raw;

  // Remove code blocks entirely
  text = text.replace(/```[\s\S]*?```/g, "");

  // Remove inline code backticks
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove markdown bold/italic
  text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1");

  // Remove markdown headers
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove markdown links - keep text only
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove URLs
  text = text.replace(/https?:\/\/[^\s]+/g, "");

  // Remove emoji (they get pronounced weirdly)
  text = text.replace(/[\u{1F600}-\u{1F9FF}]/gu, "");
  text = text.replace(/[\u{2600}-\u{26FF}]/gu, "");
  text = text.replace(/[\u{2700}-\u{27BF}]/gu, "");

  // Remove bullet/list markers
  text = text.replace(/^\s*[-*+•]\s+/gm, "");
  text = text.replace(/^\s*\d+\.+\s+/gm, "");

  // Remove colons used as separators (but keep time colons)
  text = text.replace(/:\s*(?=\n|$)/g, "");
  text = text.replace(/\|/g, "");

  // Replace dashes used as separators with comma
  text = text.replace(/\s*[-—–]{2,}\s*/g, ", ");
  text = text.replace(/\s*-\s*(?=\n)/g, "");

  // Replace semicolons with commas
  text = text.replace(/;/g, ",");

  // Replace multiple dots with single period
  text = text.replace(/\.{2,}/g, ".");

  // Remove standalone periods that are just bullet separators
  text = text.replace(/^\s*\.\s*$/gm, "");

  // Remove special characters but keep essential punctuation
  text = text.replace(/[\[\]{}()]/g, "");
  text = text.replace(/[&]/g, "and");
  text = text.replace(/[>]/g, "");

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/\s{2,}/g, " ");
  text = text.trim();

  return text;
}

export function useVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [settings, setSettingsState] = useState<VoiceSettings>(loadVoiceSettings);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const continuousRef = useRef(false);

  const updateSettings = useCallback((newSettings: VoiceSettings) => {
    setSettingsState(newSettings);
    saveVoiceSettings(newSettings);
  }, []);

  // ===== TEXT-TO-SPEECH =====
  const speak = useCallback(
    async (text: string): Promise<void> => {
      window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const cleanedText = cleanTextForSpeech(text);
      if (!cleanedText.trim()) return;
      setIsSpeaking(true);

      try {
        if (settings.ttsProvider === "elevenlabs" && settings.elevenLabsApiKey) {
          const audioUrl = await ttsElevenLabs(cleanedText, settings.elevenLabsApiKey, settings.elevenLabsVoiceId);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); };
          audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); };
          await audio.play();
        } else {
          const utterance = new SpeechSynthesisUtterance(cleanedText);
          utterance.rate = settings.speechRate;
          utterance.pitch = settings.speechPitch;
          utterance.lang = settings.language;

          const voice = findBestVoice(settings.selectedVoiceName);
          if (voice) utterance.voice = voice;

          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          window.speechSynthesis?.speak(utterance);
        }
      } catch (error) {
        console.error("TTS error:", error);
        setIsSpeaking(false);
        // Fallback
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis?.speak(utterance);
      }
    },
    [settings]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(false);
  }, []);

  // Request microphone permission (cached - don't request every time)
  const micPermissionRef = useRef<boolean | null>(null);
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    // Return cached result if available
    if (micPermissionRef.current !== null) return micPermissionRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      micPermissionRef.current = true;
      return true;
    } catch {
      micPermissionRef.current = false;
      return false;
    }
  }, []);

  // ===== SPEECH-TO-TEXT =====
  const startListening = useCallback(
    async (onResult: (text: string) => void, continuous = false) => {
      if (recognitionRef.current) recognitionRef.current.abort();

      // Request mic permission first (critical for Android/Capacitor)
      const hasPermission = await requestMicPermission();
      if (!hasPermission) {
        console.warn('Microphone permission denied');
        setIsListening(false);
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('SpeechRecognition API not available');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = settings.language;
      recognition.maxAlternatives = 1;
      continuousRef.current = continuous;

      recognition.onstart = () => { setIsListening(true); setTranscript(""); setInterimTranscript(""); };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) final += result[0].transcript;
          else interim += result[0].transcript;
        }
        if (interim) setInterimTranscript(interim);
        if (final) { setTranscript(final); setInterimTranscript(""); onResult(final.trim()); }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "aborted") {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
        if (continuousRef.current && recognitionRef.current) {
          setTimeout(() => {
            if (continuousRef.current) { try { recognitionRef.current?.start(); } catch { /* ignore */ } }
          }, 100);
        }
      };

      recognitionRef.current = recognition;
      try { recognition.start(); } catch (err) { console.error('Failed to start recognition:', err); }
    },
    [settings.language, requestMicPermission]
  );

  const stopListening = useCallback(() => {
    continuousRef.current = false;
    if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const toggleListening = useCallback(
    (onResult: (text: string) => void) => {
      if (isListening) stopListening();
      else startListening(onResult, settings.continuousMode);
    },
    [isListening, startListening, stopListening, settings.continuousMode]
  );

  useEffect(() => {
    return () => { stopListening(); stopSpeaking(); };
  }, []);

  return {
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    toggleListening,
    isSpeaking,
    isListening,
    transcript,
    interimTranscript,
    settings,
    updateSettings,
  };
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
