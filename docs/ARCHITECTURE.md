# LessonFlow — architecture

A language-teacher workspace with student memory, lesson planning, reusable materials, weekly preparation and contextual AI generation.

## Code boundaries

- **src/app/:** Public pages, protected workspace, server actions and API routes.
- **src/components/:** Student, lesson, generation and materials UI.
- **src/lib/:** Auth, Supabase data access, generation and teaching logic.
- **database/:** Fresh schema, incremental migrations and inspection SQL.
- **tests/:** Offline generation and access regressions.
- **docs/:** Setup, architecture and listening examples.

## Data boundary

This public repository contains application source and fictional test inputs. Personal/operational state belongs in ignored local storage or separately configured services. Test results establish the behavior exercised by the suite; they do not certify live integrations, product efficacy or deployment readiness.

See the README for implementation status and `CONFIGURATION.md` for provider-specific requirements.
