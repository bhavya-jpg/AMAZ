package com.doorsignal.firetv

import android.app.Activity
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.concurrent.thread

/** Full-screen door alert. OK / Enter / Back acknowledges on every paired surface. */
class AlertActivity : Activity(), AlertBus.Listener {
    private val main = Handler(Looper.getMainLooper())
    private lateinit var prefs: Prefs
    private lateinit var panel: LinearLayout
    private lateinit var kind: TextView
    private lateinit var device: TextView
    private lateinit var image: ImageView
    private lateinit var noImage: TextView
    private lateinit var hint: TextView
    private lateinit var origin: TextView
    private lateinit var elapsed: TextView
    private var alert: AlertBus.Alert? = null
    private var inverted = false
    private var reportedRendered: String? = null

    private val YELLOW = Color.parseColor("#FFC400")
    private val BLUE = Color.parseColor("#4AA3FF")
    private val INK = Color.parseColor("#111111")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val frame = FrameLayout(this)
        panel = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(60, 40, 60, 40) }
        kind = big(96f, bold = true)
        device = big(34f, bold = true)
        image = ImageView(this).apply { adjustViewBounds = true; scaleType = ImageView.ScaleType.FIT_CENTER; contentDescription = "Latest image from the Ring camera" }
        noImage = big(24f)
        hint = big(28f, bold = true)
        panel.addView(kind)
        panel.addView(device)
        panel.addView(image, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, 520))
        panel.addView(noImage)
        panel.addView(hint)
        origin = TextView(this).apply { textSize = 20f; setTextColor(Color.WHITE); setBackgroundColor(Color.BLACK); setPadding(16, 6, 16, 6); typeface = Typeface.DEFAULT_BOLD }
        elapsed = TextView(this).apply { textSize = 20f; typeface = Typeface.DEFAULT_BOLD }
        frame.addView(panel, FrameLayout.LayoutParams(-1, -1))
        frame.addView(origin, FrameLayout.LayoutParams(-2, -2, Gravity.TOP or Gravity.END).apply { setMargins(0, 30, 40, 0) })
        frame.addView(elapsed, FrameLayout.LayoutParams(-2, -2, Gravity.TOP or Gravity.START).apply { setMargins(40, 30, 0, 0) })
        setContentView(frame)
    }

    private fun big(size: Float, bold: Boolean = false) = TextView(this).apply {
        textSize = size
        gravity = Gravity.CENTER
        if (bold) typeface = Typeface.DEFAULT_BOLD
        setPadding(0, 6, 0, 6)
    }

    override fun onStart() {
        super.onStart()
        Visibility.started++
        AlertBus.add(this)
        val a = AlertBus.current
        if (a == null) finish() else show(a)
        tick()
    }

    override fun onStop() {
        Visibility.started--
        AlertBus.remove(this)
        main.removeCallbacksAndMessages(null)
        super.onStop()
    }

    private fun show(a: AlertBus.Alert) {
        alert = a
        val door = a.kind == "door"
        kind.text = if (door) "DOORBELL" else "PERSON NEARBY"
        device.text = a.deviceName
        hint.text = if (door) "Press OK to acknowledge" else "No one rang — just letting you know"
        origin.visibility = if (a.origin == "ring") View.GONE else View.VISIBLE
        origin.text = if (a.origin == "simulated") "SIMULATED PRESS" else a.origin.uppercase()
        applyColors()
        loadImage(a.imageUrl)
        if (reportedRendered != a.eventId) {
            reportedRendered = a.eventId
            val token = prefs.token
            thread { runCatching { Api.post("${prefs.serverUrl}/api/events/${a.eventId}/rendered", token = token) } }
        }
        if (!door) main.postDelayed({ if (alert?.eventId == a.eventId) finish() }, 20_000)
    }

    private fun applyColors() {
        val base = if (alert?.kind == "door") YELLOW else BLUE
        val bg = if (inverted) INK else base
        val fg = if (inverted) base else INK
        panel.setBackgroundColor(bg)
        window.decorView.setBackgroundColor(bg)
        listOf(kind, device, noImage, hint, elapsed).forEach { it.setTextColor(fg) }
    }

    /** 2 flashes per second (below the 3 Hz photosensitivity threshold); off if animations are disabled. */
    private fun tick() {
        val a = alert ?: return
        val animationsOff = Settings.Global.getFloat(contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
        if (a.kind == "door" && !animationsOff) {
            inverted = !inverted
            applyColors()
        }
        elapsed.text = String.format("%.1fs ago", (System.currentTimeMillis() - a.at) / 1000.0)
        main.postDelayed({ tick() }, 250)
    }

    private fun loadImage(url: String?) {
        if (url == null) {
            image.visibility = View.GONE
            noImage.visibility = View.VISIBLE
            noImage.text = "Getting image…"
            return
        }
        thread {
            val bytes = Api.bytes(url)
            val bmp = bytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
            main.post {
                if (bmp != null) {
                    image.setImageBitmap(bmp)
                    image.visibility = View.VISIBLE
                    noImage.visibility = View.GONE
                } else {
                    image.visibility = View.GONE
                    noImage.visibility = View.VISIBLE
                    noImage.text = "No image available"
                }
            }
        }
    }

    private fun acknowledge() {
        val a = alert ?: return finish()
        val token = prefs.token
        AlertBus.clear(a.eventId)
        thread { runCatching { Api.post("${prefs.serverUrl}/api/events/${a.eventId}/ack", token = token) } }
        finish()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean = when (keyCode) {
        KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER,
        KeyEvent.KEYCODE_BUTTON_A, KeyEvent.KEYCODE_BACK -> { acknowledge(); true }
        else -> super.onKeyDown(keyCode, event)
    }

    override fun onAlert(a: AlertBus.Alert) { if (a.kind == "door" || alert?.kind != "door") show(a) }
    override fun onImage(eventId: String, imageUrl: String?) {
        if (alert?.eventId == eventId) {
            alert = alert?.copy(imageUrl = imageUrl)
            if (imageUrl == null) { noImage.visibility = View.VISIBLE; noImage.text = "No image available" } else loadImage(imageUrl)
        }
    }
    override fun onClear(eventId: String) { if (alert?.eventId == eventId) finish() }
}
