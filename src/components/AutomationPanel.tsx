import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Zap,
  Phone,
  UserPlus,
  History,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  getCapabilities,
  getAutomationHistory,
  saveContact,
} from "../lib/automations";

interface AutomationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AutomationPanel({
  isOpen,
  onClose,
}: AutomationPanelProps) {
  const [tab, setTab] = useState<"capabilities" | "contacts" | "history">(
    "capabilities"
  );
  const [contactName, setContactName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      try {
        setContacts(
          JSON.parse(localStorage.getItem("maya_contacts") || "{}")
        );
      } catch {
        setContacts({});
      }
      setHistory(getAutomationHistory());
    }
  }, [isOpen]);

  const addContact = () => {
    if (!contactName.trim() || !contactNumber.trim()) return;
    saveContact(contactName.trim(), contactNumber.trim());
    setContacts((prev) => ({
      ...prev,
      [contactName.trim().toLowerCase()]: contactNumber.trim(),
    }));
    setContactName("");
    setContactNumber("");
  };

  const removeContact = (name: string) => {
    const updated = { ...contacts };
    delete updated[name];
    localStorage.setItem("maya_contacts", JSON.stringify(updated));
    setContacts(updated);
  };

  if (!isOpen) return null;

  const capabilities = getCapabilities();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full md:max-w-lg bg-maya-darker border border-maya-border rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-maya-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-maya-cyan/20 to-maya-purple/20 flex items-center justify-center border border-maya-cyan/30">
                <Zap className="w-5 h-5 text-maya-cyan" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Automations
                </h2>
                <p className="text-xs text-maya-text-dim">
                  Maya can do these things for you
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-maya-card transition-colors"
            >
              <X className="w-5 h-5 text-maya-text-dim" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-5 pt-4">
            {[
              { id: "capabilities" as const, label: "Features", icon: Zap },
              { id: "contacts" as const, label: "Contacts", icon: UserPlus },
              { id: "history" as const, label: "History", icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  tab === id
                    ? "bg-maya-cyan/10 text-maya-cyan border border-maya-cyan/30"
                    : "text-maya-text-dim hover:bg-maya-card"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Capabilities Tab */}
            {tab === "capabilities" && (
              <div className="space-y-2">
                {capabilities.map((cap) => {
                  return (
                    <div
                      key={cap.name}
                      className={cn(
                        "p-3 rounded-xl border transition-all",
                        cap.available
                          ? "bg-maya-card/50 border-maya-border hover:border-maya-cyan/30"
                          : "bg-maya-card/20 border-maya-border/50 opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-maya-dark flex items-center justify-center text-lg shrink-0">
                          {cap.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">
                              {cap.name}
                            </p>
                            {!cap.available && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-maya-amber/10 text-maya-amber border border-maya-amber/20">
                                Soon
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-maya-text-dim">
                            {cap.description}
                          </p>
                        </div>
                      </div>
                      {cap.available && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {cap.examples.map((ex) => (
                            <span
                              key={ex}
                              className="text-[11px] px-2 py-1 rounded-md bg-maya-dark text-maya-text-dim font-mono"
                            >
                              "{ex}"
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Contacts Tab */}
            {tab === "contacts" && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-maya-card border border-maya-border">
                  <p className="text-xs text-maya-text-dim mb-2">
                    Save contacts so Maya can call or message them by name.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-maya-dark border border-maya-border text-maya-text text-sm outline-none focus:border-maya-cyan/50"
                    />
                    <input
                      type="tel"
                      placeholder="Number"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-maya-dark border border-maya-border text-maya-text text-sm outline-none focus:border-maya-cyan/50"
                    />
                    <button
                      onClick={addContact}
                      disabled={!contactName.trim() || !contactNumber.trim()}
                      className="px-3 py-2 rounded-lg bg-maya-cyan/10 border border-maya-cyan/30 text-maya-cyan text-sm font-medium hover:bg-maya-cyan/20 transition-all disabled:opacity-40"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {Object.keys(contacts).length === 0 ? (
                  <div className="text-center py-8">
                    <Phone className="w-8 h-8 text-maya-text-dim mx-auto mb-2" />
                    <p className="text-sm text-maya-text-dim">
                      No contacts saved yet
                    </p>
                    <p className="text-xs text-maya-text-dim/60 mt-1">
                      Add contacts so you can say "Call Mom" or "Text John"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(contacts).map(([name, number]) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 p-3 rounded-xl bg-maya-card border border-maya-border"
                      >
                        <div className="w-8 h-8 rounded-lg bg-maya-purple/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-maya-purple uppercase">
                            {name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white capitalize">
                            {name}
                          </p>
                          <p className="text-xs text-maya-text-dim font-mono">
                            {number}
                          </p>
                        </div>
                        <button
                          onClick={() => removeContact(name)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-maya-text-dim hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {tab === "history" && (
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-8 h-8 text-maya-text-dim mx-auto mb-2" />
                    <p className="text-sm text-maya-text-dim">
                      No commands executed yet
                    </p>
                    <p className="text-xs text-maya-text-dim/60 mt-1">
                      Try saying "open youtube" or "call Mom"
                    </p>
                  </div>
                ) : (
                  history.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-xl border",
                        item.success
                          ? "bg-maya-green/5 border-maya-green/20"
                          : "bg-maya-amber/5 border-maya-amber/20"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs">
                          {item.success ? "✅" : "⚠️"}
                        </span>
                        <p className="text-sm text-maya-text truncate">
                          {item.message}
                        </p>
                      </div>
                      <p className="text-[10px] text-maya-text-dim mt-1 font-mono">
                        {item.action} •{" "}
                        {new Date(item.executedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
