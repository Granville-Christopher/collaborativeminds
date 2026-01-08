# Build Type Explanation: APK vs AAB

## Quick Answer

**YES, you MUST keep `"buildType": "apk"` for both:**
- ✅ Website hosting
- ✅ GitHub Releases
- ✅ Direct downloads

**Without it, users CANNOT install your app!**

---

## What Happens Without `"buildType": "apk"`?

### Default Behavior (No buildType specified)
- **Production profile**: EAS builds **AAB (Android App Bundle)** files by default
- **Preview profile**: EAS may build **APK** files by default (varies by version)
- AAB files are **ONLY for Google Play Store**
- **Users CANNOT install AAB files directly** on their phones
- AAB files need to be uploaded to Play Store first

**Note**: The default behavior can vary depending on:
- Which build profile you use (`preview` vs `production`)
- Your EAS CLI version
- Expo SDK version

**Best Practice**: Always explicitly specify `"buildType": "apk"` to ensure you get APK files regardless of defaults.

### With `"buildType": "apk"` ✅
- EAS builds **APK** files
- APK files can be **directly installed** on Android devices
- Works for website downloads, GitHub releases, and direct distribution
- Users can download and install immediately

---

## Comparison

| Build Type | File Extension | Can Install Directly? | Use Case |
|------------|---------------|----------------------|----------|
| **APK** | `.apk` | ✅ YES | Website, GitHub, direct distribution |
| **AAB** | `.aab` | ❌ NO | Google Play Store only |

---

## Your Current Configuration

```json
{
  "production": {
    "autoIncrement": true,
    "android": {
      "buildType": "apk"  // ✅ KEEP THIS!
    }
  }
}
```

This is **CORRECT** for your use case!

---

## What If You Remove It?

If you remove `"buildType": "apk"`:

1. ❌ EAS will build AAB files instead
2. ❌ Users download AAB file from your website/GitHub
3. ❌ Users try to install → **"Cannot open file"** error
4. ❌ Users cannot use your app

---

## When to Use Each

### Use APK (`"buildType": "apk"`) When:
- ✅ Distributing via website
- ✅ Distributing via GitHub Releases
- ✅ Direct downloads
- ✅ Testing with friends/team
- ✅ Beta testing outside Play Store

### Use AAB (default, no buildType) When:
- ✅ Submitting to Google Play Store
- ✅ Using Play Store's internal testing
- ✅ Production releases on Play Store

---

## Summary

**Keep `"buildType": "apk"` in your eas.json!**

- Your app will work perfectly with it
- Without it, users cannot install your app
- It's needed for both website and GitHub distribution
- The app functionality is the same - only the file format changes

---

## Example: What Users See

### With APK ✅
1. User downloads `app-release.apk` from your website
2. User taps the file
3. Android asks: "Install this app?"
4. User taps "Install"
5. ✅ **App installs successfully**

### With AAB ❌
1. User downloads `app-release.aab` from your website
2. User taps the file
3. Android shows: "Cannot open file" or "No app to open this file"
4. ❌ **Installation fails**

---

## Conclusion

**DO NOT remove `"buildType": "apk"` from your eas.json!**

It's essential for your distribution method (website + GitHub). The app itself works the same way - this setting only affects the build output format.

