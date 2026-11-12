/**
 * In-browser client-side PDF text extractor.
 * 100% Client-Side in browser memory with zero network calls.
 * Handles password-encrypted PDFs (PAN, DOB) with graceful retry.
 */

import * as pdfjsLib from 'pdfjs-dist';
// Vite ?url import creates a local hashed asset in dist, completely offline & self-contained
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  isPasswordProtected: boolean;
  error?: 'PASSWORD_REQUIRED' | 'INVALID_PASSWORD' | 'CORRUPTED' | 'UNKNOWN';
}

export async function extractTextFromPDF(
  data: ArrayBuffer,
  password = ''
): Promise<PDFExtractionResult> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(data),
      password: password || undefined,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += pageText + '\n';
    }

    return {
      text: fullText,
      pageCount: pdf.numPages,
      isPasswordProtected: false,
    };
  } catch (err: any) {
    if (err && err.name === 'PasswordException') {
      if (err.code === 1) {
        // Need password
        return {
          text: '',
          pageCount: 0,
          isPasswordProtected: true,
          error: 'PASSWORD_REQUIRED',
        };
      } else if (err.code === 2) {
        // Incorrect password
        return {
          text: '',
          pageCount: 0,
          isPasswordProtected: true,
          error: 'INVALID_PASSWORD',
        };
      }
    }

    return {
      text: '',
      pageCount: 0,
      isPasswordProtected: false,
      error: 'CORRUPTED',
    };
  }
}
