"use client";
import { useState } from "react";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  return { query, setQuery, results, loading };
}
