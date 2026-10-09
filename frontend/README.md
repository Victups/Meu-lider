# Meu Líder - Mobile App

Universal React Native + Expo app for iOS, Android, and Web.

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI for building (`npm install -g eas-cli`)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your API URL:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

### 3. Start development

**Web (Browser)**
```bash
npm run start:web
```

**iOS (requires macOS)**
```bash
npm run start:ios
```

**Android (requires Android SDK)**
```bash
npm run start:android
```

**Interactive menu**
```bash
npm start
```

Press:
- `w` for web
- `i` for iOS
- `a` for Android

## Project Structure

```
src/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Auth screens (login, register)
│   ├── (app)/             # Main app screens (tabs)
│   └── _layout.tsx        # Root navigation
├── services/
│   └── api.ts            # API client with axios
├── stores/
│   ├── auth.ts           # Auth state (Zustand)
│   └── church.ts         # Church state (Zustand)
├── hooks/                 # Custom React hooks
├── components/            # Reusable components
├── constants/             # App constants
├── types/                 # TypeScript types
└── utils/                 # Utility functions
```

## Features

### Current
- ✅ Authentication (login/register)
- ✅ Church selection
- ✅ Basic navigation (tabs)
- ✅ Profile view
- ✅ Multi-platform support (iOS/Android/Web)

### In Progress
- 🚧 View schedules
- 🚧 Confirm/decline schedules
- 🚧 View teams and members
- 🚧 Push notifications
- 🚧 Offline support

### Coming Soon
- 🗺️ Event calendar
- 🗺️ Team management (admin)
- 🗺️ Real-time updates via WebSocket
- 🗺️ Dark mode

## API Integration

The app uses TanStack Query (React Query) for server state management. API client is configured in `src/services/api.ts` with:

- Automatic JWT token refresh
- Secure token storage (SecureStore)
- Request/response interceptors
- Tenant isolation (churchId)

## Building for Production

### Web
```bash
npm run build:web
```

### iOS (requires Apple Developer account)
```bash
npm run ios
```

### Android (requires Google Play account)
```bash
npm run android
```

### Submit to stores
```bash
npm run submit
```

## Development Commands

```bash
# Start dev server
npm start

# Start web
npm run start:web

# Start iOS
npm run start:ios

# Start Android
npm run start:android

# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format

# Build for web
npm run build:web

# Build all platforms
npm run build

# Submit to stores
npm run submit
```

## API Endpoints

See backend `README.md` for complete API documentation.

Key endpoints:
- `POST /auth/login`
- `POST /auth/register`
- `GET /churches`
- `GET /churches/:churchId/events`
- `GET /churches/:churchId/schedules/members/:memberId`
- `POST /churches/:churchId/schedules/:scheduleId/confirm`

## Styling

The app uses React Native's StyleSheet API with custom styles. TailwindCSS/NativeWind is configured but not yet in use.

Components follow a flat structure with clear naming:
- `container` - Main flex container
- `centerContainer` - Centered flex container
- `title`, `subtitle` - Text styles
- `card` - Card/box styles
- `button`, `buttonText` - Button styles

## Secure Storage

Tokens are stored securely using:
- iOS: Keychain
- Android: Keystore
- Web: localStorage (fallback, use caution in production)

## Testing

```bash
npm run test
npm run test:watch
```

## Debugging

### Enable network logging
```typescript
// In src/services/api.ts
console.log('Request:', config);
console.log('Response:', response);
```

### React Native Debugger
1. Install: https://github.com/jhen0409/react-native-debugger
2. Run app in dev mode
3. Open debugger on `http://localhost:8081`

### Expo DevTools
Available in dev menu when running app.

## Troubleshooting

### App won't start
```bash
npm install
npm start
```

### Metro bundler issues
```bash
npx expo start --clear
```

### API connection issues
- Check `EXPO_PUBLIC_API_URL` in `.env`
- Verify backend is running on correct port
- Check firewall/network settings

### iOS issues
```bash
rm -rf node_modules .expo
npm install
npm run start:ios
```

### Android issues
```bash
npm run start:android
# or
expo run:android
```

## Performance Tips

- Use React Query for caching
- Implement FlatList virtualization for long lists
- Code split with Expo Router
- Monitor bundle size: `npm run build:web`

## License

UNLICENSED
