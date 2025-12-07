# **App Name**: HypnoRaffle

## Core Features:

- CSV Data Import: Upload and process participant data from CSV files, filtering for 'approved' entries and generating a display name.
- QR Scan Import: Allow new raffle participants to quickly sign up to the raffle through a QR scan of their Name and Last Name. Append information to approved entries. Requires participants be signed-in to a session for their information to be permanently appended.
- Hypnotic Slot Machine UI: Implement a visually engaging 'slot machine' interface for the raffle drawing, utilizing a virtual window to efficiently cycle through participants' names with controlled acceleration and deceleration.
- Cryptographic Randomization: Use `crypto.getRandomValues()` to ensure a fair and unpredictable selection of the winning participant before the animation starts.
- Winner Elimination: Ensure that winning participants are removed from the eligible pool for subsequent raffle rounds to prevent duplicate wins.
- Confetti Celebration: Trigger a celebratory confetti explosion upon revealing the winner, enhancing the excitement and visual appeal. Add option to add logo for confetti (MCP Logo).
- Winner Announcement: Present a modal overlay with the winner's name and last name only.

## Style Guidelines:

- Background: Use a gradient similar to Tinder's website, transitioning from orange (#F77737) to pink (#EA4C89) and purple (#4A148C).
- Primary color: Dominant hue extracted from the community logo to establish brand recognition.
- Accent color: Cyan (#00FFFF) for a glowing, neon effect around the 'Focus Box'.
- Font: 'Space Grotesk', a sans-serif font for a modern, techy feel, suitable for both headlines and body text.
- Centralized 'Focus Box' layout with faded names above and below to create a 3D cylindrical illusion. Include a placeholder for the community logo in the header.
- Rapid vertical scrolling animation with cubic-bezier easing to simulate acceleration and smooth deceleration.
- Simple, glowing icons to highlight interactive elements.