export type EncodingType =
  | 'UTF-8'
  | 'ASCII'
  | 'Base64'
  | 'Base58'
  | 'Base85'
  | 'Hex'
  | 'URL-Encoding'
  | 'UTF-16BE';

export type FaultType =
  | 'INVALID_CHAR'
  | 'TRUNCATED_SEQUENCE'
  | 'PADDING_CORRUPTION'
  | 'ODD_LENGTH_HEX'
  | 'MALFORMED_URL_PERCENT';

export interface EncodingErrorDetail {
  index: number;
  byteOffset?: number;
  invalidValue: string;
  reason: string;
  severity: 'error' | 'warning';
}

export interface ByteInspectorItem {
  index: number;
  hex: string;
  binary: string;
  char: string;
  isError: boolean;
  errorMessage?: string;
}

export interface MojibakeResult {
  originalText: string;
  encodedBytesHex: string;
  interpretedText: string;
  explanation: string;
}
