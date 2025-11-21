export type Todo = {
  id: number;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  label: string;
  folderId?: string | null;
  dueDate?: string;
  notes?: string;
  createdAt: number;
};

export type Folder = {
  id: string;
  name: string;
  collapsed: boolean;
  order: number;
};

export type FilterType = 'all' | 'active' | 'completed';
export type Theme = 'light' | 'dark';

