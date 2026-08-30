import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  Settings,
  X,
  Eye,
  EyeOff,
  Zap,
  Loader2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useChat } from "../hooks/useChat";
import { isAutomationCommand, executeAutomation, formatActionResult } from "../lib/automations";
import { showCommandFeedback } from "./CommandFeedback";
import {
  useVoice,
  getBrowserVoices,
  type VoiceSettings,
} from "../hooks/useVoice";

interface VoiceAgentProps {
  isOpen: boolean;
  onClose: () => void;
}

// ===== PARTICLE SYSTEM =====
function Particles({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    delay: i * 0.1,
    size: 2 + Math.random() * 3,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0],
            x: [0, Math.cos((p.angle * Math.PI) / 180) * (80 + Math.random() * 40)],
            y: [0, Math.sin((p.angle * Math.PI) / 180) * (80 + Math.random() * 40)],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeOut",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ width: p.size, height: p.size, backgroundColor: color }}
        />
      ))}
    </div>
  );
}

// ===== AUDIO WAVEFORM =====
function AudioWaveform({ isListening, isSpeaking }: { isListening: boolean; isSpeaking: boolean }) {
  const bars = 24;
  const active = isListening || isSpeaking;

  return (
    <div className="flex items-end justify-center gap-[2px] h-12 px-4">
      {Array.from({ length: bars }, (_, i) => (
        <motion.div
          key={i}
          animate={
            active
              ? {
                  height: [
                    4 + Math.random() * 8,
                    16 + Math.random() * 32,
                    4 + Math.random() * 8,
                  ],
                }
              : { height: 4 }
          }
          transition={
            active
              ? {
                  duration: 0.3 + Math.random() * 0.4,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.03,
                }
              : { duration: 0.5 }
          }
          className={cn(
            "w-1 rounded-full transition-colors duration-300",
            isSpeaking
              ? "bg-maya-cyan"
              : isListening
                ? "bg-maya-purple"
                : "bg-maya-border"
          )}
          style={{ minWidth: 3 }}
        />
      ))}
    </div>
  );
}

export default function VoiceAgent({ isOpen, onClose }: VoiceAgentProps) {
  const [isActive, setIsActive] = useState(false);
  const [conversation, setConversation] = useState<
    { role: "user" | "maya"; text: string; time: number }[]
  >([]);
  const [showSettings, setShowSettings] = useState(false);

  const { streamWithCallback, settings } = useChat();
  const hasApiKey = !!settings.keys[settings.provider];
  const voice = useVoice();
  const activeRef = useRef(false);
  const processingRef = useRef(false);
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

  const restartListeningAfterSpeech = useCallback(() => {
    if (!activeRef.current || processingRef.current) return;
    setTimeout(() => {
      if (activeRef.current && !processingRef.current) {
        voice.startListening(handleVoiceMessage, false);
      }
    }, 800);
  }, [voice]);

  const handleVoiceMessage = useCallback(
    async (text: string) => {
      if (processingRef.current || !text.trim()) return;
      processingRef.current = true;
      voice.stopListening();

      setConversation((prev) => [
        ...prev,
        { role: "user", text, time: Date.now() },
      ]);

      const history = conversationRef.current.map((m) => ({
        role: (m.role === "maya" ? "assistant" : "user") as "user" | "assistant" | "system",
        content: m.text,
      }));

      try {
        // Check if API key is set
        if (!hasApiKey) {
          const msg = "No API key set! Open Settings to add your free Groq, Gemini, or OpenRouter key.";
          setConversation((prev) => [
            ...prev,
            { role: "maya", text: msg, time: Date.now() },
          ]);
          await voice.speak(msg);
          restartListeningAfterSpeech();
          return;
        }

        // Check automation first (instant, no API needed)
        if (isAutomationCommand(text)) {
          const result = executeAutomation(text);
          if (result) {
            const response = formatActionResult(result);
            showCommandFeedback(result.message, result.success);
            setConversation((prev) => [
              ...prev,
              { role: "maya", text: response, time: Date.now() },
            ]);
            if (activeRef.current) {
              await voice.speak(result.message);
              restartListeningAfterSpeech();
            }
            return;
          }
        }

        // STREAMING: Show tokens as they arrive, then speak full response
        let streamingMsgIndex = -1;
        const response = await streamWithCallback(
          [...history, { role: "user", content: text }],
          (partialText: string) => {
            // Update conversation with streaming text
            setConversation((prev) => {
              const msgs = [...prev];
              // Check if we already have a streaming message
              if (streamingMsgIndex >= 0 && msgs[streamingMsgIndex]?.role === "maya") {
                msgs[streamingMsgIndex] = { role: "maya", text: partialText, time: Date.now() };
              } else {
                streamingMsgIndex = msgs.length;
                msgs.push({ role: "maya", text: partialText, time: Date.now() });
              }
              return msgs;
            });
          }
        );

        // Ensure final text is set
        if (response) {
          setConversation((prev) => {
            const msgs = [...prev];
            if (streamingMsgIndex >= 0 && msgs[streamingMsgIndex]) {
              msgs[streamingMsgIndex] = { role: "maya", text: response, time: Date.now() };
            }
            return msgs;
          });
        }

        // SPEAK the response - ALL responses, including errors (user needs to hear them)
        if (activeRef.current && response) {
          await voice.speak(response);
          restartListeningAfterSpeech();
        }
      } catch (error: any) {
        const errMsg = error?.message || "Unknown error";
        const userMsg = errMsg.includes("Invalid") || errMsg.includes("401")
          ? "Invalid API key. Open Settings and check your key."
          : errMsg.includes("429") || errMsg.includes("Rate limit")
            ? "Rate limited! Wait 30 seconds and try again."
            : errMsg.includes("Failed to fetch") || errMsg.includes("NetworkError")
              ? "No internet connection. Check your network."
              : `Error: ${errMsg}`;
        setConversation((prev) => [
          ...prev,
          { role: "maya", text: userMsg, time: Date.now() },
        ]);
        // ALWAYS speak error messages so user knows what happened
        if (activeRef.current) {
          await voice.speak(userMsg).catch(() => {});
          restartListeningAfterSpeech();
        }
      } finally {
        processingRef.current = false;
      }
    },
    [streamWithCallback, voice, restartListeningAfterSpeech, hasApiKey]
  );

  const toggleAgent = useCallback(() => {
    if (activeRef.current) {
      activeRef.current = false;
      setIsActive(false);
      voice.stopListening();
      voice.stopSpeaking();
    } else {
      activeRef.current = true;
      setIsActive(true);
      setConversation([]);

      const greetings = hasApiKey
        ? [
            "Hey! Maya here. What can I do for you?",
            "Hi there! I'm listening.",
            "Maya online! Tell me what you need.",
            "Ready! What would you like me to do?",
          ]
        : ["Hey! Please set an API key in Settings first, then I can help you!"];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      setConversation([{ role: "maya", text: greeting, time: Date.now() }]);

      voice.speak(greeting).then(() => {
        setTimeout(() => {
          if (activeRef.current) {
            voice.startListening(handleVoiceMessage, false);
          }
        }, 500);
      });
    }
  }, [voice, handleVoiceMessage]);

  useEffect(() => {
    if (!isOpen) {
      activeRef.current = false;
      setIsActive(false);
      voice.stopListening();
      voice.stopSpeaking();
    }
  }, [isOpen, voice]);

  if (!isOpen) return null;

  const orbColor = voice.isSpeaking
    ? "from-maya-cyan/40 to-maya-cyan/10"
    : voice.isListening
      ? "from-maya-purple/30 to-maya-cyan/10"
      : isActive
        ? "from-maya-card to-maya-darker"
        : "from-maya-card to-maya-darker";

  const borderColor = voice.isSpeaking
    ? "border-maya-cyan/60"
    : voice.isListening
      ? "border-maya-purple/50"
      : isActive
        ? "border-maya-border hover:border-maya-cyan/30"
        : "border-maya-border";

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-maya-dark flex flex-col"
        >
          {/* Ambient Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                opacity: voice.isSpeaking ? 0.15 : voice.isListening ? 0.08 : 0.03,
                scale: voice.isSpeaking ? 1.2 : 1,
              }}
              transition={{ duration: 1 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-3xl"
              style={{
                background: voice.isSpeaking
                  ? "radial-gradient(circle, rgba(0,212,255,0.4) 0%, transparent 70%)"
                  : voice.isListening
                    ? "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(0,212,255,0.5) 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            />
            {/* Scan line effect */}
            {isActive && (
              <motion.div
                animate={{ y: ["-100%", "100vh"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-maya-cyan/20 to-transparent"
              />
            )}
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-colors",
                    isActive ? "bg-maya-green" : "bg-maya-text-dim"
                  )}
                />
                {isActive && (
                  <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-maya-green animate-ping opacity-50" />
                )}
              </div>
              <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
                {isActive ? "Maya Active" : "Voice Agent"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Settings className="w-4 h-4 text-white/40" />
              </button>
              <button
                onClick={() => {
                  activeRef.current = false;
                  setIsActive(false);
                  voice.stopListening();
                  voice.stopSpeaking();
                  onClose();
                }}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
            {/* Orbital System */}
            <div className="relative mb-8">
              {/* Outer rings */}
              {isActive && (
                <>
                  <motion.div
                    animate={{
                      rotate: 360,
                      scale: voice.isSpeaking ? [1, 1.1, 1] : 1,
                    }}
                    transition={{
                      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                      scale: { duration: 1, repeat: Infinity },
                    }}
                    className="absolute inset-[-60px] rounded-full"
                    style={{
                      border: "1px solid rgba(0,212,255,0.1)",
                      borderStyle: "dashed",
                    }}
                  />
                  <motion.div
                    animate={{
                      rotate: -360,
                      scale: voice.isSpeaking ? [1, 1.15, 1] : 1,
                    }}
                    transition={{
                      rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                      scale: { duration: 1.5, repeat: Infinity },
                    }}
                    className="absolute inset-[-100px] rounded-full"
                    style={{
                      border: "1px solid rgba(139,92,246,0.08)",
                    }}
                  />
                  {/* Orbiting dots */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-60px]"
                  >
                    <div className="absolute top-0 left-1/2 w-1.5 h-1.5 -ml-0.75 -mt-0.75 rounded-full bg-maya-cyan/60" />
                  </motion.div>
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-100px]"
                  >
                    <div className="absolute bottom-0 right-4 w-1 h-1 rounded-full bg-maya-purple/40" />
                  </motion.div>
                </>
              )}

              {/* Particles */}
              <Particles
                active={voice.isSpeaking || voice.isListening}
                color={voice.isSpeaking ? "#00d4ff" : "#8b5cf6"}
              />

              {/* Center Orb */}
              <motion.div
                animate={{
                  scale: voice.isSpeaking
                    ? [1, 1.08, 1]
                    : voice.isListening
                      ? [1, 1.04, 1]
                      : isActive
                        ? [1, 1.02, 1]
                        : 1,
                }}
                transition={{
                  duration: voice.isSpeaking ? 0.6 : 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                onClick={isActive ? toggleAgent : undefined}
                className={cn(
                  "relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500",
                  `bg-gradient-to-br ${orbColor}`,
                  `border-2 ${borderColor}`,
                  voice.isSpeaking && "shadow-[0_0_40px_rgba(0,212,255,0.3)]",
                  voice.isListening && "shadow-[0_0_30px_rgba(139,92,246,0.2)]"
                )}
              >
                {/* Inner glow */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/[0.03] to-transparent" />

                {voice.isSpeaking ? (
                  <Volume2 className="w-10 h-10 md:w-12 md:h-12 text-maya-cyan" />
                ) : voice.isListening ? (
                  <Mic className="w-10 h-10 md:w-12 md:h-12 text-maya-purple" />
                ) : isActive ? (
                  <Zap className="w-10 h-10 md:w-12 md:h-12 text-maya-green" />
                ) : (
                  <Phone className="w-10 h-10 md:w-12 md:h-12 text-white/30" />
                )}
              </motion.div>
            </div>

            {/* Audio Waveform */}
            <div className="w-full max-w-xs mb-6">
              <AudioWaveform isListening={voice.isListening} isSpeaking={voice.isSpeaking} />
            </div>

            {/* Status */}
            <div className="text-center mb-6">
              <AnimatePresence mode="wait">
                <motion.p
                  key={
                    voice.isSpeaking
                      ? "speaking"
                      : voice.isListening
                        ? "listening"
                        : isActive
                          ? "ready"
                          : "idle"
                  }
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-lg md:text-xl font-semibold text-white mb-1"
                >
                  {voice.isSpeaking
                    ? "Speaking..."
                    : voice.isListening
                      ? "Listening..."
                      : isActive
                        ? "Ready"
                        : "Tap to Start"}
                </motion.p>
              </AnimatePresence>

              {voice.interimTranscript && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-maya-cyan/80 text-sm italic max-w-xs mx-auto"
                >
                  "{voice.interimTranscript}"
                </motion.p>
              )}

              {processingRef.current && (
                <div className="flex items-center justify-center gap-2 text-maya-cyan/70 text-sm mt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>

            {/* Conversation */}
            {conversation.length > 0 && (
              <div className="w-full max-w-md max-h-36 overflow-y-auto space-y-1.5 px-2">
                {conversation.slice(-3).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg",
                      msg.role === "user"
                        ? "bg-white/5 text-white/60 ml-8 text-right"
                        : "bg-maya-card/50 border border-maya-border/50 text-white/70 mr-8"
                    )}
                  >
                    {msg.text.slice(0, 120)}
                    {msg.text.length > 120 ? "..." : ""}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="relative z-10 flex items-center justify-center gap-4 px-6 pb-8 pt-4">
            <button
              onClick={voice.stopSpeaking}
              disabled={!voice.isSpeaking}
              className={cn(
                "p-3 rounded-full transition-all",
                voice.isSpeaking
                  ? "bg-white/10 text-white hover:bg-white/15"
                  : "text-white/20 cursor-not-allowed"
              )}
            >
              <VolumeX className="w-5 h-5" />
            </button>

            <button
              onClick={toggleAgent}
              className={cn(
                "p-5 rounded-full transition-all shadow-lg",
                isActive
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30"
                  : "bg-gradient-to-br from-maya-cyan to-maya-purple text-white shadow-maya-cyan/30 hover:scale-105"
              )}
            >
              {isActive ? <PhoneOff className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </button>

            <button
              onClick={() => {
                if (isActive && !voice.isListening && !voice.isSpeaking && !processingRef.current) {
                  voice.startListening(handleVoiceMessage, false);
                }
              }}
              disabled={!isActive || voice.isListening || voice.isSpeaking || processingRef.current}
              className={cn(
                "p-3 rounded-full transition-all",
                isActive && !voice.isListening && !voice.isSpeaking && !processingRef.current
                  ? "bg-white/10 text-white hover:bg-white/15"
                  : "text-white/20 cursor-not-allowed"
              )}
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <VoiceSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        voiceSettings={voice.settings}
        onUpdateVoiceSettings={voice.updateSettings}
      />
    </>
  );
}

// ============ VOICE SETTINGS MODAL ============
function VoiceSettingsModal({
  isOpen,
  onClose,
  voiceSettings,
  onUpdateVoiceSettings,
}: {
  isOpen: boolean;
  onClose: () => void;
  voiceSettings: VoiceSettings;
  onUpdateVoiceSettings: (s: VoiceSettings) => void;
}) {
  const [ttsProvider, setTtsProvider] = useState(voiceSettings.ttsProvider);
  const [elevenKey, setElevenKey] = useState(voiceSettings.elevenLabsApiKey);
  const [voiceId, setVoiceId] = useState(voiceSettings.elevenLabsVoiceId);
  const [rate, setRate] = useState(voiceSettings.speechRate);
  const [pitch, setPitch] = useState(voiceSettings.speechPitch);
  const [selectedBrowserVoice, setSelectedBrowserVoice] = useState(voiceSettings.selectedVoiceName);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testVoice, setTestVoice] = useState("");
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const load = () => setBrowserVoices(getBrowserVoices());
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    setTtsProvider(voiceSettings.ttsProvider);
    setElevenKey(voiceSettings.elevenLabsApiKey);
    setVoiceId(voiceSettings.elevenLabsVoiceId);
    setRate(voiceSettings.speechRate);
    setPitch(voiceSettings.speechPitch);
    setSaved(false);
  }, [voiceSettings, isOpen]);

  const handleSave = () => {
    onUpdateVoiceSettings({
      ...voiceSettings,
      ttsProvider,
      elevenLabsApiKey: elevenKey,
      elevenLabsVoiceId: voiceId,
      speechRate: rate,
      speechPitch: pitch,
      selectedVoiceName: selectedBrowserVoice,
    });
    setSaved(true);
    setTimeout(onClose, 800);
  };

  const previewVoice = () => {
    window.speechSynthesis.cancel();
    const text = "Hello! I'm Maya, your personal AI assistant. How can I help you today?";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = "en-US";
    if (selectedBrowserVoice) {
      const found = browserVoices.find((v) => v.name === selectedBrowserVoice);
      if (found) utterance.voice = found;
    }
    utterance.onstart = () => setTestVoice("speaking");
    utterance.onend = () => setTestVoice("");
    window.speechSynthesis?.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-md bg-maya-darker border border-maya-border rounded-t-2xl md:rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Voice Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-xs text-white/40 mb-1.5 block">Voice Engine</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTtsProvider("browser")}
              className={cn(
                "p-2.5 rounded-lg border text-left transition-all text-xs",
                ttsProvider === "browser"
                  ? "bg-maya-cyan/10 border-maya-cyan/40 text-white"
                  : "bg-white/3 border-white/10 text-white/60"
              )}
            >
              <p className="font-medium">Browser</p>
              <p className="text-white/30 text-[10px]">Free • Unlimited</p>
            </button>
            <button
              onClick={() => setTtsProvider("elevenlabs")}
              className={cn(
                "p-2.5 rounded-lg border text-left transition-all text-xs",
                ttsProvider === "elevenlabs"
                  ? "bg-maya-cyan/10 border-maya-cyan/40 text-white"
                  : "bg-white/3 border-white/10 text-white/60"
              )}
            >
              <p className="font-medium">ElevenLabs</p>
              <p className="text-white/30 text-[10px]">Realistic • 10K/mo</p>
            </button>
          </div>
        </div>

        {ttsProvider === "elevenlabs" && (
          <div className="mb-4 space-y-2">
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={elevenKey}
                onChange={(e) => setElevenKey(e.target.value)}
                placeholder="ElevenLabs API key"
                className="w-full px-3 py-2 pr-9 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono outline-none focus:border-maya-cyan/40"
              />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5">
                {showKey ? <EyeOff className="w-3.5 h-3.5 text-white/30" /> : <Eye className="w-3.5 h-3.5 text-white/30" />}
              </button>
            </div>
          </div>
        )}

        {ttsProvider === "browser" && (
          <div className="mb-4 space-y-3">
            <div>
              <label className="text-[11px] text-white/40 mb-1 block">
                Voice ({browserVoices.length} available)
              </label>
              <select
                value={selectedBrowserVoice}
                onChange={(e) => setSelectedBrowserVoice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs appearance-none outline-none"
              >
                <option value="">Auto (Best)</option>
                {browserVoices.map((v) => (
                  <option key={v.name} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-white/40 mb-1 block">Speed: {rate.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-maya-cyan"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/40 mb-1 block">Pitch: {pitch.toFixed(1)}</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-maya-cyan"
              />
            </div>
            <button
              onClick={previewVoice}
              disabled={testVoice === "speaking"}
              className={cn(
                "w-full py-2 rounded-lg border text-xs font-medium transition-all",
                testVoice === "speaking"
                  ? "bg-maya-cyan/10 border-maya-cyan/30 text-maya-cyan"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              )}
            >
              {testVoice === "speaking" ? "Speaking..." : "🔊 Preview Voice"}
            </button>
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-lg bg-maya-cyan text-white text-sm font-medium hover:bg-maya-cyan-dim transition-all"
        >
          {saved ? "✓ Saved!" : "Save"}
        </button>
      </motion.div>
    </motion.div>
  );
}
