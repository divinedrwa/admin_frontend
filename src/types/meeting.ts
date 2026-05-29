export type Meeting = {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledAt: string;
  endedAt: string | null;
  location: string | null;
  agenda: string | null;
  minutes: string | null;
  attendeeCount: number | null;
  documentUrl: string | null;
  createdBy: { id: string; name: string };
};
