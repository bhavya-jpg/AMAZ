package com.doorsignal.firetv

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import okhttp3.Request
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import org.json.JSONObject

/**
 * Foreground service that keeps one SSE connection to the DoorSignal server and turns
 * door alerts into a full-screen AlertActivity (app visible) or a high-priority
 * notification with a full-screen intent (app in background).
 *
 * Whether Fire OS shows that notification over another app's playback is NOT verified;
 * see docs/poc-results.md (gate F5).
 */
class SignalService : Service() {
    private val main = Handler(Looper.getMainLooper())
    private var source: EventSource? = null
    private var backoffMs = 1000L
    private var stopped = false
    private lateinit var prefs: Prefs

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        prefs = Prefs(this)
        createChannels(this)
        val n = statusNotification("Watching the door")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(STATUS_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(STATUS_ID, n)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (source == null) connect()
        return START_STICKY
    }

    override fun onDestroy() {
        stopped = true
        source?.cancel()
        main.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    private fun connect() {
        val token = prefs.token ?: run { stopSelf(); return }
        AlertBus.connection("connecting")
        val req = Request.Builder()
            .url("${prefs.serverUrl}/api/surfaces/stream")
            .header("Authorization", "Bearer $token")
            .header("Accept", "text/event-stream")
            .build()
        source = EventSources.createFactory(Api.stream).newEventSource(req, object : EventSourceListener() {
            override fun onOpen(eventSource: EventSource, response: Response) {
                backoffMs = 1000L
                AlertBus.connection("connected")
            }

            override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
                val j = runCatching { JSONObject(data) }.getOrNull() ?: return
                when (type) {
                    "alert" -> onAlert(AlertBus.Alert.from(j).let { it.copy(imageUrl = absolute(it.imageUrl)) })
                    "update" -> AlertBus.image(j.getString("event_id"), absolute(j.optString("image_url").takeIf { it.isNotEmpty() && it != "null" }))
                    "clear" -> {
                        val eid = j.getString("event_id")
                        AlertBus.clear(eid)
                        notifications().cancel(eid.hashCode())
                    }
                }
            }

            override fun onClosed(eventSource: EventSource) = retry()

            override fun onFailure(eventSource: EventSource, t: Throwable?, response: Response?) {
                if (response?.code == 401) {
                    Log.w(TAG, "surface token rejected — pairing removed")
                    prefs.clearPairing()
                    AlertBus.connection("unpaired")
                    stopSelf()
                    return
                }
                Log.w(TAG, "stream failed: ${t?.message ?: response?.code}")
                retry()
            }
        })
    }

    private fun retry() {
        if (stopped) return
        source = null
        AlertBus.connection("reconnecting")
        main.postDelayed({ if (!stopped) connect() }, backoffMs)
        backoffMs = (backoffMs * 2).coerceAtMost(10_000L)
    }

    private fun absolute(path: String?): String? =
        path?.let { if (it.startsWith("http")) it else "${prefs.serverUrl}$it" }

    private fun onAlert(a: AlertBus.Alert) {
        AlertBus.alert(a)
        val open = Intent(this, AlertActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        if (Visibility.appVisible) {
            startActivity(open)
            return
        }
        // Background: high-priority notification. On Android 10+ apps may not start activities
        // from the background, so the full-screen intent is the documented route.
        val pi = PendingIntent.getActivity(this, a.eventId.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val title = if (a.kind == "door") "DOORBELL — ${a.deviceName}" else "Person near ${a.deviceName}"
        val text = if (a.origin == "ring") "Press to view" else "Press to view (${a.origin.uppercase()})"
        val b = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, ALERT_CHANNEL) else @Suppress("DEPRECATION") Notification.Builder(this).setPriority(Notification.PRIORITY_MAX)
        b.setSmallIcon(R.drawable.ic_notify)
            .setContentTitle(title)
            .setContentText(text)
            .setCategory(Notification.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pi)
        if (a.kind == "door") b.setFullScreenIntent(pi, true)
        notifications().notify(a.eventId.hashCode(), b.build())
    }

    private fun notifications() = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    private fun statusNotification(text: String): Notification {
        val pi = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val b = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, STATUS_CHANNEL) else @Suppress("DEPRECATION") Notification.Builder(this)
        return b.setSmallIcon(R.drawable.ic_notify).setContentTitle("DoorSignal").setContentText(text).setContentIntent(pi).setOngoing(true).build()
    }

    companion object {
        private const val TAG = "DoorSignal"
        const val ALERT_CHANNEL = "door_alerts"
        const val STATUS_CHANNEL = "status"
        private const val STATUS_ID = 1

        fun createChannels(ctx: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            // Fire OS 7+ drops notifications without a channel; heads-up requires high importance.
            nm.createNotificationChannel(NotificationChannel(ALERT_CHANNEL, "Door alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Doorbell presses and people at the door"
                enableVibration(true)
            })
            nm.createNotificationChannel(NotificationChannel(STATUS_CHANNEL, "Connection status", NotificationManager.IMPORTANCE_MIN))
        }

        fun start(ctx: Context) {
            val i = Intent(ctx, SignalService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i) else ctx.startService(i)
        }

        fun stop(ctx: Context) = ctx.stopService(Intent(ctx, SignalService::class.java))
    }
}

/** Tracks whether one of our activities is in the foreground. */
object Visibility {
    @Volatile var started = 0
    val appVisible get() = started > 0
}
