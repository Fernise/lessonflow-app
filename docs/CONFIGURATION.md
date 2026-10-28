# Configuration

## Supabase

Create a separate development project and apply `database/schema.sql` to a new database. Existing databases should use a reviewed migration path instead of blindly reapplying a fresh schema. Configure `NEXT_PUBLIC_SUPABASE_URL` and the project's public anonymous/publishable client key in ignored `.env.local`.

The browser client must never receive a service-role key. Authenticated user data relies on Supabase Auth and row-level security. Configure OAuth providers and redirect URLs in your own Supabase/provider accounts; no account-specific client ID is bundled.

## Optional services

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Server-side material generation |
| `MOCK_OPENAI=true` | Mock generated content for an authenticated development workspace |
| `SUPADATA_API_KEY` | Optional listening transcript provider |
| `RESEND_API_KEY` | Optional server-side notification provider |
| `FEEDBACK_NOTIFICATION_EMAIL` / `FEEDBACK_FROM_EMAIL` | Operator-chosen mail routing |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | Optional analytics; leave blank to disable |

All values in the committed template are blank placeholders or non-secret defaults. Do not put real student notes, database exports, user tokens or teaching memory into examples.

## Feedback administration

The public edition grants cross-user feedback review only when the authenticated user's **server-managed** Supabase `app_metadata.feedback_admin` value is the JSON boolean `true`. Both the UI check and the SQL read policy use this claim. An email address or user-editable `user_metadata` must not grant administration.

Assign the claim through your trusted Supabase administration tooling. Never let users update `app_metadata` through application settings. Refresh the authenticated session after a trusted metadata change. Old installations using the former email-based policy must deliberately apply the new migration `20261028_feedback_admin_claim.sql`.

## Offline build verification

Unit tests need no credentials. To build UI routes without real accounts, supply only synthetic build-time placeholders:

```sh
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=public-demo-placeholder npm run build
```

Those placeholders do not create a working authenticated workspace or prove any live integration.
