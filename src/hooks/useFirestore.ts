import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { Todo, Folder, Attachment } from '../types';

// Firestore rejects undefined - remove from objects before write
function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}

function sanitizeAttachments(attachments: Attachment[]): Record<string, unknown>[] {
  return attachments.map((att) => removeUndefined({ id: att.id, type: att.type, url: att.url, name: att.name }));
}

export function useFirestoreTodos(userId: string | undefined) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setTodos([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', userId, 'todos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTodos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as Todo[];
      setTodos(newTodos);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching todos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const addTodo = async (todo: Omit<Todo, 'id'>) => {
    if (!userId) return;
    const data = removeUndefined({ ...todo, createdAt: serverTimestamp() } as Record<string, unknown>) as Record<string, unknown>;
    if (data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0) {
      data.attachments = sanitizeAttachments(data.attachments as Attachment[]);
    }
    await addDoc(collection(db, 'users', userId, 'todos'), data);
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    if (!userId) return;
    const sanitized = removeUndefined(updates as Record<string, unknown>) as Partial<Todo>;
    if (sanitized.attachments?.length) {
      sanitized.attachments = sanitizeAttachments(sanitized.attachments) as Attachment[];
    }
    const todoRef = doc(db, 'users', userId, 'todos', id);
    await updateDoc(todoRef, sanitized);
  };

  const deleteTodo = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, 'todos', id));
  };

  return { todos, loading, addTodo, updateTodo, deleteTodo };
}

export function useFirestoreFolders(userId: string | undefined) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setFolders([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users', userId, 'folders'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newFolders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as Folder[];
      setFolders(newFolders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching folders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const addFolder = async (folder: Omit<Folder, 'id'>) => {
    if (!userId) return;
    await addDoc(collection(db, 'users', userId, 'folders'), folder);
  };

  const updateFolder = async (id: string, updates: Partial<Folder>) => {
    if (!userId) return;
    const folderRef = doc(db, 'users', userId, 'folders', id);
    await updateDoc(folderRef, updates);
  };

  const deleteFolder = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, 'folders', id));
  };

  return { folders, loading, addFolder, updateFolder, deleteFolder };
}
