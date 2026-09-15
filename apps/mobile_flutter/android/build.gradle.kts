buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        // Put AGP on this build script's classpath so `com.android.build.gradle.LibraryExtension`
        // can be referenced in the `subprojects` override below. (A `plugins {}` block conflicts
        // with the Flutter plugin loader.)
        classpath("com.android.tools.build:gradle:9.0.1")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// Some pub-cache plugins (e.g. firebase_messaging 14.7.10) hard-code `compileSdk 33`, which fails
// AAR metadata checks against firebase_core / AndroidX 1.8+ that require compileSdk >= 34.
// Force every Android library module to compile against the installed SDK level (36).
// NOTE: must be registered BEFORE the `project.evaluationDependsOn(":app")` block below, otherwise
// `:app` has already been evaluated and `afterEvaluate` cannot be scheduled.
subprojects {
    afterEvaluate {
        if (project.plugins.hasPlugin("com.android.library")) {
            project.extensions.configure<com.android.build.gradle.LibraryExtension>("android") {
                compileSdk = 36
            }
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
