"use client";

import { useState, useEffect } from "react";
import { fetchJsonClient } from "@/lib/client-http";

const FALLBACK_CHIPS = [
  "Where is the market headed?",
  "What should I be watching today?",
  "Is now a good time to buy?",
  "What are the biggest risks right now?",
  "Which coins have the best fundamentals?",
  "What's the safest way to store crypto?",
];

export default function QuestionChips() {
  const [questions, setQuestions] = useState<string[]>(FALLBACK_CHIPS);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const data = await fetchJsonClient<{ questions?: string[] }>(
          "/api/questions",
          10000
        );
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
        }
      } catch {
        // Keep fallback
      }
    }
    fetchQuestions();
  }, []);

  return (
    <div className="ct-chips-row">
      {questions.map((q, i) => (
        <button key={i} className="ct-chip">
          💬 {q}
        </button>
      ))}
    </div>
  );
}
