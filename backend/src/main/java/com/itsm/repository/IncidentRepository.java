package com.itsm.repository;

import com.itsm.domain.Incident;
import com.itsm.domain.IncidentStatus;
import com.itsm.dto.CountRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface IncidentRepository extends JpaRepository<Incident, String>, JpaSpecificationExecutor<Incident> {

    List<Incident> findByStatus(IncidentStatus status);
    List<Incident> findByStatusNotIn(Collection<IncidentStatus> statuses);

    // Range is half-open: from is included, to is excluded.
    List<Incident> findByCreatedAtGreaterThanEqualAndCreatedAtLessThan(LocalDateTime from, LocalDateTime to);

    @Query("""
            select new com.itsm.dto.CountRow(cast(i.status as String), count(i))
            from Incident i
            where i.createdAt >= :from and i.createdAt < :to
            group by i.status
            order by i.status""")
    List<CountRow> countByStatus(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // NEW incidents have no priority yet, so they are grouped as UNCLASSIFIED.
    @Query("""
            select new com.itsm.dto.CountRow(coalesce(cast(i.priority as String), 'UNCLASSIFIED'), count(i))
            from Incident i
            where i.createdAt >= :from and i.createdAt < :to
            group by i.priority
            order by i.priority""")
    List<CountRow> countByPriority(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("""
            select new com.itsm.dto.CountRow(i.category.name, count(i))
            from Incident i
            where i.createdAt >= :from and i.createdAt < :to
            group by i.category.name
            order by i.category.name""")
    List<CountRow> countByCategory(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
