declare module 'react-native-document-picker' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DocumentPicker: {
    pickSingle(options?: Record<string, unknown>): Promise<{ uri: string; name: string; size: number; type: string }>;
    types: Record<string, string | string[]>;
    isCancel(error: unknown): boolean;
  };
  export default DocumentPicker;
}