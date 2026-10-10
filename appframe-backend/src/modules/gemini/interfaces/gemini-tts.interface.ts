export interface SynthesizeSpeechOptions {
  text: string;
  voiceName?: string;    // ex: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'
  languageCode?: string; // ex: 'pt-BR', 'en-US'
}

export interface SynthesizeSpeechResult {
  audioBuffer: Buffer;
  mimeType: string;
  savedFilePath?: string;
  durationEstimateSeconds?: number;
}
