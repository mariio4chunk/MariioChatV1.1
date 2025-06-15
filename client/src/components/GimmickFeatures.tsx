import { useState, useEffect } from "react";
import { Database, Activity, Wifi, Brain, Zap } from "lucide-react";

export function AIStatusIndicator() {
  const [status, setStatus] = useState<"thinking" | "idle" | "processing">("idle");
  const [memoryUsage, setMemoryUsage] = useState(45);

  useEffect(() => {
    const interval = setInterval(() => {
      setMemoryUsage(prev => {
        const change = (Math.random() - 0.5) * 10;
        return Math.max(20, Math.min(80, prev + change));
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-4 px-3 py-2 bg-gray-50 rounded-lg border text-xs">
      <div className="flex items-center space-x-1">
        <Brain className="w-3 h-3 text-blue-600" />
        <span className="text-gray-600">AI Status</span>
        <div className={`w-2 h-2 rounded-full ${
          status === "thinking" ? "bg-yellow-400 animate-pulse" :
          status === "processing" ? "bg-green-400" : "bg-gray-400"
        }`} />
      </div>

      <div className="flex items-center space-x-1">
        <Database className="w-3 h-3 text-green-600" />
        <div className="w-8 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-1000"
            style={{ width: `${memoryUsage}%` }}
          />
        </div>
        <span className="text-xs text-gray-600">{Math.round(memoryUsage)}%</span>
      </div>

      <div className="flex items-center space-x-1">
        <Activity className="w-3 h-3 text-orange-500 animate-pulse" />
        <Wifi className="w-3 h-3 text-green-500" />
      </div>
    </div>
  );
}

export function AIThinkingVisualizer() {
  return (
    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <span className="text-sm text-blue-700">AI sedang berpikir...</span>
    </div>
  );
}

export function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-gray-300 rounded-full opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            animation: `float 3s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

export function TypingEffect({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 30);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  return <span>{displayText}</span>;
}