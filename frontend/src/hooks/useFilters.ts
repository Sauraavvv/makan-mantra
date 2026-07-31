"use client";
import { useState } from "react";

export function useFilters() {
  const [filters, setFilters] = useState({});
  return { filters, setFilters };
}
