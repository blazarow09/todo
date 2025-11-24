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
  if (!window.electronAPI?.scheduleNotification) {
    // Web fallback: Use browser Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      const notificationTime = calculateNotificationTime(todo);
      if (!notificationTime) return false;
      
      const now = Date.now();
      const MIN_NOTIFICATION_DELAY = 5000;
      if (notificationTime < now + MIN_NOTIFICATION_DELAY) return false;
      
      const delay = notificationTime - now;
      setTimeout(() => {
        new Notification('Task Reminder', {
          body: todo.text.length > 100 ? todo.text.substring(0, 100) + '...' : todo.text,
          icon: '/icon.png'
        });
      }, delay);
      return true;
    }
    return false;
  }

  const notificationTime = calculateNotificationTime(todo);
  
  if (!notificationTime) {
    return false;
  }

  const now = Date.now();
  const MIN_NOTIFICATION_DELAY = 5000; // Minimum 5 seconds delay to prevent immediate notifications

  // Don't schedule notifications in the past or too soon (within 5 seconds)
  if (notificationTime < now + MIN_NOTIFICATION_DELAY) {
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
  if (!window.electronAPI?.cancelNotification) {
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
  if (!window.electronAPI?.cancelAllNotifications) {
    // Web fallback: Just schedule browser notifications
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        for (const todo of todos) {
          if (todo.done || !todo.notificationEnabled || todo.isArchived || !todo.dueDate) {
            continue;
          }
          await scheduleNotificationForTodo(todo);
        }
      }
    }
    return;
  }

  // Cancel all existing notifications first
  await window.electronAPI.cancelAllNotifications();

  // Schedule notifications for all todos with notification settings
  // Skip tasks that are done or don't have notifications enabled
  for (const todo of todos) {
    if (todo.done || !todo.notificationEnabled || todo.isArchived) {
      continue;
    }

    // Only schedule if the task has a due date
    if (!todo.dueDate) {
      continue;
    }

    await scheduleNotificationForTodo(todo);
  }
}

export function parseDueDate(dueDate: string): Date | null {
  if (!dueDate) return null;
  
  // Parse due date (format: YYYY-MM-DD or YYYY-MM-DDTHH:mm)
  const [datePart, timePart] = dueDate.split('T');
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
  const dueDateObj = new Date(year, month, day, hour, minute, 0, 0);
  
  if (isNaN(dueDateObj.getTime())) {
    return null;
  }
  
  return dueDateObj;
}

export function isOverdue(todo: Todo): boolean {
  if (!todo.dueDate || todo.done || todo.isArchived) {
    return false;
  }

  const dueDate = parseDueDate(todo.dueDate);
  if (!dueDate) {
    return false;
  }

  // Compare dates (ignore time for date-only due dates, or use full datetime)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
  // If due date has a time component, compare with current time
  // Otherwise, compare dates only (task is overdue if due date is before today)
  if (todo.dueDate.includes('T')) {
    return dueDate < now;
  } else {
    return dueDateOnly < today;
  }
}

// Get notified overdue tasks from localStorage
function getNotifiedOverdueTasks(): Set<number> {
  try {
    const stored = localStorage.getItem('overdue_notified_tasks');
    if (stored) {
      const ids = JSON.parse(stored) as number[];
      return new Set(ids);
    }
  } catch (error) {
    console.error('Failed to load notified overdue tasks:', error);
  }
  return new Set<number>();
}

// Save notified overdue tasks to localStorage
function saveNotifiedOverdueTasks(taskIds: Set<number>): void {
  try {
    localStorage.setItem('overdue_notified_tasks', JSON.stringify(Array.from(taskIds)));
  } catch (error) {
    console.error('Failed to save notified overdue tasks:', error);
  }
}

// Mark overdue tasks as notified
function markOverdueTasksAsNotified(taskIds: number[]): void {
  const notified = getNotifiedOverdueTasks();
  taskIds.forEach(id => notified.add(id));
  saveNotifiedOverdueTasks(notified);
}

export async function checkAndNotifyOverdueTasks(todos: Todo[]): Promise<void> {
  const overdueTasks = todos.filter(isOverdue);
  
  if (overdueTasks.length === 0) {
    return;
  }

  // Get tasks that haven't been notified yet
  const notifiedTasks = getNotifiedOverdueTasks();
  const newOverdueTasks = overdueTasks.filter(task => !notifiedTasks.has(task.id));
  
  if (newOverdueTasks.length === 0) {
    return; // All overdue tasks have already been notified
  }

  // Show notification for overdue tasks
  // If multiple overdue tasks, show a summary notification
  if (newOverdueTasks.length === 1) {
    const task = newOverdueTasks[0];
    const title = 'Overdue Task';
    const body = task.text.length > 100 ? task.text.substring(0, 100) + '...' : task.text;
    
    try {
      if (window.electronAPI?.scheduleNotification) {
        await window.electronAPI.scheduleNotification(
          `overdue-${task.id}`,
          title,
          body,
          Date.now() // Show immediately
        );
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' });
      }
      // Mark as notified
      markOverdueTasksAsNotified([task.id]);
    } catch (error) {
      console.error('Failed to show overdue task notification:', error);
    }
  } else {
    // Multiple overdue tasks - show summary
    const title = 'Overdue Tasks';
    const body = `You have ${newOverdueTasks.length} overdue task${newOverdueTasks.length > 1 ? 's' : ''}`;
    
    try {
      if (window.electronAPI?.scheduleNotification) {
        await window.electronAPI.scheduleNotification(
          'overdue-summary',
          title,
          body,
          Date.now() // Show immediately
        );
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' });
      }
      // Mark all as notified
      markOverdueTasksAsNotified(newOverdueTasks.map(t => t.id));
    } catch (error) {
      console.error('Failed to show overdue tasks summary notification:', error);
    }
  }
}

// Clear overdue notification tracking for a task (when it's completed, deleted, or due date changes)
export function clearOverdueNotificationTracking(todoId: number): void {
  const notified = getNotifiedOverdueTasks();
  if (notified.has(todoId)) {
    notified.delete(todoId);
    saveNotifiedOverdueTasks(notified);
  }
}

// Clear overdue notification tracking for all tasks (useful for cleanup)
export function clearAllOverdueNotificationTracking(): void {
  try {
    localStorage.removeItem('overdue_notified_tasks');
  } catch (error) {
    console.error('Failed to clear overdue notification tracking:', error);
  }
}

