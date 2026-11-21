package com.itsm.service.intelligence;

import com.itsm.domain.Incident;

import java.util.List;

public record DuplicateMatch(Incident incident, double score, List<String> reasons) { }
