// App configuration

// API base URL - update this to your ZTP server's address
// For development with Expo Go on physical device, use your computer's local IP
// For iOS simulator, use localhost
// For Android emulator, use 10.0.2.2 (maps to host's localhost)
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:8080' // Replace with your dev machine's IP
  : 'http://your-production-server:8080';

// You can also use environment variables via app.config.js
// export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
