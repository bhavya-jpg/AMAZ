plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.doorsignal.firetv"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.doorsignal.firetv"
        minSdk = 25 // Fire OS 6
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
        val serverUrl = (project.findProperty("doorsignal.serverUrl") as String?) ?: "http://10.0.2.2:3000"
        buildConfigField("String", "DEFAULT_SERVER_URL", "\"$serverUrl\"")
    }

    buildFeatures { buildConfig = true }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:okhttp-sse:4.12.0")
}
