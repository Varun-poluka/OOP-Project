package com.itsm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication{
    public static void main(String [] args){
        SpringApplication.run(BackendApplication.class, args); // starts everything: it scans for beans, auto-configures and starts tomcat
    }
}