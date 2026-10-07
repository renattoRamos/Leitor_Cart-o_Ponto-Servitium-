import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker source using jsdelivr CDN matching the installed version
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export async function extractTextFromPDF(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Filter valid text items
    const rawItems = (textContent.items as any[]).filter(
      (item) => item && typeof item.str === 'string'
    );

    interface TextItem {
      str: string;
      x: number;
      y: number;
    }

    const items: TextItem[] = rawItems
      .filter((item) => item.str && item.str.trim() !== '')
      .map((item) => ({
        str: item.str,
        x: item.transform?.[4] ?? 0,
        y: item.transform?.[5] ?? 0,
      }));

    // Sort strictly by Y descending
    items.sort((a, b) => b.y - a.y);

    // Group items into rows where Y difference is <= 3.5 points
    const rows: { y: number; items: TextItem[] }[] = [];
    for (const item of items) {
      let matchedRow = rows.find((r) => Math.abs(r.y - item.y) <= 3.5);
      if (!matchedRow) {
        matchedRow = { y: item.y, items: [] };
        rows.push(matchedRow);
      }
      matchedRow.items.push(item);
    }

    // Sort rows top-to-bottom
    rows.sort((a, b) => b.y - a.y);

    // Within each row, sort items left-to-right strictly
    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
    }

    const pageStr = rows
      .map((row) => row.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');

    pageTexts.push(pageStr);
  }

  return pageTexts;
}
