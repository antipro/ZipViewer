# ZipViewer - Private Archive Viewer

A secure, offline-first web application for viewing images directly from encrypted ZIP, RAR, and 7Z archives.

## Features
- **Privacy First**: All data is stored in your browser's IndexedDB. No data ever leaves your device.
- **Encrypted Archives**: Full support for password-protected ZIP files using `@zip.js/zip.js`.
- **Mobile Optimized**: Smooth pinch-to-zoom, panning, and swipe navigation.
- **Desktop Ready**: Keyboard shortcuts and high-performance rendering.

## Mobile APK Build Instructions

To package this application as a native Android APK, we use **Capacitor**.

### 1. Prerequisites
- **Node.js & pnpm**: Ensure both are installed.
- **Android Studio**: If on Mac M1/M2/M3, download the **"Apple Chip"** version.
- **JDK**: For Apple Silicon, use an ARM64 JDK (e.g., `brew install --cask zulu`).

### 2. Setup Capacitor
Install the necessary dependencies:
```bash
pnpm add @capacitor/core @capacitor/android
pnpm add -D @capacitor/cli
```

### 3. Initialize the Project
Initialize Capacitor with your app's details:
```bash
pnpm dlx cap init "ZipViewer" "com.bitifyware.zipviewer" --web-dir "."
```

### 4. Build and Add Android
Add the Android platform to your project:
```bash
pnpm dlx cap add android
```

### 5. Sync and Open
Every time you make changes to the web code, run:
```bash
pnpm dlx cap sync
pnpm dlx cap open android
```

### 6. Compile the APK
Once Android Studio is open:
1. Wait for Gradle to finish syncing (M1 chips handle this very quickly).
2. Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Android Studio will generate the `.apk` file and provide a link to the folder containing it.

### macOS M1/Apple Silicon Tips
- **Fast Emulators**: When creating a Virtual Device (Emulator), ensure you select an **arm64-v8a** system image. These run natively on your CPU and are much faster than x86 images.
- **Environment Variables**: Ensure your `JAVA_HOME` and `ANDROID_HOME` are correctly set in your `.zshrc` or `.bash_profile`.

### Android Manifest (Optional)
To register as a system-level ZIP editor, add the following Intent Filter to your `android/app/src/main/AndroidManifest.xml` inside the `<activity>` tag:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="content" />
    <data android:host="*" />
    <data android:mimeType="application/zip" />
    <data android:mimeType="application/x-zip-compressed" />
</intent-filter>
```

## Security Note
This app uses browser-based encryption and local storage. While highly private, the security of your files ultimately depends on your device's security and the strength of your archive passwords.
