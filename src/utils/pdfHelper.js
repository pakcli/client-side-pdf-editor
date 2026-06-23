import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, PDFName, PDFArray, PDFString, rgb } from 'pdf-lib';

// Configure PDF.js worker using local static asset (copied from pdfjs-dist build)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Loads a PDF document using PDF.js.
 */
export async function loadPdfDoc(pdfBytes) {
  // Create a copy of the bytes to prevent PDF.js from detaching/zeroing the underlying ArrayBuffer
  const bytesCopy = pdfBytes.slice();
  const loadingTask = pdfjsLib.getDocument({ data: bytesCopy });
  return await loadingTask.promise;
}

/**
 * Renders a specific PDF page to a canvas and returns the viewport dimensions.
 */
export async function renderPageToCanvas(pdfjsDoc, pageNum, canvas, scale = 1.5) {
  // Cancel any existing render task on this canvas
  if (canvas._currentRenderTask) {
    try {
      canvas._currentRenderTask.cancel();
    } catch (e) {
      console.warn("Error cancelling previous render task:", e);
    }
    canvas._currentRenderTask = null;
  }

  const page = await pdfjsDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext('2d');
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const renderTask = page.render({
    canvasContext: context,
    viewport: viewport
  });
  
  canvas._currentRenderTask = renderTask;
  
  try {
    await renderTask.promise;
  } catch (err) {
    if (err && err.name === 'RenderingCancelledException') {
      // Ignore cancellation errors
      return {
        width: viewport.width,
        height: viewport.height,
        cancelled: true
      };
    }
    throw err;
  } finally {
    if (canvas._currentRenderTask === renderTask) {
      canvas._currentRenderTask = null;
    }
  }
  
  return {
    width: viewport.width,
    height: viewport.height
  };
}

/**
 * Merges multiple PDF files (Uint8Arrays) into a single document.
 */
export async function mergePdfs(pdfBytesList) {
  const mergedPdf = await PDFDocument.create();
  for (const bytes of pdfBytesList) {
    const doc = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }
  return await mergedPdf.save();
}

/**
 * Reorders pages in a PDF based on an array of 0-based indices.
 */
export async function reorderPages(pdfBytes, newOrderIndices) {
  const originalPdf = await PDFDocument.load(pdfBytes);
  const reorderedPdf = await PDFDocument.create();
  const copiedPages = await reorderedPdf.copyPages(originalPdf, newOrderIndices);
  copiedPages.forEach(page => reorderedPdf.addPage(page));
  return await reorderedPdf.save();
}

/**
 * Extracts a subset of pages based on a range string (e.g., '1, 3-5').
 */
export async function extractPages(pdfBytes, rangeString, totalPages) {
  const indices = parseRangeString(rangeString, totalPages);
  if (indices.length === 0) {
    throw new Error('Invalid page range specified.');
  }
  const originalPdf = await PDFDocument.load(pdfBytes);
  const extractedPdf = await PDFDocument.create();
  const copiedPages = await extractedPdf.copyPages(originalPdf, indices);
  copiedPages.forEach(page => extractedPdf.addPage(page));
  return await extractedPdf.save();
}

/**
 * Helper to parse range strings like "1, 3-5, 8" into 0-based index arrays.
 */
function parseRangeString(rangeString, totalPages) {
  const indices = [];
  const parts = rangeString.split(',');
  for (const part of parts) {
    const clean = part.trim();
    if (!clean) continue;
    if (clean.includes('-')) {
      const [startStr, endStr] = clean.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const low = Math.min(start, end);
        const high = Math.max(start, end);
        for (let i = low; i <= high; i++) {
          if (i >= 1 && i <= totalPages) {
            indices.push(i - 1);
          }
        }
      }
    } else {
      const page = parseInt(clean, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        indices.push(page - 1);
      }
    }
  }
  return [...new Set(indices)].sort((a, b) => a - b);
}

/**
 * Appends interactive overlays (Links, Text, PNG Stamps, Images) onto a PDF.
 * Overlays array structure:
 * {
 *   type: 'link' | 'text' | 'stamp' | 'image',
 *   pageIndex: number, // 0-based
 *   // Position inside browser page bounds
 *   x: number, // % from left (0 to 1)
 *   y: number, // % from top (0 to 1)
 *   w: number, // % width (0 to 1)
 *   h: number, // % height (0 to 1)
 *   // Specific configs
 *   url: string, // for 'link'
 *   text: string, // for 'text'
 *   fontSize: number,
 *   color: string, // hex color, e.g. '#ffffff'
 *   imageBytes: Uint8Array, // for 'stamp' & 'image'
 *   opacity: number // 0 to 1
 * }
 */
export async function applyOverlays(pdfBytes, overlays) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  // Cache embedded image files to avoid embedding duplicates multiple times
  const imageCache = new Map();

  for (const op of overlays) {
    const { type, pageIndex, x, y, w, h, url, text, fontSize, color, imageBytes, opacity } = op;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    
    const page = pages[pageIndex];
    const { width: pageW, height: pageH } = page.getSize();
    
    // Coordinate translation: Browser (top-left) to PDF (bottom-left)
    const overlayW = w * pageW;
    const overlayH = h * pageH;
    const overlayX = x * pageW;
    const overlayY = pageH - (y * pageH) - overlayH; // align to bottom-left edge

    if (type === 'link') {
      // Sanitize URL to handle copy-paste duplicates or missing schemes
      let sanitizedUrl = (url || '').trim();
      sanitizedUrl = sanitizedUrl.replace(/^(https?:\/\/)+/i, '$1');
      if (sanitizedUrl && !/^(https?:\/\/|mailto:|ftp:)/i.test(sanitizedUrl)) {
        sanitizedUrl = 'https://' + sanitizedUrl;
      }
      if (!sanitizedUrl) {
        sanitizedUrl = 'https://';
      }

      // Add standard PDF Link Annotation
      const linkAnnotation = pdfDoc.context.register(
        pdfDoc.context.obj({
          Type: PDFName.of('Annot'),
          Subtype: PDFName.of('Link'),
          Rect: [overlayX, overlayY, overlayX + overlayW, overlayY + overlayH],
          Border: [0, 0, 0], // invisible borders
          F: 4, // Print flag (standard compatibility)
          A: {
            Type: PDFName.of('Action'),
            S: PDFName.of('URI'),
            URI: PDFString.of(sanitizedUrl)
          }
        })
      );
      
      const annotsRef = page.node.get(PDFName.of('Annots'));
      const annots = annotsRef ? pdfDoc.context.lookup(annotsRef) : undefined;
      
      if (annots instanceof PDFArray) {
        annots.push(linkAnnotation);
      } else {
        const newAnnots = pdfDoc.context.obj([linkAnnotation]);
        const newAnnotsRef = pdfDoc.context.register(newAnnots);
        page.node.set(PDFName.of('Annots'), newAnnotsRef);
      }
    }
    
    else if (type === 'text') {
      const hex = color || '#000000';
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      page.drawText(text || '', {
        x: overlayX,
        y: overlayY + 3, // nudge text slightly up from bounding box base
        size: fontSize || 12,
        color: rgb(r, g, b)
      });
    }
    
    else if (type === 'stamp' || type === 'image') {
      if (!imageBytes) continue;
      
      let embeddedImage = imageCache.get(imageBytes);
      if (!embeddedImage) {
        // Embed image cleanly (PNG transparent vs JPG auto-detection)
        try {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } catch (e) {
          // Fallback to embedJpg if embedPng fails
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }
        imageCache.set(imageBytes, embeddedImage);
      }
      
      page.drawImage(embeddedImage, {
        x: overlayX,
        y: overlayY,
        width: overlayW,
        height: overlayH,
        opacity: opacity !== undefined ? opacity : 1.0
      });
    }
  }
  
  return await pdfDoc.save();
}

/**
 * Extracts all embedded images from a PDF using PDF.js objects.
 * Returns array of { name: string, dataUrl: string }
 */
export async function extractImagesFromPdf(pdfBytes) {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdfjsDoc = await loadingTask.promise;
  const imageFiles = [];
  
  for (let pageNum = 1; pageNum <= pdfjsDoc.numPages; pageNum++) {
    const page = await pdfjsDoc.getPage(pageNum);
    const operatorList = await page.getOperatorList();
    
    let imgIndex = 1;
    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i];
      
      // Look for paintImageXObject calls
      if (fn === pdfjsLib.OPS.paintImageXObject) {
        const imgName = operatorList.argsArray[i][0];
        try {
          const img = await page.objs.get(imgName);
          if (img) {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            if (img instanceof ImageBitmap) {
              ctx.drawImage(img, 0, 0);
            } else if (img.data) {
              const imgData = ctx.createImageData(img.width, img.height);
              
              if (img.data.length === img.width * img.height * 3) {
                // RGB source, convert to RGBA
                for (let k = 0, l = 0; k < imgData.data.length; k += 4, l += 3) {
                  imgData.data[k] = img.data[l];
                  imgData.data[k + 1] = img.data[l + 1];
                  imgData.data[k + 2] = img.data[l + 2];
                  imgData.data[k + 3] = 255;
                }
              } else {
                // RGBA source
                imgData.data.set(img.data);
              }
              ctx.putImageData(imgData, 0, 0);
            }
            
            const dataUrl = canvas.toDataURL('image/png');
            imageFiles.push({
              name: `page_${pageNum}_img_${imgIndex}.png`,
              dataUrl: dataUrl
            });
            imgIndex++;
          }
        } catch (err) {
          console.error(`Failed to extract image ${imgName} on page ${pageNum}:`, err);
        }
      }
    }
  }
  
  return imageFiles;
}
