# App Distribution Guide

This guide shows you how to distribute your app via GitHub Releases and your website.

## Option 1: GitHub Releases (Recommended)

### Step 1: Build APK using EAS

```bash
cd mobile-app
npx eas build --platform android --profile production
```

This will:
- Build a production APK
- Upload it to EAS servers
- Give you a download link

### Step 2: Download the APK

1. Go to https://expo.dev/accounts/[your-account]/projects/collaborative-success/builds
2. Find your latest build
3. Download the APK file

### Step 3: Create GitHub Release

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.0.0` (or increment as needed)
4. Release title: `v1.0.0 - Initial Release`
5. Description: Add release notes
6. Attach the APK file
7. Click "Publish release"

### Step 4: Get Direct Download Link

After publishing, you can get a direct download link:
- Format: `https://github.com/[username]/[repo]/releases/download/v1.0.0/app-release.apk`
- Or use the release page URL

## Option 2: Host on Your Website

### Step 1: Upload APK to Your Website

1. Create a `downloads` folder in your website's `public` directory
2. Upload the APK file there
3. Name it something like `app-v1.0.0.apk`

### Step 2: Create Download Page

A download page has been created at `/download` on your website.

### Step 3: Update Download Link

Edit `website/views/download.ejs` to update:
- Version number
- APK file name
- Release notes

## Quick Build Commands

```bash
# Build APK for production
cd mobile-app
npx eas build --platform android --profile production

# Build APK for preview/testing
npx eas build --platform android --profile preview

# Check build status
npx eas build:list
```

## Notes

- APK files are typically 20-50MB
- Users need to enable "Install from Unknown Sources" on Android
- Consider using AAB format for Google Play Store (requires different build config)
- Always test the APK before distributing

