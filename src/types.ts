export type Todo = {
  id: number;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  label: string;
  folderId?: string | null;
  dueDate?: string;
  notes?: string;
  attachments?: Attachment[];
  checklist?: ChecklistItem[];
  checklistCollapsed?: boolean;
  isArchived?: boolean;
  createdAt: number;
  order?: number; // Order within folder for drag-and-drop
  notificationEnabled?: boolean;
  notificationType?: 'before' | 'after' | 'at';
  notificationDuration?: number; // in minutes
};

export type Attachment = {
  id: string;
  type: 'image';
  url: string;
  name?: string;
};

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type Folder = {
  id: string;
  name: string;
  collapsed: boolean;
  order: number;
};

export type FilterType = 'all' | 'active' | 'completed';
export type Theme = 'light' | 'dark';

