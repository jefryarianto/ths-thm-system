package com.example.mobile_flutter

import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private companion object {
        const val CHANNEL = "ths_thm/secure_window"
        val FLAG_SECURE = WindowManager.LayoutParams.FLAG_SECURE
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Platform channel aman untuk proteksi KTA (anti-screenshot &
        // anti-screen-recording). Sinkron dengan
        // lib/core/security/secure_window_channel.dart di sisi Dart.
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "setSecure" -> {
                    val enabled: Boolean = call.argument("enabled") ?: false
                    if (enabled) {
                        // Konten window tidak akan muncul pada screenshot,
                        // Recent Apps, rekaman layar, maupun screen cast.
                        window.setFlags(FLAG_SECURE, FLAG_SECURE)
                    } else {
                        window.clearFlags(FLAG_SECURE)
                    }
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }
}
