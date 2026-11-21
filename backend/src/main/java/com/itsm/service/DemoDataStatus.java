package com.itsm.service;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

// Tells the SLA scheduler whether startup data is complete. With the "demo" profile the
// DemoDataLoader writes and then backdates rows; a scheduler run in the middle of that would add
// SLA rows that get the wrong (backdated) time. So in demo mode the flag starts false and the
// loader sets it when it has finished. Without the demo profile it is true from the start.
@Component
public class DemoDataStatus {

    // AtomicBoolean: the loader (main thread) writes it and the scheduler thread reads it,
    // so a plain boolean might not be seen by the other thread.
    private final AtomicBoolean ready;

    public DemoDataStatus(Environment environment) {
        this.ready = new AtomicBoolean(!environment.matchesProfiles("demo"));
    }

    public boolean isReady() {
        return ready.get();
    }

    public void markReady() {
        ready.set(true);
    }
}
