declare module 'pdf-parse' {
  interface TextResult {
    pages: Array<{ num: number; text: string }>
    text: string
    total: number
    getPageText(num: number): string
  }

  interface LoadParameters {
    url?: string | URL
    data?: string | number[] | ArrayBuffer | Uint8Array
    password?: string
    verbosity?: number
    [key: string]: unknown
  }

  interface ParseParameters {
    partial?: Array<number>
    first?: number
    last?: number
    [key: string]: unknown
  }

  class PDFParse {
    constructor(options: LoadParameters)
    getText(params?: ParseParameters): Promise<TextResult>
    destroy(): Promise<void>
  }

  export { PDFParse, TextResult, LoadParameters, ParseParameters }
}
