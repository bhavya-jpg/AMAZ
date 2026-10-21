package com.doorsignal.firetv

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Small blocking HTTP helpers. Call off the main thread. */
object Api {
    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    /** SSE needs an unbounded read timeout; the server pings every 15 s. */
    val stream: OkHttpClient = http.newBuilder().readTimeout(0, TimeUnit.SECONDS).build()

    private val JSON = "application/json".toMediaType()

    data class Result(val code: Int, val body: JSONObject)

    fun post(url: String, json: JSONObject = JSONObject(), token: String? = null): Result {
        val req = Request.Builder().url(url).post(json.toString().toRequestBody(JSON))
        if (token != null) req.header("Authorization", "Bearer $token")
        http.newCall(req.build()).execute().use { r ->
            val text = r.body?.string().orEmpty()
            return Result(r.code, runCatching { JSONObject(text) }.getOrElse { JSONObject() })
        }
    }

    fun get(url: String): Result {
        http.newCall(Request.Builder().url(url).build()).execute().use { r ->
            val text = r.body?.string().orEmpty()
            return Result(r.code, runCatching { JSONObject(text) }.getOrElse { JSONObject() })
        }
    }

    fun bytes(url: String): ByteArray? =
        runCatching { http.newCall(Request.Builder().url(url).build()).execute().use { if (it.isSuccessful) it.body?.bytes() else null } }.getOrNull()
}
