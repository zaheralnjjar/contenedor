import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ContentType } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Content Type Detection - Enhanced
export function detectContentType(content: string): ContentType {
  const trimmed = content.trim();

  // YouTube URL detection
  if (isYouTubeUrl(trimmed)) {
    return 'youtube';
  }

  // Google Maps / Location URL detection
  if (isGoogleMapsUrl(trimmed)) {
    return 'location';
  }

  // Website URL detection (before phone to avoid conflicts)
  if (isValidUrl(trimmed)) {
    return 'website';
  }

  // Phone number detection
  if (isPhoneNumber(trimmed)) {
    return 'phone';
  }

  // Location/GPS coordinates detection
  if (isLocationCoordinates(trimmed)) {
    return 'location';
  }

  // Image URL detection
  if (isImageUrl(trimmed)) {
    return 'image';
  }

  // Default to text
  return 'text';
}

// Check if URL is Google Maps
export function isGoogleMapsUrl(url: string): boolean {
  const mapsPatterns = [
    /google\.com\/maps/i,
    /maps\.google\.com/i,
    /goo\.gl\/maps/i,
    /maps\.app\.goo\.gl/i,
    /waze\.com/i,
    /apple\.com\/maps/i,
  ];
  return mapsPatterns.some(pattern => pattern.test(url));
}

// Extract location info from Google Maps URL
export function extractGoogleMapsInfo(url: string): { latitude: number; longitude: number; address?: string } | null {
  try {
    // Try to extract coordinates from various Google Maps URL formats
    // Format 1: @lat,lng
    const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordMatch) {
      return {
        latitude: parseFloat(coordMatch[1]),
        longitude: parseFloat(coordMatch[2]),
      };
    }

    // Format 2: /maps/place/.../@lat,lng
    const placeMatch = url.match(/\/maps\/place\/[^/]*\/(@)?(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      return {
        latitude: parseFloat(placeMatch[2] || placeMatch[3]),
        longitude: parseFloat(placeMatch[3] || placeMatch[4]),
      };
    }

    // Format 3: ?q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return {
        latitude: parseFloat(qMatch[1]),
        longitude: parseFloat(qMatch[2]),
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function isYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;
  return youtubeRegex.test(url);
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export function isPhoneNumber(text: string): boolean {
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  const arabicPhoneRegex = /^[\+]?[0-9]{10,12}$/;
  return phoneRegex.test(text) || arabicPhoneRegex.test(text.replace(/\s/g, ''));
}

export function isLocationCoordinates(text: string): boolean {
  // Match patterns like "24.7136, 46.6753" or GPS coordinates
  const coordRegex = /^[-]?\d+\.?\d*\s*,\s*[-]?\d+\.?\d*$/;
  return coordRegex.test(text);
}

export function isImageUrl(url: string): boolean {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
  return imageExtensions.test(url);
}

// YouTube Info Extraction
export function extractYouTubeInfo(url: string): { videoId: string; title: string; thumbnail: string; channelName?: string } | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  return {
    videoId,
    title: `فيديو يوتيوب`,
    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    channelName: '',
  };
}

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Website Info Extraction
export async function extractWebsiteInfo(url: string): Promise<{ title: string; description?: string; favicon?: string }> {
  try {
    const urlObj = new URL(url);
    return {
      title: urlObj.hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`,
    };
  } catch {
    return { title: url };
  }
}

// Format utilities
export function formatDate(timestamp: number, locale: string = 'ar-SA'): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(timestamp: number, locale: string = 'ar-SA'): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 7) return `منذ ${days} يوم`;

  return formatDate(timestamp, locale);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Color utilities for tags
export function getRandomColor(): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export async function readFromClipboard(): Promise<string> {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch {
    return '';
  }
}

// Geolocation utilities
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

// Reverse geocoding - convert coordinates to address
export async function reverseGeocode(lat: number, lng: number): Promise<{
  address: string;
  street?: string;
  buildingNumber?: string;
  city?: string;
  country?: string;
} | null> {
  try {
    // Using OpenStreetMap Nominatim API (free)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'ar,en' } }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data && data.display_name) {
      const addr = data.address || {};
      return {
        address: data.display_name,
        street: addr.road || addr.street || addr.pedestrian,
        buildingNumber: addr.house_number,
        city: addr.city || addr.town || addr.village,
        country: addr.country,
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// Generate static map image URL
export function getStaticMapUrl(lat: number, lng: number, zoom: number = 15): string {
  // Convert lat/lng to OSM tile coordinates
  // This is a much more reliable fallback than third-party static map generators
  const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));

  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

// YouTube API key from environment
// Add fallback to hardcoded key to fix Vercel deployments where env vars might be missing
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyAyKMelM6hig9AP8-KZN5W3-kcoDhLn8oU';

// Helper to fetch with timeout
async function fetchWithTimeout(url: string, timeoutMs: number = 8000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// YouTube Search API — Primary: YouTube Data API v3, Fallback: Piped/Invidious
export async function searchYouTube(query: string, maxResults: number = 10): Promise<Array<{
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  description: string;
  channelUrl?: string;
  duration?: string;
  views?: number;
  uploadedDate?: string;
}>> {

  // ── Strategy 1: YouTube Data API v3 (official, reliable) ──
  if (YOUTUBE_API_KEY) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
      const data = await fetchWithTimeout(apiUrl);

      if (data?.items?.length > 0) {
        return data.items.map((item: any) => ({
          videoId: item.id?.videoId || '',
          title: item.snippet?.title || 'بدون عنوان',
          channelTitle: item.snippet?.channelTitle || '',
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.id?.videoId}/mqdefault.jpg`,
          description: item.snippet?.description || '',
          channelUrl: item.snippet?.channelId ? `https://youtube.com/channel/${item.snippet.channelId}` : undefined,
          uploadedDate: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString('ar-SA') : undefined,
        })).filter((v: any) => v.videoId);
      }
    } catch (error) {
      console.warn('YouTube Data API v3 failed, trying fallback:', error);
    }
  }

  // ── Strategy 2: Piped API (free, no key needed) ──
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.in.projectsegfau.lt',
  ];

  for (const instance of pipedInstances) {
    try {
      const apiUrl = `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`;
      const data = await fetchWithTimeout(apiUrl, 6000);
      const items = data?.items || (Array.isArray(data) ? data : []);
      if (Array.isArray(items) && items.length > 0) {
        const results = items
          .filter((item: any) => item.type === 'stream' || item.url)
          .slice(0, maxResults)
          .map((item: any) => {
            const videoId = item.url?.split('v=')[1] || item.url?.replace('/watch?v=', '');
            if (!videoId) return null;
            return {
              videoId,
              title: item.title || 'بدون عنوان',
              channelTitle: item.uploaderName || item.uploader || '',
              thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
              description: item.shortDescription || '',
            };
          })
          .filter(Boolean);
        if (results.length > 0) return results as any;
      }
    } catch {
      continue;
    }
  }

  // ── Strategy 3: Invidious API (free, no key needed) ──
  const invidiousInstances = [
    'https://vid.puffyan.us/api/v1',
    'https://invidious.privacyredirect.com/api/v1',
    'https://invidious.nerdvpn.de/api/v1',
  ];

  for (const instance of invidiousInstances) {
    try {
      const apiUrl = `${instance}/search?q=${encodeURIComponent(query)}&type=video`;
      const data = await fetchWithTimeout(apiUrl, 6000);
      const items = Array.isArray(data) ? data : (data?.items || []);
      if (Array.isArray(items) && items.length > 0) {
        const results = items
          .slice(0, maxResults)
          .map((item: any) => {
            if (!item.videoId) return null;
            return {
              videoId: item.videoId,
              title: item.title || 'بدون عنوان',
              channelTitle: item.author || '',
              thumbnail: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
              description: item.description || '',
            };
          })
          .filter(Boolean);
        if (results.length > 0) return results as any;
      }
    } catch {
      continue;
    }
  }

  console.error('All YouTube search methods failed.');
  return [];
}


// Search YouTube channels — Primary: YouTube Data API v3, Fallback: Piped
export async function searchYouTubeChannels(query: string, maxResults: number = 5): Promise<Array<{
  channelId: string;
  name: string;
  thumbnail: string;
  description: string;
  subscribers?: string;
  videos?: number;
  url: string;
}>> {

  // ── Strategy 1: YouTube Data API v3 ──
  if (YOUTUBE_API_KEY) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
      const data = await fetchWithTimeout(apiUrl);

      if (data?.items?.length > 0) {
        return data.items.map((item: any) => ({
          channelId: item.snippet?.channelId || item.id?.channelId || '',
          name: item.snippet?.channelTitle || item.snippet?.title || 'Unknown',
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
          description: item.snippet?.description || '',
          url: `https://youtube.com/channel/${item.snippet?.channelId || item.id?.channelId || ''}`,
        })).filter((c: any) => c.channelId);
      }
    } catch (error) {
      console.warn('YouTube Data API v3 channels search failed, trying fallback:', error);
    }
  }

  // ── Strategy 2: Piped API ──
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
  ];

  for (const instance of pipedInstances) {
    try {
      const data = await fetchWithTimeout(
        `${instance}/search?q=${encodeURIComponent(query)}&filter=channels`,
        6000
      );
      const items = data?.items || data;

      if (!Array.isArray(items) || items.length === 0) continue;

      return items
        .filter((item: any) => item.type === 'channel')
        .slice(0, maxResults)
        .map((item: any) => ({
          channelId: item.url?.replace('/channel/', '') || '',
          name: item.name || item.uploader || 'Unknown',
          thumbnail: item.thumbnail || '',
          description: item.description || '',
          subscribers: item.subscribers ? formatSubscribers(item.subscribers) : undefined,
          videos: item.videos,
          url: item.url ? `https://youtube.com${item.url}` : '',
        }));
    } catch {
      continue;
    }
  }

  return [];
}

function formatSubscribers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

// Website screenshot/thumbnail using microlink
export function getWebsiteThumbnail(url: string): string {
  return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
}

// Alternative: Use screenshot API
export function getWebsiteScreenshot(url: string, width: number = 800, height: number = 600): string {
  return `https://image.thum.io/get/width/${width}/crop/${height}/noanimate/${encodeURIComponent(url)}`;
}
