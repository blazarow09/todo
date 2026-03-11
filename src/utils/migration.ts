import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Todo, Folder, Attachment } from '../types';

// Helper function to remove undefined values from an object
// Firestore doesn't accept undefined values
function removeUndefinedFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Sanitize attachments - Firestore rejects undefined in nested array objects
function sanitizeAttachments(attachments: Attachment[]): Record<string, unknown>[] {
  return attachments.map((att) => removeUndefinedFields({ id: att.id, type: att.type, url: att.url, name: att.name }));
}

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
      const cleanedFolderData = removeUndefinedFields(folderData);
      const docRef = await addDoc(collection(db, 'users', userId, 'folders'), {
        ...cleanedFolderData,
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
      
      // Clean undefined fields before sending to Firestore
      const cleanedTodoData = removeUndefinedFields(todoData) as Record<string, unknown>;
      if (cleanedTodoData.attachments && Array.isArray(cleanedTodoData.attachments) && cleanedTodoData.attachments.length > 0) {
        cleanedTodoData.attachments = sanitizeAttachments(cleanedTodoData.attachments as Attachment[]);
      }
      await addDoc(collection(db, 'users', userId, 'todos'), {
        ...cleanedTodoData,
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

