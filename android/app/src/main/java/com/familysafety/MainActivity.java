package com.familysafety;

import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import androidx.activity.EdgeToEdge;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import org.devio.rn.splashscreen.SplashScreen;

public class MainActivity extends ReactActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    EdgeToEdge.enable(this);
    SplashScreen.show(this);
    super.onCreate(savedInstanceState);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
    }

    // Force screen on when launched by a full-screen intent (check-in alert).
    // setTurnScreenOn() is a best-effort hint; the WakeLock is what actually
    // wakes the display from deep sleep.
    @SuppressWarnings("deprecation")
    PowerManager.WakeLock wl = ((PowerManager) getSystemService(POWER_SERVICE))
        .newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "FamilySafety:CheckInWake");
    wl.acquire(10_000L);
  }

  @Override
  protected String getMainComponentName() {
    return "FamilySafety";
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        DefaultNewArchitectureEntryPoint.getFabricEnabled());
  }
}
