package com.itsm.repository;

import com.itsm.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);

    // type(u) checks the entity subclass (stored in the "role" discriminator column).
    @Query("select u from User u where type(u) = Administrator")
    List<User> findAdministrators();
}
