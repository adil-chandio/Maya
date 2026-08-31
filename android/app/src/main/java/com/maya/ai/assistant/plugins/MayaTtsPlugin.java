package com.maya.ai.assistant.plugins;

import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.Locale;
import java.util.UUID;

/**
 * MayaTtsPlugin
 * -------------
 * Native Android text-to-speech using the system TTS engine
 * (Google Text-to-Speech, usually pre-installed).
 *
 * More reliable + lower latency than WebView speechSynthesis on Android,
 * and supports Hindi / Urdu / regional voices out of the box.
 */
@CapacitorPlugin(name = "MayaTts")
public class MayaTtsPlugin extends Plugin {

    private TextToSpeech tts;
    private boolean ready = false;
    private String currentLanguage = "en-IN";
    private String utteranceId = "";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private synchronized void ensureInit() {
        if (tts != null) return;
        tts = new TextToSpeech(getContext(), status -> {
            ready = status == TextToSpeech.SUCCESS;
            if (ready) {
                applyLanguage(currentLanguage);
            }
        });
    }

    private void applyLanguage(String languageTag) {
        if (tts == null || !ready) return;
        Locale locale = Locale.forLanguageTag(languageTag);
        int result = tts.setLanguage(locale);
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            // Fallback to English
            tts.setLanguage(Locale.US);
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        ensureInit();
        JSObject out = new JSObject();
        out.put("available", true);
        out.put("ready", ready);
        out.put("language", currentLanguage);
        out.put("success", true);
        call.resolve(out);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        final String text = call.getString("text", "");
        final float rate = (float) call.getDouble("rate", 1.0);
        final float pitch = (float) call.getDouble("pitch", 1.0);
        final String language = call.getString("language", "en-IN");
        currentLanguage = language;
        utteranceId = UUID.randomUUID().toString();

        if (text.isEmpty()) {
            call.resolve(failure("Kuch bolne ke liye text nahi hai."));
            return;
        }

        ensureInit();
        if (!ready) {
            call.resolve(failure("TTS engine abhi ready nahi hai. Thodi der baad try karein."));
            return;
        }

        mainHandler.post(() -> {
            try {
                applyLanguage(language);
                tts.setSpeechRate(rate);
                tts.setPitch(pitch);
                if (tts.getEngines().isEmpty()) {
                    call.resolve(failure("Koi TTS engine installed nahi hai. Google TTS install karein."));
                    return;
                }
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String id) {
                        JSObject out = new JSObject();
                        out.put("id", id);
                        notifyListeners("start", out);
                    }

                    @Override
                    public void onDone(String id) {
                        JSObject out = new JSObject();
                        out.put("id", id);
                        notifyListeners("end", out);
                    }

                    @Override
                    public void onError(String id) {
                        JSObject out = new JSObject();
                        out.put("id", id);
                        notifyListeners("error", out);
                    }
                });
                int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
                if (result == TextToSpeech.ERROR) {
                    call.resolve(failure("TTS speak failed (engine error)."));
                } else {
                    JSObject out = success("Speaking");
                    out.put("id", utteranceId);
                    call.resolve(out);
                }
            } catch (Exception e) {
                call.resolve(failure("TTS error: " + e.getMessage()));
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        mainHandler.post(() -> {
            if (tts != null) {
                tts.stop();
            }
            JSObject out = new JSObject();
            out.put("success", true);
            out.put("message", "Stopped speaking");
            call.resolve(out);
        });
    }

    @PluginMethod
    public void getVoices(PluginCall call) {
        ensureInit();
        if (!ready || tts == null) {
            call.resolve(failure("TTS engine ready nahi hai."));
            return;
        }
        JSArray voices = new JSArray();
        for (android.speech.tts.Voice v : tts.getVoices()) {
            JSObject o = new JSObject();
            o.put("name", v.getName());
            o.put("language", v.getLocale().toLanguageTag());
            o.put("quality", v.getQuality());
            try {
                voices.put(o);
            } catch (JSONException ignored) { }
        }
        JSObject out = new JSObject();
        out.put("voices", voices);
        out.put("success", true);
        call.resolve(out);
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
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) { }
            tts = null;
        }
    }
}
