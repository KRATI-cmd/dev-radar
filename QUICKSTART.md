# 🚀 TechRadar - Quick Start Guide

## What You Just Built

**TechRadar** is your personal AI-powered technology discovery engine that:
- ✅ Works **completely free** (no API keys required)
- ✅ Discovers trending technologies from GitHub & NPM
- ✅ Analyzes them using intelligent rule-based system
- ✅ Delivers daily/weekly digests with recommendations
- ✅ Integrates into your development workflow

---

## Getting Started (5 minutes)

### 1. No API Key Required!

TechRadar works **100% free** because it uses:
- **Rule-based analysis** instead of expensive AI APIs
- **GitHub/NPM public APIs** (free tier is generous)
- **Local SQLite database** on your machine

**Optional:** If you later get a Claude/OpenAI API key, TechRadar will automatically upgrade to use it.

### 2. First Run

```bash
# Navigate to project
cd D:\new\techradar

# Create .env (optional - not needed for free mode)
copy .env.example .env

# Start collecting & analyzing technologies
npm run collect

# Generate your first digest
npm run digest:daily

# View the digest
npm run digest:latest
```

### 3. Check the Output

Your digests are saved in:
```
D:\new\techradar\output\
├── techradar_daily_2026-09-24.md
├── techradar_weekly_2026-09-24.md
└── ...
```

Open any `.md` file in your editor or browser.

---

## How It Works (Without APIs)

```
1. COLLECT (every 12 hours)
   └─ GitHub Trending API (free, public)
   └─ NPM Registry (free, public)
   └─ Stores in local SQLite database

2. ANALYZE (rule-based, instant)
   └─ Scores by: keywords, popularity, language match
   └─ Categorizes: Backend/DevOps/AI-ML/Frontend
   └─ Generates insights automatically

3. DIGEST (on schedule)
   └─ Creates beautiful Markdown reports
   └─ Saved locally, ready to view/share
```

**No external API calls for analysis = Always free!**

---

## Daily Usage

### Manual Commands

```bash
# Collect new technologies right now
npm run collect

# Generate today's digest
npm run digest:daily

# Generate this week's digest
npm run digest:weekly

# View latest digest
npm run digest:latest

# Search for something specific
npm run search "kubernetes"

# Browse by category
npm run show backend
npm run show devops
npm run show ai-ml

# Mark interesting items
npm run star <item-id>

# Hide items you don't care about
npm run dismiss <item-id>
```

### Automated Mode

```bash
# Start scheduler (runs in background)
npm run dev

# Logs:
# ✅ Daily digest at 8:00 AM
# ✅ Weekly digest every Sunday 9:00 AM
# ✅ Collects new tech every 12 hours

# Just open digests/output folder when you want to read
```

---

## Use TechRadar in Your Code

### Example 1: Quick Problem Solving

```typescript
import { CodeAssistant } from './ai/assistant'

// When debugging
const solutions = CodeAssistant.getSuggestions('node.js memory leak')
// Returns: array of relevant libraries and tools

// When choosing tools
const alternatives = CodeAssistant.findAlternatives('express.js')
// Returns: similar frameworks you might use
```

### Example 2: Learning New Technologies

```typescript
// Create a learning path
const learnKubernetes = CodeAssistant.generateLearningPath('kubernetes')

// Get trending in your area
const backendTrends = CodeAssistant.getBackendTrends()
const devopsTrends = CodeAssistant.getDevOpsTrends()
const aimlTrends = CodeAssistant.getAIMachineLearning()
```

### Example 3: Project Planning

```typescript
// When starting a new project
const dbOptions = CodeAssistant.getSuggestions('postgresql alternative')
const cacheOptions = CodeAssistant.getSuggestions('redis cache layer')
const deployTools = CodeAssistant.getDevOpsTrends()
```

---

## Customization

Edit `config/preferences.json`:

```json
{
  "primaryStack": ["Node.js", "TypeScript", "PostgreSQL"],
  "interests": [
    "Microservices",
    "DevOps",
    "AI/ML Integration",
    "Performance Optimization"
  ],
  "experienceLevel": "senior",
  "excludeKeywords": ["wordpress", "legacy", "deprecated"]
}
```

---

## Upgrading to Paid AI (Optional)

If you want even better analysis later:

### Option 1: Claude API (Recommended)
```bash
# Get key from: https://console.anthropic.com
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npm run dev
# TechRadar automatically uses Claude for deeper analysis
```

### Option 2: Local LLM with Ollama (Free)
```bash
# Install from: https://ollama.ai
ollama pull llama2
ollama run llama2

# TechRadar will detect and use it automatically
```

### Option 3: Groq (Free, Fast)
```bash
# Sign up: https://console.groq.com
# Get API key, add to .env
echo "GROQ_API_KEY=..." > .env
npm run dev
```

**Even without these, TechRadar works great with free mode!**

---

## File Structure

```
D:\new\techradar\
├── src/
│   ├── index.ts                 ← Main entry point
│   ├── types.ts                 ← Data types
│   ├── collectors/
│   │   └── sources.ts           ← GitHub/NPM data fetching
│   ├── ai/
│   │   ├── analyzer.ts          ← Analysis engine (free + paid)
│   │   ├── free-analyzer.ts     ← Rule-based analysis
│   │   └── assistant.ts         ← Your development helper
│   ├── storage/
│   │   └── database.ts          ← SQLite operations
│   └── digest/
│       └── generator.ts         ← Report generation
├── data/
│   └── techradar.db             ← Your technology database
├── output/
│   ├── techradar_daily_*.md     ← Daily digests
│   └── techradar_weekly_*.md    ← Weekly digests
└── config/
    └── preferences.json         ← Your customizations
```

---

## Real-World Usage Examples

### Morning Routine
```bash
# 1. Check overnight digest
npm run digest:latest

# 2. Look for interesting items
npm run show backend

# 3. Star something for later research
npm run star gh_12345
```

### During Development
```typescript
// In your code when you need help

import { CodeAssistant } from 'techradar/dist/ai/assistant'

// When selecting a library
const dbOptions = CodeAssistant.getSuggestions('postgresql alternative')
console.log('Top alternatives:', dbOptions)

// When learning something new
const k8spath = CodeAssistant.generateLearningPath('kubernetes')
```

### Weekly Planning
```bash
# Get comprehensive overview
npm run digest:weekly

# Review what was important this week
# Share with team if relevant
```

---

## Troubleshooting

**"No items found"**
```bash
npm run collect      # Fetch new items first
npm run digest:daily # Then generate digest
```

**"Database error"**
```bash
# Reset the database
rm data/techradar.db
npm run collect     # Rebuild from scratch
```

**"Want to use paid AI later?"**
```bash
# Just add API key to .env
echo "ANTHROPIC_API_KEY=sk-ant-xxx" > .env
# TechRadar automatically switches to paid mode
```

**"Want to change collection schedule?"**
Edit `src/index.ts` around line 100:
```typescript
// Daily digest at 8 AM
cron.schedule('0 8 * * *', ...)

// Weekly digest at 9 AM Sunday
cron.schedule('0 9 * * 0', ...)

// Collect every 12 hours
cron.schedule('0 */12 * * *', ...)
```

---

## Why TechRadar is Perfect for You

✅ **Free** - No API costs, works with Omniroute  
✅ **Smart** - Rule-based analysis tuned to your stack  
✅ **Fast** - Instant recommendations, no waiting  
✅ **Practical** - Discovers real tools you can use today  
✅ **Scalable** - Upgrade to paid AI whenever you want  
✅ **Integrated** - Use directly in your development workflow  

---

## Next Steps

1. **Run first collection:**
   ```bash
   npm run collect
   ```

2. **Generate first digest:**
   ```bash
   npm run digest:daily
   ```

3. **Open and read the digest:**
   ```
   D:\new\techradar\output\techradar_daily_*.md
   ```

4. **Try a search:**
   ```bash
   npm run search "kubernetes"
   ```

5. **Start the scheduler:**
   ```bash
   npm run dev
   # Runs in background, generates digests automatically
   ```

---

## Questions?

- Check `README.md` for full documentation
- View `config/preferences.json` to customize
- Explore `src/ai/assistant.ts` for available functions
- Output digests show all discovered items with details

**You now have a personal technology radar that runs completely free and keeps you ahead of the curve!** 🚀

---

*Built for developers who want to stay current with evolving technology — without the cost.*
