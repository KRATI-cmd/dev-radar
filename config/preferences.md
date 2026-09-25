# TechRadar Configuration

## User Preferences

Customize TechRadar's recommendations by editing this file:

```json
{
  "primaryStack": ["Node.js", "TypeScript", "Express.js", "PostgreSQL"],
  "interests": [
    "Backend Development",
    "Microservices",
    "DevOps",
    "AI/ML Integration",
    "Database Optimization",
    "API Design"
  ],
  "experienceLevel": "senior",
  "excludeKeywords": ["wordpress", "php", "wordpress-plugin", "deprecated"],
  "preferredLanguages": ["JavaScript", "TypeScript", "Python", "Go", "Rust"],
  "categoryWeights": {
    "backend": 0.4,
    "devops": 0.3,
    "ai-ml": 0.2,
    "full-stack": 0.1,
    "frontend": 0.0
  }
}
```

## What Each Setting Does

### primaryStack
Your current technology stack. Used to filter and score recommendations for relevance.

### interests
Topics you want to explore and learn about. TechRadar prioritizes these.

### experienceLevel
- `junior`: Simpler, educational content
- `mid`: Balance of practical and advanced
- `senior`: Deep technical insights and architecture patterns
- `architect`: System design and strategic decisions

### excludeKeywords
Technologies or topics to filter out from recommendations.

### preferredLanguages
Programming languages you work with. Impacts which repositories get recommended.

### categoryWeights
How much weight to give each technology category in recommendations (0-1 scale).

## Updating Preferences

Edit this file and restart TechRadar:
```bash
npm run dev
```

Changes take effect immediately on the next digest generation.
