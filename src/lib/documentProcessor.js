import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

class DocumentProcessor {
  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', '']
    });
  }

  async extractTextFromBuffer(buffer, mimeType, filename) {
    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.extractFromPDF(buffer);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.extractFromWord(buffer);
        
        case 'text/plain':
        case 'text/markdown':
        case 'application/json':
          return buffer.toString('utf-8');
        
        default:
          // Try to extract as text
          const text = buffer.toString('utf-8');
          if (this.isValidText(text)) {
            return text;
          }
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error(`Error extracting text from ${filename}:`, error);
      throw new Error(`Failed to extract text from ${filename}: ${error.message}`);
    }
  }

  async extractFromPDF(buffer) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  async extractFromWord(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  isValidText(text) {
    // Check if the text contains mostly printable characters
    const printableChars = text.replace(/[\r\n\t]/g, '').length;
    const totalChars = text.length;
    return printableChars / totalChars > 0.7;
  }

  async splitText(text, options = {}) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: options.chunkSize || 1000,
      chunkOverlap: options.chunkOverlap || 200,
      separators: options.separators || ['\n\n', '\n', ' ', '']
    });

    return await splitter.splitText(text);
  }

  async processDocument(buffer, mimeType, filename, options = {}) {
    // Extract text
    const text = await this.extractTextFromBuffer(buffer, mimeType, filename);
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in document');
    }

    // Split into chunks if requested
    if (options.split !== false) {
      const chunks = await this.splitText(text, options);
      return {
        fullText: text,
        chunks,
        metadata: {
          filename,
          mimeType,
          textLength: text.length,
          chunkCount: chunks.length
        }
      };
    }

    return {
      fullText: text,
      chunks: [text],
      metadata: {
        filename,
        mimeType,
        textLength: text.length,
        chunkCount: 1
      }
    };
  }
}

const documentProcessor = new DocumentProcessor();
export default documentProcessor;
