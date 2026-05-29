export type Notice = {
  id: string;
  title: string;
  content: string;
  fileUrl: string | null;
  createdAt: string;
  category?: string;
  priority?: string;
  isUrgent?: boolean;
  recipients?: Array<{
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
      villa?: { villaNumber: string | null; block: string | null };
    };
  }>;
};

export type NoticeForm = {
  title: string;
  content: string;
  fileUrl: string;
  category: string;
  priority: string;
  isUrgent: boolean;
  recipientUserIds: string[];
};
