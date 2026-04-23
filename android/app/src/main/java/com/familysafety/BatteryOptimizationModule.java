package com.familysafety;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class BatteryOptimizationModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    BatteryOptimizationModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "BatteryOptimization";
    }

    @ReactMethod
    public void isIgnoringBatteryOptimizations(Promise promise) {
        try {
            PowerManager pm = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
            String packageName = reactContext.getPackageName();
            promise.resolve(pm != null && pm.isIgnoringBatteryOptimizations(packageName));
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestIgnoreBatteryOptimizations(Promise promise) {
        try {
            Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available");
                return;
            }
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
            activity.startActivity(intent);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("REQUEST_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void canUseFullScreenIntent(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                NotificationManager nm = (NotificationManager) reactContext.getSystemService(Context.NOTIFICATION_SERVICE);
                promise.resolve(nm != null && nm.canUseFullScreenIntent());
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void openFullScreenIntentSettings(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                Activity activity = getCurrentActivity();
                if (activity == null) {
                    promise.reject("NO_ACTIVITY", "Activity not available");
                    return;
                }
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
                intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
                activity.startActivity(intent);
            }
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("OPEN_FAILED", e.getMessage());
        }
    }
}
