import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Settings, Trash2, Sparkles, Zap, MessageSquare, Plus, History, Menu, LogOut, Crown, UserCircle, FileText, Download, Copy } from "lucide-react";
import type { Message, ChatSession } from "@shared/schema";
import { AuthWrapper } from "@/components/AuthWrapper";
import { AIStatusIndicator, AIThinkingVisualizer, FloatingParticles, TypingEffect } from "@/components/GimmickFeatures";
import { User as FirebaseUser } from "firebase/auth";
import { logout } from "@/lib/firebase";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function ChatInterface({ user }: { user: FirebaseUser }) {
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => 
    crypto.randomUUID()
  );
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Markdown rendering component
  const MarkdownMessage = ({ content }: { content: string }) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none text-textPrimary prose-headings:text-purple-700 prose-strong:text-purple-600 prose-code:text-pink-600 prose-code:bg-purple-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-white prose-blockquote:border-purple-300 prose-blockquote:bg-purple-50 prose-table:text-sm"
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              className="rounded-lg"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        table({ children }) {
          return (
            <div className="my-4 overflow-x-auto">
              <Table className="border border-purple-200 rounded-lg">
                {children}
              </Table>
            </div>
          );
        },
        thead({ children }) {
          return <TableHeader className="bg-purple-50">{children}</TableHeader>;
        },
        tbody({ children }) {
          return <TableBody>{children}</TableBody>;
        },
        tr({ children }) {
          return <TableRow>{children}</TableRow>;
        },
        th({ children }) {
          return <TableHead className="font-semibold text-purple-700 border-r border-purple-200 last:border-r-0">{children}</TableHead>;
        },
        td({ children }) {
          return <TableCell className="border-r border-purple-100 last:border-r-0">{children}</TableCell>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-purple-300 bg-purple-50 pl-4 py-2 my-3 rounded-r-lg">
              {children}
            </blockquote>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
    });
  };

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
    <div className="min-h-screen flex bg-chat">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-80 lg:flex-col bg-white/95 backdrop-blur-sm border-r border-purple-100 shadow-lg">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-purple-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Mario AI
              </h1>
              <p className="text-xs text-gray-500">Asisten AI Cerdas</p>
            </div>
          </div>
          
          <Button
            onClick={createNewChat}
            className="w-full gradient-primary text-white rounded-xl py-2.5 font-medium hover:shadow-lg transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Chat Baru
          </Button>
        </div>

        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {chatSessions.map((session) => (
              <Button
                key={session.sessionId}
                variant={session.sessionId === currentSessionId ? "secondary" : "ghost"}
                onClick={() => switchToSession(session.sessionId)}
                className="w-full justify-start text-left p-3 rounded-xl hover:bg-purple-50 transition-colors duration-200"
              >
                <MessageSquare className="w-4 h-4 mr-3 text-purple-600" />
                <div className="truncate text-sm">
                  {session.title || `Chat ${session.sessionId.slice(0, 8)}...`}
                </div>
              </Button>
            ))}
            {chatSessions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Belum ada riwayat chat</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-purple-100">
          <div className="space-y-2">
            <Button
              onClick={() => setShowProfile(true)}
              variant="ghost"
              className="w-full justify-start p-3 rounded-xl hover:bg-purple-50 transition-colors duration-200"
            >
              <UserCircle className="w-4 h-4 mr-3 text-purple-600" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-700 truncate">
                  {user.displayName}
                </div>
                <div className="text-xs text-gray-500">View Profile</div>
              </div>
            </Button>
            <Button
              onClick={() => logout()}
              variant="ghost"
              className="w-full justify-start p-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors duration-200"
            >
              <LogOut className="w-4 h-4 mr-3" />
              <span className="text-sm">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 m-4 max-w-md w-full">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden shadow-lg">
                <img
                  src={user.photoURL || ""}
                  alt={user.displayName || "User"}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {user.displayName}
              </h2>
              <p className="text-gray-600 mb-6">{user.email}</p>
              
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-xl p-4 text-left">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">Chat Sessions</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{chatSessions.length}</p>
                </div>
                
                <div className="bg-blue-50 rounded-xl p-4 text-left">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">AI Model</span>
                  </div>
                  <p className="text-sm text-blue-600 font-medium">Gemini AI Enhanced</p>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <Button
                  onClick={() => setShowProfile(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    logout();
                    setShowProfile(false);
                  }}
                  variant="destructive"
                  className="flex-1"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSidebar(false)} />
          <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Mario AI</h2>
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
      <header className="bg-header border-b border-white/20 px-4 py-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(true)}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl lg:hidden"
            >
              <History className="w-4 h-4" />
            </Button>
            <div className="relative">
              <div className="w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                <Zap className="w-2 h-2 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-textPrimary bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Mario AI
              </h1>
              <p className="text-sm text-gray-600 font-medium">Powered by Gemini AI • Enhanced Edition</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">Online</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfile(true)}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200"
            >
              <UserCircle className="w-4 h-4" />
            </Button>
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
        <div className="mt-4 max-w-6xl mx-auto w-full">
          <AIStatusIndicator />
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col w-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-6xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-aiResponse rounded-2xl rounded-tl-md px-4 py-3 message-shadow border border-white/30">
                  <div className="flex items-center space-x-2 mb-1">
                    <Crown className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-semibold text-purple-600">Mario AI</span>
                  </div>
                  <p className="text-textPrimary text-sm leading-relaxed">
                    Ciao! Saya <span className="font-semibold text-purple-600">Mario AI</span>, asisten AI yang siap membantu Anda! 
                    Saya dapat menjawab pertanyaan, menganalisis data, menulis konten kreatif, dan berdiskusi tentang berbagai topik. 
                    Apa yang bisa saya bantu hari ini?
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
              className={`flex items-start space-x-4 ${
                message.role === "user" ? "justify-end" : ""
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div className={`flex-1 ${message.role === "user" ? "flex flex-col items-end" : ""} max-w-4xl`}>
                {message.role === "assistant" && (
                  <div className="flex items-center justify-between w-full mb-2 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-purple-600">Mario AI</span>
                      <span className="text-xs text-gray-500">Enhanced Response</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content)}
                        className="p-1.5 h-auto text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <div
                  className={`rounded-2xl px-5 py-4 message-shadow ${
                    message.role === "user"
                      ? "gradient-primary text-white rounded-tr-md border border-purple-300/20 max-w-md"
                      : "bg-aiResponse text-textPrimary rounded-tl-md border border-white/30 w-full"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MarkdownMessage content={message.content} />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500 px-5 flex items-center space-x-2">
                  <span>{formatTimestamp(message.timestamp)}</span>
                  {message.role === "assistant" && (
                    <>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <span className="text-purple-500 font-medium">Enhanced AI</span>
                    </>
                  )}
                </div>
              </div>

              {message.role === "user" && (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <User className="w-5 h-5 text-white" />
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
          <div className="px-4 pb-3 max-w-6xl mx-auto w-full">
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

        {/* Suggestions */}
        {messages.length === 0 && !isTyping && (
          <div className="px-4 pb-6 max-w-6xl mx-auto w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Ceritakan lelucon lucu tentang teknologi",
                "Jelaskan kecerdasan buatan dengan sederhana",
                "Buatkan puisi tentang teknologi",
                "Bagaimana cara belajar programming?"
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => insertSuggestion(suggestion)}
                  className="p-3 text-left text-sm text-gray-600 bg-white/60 hover:bg-white/80 rounded-xl border border-purple-100 hover:border-purple-200 transition-all duration-200 hover:shadow-md"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-white/20 bg-gradient-to-b from-white/50 to-white/80 backdrop-blur-sm px-4 py-6 sticky bottom-0 mobile-safe-area">
          <div className="max-w-6xl mx-auto">
            {/* Quick Actions */}
            <div className="flex items-center space-x-2 mb-3 overflow-x-auto">
              {[
                { icon: Plus, label: "Chat Baru", action: createNewChat },
                { icon: History, label: "Riwayat", action: () => setShowSidebar(true) },
                { icon: Trash2, label: "Hapus", action: () => clearMessagesMutation.mutate() }
              ].map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={item.action}
                  className="flex items-center space-x-1 px-3 py-2 rounded-full bg-white/70 hover:bg-white/90 border border-purple-100 text-purple-600 hover:text-purple-700 transition-all duration-200 whitespace-nowrap"
                >
                  <item.icon className="w-3 h-3" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Button>
              ))}
            </div>

            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Tanyakan apa saja kepada Mario AI..."
                    className="w-full px-4 py-4 pr-16 border-2 border-purple-200/50 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none overflow-hidden mobile-input max-h-32 text-sm text-textPrimary bg-white/95 backdrop-blur-sm shadow-lg placeholder:text-gray-500 transition-all duration-200"
                    rows={1}
                  />
                  <div className="absolute bottom-2 right-16 text-xs font-medium">
                    <span className={inputValue.length > 1800 ? "text-red-500" : inputValue.length > 1500 ? "text-amber-500" : "text-purple-500"}>
                      {inputValue.length}
                    </span>
                    <span className="text-gray-400">/2000</span>
                  </div>
                  {inputValue.trim() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInputValue("")}
                      className="absolute bottom-2 right-2 p-1 h-6 w-6 rounded-full hover:bg-gray-100"
                    >
                      <span className="text-gray-400 text-xs">×</span>
                    </Button>
                  )}
                </div>
              </div>
              
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || sendMessageMutation.isPending}
                className="gradient-primary hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 border-2 border-purple-300/30 mobile-input shadow-lg"
              >
                {sendMessageMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500 text-center">
              Tekan <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> untuk kirim, 
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600 ml-1">Shift + Enter</kbd> untuk baris baru
            </div>
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
