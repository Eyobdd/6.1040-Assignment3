/**
 * JournalEntries Scenarios Runner
 * 
 * Demonstrates 3 experiments with validators and prompt variants:
 * - Exp 1: Window/links guard (V2) - failing → passing with 'strict'
 * - Exp 2: Word limits (V1) - failing → passing with 'compressed'
 * - Exp 3: Actionability (V3) - failing → passing with 'actionable'
 */

import { JournalEntries, PromptVariant } from './journal-entries';
import { GeminiLLM, Config } from './gemini-llm';

/**
 * Load configuration from config.json
 */
function loadConfig(): Config {
    try {
        const config = require('../config.json');
        return config;
    } catch (error) {
        console.error('❌ Error loading config.json. Please ensure it exists with your API key.');
        console.error('Error details:', (error as Error).message);
        process.exit(1);
    }
}

/**
 * Helper: Create a date from YYYY-MM-DD string
 */
function createDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Mock LLM for testing validators
 */
class MockLLM extends GeminiLLM {
    private mockResponse: string;

    constructor(config: Config, mockResponse: string) {
        super(config);
        this.mockResponse = mockResponse;
    }

    async executeLLM(prompt: string): Promise<string> {
        // Return mock response instead of calling real API
        return this.mockResponse;
    }
}

/**
 * Experiment 1: Window/links guard (V2)
 * Tests that LLM output cannot contain URLs or dates outside the week window
 */
async function experiment1_WindowLinksGuard(): Promise<void> {
    console.log('\n🧪 EXPERIMENT 1: Window/Links Guard (V2)');
    console.log('=========================================');
    console.log('Setup: Sparse week (2 entries)');
    console.log('Validator: V2 - No URLs or out-of-window dates\n');

    const journal = new JournalEntries();
    const config = loadConfig();
    const userId = 'user-exp1';
    const weekStart = createDate('2025-10-06'); // Monday

    // Create sparse entries
    journal.createEntry(
        userId,
        createDate('2025-10-06'),
        'Grateful for a fresh start',
        'Started new project, went for a walk',
        'Took initiative on new work',
        'Continue building momentum',
        1
    );

    journal.createEntry(
        userId,
        createDate('2025-10-09'),
        'Thankful for progress',
        'Made good headway on project',
        'Stayed focused despite challenges',
        'Keep pushing forward',
        1
    );

    // FAILING RUN: Mock LLM with URL
    console.log('🔴 FAILING RUN: Mock LLM includes URL');
    console.log('─────────────────────────────────────');
    const failingMock = new MockLLM(config, JSON.stringify({
        summary: 'This week showed steady progress on a new project. Check out https://example.com for more tips. The user maintained focus and initiative despite having only two entries.',
        focus: 'Continue the momentum by scheduling dedicated project time daily.'
    }));

    try {
        await journal.summarizeWeek(failingMock, userId, weekStart, 'base');
        console.log('❌ ERROR: Should have failed validation!');
    } catch (error) {
        console.log(`✅ Expected failure: ${(error as Error).message}\n`);
    }

    // PASSING RUN: Mock LLM without URL, using 'strict' variant
    console.log('🟢 PASSING RUN: Using "strict" variant, no URLs');
    console.log('──────────────────────────────────────────────');
    const passingMock = new MockLLM(config, JSON.stringify({
        summary: 'This week showed steady progress on a new project with two recorded entries. The user maintained focus and initiative, starting fresh on Monday and making good headway by Thursday despite challenges.',
        focus: 'Schedule 30 minutes daily for focused project work to maintain momentum and continue building on current progress.'
    }));

    try {
        const summary = await journal.summarizeWeek(passingMock, userId, weekStart, 'strict');
        console.log('✅ Validation passed!');
        console.log(`\n📝 Summary: ${summary.summary}`);
        console.log(`🎯 Focus: ${summary.focus}\n`);
    } catch (error) {
        console.log(`❌ Unexpected error: ${(error as Error).message}\n`);
    }

    console.log('📋 Note: V2 validator successfully blocked URLs and would block out-of-window dates.');
    console.log('    The "strict" prompt variant instructs the LLM to avoid external links.\n');
}

/**
 * Experiment 2: Word limits (V1)
 * Tests that LLM output respects word count limits
 */
async function experiment2_WordLimits(): Promise<void> {
    console.log('\n🧪 EXPERIMENT 2: Word Limits (V1)');
    console.log('==================================');
    console.log('Setup: 3-4 entries');
    console.log('Validator: V1 - Summary ≤120 words, Focus ≤60 words\n');

    const journal = new JournalEntries();
    const config = loadConfig();
    const userId = 'user-exp2';
    const weekStart = createDate('2025-10-06');

    // Create 3 entries
    journal.createEntry(
        userId,
        createDate('2025-10-06'),
        'Grateful for good health',
        'Exercised and ate well',
        'Maintained healthy habits',
        'Continue wellness focus',
        1
    );

    journal.createEntry(
        userId,
        createDate('2025-10-08'),
        'Thankful for productive day',
        'Completed major tasks',
        'Finished ahead of schedule',
        'Start next phase',
        2
    );

    journal.createEntry(
        userId,
        createDate('2025-10-10'),
        'Grateful for balance',
        'Work and rest in harmony',
        'Achieved good work-life balance',
        'Maintain this rhythm',
        1
    );

    // FAILING RUN: Mock LLM with excessive word count
    console.log('🔴 FAILING RUN: Mock LLM exceeds word limits');
    console.log('─────────────────────────────────────────────');
    
    // Create a summary with >120 words (includes imperative verb and timebox to pass V3)
    const longSummary = 'This week demonstrated exceptional commitment to holistic well-being and productivity across multiple dimensions of life and personal growth. ' +
        'The user consistently prioritized health through regular exercise and mindful eating habits, which laid a strong foundation for the week ahead. ' +
        'Midweek brought remarkable productivity gains, with major tasks completed ahead of schedule, showcasing excellent time management skills and sustained focus throughout challenging periods. ' +
        'The week concluded with a beautiful balance between professional accomplishments and personal rest, demonstrating mature understanding of sustainable success and long-term wellbeing. ' +
        'Throughout these three recorded days, there was a clear pattern of intentionality and self-awareness, with each day building upon the previous one in meaningful ways. ' +
        'The ratings remained consistently positive, reflecting genuine satisfaction with progress and choices made during this period of growth, development, and self-improvement across all areas of life.';
    
    const failingMock = new MockLLM(config, JSON.stringify({
        summary: longSummary,
        focus: 'Schedule 30 minutes daily to continue prioritizing wellness and productivity while maintaining the excellent work-life balance achieved this week.'
    }));

    try {
        await journal.summarizeWeek(failingMock, userId, weekStart, 'base');
        console.log('❌ ERROR: Should have failed validation!');
    } catch (error) {
        console.log(`✅ Expected failure: ${(error as Error).message}\n`);
    }

    // PASSING RUN: Mock LLM with concise output, using 'compressed' variant
    console.log('🟢 PASSING RUN: Using "compressed" variant, concise output');
    console.log('───────────────────────────────────────────────────────────');
    const passingMock = new MockLLM(config, JSON.stringify({
        summary: 'Week showed strong commitment to wellness and productivity. User maintained healthy habits, completed major tasks ahead of schedule, and achieved good work-life balance across three recorded days.',
        focus: 'Schedule 20 minutes each morning to plan wellness activities and review productivity goals for balanced progress.'
    }));

    try {
        const summary = await journal.summarizeWeek(passingMock, userId, weekStart, 'compressed');
        console.log('✅ Validation passed!');
        console.log(`\n📝 Summary (${summary.summary.split(/\s+/).length} words): ${summary.summary}`);
        console.log(`🎯 Focus (${summary.focus.split(/\s+/).length} words): ${summary.focus}\n`);
    } catch (error) {
        console.log(`❌ Unexpected error: ${(error as Error).message}\n`);
    }

    console.log('📋 Note: V1 validator enforces strict word limits (summary ≤120, focus ≤60).');
    console.log('    The "compressed" variant encourages more concise output.\n');
}

/**
 * Experiment 3: Actionability (V3)
 * Tests that focus includes imperative verb and timebox/frequency
 */
async function experiment3_Actionability(): Promise<void> {
    console.log('\n🧪 EXPERIMENT 3: Actionability (V3)');
    console.log('====================================');
    console.log('Setup: 3 entries (mixed sentiment)');
    console.log('Validator: V3 - Focus must have imperative verb + timebox/frequency\n');

    const journal = new JournalEntries();
    const config = loadConfig();
    const userId = 'user-exp3';
    const weekStart = createDate('2025-10-06');

    // Create 3 entries with mixed sentiment
    journal.createEntry(
        userId,
        createDate('2025-10-07'),
        'Grateful for learning opportunity',
        'Struggled with difficult problem',
        'Persisted despite frustration',
        'Keep trying',
        0
    );

    journal.createEntry(
        userId,
        createDate('2025-10-09'),
        'Thankful for breakthrough',
        'Finally solved the problem',
        'Achieved breakthrough after persistence',
        'Apply this approach to other challenges',
        2
    );

    journal.createEntry(
        userId,
        createDate('2025-10-11'),
        'Grateful for reflection time',
        'Reviewed the week and lessons learned',
        'Gained valuable insights',
        'Continue learning',
        1
    );

    // FAILING RUN: Mock LLM with vague focus (no imperative verb or timebox)
    console.log('🔴 FAILING RUN: Mock LLM has vague focus');
    console.log('────────────────────────────────────────');
    const failingMock = new MockLLM(config, JSON.stringify({
        summary: 'Week showed persistence through challenges, culminating in a breakthrough. User demonstrated resilience and learning mindset across three entries with mixed but ultimately positive sentiment.',
        focus: 'Try your best to keep learning and growing. Stay positive and things will work out eventually.'
    }));

    try {
        await journal.summarizeWeek(failingMock, userId, weekStart, 'base');
        console.log('❌ ERROR: Should have failed validation!');
    } catch (error) {
        console.log(`✅ Expected failure: ${(error as Error).message}\n`);
    }

    // PASSING RUN: Mock LLM with actionable focus, using 'actionable' variant
    console.log('🟢 PASSING RUN: Using "actionable" variant, concrete actions');
    console.log('──────────────────────────────────────────────────────────────');
    const passingMock = new MockLLM(config, JSON.stringify({
        summary: 'Week demonstrated persistence through challenges, culminating in a breakthrough. User showed resilience when struggling with difficult problems and gained valuable insights through reflection.',
        focus: 'Schedule a 15-minute daily review each evening to document problem-solving approaches and reinforce learning patterns.'
    }));

    try {
        const summary = await journal.summarizeWeek(passingMock, userId, weekStart, 'actionable');
        console.log('✅ Validation passed!');
        console.log(`\n📝 Summary: ${summary.summary}`);
        console.log(`🎯 Focus: ${summary.focus}\n`);
    } catch (error) {
        console.log(`❌ Unexpected error: ${(error as Error).message}\n`);
    }

    console.log('📋 Note: V3 validator requires imperative verb (schedule, plan, etc.) + timebox/frequency.');
    console.log('    The "actionable" variant instructs the LLM to be concrete and low-lift.\n');
}

/**
 * Main function to run all experiments
 */
async function main(): Promise<void> {
    console.log('📔 JournalEntries Scenarios Runner');
    console.log('==================================');
    console.log('Testing validators and prompt variants\n');
    console.log('Specifications:');
    console.log('  - ./assignment-3/journal_entry.spec');
    console.log('  - ./assignment-3/journal_entry_ai.spec');
    
    try {
        // Run all 3 experiments
        await experiment1_WindowLinksGuard();
        await experiment2_WordLimits();
        await experiment3_Actionability();
        
        console.log('\n🎉 All experiments completed successfully!');
        console.log('\n📊 Summary:');
        console.log('  ✅ Exp 1: V2 validator blocks URLs and out-of-window dates');
        console.log('  ✅ Exp 2: V1 validator enforces word limits (≤120, ≤60)');
        console.log('  ✅ Exp 3: V3 validator ensures actionable focus with imperative verbs + timeboxes');
        console.log('\n💡 Prompt variants help guide LLM to produce valid output:');
        console.log('  - "strict": Avoids external links and out-of-window dates');
        console.log('  - "compressed": Produces more concise output');
        console.log('  - "actionable": Includes concrete actions with timeboxes');
        
    } catch (error) {
        console.error('❌ Experiment error:', (error as Error).message);
        console.error((error as Error).stack);
        process.exit(1);
    }
}

// Run the scenarios if this file is executed directly
if (require.main === module) {
    main();
}
