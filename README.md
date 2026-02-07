# Parley - Social Debate Platform

A social platform that surfaces topics users disagree with and facilitates structured debate. Opinion over engagement, conversation over dunking.

## Stack

- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Backend:** Firebase Cloud Functions (TypeScript)
- **Database:** Cloud Firestore
- **Auth:** Firebase Authentication (Email/Password, Google, Twitter)
- **Hosting:** Firebase Hosting

## Features

- **Structured Posting:** Users must state their stance, position, and reasoning
- **Structured Replies:** Responses are categorized (agree, disagree, partial, changed mind)
- **Meaningful Reactions:** No likes - only substantive feedback ("changed my mind", "good point", "fair but disagree")
- **24-Hour Debates:** Focused discussions that expire to prevent endless arguments
- **Smart Matching:** Daily debates selected based on user preferences
- **Real-time Updates:** Live debate updates via Firestore `onSnapshot` listeners
- **Social Integration:** Optional connection to Twitter, Reddit, YouTube for preference suggestions

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project (create at https://console.firebase.google.com)

### Setup

```bash
# Clone the repository
cd parley

# Login to Firebase
firebase login

# Update .firebaserc with your project ID
# Update frontend/src/lib/firebase.ts with your Firebase config

# Install function dependencies
cd functions
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Local Development

```bash
# Start Firebase emulators (Firestore, Auth, Functions)
firebase emulators:start

# In another terminal, start the frontend
cd frontend
npm run dev
```

The frontend runs at http://localhost:5173 and connects to local emulators automatically in development mode.

### Deployment

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Deploy everything (functions, rules, indexes, hosting)
firebase deploy
```

## Project Structure

```
parley/
├── firebase.json                    # Firebase project config
├── .firebaserc                      # Firebase project alias
├── firestore.rules                  # Security rules
├── firestore.indexes.json           # Composite indexes
├── functions/
│   ├── src/
│   │   ├── index.ts                 # Function exports
│   │   ├── auth/                    # registerUsername
│   │   ├── debates/                 # getDailyDebates, createDebate
│   │   ├── posts/                   # createPost, replyToPost
│   │   ├── moderation/              # contentCheck, reportPost, actionReport, expireOldDebates
│   │   ├── social/                  # syncSocialAccount, getSuggestedPreferences
│   │   ├── topics/                  # manageTopic
│   │   └── triggers/                # onReactionWrite
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── lib/firebase.ts          # Firebase initialization
│   │   ├── services/
│   │   │   ├── firestore.ts         # Direct Firestore read/write helpers
│   │   │   └── functions.ts         # Cloud Function callable wrappers
│   │   ├── store/auth.ts            # Zustand + Firebase Auth state
│   │   ├── hooks/                   # React Query hooks
│   │   ├── pages/                   # Page components
│   │   ├── components/              # UI components
│   │   └── types/                   # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Firestore Data Model

| Collection | Doc ID | Purpose |
|---|---|---|
| `users/{uid}` | Firebase Auth UID | User profiles |
| `users/{uid}/preferences/{topicId}` | Topic ID | Stance preferences |
| `users/{uid}/socialAccounts/{provider}` | Provider name | Connected accounts |
| `users/{uid}/debateHistory/{debateId}` | Debate ID | Shown/participated tracking |
| `usernames/{usernameLower}` | Lowercase username | Uniqueness enforcement |
| `topics/{topicId}` | Auto ID | Debate topics |
| `debates/{debateId}` | Auto ID | Debates with denormalized topic info |
| `posts/{postId}` | Auto ID | Posts with denormalized user info + reaction counts |
| `reactions/{userId_postId}` | Composite | One reaction per user per post |
| `reports/{reportId}` | Auto ID | Post moderation reports |

## Key Design Decisions

1. **No infinite scroll:** Fixed 3-5 debates per day
2. **Opinion-first:** Can't post without stating position
3. **Stance-based replies:** Must categorize your response
4. **Meaningful reactions:** No likes, only substantive feedback
5. **24h threads:** Forces focus, prevents endless arguments
6. **Privacy-first social:** Read-only, transparent, optional
7. **Denormalized data:** Post docs include user info and reaction counts for efficient reads
8. **Security rules + Cloud Functions:** Writes go through functions for content moderation; reads are direct from client

## License

MIT
