package com.familysafety;

import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class DeviceLockModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    DeviceLockModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "DeviceLock";
    }

    private DevicePolicyManager getDpm() {
        return (DevicePolicyManager) reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE);
    }

    private ComponentName getAdminComponent() {
        return new ComponentName(reactContext, FamilySafetyDeviceAdminReceiver.class);
    }

    @ReactMethod
    public void isDeviceAdminActive(Promise promise) {
        try {
            promise.resolve(getDpm().isAdminActive(getAdminComponent()));
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestDeviceAdmin() {
        Activity activity = getCurrentActivity();
        if (activity == null) return;

        Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, getAdminComponent());
        intent.putExtra(
            DevicePolicyManager.EXTRA_ADD_EXPLANATION,
            "Allows Family Safety to lock your screen instantly when you tap \"I need help\", " +
            "so that anyone who grabs your phone cannot stop the alert."
        );
        activity.startActivity(intent);
    }

    @ReactMethod
    public void lockScreen(Promise promise) {
        try {
            DevicePolicyManager dpm = getDpm();
            if (!dpm.isAdminActive(getAdminComponent())) {
                promise.reject("NOT_ADMIN", "Device Administrator permission not granted");
                return;
            }
            dpm.lockNow();
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("LOCK_FAILED", e.getMessage());
        }
    }
}
