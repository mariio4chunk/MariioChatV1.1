import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Trash2, Bot, User, Settings, LogOut, Sparkles, Zap, MessageSquare, Plus, History, Menu, Crown, UserCircle, FileText, Download, Copy, Image, Globe, Clock, Lightbulb, Folder, Mic, X, ChevronDown } from "lucide-react";
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
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
  const [showModelSelector, setShowModelSelector] = useState(false);
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

  const copyToClipboard = async (text: string, type: 'full' | 'code' = 'full') => {
    try {
      let contentToCopy = text;
      
      if (type === 'code') {
        // Extract code blocks from markdown
        const codeBlocks = text.match(/```[\s\S]*?```/g);
        if (codeBlocks) {
          contentToCopy = codeBlocks.map(block => 
            block.replace(/```(\w+)?\n?/, '').replace(/```$/, '')
          ).join('\n\n');
        } else {
          // Extract inline code
          const inlineCode = text.match(/`([^`]+)`/g);
          if (inlineCode) {
            contentToCopy = inlineCode.map(code => code.replace(/`/g, '')).join('\n');
          }
        }
      }
      
      await navigator.clipboard.writeText(contentToCopy);
      toast({
        title: "Berhasil!",
        description: type === 'code' ? "Kode berhasil disalin" : "Pesan berhasil disalin ke clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = contentToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: "Berhasil!",
          description: type === 'code' ? "Kode berhasil disalin" : "Pesan berhasil disalin ke clipboard",
        });
      } catch (fallbackError) {
        toast({
          title: "Error",
          description: "Gagal menyalin ke clipboard",
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
        model: selectedModel,
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

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Don't close if clicking inside the profile dropdown or its trigger
      if (showProfile && !target.closest('[data-profile-dropdown]') && !target.closest('[data-profile-trigger]')) {
        setShowProfile(false);
      }
      
      // Don't close if clicking inside the model selector or its trigger
      if (showModelSelector && !target.closest('[data-model-dropdown]') && !target.closest('[data-model-trigger]')) {
        setShowModelSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelSelector, showProfile]);

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
    
    // Validasi panjang pesan
    if (trimmedValue.length > 4000) {
      toast({
        title: "Pesan terlalu panjang",
        description: "Maksimal 4000 karakter per pesan",
        variant: "destructive",
      });
      return;
    }

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

  const aiModels = [
    { 
      id: "gemini-1.5-flash", 
      name: "Gemini Flash", 
      description: "Cepat & Efisien",
      details: "Model tercepat dengan respons real-time. Cocok untuk percakapan umum, Q&A, dan tugas ringan. Token limit: 1M, multimodal support.",
      strengths: ["Kecepatan tinggi", "Efisiensi cost", "Multimodal"],
      useCase: "Chat umum, Q&A cepat"
    },
    { 
      id: "gemini-1.5-pro", 
      name: "Gemini Pro", 
      description: "Analisis Mendalam",
      details: "Model premium untuk analisis kompleks dan reasoning mendalam. Token limit: 2M, advanced multimodal, coding expertise.",
      strengths: ["Analisis mendalam", "Reasoning kompleks", "Coding advanced"],
      useCase: "Analisis data, coding, research"
    },
    { 
      id: "claude-3-haiku", 
      name: "Claude Haiku", 
      description: "Kreatif & Responsif",
      details: "Model Anthropic yang unggul dalam kreativitas dan nuanced conversation. Excellent safety features dan contextual understanding.",
      strengths: ["Kreativitas tinggi", "Safety first", "Context awareness"],
      useCase: "Creative writing, ethical AI"
    },
    { 
      id: "gpt-4o-mini", 
      name: "GPT-4o Mini", 
      description: "Balanced Performance",
      details: "OpenAI model dengan keseimbangan optimal antara performa dan cost. Strong reasoning dan general intelligence.",
      strengths: ["Balance optimal", "General intelligence", "Reasoning"],
      useCase: "General purpose, balanced tasks"
    }
  ];

  const handleLogout = async () => {
    try {
      setShowProfile(false);
      if (process.env.NODE_ENV === 'development') {
        localStorage.removeItem('demoUser');
        window.location.reload();
      } else {
        await logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Gagal logout, silakan coba lagi",
        variant: "destructive",
      });
    }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden">
      <div className="flex h-screen max-h-screen">
        {/* Sidebar with improved mobile handling */}
        {showSidebar && (
          <div className="fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-auto">
            <div 
              className="absolute inset-0 bg-black/50 lg:hidden" 
              onClick={() => setShowSidebar(false)} 
            />
            <div className="relative w-80 lg:w-72 xl:w-80 h-full bg-white/95 backdrop-blur-sm border-r border-gray-200 flex flex-col shadow-lg lg:shadow-none">
              <div className="p-3 lg:p-4 border-b border-gray-200 bg-white/90">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900 text-sm lg:text-base">Chat Sessions</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSidebar(false)}
                    className="lg:hidden h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={createNewChat}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-9 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 lg:p-4 modern-scrollbar">
                {chatSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    onClick={() => switchToSession(session.sessionId)}
                    className={`p-3 rounded-lg cursor-pointer mb-2 transition-all duration-200 ${
                      currentSessionId === session.sessionId
                        ? "bg-blue-100 border border-blue-200 shadow-sm"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {session.title}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      {formatTimestamp(session.updatedAt)}
                    </p>
                  </div>
                ))}
                {chatSessions.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Belum ada chat session</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area with optimized layout */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with better responsive design */}
          <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 p-3 lg:p-4 sticky top-0 z-40">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 lg:space-x-3 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="h-8 w-8 p-0 lg:h-9 lg:w-9"
                >
                  <Menu className="w-4 h-4 lg:w-5 lg:h-5" />
                </Button>
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-7 h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                  </div>
                  <h1 className="text-lg lg:text-xl font-semibold text-gray-900 truncate">AI Chat</h1>
                </div>
              </div>
              <div className="flex items-center space-x-1 lg:space-x-2">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    className="text-xs h-8 px-2 lg:px-3 hidden sm:flex"
                    data-model-trigger
                  >
                    <Bot className="w-3 h-3 mr-1" />
                    <span className="hidden md:inline">
                      {aiModels.find(m => m.id === selectedModel)?.name}
                    </span>
                    <span className="md:hidden">
                      {aiModels.find(m => m.id === selectedModel)?.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                  {showModelSelector && (
                    <div className="absolute top-10 right-0 z-50 w-72 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-2 max-h-80 lg:max-h-96 overflow-y-auto modern-scrollbar" data-model-dropdown>
                      {aiModels.map((model) => (
                        <div
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model.id);
                            setShowModelSelector(false);
                          }}
                          className={`p-3 lg:p-4 rounded-lg cursor-pointer mb-2 transition-all duration-200 border ${
                            selectedModel === model.id
                              ? "bg-blue-50 border-blue-200 shadow-sm"
                              : "hover:bg-gray-50 border-transparent"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm">{model.name}</div>
                            {selectedModel === model.id && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mb-2">{model.description}</div>
                          <div className="text-xs text-gray-500 mb-2 line-clamp-2">{model.details}</div>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {model.strengths.slice(0, 2).map((strength, idx) => (
                              <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {strength}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs text-gray-400">
                            <strong>Best for:</strong> {model.useCase}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearMessagesMutation.mutate()}
                  disabled={clearMessagesMutation.isPending}
                  className="h-8 w-8 p-0 lg:h-9 lg:w-9"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProfile(!showProfile)}
                  data-profile-trigger
                  className="h-8 w-8 p-0 lg:h-9 lg:w-9"
                >
                  <UserCircle className="w-4 h-4 lg:w-5 lg:h-5" />
                </Button>
              </div>
            </div>
            <AIStatusIndicator />
          </div>

          {/* Messages Area with optimized layout */}
          <div className="flex-1 overflow-y-auto px-3 py-4 lg:px-6 lg:py-6 space-y-4 modern-scrollbar">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)]">
                <div className="text-center max-w-sm lg:max-w-md px-4">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">
                    Mulai Percakapan
                  </h3>
                  <p className="text-gray-600 text-sm lg:text-base mb-6">
                    Tanyakan apa saja dan saya akan membantu Anda sebaik mungkin.
                  </p>
                  <div className="grid grid-cols-1 gap-2 lg:gap-3">
                    {[
                      "Jelaskan quantum computing",
                      "Buatkan fungsi Python",
                      "Bantu debug kode saya",
                      "Buat layout website"
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        onClick={() => insertSuggestion(suggestion)}
                        className="w-full justify-start text-left h-auto py-3 px-4 text-sm"
                      >
                        <Lightbulb className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{suggestion}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex space-x-2 lg:space-x-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-7 h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] lg:max-w-3xl rounded-2xl px-3 py-2 lg:px-4 lg:py-3 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                          : "bg-white border border-gray-200 shadow-sm"
                      }`}
                    >
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap text-sm lg:text-base">{message.content}</p>
                      ) : (
                        <div className="space-y-2">
                          <MarkdownMessage content={message.content} />
                          <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimestamp(message.createdAt)}</span>
                              <span className="text-blue-600 font-medium">
                                {aiModels.find(m => m.id === selectedModel)?.name}
                              </span>
                            </div>
                            <div className="flex space-x-1">
                              {message.content.includes('```') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(message.content, 'code')}
                                  className="h-6 px-2 hover:bg-gray-100"
                                  title="Salin kode saja"
                                >
                                  <FileText className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(message.content, 'full')}
                                className="h-6 px-2 hover:bg-gray-100"
                                title="Salin seluruh pesan"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="w-7 h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex space-x-2 lg:space-x-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Bot className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2 lg:px-4 lg:py-3 shadow-sm">
                      <AIThinkingVisualizer />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area with better mobile optimization */}
          <div className="border-t border-gray-200 bg-white/95 backdrop-blur-sm p-3 lg:p-4 mobile-safe-area">
            <div className="max-w-4xl mx-auto">
              {/* Model selector for mobile */}
              <div className="sm:hidden mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="text-xs h-8 w-full"
                  data-model-trigger
                >
                  <Bot className="w-3 h-3 mr-2" />
                  {aiModels.find(m => m.id === selectedModel)?.name}
                  <ChevronDown className="w-3 h-3 ml-auto" />
                </Button>
              </div>

              <div className="flex space-x-2 lg:space-x-3">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ketik pesan Anda..."
                    className="min-h-[44px] lg:min-h-[48px] max-h-32 resize-none pr-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm lg:text-base mobile-input"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || sendMessageMutation.isPending}
                    size="sm"
                    className="absolute right-2 bottom-2 h-7 w-7 lg:h-8 lg:w-8 p-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 touch-manipulation"
                  >
                    <Send className="w-3 h-3 lg:w-4 lg:h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  Enter kirim, Shift+Enter baris baru
                </p>
                <div className="text-xs text-gray-400">
                  {inputValue.length}/4000
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Dropdown with improved design */}
        {showProfile && (
          <div className="fixed top-14 lg:top-16 right-2 lg:right-4 z-50 w-72 lg:w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden" data-profile-dropdown>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white truncate">{user.displayName || 'User'}</p>
                  <p className="text-blue-100 text-sm truncate">{user.email}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Model Aktif:</div>
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    {aiModels.find(m => m.id === selectedModel)?.name}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {aiModels.find(m => m.id === selectedModel)?.description}
                </div>
              </div>

              <div className="border-t pt-3">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <FloatingParticles />
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