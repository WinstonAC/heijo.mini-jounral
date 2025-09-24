# Heijō MiniJournal

A minimal journaling app with PalmPilot 1985 styling, built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **PalmPilot 1985 UI**: Retro-inspired design with custom color palette and Orbitron font
- **Voice & Text Input**: Type or speak your journal entries using Web Speech API
- **Daily Prompts**: 90-day rotating prompt system with Y/N chip interface
- **Tag System**: Organize entries with customizable tags
- **Local Storage**: Privacy-first approach with local data storage
- **Export Functionality**: Download your entries as JSON
- **PWA Support**: Installable as a standalone app

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (optional, falls back to localStorage)
- Web Speech API

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

### Supabase (Optional)

To use Supabase for data storage, create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

If these environment variables are not provided, the app will automatically use localStorage for data persistence.

### Supabase Schema

When using Supabase, create a table called `entries` with the following schema:

```sql
create table entries (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  content text not null,
  source text not null check (source in ('text', 'voice')),
  tags text[] default '{}'::text[]
);
```

## Design System

The app uses a custom color palette inspired by 1985 PalmPilot aesthetics:

- `--ui-charcoal`: #181819
- `--ui-graphite`: #616162  
- `--ui-silver`: #9E9E9E
- `--ui-warm-silver`: #C1C0BD
- `--ui-screen`: #E8E9EB
- `--ui-press`: #3AA6FF

Typography uses Orbitron for UI elements and Helvetica Neue for content.

## Privacy

This app is designed with privacy-first principles:

- All data is stored locally by default
- Voice recognition uses browser APIs only
- No data is transmitted to external servers
- Users can export their data at any time

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT



