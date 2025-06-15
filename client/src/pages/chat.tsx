import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Settings, Trash2, Sparkles, Zap, MessageSquare, Plus, History } from "lucide-react";
import type { Message, ChatSession } from "@shared/schema";
import { AuthWrapper } from "@/components/AuthWrapper";
import { AIStatusIndicator, AIThinkingVisualizer, FloatingParticles, TypingEffect } from "@/components/GimmickFeatures";
import { User as FirebaseUser } from "firebase/auth";

function ChatInterface({ user }: { user: FirebaseUser }) {
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => 
    crypto.randomUUID()
  );
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch messages for current session
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", currentSessionId],
    queryFn: () => fetch(`/api/messages?sessionId=${currentSessionId}`).then(res => res.json()),
  });

  // Fetch chat sessions
  const { data: chatSessions = [] } = useQuery<ChatSession[]>({
    queryKey: ["/api/sessions", user.uid],
    queryFn: () => fetch(`/api/sessions?userId=${user.uid}`).then(res => res.json()),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/messages", {
        content,
        role: "user",
        userId: user.uid,
        sessionId: currentSessionId,
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", currentSessionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", user.uid] });
      setInputValue("");
      setIsTyping(false);
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Clear messages mutation
  const clearMessagesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/messages?sessionId=${currentSessionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", currentSessionId] });
      toast({
        title: "Success",
        description: "Riwayat percakapan telah dihapus",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal menghapus riwayat percakapan",
        variant: "destructive",
      });
    },
  });

  // Create new chat session
  const createNewChat = () => {
    const newSessionId = crypto.randomUUID();
    setCurrentSessionId(newSessionId);
    setShowSidebar(false);
  };

  // Switch to existing chat session
  const switchToSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setShowSidebar(false);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + "px";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(trimmedValue);
  };

  const insertSuggestion = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
    adjustTextareaHeight();
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-chat">
      {/* Sidebar for chat sessions */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSidebar(false)} />
          <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Riwayat Chat</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(false)}
                  className="p-1"
                >
                  ×
                </Button>
              </div>
            </div>
            <div className="p-4">
              <Button
                onClick={createNewChat}
                className="w-full mb-4 gradient-primary text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Chat Baru
              </Button>
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <Button
                    key={session.sessionId}
                    variant={session.sessionId === currentSessionId ? "secondary" : "ghost"}
                    onClick={() => switchToSession(session.sessionId)}
                    className="w-full justify-start text-left p-3 rounded-xl"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <div className="truncate">
                      {session.title || `Chat ${session.sessionId.slice(0, 8)}...`}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-header border-b border-white/20 px-3 py-3 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(true)}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl lg:hidden"
            >
              <History className="w-4 h-4" />
            </Button>
            <div className="relative">
              <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-white flex items-center justify-center">
                <Zap className="w-1.5 h-1.5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-textPrimary bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                IntelliChat AI
              </h1>
              <p className="text-xs text-gray-600 font-medium">Powered by Gemini AI • v2.1</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Online</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearMessagesMutation.mutate()}
              disabled={clearMessagesMutation.isPending}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* AI Status Indicator */}
        <div className="mt-3">
          <AIStatusIndicator />
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col w-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 max-w-4xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-aiResponse rounded-2xl rounded-tl-md px-4 py-3 message-shadow border border-white/30">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-purple-600">IntelliChat AI</span>
                  </div>
                  <p className="text-textPrimary text-sm leading-relaxed">
                    Selamat datang di <span className="font-semibold text-purple-600">IntelliChat AI</span>! 🚀 
                    Saya adalah asisten AI canggih yang siap membantu Anda dengan berbagai tugas seperti menjawab pertanyaan, 
                    analisis data, menulis konten kreatif, dan diskusi mendalam. Mari mulai percakapan yang menarik!
                  </p>
                </div>
                <div className="mt-1 text-xs text-gray-500 px-4 flex items-center space-x-2">
                  <span>Baru saja</span>
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  <span className="text-purple-500 font-medium">AI Ready</span>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.role === "user" ? "justify-end" : ""
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`flex-1 ${message.role === "user" ? "flex flex-col items-end" : ""}`}>
                {message.role === "assistant" && (
                  <div className="flex items-center space-x-2 mb-1 px-4">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs font-semibold text-purple-600">IntelliChat AI</span>
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 message-shadow ${
                    message.role === "user"
                      ? "gradient-primary text-white rounded-tr-md border border-purple-300/20 max-w-xs sm:max-w-md"
                      : "bg-aiResponse text-textPrimary rounded-tl-md border border-white/30 max-w-full"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
                <div className="mt-1 text-xs text-gray-500 px-4 flex items-center space-x-2">
                  <span>{formatTimestamp(message.timestamp)}</span>
                  {message.role === "assistant" && (
                    <>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <span className="text-purple-500 font-medium">AI Response</span>
                    </>
                  )}
                </div>
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1 px-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-purple-600">IntelliChat AI</span>
                </div>
                <div className="bg-aiResponse rounded-2xl rounded-tl-md px-4 py-3 max-w-xs message-shadow border border-white/30">
                  <div className="flex space-x-1 items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-500"></div>
                    <span className="text-xs text-purple-600 ml-2 font-medium">Sedang mengetik...</span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500 px-4 flex items-center space-x-2">
                  <span>AI sedang berpikir...</span>
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  <span className="text-purple-500 font-medium">Processing</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (positioned above input) */}
        {messages.length === 0 && (
          <div className="px-3 pb-2 max-w-4xl mx-auto w-full">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="px-3 py-2 text-xs bg-white/60 hover:bg-white/80 text-purple-700 rounded-full h-auto border border-purple-200/50 font-medium transition-all duration-200 shadow-sm backdrop-blur-sm"
                onClick={() => insertSuggestion("Ceritakan lelucon lucu")}
              >
                Ceritakan lelucon lucu
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="px-3 py-2 text-xs bg-white/60 hover:bg-white/80 text-blue-700 rounded-full h-auto border border-blue-200/50 font-medium transition-all duration-200 shadow-sm backdrop-blur-sm"
                onClick={() => insertSuggestion("Jelaskan kecerdasan buatan")}
              >
                Jelaskan kecerdasan buatan
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="px-3 py-2 text-xs bg-white/60 hover:bg-white/80 text-pink-700 rounded-full h-auto border border-pink-200/50 font-medium transition-all duration-200 shadow-sm backdrop-blur-sm"
                onClick={() => insertSuggestion("Buatkan puisi tentang teknologi")}
              >
                Buatkan puisi tentang teknologi
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-white/20 bg-header px-3 py-3 sticky bottom-0 mobile-safe-area">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ketik pesan Anda di sini..."
                    className="w-full px-4 py-3 pr-12 border border-purple-200/50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none overflow-hidden mobile-input max-h-32 text-sm text-textPrimary bg-white/90 backdrop-blur-sm shadow-md placeholder:text-gray-500"
                    rows={1}
                  />
                  <div className="absolute bottom-1.5 right-12 text-xs text-gray-400 font-medium">
                    <span className={inputValue.length > 1800 ? "text-red-500" : inputValue.length > 1500 ? "text-amber-500" : "text-purple-500"}>
                      {inputValue.length}
                    </span>/2000
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || sendMessageMutation.isPending}
                className="gradient-primary hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 border border-purple-300/20 mobile-input"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  return (
    <AuthWrapper>
      {(user) => user ? <ChatInterface user={user} /> : null}
    </AuthWrapper>
  );
}
