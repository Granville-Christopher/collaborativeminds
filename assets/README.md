# Assets Directory

Place your app assets here.

## Required Assets

- `icon.png` - App icon (MUST be 1024x1024 PNG format)
- `beans.jpg` - Discord bot icon for WelcomeScreen (80x80px recommended)

## App Icon Setup

The app icon **MUST** be a PNG file at 1024x1024 pixels for Expo apps.

### To fix the icon:

1. **Convert beans.jpg to PNG:**
   - Use an image editor (Photoshop, GIMP, online converter)
   - Or use ImageMagick: `convert beans.jpg -resize 1024x1024 icon.png`

2. **Resize to 1024x1024:**
   - The icon must be exactly 1024x1024 pixels
   - Square aspect ratio (1:1)

3. **Save as `icon.png` in this directory**

4. **Rebuild the app:**
   - For development: `npm start` then rebuild
   - For production: `eas build --platform android`

## How to Add Assets

1. Place image files in this directory
2. Reference them in your code using:
   ```javascript
   import beansImage from '../assets/beans.jpg';
   // or
   <Image source={require('../assets/beans.jpg')} />
   ```

