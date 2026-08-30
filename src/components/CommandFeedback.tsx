import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, X } from "lucide-react";
import { cn } from "../lib/utils";

interface FeedbackItem {
  id: number;
  message: string;
  success: boolean;
}

let feedbackListeners: ((item: FeedbackItem) => void)[] = [];
let feedbackId = 0;

export function showCommandFeedback(message: string, success: boolean) {
  const item = { id: ++feedbackId, message, success };
  feedbackListeners.forEach((fn) => fn(item));
}

export default function CommandFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    const handler = (item: FeedbackItem) => {
      setItems((prev) => [...prev.slice(-4), item]);
      // Auto-dismiss after 4s
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }, 4000);
    };
    feedbackListeners.push(handler);
    return () => {
      feedbackListeners = feedbackListeners.filter((fn) => fn !== handler);
    };
  }, []);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-lg backdrop-blur-xl text-sm font-medium max-w-sm",
              item.success
                ? "bg-maya-green/10 border-maya-green/30 text-maya-green"
                : "bg-maya-amber/10 border-maya-amber/30 text-maya-amber"
            )}
          >
            {item.success ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="truncate">{item.message}</span>
            <button
              onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
              className="ml-1 p-0.5 hover:opacity-70 pointer-events-auto"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
