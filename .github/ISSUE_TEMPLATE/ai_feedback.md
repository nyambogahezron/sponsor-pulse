---
name: AI Analysis / Segmentation Feedback
about: Report inaccurate AI transcript analysis, hallucinatory segments, or missed sponsors.
title: '[AI] Bad segmentation on video '
labels: 'ai-model, data-quality'
assignees: ''
---

**Video Information**
- YouTube Video URL or ID: 
- Channel Name: 

**What went wrong with the AI analysis?**
- [ ] Missed a sponsor/category completely
- [ ] Hallucinated a segment that wasn't there
- [ ] Timestamps were wildly inaccurate
- [ ] Misclassified the category (e.g., marked as 'sponsor' but was 'merch')

**Detailed Description**
Please provide the exact timestamps where the error occurred and what the AI returned versus what *should* have been returned.

*Example:* "At 10:45, the creator starts talking about their merch, but the AI categorized it as `intro_external`."

**Additional context**
Do you think the transcript was confusing or generated via auto-captions? Provide any context that might help us improve the Gemini API prompt.
