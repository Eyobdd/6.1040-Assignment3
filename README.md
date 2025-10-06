# Gemini Schedule Demo

This repository demonstrates AI-augmented concepts using Google's Gemini API, including:
- **DayPlanner**: Organize activities for a single day with manual and AI-assisted scheduling
- **JournalEntries**: Daily structured journal entries with AI-powered weekly summaries (Assignment 3)
## Concepts

### Concept: JournalEntries (Assignment 3)

**Purpose**: Preserve daily structured entries and add AI-powered weekly synthesis to aid reflection and next-week focus  
**Principle**: Manual viewing/editing of per-day entries, with optional LLM-generated weekly summaries

**Specifications**:
- Original concept: [`./assignment-3/journal_entry.spec`](./assignment-3/journal_entry.spec)

  _**Note:** This concept was refined to align with feed back on previous assignments(tagging was removed from this concept)_
- AI-augmented concept: [`./assignment-3/journal_entry_ai.spec`](./assignment-3/journal_entry_ai.spec)

#### Core State
- **JournalEntry**: Daily entries with gratitude, didToday, proudOf, tomorrowPlan, rating (-2 to 2)
- **WeeklySummary**: AI-generated weekly insights with computed stats (entryCount, avgRating, missingDays) and LLM-generated summary/focus

#### Core Actions
- `createEntry()` - Create a new journal entry for a specific date
- `editEntry()` - Update fields of an existing entry
- `deleteEntry()` - Remove an entry
- `summarizeWeek()` - Generate AI-powered weekly summary using Gemini

#### Key Features
- **Deterministic aggregates**: Entry count, average rating, and missing days computed by code
- **LLM synthesis**: Gemini generates concise summary (≤120 words) and focus suggestions to improve your week (≤60 words)
- **Idempotent**: Re-running weekly summary updates (rather than duplicating) existing summary
- **Strict JSON**: LLM output parsed as structured JSON for reliability

---

### Concept: DayPlanner

**Purpose**: Help you organize activities for a single day  
**Principle**: You can add activities one at a time, assign them to times, and then observe the completed schedule

#### Core State
- **Activities**: Set of activities with title, duration, and optional startTime
- **Assignments**: Set of activity-to-time assignments
- **Time System**: All times in half-hour slots starting at midnight (0 = 12:00 AM, 13 = 6:30 AM)

#### Core Actions
- `addActivity(title: string, duration: number): Activity`
- `removeActivity(activity: Activity)`
- `assignActivity(activity: Activity, startTime: number)`
- `unassignActivity(activity: Activity)`
- `requestAssignmentsFromLLM()` - AI-assisted scheduling with hardwired preferences

#### Prerequisites

- **Node.js** (version 14 or higher)
- **TypeScript** (will be installed automatically)
- **Google Gemini API Key** (free at [Google AI Studio](https://makersuite.google.com/app/apikey))

#### Quick Setup

#### 0. Clone the repo locally and navigate to it
```cd intro-gemini-schedule```

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Add Your API Key

**Why use a template?** The `config.json` file contains your private API key and should never be committed to version control. The template approach lets you:
- Keep the template file in git (safe to share)
- Create your own `config.json` locally (keeps your API key private)
- Easily set up the project on any machine

**Step 1:** Copy the template file:
```bash
cp config.json.template config.json
```

**Step 2:** Edit `config.json` and add your API key:
```json
{
  "apiKey": "YOUR_GEMINI_API_KEY_HERE"
}
```

**To get your API key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it into `config.json` (replacing `YOUR_GEMINI_API_KEY_HERE`)

#### 3. Run the Application

**Run JournalEntries (Assignment 3 - default):**
```bash
npm start
```

**Run DayPlanner test cases:**
```bash
npm run dayplanner  # All DayPlanner tests
npm run manual      # Manual scheduling only
npm run llm         # LLM-assisted scheduling only
npm run mixed       # Mixed manual + LLM scheduling
```

#### File Structure

```
intro-gemini-schedule/
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── config.json                   # Your Gemini API key (gitignored)
├── config.json.template          # Template for config.json
├── gemini-llm.ts                 # Shared LLM integration
├── journal-entries.ts            # JournalEntries concept implementation
├── journal-entries-tests.ts      # JournalEntries test cases
├── dayplanner.ts                 # DayPlanner concept implementation
├── dayplanner-tests.ts           # DayPlanner test cases
├── assignment-3/                 # Assignment 3 specifications
│   ├── journal_entry.spec        # Original JournalEntries spec
│   └── journal_entry_ai.spec     # AI-augmented spec
├── dist/                         # Compiled JavaScript output
└── README.md                     # This file
```

#### Test Cases

The application includes three comprehensive test cases:

#### 1. Manual Scheduling
Demonstrates adding activities and manually assigning them to time slots:

```typescript
const planner = new DayPlanner();
const breakfast = planner.addActivity('Breakfast', 1); // 30 minutes
planner.assignActivity(breakfast, 14); // 7:00 AM
```

#### 2. LLM-Assisted Scheduling
Shows AI-powered scheduling with hardwired preferences:

```typescript
const planner = new DayPlanner();
planner.addActivity('Morning Jog', 2);
planner.addActivity('Math Homework', 4);
await llm.requestAssignmentsFromLLM(planner);
```

#### 3. Mixed Scheduling
Combines manual assignments with AI assistance for remaining activities.

#### Sample Output

```
📅 Daily Schedule
==================
7:00 AM - Breakfast (30 min)
8:00 AM - Morning Workout (1 hours)
10:00 AM - Study Session (1.5 hours)
1:00 PM - Lunch (30 min)
3:00 PM - Team Meeting (1 hours)
7:00 PM - Dinner (30 min)
9:00 PM - Evening Reading (1 hours)

📋 Unassigned Activities
========================
All activities are assigned!
```

#### Key Features

- **Simple State Management**: Activities and assignments stored in memory
- **Flexible Time System**: Half-hour slots from midnight (0-47)
- **Query-Based Display**: Schedule generated on-demand, not stored sorted
- **AI Integration**: Hardwired preferences in LLM prompt (no external hints)
- **Conflict Detection**: Prevents overlapping activities
- **Clean Architecture**: First principles implementation with no legacy code

#### LLM Preferences (Hardwired)

The AI uses these built-in preferences:
- Exercise activities: Morning (6:00 AM - 10:00 AM)
- Study/Classes: Focused hours (9:00 AM - 5:00 PM)
- Meals: Regular intervals (breakfast 7-9 AM, lunch 12-1 PM, dinner 6-8 PM)
- Social/Relaxation: Evenings (6:00 PM - 10:00 PM)
- Avoid: Demanding activities after 10:00 PM

#### Troubleshooting

##### "Could not load config.json"
- Ensure `config.json` exists with your API key
- Check JSON format is correct

##### "Error calling Gemini API"
- Verify API key is correct
- Check internet connection
- Ensure API access is enabled in Google AI Studio

##### Build Issues
- Use `npm run build` to compile TypeScript
- Check that all dependencies are installed with `npm install`

#### Next Steps

Try extending the DayPlanner:
- Add weekly scheduling
- Implement activity categories
- Add location information
- Create a web interface
- Add conflict resolution strategies
- Implement recurring activities

#### Resources

- [Google Generative AI Documentation](https://ai.google.dev/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
