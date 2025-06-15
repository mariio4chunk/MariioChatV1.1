import { useState, useEffect } from "react";
import { Brain, Cpu, Zap, Activity, Wifi, Database } from "lucide-react";

export function AIStatusIndicator() {
  const [status, setStatus] = useState<"thinking" | "ready" | "processing">("ready");
  const [cpuUsage, setCpuUsage] = useState(45);
  const [memoryUsage, setMemoryUsage] = useState(32);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(Math.random() * 100);
      setMemoryUsage(Math.random() * 80 + 20);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-3 px-3 py-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
      <div className="flex items-center space-x-2">
        <Brain className="w-4 h-4 text-purple-600 animate-pulse" />
        <span className="text-xs font-medium text-purple-700">Neural Core</span>
      </div>
      
      <div className="flex items-center space-x-1">
        <Cpu className="w-3 h-3 text-blue-600" />
        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-1000"
            style={{ width: `${cpuUsage}%` }}
          />
        </div>
        <span className="text-xs text-gray-600">{Math.round(cpuUsage)}%</span>
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

export function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-purple-400/30 rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

export function AIThinkingVisualizer({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
      <Brain className="w-4 h-4 text-purple-600 animate-spin" />
      <div className="flex space-x-1">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="w-1 h-4 bg-gradient-to-t from-purple-400 to-pink-400 rounded-full animate-pulse"
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>
      <span className="text-xs text-purple-700 font-medium">Processing neural pathways...</span>
    </div>
  );
}