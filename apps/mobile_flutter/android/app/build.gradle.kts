import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// ── Release signing: baca `key.properties` bila ada (CI). ────
// Di CI, workflow menulis key.properties dari GitHub Secrets →
// APK di-sign dengan keystore stabil → update tanpa uninstall.
// Di mesin lokal, key.properties tidak ada → fallback ke debug.
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.example.mobile_flutter"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // flutter_local_notifications memerlukan core library desugaring
        // (API java.time dkk) pada minSdk < 26 — emulator LDPlayer API 28.
        isCoreLibraryDesugaringEnabled = true
    }

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        // Package name paralel (tidak bentrok dengan app Expo `org.thsthm.mobile`).
        applicationId = "org.thsthm.mobile.flutter"
        // flutter_secure_storage v9 & mobile_scanner memerlukan minSdk >= 23.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            keyAlias     = keystoreProperties["keyAlias"]?.toString()
            keyPassword  = keystoreProperties["keyPassword"]?.toString()
            storeFile    = keystoreProperties["storeFile"]?.toString()?.let { file(it) }
            storePassword = keystoreProperties["storePassword"]?.toString()
        }
    }

    buildTypes {
        release {
            signingConfig = if (keystoreProperties["storeFile"] != null)
                signingConfigs.getByName("release")
            else
                signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
