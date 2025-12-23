export interface Suggestion {
  id: string;
  type: 'grammar' | 'style' | 'tone' | 'idea';
  text: string;
  context?: string; // The text it applies to
  explanation: string;
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64
}

export enum AIState {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  STREAMING = 'STREAMING',
  ERROR = 'ERROR'
}

export interface EditorSelection {
  start: number;
  end: number;
  text: string;
}
