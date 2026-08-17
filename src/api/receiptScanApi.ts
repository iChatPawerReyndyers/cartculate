import { apiRequest, withMockFallback } from './httpClient';
import { ReceiptScanResult } from '../types';
import { mockReceiptScanResult } from '../data/mockReceiptScan';

interface ScanReceiptRequestBody {
  imageBase64: string;
  mediaType: string;
}

/**
 * POST /api/receipts/scan - Feature 7's AI Receipt Scanner. Sends a
 * base64-encoded photo of a receipt to the backend, which runs OCR + LLM
 * matching against the master Item catalog (ReceiptScanService.java) and
 * returns a structured, per-line breakdown ready for review - see
 * ReceiptScannerScreen.tsx for how the result is displayed and confirmed.
 *
 * This call is a PREVIEW only - it doesn't persist anything itself. Falls
 * back to mockReceiptScanResult if the backend is genuinely unreachable,
 * same convention as every other api/*.ts module (see httpClient.ts's
 * withMockFallback and api/config.ts's ENABLE_MOCK_FALLBACK).
 */
export async function scanReceipt(
  imageBase64: string,
  mediaType: string = 'image/jpeg'
): Promise<ReceiptScanResult> {
  return withMockFallback(
    () =>
      apiRequest<ReceiptScanResult>('/api/receipts/scan', {
        method: 'POST',
        body: JSON.stringify({ imageBase64, mediaType } as ScanReceiptRequestBody),
      }),
    () => mockReceiptScanResult
  );
}