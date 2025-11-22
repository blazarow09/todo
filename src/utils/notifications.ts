import { Todo } from '../types';

export function calculateNotificationTime(todo: Todo): number | null {
  if (!todo.dueDate || !todo.notificationEnabled || !todo.notificationType) {
    return null;
  }

  // Parse due date (format: YYYY-MM-DD or YYYY-MM-DDTHH:mm)
  const [datePart, timePart] = todo.dueDate.split('T');
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  
  let hour = 0;
  let minute = 0;
  
  if (timePart) {
    const [hourStr, minuteStr] = timePart.split(':');
    hour = parseInt(hourStr, 10) || 0;
    minute = parseInt(minuteStr, 10) || 0;
  }

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // Month is 0-indexed
  const day = parseInt(dayStr, 10);

  // Create date object in local time
  const dueDate = new Date(year, month, day, hour, minute, 0, 0);
  const dueTimestamp = dueDate.getTime();

  if (isNaN(dueTimestamp)) {
    return null;
  }

  // Calculate notification time based on type
  if (todo.notificationType === 'at') {
    return dueTimestamp;
  }

  if (!todo.notificationDuration) {
    return null;
  }

  const durationMs = todo.notificationDuration * 60 * 1000; // Convert minutes to milliseconds

  if (todo.notificationType === 'before') {
    return dueTimestamp - durationMs;
  } else if (todo.notificationType === 'after') {
    return dueTimestamp + durationMs;
  }

  return null;
}

export async function scheduleNotificationForTodo(todo: Todo): Promise<boolean> {
  if (!window.electronAPI) {
    console.warn('Electron API not available');
    return false;
  }

  const notificationTime = calculateNotificationTime(todo);
  
  if (!notificationTime) {
    return false;
  }

  // Don't schedule notifications in the past
  if (notificationTime < Date.now()) {
    return false;
  }

  const notificationId = `todo-${todo.id}`;
  const title = 'Task Reminder';
  const body = todo.text.length > 100 ? todo.text.substring(0, 100) + '...' : todo.text;

  try {
    const result = await window.electronAPI.scheduleNotification(
      notificationId,
      title,
      body,
      notificationTime
    );
    return result.success;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return false;
  }
}

export async function cancelNotificationForTodo(todoId: number): Promise<boolean> {
  if (!window.electronAPI) {
    return false;
  }

  const notificationId = `todo-${todoId}`;
  
  try {
    const result = await window.electronAPI.cancelNotification(notificationId);
    return result.success;
  } catch (error) {
    console.error('Failed to cancel notification:', error);
    return false;
  }
}

export async function scheduleAllNotifications(todos: Todo[]): Promise<void> {
  if (!window.electronAPI) {
    return;
  }

  // Cancel all existing notifications first
  await window.electronAPI.cancelAllNotifications();

  // Schedule notifications for all todos with notification settings
  for (const todo of todos) {
    if (todo.done || !todo.notificationEnabled) {
      continue;
    }

    await scheduleNotificationForTodo(todo);
  }
}

