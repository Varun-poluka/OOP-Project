package com.itsm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication @EnableScheduling
public class BackendApplication{
    public static void main(String [] args){
        SpringApplication.run(BackendApplication.class, args); // starts everything: it scans for beans, auto-configures and starts tomcat
    }
}