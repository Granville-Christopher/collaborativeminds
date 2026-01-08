# Testing Build Type Behavior

## Quick Test

To verify what EAS builds by default for your setup:

### Test 1: Build WITHOUT buildType setting

1. Temporarily remove `"buildType": "apk"` from your `eas.json`:

```json
"production": {
  "autoIncrement": true
  // No android.buildType specified
}
```

2. Build:
```bash
npx eas build --platform android --profile production
```

3. Check the downloaded file:
   - If it's `.apk` → Your EAS version defaults to APK
   - If it's `.aab` → Your EAS version defaults to AAB

### Test 2: Build WITH buildType setting

1. Add back `"buildType": "apk"`:

```json
"production": {
  "autoIncrement": true,
  "android": {
    "buildType": "apk"
  }
}
```

2. Build again and verify you get `.apk`

## Why This Matters

Even if your EAS defaults to APK:
- ✅ Explicit is better than implicit
- ✅ Protects against future EAS updates changing defaults
- ✅ Makes your intent clear to other developers
- ✅ Ensures consistent behavior across different EAS versions

## Recommendation

**Always specify `"buildType": "apk"` explicitly** - it's safer and clearer, even if your current EAS version defaults to APK.

