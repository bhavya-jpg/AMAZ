package com.doorsignal.firetv

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import java.text.DateFormat
import java.util.Date
import kotlin.concurrent.thread

/** Setup → pairing code → "watching the door" screen. Fully usable with a Fire TV remote (D-pad). */
class MainActivity : Activity(), AlertBus.Listener {
    private lateinit var prefs: Prefs
    private val main = Handler(Looper.getMainLooper())
    private var pollingPairing: String? = null
    private lateinit var root: LinearLayout
    private var statusText: TextView? = null
    private var clockText: TextView? = null

    private val YELLOW = Color.parseColor("#FFC400")
    private val MUTED = Color.parseColor("#A7B0BC")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(80, 60, 80, 60)
        }
        setContentView(root)
        SignalService.createChannels(this)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
    }

    override fun onStart() {
        super.onStart()
        Visibility.started++
        AlertBus.add(this)
        render()
        // An alert that arrived while we were away is shown immediately.
        if (AlertBus.current?.kind == "door") startActivity(Intent(this, AlertActivity::class.java))
    }

    override fun onStop() {
        Visibility.started--
        AlertBus.remove(this)
        pollingPairing = null
        main.removeCallbacksAndMessages(null)
        super.onStop()
    }

    private fun render() {
        root.removeAllViews()
        if (prefs.token == null) renderSetup() else renderPaired()
    }

    private fun text(s: String, size: Float, color: Int = Color.WHITE, bold: Boolean = false) = TextView(this).apply {
        text = s
        textSize = size
        setTextColor(color)
        gravity = Gravity.CENTER
        if (bold) typeface = Typeface.DEFAULT_BOLD
        setPadding(0, 8, 0, 8)
    }

    private fun button(label: String, onClick: () -> Unit) = Button(this).apply {
        text = label
        textSize = 20f
        isFocusable = true
        setOnClickListener { onClick() }
    }

    // ---------- not paired ----------
    private fun renderSetup() {
        root.addView(text("DoorSignal", 44f, YELLOW, bold = true))
        root.addView(text("Your Ring doorbell, on this TV.", 22f, MUTED))
        root.addView(text("Server address", 18f, MUTED))
        val url = EditText(this).apply {
            setText(prefs.serverUrl)
            textSize = 22f
            setTextColor(Color.WHITE)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine()
        }
        root.addView(url, LinearLayout.LayoutParams(900, LinearLayout.LayoutParams.WRAP_CONTENT))
        val err = text("", 18f, Color.parseColor("#FF5C5C"))
        val go = button("Get pairing code") {
            prefs.serverUrl = url.text.toString().trim()
            startPairing(err)
        }
        root.addView(go)
        root.addView(err)
        go.requestFocus()
    }

    private fun startPairing(err: TextView) {
        err.text = "Contacting server…"
        thread {
            val r = runCatching { Api.post("${prefs.serverUrl}/api/surfaces/pair/start", JSONObject().put("type", "firetv").put("name", "Fire TV")) }
            main.post {
                val res = r.getOrNull()
                if (res == null || res.code != 200) {
                    err.text = "Could not reach ${prefs.serverUrl} (${r.exceptionOrNull()?.message ?: res?.body?.optString("error")})"
                    return@post
                }
                showCode(res.body.getString("code"), res.body.getString("pairing_id"))
            }
        }
    }

    private fun showCode(code: String, pairingId: String) {
        root.removeAllViews()
        root.addView(text("Pair this TV", 34f, bold = true))
        root.addView(text("Enter this code in the DoorSignal console:", 22f, MUTED))
        root.addView(text(code.chunked(3).joinToString(" "), 96f, YELLOW, bold = true))
        root.addView(button("Cancel") { pollingPairing = null; render() })
        pollingPairing = pairingId
        pollPairing(pairingId)
    }

    private fun pollPairing(id: String) {
        if (pollingPairing != id) return
        thread {
            val r = runCatching { Api.get("${prefs.serverUrl}/api/surfaces/pair/$id") }.getOrNull()
            main.post {
                if (pollingPairing != id) return@post
                when (r?.body?.optString("status")) {
                    "approved" -> {
                        prefs.token = r.body.getString("surface_token")
                        prefs.surfaceName = r.body.optString("name", "Fire TV")
                        pollingPairing = null
                        SignalService.start(this)
                        render()
                    }
                    "expired", "unknown" -> { pollingPairing = null; render() }
                    else -> main.postDelayed({ pollPairing(id) }, 1500)
                }
            }
        }
    }

    // ---------- paired ----------
    private fun renderPaired() {
        SignalService.start(this)
        clockText = text("", 120f, bold = true)
        root.addView(clockText)
        root.addView(text("DoorSignal is watching the door", 30f, bold = true))
        root.addView(text("${prefs.surfaceName ?: "Fire TV"} · ${prefs.serverUrl}", 18f, MUTED))
        statusText = text("", 20f)
        root.addView(statusText)
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER }
        row.addView(button("Unpair") {
            SignalService.stop(this)
            prefs.clearPairing()
            render()
        })
        root.addView(row)
        onConnection(AlertBus.connection)
        tickClock()
    }

    private fun tickClock() {
        clockText?.text = DateFormat.getTimeInstance(DateFormat.SHORT).format(Date())
        main.postDelayed({ tickClock() }, 10_000)
    }

    override fun onConnection(state: String) {
        val s = statusText ?: return
        s.text = "● " + when (state) { "connected" -> "connected"; "unpaired" -> "pairing removed — pair again"; else -> "$state…" }
        s.setTextColor(if (state == "connected") Color.parseColor("#39D98A") else Color.parseColor("#FF5C5C"))
        if (state == "unpaired") render()
    }

    override fun onAlert(a: AlertBus.Alert) {
        // SignalService opens AlertActivity directly while we are visible.
        statusText?.visibility = View.VISIBLE
    }
}
