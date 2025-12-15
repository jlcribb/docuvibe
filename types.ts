
export interface LocalizedContent<T> {
  original: T;
  spanish: T;
}

export interface ChartData {
  labels: string[];
  values: number[];
  unit?: string;
}

export interface VisualAsset {
  id: string;
  type: 'table' | 'bar_chart' | 'pie_chart' | 'image_reference' | 'mermaid' | 'audio';
  title: LocalizedContent<string>;
  description?: LocalizedContent<string>;
  content?: string; 
  chartData?: ChartData;
  pageNumber?: number; // 1-based index
  boundingBox?: number[]; // [ymin, xmin, ymax, xmax] 0-1 coordinates
}

export interface DocumentSection {
  id: string;
  title: LocalizedContent<string>;
  summary: LocalizedContent<string>;
  content: LocalizedContent<string>;
  icon: string;
  colorTheme: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  keyPoints: LocalizedContent<string[]>;
  visuals?: VisualAsset[];
}

export interface ScoringCriteria {
  pertinence: number; // 1-5
  quality: number;
  clarity: number;
  reliability: number;
  notes: string;
}

export interface ParsedDocument {
  id?: string; // Unique ID for storage
  title: LocalizedContent<string>;
  authors?: string[]; // Extracted authors
  publicationDate?: string; // Extracted publication date (YYYY or YYYY-MM-DD)
  references?: string[]; // Extracted citations/bibliography titles
  userKeywords?: string[]; // User defined tags
  mainSummary: LocalizedContent<string>;
  sections: DocumentSection[];
  scoring?: ScoringCriteria;
  createdAt?: string; // ISO Date
  fileData?: string; // Base64 encoded file content (kept in memory/storage for rendering)
  mimeType?: string;
}

export type NodeType = 'project' | 'section' | 'subsection' | 'document_folder';

export interface FileSystemNode {
  id: string; // This will now be the Google Drive ID
  parentId: string | null;
  name: string;
  type: NodeType;
  children: string[]; // IDs of children nodes (Used for local nav optimization, but source of truth is Drive)
  data?: ParsedDocument; // Only present if type is 'document_folder'
  mimeType?: string; // Drive MimeType
  icon?: string; // Custom icon name from Lucide
  color?: string; // Custom Tailwind color class (e.g., 'blue', 'red')
}

export type ProcessingStatus = 'idle' | 'reading' | 'analyzing' | 'uploading' | 'complete' | 'error';
export type Language = 'original' | 'spanish';

export interface User {
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface AppState {
  status: ProcessingStatus;
  document: ParsedDocument | null;
  error: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  timestamp: number;
}