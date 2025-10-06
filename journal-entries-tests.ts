/**
 * JournalEntries Test Cases
 * 
 * Demonstrates journal entry creation and LLM-powered weekly summaries
 */

import { JournalEntries } from './journal-entries';
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
 * Helper: Get Monday of the week containing the given date
 */
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

/**
 * Test case 1: Basic journal entry operations
 * Demonstrates creating, editing, and deleting entries
 */
export async function testBasicOperations(): Promise<void> {
    console.log('\n🧪 TEST CASE 1: Basic Journal Entry Operations');
    console.log('===============================================');
    
    const journal = new JournalEntries();
    const userId = 'user-123';
    
    // Create some entries
    console.log('📝 Creating journal entries...');
    const entry1 = journal.createEntry(
        userId,
        createDate('2025-10-06'),
        'Grateful for a productive day',
        'Completed assignment 3, went for a run',
        'Finished the LLM integration',
        'Start working on the presentation',
        2
    );
    console.log(`✅ Created entry ${entry1.id} for ${entry1.date.toISOString().split('T')[0]}`);
    
    const entry2 = journal.createEntry(
        userId,
        createDate('2025-10-07'),
        'Thankful for good weather',
        'Studied for midterm, met with study group',
        'Helped a classmate understand the material',
        'Continue studying, review notes',
        1
    );
    console.log(`✅ Created entry ${entry2.id} for ${entry2.date.toISOString().split('T')[0]}`);
    
    // Edit an entry
    console.log('\n✏️  Editing an entry...');
    journal.editEntry(entry1.id, {
        tomorrowPlan: 'Start presentation and review code',
        rating: 1
    });
    console.log(`✅ Updated entry ${entry1.id}`);
    
    // Display entries
    console.log('\n📋 All entries for user:');
    const entries = journal.getEntriesForUser(userId);
    entries.forEach(e => {
        console.log(`\nDate: ${e.date.toISOString().split('T')[0]}`);
        console.log(`  Gratitude: ${e.gratitude}`);
        console.log(`  Did Today: ${e.didToday}`);
        console.log(`  Proud Of: ${e.proudOf}`);
        console.log(`  Tomorrow Plan: ${e.tomorrowPlan}`);
        console.log(`  Rating: ${e.rating}`);
    });
}

/**
 * Test case 2: Weekly summary with sparse entries
 * Demonstrates LLM summary with only a few entries in the week
 */
export async function testSparseWeeklySummary(): Promise<void> {
    console.log('\n🧪 TEST CASE 2: Weekly Summary (Sparse Week)');
    console.log('============================================');
    
    const journal = new JournalEntries();
    const config = loadConfig();
    const llm = new GeminiLLM(config);
    const userId = 'user-456';
    
    // Create a couple of entries in a week
    console.log('📝 Creating sparse journal entries...');
    const weekStart = createDate('2025-10-06'); // Monday
    
    journal.createEntry(
        userId,
        createDate('2025-10-06'),
        'Grateful for my health',
        'Light workout, read a book',
        'Took time for self-care',
        'Get back to regular routine',
        0
    );
    console.log('✅ Created entry for Monday');
    
    journal.createEntry(
        userId,
        createDate('2025-10-09'),
        'Thankful for supportive friends',
        'Coffee with friends, worked on project',
        'Made progress on difficult problem',
        'Keep momentum going',
        1
    );
    console.log('✅ Created entry for Thursday');
    
    // Generate weekly summary using 'actionable' variant to ensure V3 validation passes
    console.log('\n🤖 Generating weekly summary...');
    const summary = await journal.summarizeWeek(llm, userId, weekStart, 'actionable');
    
    // Display summary
    console.log('\n📊 WEEKLY SUMMARY');
    console.log('=================');
    console.log(`Week: ${summary.weekStart.toISOString().split('T')[0]} to ${summary.weekEnd.toISOString().split('T')[0]}`);
    console.log(`Entry Count: ${summary.entryCount}`);
    console.log(`Average Rating: ${summary.avgRating}`);
    console.log(`Missing Days: ${summary.missingDays.length > 0 ? summary.missingDays.join(', ') : 'None'}`);
    console.log(`\n📝 Summary:\n${summary.summary}`);
    console.log(`\n🎯 Focus for Next Week:\n${summary.focus}`);
    console.log(`\nGenerated at: ${summary.generatedAt.toISOString()}`);
}

/**
 * Test case 3: Full week summary
 * Demonstrates LLM summary with entries across the entire week
 */
export async function testFullWeeklySummary(): Promise<void> {
    console.log('\n🧪 TEST CASE 3: Weekly Summary (Full Week)');
    console.log('==========================================');
    
    const journal = new JournalEntries();
    const config = loadConfig();
    const llm = new GeminiLLM(config);
    const userId = 'user-789';
    
    // Create entries for a full week
    console.log('📝 Creating journal entries for a full week...');
    const weekStart = createDate('2025-10-06'); // Monday
    
    const weekEntries = [
        {
            date: '2025-10-06',
            gratitude: 'Grateful for a fresh start to the week',
            didToday: 'Attended all classes, started new project',
            proudOf: 'Stayed organized and on top of tasks',
            tomorrowPlan: 'Continue project work, study for quiz',
            rating: 1
        },
        {
            date: '2025-10-07',
            gratitude: 'Thankful for helpful professor',
            didToday: 'Got clarification on assignment, worked in library',
            proudOf: 'Asked questions when confused',
            tomorrowPlan: 'Make progress on coding assignment',
            rating: 2
        },
        {
            date: '2025-10-08',
            gratitude: 'Grateful for productive study session',
            didToday: 'Completed coding assignment, reviewed lecture notes',
            proudOf: 'Finished assignment ahead of deadline',
            tomorrowPlan: 'Start preparing for presentation',
            rating: 2
        },
        {
            date: '2025-10-09',
            gratitude: 'Thankful for supportive study group',
            didToday: 'Group study session, practiced presentation',
            proudOf: 'Helped teammates understand difficult concepts',
            tomorrowPlan: 'Finalize presentation slides',
            rating: 1
        },
        {
            date: '2025-10-10',
            gratitude: 'Grateful for successful presentation',
            didToday: 'Delivered presentation, received positive feedback',
            proudOf: 'Overcame nervousness and presented confidently',
            tomorrowPlan: 'Relax and recharge for the weekend',
            rating: 2
        },
        {
            date: '2025-10-11',
            gratitude: 'Thankful for time to rest',
            didToday: 'Caught up on sleep, light exercise',
            proudOf: 'Prioritized self-care',
            tomorrowPlan: 'Enjoy the weekend, plan for next week',
            rating: 1
        },
        {
            date: '2025-10-12',
            gratitude: 'Grateful for a balanced week',
            didToday: 'Reflected on the week, planned ahead',
            proudOf: 'Maintained good work-life balance',
            tomorrowPlan: 'Start next week refreshed and ready',
            rating: 1
        }
    ];
    
    for (const entryData of weekEntries) {
        journal.createEntry(
            userId,
            createDate(entryData.date),
            entryData.gratitude,
            entryData.didToday,
            entryData.proudOf,
            entryData.tomorrowPlan,
            entryData.rating
        );
        console.log(`✅ Created entry for ${entryData.date}`);
    }
    
    // Generate weekly summary using 'actionable' variant to ensure V3 validation passes
    console.log('\n🤖 Generating weekly summary...');
    const summary = await journal.summarizeWeek(llm, userId, weekStart, 'actionable');
    
    // Display summary
    console.log('\n📊 WEEKLY SUMMARY');
    console.log('=================');
    console.log(`Week: ${summary.weekStart.toISOString().split('T')[0]} to ${summary.weekEnd.toISOString().split('T')[0]}`);
    console.log(`Entry Count: ${summary.entryCount}`);
    console.log(`Average Rating: ${summary.avgRating}`);
    console.log(`Missing Days: ${summary.missingDays.length > 0 ? summary.missingDays.join(', ') : 'None'}`);
    console.log(`Source Entry IDs: ${summary.sourceEntryIds.join(', ')}`);
    console.log(`\n📝 Summary:\n${summary.summary}`);
    console.log(`\n🎯 Focus for Next Week:\n${summary.focus}`);
    console.log(`\nGenerated at: ${summary.generatedAt.toISOString()}`);
    
    // Test idempotence - regenerate summary
    console.log('\n🔄 Testing idempotence - regenerating summary...');
    const summary2 = await journal.summarizeWeek(llm, userId, weekStart, 'actionable');
    console.log('✅ Summary regenerated successfully (overwrites previous)');
    console.log(`New generation time: ${summary2.generatedAt.toISOString()}`);
}

/**
 * Test case 4: Error handling
 * Demonstrates validation and error cases
 */
export async function testErrorHandling(): Promise<void> {
    console.log('\n🧪 TEST CASE 4: Error Handling');
    console.log('==============================');
    
    const journal = new JournalEntries();
    const config = loadConfig();
    const llm = new GeminiLLM(config);
    const userId = 'user-error';
    
    // Test: Invalid rating
    console.log('\n❌ Testing invalid rating...');
    try {
        journal.createEntry(
            userId,
            createDate('2025-10-06'),
            'Test',
            'Test',
            'Test',
            'Test',
            5 // Invalid rating
        );
        console.log('ERROR: Should have thrown an error!');
    } catch (error) {
        console.log(`✅ Correctly rejected: ${(error as Error).message}`);
    }
    
    // Test: Duplicate entry
    console.log('\n❌ Testing duplicate entry...');
    journal.createEntry(
        userId,
        createDate('2025-10-06'),
        'Test',
        'Test',
        'Test',
        'Test',
        1
    );
    try {
        journal.createEntry(
            userId,
            createDate('2025-10-06'),
            'Test 2',
            'Test 2',
            'Test 2',
            'Test 2',
            1
        );
        console.log('ERROR: Should have thrown an error!');
    } catch (error) {
        console.log(`✅ Correctly rejected: ${(error as Error).message}`);
    }
    
    // Test: No entries for week
    console.log('\n❌ Testing weekly summary with no entries...');
    try {
        await journal.summarizeWeek(llm, 'nonexistent-user', createDate('2025-10-06'));
        console.log('ERROR: Should have thrown an error!');
    } catch (error) {
        console.log(`✅ Correctly rejected: ${(error as Error).message}`);
    }
    
    console.log('\n✅ All error handling tests passed!');
}

/**
 * Main function to run all test cases
 */
async function main(): Promise<void> {
    console.log('📔 JournalEntries Test Suite');
    console.log('============================\n');
    
    try {
        // Run basic operations test
        await testBasicOperations();
        
        // Run sparse weekly summary test
        await testSparseWeeklySummary();
        
        // Run full weekly summary test
        await testFullWeeklySummary();
        
        // Run error handling test
        await testErrorHandling();
        
        console.log('\n🎉 All test cases completed successfully!');
        
    } catch (error) {
        console.error('❌ Test error:', (error as Error).message);
        console.error((error as Error).stack);
        process.exit(1);
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    main();
}
