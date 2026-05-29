export type PollOption = {
  id: string;
  optionText: string;
  _count?: { votes: number };
};

export type Poll = {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  options: PollOption[];
  _count?: { votes: number };
};
