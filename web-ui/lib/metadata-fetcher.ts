// ═══════════════════════════════════════════════════════════════════════════
// 🔗 KAN-3: Auto-fetch webpage metadata when saving links
// ═══════════════════════════════════════════════════════════════════════════
//
// This module automatically fetches webpage metadata including:
// - Page title (from <title> or Open Graph)
// - Description (from meta description or og:description)
// - Favicon URL
//
// Implements: https://agorozia1.atlassian.net/browse/KAN-3
// ═══════════════════════════════════════════════════════════════════════════

export interface WebpageMetadata {
  title?: string;
  description?: string;
  favicon?: string;
  ogImage?: string;
  siteName?: string;
}

/**
 * Fetch metadata from a webpage URL
 * Extracts title, description, favicon, and Open Graph data
 */
export async function fetchWebpageMetadata(url: string): Promise<WebpageMetadata> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    
    // Fetch the webpage with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentSaver/1.0; +https://content-saver.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return getFallbackMetadata(parsedUrl);
    }
    
    const html = await response.text();
    
    // Parse metadata from HTML
    const metadata = parseHtmlMetadata(html, parsedUrl);
    
    console.log(`📄 Fetched metadata for ${url}:`, metadata);
    
    return metadata;
    
  } catch (error) {
    console.error(`Error fetching metadata for ${url}:`, error);
    try {
      return getFallbackMetadata(new URL(url));
    } catch {
      return {};
    }
  }
}

/**
 * Parse metadata from HTML content
 */
function parseHtmlMetadata(html: string, parsedUrl: URL): WebpageMetadata {
  const metadata: WebpageMetadata = {};
  
  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    metadata.title = decodeHtmlEntities(titleMatch[1].trim());
  }
  
  // Extract Open Graph title (preferred over regular title)
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  if (ogTitleMatch) {
    metadata.title = decodeHtmlEntities(ogTitleMatch[1].trim());
  }
  
  // Extract description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (descMatch) {
    metadata.description = decodeHtmlEntities(descMatch[1].trim());
  }
  
  // Extract Open Graph description (preferred)
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
  if (ogDescMatch) {
    metadata.description = decodeHtmlEntities(ogDescMatch[1].trim());
  }
  
  // Extract Open Graph image
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogImageMatch) {
    metadata.ogImage = resolveUrl(ogImageMatch[1], parsedUrl);
  }
  
  // Extract site name
  const siteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
  if (siteNameMatch) {
    metadata.siteName = decodeHtmlEntities(siteNameMatch[1].trim());
  }
  
  // Extract favicon
  const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
  if (faviconMatch) {
    metadata.favicon = resolveUrl(faviconMatch[1], parsedUrl);
  } else {
    // Default to /favicon.ico
    metadata.favicon = `${parsedUrl.origin}/favicon.ico`;
  }
  
  return metadata;
}

/**
 * Get fallback metadata when fetch fails
 */
function getFallbackMetadata(parsedUrl: URL): WebpageMetadata {
  return {
    title: parsedUrl.hostname,
    favicon: `${parsedUrl.origin}/favicon.ico`,
  };
}

/**
 * Resolve relative URLs to absolute
 */
function resolveUrl(url: string, baseUrl: URL): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('//')) {
    return `${baseUrl.protocol}${url}`;
  }
  if (url.startsWith('/')) {
    return `${baseUrl.origin}${url}`;
  }
  return `${baseUrl.origin}/${url}`;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

