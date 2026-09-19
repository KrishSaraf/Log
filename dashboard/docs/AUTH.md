# Auth (Google + Apple)

Log uses [Auth.js](https://authjs.dev) (NextAuth v5). Users and OAuth accounts live in
Postgres; sessions are JWTs so the Edge middleware stays lightweight.
Each signed-in user gets their own habits, workouts, meals, health metrics, and insights.
The shared exercise library is global (not per-user).

## Env vars

Copy into `dashboard/.env.local` (see `.env.example`):

```bash
AUTH_SECRET=           # openssl rand -base64 32
AUTH_URL=http://localhost:3001

AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

AUTH_APPLE_ID=         # Apple Services ID (e.g. com.yourapp.web)
AUTH_APPLE_SECRET=     # JWT client secret generated from your .p8 key
```

`AUTH_SECRET` is already set for local.

### Local test login (no Google/Apple)

Until OAuth apps are set up, use:

```bash
AUTH_DEV_LOGIN=1
NEXT_PUBLIC_AUTH_DEV_LOGIN=1
```

That shows **Continue as Krish (local)** on `/sign-in` and signs you in as the
legacy owner, so your imported spreadsheet data is visible. Turn both off before
any real deploy.

Google/Apple buttons only appear after you set their secrets and
`NEXT_PUBLIC_AUTH_GOOGLE=1` / `NEXT_PUBLIC_AUTH_APPLE=1`.

## Google

1. Open [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → create an OAuth client (Web application).
2. Authorized JavaScript origins: `http://localhost:3001`
3. Authorized redirect URI: `http://localhost:3001/api/auth/callback/google`
4. Paste Client ID → `AUTH_GOOGLE_ID`, Client secret → `AUTH_GOOGLE_SECRET`.

## Apple

1. In [Apple Developer](https://developer.apple.com/account/resources/identifiers/list/serviceId) create an **App ID**, then a **Services ID** for Sign in with Apple (that Services ID is `AUTH_APPLE_ID`).
2. Enable Sign in with Apple on the Services ID; return URL: `http://localhost:3001/api/auth/callback/apple`
3. Create a **Key** (.p8) with Sign in with Apple enabled. Use Team ID + Key ID + the .p8 to generate a client secret JWT (Auth.js Apple provider expects this as `AUTH_APPLE_SECRET`). Many teams use a short script or [apple-signin-auth](https://www.npmjs.com/package/apple-signin-auth) to mint it; refresh before the JWT expires (max ~6 months).

Apple requires HTTPS for production return URLs. Localhost is fine for development.

## Claiming imported spreadsheet data

The multi-user migration assigned existing rows to a legacy owner (`legacy@log.local`).
After you sign in once with Google or Apple:

```bash
cd dashboard
LEGACY_OWNER_EMAIL=you@gmail.com CLAIM=1 npx tsx scripts/migrate-multiuser.ts
```

That moves habits / workouts / meals / health / insights onto your account.

## How isolation works

- Middleware sends anonymous visitors to `/sign-in`.
- Pages and write APIs load or insert with `session.user.id`.
- New users get a default habit set on first sign-in (`createUser` event).
