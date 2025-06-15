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

  // Markdown rendering component with error handling
  const MarkdownMessage = ({ content }: { content: string }) => {
    try {
      return (
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
    } catch (error) {
      console.error('Error rendering markdown:', error);
      return (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">Error rendering message content</p>
          <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{content}</pre>
        </div>
      );
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Berhasil!",
        description: "Pesan berhasil disalin ke clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: "Berhasil!",
          description: "Pesan berhasil disalin ke clipboard",
        });
      } catch (fallbackError) {
        toast({
          title: "Error",
          description: "Gagal menyalin pesan ke clipboard",
          variant: "destructive",
        });
      }
      document.body.removeChild(textArea);
    }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            onClick={() => setShowProfile(false)} 
          />
          <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
            {/* Close Button */}
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
              <span className="text-gray-400 hover:text-gray-600 text-xl">×</span>
            </button>
            
            <div className="text-center">
              {/* Avatar Section */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="w-full h-full rounded-full overflow-hidden shadow-xl ring-4 ring-white/50">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ${user.photoURL ? 'hidden' : ''}`}>
                    <UserCircle className="w-12 h-12 text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-400 rounded-full border-3 border-white flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>

              {/* User Info */}
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                {user.displayName || "User"}
              </h2>
              <p className="text-gray-600 mb-6 text-sm break-all">{user.email}</p>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200/50">
                  <div className="flex items-center justify-center mb-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{chatSessions.length}</p>
                  <p className="text-xs text-purple-700 font-medium">Chat Sessions</p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200/50">
                  <div className="flex items-center justify-center mb-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-bold text-blue-600">Gemini</p>
                  <p className="text-xs text-blue-700 font-medium">AI Enhanced</p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={() => setShowProfile(false)}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl py-3 font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Close Profile
                </Button>
                <Button
                  onClick={() => {
                    logout();
                    setShowProfile(false);
                  }}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl py-3 transition-all duration-200"
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
        <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in-0 duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowSidebar(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-xl shadow-2xl border-r border-white/20 animate-in slide-in-from-left duration-300 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="font-bold text-gray-800 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Mario AI</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(false)}
                  className="p-2 hover:bg-purple-100 rounded-xl"
                >
                  <span className="text-xl text-gray-600">×</span>
                </Button>
              </div>
              <Button
                onClick={createNewChat}
                className="w-full gradient-primary text-white rounded-xl py-2.5 font-medium"
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

            {/* Mobile Sidebar Footer */}
            <div className="p-4 border-t border-purple-100 bg-gray-50">
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    setShowProfile(true);
                    setShowSidebar(false);
                  }}
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
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
      <header className="bg-header border-b border-white/20 px-3 sm:px-4 py-3 sm:py-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(true)}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl lg:hidden flex-shrink-0"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                <Zap className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-textPrimary bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
                Mario AI
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 font-medium hidden sm:block">Powered by Gemini AI • Enhanced Edition</p>
              <p className="text-xs text-gray-600 font-medium sm:hidden">AI Enhanced</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <div className="hidden sm:flex items-center space-x-2 bg-green-50 px-2 sm:px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">Online</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfile(true)}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200"
            >
              <UserCircle className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearMessagesMutation.mutate()}
              disabled={clearMessagesMutation.isPending}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200 hidden sm:flex"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        
      </header>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col w-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto w-full">
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

          {/* AI Thinking Indicator */}
          {isTyping && (
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2 px-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-purple-600">Mario AI</span>
                  <span className="text-xs text-gray-500">sedang berpikir...</span>
                </div>
                <div className="bg-aiResponse rounded-2xl rounded-tl-md px-5 py-4 max-w-sm message-shadow border border-white/30">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-sm text-purple-700 font-medium">AI sedang menganalisis...</span>
                  </div>
                  <div className="mt-2 flex items-center space-x-2 text-xs text-gray-600">
                    <div className="w-4 h-1 bg-purple-200 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-purple-400 rounded-full animate-pulse"></div>
                    </div>
                    <span>Memproses respons</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        

        {/* Suggestions */}
        {messages.length === 0 && !isTyping && (
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 max-w-6xl mx-auto w-full">
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
                  className="p-3 text-left text-sm text-gray-600 bg-white/60 hover:bg-white/80 rounded-xl border border-purple-100 hover:border-purple-200 transition-all duration-200 hover:shadow-md active:scale-95 transform touch-manipulation"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-white/20 bg-gradient-to-b from-white/50 to-white/80 backdrop-blur-sm px-3 sm:px-4 py-3 sm:py-6 sticky bottom-0 mobile-safe-area">
          <div className="max-w-6xl mx-auto">
            {/* Quick Actions - Mobile optimized */}
            <div className="flex items-center space-x-2 mb-3 overflow-x-auto scrollbar-hide lg:hidden">
              {[
                { icon: Plus, label: "Baru", action: createNewChat },
                { icon: History, label: "Riwayat", action: () => setShowSidebar(true) },
                { icon: Trash2, label: "Hapus", action: () => clearMessagesMutation.mutate() }
              ].map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={item.action}
                  className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full bg-white/70 hover:bg-white/90 border border-purple-100 text-purple-600 hover:text-purple-700 transition-all duration-200 whitespace-nowrap text-xs"
                >
                  <item.icon className="w-3 h-3" />
                  <span className="font-medium">{item.label}</span>
                </Button>
              ))}
            </div>

            {/* Desktop Quick Actions */}
            <div className="hidden lg:flex items-center space-x-2 mb-3">
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

            <div className="flex items-end space-x-2 sm:space-x-3">
              <div className="flex-1">
                {/* AI Tools Row */}
                <div className="flex items-center space-x-2 mb-3 px-1">
                  <div className="flex items-center space-x-1 text-xs text-gray-600">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span className="font-medium">AI Tools:</span>
                  </div>
                  <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 py-1 h-auto text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200/50 whitespace-nowrap"
                      onClick={() => insertSuggestion("Analisis teks ini: ")}
                    >
                      📊 Analisis
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 py-1 h-auto text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200/50 whitespace-nowrap"
                      onClick={() => insertSuggestion("Rangkum konten ini: ")}
                    >
                      📝 Rangkum
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 py-1 h-auto text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200/50 whitespace-nowrap"
                      onClick={() => insertSuggestion("Jelaskan seperti untuk anak 5 tahun: ")}
                    >
                      🧠 Sederhana
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 py-1 h-auto text-xs bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg border border-pink-200/50 whitespace-nowrap"
                      onClick={() => insertSuggestion("Buatkan kode untuk: ")}
                    >
                      💻 Koding
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Tanyakan apa saja kepada Mario AI... Gunakan AI Tools di atas untuk bantuan cepat!"
                    className="w-full px-4 py-4 pr-16 border-2 border-purple-200/50 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none overflow-hidden mobile-input max-h-32 text-sm text-textPrimary bg-white/95 backdrop-blur-sm shadow-lg placeholder:text-gray-500 transition-all duration-200"
                    rows={1}
                  />
                  
                  {/* Character Count */}
                  <div className="absolute bottom-2 right-16 text-xs font-medium hidden sm:block">
                    <span className={inputValue.length > 1800 ? "text-red-500" : inputValue.length > 1500 ? "text-amber-500" : "text-purple-500"}>
                      {inputValue.length}
                    </span>
                    <span className="text-gray-400">/2000</span>
                  </div>
                  
                  {/* Clear Button */}
                  {inputValue.trim() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInputValue("")}
                      className="absolute bottom-2 right-2 p-1 h-6 w-6 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </Button>
                  )}
                  
                  {/* AI Enhancement Indicator */}
                  <div className="absolute top-2 right-2 hidden sm:flex items-center space-x-1 text-xs text-purple-600">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="font-medium">Enhanced</span>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || sendMessageMutation.isPending}
                className="gradient-primary hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 sm:p-4 rounded-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 border-2 border-purple-300/30 mobile-input shadow-lg flex-shrink-0"
              >
                {sendMessageMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500 text-center hidden sm:block">
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
