import React, { useState, useEffect, useRef } from "react";
import { useChat, Message } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SendHorizontal, Check, CheckCheck, User, PlusCircle } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ChatWindowProps {
  jobId: string;
  jobTitle: string;
  currentUserId: string;
  otherUser: {
    full_name: string;
    avatar_url?: string;
  };
}

const ChatWindow: React.FC<ChatWindowProps> = ({ jobId, jobTitle, currentUserId, otherUser }) => {
  const { fetchMessages, sendMessage, markAsRead, subscribeToJob } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    setLoading(true);
    const data = await fetchMessages(jobId);
    setMessages(data);
    setLoading(false);
    markAsRead(jobId, currentUserId);
    setTimeout(scrollToBottom, 100);
  };

  useEffect(() => {
    loadMessages();

    const unsubscribe = subscribeToJob(jobId, (newMessage) => {
      setMessages(prev => {
        // Prevent duplicate messages if Realtime and Manual insert overlap
        if (prev.find(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      
      if (newMessage.sender_id !== currentUserId) {
        markAsRead(jobId, currentUserId);
      }
      
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [jobId]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || input.length > 500) return;

    const content = input.trim();
    setInput(""); // Clear input early for better UX
    
    const success = await sendMessage(jobId, currentUserId, content);
    if (!success) {
      setInput(content); // Restore if failed
    }
  };

  const formatMessageDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "dd MMM yyyy");
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach(msg => {
      const date = formatMessageDate(msg.created_at);
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const groupedMessages = groupMessagesByDate();

  return (
    <Card className="flex flex-col h-[600px] shadow-card border-none overflow-hidden bg-card">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3 bg-muted/20">
        <div className="relative">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary overflow-hidden">
                {otherUser.avatar_url ? (
                    <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    otherUser.full_name?.charAt(0) || "U"
                )}
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight">{otherUser.full_name}</p>
          <p className="text-[10px] text-muted-foreground truncate italic">{jobTitle}</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-primary/10 transition-all">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <PlusCircle className="h-8 w-8 opacity-20" />
            <p className="text-sm font-medium">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          Object.keys(groupedMessages).map(date => (
            <div key={date} className="space-y-4">
              <div className="flex justify-center">
                <span className="px-2 py-1 rounded bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {date}
                </span>
              </div>
              {groupedMessages[date].map((msg) => {
                const isOwn = msg.sender_id === currentUserId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: isOwn ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}
                  >
                    {!isOwn && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-[10px] text-primary self-end shrink-0 overflow-hidden">
                        {msg.avatar_url ? (
                            <img src={msg.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            msg.full_name?.charAt(0) || "U"
                        )}
                      </div>
                    )}
                    <div className="max-w-[80%] space-y-1">
                      <div
                        className={`p-3 rounded-2xl text-sm shadow-sm ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-muted text-foreground rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className={`flex items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[9px] text-muted-foreground font-medium">
                          {format(new Date(msg.created_at), "HH:mm")}
                        </span>
                        {isOwn && (
                          msg.is_read ? (
                            <CheckCheck className="h-3 w-3 text-primary" />
                          ) : (
                            <Check className="h-3 w-3 text-muted-foreground" />
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-muted/10">
        <form onSubmit={handleSend} className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
            placeholder="Type a message..."
            className="pr-12 py-6 rounded-xl border-muted-foreground/20 focus-visible:ring-primary shadow-inner"
            maxLength={500}
            disabled={loading}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className={`text-[9px] font-bold ${input.length > 450 ? 'text-amber-500' : 'text-muted-foreground/50'}`}>
                {input.length}/500
            </span>
            <Button
              type="submit"
              size="icon"
              variant="hero"
              disabled={!input.trim() || loading}
              className="h-8 w-8 rounded-full"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

export default ChatWindow;
