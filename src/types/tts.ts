/**
 * Types para integração com ElevenLabs via AI33
 */

export interface TTSVoice {
  voice_id: string;
  name: string;
  gender: "Female" | "Male";
  language: string;
  sample_audio_url?: string;
}

export interface TTSRequest {
  text: string;
  voice_id: string;
}

export interface TTSResponse {
  audio_url: string;
}

export interface TTSVoiceListResponse {
  voices: TTSVoice[];
}
