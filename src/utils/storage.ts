import { Todo } from '../types';

export function exportTodos(todos: Todo[]): string {
  return JSON.stringify({
    version: '1.0',
    exportDate: new Date().toISOString(),
    todos
  }, null, 2);
}

export function importTodos(jsonString: string): Todo[] | null {
  try {
    const data = JSON.parse(jsonString);
    if (data.todos && Array.isArray(data.todos)) {
      // Validate todos structure
      return data.todos.filter((todo: any) => 
        todo.id && 
        typeof todo.text === 'string' && 
        typeof todo.done === 'boolean'
      );
    }
    return null;
  } catch (e) {
    return null;
  }
}

