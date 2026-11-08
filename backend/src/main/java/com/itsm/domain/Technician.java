package com.itsm.domain;

import com.itsm.domain.exception.TechnicianUnavailableException;
import jakarta.persistence.*;
import java.util.*;

@Entity
@DiscriminatorValue("TECHNICIAN")
public class Technician extends User {
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "technician_skills",
            joinColumns = @JoinColumn(name = "technician_id"),
            inverseJoinColumns = @JoinColumn(name = "category_name"))

    private Set<Category> skills = new HashSet<>();
    private int maxWorkload;
    private int activeIncidents;
    private boolean available = true;

    protected Technician(){ }

    public Technician(String id, String name, String email, String passwordHash, int maxWorkload){
        super(id,name,email,passwordHash);
        if(maxWorkload < 1){
            throw new IllegalArgumentException("Max Workload must be at least 1");
        }
        this.maxWorkload = maxWorkload;
    }

    @Override
    public String getRole(){
        return "TECHNICIAN";
    }

    public void addSkill(Category category){
        if(category == null){
            throw new NullPointerException("Skill cannot be null");
        }
        skills.add(category);
    }

    public Set<Category> getSkills(){
        return Collections.unmodifiableSet(skills);
    }

    public boolean hasSkill(Category category){
        return skills.contains(category);
    }

    public boolean canTakeMoreWork(){
        return available && activeIncidents < maxWorkload;
    }

    void addIncident(){
        if(!canTakeMoreWork()){
            throw new TechnicianUnavailableException(getName() + " Cannot take more work (" + activeIncidents + "/" + maxWorkload + ")");
        }
        activeIncidents++;
    }

    void removeIncident(){
        if(activeIncidents == 0){
            throw new IllegalStateException("No active incidents to remove");
        }
        else{
            activeIncidents--;
        }
    }

    public int getActiveIncidents(){
        return activeIncidents;
    }
    public int getMaxWorkload() {
        return maxWorkload;
    }
    public boolean isAvailable(){
        return available;
    }
    public void setAvailable(boolean available){
        this.available = available;
    }
}
