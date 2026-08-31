package com.maya.ai.assistant;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import com.maya.ai.assistant.plugins.MayaAutomationPlugin;
import com.maya.ai.assistant.plugins.MayaSpeechPlugin;
import com.maya.ai.assistant.plugins.MayaTtsPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register Maya native plugins BEFORE super.onCreate()
        registerPlugin(MayaAutomationPlugin.class);
        registerPlugin(MayaSpeechPlugin.class);
        registerPlugin(MayaTtsPlugin.class);

        super.onCreate(savedInstanceState);
    }
}
