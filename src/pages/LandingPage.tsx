import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  Mic,
  MessageSquare,
  Zap,
  Shield,
  Sparkles,
  ArrowRight,
  Bot,
  Code,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Advanced AI Brain",
    description:
      "Powered by Llama 3 on Groq for lightning-fast, intelligent responses.",
  },
  {
    icon: Mic,
    title: "Voice Enabled",
    description:
      "Speak naturally — Maya listens and responds with voice output.",
  },
  {
    icon: MessageSquare,
    title: "Context Aware",
    description:
      "Maya remembers your conversation and adapts to your style.",
  },
  {
    icon: Zap,
    title: "Ultra Fast",
    description:
      "Groq's LPU inference makes responses near-instant.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Your conversations are stored securely. You control your data.",
  },
  {
    icon: Sparkles,
    title: "Always Learning",
    description:
      "Maya gets better with each interaction and personalizes responses.",
  },
];

const capabilities = [
  { icon: Code, label: "Code Generation" },
  { icon: Globe, label: "Web Knowledge" },
  { icon: Brain, label: "Reasoning" },
  { icon: Bot, label: "Task Automation" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-maya-dark overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-maya-cyan/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-maya-purple/5 rounded-full blur-3xl" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-maya-cyan to-maya-purple flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Maya<span className="text-maya-cyan">AI</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={() => navigate("/chat")}
            className="px-6 py-2.5 rounded-xl bg-maya-cyan/10 border border-maya-cyan/30 text-maya-cyan font-medium hover:bg-maya-cyan/20 hover:border-maya-cyan/50 transition-all duration-300"
          >
            Launch Maya
          </button>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 lg:px-12 pt-20 pb-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* Orbital visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative w-48 h-48 mx-auto mb-12"
          >
            <div className="absolute inset-0 rounded-full border border-maya-cyan/20" />
            <div className="absolute inset-4 rounded-full border border-maya-purple/20" />
            <div className="absolute inset-8 rounded-full border border-maya-cyan/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-maya-cyan/20 to-maya-purple/20 flex items-center justify-center border border-maya-cyan/30">
                <Brain className="w-10 h-10 text-maya-cyan" />
              </div>
            </div>
            {/* Orbiting dots */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              <div className="absolute top-0 left-1/2 w-2 h-2 -ml-1 -mt-1 rounded-full bg-maya-cyan" />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4"
            >
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-maya-purple" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-maya-cyan/10 border border-maya-cyan/20 text-maya-cyan text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-maya-green animate-pulse" />
              Powered by Llama 3 • Running on Groq
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight"
          >
            Meet{" "}
            <span className="bg-gradient-to-r from-maya-cyan via-maya-purple to-maya-pink bg-clip-text text-transparent">
              Maya
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-xl md:text-2xl text-maya-text-dim max-w-2xl mx-auto mb-12"
          >
            Your personal AI assistant. Intelligent, fast, and always ready to
            help. Like JARVIS, but for everyone.
          </motion.p>

          {/* Capability badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {capabilities.map((cap) => (
              <div
                key={cap.label}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-maya-card border border-maya-border text-sm text-maya-text-dim"
              >
                <cap.icon className="w-4 h-4 text-maya-cyan" />
                {cap.label}
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <button
              onClick={() => navigate("/chat")}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-maya-cyan to-maya-purple text-white font-semibold text-lg hover:shadow-lg hover:shadow-maya-cyan/25 transition-all duration-300 hover:scale-105"
            >
              Start Conversation
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-maya-text-dim text-sm mt-4">
              Free to use • No signup required • Instant access
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 lg:px-12 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built for{" "}
              <span className="text-maya-cyan">Real Assistance</span>
            </h2>
            <p className="text-maya-text-dim text-lg max-w-xl mx-auto">
              Not just another chatbot. Maya is designed to actually help you get
              things done.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-6 rounded-2xl bg-maya-card/50 border border-maya-border hover:border-maya-cyan/30 transition-all duration-300 hover:bg-maya-card"
              >
                <div className="w-12 h-12 rounded-xl bg-maya-cyan/10 flex items-center justify-center mb-4 group-hover:bg-maya-cyan/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-maya-cyan" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-maya-text-dim text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 lg:px-12 py-24">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative p-12 rounded-3xl bg-gradient-to-br from-maya-card to-maya-dark border border-maya-border overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-maya-cyan/5 to-maya-purple/5" />
            <div className="relative text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to meet Maya?
              </h2>
              <p className="text-maya-text-dim text-lg mb-8 max-w-md mx-auto">
                Start a conversation now. No setup, no waiting. Just you and
                your AI assistant.
              </p>
              <button
                onClick={() => navigate("/chat")}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-maya-dark font-semibold text-lg hover:bg-white/90 transition-all duration-300 hover:scale-105"
              >
                <Sparkles className="w-5 h-5" />
                Open Maya
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 lg:px-12 py-8 border-t border-maya-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-maya-text-dim text-sm">
            <Bot className="w-4 h-4" />
            Maya AI Assistant
          </div>
          <div className="text-maya-text-dim text-sm">
            Powered by Groq + Llama 3 • Built with Freebuff
          </div>
        </div>
      </footer>
    </div>
  );
}
