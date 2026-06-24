export interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline: string;
  postedBy: {
    name: string;
    avatar: string;
    rating: number;
    campus?: string;
  };
  bidsCount: number;
  status: "open" | "in_progress" | "completed" | "payment_pending" | "deleted";
  createdAt: string;
  skills: string[];
  
  // New Features
  paymentType?: "money" | "skill";
  skillExchangeDetails?: string;
  isQuickTask?: boolean;
  campusOnly?: boolean;
  campusName?: string;
  isUrgent?: boolean;
  urgentTime?: string;
  isTeamTask?: boolean;
  teamRoles?: string[];
  isMentoring?: boolean;
  rescueMode?: boolean;

  // File attachments (hidden from other users until payment)
  attachedFiles?: AttachedFile[];
  // Accepted bidder info
  acceptedBidderId?: string;
  acceptedBidderName?: string;
  // Payment deadline timestamp (2 min from acceptance)
  paymentDeadline?: number;
  // Whether files are unlocked for accepted bidder
  filesUnlocked?: boolean;
  // Submitted work file
  submittedWork?: AttachedFile;
  // Specific task instructions (locked until payment)
  instructions?: string;
  
  // Database compatibility fields
  poster_id?: string;
  worker_id?: string;
  payment_due_at?: string;
  accepted_bid_id?: string;
  
  // Snake case equivalents for legacy/realtime compatibility
  is_urgent?: boolean;
  is_quick_task?: boolean;
  campus_only?: boolean;
  is_mentoring?: boolean;
  is_team_task?: boolean;
}

export interface AttachedFile {
  name: string;
  size: number;
  type: string;
  // Base64 data URL for demo (in production this would be a server URL)
  dataUrl: string;
}

export interface Bid {
  id: string;
  jobId: string;
  bidder: {
    name: string;
    avatar: string;
    rating: number;
    completedJobs: number;
    campus?: string;
    skillScores?: Record<string, number>;
  };
  amount: number;
  message: string;
  deliveryDays: number;
  createdAt: string;
}

export const categories = [
  { name: "Poster Design", icon: "🎨" },
  { name: "Coding Help", icon: "💻" },
  { name: "Assignment Help", icon: "📝" },
  { name: "Video Editing", icon: "🎬" },
  { name: "Writing", icon: "✍️" },
  { name: "Tutoring", icon: "📚" },
  { name: "Data Entry", icon: "📊" },
  { name: "Social Media", icon: "📱" },
  { name: "Presentation", icon: "📑" },
];

export const mockJobs: Job[] = [];

export const mockBids: Bid[] = [];
