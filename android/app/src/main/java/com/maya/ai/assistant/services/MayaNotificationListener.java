package com.maya.ai.assistant.services;

import android.app.Notification;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * MayaNotificationListener
 * ------------------------
 * Saare apps ke notifications sunta hai (WhatsApp, SMS, calls...).
 * Maya inhe padh sakti hai: "notifications padho" / auto-reply ke liye base.
 *
 * Sirf device par — koi data bahar nahi jata.
 */
public class MayaNotificationListener extends NotificationListenerService {

    private static final int MAX = 20;
    private static final Deque<JSONObject> queue = new ArrayDeque<>();
    private static volatile String lastPackage = "";

    public static JSONArray getRecent(int limit) {
        JSONArray arr = new JSONArray();
        synchronized (queue) {
            int i = 0;
            for (JSONObject o : queue) {
                if (i++ >= limit) break;
                arr.put(o);
            }
        }
        return arr;
    }

    public static String getLastPackageName() {
        return lastPackage;
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            Notification n = sbn.getNotification();
            if (n == null) return;
            String pkg = sbn.getPackageName();
            CharSequence title = n.extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence text = n.extras.getCharSequence(Notification.EXTRA_TEXT);
            if (text == null) text = n.extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
            if (title == null && text == null) return;

            JSONObject o = new JSONObject();
            o.put("package", pkg);
            o.put("title", title == null ? "" : title.toString());
            o.put("text", text == null ? "" : text.toString());
            o.put("time", System.currentTimeMillis());

            synchronized (queue) {
                queue.addFirst(o);
                while (queue.size() > MAX) queue.removeLast();
            }
            lastPackage = pkg;
        } catch (Exception ignored) { }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // no-op
    }
}
