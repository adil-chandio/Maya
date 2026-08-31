package com.maya.ai.assistant.plugins;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.BatteryManager;
import android.os.Build;
import android.provider.AlarmClock;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import com.maya.ai.assistant.services.MayaAccessibilityService;

import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

/**
 * MayaAutomationPlugin
 * --------------------
 * Native device-control bridge between the Maya web app (Capacitor WebView)
 * and the Android OS.
 *
 * Powered features:
 *   - Volume / Brightness control
 *   - Torch (flashlight) toggle
 *   - WiFi / Bluetooth (best-effort; Android 10+ blocks programmatic control)
 *   - Launch any installed app by name or package
 *   - Set alarms through the system clock (AlarmClock API)
 *   - Open system settings screens (accessibility, write-settings, ...)
 *   - UI automation + screenshots via MayaAccessibilityService
 *   - Device info (battery, model, OS, perms state)
 */
@CapacitorPlugin(
        name = "MayaAutomation",
        permissions = {
                @Permission(strings = { Manifest.permission.CAMERA }, alias = "camera"),
                @Permission(
                        strings = { Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH },
                        alias = "bluetooth")
        }
)
public class MayaAutomationPlugin extends Plugin {

    // =====================================================================
    // DEVICE INFO
    // =====================================================================

    @PluginMethod
    public void getDeviceInfo(PluginCall call) {
        JSObject info = new JSObject();
        info.put("model", Build.MODEL);
        info.put("manufacturer", Build.MANUFACTURER);
        info.put("androidVersion", Build.VERSION.RELEASE);
        info.put("sdkInt", Build.VERSION.SDK_INT);
        info.put("appVersion", getContext().getPackageName());

        BatteryManager bm = (BatteryManager) getContext().getSystemService(Context.BATTERY_SERVICE);
        if (bm != null) {
            int level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
            info.put("battery", level >= 0 ? level : -1);
            info.put("charging", bm.isCharging());
        }

        info.put("canWriteSettings", canWriteSettings());
        info.put("accessibilityEnabled", MayaAccessibilityService.isConnected());
        info.put("torchAvailable", hasTorchCamera());

        call.resolve(info);
    }

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject caps = new JSObject();
        caps.put("deviceInfo", true);
        caps.put("volume", true);
        caps.put("brightness", Settings.System.canWrite(getContext()));
        caps.put("torch", hasTorchCamera());
        caps.put("wifi", false); // Android 10+ blocks programmatic wifi toggle
        caps.put("bluetooth", false); // Android 13+ blocks programmatic toggle
        caps.put("alarm", true);
        caps.put("launchApp", true);
        caps.put("uiAutomation", MayaAccessibilityService.isConnected());
        caps.put("screenshot", Build.VERSION.SDK_INT >= 30 && MayaAccessibilityService.isConnected());
        call.resolve(caps);
    }

    @PluginMethod
    public void isAccessibilityEnabled(PluginCall call) {
        JSObject res = new JSObject();
        res.put("enabled", MayaAccessibilityService.isConnected());
        call.resolve(res);
    }

    // =====================================================================
    // APP LAUNCH
    // =====================================================================

    @PluginMethod
    public void launchApp(PluginCall call) {
        String pkg = call.getString("packageName");
        String name = call.getString("name");

        PackageManager pm = getContext().getPackageManager();

        // Resolve by name if no package given
        if (pkg == null || pkg.isEmpty()) {
            if (name == null || name.isEmpty()) {
                call.resolve(failure("Kya launch karna hai? App ka naam batayein."));
                return;
            }
            pkg = resolvePackageByName(pm, name);
            if (pkg == null) {
                // Not installed -> Play Store search
                Intent store = new Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://play.google.com/store/search?q=" + Uri.encode(name)));
                store.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    launchIntent(store);
                    call.resolve(failure("App installed nahi mila. Play Store me search khol diya."));
                } catch (Exception e) {
                    call.resolve(failure("App nahi mila aur Play Store nahi khul paya."));
                }
                return;
            }
        }

        Intent launch = pm.getLaunchIntentForPackage(pkg);
        if (launch == null) {
            call.resolve(failure("App ka launcher intent nahi mila: " + pkg));
            return;
        }
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            launchIntent(launch);
            call.resolve(success("App open kar diya: " + pkg));
        } catch (Exception e) {
            call.resolve(failure("App launch nahi hua: " + e.getMessage()));
        }
    }

    private String resolvePackageByName(PackageManager pm, String name) {
        String q = normalize(name);
        List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
        String best = null;
        int bestScore = 0;
        for (ApplicationInfo ai : apps) {
            String pkg = ai.packageName;
            if (pm.getLaunchIntentForPackage(pkg) == null) continue;
            String label = pm.getApplicationLabel(ai).toString();
            String nLabel = normalize(label);
            String nPkg = normalize(pkg);

            int score = 0;
            if (nPkg.equals(q)) score = 100;
            else if (nLabel.equals(q)) score = 90;
            else if (nLabel.contains(q)) score = 60;
            else if (nPkg.contains(q)) score = 50;
            else if (label.toLowerCase(Locale.ROOT).contains(q)) score = 40;

            if (score > bestScore) {
                bestScore = score;
                best = pkg;
            }
        }
        return best;
    }

    private String normalize(String s) {
        return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        int limit = call.getInt("limit", 200);
        PackageManager pm = getContext().getPackageManager();
        List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
        JSArray result = new JSArray();
        int count = 0;
        for (ApplicationInfo ai : apps) {
            if (count >= limit) break;
            if (pm.getLaunchIntentForPackage(ai.packageName) == null) continue;
            JSObject app = new JSObject();
            app.put("name", pm.getApplicationLabel(ai).toString());
            app.put("packageName", ai.packageName);
            app.put("isSystem", (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0);
            result.put(app);
            count++;
        }
        JSObject out = new JSObject();
        out.put("apps", result);
        out.put("total", count);
        call.resolve(out);
    }

    // =====================================================================
    // VOLUME
    // =====================================================================

    @PluginMethod
    public void setVolume(PluginCall call) {
        int level = call.getInt("level", 50);
        String streamName = call.getString("stream", "music");
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (am == null) {
            call.resolve(failure("Audio service available nahi hai."));
            return;
        }
        int stream = parseStream(streamName);
        int max = am.getStreamMaxVolume(stream);
        int target = Math.round(Math.max(0, Math.min(100, level)) / 100f * max);
        try {
            am.setStreamVolume(stream, target, AudioManager.FLAG_SHOW_UI);
        } catch (SecurityException e) {
            call.resolve(failure("Volume control blocked: " + e.getMessage()));
            return;
        }
        JSObject out = success("Volume set to " + Math.round(target * 100f / max) + "%");
        out.put("level", Math.round(target * 100f / max));
        out.put("stream", streamName);
        call.resolve(out);
    }

    @PluginMethod
    public void getVolume(PluginCall call) {
        String streamName = call.getString("stream", "music");
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (am == null) {
            call.resolve(failure("Audio service available nahi hai."));
            return;
        }
        int stream = parseStream(streamName);
        int max = am.getStreamMaxVolume(stream);
        int current = am.getStreamVolume(stream);
        JSObject out = new JSObject();
        out.put("level", max == 0 ? 0 : Math.round(current * 100f / max));
        out.put("stream", streamName);
        out.put("muted", current == 0);
        out.put("success", true);
        call.resolve(out);
    }

    private int parseStream(String name) {
        switch (name.toLowerCase(Locale.ROOT)) {
            case "ring": return AudioManager.STREAM_RING;
            case "alarm": return AudioManager.STREAM_ALARM;
            case "notification": return AudioManager.STREAM_NOTIFICATION;
            case "call": return AudioManager.STREAM_VOICE_CALL;
            case "music":
            default: return AudioManager.STREAM_MUSIC;
        }
    }

    // =====================================================================
    // BRIGHTNESS
    // =====================================================================

    @PluginMethod
    public void setBrightness(PluginCall call) {
        int level = call.getInt("level", 50);
        if (!canWriteSettings()) {
            JSObject out = failure("Write Settings permission nahi hai. Chhodo — settings screen khol raha hoon.");
            out.put("needsPermission", true);
            call.resolve(out);
            return;
        }
        int value = Math.round(Math.max(0, Math.min(100, level)) / 100f * 255);
        try {
            Settings.System.putInt(getContext().getContentResolver(),
                    Settings.System.SCREEN_BRIGHTNESS_MODE,
                    Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL);
            Settings.System.putInt(getContext().getContentResolver(),
                    Settings.System.SCREEN_BRIGHTNESS, value);
        } catch (SecurityException e) {
            call.resolve(failure("Brightness control blocked: " + e.getMessage()));
            return;
        }
        JSObject out = success("Brightness set to " + level + "%");
        out.put("level", level);
        call.resolve(out);
    }

    @PluginMethod
    public void canWriteSettings(PluginCall call) {
        JSObject out = new JSObject();
        out.put("canWrite", canWriteSettings());
        out.put("success", true);
        call.resolve(out);
    }

    /** Settings.System.canWrite() sirf API 23+ hai; chhote versions me WRITE_SETTINGS install par grant hota tha. */
    private boolean canWriteSettings() {
        if (Build.VERSION.SDK_INT < 23) return true;
        return Settings.System.canWrite(getContext());
    }

    // =====================================================================
    // TORCH
    // =====================================================================

    @PluginMethod
    public void setTorch(PluginCall call) {
        if (!hasTorchCamera()) {
            call.resolve(failure("Is device par torch/flash available nahi hai."));
            return;
        }
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "torchPermsCallback");
            return;
        }
        setTorchInternal(call);
    }

    @PermissionCallback
    private void torchPermsCallback(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            setTorchInternal(call);
        } else {
            call.resolve(failure("Torch ke liye camera permission chahiye."));
        }
    }

    private void setTorchInternal(PluginCall call) {
        boolean on = call.getBoolean("on", true);
        try {
            CameraManager cm = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
            String cameraId = null;
            for (String id : cm.getCameraIdList()) {
                CameraCharacteristics c = cm.getCameraCharacteristics(id);
                Boolean flash = c.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                if (flash != null && flash) {
                    cameraId = id;
                    break;
                }
            }
            if (cameraId == null) {
                call.resolve(failure("Torch camera nahi mila."));
                return;
            }
            cm.setTorchMode(cameraId, on);
            call.resolve(success(on ? "Torch on kar diya" : "Torch off kar diya"));
        } catch (Exception e) {
            call.resolve(failure("Torch control failed: " + e.getMessage()));
        }
    }

    private boolean hasTorchCamera() {
        try {
            CameraManager cm = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
            if (cm == null) return false;
            for (String id : cm.getCameraIdList()) {
                CameraCharacteristics c = cm.getCameraCharacteristics(id);
                Boolean flash = c.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                if (flash != null && flash) return true;
            }
        } catch (Exception ignored) { }
        return false;
    }

    // =====================================================================
    // WIFI / BLUETOOTH (best-effort on modern Android)
    // =====================================================================

    @PluginMethod
    public void toggleWifi(PluginCall call) {
        boolean on = call.getBoolean("on", true);
        try {
            WifiManager wm = (WifiManager) getContext().getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            if (wm == null) {
                call.resolve(failure("WiFi service nahi mila."));
                return;
            }
            Method m = WifiManager.class.getMethod("setWifiEnabled", boolean.class);
            Object r = m.invoke(wm, on);
            boolean ok = (Boolean) r;
            call.resolve(ok ? success(on ? "WiFi on kar diya" : "WiFi off kar diya")
                    : failure("WiFi toggle failed."));
        } catch (Throwable t) {
            // Android 10+ blocks this API - open settings instead
            Intent i = new Intent(Settings.ACTION_WIFI_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                launchIntent(i);
            } catch (Exception ignored) { }
            call.resolve(failure("Android 10+ WiFi programmatically block karta hai — WiFi settings khol diye."));
        }
    }

    @PluginMethod
    public void toggleBluetooth(PluginCall call) {
        boolean on = call.getBoolean("on", true);
        if (getPermissionState("bluetooth") != PermissionState.GRANTED) {
            requestPermissionForAlias("bluetooth", call, "bluetoothPermsCallback");
            return;
        }
        toggleBluetoothInternal(call, on);
    }

    @PermissionCallback
    private void bluetoothPermsCallback(PluginCall call) {
        boolean on = call.getBoolean("on", true);
        if (getPermissionState("bluetooth") == PermissionState.GRANTED) {
            toggleBluetoothInternal(call, on);
        } else {
            call.resolve(failure("Bluetooth permission nahi mili."));
        }
    }

    private void toggleBluetoothInternal(PluginCall call, boolean on) {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                call.resolve(failure("Is device par Bluetooth nahi hai."));
                return;
            }
            boolean ok = on ? adapter.enable() : adapter.disable();
            call.resolve(ok ? success(on ? "Bluetooth on kar diya" : "Bluetooth off kar diya")
                    : failure("Bluetooth toggle failed."));
        } catch (SecurityException e) {
            // Android 13+ blocks this - open settings instead
            Intent i = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                launchIntent(i);
            } catch (Exception ignored) { }
            call.resolve(failure("Android 13+ Bluetooth programmatically block karta hai — Bluetooth settings khol diye."));
        }
    }

    // =====================================================================
    // ALARM
    // =====================================================================

    @PluginMethod
    public void setAlarm(PluginCall call) {
        int hours = call.getInt("hours", 7);
        int minutes = call.getInt("minutes", 0);
        String label = call.getString("label", "");
        hours = Math.max(0, Math.min(23, hours));
        minutes = Math.max(0, Math.min(59, minutes));

        Intent alarm = new Intent(AlarmClock.ACTION_SET_ALARM);
        alarm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        alarm.putExtra(AlarmClock.EXTRA_HOUR, hours);
        alarm.putExtra(AlarmClock.EXTRA_MINUTES, minutes);
        alarm.putExtra(AlarmClock.EXTRA_SKIP_UI, true);
        if (label != null && !label.isEmpty()) {
            alarm.putExtra(AlarmClock.EXTRA_MESSAGE, label);
        }
        try {
            launchIntent(alarm);
            String time = String.format(Locale.ROOT, "%02d:%02d", hours, minutes);
            call.resolve(success("Alarm set for " + time + (label.isEmpty() ? "" : " (" + label + ")")));
        } catch (Exception e) {
            // Try opening the clock app
            try {
                Intent clock = getContext().getPackageManager().getLaunchIntentForPackage("com.google.android.deskclock");
                if (clock == null) {
                    clock = getContext().getPackageManager().getLaunchIntentForPackage("com.android.deskclock");
                }
                if (clock != null) {
                    clock.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    launchIntent(clock);
                    call.resolve(failure("System alarm API blocked — Clock app khol diya. Alarm manual set karein."));
                } else {
                    call.resolve(failure("Alarm set nahi ho paya — Clock app nahi mila."));
                }
            } catch (Exception e2) {
                call.resolve(failure("Alarm set nahi ho paya: " + e2.getMessage()));
            }
        }
    }

    // =====================================================================
    // SETTINGS SCREENS
    // =====================================================================

    @PluginMethod
    public void openSettings(PluginCall call) {
        String screen = call.getString("screen", "accessibility");
        Intent i = null;
        try {
            switch (screen) {
                case "accessibility":
                    i = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                    break;
                case "write_settings":
                    i = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS,
                            Uri.parse("package:" + getContext().getPackageName()));
                    break;
                case "app":
                    i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.parse("package:" + getContext().getPackageName()));
                    break;
                case "wifi":
                    i = new Intent(Settings.ACTION_WIFI_SETTINGS);
                    break;
                case "bluetooth":
                    i = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
                    break;
                case "notifications":
                    if (Build.VERSION.SDK_INT >= 26) {
                        i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                                .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
                    } else {
                        i = new Intent(Settings.ACTION_SETTINGS);
                    }
                    break;
                default:
                    i = new Intent(Settings.ACTION_SETTINGS);
            }
            if (i != null) {
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                launchIntent(i);
                call.resolve(success("Settings screen khol di: " + screen));
            } else {
                call.resolve(failure("Unknown settings screen: " + screen));
            }
        } catch (Exception e) {
            call.resolve(failure("Settings nahi kholi: " + e.getMessage()));
        }
    }

    // =====================================================================
    // UI AUTOMATION PROXY (MayaAccessibilityService)
    // =====================================================================

    @PluginMethod
    public void uiCommand(PluginCall call) {
        String type = call.getString("type");
        JSObject params = call.getObject("params");
        if (params == null) params = new JSObject();

        if (type == null || type.isEmpty()) {
            call.resolve(failure("UI command type missing."));
            return;
        }
        if (!MayaAccessibilityService.isConnected()) {
            call.resolve(failure("Accessibility service ON nahi hai. Settings → Accessibility → Maya AI Remote Control enable karein."));
            return;
        }

        MayaAccessibilityService.getInstance().runUiCommand(type, params, result ->
                resolveOnMain(call, jsonObjectFrom(result, type)));
    }

    private JSObject jsonObjectFrom(JSONObject result, String extra) {
        JSObject out = new JSObject();
        Iterator<String> keys = result.keys();
        while (keys.hasNext()) {
            String k = keys.next();
            Object v;
            try {
                v = result.get(k); // JSONObject.get() throws JSONException
            } catch (JSONException e) {
                continue;
            }
            out.put(k, v);
        }
        if (extra != null) out.put("type", extra);
        return out;
    }

    private void resolveOnMain(PluginCall call, JSObject out) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> call.resolve(out));
        } else {
            call.resolve(out);
        }
    }

    @PluginMethod
    public void takeScreenshot(PluginCall call) {
        if (!MayaAccessibilityService.isConnected()) {
            call.resolve(failure("Screenshot ke liye Accessibility service enable hone chahiye (Settings → Accessibility → Maya AI)."));
            return;
        }
        int maxWidth = call.getInt("maxWidth", 720);
        int quality = call.getInt("quality", 70);
        JSObject params = new JSObject();
        params.put("maxWidth", maxWidth);
        params.put("quality", quality);

        MayaAccessibilityService.getInstance().runUiCommand("screenshot", params, result ->
                resolveOnMain(call, jsonObjectFrom(result, null)));
    }

    @PluginMethod
    public void getForegroundApp(PluginCall call) {
        if (!MayaAccessibilityService.isConnected()) {
            call.resolve(failure("Accessibility service ON nahi hai."));
            return;
        }
        MayaAccessibilityService.getInstance().runUiCommand("foreground", new JSObject(), result ->
                resolveOnMain(call, jsonObjectFrom(result, null)));
    }

    // =====================================================================
    // HELPERS
    // =====================================================================


    /** Plugin class startActivity() expose nahi karta — activity ke through launch karo. */
    private void launchIntent(Intent intent) {
        android.app.Activity activity = getActivity();
        if (activity != null) {
            activity.startActivity(intent);
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
}
