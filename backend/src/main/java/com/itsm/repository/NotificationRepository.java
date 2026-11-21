package com.itsm.repository;
import java.util.List;
import com.itsm.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;


public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(String recipientId);
    long countByRecipientIdAndReadFalse(String recipientId);
}
