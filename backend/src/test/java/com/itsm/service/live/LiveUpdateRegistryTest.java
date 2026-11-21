package com.itsm.service.live;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Unit tests without a server: the emitters are test doubles that record or refuse what is sent.
class LiveUpdateRegistryTest {

    // Records every event instead of writing it to an HTTP response.
    static class RecordingEmitter extends SseEmitter {
        final List<SseEventBuilder> sent = new ArrayList<>();

        @Override
        public void send(SseEventBuilder builder) {
            sent.add(builder);
        }
    }

    // Behaves like a browser tab that was closed: every send fails.
    static class BrokenEmitter extends SseEmitter {
        @Override
        public void send(SseEventBuilder builder) throws IOException {
            throw new IOException("connection reset");
        }
    }

    private final LiveUpdateRegistry registry = new LiveUpdateRegistry();

    @Test
    void sendReachesEveryTabOfTheUser() {
        RecordingEmitter tab1 = new RecordingEmitter();
        RecordingEmitter tab2 = new RecordingEmitter();
        registry.register("U-1", tab1);
        registry.register("U-1", tab2);

        registry.send("U-1", "incident", "data");

        assertEquals(2, registry.connectionCount("U-1"));
        assertEquals(1, tab1.sent.size());
        assertEquals(1, tab2.sent.size());
    }

    @Test
    void sendOnlyReachesTheNamedUser() {
        RecordingEmitter mine = new RecordingEmitter();
        RecordingEmitter other = new RecordingEmitter();
        registry.register("U-1", mine);
        registry.register("U-2", other);

        registry.send("U-1", "incident", "data");

        assertEquals(1, mine.sent.size());
        assertEquals(0, other.sent.size());
    }

    @Test
    void removingTheLastEmitterDisconnectsTheUser() {
        RecordingEmitter tab1 = new RecordingEmitter();
        RecordingEmitter tab2 = new RecordingEmitter();
        registry.register("U-1", tab1);
        registry.register("U-1", tab2);

        registry.remove("U-1", tab1);
        assertTrue(registry.isConnected("U-1"));
        assertEquals(1, registry.connectionCount("U-1"));

        registry.remove("U-1", tab2);
        assertFalse(registry.isConnected("U-1"));
        assertEquals(0, registry.connectionCount("U-1"));
    }

    @Test
    void aFailedEmitterIsRemovedAndTheOthersStillReceive() {
        RecordingEmitter healthy = new RecordingEmitter();
        registry.register("U-1", new BrokenEmitter());
        registry.register("U-1", healthy);

        registry.send("U-1", "incident", "data");

        assertEquals(1, registry.connectionCount("U-1"));
        assertEquals(1, healthy.sent.size());
    }

    @Test
    void sendingToAUserWithNoConnectionDoesNothing() {
        registry.send("U-NOBODY", "incident", "data"); // must not throw
        assertFalse(registry.isConnected("U-NOBODY"));
    }

    @Test
    void heartbeatReachesLiveEmittersAndDropsDeadOnes() {
        RecordingEmitter live = new RecordingEmitter();
        registry.register("U-1", live);
        registry.register("U-2", new BrokenEmitter());

        registry.heartbeat();

        assertEquals(1, live.sent.size());
        assertTrue(registry.isConnected("U-1"));
        assertFalse(registry.isConnected("U-2"));
    }
}
