# Todo Widget - Desktop App

A minimal desktop todo widget built with Electron + React + TypeScript. Runs as a small, always-on-top window.

## Features

- ✅ Small desktop widget window (360x500px)
- ✅ Always-on-top mode
- ✅ LocalStorage persistence
- ✅ Clean, minimal UI
- ✅ Easy to install - no Rust required!

## Prerequisites

You only need:

1. **Node.js** (v18 or later) and **pnpm**
   ```bash
   npm install -g pnpm
   ```

That's it! No Rust, no Windows SDK, no complicated setup.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. **If you get an Electron installation error**, run:
   ```bash
   pnpm electron:install
   ```
   This ensures Electron's binaries are properly downloaded.

3. Run in development mode:
   ```bash
   pnpm electron:dev
   ```

   This will start the Vite dev server and launch the Electron window.

## Building

### Portable Version (No Installation Required) ⭐ Recommended

To build a portable version that can be run directly without installation:

```bash
pnpm electron:build
```

This creates a portable `.exe` file in the `dist` folder that you can run directly. Just double-click the `.exe` file to start the app - no installation needed! You can move this file anywhere and it will work.

### Installer Version

To build an installer version:

```bash
pnpm electron:build:installer
```

This creates a setup installer that will install the app on your system.

### Build Output

After building, you'll find the executable in the `dist` folder:
- **Portable**: `My Todo-0.1.0-portable.exe` - Run this directly, no installation needed
- **Installer**: `My Todo-0.1.0-setup.exe` - Run this to install the app

### Adding a Custom Icon

To add a custom icon for the app:
1. Create an `icon.ico` file (256x256 pixels recommended for Windows)
2. Place it in `electron/assets/icon.ico`
3. The build process will automatically use it for the executable icon

## Installation & Pinning

After building and running the installer:

1. **Pin to Desktop:**
   - Find the installed app in Start menu
   - Right-click → "Send to → Desktop (create shortcut)"

2. **Pin to Taskbar:**
   - Find the installed app in Start menu
   - Right-click → "Pin to taskbar"

## Project Structure

```
.
├── src/              # React frontend
│   ├── App.tsx      # Main todo component
│   └── main.tsx     # React entry point
├── electron/         # Electron main process
│   ├── main.js      # Electron entry point
│   └── preload.js   # Preload script
└── package.json     # Node dependencies
```

## Configuration

### Window Settings

Edit `electron/main.js` to adjust:
- Window size (`width`, `height`)
- Always-on-top (`alwaysOnTop`)
- Window position (`x`, `y`)
- Window decorations (`frame`)

## Development

- Frontend dev server runs on `http://localhost:1420`
- Hot reload is enabled for React components
- Electron window will reload automatically on frontend changes

## Why Electron instead of Tauri?

- ✅ **Easier setup** - Only requires Node.js (no Rust installation needed)
- ✅ **Faster development** - No Rust compilation time
- ✅ **More familiar** - Uses JavaScript/TypeScript throughout
- ✅ **Better ecosystem** - Access to the entire npm ecosystem

## License

MIT
