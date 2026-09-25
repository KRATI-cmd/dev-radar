# TechRadar 🚀

**Your Personal AI-Powered Technology Discovery Engine**

Stay ahead of the curve with personalized recommendations for Full-Stack Development, DevOps, and AI/ML technologies.

---

## What is TechRadar?

TechRadar automatically discovers trending technologies, analyzes them with Claude AI, and delivers personalized digests tailored to your backend engineering background. It scans GitHub and NPM daily, intelligently categorizes findings, and helps you make better development decisions.

### For You (Backend Engineer):
- **Discovers** new Node.js libraries, frameworks, and tools before they go mainstream
- **Analyzes** DevOps solutions and infrastructure technologies relevant to your work
- **Tracks** emerging AI/ML tools you could integrate into projects
- **Guides** your development with actionable insights and learning paths
- **Integrates** directly into your code for real-time assistance

---

## Quick Start

### 1. Setup

```bash
# Install dependencies
npm install

# Create .env file
echo "ANTHROPIC_API_KEY=your_key_here" > .env
```

Get your API key from [console.anthropic.com](https://console.anthropic.com)

### 2. Run TechRadar

```bash
# Start automated scheduler (runs in background)
npm run dev

# Or run specific commands
npm run collect          # Fetch latest technologies
npm run digest:daily     # Generate today's digest
npm run digest:latest    # View last generated digest
npm run search "kubernetes"  # Search for technologies
```

### 3. Use in Your Development

```typescript
import { CodeAssistant } from './ai/assistant'

// Get suggestions for a problem
const solutions = CodeAssistant.getSuggestions('postgres optimization')

// Explore trending backend tools
const backendTrends = CodeAssistant.getBackendTrends()

// Find alternatives to technologies you know
const alternatives = CodeAssistant.findAlternatives('express.js')

// Generate a learning path
const learningPath = CodeAssistant.generateLearningPath('microservices')

// Get your starred discoveries
const favorites = CodeAssistant.getStarredDiscoveries()
```

---

## How It Works

```
┌─────────────────────────────────────────────────────┐
│  Data Collection (12-hourly)                        │
│  - GitHub Trending API                              │
│  - NPM Registry (new packages)                       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  AI Analysis (Claude API)                           │
│  - Categorization (FSD/DevOps/AI-ML/etc)           │
│  - Relevance Scoring (to your stack)                │
│  - Summary Generation                              │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Storage (SQLite)                                   │
│  - Tech items with metadata                         │
│  - User preferences & starred items                 │
│  - Digest history                                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Daily/Weekly Digests                               │
│  - HTML & Markdown reports                          │
│  - Categorized recommendations                      │
│  - Actionable insights                              │
└─────────────────────────────────────────────────────┘
```

---

## CLI Commands

```bash
# Collection & Analysis
npm run collect                    # Fetch and analyze new technologies

# Digest Generation
npm run digest:daily               # Generate today's digest
npm run digest:weekly              # Generate this week's digest
npm run digest:latest              # View the last generated digest

# Searching & Browsing
npm run search "kubernetes"        # Search for technologies
npm run show backend               # Show top backend technologies
npm run show devops                # Show top DevOps tools
npm run show ai-ml                 # Show AI/ML discoveries

# Interaction
npm run star <item-id>             # Mark item as interesting
npm run dismiss <item-id>          # Hide item from future digests
npm run help                       # Show all commands

# Automation
npm run dev                        # Start scheduler (background mode)
npm run start                      # Production scheduler mode
```

---

## Using TechRadar in Your Code

### Example 1: Quick Problem Solving

```typescript
// When debugging a performance issue
const solutions = CodeAssistant.getSuggestions('node.js memory leak debugging')

solutions.forEach(item => {
  console.log(`${item.title}: ${item.url}`)
  console.log(`Why it matters: ${item.aiSummary}`)
})
```

### Example 2: Architecture Decision Making

```typescript
// When choosing between cache solutions
const cacheOptions = CodeAssistant.getSuggestions('redis alternative cache layer')

// When deciding on a message queue
const messageQueues = CodeAssistant.getSuggestions('kafka alternative message broker')

// When planning DevOps infrastructure
const devopsTools = CodeAssistant.getDevOpsTrends()
```

### Example 3: Learning & Growth

```typescript
// Create a learning path for mastering Kubernetes
const k8sPath = CodeAssistant.generateLearningPath('kubernetes')
// Returns items ranked by relevance to your experience

// Explore full-stack for side projects
const fullstack = CodeAssistant.getFullStackTrends()
```

### Example 4: Integration Points

```typescript
// In your project initialization
import { CodeAssistant } from 'techradar'

class ProjectInitializer {
  async selectDependencies() {
    // Get trending backend frameworks
    const frameworks = CodeAssistant.getBackendTrends()
    
    // Filter to only production-ready
    const recommended = frameworks.filter(f => f.stars > 5000)
    
    return recommended
  }
}
```

---

## Output Examples

### Daily Digest Format

```markdown
# 🚀 TechRadar Daily Digest
**Generated:** Sept 24, 2026 8:00 AM

## 📈 Top Trends
- AI/ML integration into backend systems
- Rust adoption for system tools
- Container orchestration evolution

## 💡 Key Insights
- TypeScript becoming standard for backend
- DevOps automation is critical
- AI tools are no longer optional

## 🖥️ BACKEND
### [Fastify](https://github.com/fastify/fastify)
High-performance Node.js web framework focused on developer experience and speed.

**Why this matters:** 40% faster than Express with built-in validation and TypeScript support

**Action Items:**
- Evaluate for next microservice
- Check migration guides from Express

---
```

### Storage Structure

```
techradar/
├── data/
│   └── techradar.db          # SQLite database
├── output/
│   ├── techradar_daily_2026-09-24.md
│   ├── techradar_weekly_2026-09-24.md
│   └── ...
├── config/
│   └── preferences.json      # Your customizations
└── logs/                     # (optional) Log files
```

---

## Scheduled Tasks

By default, TechRadar runs:

- **Every 12 hours**: Collect and analyze new technologies
- **Daily at 8:00 AM**: Generate morning digest
- **Weekly on Sunday at 9:00 AM**: Comprehensive weekly analysis

Customize in `src/index.ts` if needed.

---

## Why This Helps Your Development

1. **Stay Current**: New technologies emerge constantly. TechRadar keeps you informed.

2. **Better Decisions**: Before picking a library, see how it stacks up. Get AI-driven analysis.

3. **Learn Faster**: Curated learning paths based on technologies you're interested in.

4. **Architecture Insights**: Discover patterns and tools used by leading projects.

5. **Career Growth**: Stay ahead of industry trends for promotions and new opportunities.

6. **Project Success**: Make informed choices about dependencies and architecture early.

---

## Privacy & Data

- All analysis runs locally on your machine
- Only your API key connects to external services (Anthropic, GitHub, NPM APIs)
- Your discoveries and preferences are stored in local SQLite database
- No data is sent to third parties

---

## Customization

Edit `config/preferences.json` to customize:

```json
{
  "primaryStack": ["Node.js", "TypeScript", "PostgreSQL"],
  "interests": ["Microservices", "DevOps", "AI/ML"],
  "experienceLevel": "senior",
  "excludeKeywords": ["wordpress", "php", "legacy"],
  "digestTime": "08:00",
  "digestDays": ["daily", "weekly"]
}
```

---

## Troubleshooting

**No items found in digest:**
```bash
npm run collect        # First collect new items
npm run digest:daily   # Then generate digest
```

**API rate limits:**
TechRadar caches results. If you hit API limits, wait a few hours or upgrade your API keys.

**Database corrupted:**
```bash
rm data/techradar.db   # Delete and restart
npm run collect        # Rebuild from scratch
```

---

## Project Structure

```
src/
├── index.ts                 # CLI entry point & scheduler
├── types.ts                 # TypeScript interfaces
├── collectors/
│   └── sources.ts           # GitHub & NPM data fetching
├── ai/
│   ├── analyzer.ts          # Claude API integration
│   └── assistant.ts         # Developer assistance API
├── storage/
│   └── database.ts          # SQLite layer
└── digest/
    └── generator.ts         # Report generation
```

---

## What's Next?

- ✅ Daily digests automated
- ✅ AI-powered recommendations
- ✅ Developer assistant integration
- 🔜 Email digest delivery
- 🔜 Slack integration
- 🔜 Web dashboard for browsing
- 🔜 Team collaboration features

---

## Contributing & Feedback

Found a bug? Have a feature idea? Use this for your own team?

Let me know! TechRadar is built to evolve with your needs.

---

**Built with ❤️ for developers who want to stay ahead of the technology curve.**

*TechRadar - Your Personal Technology Discovery Engine*
