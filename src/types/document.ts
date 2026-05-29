export type Document = {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  category?: string;
  isPublic: boolean;
  createdAt: string;
};
