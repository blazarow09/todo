const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Try hoisted structure first (node-linker=hoisted)
const hoistedElectronPath = path.join(process.cwd(), "node_modules", "electron");
if (fs.existsSync(hoistedElectronPath)) {
  console.log("Installing Electron binaries (hoisted structure)...");
  process.chdir(hoistedElectronPath);
  execSync("node install.js", { stdio: "inherit" });
  console.log("Electron installed successfully!");
  process.exit(0);
}

// Fallback to pnpm's isolated structure
const pnpmPath = path.join(process.cwd(), "node_modules", ".pnpm");
if (fs.existsSync(pnpmPath)) {
  const electronDirs = fs.readdirSync(pnpmPath).filter((d) => d.startsWith("electron@"));
  if (electronDirs.length > 0) {
    const electronPath = path.join(pnpmPath, electronDirs[0], "node_modules", "electron");
    if (fs.existsSync(electronPath)) {
      console.log("Installing Electron binaries (pnpm isolated structure)...");
      process.chdir(electronPath);
      execSync("node install.js", { stdio: "inherit" });
      console.log("Electron installed successfully!");
      process.exit(0);
    }
  }
}

console.error("Could not find Electron package. Please run 'pnpm install' first.");
process.exit(1);

