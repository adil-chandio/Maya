import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Key, Eye, EyeOff, Check, ArrowRight, Bot, Mic, Globe } from "lucide-react";
import { cn } from "../lib/utils";
import { PROVIDERS, type Provider } from "../hooks/useChat";

interface SetupWizardProps {
  isOpen: boolean;
  onComplete: () => void;
  onSave: (settings: { provider: Provider; keys: Record<Provider, string>; model: string }) => void;
}

const STEPS = ["welcome", "select-provider", "enter-key", "done"];

export default function SetupWizard({ isOpen, onComplete, onSave }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<Provider>("groq");
  const [keys, setKeys] = useState<Record<Provider, string>>({ groq: "", openrouter: "", gemini: "" });
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const currentStep = STEPS[step];
  const config = PROVIDERS[provider];

  const handleSave = () => {
    onSave({ provider, keys, model: config.defaultModel });
    setStep(3);
    setTimeout(onComplete, 2000);
  };

  const canProceed = keys[provider]?.length > 5;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-maya-dark flex items-center justify-center p-4"
      >
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-maya-cyan/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-maya-purple/5 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="relative w-full max-w-md"
        >
          {/* Step: Welcome */}
          {currentStep === "welcome" && (
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-maya-cyan/20 to-maya-purple/20 flex items-center justify-center border border-maya-cyan/30"
              >
                <Bot className="w-12 h-12 text-maya-cyan" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome to <span className="text-maya-cyan">Maya</span>
                </h1>
                <p className="text-maya-text-dim">Your AI assistant with full device control</p>
              </div>
              <div className="flex justify-center gap-6 text-maya-text-dim text-sm">
                <div className="flex items-center gap-2"><Mic className="w-4 h-4 text-maya-cyan" /> Voice</div>
                <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-maya-purple" /> Automations</div>
                <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-maya-green" /> Web Control</div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-maya-cyan to-maya-purple text-white font-medium hover:shadow-lg hover:shadow-maya-cyan/25 transition-all flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step: Select Provider */}
          {currentStep === "select-provider" && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1">Choose AI Provider</h2>
                <p className="text-sm text-maya-text-dim">All providers are FREE. Pick one to start.</p>
              </div>
              <div className="space-y-3">
                {(Object.entries(PROVIDERS) as [Provider, typeof config][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setProvider(key)}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all",
                      provider === key
                        ? "bg-maya-cyan/10 border-maya-cyan/50"
                        : "bg-maya-card border-maya-border hover:border-maya-cyan/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        provider === key ? "bg-maya-cyan/20" : "bg-maya-border/50"
                      )}>
                        <Zap className={cn("w-5 h-5", provider === key ? "text-maya-cyan" : "text-maya-text-dim")} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{cfg.name}</p>
                        <p className="text-xs text-maya-text-dim">{cfg.models.length} models • 100% Free</p>
                      </div>
                      {keys[key] && <Check className="w-5 h-5 text-maya-green" />}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl bg-maya-cyan text-white font-medium hover:bg-maya-cyan-dim transition-all"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step: Enter Key */}
          {currentStep === "select-provider" ? null : currentStep === "enter-key" && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1">Add {config.name} Key</h2>
                <p className="text-sm text-maya-text-dim">{config.keyHelp}</p>
              </div>
              <a
                href={config.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full py-3 rounded-xl bg-maya-cyan/10 border border-maya-cyan/30 text-maya-cyan text-sm font-medium text-center hover:bg-maya-cyan/20 transition-all"
              >
                <Key className="w-4 h-4 inline mr-2" />
                Get Free Key from {config.name}
              </a>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={keys[provider] || ""}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [provider]: e.target.value }))}
                  placeholder={provider === "groq" ? "gsk_xxxx..." : provider === "openrouter" ? "sk-or-xxxx..." : "AIzaSy..."}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-maya-card border border-maya-border text-maya-text placeholder-maya-text-dim font-mono outline-none focus:border-maya-cyan/50 transition-colors"
                  autoFocus
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                >
                  {showKey ? <EyeOff className="w-5 h-5 text-maya-text-dim" /> : <Eye className="w-5 h-5 text-maya-text-dim" />}
                </button>
              </div>
              {keys[provider] && keys[provider].length > 5 && (
                <div className="flex items-center gap-2 text-maya-green text-sm">
                  <Check className="w-4 h-4" /> Key looks valid!
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={!canProceed}
                className={cn(
                  "w-full py-3.5 rounded-xl text-white font-medium transition-all",
                  canProceed
                    ? "bg-gradient-to-r from-maya-cyan to-maya-purple hover:shadow-lg hover:shadow-maya-cyan/25"
                    : "bg-maya-border text-maya-text-dim cursor-not-allowed"
                )}
              >
                {canProceed ? "Start Using Maya" : "Enter your API key"}
              </button>
            </div>
          )}

          {/* Step: Done */}
          {currentStep === "done" && (
            <div className="text-center space-y-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="w-20 h-20 mx-auto rounded-full bg-maya-green/20 flex items-center justify-center border border-maya-green/30"
              >
                <Check className="w-10 h-10 text-maya-green" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-white">You're All Set!</h2>
                <p className="text-maya-text-dim mt-1">Maya is ready to assist you</p>
              </div>
            </div>
          )}

          {/* Skip for now */}
          {step < 3 && (
            <button
              onClick={onComplete}
              className="w-full text-center text-xs text-maya-text-dim hover:text-maya-text mt-4 transition-colors"
            >
              Skip for now →
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
