import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Plus,
  MessageSquare,
  Bot,
  User,
  Brain,
  Loader2,
  Settings,
  X,
  Key,
  Eye,
  EyeOff,
  Check,
  ChevronDown,
  Zap,
  Phone,
  Sparkles,
} from "lucide-react";
import VoiceAgent from "../components/VoiceAgent";
import AutomationPanel from "../components/AutomationPanel";
import CommandFeedback from "../components/CommandFeedback";
import { cn } from "../lib/utils";
import { useChat, PROVIDERS, type Provider } from "../hooks/useChat";
import { useVoice } from "../hooks/useVoice";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isVoice?: boolean;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: `Hello! I'm **Maya**, your personal AI assistant. 🧠

I can help you with:
• Answering questions on any topic
• Writing and debugging code
• Creative writing and brainstorming
• Analysis and problem-solving
• General conversation

How can I assist you today?`,
  timestamp: Date.now(),
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, isLoading: isTyping, settings, updateSettings } = useChat();
  const hasApiKey = !!settings.keys[settings.provider];
  const { speak } = useVoice();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (window.innerWidth >= 768) inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const chatHistory = [
      ...messages,
      userMessage,
    ].map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    try {
      const response = await sendMessage(chatHistory);

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (voiceEnabled && response && !response.startsWith("❌") && !response.startsWith("⚙️")) {
        speak(response);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        role: "assistant",
        content: `❌ Error: ${error?.message || "Unknown error"}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleVoiceInput = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      role: "user",
      content: text,
      timestamp: Date.now(),
      isVoice: true,
    };

    setMessages((prev) => [...prev, userMessage]);

    const chatHistory = [
      ...messages,
      userMessage,
    ].map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    sendMessage(chatHistory).then((response) => {
      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (voiceEnabled && response && !response.startsWith("❌")) speak(response);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-maya-dark overflow-hidden">
      <CommandFeedback />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed md:relative z-40 h-full w-[280px] bg-maya-darker border-r border-maya-border flex flex-col shrink-0"
          >
            <div className="p-4 border-b border-maya-border">
              <button
                onClick={() => {
                  setMessages([WELCOME_MESSAGE]);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-maya-cyan/10 border border-maya-cyan/30 text-maya-cyan font-medium hover:bg-maya-cyan/20 transition-all"
              >
                <Plus className="w-5 h-5" />
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-xs text-maya-text-dim mb-2 px-1">Recent</p>
              {messages.length > 1 && (
                <div className="p-2.5 rounded-lg bg-maya-card border border-maya-border text-sm text-maya-text truncate">
                  <MessageSquare className="w-3 h-3 inline mr-2 text-maya-text-dim" />
                  {messages[1]?.content.slice(0, 40) || "Chat"}...
                </div>
              )}
            </div>

            <div className="p-4 border-t border-maya-border space-y-2">
              {/* Provider badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-maya-card/50 text-xs">
                <Zap className="w-3 h-3 text-maya-green" />
                <span className="text-maya-text-dim">{PROVIDERS[settings.provider].name}</span>
                {settings.keys[settings.provider] ? (
                  <span className="ml-auto w-2 h-2 rounded-full bg-maya-green" />
                ) : (
                  <span className="ml-auto w-2 h-2 rounded-full bg-maya-amber" />
                )}
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-maya-card transition-colors"
              >
                <Settings className="w-4 h-4 text-maya-text-dim" />
                <span className="text-sm text-maya-text">Settings</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="flex items-center gap-1 px-2 md:px-4 py-2 md:py-3 border-b border-maya-border bg-maya-dark/80 backdrop-blur-xl shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 md:p-2 rounded-lg hover:bg-maya-card transition-colors"
          >
            <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-maya-text-dim" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-maya-cyan/20 to-maya-purple/20 flex items-center justify-center border border-maya-cyan/30 shrink-0">
              <Brain className="w-3.5 h-3.5 md:w-4 md:h-4 text-maya-cyan" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs md:text-sm font-semibold text-white truncate">Maya AI</h1>
              <p className="text-[10px] md:text-xs text-maya-text-dim truncate">
                {isTyping ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                  </span>
                ) : hasApiKey ? (
                  `Online • ${PROVIDERS[settings.provider].name}`
                ) : (
                  <span className="text-maya-amber">No key • ⚙️</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 md:gap-1">
            <button
              onClick={() => setShowAutomation(true)}
              className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-maya-green/20 to-maya-cyan/20 border border-maya-green/30 text-maya-green transition-all"
              title="Automations"
            >
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => setShowVoiceAgent(true)}
              className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-maya-cyan/20 to-maya-purple/20 border border-maya-cyan/30 text-maya-cyan transition-all"
              title="Voice Agent"
            >
              <Phone className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={cn(
                "p-1.5 md:p-2 rounded-lg transition-colors",
                voiceEnabled ? "bg-maya-cyan/20 text-maya-cyan" : "hover:bg-maya-card text-maya-text-dim"
              )}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 md:p-2 rounded-lg hover:bg-maya-card transition-colors"
            >
              <Settings className="w-4 h-4 md:w-5 md:h-5 text-maya-text-dim" />
            </button>
          </div>

        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6">              {!hasApiKey && messages.length <= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-md p-6 rounded-2xl bg-maya-card border border-maya-amber/30"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-maya-amber/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-maya-amber" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Setup Required</h3>
                  <p className="text-xs text-maya-text-dim">Free, takes 30 seconds</p>
                </div>
              </div>
              <p className="text-sm text-maya-text-dim mb-4">
                Choose a free AI provider and add your API key to start chatting.
              </p>
              <div className="space-y-2 mb-4">
                {Object.entries(PROVIDERS).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-2 text-xs text-maya-text-dim">
                    <Zap className="w-3 h-3 text-maya-green shrink-0" />
                    <span className="text-maya-text">{config.name}</span>
                    <span className="text-maya-green ml-auto">FREE</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="w-full py-2.5 rounded-xl bg-maya-cyan/10 border border-maya-cyan/30 text-maya-cyan font-medium hover:bg-maya-cyan/20 transition-all flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Open Settings
              </button>
            </motion.div>
          )}

          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex gap-2 md:gap-3 max-w-full md:max-w-3xl",
                message.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0",
                  message.role === "user" ? "bg-maya-purple/20" : "bg-maya-cyan/20"
                )}
              >
                {message.role === "user" ? (
                  <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-maya-purple" />
                ) : (
                  <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-maya-cyan" />
                )}
              </div>

              <div
                className={cn(
                  "rounded-2xl px-3 py-2.5 md:px-4 md:py-3 max-w-[85%] md:max-w-[80%] min-w-0 overflow-hidden",
                  message.role === "user"
                    ? "bg-maya-purple/10 border border-maya-purple/20"
                    : "bg-maya-card border border-maya-border"
                )}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {renderMarkdown(message.content)}
                </div>
                {message.isVoice && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-maya-text-dim">
                    <Mic className="w-3 h-3" /> Voice input
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 md:gap-3"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-maya-cyan/20 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-maya-cyan" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-maya-card border border-maya-border">
                <div className="flex items-center gap-2 text-maya-text-dim">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Maya is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-3 md:px-6 lg:px-8 pb-4 md:pb-6 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 md:gap-3 p-2.5 md:p-3 rounded-2xl bg-maya-card border border-maya-border focus-within:border-maya-cyan/50 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasApiKey ? "Ask Maya anything..." : "Set API key first ⚙️"}
                rows={1}
                disabled={!hasApiKey}
                className="flex-1 bg-transparent text-maya-text placeholder-maya-text-dim text-sm resize-none outline-none max-h-32 disabled:opacity-50"
                style={{ minHeight: "24px" }}
              />
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <VoiceButton onResult={handleVoiceInput} />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping || !hasApiKey}
                  className={cn(
                    "p-2 md:p-2.5 rounded-xl transition-all",
                    input.trim() && !isTyping && hasApiKey
                      ? "bg-maya-cyan text-white hover:bg-maya-cyan-dim"
                      : "bg-maya-border text-maya-text-dim cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] md:text-xs text-maya-text-dim mt-2 md:mt-3">
              Maya uses AI and may make mistakes. {hasApiKey && `Powered by ${PROVIDERS[settings.provider].name}`}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={updateSettings}
      />

      {/* Voice Agent */}
      <VoiceAgent
        isOpen={showVoiceAgent}
        onClose={() => setShowVoiceAgent(false)}
      />

      {/* Automation Panel */}
      <AutomationPanel
        isOpen={showAutomation}
        onClose={() => setShowAutomation(false)}
      />
    </div>
  );
}

// ============ SETTINGS MODAL ============
function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: { provider: Provider; keys: Record<Provider, string>; model: string };
  onSave: (s: { provider: Provider; keys: Record<Provider, string>; model: string }) => void;
}) {
  const [provider, setProvider] = useState<Provider>(settings.provider);
  const [keys, setKeys] = useState<Record<Provider, string>>({ ...settings.keys });
  const [model, setModel] = useState(settings.model);
  const [showKey, setShowKey] = useState<Provider | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProvider(settings.provider);
    setKeys({ ...settings.keys });
    setModel(settings.model);
    setSaved(false);
  }, [settings, isOpen]);

  useEffect(() => {
    setModel(PROVIDERS[provider].defaultModel);
  }, [provider]);

  const currentProvider = PROVIDERS[provider];

  const handleSave = () => {
    onSave({ provider, keys, model });
    setSaved(true);
    setTimeout(onClose, 800);
  };

  const handleClearKey = (p: Provider) => {
    setKeys((prev) => ({ ...prev, [p]: "" }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full md:max-w-lg bg-maya-darker border border-maya-border rounded-t-2xl md:rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-maya-cyan/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-maya-cyan" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Settings</h2>
                <p className="text-xs text-maya-text-dim">Each provider needs its OWN key</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-maya-card transition-colors">
              <X className="w-5 h-5 text-maya-text-dim" />
            </button>
          </div>

          {/* Provider + Key for EACH provider */}
          {(Object.entries(PROVIDERS) as [Provider, typeof currentProvider][]).map(([key, config]) => {
            const isActive = provider === key;
            const hasKey = !!keys[key];
            return (
              <div
                key={key}
                className={cn(
                  "mb-4 p-4 rounded-xl border transition-all",
                  isActive ? "bg-maya-card border-maya-cyan/40" : "bg-maya-card/30 border-maya-border"
                )}
              >
                {/* Provider header */}
                <button
                  onClick={() => setProvider(key)}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    isActive ? "bg-maya-cyan/20" : "bg-maya-border/50"
                  )}>
                    <Zap className={cn("w-5 h-5", isActive ? "text-maya-cyan" : "text-maya-text-dim")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{config.name}</p>
                    <p className="text-xs text-maya-text-dim">{config.models.length} models • Free</p>
                  </div>
                  {hasKey && <span className="w-2 h-2 rounded-full bg-maya-green shrink-0" />}
                  {isActive ? (
                    <Check className="w-5 h-5 text-maya-cyan shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-maya-text-dim shrink-0" />
                  )}
                </button>

                {/* Expanded section for active provider */}
                {isActive && (
                  <div className="mt-4 space-y-3">
                    {/* Model selector */}
                    <div>
                      <label className="text-xs text-maya-text-dim mb-1 block">Model</label>
                      <div className="relative">
                        <select
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg bg-maya-dark border border-maya-border text-maya-text text-sm appearance-none outline-none focus:border-maya-cyan/50"
                        >
                          {config.models.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-maya-text-dim pointer-events-none" />
                      </div>
                    </div>

                    {/* API Key */}
                    <div>
                      <label className="text-xs text-maya-text-dim mb-1 block">
                        API Key <span className="text-maya-text-dim/60">({config.keyHelp})</span>
                      </label>
                      <a
                        href={config.keyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 mb-2 rounded-lg bg-maya-cyan/10 border border-maya-cyan/20 text-maya-cyan text-xs font-medium hover:bg-maya-cyan/20 transition-all"
                      >
                        <Key className="w-3 h-3" /> Get Free Key →
                      </a>
                      <div className="relative">
                        <input
                          type={showKey === key ? "text" : "password"}
                          value={keys[key] || ""}
                          onChange={(e) => setKeys((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder={key === "groq" ? "gsk_xxxx..." : key === "openrouter" ? "sk-or-xxxx..." : "AIzaSy..."}
                          className="w-full px-3 py-2.5 pr-10 rounded-lg bg-maya-dark border border-maya-border text-maya-text placeholder-maya-text-dim text-sm font-mono outline-none focus:border-maya-cyan/50 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(showKey === key ? null : key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-maya-border transition-colors"
                        >
                          {showKey === key ? (
                            <EyeOff className="w-4 h-4 text-maya-text-dim" />
                          ) : (
                            <Eye className="w-4 h-4 text-maya-text-dim" />
                          )}
                        </button>
                      </div>
                      {hasKey && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-maya-green" />
                          <span className="text-[11px] text-maya-green">Key saved</span>
                          <button
                            onClick={() => handleClearKey(key)}
                            className="ml-auto text-[11px] text-red-400 hover:text-red-300"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-maya-cyan text-white text-sm font-medium hover:bg-maya-cyan-dim transition-all mt-2"
          >
            {saved ? (<> <Check className="w-4 h-4" /> Saved! </>) : "Save Settings"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============ VOICE BUTTON ============
function VoiceButton({ onResult }: { onResult: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsRecording(false);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
    setIsRecording(true);
  };

  return (
    <button
      onClick={toggleRecording}
      className={cn(
        "p-2 md:p-2.5 rounded-xl transition-all",
        isRecording
          ? "bg-red-500/20 text-red-400 animate-pulse"
          : "hover:bg-maya-border text-maya-text-dim"
      )}
    >
      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}

// ============ MARKDOWN RENDERER ============
function renderMarkdown(text: string) {
  let rendered = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  rendered = rendered.replace(/\*(.*?)\*/g, "<em>$1</em>");
  rendered = rendered.replace(
    /`(.*?)`/g,
    '<code class="px-1 py-0.5 rounded bg-maya-dark text-maya-cyan text-xs font-mono">$1</code>'
  );
  rendered = rendered.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener" class="text-maya-cyan underline">$1</a>'
  );
  rendered = rendered.replace(
    /^• (.*$)/gm,
    '<div class="flex gap-2"><span class="text-maya-cyan">•</span><span>$1</span></div>'
  );
  rendered = rendered.replace(
    /^(\d+)\. (.*$)/gm,
    '<div class="flex gap-2"><span class="text-maya-cyan font-mono">$1.</span><span>$2</span></div>'
  );

  return <div dangerouslySetInnerHTML={{ __html: rendered }} />;
}
