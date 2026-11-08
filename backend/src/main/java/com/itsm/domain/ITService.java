package com.itsm.domain;
import jakarta.persistence.*;

import java.util.*;

@Entity
@Table(name = "it_service")

public class ITService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private int businessCriticality;

    @ManyToMany
    @JoinTable(name = "service_dependencies", joinColumns = @JoinColumn(name = "service_id"), inverseJoinColumns = @JoinColumn(name = "depends_on_id"))
    private final List<ITService> dependencies = new ArrayList<>();

    public ITService(){ }

    public ITService(String name, int businessCriticality){
        if(name == null || name.isBlank()){
            throw new IllegalArgumentException("Service name cannot be empty");
        }
        this.name = name.trim();
        setBusinessCriticality(businessCriticality);
    }

    public String getName(){
        return name;
    }
    public int getBusinessCriticality(){
        return businessCriticality;
    }
    public void setBusinessCriticality(int businessCriticality){
        if(businessCriticality < 1 || businessCriticality >3){
            throw new IllegalArgumentException("criticality must be between 1 and 3");
        }
        this.businessCriticality = businessCriticality;
    }

    public void addDependency(ITService other){
        if(other == null){
            throw new NullPointerException("dependency cannot be null");
        }
        if(other == this){
            throw new IllegalArgumentException("Service cannot depend on itself");
        }
        if(!dependencies.contains(other)){
            dependencies.add(other);
        }
    }

    public List<ITService> getDependencies(){
        return Collections.unmodifiableList(dependencies);
    }

    @Override
    public String toString(){
        return name + " (Criticality " + businessCriticality + ")";
    }

    public Long getId() {
        return id;
    }
}
