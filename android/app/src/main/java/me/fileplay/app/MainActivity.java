package me.fileplay.app;

import android.webkit.CookieManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onPause() {
    super.onPause();

    CookieManager.getInstance().flush();
  }

}
