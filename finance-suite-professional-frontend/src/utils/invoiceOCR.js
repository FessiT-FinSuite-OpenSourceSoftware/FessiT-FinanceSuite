import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function extractInvoiceDetails(rawText) {
  const lines = rawText
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").replace(/&amp;/g, "&").trim())
    .filter(Boolean);
  const text = lines.join("\n");

  const details = {};

  // Invoice Number
  for (const pattern of [
    /invoice\s*no\.?\s*[:\-]\s*([A-Z0-9][A-Z0-9\-\/]+)/i,
    /inv\.?\s*no\.?\s*[:\-]\s*([A-Z0-9][A-Z0-9\-\/]+)/i,
    /bill\s*no\.?\s*[:\-]\s*([A-Z0-9][A-Z0-9\-\/]+)/i,
  ]) {
    const m = text.match(pattern);
    if (m?.[1]) { details.invoiceNumber = m[1].trim(); break; }
  }

  // Invoice Date
  const invDateMatch = text.match(/invoice\s+date\s*[:\-]?\s*(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})/i);
  if (invDateMatch?.[1]) details.invoiceDate = normalizeDate(invDateMatch[1]);

  // Due Date - try multiple patterns to handle OCR errors
  let dueDateMatch = text.match(/due\s+date\s*[:\-]?\s*[^\d]*(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})/i);
  if (!dueDateMatch) {
    // Fallback: look after "Due Date" for any date-like pattern
    const dueDateSection = text.match(/due\s+date\s*[:\-]?\s*([^\n]+)/i);
    if (dueDateSection?.[1]) {
      const dateInSection = dueDateSection[1].match(/(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})/);
      if (dateInSection?.[1]) dueDateMatch = dateInSection;
    }
  }
  if (dueDateMatch?.[1]) details.dueDate = normalizeDate(dueDateMatch[1]);

  // Place of Supply
  const posMatch = text.match(/place\s+of\s+supply\s*[:\-]?\s*([A-Za-z][A-Za-z0-9\s\-]+?)(?=\n|$)/i);
  if (posMatch?.[1]) {
    let pos = posMatch[1].trim();
    pos = pos.replace(/\s+(bill|ship|to).*$/i, "");
    details.placeOfSupply = pos.trim();
  }

  // Tax Rates
  let defaultCgstPercent = "";
  let defaultSgstPercent = "";
  let defaultIgstPercent = "";
  const cgstMatch = text.match(/cgst\s*\((\d+(?:\.\d+)?)%\)/i);
  if (cgstMatch?.[1]) defaultCgstPercent = cgstMatch[1];
  const sgstMatch = text.match(/sgst\s*\((\d+(?:\.\d+)?)%\)/i);
  if (sgstMatch?.[1]) defaultSgstPercent = sgstMatch[1];
  const igstMatch = text.match(/igst\s*\((\d+(?:\.\d+)?)%\)/i);
  if (igstMatch?.[1]) defaultIgstPercent = igstMatch[1];

  const hasCgstGlobal = /cgst/i.test(text);
  const hasIgstGlobal = /igst/i.test(text) && !hasCgstGlobal;

  // Line Items
  const items = [];
  let headerIdx = lines.findIndex((l) => /hsn|item.*description/i.test(l) && /cgst|igst|sgst|rate|amount/i.test(l));
  if (headerIdx === -1) headerIdx = lines.findIndex((l) => /hsn/i.test(l));
  if (headerIdx === -1) headerIdx = lines.findIndex((l) => /description/i.test(l) && /cgst|igst|sgst/i.test(l));

  if (headerIdx !== -1) {
    const headerLine = lines[headerIdx].toLowerCase();
    const hasCgst = headerLine.includes("cgst") || hasCgstGlobal;
    const hasIgst = headerLine.includes("igst") || hasIgstGlobal;

    const rowPattern = /^(\d+)\s*\|?\s*(.+)$/;
    const hsnPattern = /^([A-Z]{2,5}\d{4,6}|\d{4,8})$/i;
    const numberPattern = /^[\d,]+(?:\.[\d]{1,2})?$/;

    let i = headerIdx + 1;
    while (i < lines.length) {
      const line = lines[i];
      // Stop when we hit totals section
      if (/^(bank|sub\s*total|cgst|sgst|igst|total|grand|account|for\s+)/i.test(line)) break;
      
      let rowMatch = line.match(rowPattern);
      
      // Fallback: if line doesn't match standard pattern but contains description + numbers, treat as item line
      if (!rowMatch && line.trim().length > 0) {
        const hasNumbers = /[\d,]+\.?\d*/.test(line);
        const isNotBlank = line.trim().length > 3;
        if (hasNumbers && isNotBlank) {
          // Treat entire line as potential item data
          rowMatch = [line, '1', line]; // synthetic match for fallback processing
        }
      }
      if (!rowMatch) { i++; continue; }

      const cleaned = rowMatch[2].replace(/\|/g, " ").replace(/\s+/g, " ").trim();
      const tokens = cleaned.split(/\s+/);

      const numbers = [];
      const nonNumbers = [];
      tokens.forEach((token) => {
        if (numberPattern.test(token)) numbers.push(token.replace(/,/g, ""));
        else nonNumbers.push(token);
      });

      if (numbers.length >= 2) {
        const extracted = { quantity: numbers[0], rate: numbers[1] };

        const hsnIndex = nonNumbers.findIndex((t) => hsnPattern.test(t));
        if (hsnIndex !== -1) {
          extracted.hsn_code = nonNumbers[hsnIndex];
          extracted.description = [...nonNumbers.slice(0, hsnIndex), ...nonNumbers.slice(hsnIndex + 1)].join(" ");
        } else {
          extracted.description = nonNumbers.join(" ");
        }

        if (hasCgst && defaultCgstPercent && defaultSgstPercent) {
          extracted.cgstPercent = defaultCgstPercent;
          extracted.sgstPercent = defaultSgstPercent;
        } else if (hasIgst && defaultIgstPercent) {
          extracted.igstPercent = defaultIgstPercent;
        }

        const next = lines[i + 1];
        if (next && !/^\d+\s/.test(next) && !/^(bank|sub\s*total|cgst|sgst|igst|total|grand|account)/i.test(next)) {
          extracted.description = (extracted.description + " " + next).trim();
          i++;
        }

        items.push(extracted);
      }

      i++;
    }
    
    // Warn if header found but no items extracted
    if (headerIdx !== -1 && items.length === 0) {
      console.warn("Line items header found but no items could be extracted. This may indicate poor OCR quality or an unusual invoice format. Please verify the PDF quality and try again.");
      details.extractionWarning = "Line items could not be extracted - check PDF quality";
    }
  }

  if (items.length > 0) details.lineItems = items;
  
  // FALLBACK: If no items found but header exists, try aggressive extraction between header and totals
  if (items.length === 0 && headerIdx !== -1) {
    console.warn("⚠️ Standard item extraction failed. Trying aggressive pattern matching...");
    const subtotalIdx = lines.findIndex((l, idx) => idx > headerIdx && /sub\s*total|total\s*tax/i.test(l));
    const endIdx = subtotalIdx !== -1 ? subtotalIdx : lines.length;
    const itemLines = lines.slice(headerIdx + 1, endIdx).filter(l => l.trim().length > 0);
    
    // Try to find lines that contain numbers (prices, quantities)
    const numberExtractor = /[\d,]+(?:\.[\d]{2})?/g;
    for (const line of itemLines) {
      const numbers = (line.match(numberExtractor) || []).map(n => n.replace(/,/g, ''));
      if (numbers.length >= 2) {
        // Found a line with at least 2 numbers, likely an item
        const extracted = { 
          description: line.replace(numberExtractor, '').trim(),
          quantity: numbers[0] || '',
          rate: numbers[1] || '',
          itemTotal: numbers[numbers.length - 1] || ''
        };
        if (hasCgst && defaultCgstPercent && defaultSgstPercent) {
          extracted.cgstPercent = defaultCgstPercent;
          extracted.sgstPercent = defaultSgstPercent;
        }
        if (items.length === 0) items.push(extracted);
        console.log("🔍 Aggressively extracted item:", extracted);
      }
    }
    if (items.length > 0) {
      details.lineItems = items;
      console.log("✅ Aggressive extraction found", items.length, "items");
    }
  }
  
  if (items.length > 0) details.lineItems = items;
  return details;
}

function normalizeDate(dateStr) {
  const parts = dateStr.split(/[\-\/\.]/);
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y.length === 2) y = (parseInt(y) > 50 ? "19" : "20") + y;
    d = d.padStart(2, "0");
    m = m.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return dateStr;
}

async function extractTextFromPDF(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;

    // Collect all text items with their positions
    const textItems = content.items
      .filter((item) => item.str.trim())
      .map((item) => ({
        str: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(pageHeight - item.transform[5]), // flip y so top=0
      }));

    // Group items into rows by y-position (within 10px = same row, increased from 6px for better text grouping)
    const rows = [];
    for (const item of textItems) {
      const existingRow = rows.find((r) => Math.abs(r.y - item.y) <= 10);
      if (existingRow) {
        existingRow.items.push(item);
      } else {
        rows.push({ y: item.y, items: [item] });
      }
    }

    // Sort rows top to bottom, items left to right within each row
    rows.sort((a, b) => a.y - b.y);
    rows.forEach((r) => r.items.sort((a, b) => a.x - b.x));

    // Join each row into a line
    const pageText = rows.map((r) => r.items.map((i) => i.str).join(" ")).join("\n");
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n");
}

async function pdfToCanvases(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const canvases = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    // Increase scale for better OCR accuracy on lower-quality PDFs
    const viewport = page.getViewport({ scale: 4.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Render with better anti-aliasing
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    canvases.push(canvas);
  }

  return canvases;
}

async function ocrCanvas(canvas, onProgress) {
  const { data } = await Tesseract.recognize(canvas, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof onProgress === "function") {
        onProgress(Math.round((m.progress || 0) * 100));
      }
    },
  });
  return data.text || "";
}

async function preprocessImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Scale up 3x for better OCR (increased from 2x)
      canvas.width = img.width * 3;
      canvas.height = img.height * 3;
      const ctx = canvas.getContext("2d");

      // Draw scaled
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Enhanced preprocessing: grayscale + adaptive contrast
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      
      // First pass: convert to grayscale and calculate stats
      const grays = [];
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        grays.push(gray);
      }
      
      // Calculate percentiles for adaptive thresholding
      grays.sort((a, b) => a - b);
      const p25 = grays[Math.floor(grays.length * 0.25)];
      const p75 = grays[Math.floor(grays.length * 0.75)];
      const midtone = (p25 + p75) / 2;
      const range = Math.max(1, p75 - p25);
      
      // Second pass: apply adaptive contrast
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // Stretch contrast around midtone
        const normalized = (gray - midtone) / range * 2;
        const contrast = Math.min(255, Math.max(0, (normalized * 1.8 + 1) * 128));
        d[i] = d[i + 1] = d[i + 2] = contrast;
      }
      ctx.putImageData(imageData, 0, 0);

      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.src = url;
  });
}

export async function runInvoiceOCR(file, onProgress) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  let rawText = "";

  if (isPdf) {
    // Try native text extraction first
    rawText = await extractTextFromPDF(file);

    // If empty, fall back to OCR (image-based PDF)
    if (!rawText || rawText.trim().length < 50) {
      console.log("Native text extraction failed, using OCR...");
      const canvases = await pdfToCanvases(file);
      const pageTexts = [];
      for (let i = 0; i < canvases.length; i++) {
        const pageProgress = (p) => {
          if (typeof onProgress === "function") {
            onProgress(Math.round(((i + p / 100) / canvases.length) * 100));
          }
        };
        pageTexts.push(await ocrCanvas(canvases[i], pageProgress));
      }
      rawText = pageTexts.join("\n");
    } else {
      if (typeof onProgress === "function") onProgress(100);
    }
  } else {
    // Image: preprocess then OCR
    const canvas = await preprocessImage(file);
    rawText = await ocrCanvas(canvas, onProgress);
    // If OCR quality is poor (too many short words), warn user
    const words = rawText.trim().split(/\s+/).filter(w => w.length > 2);
    const longWords = words.filter(w => /^[a-zA-Z0-9]+$/.test(w) && w.length > 3);
    const quality = longWords.length / Math.max(words.length, 1);
    console.log("Image OCR quality score:", quality, "long words:", longWords.length, "total:", words.length);
    if (quality < 0.3) {
      throw new Error("Image quality too low for accurate extraction. Please upload the PDF version of this invoice for best results.");
    }
  }

  console.log("=== Invoice Raw Text ===\n", rawText);
  
  const extractedDetails = extractInvoiceDetails(rawText);
  
  // Add debug info to help diagnose extraction issues
  if (extractedDetails.extractionWarning) {
    console.warn("⚠️ Extraction Warning:", extractedDetails.extractionWarning);
    console.log("📊 Debug: Analyzing text structure...");
    console.log("Total lines:", rawText.split("\n").length);
    const itemHeaderLine = rawText.split("\n").findIndex(l => /hsn|item.*description/i.test(l) && /cgst|igst|sgst|rate|amount/i.test(l));
    console.log("Item header found at line:", itemHeaderLine);
    const subtotalLine = rawText.split("\n").findIndex(l => /sub\s*total/i.test(l));
    console.log("Sub total found at line:", subtotalLine);
  }

  console.log("=== Extracted Details ===\n", JSON.stringify(extractedDetails, null, 2));

  return { rawText, ...extractedDetails };
}
