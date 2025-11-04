// Global type definitions for SEO optimization features

// Speech Recognition API types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  grammars: SpeechGrammarList;
  
  start(): void;
  stop(): void;
  abort(): void;
  
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

export interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechGrammarList {
  readonly length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
}

export interface SpeechGrammar {
  src: string;
  weight: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

// SEO optimization types
export interface SEOMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  alt_text?: string;
  focus_keyphrase?: string;
  voice_search_keywords?: string[];
  seo_score?: number;
  search_intent?: 'informational' | 'navigational' | 'transactional';
}

export interface VoiceSearchResult {
  query: string;
  search_intent: string;
  answer_type: string;
  optimized_response: string;
  detected_category?: string;
  detected_device?: string;
  detected_resolution?: string;
  suggested_actions?: Array<{
    type: string;
    label: string;
    url: string;
  }>;
  timestamp: string;
}

export interface RelatedWallpaper {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string;
  relevance_score: number;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
  position: number;
}

export interface InternalLink {
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  anchor_text: string;
  link_context?: string;
  link_strength: number;
}

// Analytics types
export interface WallpaperAnalytics {
  wallpaper_id: string;
  wallpaper_title: string;
  category: string;
  resolution: string;
  download_type: 'premium' | 'free';
  user_type: 'premium' | 'registered' | 'guest';
  seo_keywords?: string[];
  focus_keyphrase?: string;
}

// Enhanced wallpaper interface
export interface EnhancedWallpaper {
  id: number;
  title: string;
  slug?: string;
  description?: string;
  thumbnail_url: string | null;
  image_url: string;
  download_url: string;
  resolution_1080p: string | null;
  resolution_4k: string | null;
  resolution_8k: string | null;
  download_count: number;
  is_premium: boolean;
  width?: number;
  height?: number;
  device_type?: string;
  category_id?: number;
  tags?: string[];
  
  // SEO fields
  alt_text?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  meta_description?: string;
  focus_keyphrase?: string;
  voice_search_keywords?: string[];
  search_intent?: 'informational' | 'navigational' | 'transactional';
  seo_score?: number;
  
  // Image optimization
  webp_url?: string;
  avif_url?: string;
  lazy_loading_placeholder?: string;
  dominant_color?: string;
  color_palette?: any;
  
  // Content freshness
  content_freshness_score?: number;
  
  // AI generated content
  ai_generated_content?: any;
}

// Enhanced category interface
export interface EnhancedCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  
  // SEO fields
  seo_title?: string;
  seo_description?: string;
  meta_keywords?: string[];
  content_description?: string;
  focus_keyphrase?: string;
  voice_search_queries?: string[];
  related_categories?: number[];
  featured_content?: any;
}