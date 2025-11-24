import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';

// Platform detection
export const isElectron = (): boolean => !!window.electronAPI;
export const isCapacitor = (): boolean => Capacitor.isNativePlatform();
export const isWeb = (): boolean => !isElectron() && !isCapacitor();
export const isMobile = (): boolean => isCapacitor();

/**
 * Configure the status bar for mobile platforms
 * Makes it transparent with light text to blend with the app's gradient header
 */
export async function configureStatusBar(): Promise<void> {
  if (!isCapacitor()) return;
  
  try {
    // Make status bar transparent so the gradient shows through
    await StatusBar.setOverlaysWebView({ overlay: true });
    // Use light text (white icons) since our gradient is dark
    await StatusBar.setStyle({ style: Style.Dark });
    // Set background color (used as fallback on some devices)
    await StatusBar.setBackgroundColor({ color: '#667eea' });
  } catch (error) {
    console.error('Failed to configure status bar:', error);
  }
}

/**
 * Open an external URL in the appropriate browser/app
 */
export async function openExternal(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (isElectron() && window.electronAPI?.openExternal) {
      return await window.electronAPI.openExternal(url);
    } else if (isCapacitor()) {
      await Browser.open({ url });
      return { success: true };
    } else {
      // Web fallback
      window.open(url, '_blank', 'noopener,noreferrer');
      return { success: true };
    }
  } catch (error) {
    console.error('Failed to open external URL:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Export data to a file
 */
export async function exportData(data: string, filename: string = 'todos.json'): Promise<{ success: boolean; error?: string; canceled?: boolean }> {
  try {
    if (isElectron() && window.electronAPI?.exportData) {
      return await window.electronAPI.exportData(data);
    } else if (isCapacitor()) {
      // Write to cache directory first
      const result = await Filesystem.writeFile({
        path: filename,
        data: data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // Share the file
      await Share.share({
        title: 'Export Todos',
        text: 'My Tasks data export',
        url: result.uri,
        dialogTitle: 'Export your todos'
      });

      return { success: true };
    } else {
      // Web fallback - download as blob
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    }
  } catch (error) {
    console.error('Failed to export data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Import data from a file (returns the file content as string)
 */
export async function importData(): Promise<string | null> {
  try {
    if (isElectron() && window.electronAPI?.importData) {
      return new Promise((resolve) => {
        window.electronAPI!.importData().then((data) => {
          resolve(data);
        });
      });
    } else {
      // Web and Capacitor fallback - use file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve(event.target?.result as string);
            };
            reader.onerror = () => resolve(null);
            reader.readAsText(file);
          } else {
            resolve(null);
          }
        };
        input.oncancel = () => resolve(null);
        input.click();
      });
    }
  } catch (error) {
    console.error('Failed to import data:', error);
    return null;
  }
}

/**
 * Select an image file
 */
export async function selectImage(): Promise<{ success: boolean; url?: string; name?: string; error?: string; canceled?: boolean }> {
  try {
    if (isElectron() && window.electronAPI?.selectImage) {
      return await window.electronAPI.selectImage();
    } else {
      // Web and Capacitor fallback - use file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve({
                success: true,
                url: event.target?.result as string,
                name: file.name
              });
            };
            reader.onerror = () => resolve({ success: false, error: 'Failed to read file' });
            reader.readAsDataURL(file);
          } else {
            resolve({ success: false, canceled: true });
          }
        };
        input.oncancel = () => resolve({ success: false, canceled: true });
        input.click();
      });
    }
  } catch (error) {
    console.error('Failed to select image:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

