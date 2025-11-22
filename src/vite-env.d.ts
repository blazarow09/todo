/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface Window {
  electronAPI?: {
    minimize: () => void;
    close: () => void;
    hide: () => void;
    show: () => void;
    exportData: (data: string) => Promise<{ success: boolean; error?: string; canceled?: boolean }>;
    importData: () => Promise<string | null>;
    getAlwaysOnTop: () => Promise<boolean>;
    setAlwaysOnTop: (value: boolean) => Promise<boolean>;
    getLaunchAtStartup: () => Promise<boolean>;
    setLaunchAtStartup: (value: boolean) => Promise<boolean>;
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    selectImage: () => Promise<{ success: boolean; url?: string; name?: string; error?: string; canceled?: boolean }>;
    checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
    installUpdate: () => Promise<{ success: boolean; error?: string }>;
    getUpdateStatus: () => Promise<any>;
    onUpdateStatus: (callback: (status: any) => void) => void;
    onUpdateDownloadProgress: (callback: (progress: any) => void) => void;
    removeUpdateListeners: () => void;
    scheduleNotification: (id: string, title: string, body: string, timestamp: number) => Promise<{ success: boolean; error?: string }>;
    cancelNotification: (id: string) => Promise<{ success: boolean; error?: string }>;
    cancelAllNotifications: () => Promise<{ success: boolean; error?: string }>;
  };
}



