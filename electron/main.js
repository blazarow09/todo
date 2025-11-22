const { app, BrowserWindow, screen, ipcMain, Tray, Menu, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let splashWindow = null;
let tray = null;

// Window state file path
const getWindowStatePath = () => {
  return path.join(app.getPath('userData'), 'window-state.json');
};

// Load window state
const loadWindowState = () => {
  try {
    const statePath = getWindowStatePath();
    if (fs.existsSync(statePath)) {
      const data = fs.readFileSync(statePath, 'utf8');
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
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Center splash screen on primary display
  const splashWidth = 300;
  const splashHeight = 200;
  const splashX = primaryDisplay.workArea.x + (primaryDisplay.workArea.width - splashWidth) / 2;
  const splashY = primaryDisplay.workArea.y + (primaryDisplay.workArea.height - splashHeight) / 2;
  
  splashWindow = new BrowserWindow({
    width: splashWidth,
    height: splashHeight,
    x: splashX,
    y: splashY,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.setMenuBarVisibility(false);
};

const createWindow = () => {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Load window state
  const savedState = loadWindowState();
  
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
    },
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
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 300); // 300ms delay for smooth transition
  };
  
  mainWindow.webContents.once("did-finish-load", showMainWindow);
  
  // Also handle failed loads - still show main window
  mainWindow.webContents.once("did-fail-load", () => {
    console.error("Failed to load main window");
    showMainWindow();
  });
  
  if (isDev) {
    mainWindow.loadURL("http://localhost:1420");
    mainWindow.webContents.openDevTools();
  } else {
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

  app.whenReady().then(() => {
    // Create splash screen first
    createSplashWindow();
    
    // Create main window (hidden initially)
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createSplashWindow();
        createWindow();
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

