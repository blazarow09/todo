const { app, BrowserWindow, screen, ipcMain, Tray, Menu, dialog, shell, Notification } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let splashWindow = null;
let tray = null;

// Configure auto-updater for installed builds
autoUpdater.autoDownload = false; // Don't auto-download, let user choose
autoUpdater.autoInstallOnAppQuit = true; // Auto-install on app quit after download

// Enable logging for debugging (optional - use console if electron-log not available)
try {
  const electronLog = require("electron-log");
  autoUpdater.logger = electronLog;
  autoUpdater.logger.transports.file.level = "info";
  autoUpdater.logger.transports.console.level = "debug";
  console.log("electron-log enabled for auto-updater");
} catch (e) {
  // electron-log not installed, use console.log
  console.log("electron-log not available, using console.log for updates");
  autoUpdater.logger = {
    info: (...args) => console.log("[UPDATE]", ...args),
    warn: (...args) => console.warn("[UPDATE]", ...args),
    error: (...args) => console.error("[UPDATE]", ...args),
    debug: (...args) => console.log("[UPDATE DEBUG]", ...args)
  };
}

// Update status tracking
let updateStatus = {
  available: false,
  downloaded: false,
  checking: false,
  error: null,
  info: null
};

// Log current app version and configuration
console.log("=== Auto-Update Configuration ===");
console.log("App version:", app.getVersion());
console.log("App is packaged:", app.isPackaged);
console.log("Auto-download:", autoUpdater.autoDownload);
console.log("Auto-install on quit:", autoUpdater.autoInstallOnAppQuit);

// Set update server URL explicitly (electron-updater should auto-detect from package.json)
// But let's verify it's configured correctly
if (app.isPackaged) {
  try {
    const pkg = require(path.join(__dirname, "../package.json"));
    const publishConfig = pkg.build?.publish;
    if (publishConfig) {
      console.log("Publish configuration:", JSON.stringify(publishConfig, null, 2));
      if (publishConfig.provider === "github") {
        const feedUrl = `https://github.com/${publishConfig.owner}/${publishConfig.repo}/releases/latest`;
        console.log("GitHub feed URL:", feedUrl);
      }
    } else {
      console.warn("WARNING: No publish configuration found in package.json!");
    }
  } catch (e) {
    console.error("Failed to read package.json:", e);
  }
}

// Window state file path
const getWindowStatePath = () => {
  return path.join(app.getPath('userData'), 'window-state.json');
};

// Settings file path
const getSettingsPath = () => {
  return path.join(app.getPath('userData'), 'settings.json');
};

// Todos file path
const getTodosPath = () => {
  return path.join(app.getPath('userData'), 'todos.json');
};

// Folders file path
const getFoldersPath = () => {
  return path.join(app.getPath('userData'), 'folders.json');
};

// Load settings (async for better performance)
const loadSettings = async () => {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = await fs.promises.readFile(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return {};
};

// Save settings
const saveSettings = (settings) => {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

// Load todos from file
const loadTodos = async () => {
  try {
    const todosPath = getTodosPath();
    if (fs.existsSync(todosPath)) {
      const data = await fs.promises.readFile(todosPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load todos:', error);
  }
  return null;
};

// Save todos to file
const saveTodos = (todos) => {
  try {
    const todosPath = getTodosPath();
    fs.writeFileSync(todosPath, JSON.stringify(todos, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save todos:', error);
  }
};

// Load folders from file
const loadFolders = async () => {
  try {
    const foldersPath = getFoldersPath();
    if (fs.existsSync(foldersPath)) {
      const data = await fs.promises.readFile(foldersPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load folders:', error);
  }
  return null;
};

// Save folders to file
const saveFolders = (folders) => {
  try {
    const foldersPath = getFoldersPath();
    fs.writeFileSync(foldersPath, JSON.stringify(folders, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save folders:', error);
  }
};

// Load window state (async for better performance)
const loadWindowState = async () => {
  try {
    const statePath = getWindowStatePath();
    if (fs.existsSync(statePath)) {
      const data = await fs.promises.readFile(statePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load window state:', error);
  }
  return null;
};

// Save window state
const saveWindowState = (bounds) => {
  try {
    const statePath = getWindowStatePath();
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
    fs.writeFileSync(statePath, JSON.stringify(state), 'utf8');
  } catch (error) {
    console.error('Failed to save window state:', error);
  }
};

const createSplashWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Center splash screen on primary display
  const splashWidth = 400;
  const splashHeight = 500;
  const splashX = primaryDisplay.workArea.x + (primaryDisplay.workArea.width - splashWidth) / 2;
  const splashY = primaryDisplay.workArea.y + (primaryDisplay.workArea.height - splashHeight) / 2;
  
  splashWindow = new BrowserWindow({
    width: splashWidth,
    height: splashHeight,
    x: Math.round(splashX),
    y: Math.round(splashY),
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: true, // Show immediately
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
    backgroundColor: '#0a0e1a',
  });
  
  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.setMenuBarVisibility(false);
};

const createWindow = async () => {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Load window state (async)
  const savedState = await loadWindowState();
  
  // Helper function to check if a point is within a display's bounds
  const isPointInDisplay = (x, y, display) => {
    const bounds = display.bounds;
    return x >= bounds.x && 
           x < bounds.x + bounds.width && 
           y >= bounds.y && 
           y < bounds.y + bounds.height;
  };
  
  // Helper function to find which display contains a point
  const findDisplayForPoint = (x, y) => {
    return displays.find(display => isPointInDisplay(x, y, display));
  };
  
  // Default window bounds (on primary display)
  const defaultBounds = {
    width: 570,
    height: 700,
    x: primaryDisplay.workArea.x + primaryDisplay.workArea.width - 590,
    y: primaryDisplay.workArea.y + 20,
  };
  
  let bounds;
  
  if (savedState && savedState.x !== undefined && savedState.y !== undefined) {
    // Check if saved position is on any available display
    const savedDisplay = findDisplayForPoint(savedState.x, savedState.y);
    
    if (savedDisplay) {
      // Saved position is valid, use it
      const displayBounds = savedDisplay.bounds;
      const workArea = savedDisplay.workArea;
      
      bounds = {
        width: Math.max(570, Math.min(savedState.width || defaultBounds.width, workArea.width)),
        height: Math.max(700, Math.min(savedState.height || defaultBounds.height, workArea.height)),
        x: Math.max(workArea.x, Math.min(savedState.x, workArea.x + workArea.width - 570)),
        y: Math.max(workArea.y, Math.min(savedState.y, workArea.y + workArea.height - 700)),
      };
    } else {
      // Saved position is not on any available display, use default on primary
      bounds = defaultBounds;
    }
  } else {
    // No saved state, use defaults
    bounds = defaultBounds;
  }
  
  // Load always-on-top preference from localStorage equivalent
  // Default to true if not set
  const alwaysOnTop = true; // Will be updated via IPC if needed
  
  const windowIcon = path.join(__dirname, "assets", "tasks-icon.ico");

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 570,
    minHeight: 700,
    resizable: true,
    frame: false,
    alwaysOnTop: alwaysOnTop,
    show: false, // Don't show until ready
    icon: fs.existsSync(windowIcon) ? windowIcon : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Don't throttle animations/timers when in background
    },
    backgroundColor: '#1a1a2e', // Match splash screen to prevent flash
  });

    // Force always on top level for Windows to ensure it stays on top
    if (alwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, "screen-saver");
    }

    // Load the app
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  
  // Show splash screen if it exists
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.show();
  }
  
  // Once main window is ready, hide splash and show main window
  const showMainWindow = () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  };
  
  mainWindow.once("ready-to-show", showMainWindow);
  
  // Also handle failed loads - still show main window
  mainWindow.webContents.once("did-fail-load", () => {
    console.error("Failed to load main window");
    showMainWindow();
  });
  
  // Start loading immediately, don't wait
  if (isDev) {
    mainWindow.loadURL("http://localhost:1420");
    mainWindow.webContents.openDevTools();
  } else {
    // Use loadFile which is faster than loadURL for local files
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Add keyboard shortcut to toggle DevTools (F12 or Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Save window state on move/resize
  let saveStateTimeout;
  const debouncedSaveState = () => {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const bounds = mainWindow.getBounds();
        saveWindowState(bounds);
      }
    }, 500); // Debounce to avoid too many file writes
  };

  mainWindow.on('move', debouncedSaveState);
  mainWindow.on('resize', debouncedSaveState);

  // Don't close on X, hide instead
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      // Save state before hiding
      if (mainWindow && !mainWindow.isDestroyed()) {
        const bounds = mainWindow.getBounds();
        saveWindowState(bounds);
      }
      mainWindow.hide();
    } else {
      // Save state before quitting
      if (mainWindow && !mainWindow.isDestroyed()) {
        const bounds = mainWindow.getBounds();
        saveWindowState(bounds);
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Re-apply always on top setting to ensure it stays on top
  // especially after restoring from minimize or showing
  mainWindow.on('show', () => {
    if (mainWindow && mainWindow.isAlwaysOnTop()) {
      mainWindow.setAlwaysOnTop(true, "screen-saver");
    }
  });

  mainWindow.on('restore', () => {
    if (mainWindow && mainWindow.isAlwaysOnTop()) {
      mainWindow.setAlwaysOnTop(true, "screen-saver");
    }
  });

  // Create system tray
  createTray();
};

const createTray = () => {
  // Reuse the main application icon for the tray
  let iconPath = path.join(__dirname, "assets", "tasks-icon.ico");
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, "../assets/tasks-icon.ico");
  }

  try {
    if (iconPath && fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);
    } else {
      const { nativeImage } = require("electron");
      const fallbackIcon = nativeImage.createEmpty();
      tray = new Tray(fallbackIcon);
    }
  } catch (error) {
    console.error("Failed to create tray with custom icon, falling back:", error);
    try {
      const { nativeImage } = require("electron");
      const fallbackIcon = nativeImage.createEmpty();
      tray = new Tray(fallbackIcon);
    } catch (e) {
      console.error("Failed to create tray:", e);
      return;
    }
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show My Todo",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Hide",
      click: () => {
        if (mainWindow) mainWindow.hide();
      },
    },
    { type: "separator" },
    {
      label: "Open Developer Tools",
      click: () => {
        if (mainWindow) {
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }
          mainWindow.focus();
          if (mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
          } else {
            mainWindow.webContents.openDevTools();
          }
        }
      },
    },
    {
      label: "Check for updates...",
      click: async () => {
        // TEST: Show immediate dialog to verify click handler works
        try {
          await dialog.showMessageBox(mainWindow || undefined, {
            type: "info",
            title: "Update Check Started",
            message: "Checking for updates...",
            detail: `Click handler works!\n\nApp is packaged: ${app.isPackaged}\nCurrent version: ${app.getVersion()}`,
            buttons: ["OK"],
          });
        } catch (e) {
          console.error("Dialog failed:", e);
        }
        
        // Show window first so user can see feedback
        if (mainWindow) {
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }
          mainWindow.focus();
        }
        
        // Always show immediate feedback
        console.log("=== Update Check Clicked ===");
        console.log("App is packaged:", app.isPackaged);
        console.log("Current version:", app.getVersion());
        
        if (app.isPackaged) {
          try {
            // Show immediate feedback dialog (await it to ensure it shows)
            console.log("Showing checking dialog...");
            await dialog.showMessageBox(mainWindow || undefined, {
              type: "info",
              title: "Checking for Updates",
              message: "Checking for updates...",
              detail: `Current version: ${app.getVersion()}\n\nPlease wait while we check GitHub for updates.`,
              buttons: ["OK"],
            });
          
            console.log("Checking for updates from tray menu...");
            updateStatus.checking = true;
            updateStatus.error = null;
            
            // Send initial status to renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("update-status", { ...updateStatus });
            }
            
            // Perform the check
            const result = await autoUpdater.checkForUpdates();
            console.log("Update check initiated successfully");
            console.log("Check result:", result);
            
            // The update events will handle showing results
          } catch (error) {
            updateStatus.checking = false;
            updateStatus.error = error.message;
            console.error("Failed to check for updates:", error);
            console.error("Error stack:", error.stack);
            console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
            
            // Send error status to renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("update-status", { ...updateStatus });
            }
            
            // Show error dialog
            dialog.showErrorBox(
              "Update Check Failed",
              `Failed to check for updates:\n\n${error.message}\n\nPlease check:\n- Internet connection\n- GitHub repository configuration\n- Version format in package.json`
            );
          }
        } else {
          // Development mode - show info dialog, don't check for updates
          dialog.showMessageBox(mainWindow || undefined, {
            type: "info",
            title: "Check for Updates",
            message: "Updates are only available in the released version.",
            detail: "This feature works when the app is built and distributed via GitHub Releases.\n\nCurrent mode: Development",
            buttons: ["OK"],
          });
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("My Todo");
  tray.setContextMenu(contextMenu);
  
  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
};

// Window control handlers
ipcMain.on("window-minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window-close", () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on("window-hide", () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on("window-show", () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// Export/Import handlers
ipcMain.handle("export-data", async (event, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Export Todos",
    defaultPath: "todos.json",
    filters: [
      { name: "JSON Files", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (!canceled && filePath) {
    try {
      fs.writeFileSync(filePath, data, "utf8");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle("import-data", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Import Todos",
    filters: [
      { name: "JSON Files", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const data = fs.readFileSync(filePaths[0], "utf8");
      return data;
    } catch (error) {
      return null;
    }
  }
  return null;
});

// Always-on-top handlers
ipcMain.handle("get-always-on-top", () => {
  if (mainWindow) {
    return mainWindow.isAlwaysOnTop();
  }
  return true;
});

ipcMain.handle("set-always-on-top", (event, value) => {
  if (mainWindow) {
    if (value) {
      mainWindow.setAlwaysOnTop(true, "screen-saver");
    } else {
      mainWindow.setAlwaysOnTop(false, "normal");
    }
    return true;
  }
  return false;
});

// Open external links handler
ipcMain.handle("open-external", async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error("Failed to open external link:", error);
    return { success: false, error: error.message };
  }
});

// Auto-update handlers
ipcMain.handle("check-for-updates", async () => {
  try {
    console.log("Manual update check initiated");
    console.log("Current version:", app.getVersion());
    updateStatus.checking = true;
    updateStatus.error = null;
    updateStatus.available = false;
    
    // Send initial status
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-status", { ...updateStatus });
    }
    
    const result = await autoUpdater.checkForUpdates();
    console.log("Update check result:", result);
    return { success: true };
  } catch (error) {
    updateStatus.checking = false;
    updateStatus.error = error.message;
    console.error("Failed to check for updates:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Send error status
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-status", { ...updateStatus });
    }
    
    return { success: false, error: error.message };
  }
});

ipcMain.handle("download-update", async () => {
  try {
    if (updateStatus.available) {
      await autoUpdater.downloadUpdate();
      return { success: true };
    }
    return { success: false, error: "No update available" };
  } catch (error) {
    updateStatus.error = error.message;
    console.error("Failed to download update:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("install-update", () => {
  try {
    if (updateStatus.downloaded) {
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    }
    return { success: false, error: "Update not downloaded" };
  } catch (error) {
    console.error("Failed to install update:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-update-status", () => {
  return updateStatus;
});

ipcMain.handle("select-image", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Select Image",
    filters: [
      { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
    ],
    properties: ["openFile"],
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const filePath = filePaths[0];
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).slice(1);
      const base64 = `data:image/${ext};base64,${data.toString("base64")}`;
      return { success: true, url: base64, name: path.basename(filePath) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

// Notification handlers
const scheduledNotifications = new Map();

ipcMain.handle("schedule-notification", (event, { id, title, body, timestamp }) => {
  try {
    // Cancel existing notification if any
    if (scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id));
      scheduledNotifications.delete(id);
    }

    const now = Date.now();
    const delay = timestamp - now;

    if (delay <= 0) {
      // Show immediately if time has passed
      showNotification(title, body);
      return { success: true };
    }

    // Schedule notification
    const timeoutId = setTimeout(() => {
      showNotification(title, body);
      scheduledNotifications.delete(id);
    }, delay);

    scheduledNotifications.set(id, timeoutId);
    return { success: true };
  } catch (error) {
    console.error("Failed to schedule notification:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("cancel-notification", (event, id) => {
  try {
    if (scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id));
      scheduledNotifications.delete(id);
      return { success: true };
    }
    return { success: false, error: "Notification not found" };
  } catch (error) {
    console.error("Failed to cancel notification:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("cancel-all-notifications", () => {
  try {
    scheduledNotifications.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    scheduledNotifications.clear();
    return { success: true };
  } catch (error) {
    console.error("Failed to cancel all notifications:", error);
    return { success: false, error: error.message };
  }
});

function showNotification(title, body) {
  // Request permission for notifications (Windows 10+)
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title || "My Todo",
      body: body || "You have a task reminder",
      icon: path.join(__dirname, "assets", "tasks-icon.ico"),
      silent: false,
    });

    notification.on("click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    notification.show();
  } else {
    console.warn("Notifications are not supported on this system");
  }
}

// Launch at startup handlers
ipcMain.handle("get-launch-at-startup", async () => {
  const settings = await loadSettings();
  return !!settings.launchAtStartup;
});

ipcMain.handle("set-launch-at-startup", async (event, value) => {
  const settings = await loadSettings();
  settings.launchAtStartup = value;
  saveSettings(settings);
  app.setLoginItemSettings({ openAtLogin: value });
  return true;
});

// Todos storage handlers
ipcMain.handle("load-todos", async () => {
  return await loadTodos();
});

ipcMain.handle("save-todos", async (event, todos) => {
  saveTodos(todos);
  return { success: true };
});

// Folders storage handlers
ipcMain.handle("load-folders", async () => {
  return await loadFolders();
});

ipcMain.handle("save-folders", async (event, folders) => {
  saveFolders(folders);
  return { success: true };
});

// Migration handler - reads from localStorage (via renderer) and saves to files
ipcMain.handle("migrate-from-localstorage", async (event, { todos, folders, theme, alwaysOnTop, selectedFolder, backgroundImage, backgroundColor, overlayOpacity }) => {
  try {
    // Save todos if they exist
    if (todos && Array.isArray(todos) && todos.length > 0) {
      saveTodos(todos);
      console.log(`Migrated ${todos.length} todos from localStorage`);
    }
    
    // Save folders if they exist
    if (folders && Array.isArray(folders) && folders.length > 0) {
      saveFolders(folders);
      console.log(`Migrated ${folders.length} folders from localStorage`);
    }
    
    // Save other settings
    const settings = await loadSettings();
    if (theme) settings.theme = theme;
    if (alwaysOnTop !== undefined) settings.alwaysOnTop = alwaysOnTop;
    if (selectedFolder !== undefined) settings.selectedFolder = selectedFolder;
    if (backgroundImage !== undefined) settings.backgroundImage = backgroundImage;
    if (backgroundColor !== undefined) settings.backgroundColor = backgroundColor;
    if (overlayOpacity !== undefined) settings.overlayOpacity = overlayOpacity;
    saveSettings(settings);
    
    return { success: true };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
});

// Set app name for notifications (must be set before app is ready)
app.setName("My Tasks");

// Performance optimizations
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// Ensure only one instance of the app is running
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // Handle when another instance tries to open
  app.on("second-instance", () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Create splash screen immediately when app is ready
    createSplashWindow();
    
    // Create main window (hidden initially) - async to not block
    // Small delay to ensure splash screen paints first
    setTimeout(() => {
      createWindow();
    }, 100);

    // Initialize settings (async, non-blocking)
    const settings = await loadSettings();
    if (settings.launchAtStartup === undefined) {
        // Default to true if not set
        settings.launchAtStartup = true;
        app.setLoginItemSettings({ openAtLogin: true });
        saveSettings(settings);
    } else {
        // Ensure OS setting matches preference
        app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup });
    }

    // Check for updates on app start (only in production)
    if (app.isPackaged) {
      // Wait a bit before checking for updates to not slow down app startup
      setTimeout(() => {
        console.log("Starting automatic update check...");
        console.log("Current app version:", app.getVersion());
        autoUpdater.checkForUpdates().catch(err => {
          console.error("Auto-update check failed:", err);
          updateStatus.error = err.message;
          updateStatus.checking = false;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("update-status", { ...updateStatus });
          }
        });
      }, 3000);
    }

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createSplashWindow();
        await createWindow();
      } else if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  });
}

app.on("window-all-closed", (event) => {
  // Don't quit on Windows/Linux when all windows are closed
  // Keep app running in tray
  if (process.platform !== "darwin") {
    event.preventDefault();
  }
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

// Auto-updater event handlers
autoUpdater.on("checking-for-update", () => {
  console.log("=== Checking for update ===");
  console.log("Event fired: checking-for-update");
  updateStatus.checking = true;
  updateStatus.error = null;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { ...updateStatus });
  }
  console.log("Update status sent to renderer");
});

autoUpdater.on("update-available", (info) => {
  console.log("=== Update Available! ===");
  console.log("Current app version:", app.getVersion());
  console.log("New version available:", info.version);
  console.log("Update info:", JSON.stringify(info, null, 2));
  updateStatus.available = true;
  updateStatus.checking = false;
  updateStatus.info = info;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { ...updateStatus });
    // Show notification dialog
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update Available",
      message: `Version ${info.version} is available!`,
      detail: `Current version: ${app.getVersion()}\nNew version: ${info.version}\n\nWould you like to download it now?`,
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        // User wants to download
        autoUpdater.downloadUpdate().catch(err => {
          console.error("Failed to download update:", err);
          dialog.showErrorBox("Download Failed", `Failed to download update: ${err.message}`);
        });
      }
    });
  }
});

autoUpdater.on("update-not-available", (info) => {
  console.log("=== Update Check Result ===");
  console.log("Current app version:", app.getVersion());
  console.log("Latest release version:", info?.version || "unknown");
  console.log("Update info:", JSON.stringify(info, null, 2));
  console.log("Update not available. Current version is latest.");
  updateStatus.available = false;
  updateStatus.checking = false;
  updateStatus.info = info;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { ...updateStatus });
    // Show dialog to inform user
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "No Updates Available",
      message: "You're using the latest version!",
      detail: `Current version: ${app.getVersion()}\nLatest version: ${info?.version || app.getVersion()}\n\nNo updates are available at this time.`,
      buttons: ["OK"],
    });
  }
});

autoUpdater.on("error", (err) => {
  console.error("Error in auto-updater:", err);
  console.error("Error stack:", err.stack);
  console.error("Error details:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
  updateStatus.error = err.message || "Unknown error occurred";
  updateStatus.checking = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { ...updateStatus });
    // Also show error dialog for visibility
    dialog.showErrorBox(
      "Update Check Error",
      `Failed to check for updates:\n\n${err.message || "Unknown error"}\n\nPlease check:\n- Internet connection\n- GitHub repository configuration\n- Version format in package.json`
    );
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
  console.log(message);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-download-progress", progressObj);
  }
});

autoUpdater.on("update-downloaded", (info) => {
  console.log("Update downloaded:", info.version);
  updateStatus.downloaded = true;
  updateStatus.info = info;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { ...updateStatus });
    
    const detailMessage = `Version ${info.version} has been downloaded.\nThe application will restart to apply the update.`;
    
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update Ready",
      message: "Update downloaded successfully",
      detail: detailMessage,
      buttons: ["Install Update", "Later"],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  }
});

