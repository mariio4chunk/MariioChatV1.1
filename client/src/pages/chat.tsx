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
    <div className="min-h-screen gradient-bg">
      <div className="flex h-screen">{/* Chat Content */}</div>
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