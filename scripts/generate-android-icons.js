/**
 * Android Icon Generation Helper
 * 
 * This script provides guidance for generating Android app icons.
 * 
 * To generate proper Android icons from your source icon (build/icon.png):
 * 
 * Option 1: Use Android Studio
 * 1. Open the Android project: npm run cap:open
 * 2. Right-click on res folder > New > Image Asset
 * 3. Select your source image (build/icon.png)
 * 4. Android Studio will generate all required sizes
 * 
 * Option 2: Use online tools
 * - https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
 * - Upload build/icon.png and download the generated icons
 * - Extract to android/app/src/main/res/
 * 
 * Option 3: Manual creation
 * Required icon sizes for mipmap folders:
 * - mipmap-mdpi: 48x48
 * - mipmap-hdpi: 72x72
 * - mipmap-xhdpi: 96x96
 * - mipmap-xxhdpi: 144x144
 * - mipmap-xxxhdpi: 192x192
 * 
 * Notification icon (ic_stat_icon.png):
 * Must be white with transparency, placed in drawable folder
 * Size: 24x24 dp (create for each density)
 * - drawable-mdpi: 24x24
 * - drawable-hdpi: 36x36
 * - drawable-xhdpi: 48x48
 * - drawable-xxhdpi: 72x72
 * - drawable-xxxhdpi: 96x96
 */

const fs = require('fs');
const path = require('path');

console.log('=== Android Icon Generation Helper ===\n');

const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
const androidResPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

if (fs.existsSync(iconPath)) {
  console.log('✓ Source icon found: build/icon.png');
} else {
  console.log('✗ Source icon not found: build/icon.png');
  console.log('  Please add your app icon as build/icon.png');
}

if (fs.existsSync(androidResPath)) {
  console.log('✓ Android res folder found');
} else {
  console.log('✗ Android res folder not found');
  console.log('  Run: npx cap add android');
}

console.log('\nTo generate icons:');
console.log('1. Open Android Studio: npm run cap:open');
console.log('2. Right-click res > New > Image Asset');
console.log('3. Select build/icon.png as source');
console.log('\nFor notification icon:');
console.log('- Create a white silhouette version of your icon');
console.log('- Save as ic_stat_icon.png in drawable folders');

