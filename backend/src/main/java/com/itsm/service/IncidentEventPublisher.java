package com.itsm.service;
import java.util.List;

import com.itsm.domain.event.IncidentEvent;
import com.itsm.domain.event.IncidentEventListener;
import org.springframework.stereotype.Service;

@Service
public class IncidentEventPublisher {
    private final List<IncidentEventListener> listeners;

    public IncidentEventPublisher(List<IncidentEventListener> listeners){
        this.listeners = listeners;
    }

    public void publish(IncidentEvent event){
        for(IncidentEventListener listener : listeners){
            listener.onIncidentEvent(event);
        }
    }
}
