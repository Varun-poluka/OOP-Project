package com.itsm.service.intelligence;

import com.itsm.domain.Technician;

import java.util.List;

public record TechnicianScore(Technician technician, int points, List<String> reasons) { }
