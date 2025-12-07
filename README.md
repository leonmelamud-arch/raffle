# HypnoRaffle

A hypnotic raffle experience built with **Next.js**, **Tailwind CSS**, and **Supabase**.

## Features

- **Real-time Participation**: Join via QR code and see names appear instantly.
- **Hypnotic Visuals**: Engaging animations and "logo rain" effects.
- **Fair Selection**: Secure random winner selection.
- **Supabase Backend**: Robust data storage with Row Level Security.

## Prerequisites

- **Node.js**: Version 20 or higher.
- **npm**: Package manager.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd studio
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory and add your Supabase credentials:

    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
    *(Note: For local development, ask the team for the current credentials if you don't have them.)*

## Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

- **Participant View**: Scan the QR code or go to `/qr` to join.
- **Host View**: The main page displays the raffle and participants.
- **QR Display**: Go to `/qr-display` for a dedicated QR code screen.

## Building for Production

Create a production build:

```bash
npm run build
```

This acts as a verification step to ensure all static pages can be generated successfully.

## Deployment

This project is configured for **GitHub Pages** deployment via GitHub Actions.

1.  **Push to `main`**: Any push to the `main` branch triggers the deployment workflow.
2.  **Secrets**: The GitHub Repository Environment `github-pages` must have the following secrets/variables configured:
    - **Variables**: `NEXT_PUBLIC_SUPABASE_URL`
    - **Secrets**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
