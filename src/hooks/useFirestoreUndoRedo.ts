import { useState, useCallback } from 'react';
import { Todo } from '../types';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

type ActionType = 'add' | 'delete' | 'update' | 'toggle';

interface HistoryItem {
  type: ActionType;
  collection: 'todos' | 'folders';
  docId: string;
  data?: any; // Previous data for updates/deletes
  inverseData?: any; // Data needed to reverse the action
  timestamp: number;
}

export function useFirestoreUndoRedo(userId: string | undefined) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);

  // Helper to track an action
  const trackAction = useCallback((
    type: ActionType, 
    collectionName: 'todos' | 'folders', 
    docId: string, 
    previousData?: any
  ) => {
    const newItem: HistoryItem = {
      type,
      collection: collectionName,
      docId,
      data: previousData,
      timestamp: Date.now()
    };
    
    setHistory(prev => [...prev.slice(-49), newItem]); // Keep last 50
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  const undo = useCallback(async () => {
    if (history.length === 0 || !userId) return;

    const action = history[history.length - 1];
    const collectionRef = collection(db, 'users', userId, action.collection);
    const docRef = doc(db, 'users', userId, action.collection, action.docId);

    try {
      switch (action.type) {
        case 'add':
          // Inverse of add is delete
          await deleteDoc(docRef);
          break;
        case 'delete':
          // Inverse of delete is add back (restore)
          if (action.data) {
            await setDoc(docRef, action.data);
          }
          break;
        case 'update':
        case 'toggle':
          // Inverse of update is update with previous data
          if (action.data) {
            await setDoc(docRef, action.data, { merge: true });
          }
          break;
      }

      // Move to redo stack
      setRedoStack(prev => [action, ...prev]);
      setHistory(prev => prev.slice(0, -1));

    } catch (error) {
      console.error("Undo failed:", error);
    }
  }, [history, userId]);

  const redo = useCallback(async () => {
    if (redoStack.length === 0 || !userId) return;

    const action = redoStack[0];
    const docRef = doc(db, 'users', userId, action.collection, action.docId);

    try {
      // Re-apply the original action
      switch (action.type) {
        case 'add':
          // Re-add the document? We might need the data if we deleted it in undo
          // This is tricky if we don't store the "new" data in the history item too.
          // For now, let's assume 'data' contains what we need or we need to store 'newData'
          console.warn("Redo 'add' not fully implemented without storing new data");
          break;
        case 'delete':
          await deleteDoc(docRef);
          break;
        // ... implement other cases
      }

      // Move back to history
      setHistory(prev => [...prev, action]);
      setRedoStack(prev => prev.slice(1));

    } catch (error) {
       console.error("Redo failed:", error);
    }
  }, [redoStack, userId]);

  return { trackAction, undo, redo, canUndo: history.length > 0, canRedo: redoStack.length > 0 };
}

