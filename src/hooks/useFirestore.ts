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
import { Todo, Folder } from '../types';

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
    // Remove undefined values - Firestore doesn't accept them
    const cleanedTodo = Object.fromEntries(
      Object.entries(todo).filter(([_, value]) => value !== undefined)
    );
    await addDoc(collection(db, 'users', userId, 'todos'), {
      ...cleanedTodo,
      createdAt: serverTimestamp()
    });
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    if (!userId) return;
    // Remove undefined values - Firestore doesn't accept them
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    const todoRef = doc(db, 'users', userId, 'todos', id);
    await updateDoc(todoRef, cleanedUpdates);
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
