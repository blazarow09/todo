const { app, BrowserWindow, screen, ipcMain, Tray, Menu, dialog, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");

// Configure userData path for portable builds
// This ensures data persists when building new portable versions
// Set this BEFORE app.whenReady() to take effect
if (app.isPackaged) {
  const execPath = process.execPath;
  const execDir = path.dirname(execPath);
  const execName = path.basename(execPath, path.extname(execPath));
  const os = require('os');
  
  // Multiple detection methods for portable builds (works even if renamed)
  let isPortableBuild = false;
  
  // Method 1: Check executable name (original detection)
  if (execName.toLowerCase().includes('portable')) {
    isPortableBuild = true;
  }
  
  // Method 2: Check if we're in a temp directory (portable exes extract to temp when run)
  // This is the most reliable indicator for electron-builder portable builds
  const tempIndicators = [
    path.join('Local', 'Temp'),
    'AppData\\Local\\Temp',
    'AppData/Local/Temp'
  ];
  const isTempDir = tempIndicators.some(indicator => 
    execDir.includes(indicator) || execDir.toLowerCase().includes('temp')
  );
  
  // Method 3: Check for existing portable data directory (if user already used portable version)
  const defaultPortableDataPath = path.join(os.homedir(), 'AppData', 'Local', 'My Todo Portable');
  if (fs.existsSync(defaultPortableDataPath)) {
    // Check if it has our data files (settings.json or window-state.json)
    const hasDataFiles = fs.existsSync(path.join(defaultPortableDataPath, 'settings.json')) ||
                         fs.existsSync(path.join(defaultPortableDataPath, 'window-state.json'));
    if (hasDataFiles) {
      isPortableBuild = true;
    }
  }
  
  // Method 4: Check if we're NOT in a system directory AND in a temp dir
  // (portable exes run from temp, installed apps run from Program Files)
  const systemDirs = ['AppData', 'Program Files', 'ProgramData', 'Program Files (x86)'];
  const isSystemLocation = systemDirs.some(dir => execDir.includes(dir));
  
  if (isTempDir && !isSystemLocation) {
    isPortableBuild = true;
  }
  
  // For portable builds, store data in a fixed location that persists across builds
  // This solves the issue where building a new portable version removes user data
  if (isPortableBuild) {
    try {
      // Use LocalAppData for portable builds to ensure data persists
      // even when the portable exe is rebuilt, moved, or renamed
      const portableDataPath = defaultPortableDataPath;
      
      // Ensure the directory exists
      if (!fs.existsSync(portableDataPath)) {
        fs.mkdirSync(portableDataPath, { recursive: true });
      }
      
      // Set userData to portable location
      // This must be done before app.whenReady()
      app.setPath('userData', portableDataPath);
      console.log('Portable build detected - using persistent data directory:', portableDataPath);
    } catch (error) {
      console.error('Failed to configure portable data directory:', error);
      // Fall back to default userData location
    }
  } else if (!isSystemLocation && !isTempDir) {
    // For non-portable packaged apps in non-system locations, use data dir next to exe
    try {
      const localDataPath = path.join(execDir, 'My Todo Data');
      
      if (!fs.existsSync(localDataPath)) {
        fs.mkdirSync(localDataPath, { recursive: true });
      }
      
      app.setPath('userData', localDataPath);
      console.log('Using local data directory:', localDataPath);
    } catch (error) {
      console.error('Failed to configure local data directory:', error);
    }
  }
}

let mainWindow = null;
let splashWindow = null;
let tray = null;
let originalPortableExePath = null; // Track original portable exe location

// Configure auto-updater for portable apps
autoUpdater.autoDownload = false; // Don't auto-download, let user choose
autoUpdater.autoInstallOnAppQuit = true; // Auto-install on app quit after download

// For portable apps, we need to track the original exe location
// Portable exes extract to temp when run, but we need to update the original
if (app.isPackaged) {
  const execPath = process.execPath;
  const execDir = path.dirname(execPath);
  const os = require('os');
  
  // Check if we're running from temp (portable exe behavior)
  const tempIndicators = [
    path.join('Local', 'Temp'),
    'AppData\\Local\\Temp',
    'AppData/Local/Temp'
  ];
  const isTempDir = tempIndicators.some(indicator => 
    execDir.includes(indicator) || execDir.toLowerCase().includes('temp')
  );
  
  if (isTempDir) {
    // We're running from temp, need to find/store original location
    const portableExePathFile = path.join(app.getPath('userData'), 'portable-exe-path.json');
    
    try {
      // Try to read stored original path
      if (fs.existsSync(portableExePathFile)) {
        const stored = JSON.parse(fs.readFileSync(portableExePathFile, 'utf8'));
        if (stored.path && fs.existsSync(stored.path)) {
          originalPortableExePath = stored.path;
          console.log('Found original portable exe path:', originalPortableExePath);
        }
      }
      
      // If not found, try to detect from command line args or environment
      // electron-builder portable exes pass the original path via process.argv
      // Check if there's a way to get the original location
      // For now, we'll rely on user to place the exe in a known location
      // or we'll need to prompt them on first run
    } catch (error) {
      console.error('Failed to read portable exe path:', error);
    }
  } else {
    // Not in temp, this might be the original location
    originalPortableExePath = execPath;
    // Store it for future reference
    try {
      const portableExePathFile = path.join(app.getPath('userData'), 'portable-exe-path.json');
      fs.writeFileSync(portableExePathFile, JSON.stringify({ path: execPath }), 'utf8');
    } catch (error) {
      console.error('Failed to store portable exe path:', error);
    }
  }
  
  // Configure updater to use the original path if we found it
  if (originalPortableExePath) {
    // electron-updater will handle portable updates automatically
    // but we need to ensure it knows where to install
    console.log('Portable app detected, original exe:', originalPortableExePath);
  }
}

// Update status tracking
let updateStatus = {
  available: false,
  downloaded: false,
  checking: false,
  error: null,
  info: null
};

// Window state file path
const getWindowStatePath = () => {
  return path.join(app.getPath('userData'), 'window-state.json');
};

// Settings file path
const getSettingsPath = () => {
  return path.join(app.getPath('userData'), 'settings.json');
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
    updateStatus.checking = true;
    updateStatus.error = null;
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (error) {
    updateStatus.checking = false;
    updateStatus.error = error.message;
    console.error("Failed to check for updates:", error);
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
        autoUpdater.checkForUpdates().catch(err => {
          console.error("Auto-update check failed:", err);
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
  console.log("Checking for update...");
  updateStatus.checking = true;
  updateStatus.error = null;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { ...updateStatus });
  }
});

autoUpdater.on("update-available", (info) => {
  console.log("Update available:", info.version);
  updateStatus.available = true;
  updateStatus.checking = false;
  updateStatus.info = info;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { ...updateStatus });
  }
});

autoUpdater.on("update-not-available", (info) => {
  console.log("Update not available. Current version is latest.");
  updateStatus.available = false;
  updateStatus.checking = false;
  updateStatus.info = info;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { ...updateStatus });
  }
});

autoUpdater.on("error", (err) => {
  console.error("Error in auto-updater:", err);
  updateStatus.error = err.message;
  updateStatus.checking = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { ...updateStatus });
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
    
    // For portable apps, explain the update process
    const isPortable = originalPortableExePath !== null || 
                       process.execPath.toLowerCase().includes('temp');
    
    let detailMessage = `Version ${info.version} has been downloaded.`;
    if (isPortable) {
      detailMessage += `\n\nThe application will close and the portable executable will be updated.`;
      detailMessage += `\nPlease restart the application manually after the update completes.`;
    } else {
      detailMessage += `\nThe application will restart to apply the update.`;
    }
    
    // Show notification dialog
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
        // For portable apps, quitAndInstall will replace the original portable exe
        // The user will need to manually restart it
        // isSilent=false, isForceRunAfter=true means it will try to restart
        autoUpdater.quitAndInstall(false, true);
      }
    });
  }
});

