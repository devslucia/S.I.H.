declare module "mammoth" {
  export interface ExtractResult {
    value: string;
    messages: unknown[];
  }

  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ExtractResult>;
}
