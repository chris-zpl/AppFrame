export interface AudioTimestampSegment {
  start: number; // Tempo de início em segundos (ex: 0.0)
  end: number;   // Tempo de término em segundos (ex: 2.85)
  text: string;  // Conteúdo transcrito da frase ou sentença
}

export interface TranscriptionResult {
  fullText: string;
  language?: string;
  segments: AudioTimestampSegment[];
}
