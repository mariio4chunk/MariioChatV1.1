
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Settings, Trash2, Sparkles, Zap, MessageSquare, Plus, History, Menu, LogOut, Crown, UserCircle, FileText, Download, Copy, Image, Globe, Clock, Lightbulb, Folder, Mic } from "lucide-react";
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
        <div className="prose prose-sm max-w-none text-textPrimary prose-headings:text-gray-800 prose-strong:text-gray-900 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-white prose-blockquote:border-blue-300 prose-blockquote:bg-blue-50 prose-table:text-sm">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{ borderRadius: '0.75rem' }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code {...props}>
                    {children}
                  </code>
                );
              },
              table({ children, ...props }) {
                return (
                  <div className="my-4 overflow-x-auto">
                    <Table className="border border-gray-200 rounded-lg">
                      {children}
                    </Table>
                  </div>
                );
              },
              thead({ children, ...props }) {
                return <TableHeader className="bg-blue-50">{children}</TableHeader>;
              },
              tbody({ children, ...props }) {
                return <TableBody>{children}</TableBody>;
              },
              tr({ children, ...props }) {
                return <TableRow>{children}</TableRow>;
              },
              th({ children, ...props }) {
                return <TableHead className="font-semibold text-blue-700 border-r border-blue-200 last:border-r-0">{children}</TableHead>;
              },
              td({ children, ...props }) {
                return <TableCell className="border-r border-blue-100 last:border-r-0">{children}</TableCell>;
              },
              blockquote({ children, ...props }) {
                return (
                  <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-4 py-2 my-3 rounded-r-lg">
                    {children}
                  </blockquote>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
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

  const handleLogout = () => {
    if (process.env.NODE_ENV === 'development') {
      localStorage.removeItem('demoUser');
      window.location.reload();
    } else {
      logout();
    }
    setShowProfile(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <Button
            onClick={createNewChat}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 rounded-xl py-2.5 font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Chat Baru
          </Button>
        </div>

        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto p-2 modern-scrollbar">
          <div className="space-y-1">
            {chatSessions.map((session) => (
              <Button
                key={session.sessionId}
                variant="ghost"
                onClick={() => switchToSession(session.sessionId)}
                className={`w-full justify-start text-left p-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-all duration-200 ${
                  session.sessionId === currentSessionId ? 'bg-gray-800 border-l-2 border-blue-500' : ''
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-3" />
                <div className="truncate text-sm">
                  {session.title || `Chat ${session.sessionId.slice(0, 8)}...`}
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700">
          <Button
            onClick={() => setShowProfile(true)}
            variant="ghost"
            className="w-full justify-start p-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-all duration-200"
          >
            <UserCircle className="w-4 h-4 mr-3" />
            <div className="flex-1 text-left">
              <div className="text-sm font-medium truncate">
                {user.displayName || "Demo User"}
              </div>
            </div>
          </Button>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            onClick={() => setShowProfile(false)} 
          />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
              <span className="text-gray-400 hover:text-gray-600 text-xl">×</span>
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {user.displayName || "Demo User"}
              </h2>
              <p className="text-gray-600 mb-6 text-sm">{user.email || "demo@example.com"}</p>

              <div className="space-y-3">
                <Button
                  onClick={() => setShowProfile(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl py-3 font-medium transition-all duration-300"
                >
                  Tutup Profil
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl py-3 transition-all duration-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Keluar
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
          <div className="absolute left-0 top-0 h-full w-64 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
            {/* Mobile Sidebar Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white">Mario AI</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-300"
                >
                  <span className="text-xl">×</span>
                </Button>
              </div>
              <Button
                onClick={createNewChat}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 rounded-xl py-2.5 font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Chat Baru
              </Button>
            </div>

            {/* Mobile Chat Sessions */}
            <div className="flex-1 overflow-y-auto p-2 modern-scrollbar">
              <div className="space-y-1">
                {chatSessions.map((session) => (
                  <Button
                    key={session.sessionId}
                    variant="ghost"
                    onClick={() => switchToSession(session.sessionId)}
                    className={`w-full justify-start text-left p-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-all duration-200 ${
                      session.sessionId === currentSessionId ? 'bg-gray-800 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 mr-3" />
                    <div className="truncate text-sm">
                      {session.title || `Chat ${session.sessionId.slice(0, 8)}...`}
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Mobile Sidebar Footer */}
            <div className="p-4 border-t border-gray-700">
              <Button
                onClick={() => {
                  setShowProfile(true);
                  setShowSidebar(false);
                }}
                variant="ghost"
                className="w-full justify-start p-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-all duration-200"
              >
                <UserCircle className="w-4 h-4 mr-3" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium truncate">
                    {user.displayName || "Demo User"}
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200/50 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Mario AI</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfile(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <UserCircle className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col">
          {/* Messages Area or Welcome Screen */}
          <div className="flex-1 overflow-y-auto modern-scrollbar">
            {messages.length === 0 && !isTyping ? (
              /* Welcome Screen */
              <div className="flex flex-col items-center justify-center h-full px-4 py-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl animate-pulse">
                  <span className="text-white text-3xl font-bold">M</span>
                </div>

                <h1 className="text-4xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4 text-center">
                  Apa yang bisa saya bantu?
                </h1>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-2xl">
                  <button
                    onClick={() => insertSuggestion("Buat gambar")}
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 text-left shadow-sm hover:shadow-md"
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Image className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700 font-medium">Buat gambar</span>
                  </button>

                  <button
                    onClick={() => insertSuggestion("Dapatkan nasihat")}
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 text-left shadow-sm hover:shadow-md"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-700 font-medium">Dapatkan nasihat</span>
                  </button>

                  <button
                    onClick={() => insertSuggestion("Kejutkan saya")}
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 text-left shadow-sm hover:shadow-md"
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-gray-700 font-medium">Kejutkan saya</span>
                  </button>

                  <button
                    onClick={() => insertSuggestion("Kode")}
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 text-left shadow-sm hover:shadow-md"
                  >
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-gray-700 font-medium">Kode</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Messages */
              <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto w-full">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-4 ${
                      message.role === "user" ? "justify-end" : ""
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">M</span>
                      </div>
                    )}

                    <div className={`flex-1 ${message.role === "user" ? "flex flex-col items-end" : ""} max-w-3xl`}>
                      {message.role === "assistant" && (
                        <div className="flex items-center justify-between w-full mb-2">
                          <span className="text-sm font-medium text-gray-900">Mario AI</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(message.content)}
                            className="p-1 h-auto text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      <div
                        className={`${
                          message.role === "user"
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl px-4 py-3 max-w-md shadow-lg"
                            : "text-gray-900 w-full"
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
                      <div className="mt-1 text-xs text-gray-500 px-4">
                        <span>{formatTimestamp(message.timestamp)}</span>
                      </div>
                    </div>

                    {message.role === "user" && (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {/* AI Thinking Indicator */}
                {isTyping && (
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">M</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">Mario AI</span>
                        <span className="text-xs text-gray-500">sedang mengetik...</span>
                      </div>
                      <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-sm">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200/50 bg-white/95 backdrop-blur-lg px-4 py-4 sticky bottom-0 shadow-lg">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Tanyakan apa saja"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-hidden max-h-32 text-sm bg-white shadow-sm"
                      rows={1}
                    />

                    {/* Voice Input Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute bottom-2 right-2 p-2 h-8 w-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sendMessageMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {sendMessageMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
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
