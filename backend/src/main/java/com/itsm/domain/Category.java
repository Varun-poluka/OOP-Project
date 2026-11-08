package com.itsm.domain;
import jakarta.persistence.*;

@Entity
public class Category {

    @Id
    private String name;
    private String description;

    public Category(){ };

    public Category(String name, String description){
        if(name == null || name.isBlank()){
            throw new IllegalArgumentException("Category name cannot be empty");
        }
        this.name = name.trim().toUpperCase();
        this.description = description;
    }

    public String getName(){
        return name;
    }
    public String getDescription(){
        return description;
    }
    public void setDescription(String description){
        this.description = description;
    }

    @Override
    public boolean equals(Object o){
        if(this == o){
            return true;
        }
        if(!(o instanceof Category)){
            return false;
        }
        Category other = (Category) o;
        return this.name.equals(other.name);
    }

    @Override
    public int hashCode(){
        return name.hashCode();
    }

    @Override
    public String toString(){
        return name;
    }
}
