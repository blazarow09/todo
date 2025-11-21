import { useState, useCallback } from 'react';
import { Todo } from '../types';

type HistoryAction = {
  type: 'add' | 'delete' | 'update' | 'toggle' | 'reorder';
  todos: Todo[];
  timestamp: number;
};

export function useUndoRedo(initialTodos: Todo[]) {
  const [history, setHistory] = useState<HistoryAction[]>([
    { type: 'add', todos: initialTodos, timestamp: Date.now() }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const addToHistory = useCallback((todos: Todo[], actionType: HistoryAction['type']) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({
        type: actionType,
        todos: JSON.parse(JSON.stringify(todos)),
        timestamp: Date.now()
      });
      return newHistory.slice(-50); // Keep last 50 actions
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback((): Todo[] | null => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      return history[newIndex].todos;
    }
    return null;
  }, [history, historyIndex]);

  const redo = useCallback((): Todo[] | null => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      return history[newIndex].todos;
    }
    return null;
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return { addToHistory, undo, redo, canUndo, canRedo };
}

