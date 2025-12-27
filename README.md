
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
Ensure you have [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed.

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
1. Wait for Gradle to finish syncing.
2. Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Android Studio will generate the `.apk` file and provide a link to the folder containing it.

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
