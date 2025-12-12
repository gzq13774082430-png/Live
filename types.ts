export enum StoryStatus {
  PROCESSING = 'PROCESSING',
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  TAKEN_DOWN = 'TAKEN_DOWN'
}

export interface Story {
  id: string;
  characterName: string;
  idea: string;
  videoUrl: string | null;
  status: StoryStatus;
  createdAt: number;
  
  // AI Generated Content
  synopsis?: string;
  openingLine?: string;
  generatedName?: string; // The name extracted from profile if distinct
}

export type StoryContextType = {
  stories: Story[];
  addStory: (story: Omit<Story, 'id' | 'createdAt' | 'status'>) => void;
  updateStory: (id: string, updates: Partial<Story>) => void;
  deleteStory: (id: string) => void;
  currentUser: { id: string; name: string } | null;
  login: () => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
};