# 3Blox - The Skill Game

## Overview

3Blox is a skill-based stacking game built with React, Three.js, and Express. Players control falling blocks and must align them precisely with the stack below. The game features a 3D environment with a retro aesthetic, including perspective grids and smooth animations. Players earn points and credits based on their stacking accuracy, with increasing difficulty as they progress higher.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Choice: React with Three.js**
- React handles UI state management and component lifecycle
- Three.js (@react-three/fiber) renders the 3D game environment
- Rationale: React Three Fiber provides declarative 3D rendering with React's component model, making complex 3D scenes easier to manage

**State Management: Zustand**
- Two separate stores: `useGame` for game logic and `useAudio` for sound management
- Uses `subscribeWithSelector` middleware for fine-grained reactivity
- Rationale: Zustand offers simpler API than Redux while maintaining predictable state updates, crucial for game logic

**Styling: Tailwind CSS with shadcn/ui**
- Utility-first CSS framework for rapid UI development
- Pre-built accessible components from shadcn/ui (Radix UI primitives)
- Custom design system with CSS variables for theming
- Rationale: Combines rapid development with accessibility and customization

**3D Rendering Pipeline**
- Canvas component wraps the entire 3D scene
- Separate components for background (grids), game grid, and game loop
- Custom shaders via vite-plugin-glsl for visual effects
- Rationale: Modular component structure keeps 3D logic organized and maintainable

### Backend Architecture

**Server Framework: Express.js**
- Minimal REST API structure with route registration pattern
- Development mode uses Vite middleware for HMR
- Production mode serves static build files
- Rationale: Express provides lightweight, flexible server with excellent ecosystem

**Development Workflow**
- Vite dev server integrated into Express for hot module replacement
- Single command (`npm run dev`) starts both frontend and backend
- TypeScript compilation without emitting files (bundled separately)
- Rationale: Unified development experience reduces context switching

**Build Process**
- Vite builds client code to `dist/public`
- esbuild bundles server code to `dist`
- Separate optimization for client (browser) and server (Node) targets
- Rationale: Different bundlers optimized for their respective targets

### Data Storage

**Database: PostgreSQL with Drizzle ORM**
- Schema defined in TypeScript (`shared/schema.ts`)
- Migrations managed via Drizzle Kit
- Currently uses Neon serverless PostgreSQL
- Rationale: Type-safe database queries with minimal boilerplate

**Storage Interface Pattern**
- Abstract `IStorage` interface defines CRUD operations
- `MemStorage` provides in-memory implementation for development
- Database implementation can be swapped without changing business logic
- Rationale: Enables testing and development without database dependency

**Data Models**
- Users table with username/password (authentication ready)
- Schema uses Zod for runtime validation
- Shared types between frontend and backend via `shared/` directory
- Rationale: Single source of truth for data structures reduces type mismatches

### Game Logic

**Game Loop Architecture**
- React Three Fiber's `useFrame` hook drives game updates
- Delta time ensures frame-rate independent movement
- State transitions: ready → playing → ended
- Rationale: Declarative game loop integrates naturally with React lifecycle

**Block Physics**
- Blocks move horizontally across 7-column grid
- Speed increases with stack height (`BASE_SPEED + SPEED_INCREMENT * row`)
- Direction reversal at grid boundaries
- Rationale: Simple physics model keeps gameplay accessible while allowing skill progression

**Scoring System**
- Credits consumed per game attempt (stake-based)
- Bonus points awarded based on alignment accuracy
- Higher rows yield higher multipliers
- Rationale: Risk/reward mechanics encourage skill improvement and replayability

### Audio System

**Sound Management: Custom Zustand Store**
- Separate audio state from game state
- Supports background music, hit sounds, and success sounds
- Mute toggle with persistent state
- Rationale: Decoupled audio allows independent control and easier debugging

**Audio Events**
- Sound effects triggered via Zustand subscriptions
- Watches specific state changes (block placement, game end)
- HTML5 Audio API for simple playback
- Rationale: Reactive audio system responds automatically to game events

## External Dependencies

### Core 3D Graphics
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Helper components and abstractions for common 3D patterns
- **@react-three/postprocessing**: Post-processing effects pipeline
- **three**: Underlying 3D graphics library

### Database & ORM
- **@neondatabase/serverless**: PostgreSQL client optimized for serverless/edge
- **drizzle-orm**: TypeScript-first ORM
- **drizzle-kit**: Schema management and migrations
- Database connection via `DATABASE_URL` environment variable

### UI Component Libraries
- **@radix-ui/react-***: Unstyled, accessible UI primitives (accordion, dialog, dropdown, etc.)
- **cmdk**: Command menu component
- **vaul**: Drawer component library
- **sonner**: Toast notification system

### State & Data Management
- **zustand**: Lightweight state management
- **@tanstack/react-query**: Server state management (prepared for future API integration)
- **zod**: Runtime type validation and schema definition

### Build Tools
- **vite**: Frontend build tool and dev server
- **esbuild**: Server-side bundler
- **tsx**: TypeScript execution for development
- **vite-plugin-glsl**: GLSL shader support for custom graphics

### Styling
- **tailwindcss**: Utility-first CSS framework
- **autoprefixer**: CSS vendor prefixing
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Utility for merging Tailwind classes
- **clsx**: Conditional className helper

### Utilities
- **nanoid**: Unique ID generation
- **date-fns**: Date manipulation utilities
- **@fontsource/inter**: Self-hosted Inter font

### Development
- **TypeScript**: Type safety across frontend and backend
- **@replit/vite-plugin-runtime-error-modal**: Enhanced error display in development