package com.maya.ai.assistant.services;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.accessibilityservice.GestureDescription;
import android.graphics.Bitmap;
import android.graphics.ColorSpace;
import android.graphics.Path;
import android.graphics.Rect;
import android.hardware.HardwareBuffer;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.view.Display;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Executor;

/**
 * MayaAccessibilityService
 * ------------------------
 * The "hands" of Maya on Android.
 *
 * This AccessibilityService lets Maya:
 *   - Tap any element on screen by text / content description
 *   - Type text into any input field (WhatsApp, Gmail, notes...)
 *   - Swipe / scroll in any direction
 *   - Press Back / Home / Recents / Open notifications / Quick settings
 *   - Read the visible text of the current screen
 *   - Wait for an element to appear, then tap it (e.g. "send" button)
 *   - Take a screenshot (Android 11+)
 *
 * ALL actions are triggered ONLY from the app (user gives the command).
 * Nothing is ever sent outside the device.
 */
public class MayaAccessibilityService extends AccessibilityService {

    public interface UiCallback {
        void onResult(JSONObject result);
    }

    private static MayaAccessibilityService instance;
    private boolean connected = false;
    private String activePackage = "";
    private String activeWindowTitle = "";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // =====================================================================
    // LIFECYCLE
    // =====================================================================

    public static MayaAccessibilityService getInstance() {
        return instance;
    }

    public static boolean isConnected() {
        return instance != null && instance.connected;
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        connected = true;

        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                    | AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
                    | AccessibilityEvent.TYPE_WINDOWS_CHANGED
                    | AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED;
            info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
            info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
                    | AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
                    | AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;
            info.notificationTimeout = 100;
            setServiceInfo(info);
        }
    }

    @Override
    public boolean onUnbind(android.content.Intent intent) {
        connected = false;
        instance = null;
        return super.onUnbind(intent);
    }

    @Override
    public void onDestroy() {
        connected = false;
        instance = null;
        super.onDestroy();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            if (event.getPackageName() != null) {
                activePackage = event.getPackageName().toString();
            }
            if (event.getClassName() != null) {
                activeWindowTitle = event.getClassName().toString();
            }
        }
    }

    @Override
    public void onInterrupt() {
        // no-op
    }

    // =====================================================================
    // PUBLIC ENTRY POINT (called by MayaAutomationPlugin)
    // =====================================================================

    /**
     * Executes a UI command on the main thread.
     * type options:
     *   tapText, tapDesc, clickByText, typeText, swipe, scroll,
     *   back, home, recents, notifications, quickSettings, powerDialog,
     *   readScreen, waitForText, screenshot, foreground, dump
     */
    public void runUiCommand(String type, JSONObject params, UiCallback callback) {
        mainHandler.post(() -> {
            try {
                handleCommand(type, params == null ? new JSONObject() : params, callback);
            } catch (Throwable t) {
                callback.onResult(error("Command failed: " + t.getMessage()));
            }
        });
    }

    private void handleCommand(String type, JSONObject params, UiCallback callback) throws JSONException {
        switch (type) {
            case "tapText":
            case "clickByText":
                tapText(params, callback, false);
                break;
            case "tapDesc":
                tapText(params, callback, true);
                break;
            case "typeText": {
                String text = params.optString("text", "");
                if (text.isEmpty()) {
                    callback.onResult(error("No text given"));
                    return;
                }
                boolean ok = typeText(text);
                callback.onResult(ok
                        ? okResult("Typed text")
                        : error("Could not find a text field. Open the app first (e.g. WhatsApp), then retry."));
                break;
            }
            case "swipe": {
                boolean ok = swipe(params);
                callback.onResult(ok ? okResult("Swiped") : error("Swipe failed"));
                break;
            }
            case "scroll": {
                String dir = params.optString("direction", "down");
                boolean ok = scroll(dir);
                callback.onResult(ok ? okResult("Scrolled " + dir) : error("Nothing scrollable found"));
                break;
            }
            case "back":
                boolean b = performGlobalAction(GLOBAL_ACTION_BACK);
                callback.onResult(b ? okResult("Pressed back") : error("Back failed"));
                break;
            case "home":
                boolean h = performGlobalAction(GLOBAL_ACTION_HOME);
                callback.onResult(h ? okResult("Went home") : error("Home failed"));
                break;
            case "recents":
                boolean r = performGlobalAction(GLOBAL_ACTION_RECENTS);
                callback.onResult(r ? okResult("Opened recents") : error("Recents failed"));
                break;
            case "notifications":
                boolean n = performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS);
                callback.onResult(n ? okResult("Opened notification shade") : error("Notifications failed"));
                break;
            case "quickSettings":
                boolean q = performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS);
                callback.onResult(q ? okResult("Opened quick settings") : error("Quick settings failed"));
                break;
            case "powerDialog":
                if (Build.VERSION.SDK_INT >= 28) {
                    boolean p = performGlobalAction(GLOBAL_ACTION_POWER_DIALOG);
                    callback.onResult(p ? okResult("Opened power menu") : error("Power menu failed"));
                } else {
                    callback.onResult(error("Power menu needs Android 9+"));
                }
                break;
            case "readScreen": {
                int maxLen = params.optInt("maxLength", 4000);
                String screen = readScreen(maxLen);
                JSONObject res = okResult("Screen read");
                res.put("text", screen);
                res.put("packageName", activePackage);
                callback.onResult(res);
                break;
            }
            case "waitForText": {
                String text = params.optString("text", "");
                int timeoutMs = params.optInt("timeoutMs", 8000);
                boolean autoTap = params.optBoolean("tap", true);
                boolean found = waitForText(text, timeoutMs, autoTap);
                JSONObject res = found
                        ? okResult("Found \"" + text + "\"" + (autoTap ? " and tapped" : ""))
                        : error("Did not find \"" + text + "\" in time");
                res.put("found", found);
                callback.onResult(res);
                break;
            }
            case "screenshot":
                takeScreenshot(params, callback);
                break;
            case "foreground": {
                JSONObject res = okResult("Foreground app");
                res.put("packageName", activePackage);
                res.put("windowTitle", activeWindowTitle);
                callback.onResult(res);
                break;
            }
            case "dump": {
                JSONObject res = okResult("UI dump");
                res.put("text", dumpViewHierarchy(params.optInt("maxDepth", 10), params.optInt("maxLen", 6000)));
                callback.onResult(res);
                break;
            }
            default:
                callback.onResult(error("Unknown UI command: " + type));
        }
    }

    // =====================================================================
    // HELPERS: find + tap
    // =====================================================================

    private interface NodeMatch {
        boolean matches(AccessibilityNodeInfo node);
    }

    private List<AccessibilityNodeInfo> findNodes(NodeMatch match, int max) {
        List<AccessibilityNodeInfo> out = new ArrayList<>();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return out;
        collect(root, match, out, 0, max);
        return out;
    }

    private void collect(AccessibilityNodeInfo node, NodeMatch match, List<AccessibilityNodeInfo> out, int depth, int max) {
        if (node == null || depth > 14 || out.size() >= max) return;
        if (match.matches(node)) out.add(node);
        for (int i = 0; i < node.getChildCount(); i++) {
            collect(node.getChild(i), match, out, depth + 1, max);
        }
    }

    private boolean textMatches(String candidate, String query, boolean exact) {
        if (candidate == null || query == null) return false;
        String c = candidate.trim().toLowerCase();
        String q = query.trim().toLowerCase();
        if (c.isEmpty() || q.isEmpty()) return false;
        return exact ? c.equals(q) : c.contains(q);
    }

    private void tapText(JSONObject params, UiCallback callback, boolean useDesc) {
        String text = params.optString("text", "");
        int index = params.optInt("index", 0);
        boolean exact = params.optBoolean("exact", false);
        boolean autoClick = params.optBoolean("autoClick", true);

        if (text.isEmpty()) {
            callback.onResult(error("No text given"));
            return;
        }

        final String q = text;
        List<AccessibilityNodeInfo> nodes = findNodes(node -> {
            if (useDesc) {
                CharSequence cd = node.getContentDescription();
                return cd != null && textMatches(cd.toString(), q, exact);
            }
            CharSequence t = node.getText();
            if (t != null && textMatches(t.toString(), q, exact)) return true;
            CharSequence cd = node.getContentDescription();
            return cd != null && textMatches(cd.toString(), q, exact);
        }, 30);

        if (nodes.isEmpty()) {
            callback.onResult(error("Element \"" + text + "\" not found on screen"));
            return;
        }

        // Prefer clickable nodes
        AccessibilityNodeInfo target = null;
        if (index < nodes.size()) target = nodes.get(index);
        for (AccessibilityNodeInfo n : nodes) {
            if (n.isClickable()) { target = n; break; }
        }
        if (target == null) target = nodes.get(0);

        if (autoClick) {
            boolean clicked = clickNode(target);
            JSONObject res = clicked
                    ? okResult("Tapped \"" + text + "\"")
                    : error("Found \"" + text + "\" but could not tap it");
            res.put("found", true);
            callback.onResult(res);
        } else {
            JSONObject res = okResult("Found \"" + text + "\"");
            res.put("found", true);
            callback.onResult(res);
        }
    }

    private boolean clickNode(AccessibilityNodeInfo node) {
        AccessibilityNodeInfo n = node;
        int hops = 0;
        while (n != null && hops < 6) {
            if (n.isClickable() && n.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true;
            n = n.getParent();
            hops++;
        }
        // Last resort: ACTION_TAP (API 28+)
        return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
    }

    // =====================================================================
    // TYPE TEXT
    // =====================================================================

    private boolean typeText(String text) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;

        // 1. Try focused input first
        AccessibilityNodeInfo focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (focused != null) {
            if (setText(focused, text)) return true;
        }

        // 2. Search any editable node
        final List<AccessibilityNodeInfo> editables = new ArrayList<>();
        collect(root, AccessibilityNodeInfo::isEditable, editables, 0, 20);
        for (AccessibilityNodeInfo n : editables) {
            if (setText(n, text)) return true;
        }
        return false;
    }

    private boolean setText(AccessibilityNodeInfo node, String text) {
        if (node == null) return false;
        node.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
        if (Build.VERSION.SDK_INT >= 21) {
            Bundle args = new Bundle();
            args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
            if (node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) return true;
        }
        // Fallback: paste
        return node.performAction(AccessibilityNodeInfo.ACTION_PASTE);
    }

    // =====================================================================
    // GESTURES
    // =====================================================================

    private DisplayMetrics metrics() {
        DisplayMetrics dm = new DisplayMetrics();
        if (Build.VERSION.SDK_INT >= 30) {
            getDisplay().getRealMetrics(dm);
        } else {
            getResources().getDisplayMetrics().setTo(dm);
        }
        return dm;
    }

    private boolean swipe(JSONObject params) throws JSONException {
        DisplayMetrics dm = metrics();
        float w = dm.widthPixels;
        float h = dm.heightPixels;

        float x1, y1, x2, y2;
        int duration = params.optInt("duration", 400);

        if (params.has("x1")) {
            x1 = (float) params.optDouble("x1");
            y1 = (float) params.optDouble("y1");
            x2 = (float) params.optDouble("x2");
            y2 = (float) params.optDouble("y2");
        } else {
            String dir = params.optString("direction", "up");
            switch (dir.toLowerCase()) {
                case "left":
                    x1 = w * 0.85f; y1 = h * 0.5f; x2 = w * 0.15f; y2 = h * 0.5f; break;
                case "right":
                    x1 = w * 0.15f; y1 = h * 0.5f; x2 = w * 0.85f; y2 = h * 0.5f; break;
                case "up":
                    x1 = w * 0.5f; y1 = h * 0.8f; x2 = w * 0.5f; y2 = h * 0.2f; break;
                case "down":
                default:
                    x1 = w * 0.5f; y1 = h * 0.2f; x2 = w * 0.5f; y2 = h * 0.8f; break;
            }
        }

        return dispatchSwipe(x1, y1, x2, y2, duration);
    }

    private boolean dispatchSwipe(float x1, float y1, float x2, float y2, int duration) {
        Path path = new Path();
        path.moveTo(x1, y1);
        path.lineTo(x2, y2);
        GestureDescription.Builder builder = new GestureDescription.Builder()
                .addStroke(new GestureDescription.StrokeDescription(path, 0, duration));
        return dispatchGesture(builder.build(), null, null);
    }

    private boolean scroll(String direction) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;
        final List<AccessibilityNodeInfo> scrollables = new ArrayList<>();
        collect(root, AccessibilityNodeInfo::isScrollable, scrollables, 0, 10);
        for (AccessibilityNodeInfo n : scrollables) {
            boolean forward = !direction.equalsIgnoreCase("up");
            int action = forward
                    ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
                    : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD;
            if (n.performAction(action)) return true;
        }
        // Gesture fallback
        if (direction.equalsIgnoreCase("up")) return dispatchSwipe(500, 400, 500, 200, 300);
        return dispatchSwipe(500, 200, 500, 400, 300);
    }

    // =====================================================================
    // READ SCREEN / DUMP
    // =====================================================================

    private String readScreen(int maxLen) {
        StringBuilder sb = new StringBuilder();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return "";
        Set<String> seen = new HashSet<>();
        appendTexts(root, sb, seen, 0, maxLen);
        return sb.toString();
    }

    private void appendTexts(AccessibilityNodeInfo node, StringBuilder sb, Set<String> seen, int depth, int maxLen) {
        if (node == null || depth > 12 || sb.length() >= maxLen) return;
        if (node.getText() != null && node.getText().length() > 0) {
            String t = node.getText().toString().trim();
            String key = "T:" + t;
            if (!t.isEmpty() && seen.add(key)) {
                sb.append(t).append("\n");
            }
        }
        if (node.getContentDescription() != null && node.getContentDescription().length() > 0) {
            String t = node.getContentDescription().toString().trim();
            String key = "D:" + t;
            if (!t.isEmpty() && !seen.contains(key)) {
                sb.append(t).append("\n");
            }
        }
        if (sb.length() >= maxLen) return;
        for (int i = 0; i < node.getChildCount(); i++) {
            appendTexts(node.getChild(i), sb, seen, depth + 1, maxLen);
        }
    }

    private String dumpViewHierarchy(int maxDepth, int maxLen) {
        StringBuilder sb = new StringBuilder();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return "";
        dumpNode(root, sb, 0, maxDepth, maxLen);
        return sb.toString();
    }

    private void dumpNode(AccessibilityNodeInfo node, StringBuilder sb, int depth, int maxDepth, int maxLen) {
        if (node == null || depth > maxDepth || sb.length() >= maxLen) return;
        StringBuilder line = new StringBuilder();
        for (int i = 0; i < depth; i++) line.append("  ");
        line.append(node.getClassName()).append(" ");
        if (node.getText() != null) line.append("text=\"").append(node.getText()).append("\" ");
        if (node.getContentDescription() != null) line.append("desc=\"").append(node.getContentDescription()).append("\" ");
        line.append(node.isClickable() ? "[clickable] " : "").append(node.isEditable() ? "[editable] " : "");
        sb.append(line).append("\n");
        for (int i = 0; i < node.getChildCount(); i++) {
            dumpNode(node.getChild(i), sb, depth + 1, maxDepth, maxLen);
        }
    }

    // =====================================================================
    // WAIT FOR TEXT
    // =====================================================================

    private boolean waitForText(final String text, final int timeoutMs, final boolean tap) {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            final List<AccessibilityNodeInfo> nodes = new ArrayList<>();
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root != null) {
                collect(root, n -> {
                    CharSequence t = n.getText();
                    CharSequence cd = n.getContentDescription();
                    return (t != null && textMatches(t.toString(), text, false))
                            || (cd != null && textMatches(cd.toString(), text, false));
                }, nodes, 0, 20);
            }
            if (!nodes.isEmpty()) {
                if (tap) {
                    for (AccessibilityNodeInfo n : nodes) {
                        if (clickNode(n)) return true;
                    }
                }
                return true;
            }
            try {
                Thread.sleep(300);
            } catch (InterruptedException e) {
                break;
            }
        }
        return false;
    }

    // =====================================================================
    // SCREENSHOT (Android 11+)
    // =====================================================================

    private void takeScreenshot(JSONObject params, UiCallback callback) {
        if (Build.VERSION.SDK_INT < 30) {
            callback.onResult(error("Screenshot needs Android 11+ (API 30). This device runs API " + Build.VERSION.SDK_INT));
            return;
        }
        final int maxWidth = params.optInt("maxWidth", 720);
        final int quality = params.optInt("quality", 70);

        Executor executor = getMainExecutor();
        TakeScreenshotCallback cb = new TakeScreenshotCallback() {
            @Override
            public void onSuccess(ScreenshotResult screenshotResult) {
                try {
                    HardwareBuffer buffer = screenshotResult.getHardwareBuffer();
                    Bitmap hwBitmap = Bitmap.wrapHardwareBuffer(buffer, screenshotResult.getColorSpace());
                    if (hwBitmap == null) {
                        callback.onResult(error("Could not decode screenshot"));
                        return;
                    }
                    Bitmap bitmap = hwBitmap.copy(Bitmap.Config.ARGB_8888, false);
                    buffer.close();
                    hwBitmap.recycle();

                    // Downscale if needed
                    int width = bitmap.getWidth();
                    if (width > maxWidth) {
                        int height = (int) (bitmap.getHeight() * ((float) maxWidth / width));
                        Bitmap scaled = Bitmap.createScaledBitmap(bitmap, maxWidth, height, true);
                        bitmap.recycle();
                        bitmap = scaled;
                    }

                    int height = bitmap.getHeight();

                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    bitmap.compress(Bitmap.CompressFormat.JPEG, quality, bos);
                    bitmap.recycle();
                    byte[] bytes = bos.toByteArray();
                    String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);

                    JSONObject res = okResult("Screenshot captured");
                    res.put("data", "data:image/jpeg;base64," + base64);
                    res.put("width", width);
                    res.put("height", height);
                    callback.onResult(res);
                } catch (Throwable t) {
                    callback.onResult(error("Screenshot failed: " + t.getMessage()));
                }
            }

            @Override
            public void onFailure(int errorCode) {
                callback.onResult(error("Screenshot failed (code " + errorCode + ")"));
            }
        };

        takeScreenshot(Display.DEFAULT_DISPLAY, executor, cb);
    }

    // =====================================================================
    // RESULT HELPERS
    // =====================================================================

    private JSONObject okResult(String message) {
        JSONObject o = new JSONObject();
        try {
            o.put("success", true);
            o.put("message", message);
            o.put("packageName", activePackage);
        } catch (JSONException ignored) { }
        return o;
    }

    private JSONObject error(String message) {
        JSONObject o = new JSONObject();
        try {
            o.put("success", false);
            o.put("message", message);
            o.put("packageName", activePackage);
        } catch (JSONException ignored) { }
        return o;
    }
}
