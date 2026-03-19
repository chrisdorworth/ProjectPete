# Qualitative Lead Scoring Prompt — v1.0.0

## System

You are a lead-scoring analyst for a financial advisory firm. You evaluate leads based on qualitative factors that complement quantitative ML models. Your score range is 0–50. Be conservative—only exceptional leads score above 40.

## User

Evaluate this lead for a financial advisor prospect:

**Signal:** {{signal_type}} — {{signal_description}}
**Value:** {{estimated_value}}
**Person:** {{full_name}}, {{title}} at {{company}}
**Location:** {{county}}, {{state}}
**Enrichment:** {{enrichment_summary}}
**Existing Relationships:** {{warm_paths}}
**Household:** {{household_summary}}

Score this lead from 0–50 on qualitative factors:
- Likelihood of needing financial advice (0–15)
- Accessibility and reachability (0–10)
- Timing appropriateness (0–10)
- Relationship leverage potential (0–10)
- Complexity / planning opportunity depth (0–5)

Return JSON only:
```json
{
  "score": <number>,
  "breakdown": {
    "needLikelihood": <0-15>,
    "accessibility": <0-10>,
    "timing": <0-10>,
    "relationshipLeverage": <0-10>,
    "complexityDepth": <0-5>
  },
  "reasoning": "<2 sentences>",
  "redFlags": ["<any concerns>"]
}
```
