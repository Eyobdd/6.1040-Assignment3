<concept_spec>
  concept JournalEntries (AI-augmented)

  purpose
    Preserve daily structured entries and add an optional AI-powered weekly synthesis to aid reflection and next-week focus.

  principle
    The concept supports manual viewing/editing of per-day entries.
    Additionally, an LLM can synthesize a concise weekly narrative and a short focus suggestion using only that week’s entries.
    Quantitative aggregates (entryCount, avgRating, missingDays) are computed deterministically by code, not by the LLM.

  state
    a set of JournalEntry with
      a user User
      a date Date
      a gratitude String
      a didToday String
      a proudOf String
      a tomorrowPlan String
      a rating Number # integer −2..2
      a session Session

    a set of WeeklySummary with
      a user User
      a weekStart Date # aligned to app’s week convention (e.g., Monday)
      a weekEnd Date # = weekStart + 6 days
      a entryCount Number # computed from entries in [weekStart, weekEnd]
      a avgRating Number # mean of available ratings in that window
      a missingDays set of Date # dates in window without an entry
      a summary String # LLM text, ≤ ~120 words
      a focus String # LLM text, ≤ ~60 words (concrete suggestions)
      a sourceEntryIds set of ID
      a generatedAt DateTime

  invariants
    At most one JournalEntry per (user, date).
    At most one WeeklySummary per (user, weekStart).

  actions
    create_from_session(session: Session): JournalEntry
      requires: session.complete and no existing entry for (session.user, localDate(session))
      effect: parses session Segments into fields; links to session; returns the new entry

    edit_entry(entry: JournalEntry, gratitude?: String, didToday?: String, proudOf?: String, tomorrowPlan?: String, rating?: Number)
      requires: entry exists and if rating provided then rating ∈ {−2, −1, 0, 1, 2}
      effect: updates provided fields (audit trail outside this concept)

    delete_entry(entry: JournalEntry)
      requires: entry exists
      effect: removes entry (does not delete session)

    summarize_week(llm: GeminiLLM, weekStart: Date): WeeklySummary
      requires: weekStart aligns to week convention; there exists ≥1 JournalEntry for user in [weekStart, weekEnd]
      effect: collect that week's entries and compute {entryCount, avgRating, missingDays, sourceEntryIds};
      call the llm with only these inputs to obtain {summary, focus};
      and store or update the WeeklySummary for (user, weekStart) and return the WeeklySummary.
</concept_spec>