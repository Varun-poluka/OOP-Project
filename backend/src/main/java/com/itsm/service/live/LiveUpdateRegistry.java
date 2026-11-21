package com.itsm.service.live;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

// Keeps the open Server-Sent-Events connections, per user (one emitter per browser tab).
// Request threads, the heartbeat thread and the threads that commit transactions all touch
// this map at the same time, so it uses thread-safe collections.
@Component
public class LiveUpdateRegistry {

    static final long TIMEOUT_MILLIS = 30L * 60 * 1000; // the client reconnects after this

    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter connect(String userId) {
        if (userId == null) {
            throw new NullPointerException("userId is required");
        }
        SseEmitter emitter = new SseEmitter(TIMEOUT_MILLIS);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(error -> remove(userId, emitter));
        register(userId, emitter);
        // The first event starts the response, so the client knows the stream is open.
        send(userId, emitter, SseEmitter.event().name("connected").data(Map.of("userId", userId)));
        return emitter;
    }

    // Package-visible so unit tests can add emitters without a real HTTP connection.
    void register(String userId, SseEmitter emitter) {
        emitters.computeIfAbsent(userId, id -> new CopyOnWriteArrayList<>()).add(emitter);
    }

    void remove(String userId, SseEmitter emitter) {
        // computeIfPresent runs atomically, so a concurrent register cannot slip in between.
        emitters.computeIfPresent(userId, (id, list) -> {
            list.remove(emitter);
            return list.isEmpty() ? null : list; // returning null removes the key
        });
    }

    public boolean isConnected(String userId) {
        return emitters.containsKey(userId);
    }

    public int connectionCount(String userId) {
        List<SseEmitter> list = emitters.get(userId);
        return (list == null) ? 0 : list.size();
    }

    // Sends one named event to every tab of the user. A tab that fails is dropped.
    public void send(String userId, String eventName, Object data) {
        List<SseEmitter> list = emitters.get(userId);
        if (list == null) {
            return;
        }
        for (SseEmitter emitter : list) {
            send(userId, emitter, SseEmitter.event().name(eventName).data(data));
        }
    }

    // A comment line (": heartbeat") is ignored by clients but keeps proxies from closing an idle
    // connection, and shows us which connections are dead.
    @Scheduled(fixedRate = 25000)
    public void heartbeat() {
        for (Map.Entry<String, List<SseEmitter>> entry : emitters.entrySet()) {
            for (SseEmitter emitter : entry.getValue()) {
                send(entry.getKey(), emitter, SseEmitter.event().comment("heartbeat"));
            }
        }
    }

    private void send(String userId, SseEmitter emitter, SseEmitter.SseEventBuilder event) {
        try {
            emitter.send(event);
        } catch (IOException | IllegalStateException e) {
            // IOException: the browser went away. IllegalStateException: the emitter already completed.
            remove(userId, emitter);
        }
    }
}
