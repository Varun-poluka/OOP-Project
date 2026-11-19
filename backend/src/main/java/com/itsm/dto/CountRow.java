package com.itsm.dto;

// One row of a GROUP BY count query, e.g. ("RESOLVED", 4).
public record CountRow(String key, long count) { }
