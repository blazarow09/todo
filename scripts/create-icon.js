const fs = require('fs');
const path = require('path');

// This script helps create an icon.ico file
// You'll need to manually convert your image to .ico format
// Or use an online tool like https://convertio.co/png-ico/

console.log('Icon setup instructions:');
console.log('');
console.log('1. Place your checkmark icon image (PNG or JPG) in: electron/assets/icon.png');
console.log('2. Convert it to .ico format using one of these methods:');
console.log('   - Online: https://convertio.co/png-ico/');
console.log('   - Online: https://www.icoconverter.com/');
console.log('   - Or use ImageMagick: magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico');
console.log('3. Save the converted file as: electron/assets/icon.ico');
console.log('4. The icon should be at least 256x256 pixels for best quality');
console.log('');
console.log('Checking for existing icon files...');

const assetsDir = path.join(__dirname, '../electron/assets');
const iconPng = path.join(assetsDir, 'icon.png');
const iconIco = path.join(assetsDir, 'icon.ico');

if (fs.existsSync(iconPng)) {
  console.log('✓ Found icon.png');
} else {
  console.log('✗ icon.png not found');
}

if (fs.existsSync(iconIco)) {
  console.log('✓ Found icon.ico');
} else {
  console.log('✗ icon.ico not found - you need to create this file');
}

