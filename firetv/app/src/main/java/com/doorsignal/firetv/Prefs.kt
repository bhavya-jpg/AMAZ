package com.doorsignal.firetv

import android.content.Context

/** Server URL and the surface token issued at pairing. Stored in app-private preferences. */
class Prefs(context: Context) {
    private val p = context.getSharedPreferences("doorsignal", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = p.getString("server_url", null) ?: BuildConfig.DEFAULT_SERVER_URL
        set(v) = p.edit().putString("server_url", v.trimEnd('/')).apply()

    var token: String?
        get() = p.getString("surface_token", null)
        set(v) = p.edit().putString("surface_token", v).apply()

    var surfaceName: String?
        get() = p.getString("surface_name", null)
        set(v) = p.edit().putString("surface_name", v).apply()

    fun clearPairing() = p.edit().remove("surface_token").remove("surface_name").apply()
}
