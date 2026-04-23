package com.familysafety;

import android.app.Activity;
import android.view.WindowManager;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class ScreenWakeModule extends ReactContextBaseJavaModule {

    ScreenWakeModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "ScreenWake";
    }

    @ReactMethod
    public void setKeepScreenOn(boolean keep, Promise promise) {
        final Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity not available");
            return;
        }
        activity.runOnUiThread(() -> {
            try {
                if (keep) {
                    activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
                promise.resolve(null);
            } catch (Exception e) {
                promise.reject("FLAG_FAILED", e.getMessage());
            }
        });
    }
}
