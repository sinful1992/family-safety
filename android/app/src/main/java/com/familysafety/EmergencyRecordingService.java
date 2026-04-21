package com.familysafety;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;

// PLACEHOLDER: This service is declared but not functional.
// When the recording feature is enabled, this will become a foreground service
// that captures camera/microphone and uploads chunks to Firebase Storage.
public class EmergencyRecordingService extends Service {

    private static final String TAG = "EmergencyRecording";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "PLACEHOLDER: Emergency recording service started — no recording in progress");
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
