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
  Key,
  Eye,
  EyeOff,
  Check,
  Zap,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useChat } from "../hooks/useChat";
import { isAutomationCommand, executeAutomation, formatActionResult } from "../lib/automations";
import { showCommandFeedback } from "./CommandFeedback";
import {
  useVoice,
  ELEVENLABS_VOICES,
  getBrowserVoices,
  type VoiceSettings,
} from "../hooks/useVoice";

interface VoiceAgentProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceAgent({ isOpen, onClose }: VoiceAgentProps) {
  const [isActive, setIsActive] = useState(false);
  const [conversation, setConversation] = useState<
    { role: "user" | "maya"; text: string; time: number }[]
  >([]);
  const [showSettings, setShowSettings] = useState(false);

  const { sendMessage } = useChat();
  const voice = useVoice();
  const activeRef = useRef(false);
  const processingRef = useRef(false);
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

  // Restart listening after Maya finishes speaking
  const restartListeningAfterSpeech = useCallback(() => {
    if (!activeRef.current || processingRef.current) return;
    // Small delay to avoid picking up TTS tail
    setTimeout(() => {
      if (activeRef.current && !processingRef.current) {
        voice.startListening(handleVoiceMessage, false);
      }
    }, 800);
  }, [voice]);

  // Handle voice input → AI response → speak
  const handleVoiceMessage = useCallback(
    async (text: string) => {
      if (processingRef.current || !text.trim()) return;
      processingRef.current = true;

      // IMMEDIATELY stop listening to avoid echo loop
      voice.stopListening();

      // Add user message
      setConversation((prev) => [
        ...prev,
        { role: "user", text, time: Date.now() },
      ]);

      // Build chat history from ref
      const history = conversationRef.current.map((m) => ({
        role: (m.role === "maya" ? "assistant" : "user") as
          | "user"
          | "assistant"
          | "system",
        content: m.text,
      }));

      try {
        // Check for automation command first
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

        const response = await sendMessage([
          ...history,
          { role: "user", content: text },
        ]);

        // Add Maya response
        setConversation((prev) => [
          ...prev,
          { role: "maya", text: response, time: Date.now() },
        ]);

        // Speak the response (mic is already stopped)
        if (activeRef.current) {
          await voice.speak(response);
          // After speaking finishes, restart listening
          restartListeningAfterSpeech();
        }
      } catch {
        setConversation((prev) => [
          ...prev,
          {
            role: "maya",
            text: "Sorry, I encountered an error. Please try again.",
            time: Date.now(),
          },
        ]);
        // Restart listening even on error
        restartListeningAfterSpeech();
      } finally {
        processingRef.current = false;
      }
    },
    [sendMessage, voice, restartListeningAfterSpeech]
  );

  // Start/stop voice agent
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

      // Voice greeting - Maya speaks first, then listens
      const greetings = [
        "Hey! Maya here. What can I do for you?",
        "Hi there! I'm listening.",
        "Maya online! Tell me what you need.",
        "Ready! What would you like me to do?",
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      setConversation([{ role: "maya", text: greeting, time: Date.now() }]);

      // Speak greeting then start listening
      voice.speak(greeting).then(() => {
        setTimeout(() => {
          if (activeRef.current) {
            voice.startListening(handleVoiceMessage, false);
          }
        }, 500);
      });
    }
  }, [voice, handleVoiceMessage]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      activeRef.current = false;
      setIsActive(false);
      voice.stopListening();
      voice.stopSpeaking();
    }
  }, [isOpen, voice]);

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-maya-dark flex flex-col"
        >
          {/* Background effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl transition-all duration-1000",
                voice.isSpeaking
                  ? "bg-maya-cyan/10"
                  : voice.isListening
                    ? "bg-maya-purple/10"
                    : "bg-maya-cyan/5"
              )}
            />
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(0,212,255,0.5) 1px, transparent 1px)`,
                backgroundSize: "30px 30px",
              }}
            />
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-3 h-3 rounded-full transition-colors",
                  isActive ? "bg-maya-green animate-pulse" : "bg-maya-text-dim"
                )}
              />
              <span className="text-sm font-medium text-white">
                {isActive ? "Maya Voice Active" : "Voice Agent"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg hover:bg-maya-card transition-colors"
              >
                <Settings className="w-5 h-5 text-maya-text-dim" />
              </button>
              <button
                onClick={() => {
                  activeRef.current = false;
                  setIsActive(false);
                  voice.stopListening();
                  voice.stopSpeaking();
                  onClose();
                }}
                className="p-2 rounded-lg hover:bg-maya-card transition-colors"
              >
                <X className="w-5 h-5 text-maya-text-dim" />
              </button>
            </div>
          </div>

          {/* Main visualizer */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
            {/* Orbital rings */}
            <div className="relative mb-12">
              {isActive && (
                <>
                  <motion.div
                    animate={{
                      scale: voice.isSpeaking
                        ? [1, 1.3, 1]
                        : voice.isListening
                          ? [1, 1.15, 1]
                          : [1, 1.02, 1],
                      opacity: voice.isSpeaking
                        ? [0.3, 0.1, 0.3]
                        : voice.isListening
                          ? [0.2, 0.05, 0.2]
                          : 0.05,
                    }}
                    transition={{
                      duration: voice.isSpeaking ? 0.8 : 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-[-40px] rounded-full border border-maya-cyan/30"
                  />
                  <motion.div
                    animate={{
                      scale: voice.isSpeaking
                        ? [1, 1.5, 1]
                        : voice.isListening
                          ? [1, 1.25, 1]
                          : 1,
                      opacity: voice.isSpeaking
                        ? [0.2, 0.05, 0.2]
                        : voice.isListening
                          ? [0.15, 0.03, 0.15]
                          : 0.03,
                    }}
                    transition={{
                      duration: voice.isSpeaking ? 1 : 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-[-80px] rounded-full border border-maya-purple/20"
                  />
                  <motion.div
                    animate={{
                      scale: voice.isSpeaking ? [1, 1.7, 1] : 1,
                      opacity: voice.isSpeaking ? [0.15, 0.02, 0.15] : 0,
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-[-120px] rounded-full border border-maya-cyan/10"
                  />
                </>
              )}

              {/* Center orb */}
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
                  "w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer",
                  voice.isSpeaking
                    ? "bg-gradient-to-br from-maya-cyan/30 to-maya-purple/30 border-2 border-maya-cyan/50 shadow-lg shadow-maya-cyan/20"
                    : voice.isListening
                      ? "bg-gradient-to-br from-maya-purple/20 to-maya-cyan/20 border-2 border-maya-purple/40"
                      : isActive
                        ? "bg-maya-card border-2 border-maya-border hover:border-maya-cyan/30"
                        : "bg-maya-card border-2 border-maya-border"
                )}
              >
                {voice.isSpeaking ? (
                  <Volume2 className="w-12 h-12 text-maya-cyan" />
                ) : voice.isListening ? (
                  <Mic className="w-12 h-12 text-maya-purple" />
                ) : isActive ? (
                  <Zap className="w-12 h-12 text-maya-green" />
                ) : (
                  <Phone className="w-12 h-12 text-maya-text-dim" />
                )}
              </motion.div>
            </div>

            {/* Status */}
            <div className="text-center mb-8">
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-semibold text-white mb-2"
              >
                {voice.isSpeaking
                  ? "🎤 Maya is speaking..."
                  : voice.isListening
                    ? "👂 Listening..."
                    : isActive
                      ? "✅ Ready to listen"
                      : "🎙️ Voice Agent"
                }
              </motion.p>

              {/* Interim transcript */}
              <AnimatePresence>
                {voice.interimTranscript && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-maya-cyan text-lg italic max-w-md mx-auto"
                  >
                    "{voice.interimTranscript}"
                  </motion.p>
                )}
              </AnimatePresence>

              {isActive && !voice.isListening && !voice.isSpeaking && !processingRef.current && (
                <p className="text-maya-text-dim text-sm mt-2">
                  Tap the orb or press mic to start talking
                </p>
              )}
              {processingRef.current && (
                <p className="text-maya-cyan text-sm mt-2 animate-pulse">
                  🧠 Thinking...
                </p>
              )}
            </div>

            {/* Transcript */}
            {conversation.length > 0 && (
              <div className="w-full max-w-lg max-h-48 overflow-y-auto space-y-2 px-4">
                {conversation.slice(-4).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "text-sm px-3 py-2 rounded-lg",
                      msg.role === "user"
                        ? "bg-maya-purple/10 text-maya-text ml-8 text-right"
                        : "bg-maya-card border border-maya-border text-maya-text mr-8"
                    )}
                  >
                    {msg.text.slice(0, 150)}
                    {msg.text.length > 150 ? "..." : ""}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="relative z-10 flex items-center justify-center gap-6 px-6 pb-8 pt-4">
            <button
              onClick={voice.stopSpeaking}
              disabled={!voice.isSpeaking}
              className={cn(
                "p-4 rounded-full transition-all",
                voice.isSpeaking
                  ? "bg-maya-card border border-maya-border text-white hover:bg-maya-border"
                  : "bg-maya-card/50 text-maya-text-dim/50 cursor-not-allowed"
              )}
            >
              <VolumeX className="w-6 h-6" />
            </button>

            <button
              onClick={toggleAgent}
              className={cn(
                "p-6 rounded-full transition-all shadow-lg",
                isActive
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/25"
                  : "bg-gradient-to-br from-maya-cyan to-maya-purple text-white shadow-maya-cyan/25 hover:scale-105"
              )}
            >
              {isActive ? (
                <PhoneOff className="w-8 h-8" />
              ) : (
                <Phone className="w-8 h-8" />
              )}
            </button>

            {/* Manual mic button - only when idle and not processing */}
            <button
              onClick={() => {
                if (
                  isActive &&
                  !voice.isListening &&
                  !voice.isSpeaking &&
                  !processingRef.current
                ) {
                  voice.startListening(handleVoiceMessage, false);
                }
              }}
              disabled={!isActive || voice.isListening || voice.isSpeaking || processingRef.current}
              className={cn(
                "p-4 rounded-full transition-all",
                isActive && !voice.isListening && !voice.isSpeaking && !processingRef.current
                  ? "bg-maya-card border border-maya-border text-white hover:bg-maya-border"
                  : "bg-maya-card/50 text-maya-text-dim/50 cursor-not-allowed"
              )}
            >
              <Mic className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Voice Settings */}
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
    const text = "Hello! I'm Maya, your personal AI assistant. I have a cute voice! How can I help you today?";
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
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-md bg-maya-darker border border-maya-border rounded-t-2xl md:rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">🎙️ Voice Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-maya-card">
            <X className="w-5 h-5 text-maya-text-dim" />
          </button>
        </div>

        {/* TTS Provider */}
        <div className="mb-5">
          <label className="text-sm font-medium text-white mb-2 block">
            Voice Engine
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTtsProvider("browser")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                ttsProvider === "browser"
                  ? "bg-maya-cyan/10 border-maya-cyan/50"
                  : "bg-maya-card border-maya-border"
              )}
            >
              <p className="text-sm font-medium text-white">🌐 Browser</p>
              <p className="text-xs text-maya-text-dim">Free • Unlimited</p>
            </button>
            <button
              onClick={() => setTtsProvider("elevenlabs")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                ttsProvider === "elevenlabs"
                  ? "bg-maya-cyan/10 border-maya-cyan/50"
                  : "bg-maya-card border-maya-border"
              )}
            >
              <p className="text-sm font-medium text-white">🎭 ElevenLabs</p>
              <p className="text-xs text-maya-text-dim">Realistic • 10K/mo</p>
            </button>
          </div>
        </div>

        {/* ElevenLabs settings */}
        {ttsProvider === "elevenlabs" && (
          <div className="mb-5 space-y-3">
            <div>
              <a
                href="https://elevenlabs.io/app/settings/api-keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 mb-2 rounded-lg bg-maya-cyan/10 border border-maya-cyan/20 text-maya-cyan text-xs font-medium hover:bg-maya-cyan/20"
              >
                <Key className="w-3 h-3" /> Get Free Key →
              </a>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={elevenKey}
                  onChange={(e) => setElevenKey(e.target.value)}
                  placeholder="ElevenLabs API key"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-maya-card border border-maya-border text-maya-text text-sm font-mono outline-none focus:border-maya-cyan/50"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4 text-maya-text-dim" />
                  ) : (
                    <Eye className="w-4 h-4 text-maya-text-dim" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-maya-text-dim mb-1 block">Voice</label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-maya-card border border-maya-border text-maya-text text-sm appearance-none outline-none"
              >
                {ELEVENLABS_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Browser voice settings */}
        {ttsProvider === "browser" && (
          <div className="mb-5 space-y-3">
            <div>
              <label className="text-xs text-maya-text-dim mb-1 block">
                Voice ({browserVoices.length} available)
              </label>
              <select
                value={selectedBrowserVoice}
                onChange={(e) => setSelectedBrowserVoice(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-maya-card border border-maya-border text-maya-text text-sm appearance-none outline-none focus:border-maya-cyan/50"
              >
                <option value="">🤖 Auto (Best Available)</option>
                {browserVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} {v.localService ? "(Local)" : "(Network)"}
                  </option>
                ))}
              </select>
              {browserVoices.length === 0 && (
                <p className="text-[11px] text-maya-amber mt-1">
                  Voices load ho rahe hain... Try again in a moment
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-maya-text-dim mb-1 block">
                Speed: {rate.toFixed(1)}x
              </label>
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
              <label className="text-xs text-maya-text-dim mb-1 block">
                Pitch: {pitch.toFixed(1)} (higher = cuter 🎀)
              </label>
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
                "w-full py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                testVoice === "speaking"
                  ? "bg-maya-cyan/20 border-maya-cyan/40 text-maya-cyan"
                  : "bg-maya-card border-maya-border text-maya-text hover:bg-maya-border"
              )}
            >
              {testVoice === "speaking" ? (
                <>
                  <Volume2 className="w-4 h-4 animate-pulse" /> Speaking...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" /> 🔊 Preview Voice
                </>
              )}
            </button>
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-maya-cyan text-white font-medium hover:bg-maya-cyan-dim transition-all flex items-center justify-center gap-2"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" /> Saved!
            </>
          ) : (
            "Save Settings"
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
