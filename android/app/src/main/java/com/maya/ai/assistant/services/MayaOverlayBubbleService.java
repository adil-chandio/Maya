package com.maya.ai.assistant.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;

/**
 * MayaOverlayBubbleService
 * ------------------------
 * Floating Maya bubble — har app ke UPAR taairta hai.
 * - Drag karke kahin bhi rakh sakte ho
 * - Tap karo → Maya khul jati hai
 * - Window overlay permission chahiye (starter me open karta hai)
 *
 * Phase 1: bubble + launch. Phase 2: bubble me direct voice baat.
 */
public class MayaOverlayBubbleService extends Service {

    private static boolean running = false;
    private WindowManager windowManager;
    private View bubbleView;

    public static boolean isRunning() { return running; }

    @Override
    public void onCreate() {
        super.onCreate();
        startForeground(1001, buildNotification());
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        createBubble();
        running = true;
    }

    private Notification buildNotification() {
        String channelId = "maya_overlay";
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null) {
            NotificationChannel ch = new NotificationChannel(channelId, "Maya Assistant", NotificationManager.IMPORTANCE_LOW);
            nm.createNotificationChannel(ch);
        }
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, channelId)
                : new Notification.Builder(this);
        b.setContentTitle("Maya AI")
         .setContentText("Floating assistant active — tap karke Maya kholein")
         .setSmallIcon(android.R.drawable.ic_dialog_info)
         .setOngoing(true);
        return b.build();
    }

    private void createBubble() {
        FrameLayout root = new FrameLayout(this);
        bubbleView = LayoutInflater.from(this).inflate(
                getResources().getIdentifier("bubble_view", "layout", getPackageName()),
                root, false);

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                Build.VERSION.SDK_INT >= 26
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 40;
        params.y = 400;

        // Drag support
        bubbleView.setOnTouchListener(new View.OnTouchListener() {
            float downX, downY;
            int startX, startY;
            boolean moved = false;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX(); downY = e.getRawY();
                        startX = params.x; startY = params.y;
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = e.getRawX() - downX;
                        float dy = e.getRawY() - downY;
                        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) moved = true;
                        params.x = startX + (int) dx;
                        params.y = startY + (int) dy;
                        windowManager.updateViewLayout(bubbleView, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!moved) {
                            // Tap → Maya kholo
                            Intent i = new Intent(MayaOverlayBubbleService.this,
                                    com.maya.ai.assistant.MainActivity.class);
                            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(i);
                        }
                        return true;
                }
                return false;
            }
        });

        windowManager.addView(bubbleView, params);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        running = false;
        if (bubbleView != null && windowManager != null) {
            try { windowManager.removeView(bubbleView); } catch (Exception ignored) { }
            bubbleView = null;
        }
        super.onDestroy();
    }
}
