package com.itsm.domain;
import java.util.*;

public class ITService {

    private final String name;
    private int businessCriticality;
    private final List<ITService> dependencies = new ArrayList<>();

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
}
