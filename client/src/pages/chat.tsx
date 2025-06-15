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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        {showSidebar && (
          <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
            <div className="absolute inset-0 bg-black/50 lg:hidden" onClick={() => setShowSidebar(false)} />
            <div className="relative w-80 h-full bg-white border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Chat Sessions</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSidebar(false)}
                    className="lg:hidden"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={createNewChat}
                  className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {chatSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    onClick={() => switchToSession(session.sessionId)}
                    className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                      currentSessionId === session.sessionId
                        ? "bg-blue-100 border border-blue-200"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {session.title}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimestamp(session.updatedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900">AI Chat</h1>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearMessagesMutation.mutate()}
                  disabled={clearMessagesMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProfile(!showProfile)}
                >
                  <UserCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <AIStatusIndicator />
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Ask me anything and I'll do my best to help you.
                  </p>
                  <div className="space-y-2">
                    {[
                      "Explain quantum computing",
                      "Write a Python function",
                      "Help me debug my code",
                      "Create a website layout"
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        onClick={() => insertSuggestion(suggestion)}
                        className="w-full justify-start text-left"
                      >
                        <Lightbulb className="w-4 h-4 mr-2" />
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex space-x-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-3xl rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        : "bg-white border border-gray-200 shadow-sm"
                    }`}
                  >
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <div className="space-y-2">
                        <MarkdownMessage content={message.content} />
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatTimestamp(message.createdAt)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(message.content)}
                            className="h-6 px-2"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <AIThinkingVisualizer />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="min-h-[48px] max-h-32 resize-none pr-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || sendMessageMutation.isPending}
                    size="sm"
                    className="absolute right-2 bottom-2 h-8 w-8 p-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>

        {/* Profile Dropdown */}
        {showProfile && (
          <div className="fixed top-16 right-4 z-50 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.displayName || 'User'}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
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