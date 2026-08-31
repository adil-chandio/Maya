package com.maya.ai.assistant.plugins;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.Locale;

/**
 * MayaSpeechPlugin
 * ----------------
 * Native Android speech recognition using the system SpeechRecognizer
 * (Google speech services). The Android WebView does NOT ship the Web Speech
 * API, so this plugin gives Maya a real microphone on all Android devices.
 *
 * Supports:
 *   - Single-shot and continuous (auto-restart) listening
 *   - Partial transcripts streamed live to the UI
 *   - Language selection (en-IN, hi-IN, ur-PK, etc.)
 */
@CapacitorPlugin(
        name = "MayaSpeech",
        permissions = {
                @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
        }
)
public class MayaSpeechPlugin extends Plugin {

    private SpeechRecognizer recognizer;
    private boolean continuous = false;
    private boolean running = false;
    private String language = "en-IN";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // =====================================================================

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject out = new JSObject();
        out.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        out.put("language", Locale.getDefault().toLanguageTag());
        out.put("success", true);
        call.resolve(out);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        language = call.getString("language", "en-IN");
        continuous = call.getBoolean("continuous", false);

        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "micPermsCallback");
            return;
        }
        startInternal(call);
    }

    @PermissionCallback
    private void micPermsCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            startInternal(call);
        } else {
            call.resolve(failure("Microphone permission nahi mili. Permissions check karein."));
        }
    }

    private void startInternal(PluginCall call) {
        mainHandler.post(() -> {
            stopRecognizer();
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.resolve(failure("Speech recognition available nahi hai. Google speech services install check karein."));
                return;
            }
            try {
                recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                recognizer.setRecognitionListener(listener);
                recognizer.startListening(buildIntent());
                running = true;
                call.resolve(success("Listening started"));
            } catch (Exception e) {
                call.resolve(failure("Speech start failed: " + e.getMessage()));
            }
        });
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        mainHandler.post(() -> {
            stopRecognizer();
            JSObject out = new JSObject();
            out.put("success", true);
            out.put("message", "Listening stopped");
            call.resolve(out);
        });
    }

    private void stopRecognizer() {
        running = false;
        if (recognizer != null) {
            try {
                recognizer.stopListening();
                recognizer.cancel();
            } catch (Exception ignored) { }
            try {
                recognizer.destroy();
            } catch (Exception ignored) { }
            recognizer = null;
        }
    }

    private Intent buildIntent() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
        return intent;
    }

    private final RecognitionListener listener = new RecognitionListener() {
        @Override
        public void onReadyForSpeech(Bundle params) {
            notify("status", "ready", null);
        }

        @Override
        public void onBeginningOfSpeech() {
            notify("status", "listening", null);
        }

        @Override
        public void onRmsChanged(float rmsdB) {
            // ignore - UI polls state via status events
        }

        @Override
        public void onBufferReceived(byte[] buffer) { }

        @Override
        public void onEndOfSpeech() {
            notify("status", "processing", null);
        }

        @Override
        public void onError(int error) {
            String code = errorCode(error);
            if (continuous && running) {
                notify("error", code, null);
                restartAfter(250);
            } else {
                running = false;
                JSObject out = new JSObject();
                out.put("code", code);
                notifyListeners("error", out);
            }
        }

        @Override
        public void onResults(Bundle results) {
            ArrayList<String> heard = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            String text = heard == null || heard.isEmpty() ? "" : heard.get(0);
            if (!text.isEmpty()) {
                JSObject out = new JSObject();
                out.put("text", text);
                notifyListeners("finalTranscript", out);
            }
            if (continuous && running) {
                restartAfter(200);
            } else {
                running = false;
                notify("status", "done", null);
            }
        }

        @Override
        public void onPartialResults(Bundle partialResults) {
            ArrayList<String> partial = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            if (partial != null && !partial.isEmpty()) {
                JSObject out = new JSObject();
                out.put("text", partial.get(0));
                notifyListeners("partialTranscript", out);
            }
        }

        @Override
        public void onEvent(int eventType, Bundle params) { }
    };

    private void restartAfter(long delayMs) {
        mainHandler.postDelayed(() -> {
            if (!running || recognizer != null) return;
            try {
                recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                recognizer.setRecognitionListener(listener);
                recognizer.startListening(buildIntent());
            } catch (Exception ignored) { }
        }, delayMs);
    }

    private void notify(String event, String value, String extra) {
        JSObject out = new JSObject();
        out.put(event, value);
        if (extra != null) out.put("extra", extra);
        notifyListeners(event, out);
    }

    private String errorCode(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_NO_MATCH: return "no_match";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "speech_timeout";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "recognizer_busy";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "permission_denied";
            case SpeechRecognizer.ERROR_NETWORK: return "network";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "network_timeout";
            case SpeechRecognizer.ERROR_CLIENT: return "client";
            case SpeechRecognizer.ERROR_AUDIO: return "audio";
            default: return "error_" + error;
        }
    }

    private JSObject success(String message) {
        JSObject o = new JSObject();
        o.put("success", true);
        o.put("message", message);
        return o;
    }

    private JSObject failure(String message) {
        JSObject o = new JSObject();
        o.put("success", false);
        o.put("message", message);
        return o;
    }

    @Override
    protected void handleOnDestroy() {
        stopRecognizer();
    }
}
