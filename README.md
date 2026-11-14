# SkillPath AI — Agentic Personalized Learning & Career Development Platform

SkillPath AI is a full-stack, multi-agent personalized learning platform built with React, TypeScript, Tailwind CSS, Recharts, Express, SQLite, and the Google Gemini API (`@google/genai`).

## Multi-Agent AI Architecture

Six specialized AI agents coordinate through a central orchestrator using structured JSON schemas:

1. **Skill Assessment Agent**: Analyzes learner profiles, projects, and certifications; dynamically generates mixed multiple-choice and applied coding/conceptual assessments; grades responses with granular feedback.
2. **Career Intelligence Agent**: Builds competency matrices for catalog or custom target roles, calculates weighted Career Readiness %, and identifies priority skill gaps.
3. **Learning Path Recommendation Agent**: Generates phased (`Beginner`, `Intermediate`, `Advanced`) roadmaps tailored to learning style and weekly hours with real official documentation/course links and practical exercises.
4. **Progress Evaluation Agent**: Compares assessment evidence against prior proficiency, classifies performance bands (`poor`, `steady`, `strong`), and recommends remedial drills or advanced projects.
5. **AI Mentor Agent**: Context-aware conversational mentor grounded in the learner's live profile, skill gaps, active roadmap, and recent assessment weak topics.
6. **Agent Orchestrator**: Coordinates Scenarios A–D automatically:
   - **Scenario A (Career Goal Change)**: Re-computes required skills and adapts the roadmap while preserving overlapping completed work.
   - **Scenario B (Poor Performance < 55%)**: Inserts targeted remedial tutorials at the front of the roadmap.
   - **Scenario C (Strong Performance ≥ 80%)**: Upgrades skill proficiency, bypasses redundant beginner modules, and adds advanced applied projects.
   - **Scenario D (Module Completion)**: Updates readiness, logs study progress, unlocks subsequent modules, and prompts validation assessments.

## Setup & Execution

1. Ensure dependencies are installed:
   ```bash
   npm install
   ```
2. Configure environment variables (e.g., `GEMINI_API_KEY` in `.env` or runtime secrets).
3. Run the full-stack development server (port 3000):
   ```bash
   npm run dev
   ```
4. Build and run for production:
   ```bash
   npm run build
   npm start
   ```

## Demonstration Accounts

- **Student Track (AI Engineer)**: `alex.student@skillpath.ai` / `DemoPass123!`
- **Organization Admin (Apex Tech Academy)**: `elena.org@skillpath.ai` / `DemoPass123!`
- Or register a new account (`student`, `employee`, or `organization`) to run the 6-step AI onboarding flow from scratch.
