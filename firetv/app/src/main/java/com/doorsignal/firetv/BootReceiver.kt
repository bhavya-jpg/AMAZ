package com.doorsignal.firetv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Reconnects after the TV restarts, if this TV is paired. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED && Prefs(context).token != null) {
            runCatching { SignalService.start(context) }
        }
    }
}
