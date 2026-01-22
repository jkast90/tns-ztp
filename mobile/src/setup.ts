import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureServices } from './core';

const API_URL_KEY = '@ztp_api_url';
const DEFAULT_API_URL = 'http://192.168.1.100:8088';

// Cache to avoid repeated AsyncStorage reads
let cachedUrl: string | null = null;

// Get the stored API URL (for display purposes in settings)
export async function getApiUrl(): Promise<string> {
  if (cachedUrl) return cachedUrl;

  try {
    const saved = await AsyncStorage.getItem(API_URL_KEY);
    cachedUrl = saved || DEFAULT_API_URL;
  } catch {
    cachedUrl = DEFAULT_API_URL;
  }

  return cachedUrl;
}

// Get the full API base URL (with /api path) for services
async function getApiBaseUrl(): Promise<string> {
  const url = await getApiUrl();
  // Ensure we have the /api path appended
  return `${url.replace(/\/+$/, '')}/api`;
}

export async function setApiUrl(url: string): Promise<void> {
  // Store just the base URL (without /api)
  const cleanUrl = url.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  await AsyncStorage.setItem(API_URL_KEY, cleanUrl);
  cachedUrl = cleanUrl;
}

// Configure services to use dynamic URL with /api path
configureServices({
  getBaseUrl: getApiBaseUrl,
});
