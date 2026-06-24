import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useState, useCallback } from "react";

export interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  full_name?: string;
  avatar_url?: string;
}

export const useChat = () => {
  const [loading, setLoading] = useState(false);

  const fetchMessages = async (jobId: string) => {
    const { data, error } = await (supabase as any)
      .from('messages')
      .select(`
        *,
        profiles!sender_id (
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      ...msg,
      full_name: msg.profiles?.full_name,
      avatar_url: msg.profiles?.avatar_url
    }));
  };

  const sendMessage = async (jobId: string, senderId: string, content: string) => {
    if (!content.trim()) return;

    const { error } = await (supabase as any)
      .from('messages')
      .insert({
        job_id: jobId,
        sender_id: senderId,
        content: content.trim(),
        is_read: false
      });

    if (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      return false;
    }

    return true;
  };

  const markAsRead = async (jobId: string, currentUserId: string) => {
    const { error } = await (supabase as any)
      .from('messages')
      .update({ is_read: true })
      .eq('job_id', jobId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false);

    if (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const subscribeToJob = (jobId: string, onNewMessage: (payload: any) => void) => {
    const channel = supabase
      .channel(`chat-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`,
        },
        async (payload) => {
          // Fetch sender profile for the new message
          const { data, error } = await (supabase as any)
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .limit(1);
            
          const profileData = data?.[0] as any;
          const enrichedMessage = {
            ...payload.new,
            full_name: profileData?.full_name || 'User',
            avatar_url: profileData?.avatar_url
          };
          
          onNewMessage(enrichedMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getUnreadCount = async (userId: string) => {
    // This is a complex query. We need messages that are unread AND not sent by user
    // AND belong to jobs where user is poster or worker.
    
    // First get jobs user is part of
    const { data: myJobs, error: jobError } = await (supabase as any)
      .from('jobs')
      .select('id')
      .or(`poster_id.eq.${userId},worker_id.eq.${userId}`);
      
    if (jobError || !myJobs) return 0;
    
    const jobIds = myJobs.map((j: any) => j.id);
    if (jobIds.length === 0) return 0;

    const { count, error } = await (supabase as any)
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('job_id', jobIds)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }

    return count || 0;
  };

  const subscribeToAllMessages = (onAnyMessage: () => void) => {
    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          onAnyMessage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    loading,
    fetchMessages,
    sendMessage,
    markAsRead,
    subscribeToJob,
    subscribeToAllMessages,
    getUnreadCount
  };
};
