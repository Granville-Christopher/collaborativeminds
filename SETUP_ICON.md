# App Icon Setup Guide

## Problem
The app icon is not showing because `app.json` was configured to use `beans.jpg`, but app icons **MUST** be PNG format and **1024x1024 pixels**.

## Solution

### Option 1: Quick Online Conversion (Recommended)
1. Go to https://convertio.co/jpg-png/ or https://cloudconvert.com/jpg-to-png
2. Upload `mobile-app/assets/beans.jpg`
3. Download as PNG
4. Use an image editor to resize to **exactly 1024x1024 pixels**:
   - Windows: Use Paint 3D (Right-click image > Edit with Paint 3D > Resize to 1024x1024)
   - Mac: Use Preview (Tools > Adjust Size > Set to 1024x1024)
   - Online: https://www.iloveimg.com/resize-image
5. Save as `icon.png` in `mobile-app/assets/` folder

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first: https://imagemagick.org/script/download.php
cd mobile-app/assets
magick convert beans.jpg -resize 1024x1024 icon.png
```

### Option 3: Using Python (if you have it installed)
```bash
cd mobile-app/assets
python -c "from PIL import Image; img = Image.open('beans.jpg'); img.resize((1024, 1024)).save('icon.png')"
```

## After Converting
1. Verify `icon.png` exists in `mobile-app/assets/`
2. Verify it's exactly 1024x1024 pixels
3. Rebuild your app:
   ```bash
   # For development build
   npm start
   # Then rebuild in your development client
   
   # For production build
   eas build --platform android
   ```

## Current Configuration
✅ `app.json` has been updated to use `./assets/icon.png`
✅ Android adaptive icon background color set to Discord blue (#5865F2)

## Troubleshooting
- If icon still doesn't show: Clear app cache and rebuild
- If build fails: Make sure `icon.png` is exactly 1024x1024 pixels
- If icon is blurry: The source image should be high quality before resizing

