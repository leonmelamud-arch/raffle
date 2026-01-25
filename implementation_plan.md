
# Implementation Plan - Google SSO & Admin Access

This plan outlines the steps to implement Google Single Sign-On (SSO) and restrict the Admin Dashboard to specific users (`leonmelamud@gmail.com` and `leon.melamud@thetaray.com`).

## 1. Supabase Configuration (User Action Required)
You will need to configure the Google Provider in your Supabase Dashboard.

1.  Go to **Authentication** -> **Providers** -> **Google**.
2.  Enable specific Google Sign-In.
3.  You will need a **Client ID** and **Client Secret** from the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new Project (or use existing).
    *   Go to **APIs & Services** -> **Credentials**.
    *   Create Credentials -> OAuth client ID -> Web application.
    *   **Authorized JavaScript Origins**: `https://qr.ai-know.org` (and `http://localhost:9002` for dev).
    *   **Authorized Redirect URIs**: `https://qr.ai-know.org/auth/callback` (and `http://localhost:9002/auth/callback` for dev).
4.  Copy the Client ID and Secret into Supabase.
5.  **URL Configuration**: In Supabase **Authentication** -> **URL Configuration**, set the **Site URL** to `https://qr.ai-know.org` (and ensure `localhost:9002` is in Redirect URLs).

## 2. Environment Variables
Ensure your `.env.local` contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 3. Code Implementation Steps

### A. Create Login Page (`src/app/login/page.tsx`)
*   A clean, centered card with a "Sign in with Google" button.
*   The button will trigger `supabase.auth.signInWithOAuth`.

### B. Create Auth Callback Handler (`src/app/auth/callback/route.ts`)
*   This server route handles the return trip from Google.
*   It calls `supabase.auth.exchangeCodeForSession(code)` to set the cookie.
*   Redirects the user to `/admin` (or the intended page) after login.

### C. Implement Middleware (`src/middleware.ts`)
*   Uses `@supabase/auth-helpers-nextjs` to manage the session.
*   Intercepts requests to `/admin`.
*   Checks if a user allows access.
*   Refreshes the session if needed.

### D. Update Admin Dashboard (`src/app/admin/page.tsx`)
*   Add a "Sign Out" button.
*   (Optional) Update the client implementation to use `createClientComponentClient` for better cookie handling.

### E. Schema Verification (Already Done)
*   You have already provided `supabase_schema.sql` which correctly sets up:
    *   `profiles` table with roles.
    *   `people` table with RLS policies.
    *   `handle_new_user` trigger to auto-assign admin role to your emails.
*   **Action**: Ensure you have executed this SQL in your Supabase SQL Editor.

## 4. Testing
1.  Run `npm run dev`.
2.  Go to `/admin` -> Should redirect to `/login`.
3.  Click "Sign in with Google".
4.  Complete login.
5.  Should redirect back to `/admin` and show the dashboard.
6.  Verify that only the whitelist emails can see/edit data.
