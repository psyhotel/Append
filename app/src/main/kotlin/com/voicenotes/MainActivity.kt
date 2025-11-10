// Kotlin
// Файл: app/src/main/kotlin/com/voicenotes/MainActivity.kt
package com.voicenotes

import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true

        // загружаем фронтенд из assets/frontend/index.html
        webView.loadUrl("file:///android_asset/frontend/index.html")
    }
}
