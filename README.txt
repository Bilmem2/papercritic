PaperCritic AI Mobile v3.3

Changes in v3.3:
- PDF.js switched to the broadly compatible classic build (3.11.174).
- PDF extraction first uses the PDF.js worker and automatically retries with the main-thread parser if the worker fails on mobile/hosted deployments.
- Text extraction is normalized more robustly across PDF.js text items.
- API keys and provider/model configuration now persist in localStorage instead of sessionStorage.
- Existing v3.2 session-only settings are migrated to persistent storage once.
- Model connection modal is constrained to the mobile viewport, scrollable internally, and no longer overflows the screen.
- Ollama remains direct Cloud API only; no localhost is required.

Usage:
1. Serve the files from HTTPS (GitHub Pages, Cloudflare Pages, Vercel, etc.).
2. Open the app on mobile.
3. Open Model Connection and enter your Gemini or Ollama Cloud API key.
4. Select a model and save.
5. Upload a text-based PDF and run the review.

Important:
- Scanned/image-only PDFs still require OCR; PDF.js does not OCR images. The app detects this and reports when no selectable text is present.
- API keys are stored locally in the browser on the device. Do not use this storage mode on a shared/public device.
