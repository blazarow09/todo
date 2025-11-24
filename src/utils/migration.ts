import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Todo, Folder } from '../types';

export async function migrateLocalDataToFirebase(
  localTodos: Todo[], 
  localFolders: Folder[], 
  userId: string
): Promise<void> {
  if (!userId) return;

  console.log("Starting migration for user:", userId);

  try {
    // Migrate Folders
    const folderIdMap: Record<string, string> = {};
    
    for (const folder of localFolders) {
      const { id: oldId, ...folderData } = folder;
      const docRef = await addDoc(collection(db, 'users', userId, 'folders'), {
        ...folderData,
        // preserve the original ID if needed, but Firestore generates new ones
        originalId: oldId 
      });
      folderIdMap[oldId] = docRef.id;
    }

    console.log("Folders migrated. Map:", folderIdMap);

    // Migrate Todos
    for (const todo of localTodos) {
      const { id: oldId, folderId: oldFolderId, ...todoData } = todo;
      
      // Map old folder ID to new Firestore ID
      const newFolderId = oldFolderId ? folderIdMap[oldFolderId] : null;

      await addDoc(collection(db, 'users', userId, 'todos'), {
        ...todoData,
        folderId: newFolderId,
        originalId: oldId,
        migratedAt: serverTimestamp()
      });
    }

    console.log("Todos migrated successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

