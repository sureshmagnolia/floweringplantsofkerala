package com.sureshmagnolia.keralaplants;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OfflineDataManager.class);
        super.onCreate(savedInstanceState);
    }
}
