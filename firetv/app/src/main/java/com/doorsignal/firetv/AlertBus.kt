package com.doorsignal.firetv

import android.os.Handler
import android.os.Looper
import org.json.JSONObject

/** In-process bus between SignalService and the visible activities (main thread delivery). */
object AlertBus {
    data class Alert(
        val eventId: String,
        val kind: String, // "door" | "badge"
        val deviceName: String,
        val at: Long,
        val origin: String, // "ring" | "simulated" | "replay"
        val imageUrl: String?,
    ) {
        companion object {
            fun from(j: JSONObject) = Alert(
                eventId = j.getString("event_id"),
                kind = j.optString("kind", "door"),
                deviceName = j.optString("device_name", "Front door"),
                at = j.optLong("at", System.currentTimeMillis()),
                origin = j.optString("origin", "ring"),
                imageUrl = j.optString("image_url").takeIf { it.isNotEmpty() && it != "null" },
            )
        }
    }

    interface Listener {
        fun onAlert(a: Alert) {}
        fun onImage(eventId: String, imageUrl: String?) {}
        fun onClear(eventId: String) {}
        fun onConnection(state: String) {}
    }

    private val main = Handler(Looper.getMainLooper())
    private val listeners = mutableSetOf<Listener>()

    @Volatile var connection: String = "connecting"
        private set
    @Volatile var current: Alert? = null
        private set

    fun add(l: Listener) = main.post { listeners.add(l); l.onConnection(connection) }
    fun remove(l: Listener) = main.post { listeners.remove(l) }

    fun alert(a: Alert) = main.post { if (!(a.kind == "badge" && current?.kind == "door")) current = a; listeners.toList().forEach { it.onAlert(a) } }
    fun image(id: String, url: String?) = main.post {
        current?.takeIf { it.eventId == id }?.let { current = it.copy(imageUrl = url) }
        listeners.toList().forEach { it.onImage(id, url) }
    }
    fun clear(id: String) = main.post { if (current?.eventId == id) current = null; listeners.toList().forEach { it.onClear(id) } }
    fun connection(state: String) = main.post { connection = state; listeners.toList().forEach { it.onConnection(state) } }
}
