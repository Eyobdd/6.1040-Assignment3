/**
 * JournalEntries Concept - AI Augmented Version
 * 
 * Preserves daily structured entries and adds AI-powered weekly synthesis
 * to aid reflection and next-week focus.
 */

import { GeminiLLM } from './gemini-llm';

// Core types for JournalEntries concept
export interface JournalEntry {
    id: string;
    userId: string;
    date: Date;
    gratitude: string;
    didToday: string;
    proudOf: string;
    tomorrowPlan: string;
    rating: number; // integer -2..2
}

export interface WeeklySummary {
    userId: string;
    weekStart: Date;
    weekEnd: Date;
    entryCount: number;
    avgRating: number;
    missingDays: string[]; // ISO date strings
    summary: string; // LLM text, ≤120 words
    focus: string; // LLM text, ≤60 words
    sourceEntryIds: string[];
    generatedAt: Date;
}

export type PromptVariant = 'base' | 'compressed' | 'strict' | 'actionable';

export class JournalEntries {
    private entries: Map<string, JournalEntry> = new Map();
    private weeklySummaries: Map<string, WeeklySummary> = new Map();
    private nextId: number = 1;

    /**
     * Create a new journal entry
     */
    createEntry(
        userId: string,
        date: Date,
        gratitude: string,
        didToday: string,
        proudOf: string,
        tomorrowPlan: string,
        rating: number
    ): JournalEntry {
        // Validate rating
        if (![-2, -1, 0, 1, 2].includes(rating)) {
            throw new Error('Rating must be in {-2, -1, 0, 1, 2}');
        }

        // Check for existing entry on this date
        const dateKey = this.getDateKey(userId, date);
        if (this.entries.has(dateKey)) {
            throw new Error(`Entry already exists for user ${userId} on ${date.toISOString()}`);
        }

        const entry: JournalEntry = {
            id: `entry-${this.nextId++}`,
            userId,
            date: new Date(date),
            gratitude,
            didToday,
            proudOf,
            tomorrowPlan,
            rating
        };

        this.entries.set(dateKey, entry);
        return entry;
    }

    /**
     * Edit an existing journal entry
     */
    editEntry(
        entryId: string,
        updates: {
            gratitude?: string;
            didToday?: string;
            proudOf?: string;
            tomorrowPlan?: string;
            rating?: number;
        }
    ): JournalEntry {
        // Find the entry
        const entry = this.findEntryById(entryId);
        if (!entry) {
            throw new Error(`Entry ${entryId} not found`);
        }

        // Validate rating if provided
        if (updates.rating !== undefined && ![-2, -1, 0, 1, 2].includes(updates.rating)) {
            throw new Error('Rating must be in {-2, -1, 0, 1, 2}');
        }

        // Apply updates
        if (updates.gratitude !== undefined) entry.gratitude = updates.gratitude;
        if (updates.didToday !== undefined) entry.didToday = updates.didToday;
        if (updates.proudOf !== undefined) entry.proudOf = updates.proudOf;
        if (updates.tomorrowPlan !== undefined) entry.tomorrowPlan = updates.tomorrowPlan;
        if (updates.rating !== undefined) entry.rating = updates.rating;

        return entry;
    }

    /**
     * Delete a journal entry
     */
    deleteEntry(entryId: string): void {
        const entry = this.findEntryById(entryId);
        if (!entry) {
            throw new Error(`Entry ${entryId} not found`);
        }

        const dateKey = this.getDateKey(entry.userId, entry.date);
        this.entries.delete(dateKey);
    }

    /**
     * Generate a weekly summary using LLM
     */
    async summarizeWeek(
        llm: GeminiLLM,
        userId: string,
        weekStart: Date,
        promptVariant: PromptVariant = 'base'
    ): Promise<WeeklySummary> {
        console.log(`🤖 Generating weekly summary for user ${userId}, week starting ${weekStart.toISOString().split('T')[0]}...`);

        // Calculate week end (weekStart + 6 days)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Collect entries for this week
        const weekEntries = this.getEntriesInRange(userId, weekStart, weekEnd);

        if (weekEntries.length === 0) {
            throw new Error(`No entries found for user ${userId} in week starting ${weekStart.toISOString().split('T')[0]}`);
        }

        // Compute deterministic aggregates
        const entryCount = weekEntries.length;
        const ratings = weekEntries.filter(e => e.rating !== undefined).map(e => e.rating);
        const avgRating = ratings.length > 0 
            ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 100) / 100
            : 0;

        // Find missing days
        const missingDays: string[] = [];
        const entryDates = new Set(weekEntries.map(e => this.toISODate(e.date)));
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(weekStart);
            checkDate.setDate(checkDate.getDate() + i);
            const isoDate = this.toISODate(checkDate);
            if (!entryDates.has(isoDate)) {
                missingDays.push(isoDate);
            }
        }

        const sourceEntryIds = weekEntries.map(e => e.id);

        // Call LLM for summary and focus
        console.log(`🤖 Calling Gemini AI for weekly synthesis (variant: ${promptVariant})...`);
        const prompt = this.createWeeklySummaryPrompt(weekEntries, entryCount, avgRating, missingDays, weekStart, promptVariant);
        const responseText = await llm.executeLLM(prompt);

        console.log('✅ Received response from Gemini AI!');
        console.log('\n🤖 RAW GEMINI RESPONSE');
        console.log('======================');
        console.log(responseText);
        console.log('======================\n');

        // Parse and validate LLM response
        const llmResult = this.parseLLMResponse(responseText);
        this.validateLLMOutput(llmResult, weekStart);

        // Create or update weekly summary
        const summaryKey = this.getWeeklySummaryKey(userId, weekStart);
        const weeklySummary: WeeklySummary = {
            userId,
            weekStart: new Date(weekStart),
            weekEnd: new Date(weekEnd),
            entryCount,
            avgRating,
            missingDays,
            summary: llmResult.summary,
            focus: llmResult.focus,
            sourceEntryIds,
            generatedAt: new Date()
        };

        this.weeklySummaries.set(summaryKey, weeklySummary);
        console.log('✅ Weekly summary generated and persisted!');

        return weeklySummary;
    }

    /**
     * Get a weekly summary if it exists
     */
    getWeeklySummary(userId: string, weekStart: Date): WeeklySummary | undefined {
        const summaryKey = this.getWeeklySummaryKey(userId, weekStart);
        return this.weeklySummaries.get(summaryKey);
    }

    /**
     * Get all entries for a user
     */
    getEntriesForUser(userId: string): JournalEntry[] {
        return Array.from(this.entries.values())
            .filter(e => e.userId === userId)
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    /**
     * Helper: Create LLM prompt for weekly summary
     */
    private createWeeklySummaryPrompt(
        entries: JournalEntry[],
        entryCount: number,
        avgRating: number,
        missingDays: string[],
        weekStart: Date,
        variant: PromptVariant
    ): string {
        const entriesText = entries.map(e => {
            return `Date: ${this.toISODate(e.date)}
Gratitude: ${e.gratitude}
Did Today: ${e.didToday}
Proud Of: ${e.proudOf}
Tomorrow Plan: ${e.tomorrowPlan}
Rating: ${e.rating}`;
        }).join('\n\n---\n\n');

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekWindow = `${this.toISODate(weekStart)} to ${this.toISODate(weekEnd)}`;

        let basePrompt = `You are a helpful AI assistant that synthesizes weekly journal entries into concise insights.

WEEK STATISTICS (computed by code, for your context):
- Entry Count: ${entryCount}
- Average Rating: ${avgRating}
- Missing Days: ${missingDays.length > 0 ? missingDays.join(', ') : 'None'}
- Week Window: ${weekWindow}

JOURNAL ENTRIES FOR THIS WEEK:
${entriesText}

CRITICAL REQUIREMENTS:
1. Use ONLY the provided journal entries - do not invent facts or add information not present
2. Create a concise summary (≤120 words) that captures the week's key themes, patterns, and emotional arc
3. Create a focused suggestion (≤60 words) with concrete, actionable recommendations for next week
4. Adhere strictly to the word limits
5. Base insights only on what's explicitly stated in the entries`;

        // Add variant-specific addendum
        if (variant === 'compressed') {
            basePrompt += '\n6. Be extremely concise - aim for 80 words in summary and 40 words in focus';
        } else if (variant === 'strict') {
            basePrompt += '\n6. No external links or dates outside the target week. If information is insufficient, say so';
        } else if (variant === 'actionable') {
            basePrompt += `\n6. Include at least one imperative verb from [schedule, plan, block, review, write, read, practice, prepare, email, call, draft, set] and at least one timebox/frequency (e.g., "15 minutes", "daily", "morning"). Be concrete and low-lift`;
        }

        basePrompt += `\n\nReturn your response as a JSON object with this exact structure:
{
  "summary": "your concise weekly summary here (≤120 words)",
  "focus": "your concrete focus suggestions here (≤60 words)"
}

Return ONLY the JSON object, no additional text.`;

        return basePrompt;
    }

    /**
     * Helper: Parse LLM response
     */
    private parseLLMResponse(responseText: string): { summary: string; focus: string } {
        try {
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in LLM response');
            }

            const response = JSON.parse(jsonMatch[0]);

            if (!response.summary || !response.focus) {
                throw new Error('Invalid LLM response format: missing summary or focus');
            }

            if (typeof response.summary !== 'string' || typeof response.focus !== 'string') {
                throw new Error('Invalid LLM response format: summary and focus must be strings');
            }

            return {
                summary: response.summary,
                focus: response.focus
            };
        } catch (error) {
            console.error('❌ Error parsing LLM response:', (error as Error).message);
            console.log('Response was:', responseText);
            throw error;
        }
    }

    /**
     * V1: Validate JSON shape & word limits
     */
    private validateV1_ShapeAndLimits(result: { summary: string; focus: string }): void {
        // Check for extra keys (only summary and focus allowed)
        const keys = Object.keys(result);
        const allowedKeys = ['summary', 'focus'];
        const extraKeys = keys.filter(k => !allowedKeys.includes(k));
        if (extraKeys.length > 0) {
            throw new Error(`V1 validation failed: Extra keys found: ${extraKeys.join(', ')}`);
        }

        // Check non-empty strings
        if (!result.summary || result.summary.trim().length === 0) {
            throw new Error('V1 validation failed: summary must be a non-empty string');
        }
        if (!result.focus || result.focus.trim().length === 0) {
            throw new Error('V1 validation failed: focus must be a non-empty string');
        }

        // Check word limits
        const summaryWords = result.summary.trim().split(/\s+/).length;
        const focusWords = result.focus.trim().split(/\s+/).length;

        if (summaryWords > 120) {
            throw new Error(`V1 validation failed: summary has ${summaryWords} words (max 120)`);
        }
        if (focusWords > 60) {
            throw new Error(`V1 validation failed: focus has ${focusWords} words (max 60)`);
        }
    }

    /**
     * V2: Validate no URLs or out-of-window dates
     */
    private validateV2_WindowAndLinks(result: { summary: string; focus: string }, weekStart: Date): void {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const combinedText = result.summary + ' ' + result.focus;

        // Check for URLs
        const urlPattern = /https?:\/\//i;
        if (urlPattern.test(combinedText)) {
            throw new Error('V2 validation failed: Output contains URLs (http:// or https://)');
        }

        // Check for ISO dates outside the week window
        const isoDatePattern = /\b\d{4}-\d{2}-\d{2}\b/g;
        const matches = combinedText.match(isoDatePattern);
        if (matches) {
            for (const dateStr of matches) {
                const date = new Date(dateStr);
                if (date < weekStart || date > weekEnd) {
                    throw new Error(`V2 validation failed: Output contains date ${dateStr} outside week window [${this.toISODate(weekStart)}, ${this.toISODate(weekEnd)}]`);
                }
            }
        }
    }

    /**
     * V3: Validate actionability (focus must have imperative verb + timebox/frequency)
     */
    private validateV3_Actionability(result: { summary: string; focus: string }): void {
        const imperativeVerbs = ['schedule', 'plan', 'block', 'review', 'write', 'read', 'practice', 'prepare', 'email', 'call', 'draft', 'set'];
        const focusLower = result.focus.toLowerCase();

        // Check for at least one imperative verb
        const hasImperative = imperativeVerbs.some(verb => {
            const pattern = new RegExp(`\\b${verb}\\b`, 'i');
            return pattern.test(focusLower);
        });

        if (!hasImperative) {
            throw new Error(`V3 validation failed: focus must include at least one imperative verb from [${imperativeVerbs.join(', ')}]`);
        }

        // Check for timebox/frequency
        const timeboxPattern = /\b\d+\s?(min|minutes?|hours?)\b|\bdaily\b|\bweekly\b|\bmorning\b|\bevening\b/i;
        if (!timeboxPattern.test(result.focus)) {
            throw new Error('V3 validation failed: focus must include at least one timebox/frequency (e.g., "15 minutes", "daily", "morning")');
        }
    }

    /**
     * Validate LLM output using all validators
     */
    private validateLLMOutput(result: { summary: string; focus: string }, weekStart: Date): void {
        this.validateV1_ShapeAndLimits(result);
        this.validateV2_WindowAndLinks(result, weekStart);
        this.validateV3_Actionability(result);
    }

    /**
     * Helper: Get entries in a date range
     */
    private getEntriesInRange(userId: string, startDate: Date, endDate: Date): JournalEntry[] {
        return Array.from(this.entries.values())
            .filter(e => {
                return e.userId === userId &&
                    e.date >= startDate &&
                    e.date <= endDate;
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    /**
     * Helper: Find entry by ID
     */
    private findEntryById(entryId: string): JournalEntry | undefined {
        return Array.from(this.entries.values()).find(e => e.id === entryId);
    }

    /**
     * Helper: Generate unique key for (userId, date)
     */
    private getDateKey(userId: string, date: Date): string {
        return `${userId}:${this.toISODate(date)}`;
    }

    /**
     * Helper: Generate unique key for (userId, weekStart)
     */
    private getWeeklySummaryKey(userId: string, weekStart: Date): string {
        return `${userId}:${this.toISODate(weekStart)}`;
    }

    /**
     * Helper: Convert Date to ISO date string (YYYY-MM-DD)
     */
    private toISODate(date: Date): string {
        return date.toISOString().split('T')[0];
    }
}
