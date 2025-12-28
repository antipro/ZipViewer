# ZipViewer - Private Archive Viewer

A secure, offline-first web application for viewing images directly from encrypted ZIP, RAR, and 7Z archives.

## Features
- **Privacy First**: All data is stored in your browser's IndexedDB. No data ever leaves your device.
- **Encrypted Archives**: Full support for password-protected ZIP files using `@zip.js/zip.js`.
- **Mobile Optimized**: Smooth pinch-to-zoom, panning, and swipe navigation.
- **Desktop Ready**: Keyboard shortcuts and high-performance rendering.

## Mobile APK Build Instructions (No NPM Dependencies)

This method uses a standard Android Studio project to wrap your web code. It requires no changes to your web project's configuration and keeps the build process completely separate.

### 1. Prepare Your Web Assets
Ensure your web application is compiled into standard HTML/JS/CSS.
* **Important**: Android WebViews cannot natively execute `.tsx` or JSX files. You must transpile your code (e.g., `vite build`, `tsc`, or `esbuild`) before packaging.
* **Offline Support**: If you want the app to work offline, you must download the dependencies currently loaded from `esm.sh` in `index.html` and link them locally.

### 2. Create Android Project
1. Open **Android Studio**.
2. Select **New Project** > **Empty Views Activity**.
3. Name: `ZipViewer`.
4. Package Name: `com.bitifyware.zipviewer`.
5. Language: **Kotlin**.

### 3. Configure Android Dependencies
Open `app/build.gradle.kts` (Module: app) and add the **WebKit** dependency to the `dependencies` block. This library allows us to serve local files securely.

```kotlin
dependencies {
    // ... existing dependencies
    implementation("androidx.webkit:webkit:1.12.0")
}
```
Click **Sync Now** in the top right corner.

### 4. Setup WebView in MainActivity
Open `app/src/main/java/com/bitifyware/zipviewer/MainActivity.kt`.
Replace the entire file content with the following code. This sets up a `WebViewAssetLoader` to serve your files from a virtual domain (`https://appassets.androidplatform.net`), which is required to make ES Modules and CORS work correctly in a local APK.

```kotlin
package com.bitifyware.zipviewer

import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize WebView
        val webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true // Required for IndexedDB
        
        // Setup Asset Loader to serve files from 'assets' folder via a virtual URL.
        // This creates a virtual domain https://appassets.androidplatform.net/assets/
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        // Intercept requests to serve local files
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
        }

        setContentView(webView)
        
        // Load the index.html from the virtual domain
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }
}
```

### 5. Add Web Files
1. In Android Studio, right-click the `app/src/main` folder in the Project view.
2. Select **New** > **Folder** > **Assets Folder**.
3. Click **Finish**.
4. Copy your **compiled** web files (index.html, .js bundles, css) into `app/src/main/assets/`.

### 6. Android Manifest (Optional)
To register the app as a generic File Viewer (so it appears in "Open With" menus), add this `<intent-filter>` to `app/src/main/AndroidManifest.xml` inside the `<activity>` tag:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="content" />
    <data android:mimeType="application/zip" />
    <data android:mimeType="application/x-zip-compressed" />
    <data android:mimeType="application/x-rar-compressed" />
</intent-filter>
```

### 7. Build APK
Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
Android Studio will generate the APK file which you can transfer to your device.

## Security Note
This app uses browser-based encryption and local storage. While highly private, the security of your files ultimately depends on your device's security and the strength of your archive passwords.