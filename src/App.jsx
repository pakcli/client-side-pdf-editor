import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  loadPdfDoc,
  renderPageToCanvas,
  mergePdfs,
  reorderPages,
  extractPages,
  applyOverlays,
  extractImagesFromPdf
} from './utils/pdfHelper';

// --- SUB-COMPONENTS FOR DRAG & DROP REORDERING ---

// Sortable item wrapper for PDF Page thumbnails
function SortablePageThumbnail({ id, index, totalPages, renderTrigger, pdfDoc }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const canvasRef = useRef(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  useEffect(() => {
    let active = true;
    if (pdfDoc && canvasRef.current) {
      // Render small thumbnail
      renderPageToCanvas(pdfDoc, index + 1, canvasRef.current, 0.4).then(() => {
        if (!active) return;
      }).catch(err => console.error("Thumbnail render error", err));
    }
    return () => {
      active = false;
    };
  }, [pdfDoc, index, renderTrigger]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:border-purple-500/50 transition-colors group relative"
    >
      <div className="relative overflow-hidden rounded bg-white shadow-lg">
        <canvas ref={canvasRef} className="max-w-[120px] max-h-[160px] block" />
      </div>
      <span className="text-xs font-medium text-gray-400 mt-2 group-hover:text-purple-400 transition-colors">
        Page {index + 1}
      </span>
    </div>
  );
}

// Sortable item wrapper for Merge Files list
function SortableFileItem({ id, file, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-purple-500/30 rounded-lg p-3 cursor-move"
    >
      <div className="flex items-center gap-3" {...attributes} {...listeners}>
        <span className="text-gray-500">☰</span>
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold text-gray-200 truncate max-w-[200px] md:max-w-[300px]">
            {file.name}
          </span>
          <span className="text-[10px] text-gray-500">
            {(file.size / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(id)}
        className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-full transition-colors font-bold text-sm"
      >
        ✕
      </button>
    </div>
  );
}

// --- MAIN APPLICATION COMPONENT ---

export default function App() {
  // File states
  const [originalBytes, setOriginalBytes] = useState(null);
  const [fileName, setFileName] = useState('');
  const [pdfjsDoc, setPdfjsDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);

  // Version Control tree states
  const [versions, setVersions] = useState([]); // Array of { id, label, ops }
  const [activeVersionIndex, setActiveVersionIndex] = useState(-1);
  const [warningVersionIndex, setWarningVersionIndex] = useState(null); // tracking branch splits
  const [tempNextOp, setTempNextOp] = useState(null); // temp op to store before confirm

  // Active workspace tools
  const [activeTool, setActiveTool] = useState(null); // 'merge', 'reorder', 'extract_pages', 'overlays', 'extract_images'
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);

  // Reorder page indices (0-indexed list of pages, e.g. [0, 1, 2...])
  const [pageOrder, setPageOrder] = useState([]);

  // Extract page inputs
  const [extractRange, setExtractRange] = useState('');

  // Overlays parameters
  const [overlays, setOverlays] = useState([]); // Active list of overlays in current editing draft
  const [selectedOverlayIdx, setSelectedOverlayIdx] = useState(null);
  const [overlayTool, setOverlayTool] = useState('link'); // 'link', 'stamp', 'text', 'image'
  
  // Input builders for overlays
  const [textVal, setTextVal] = useState('Double tap to edit');
  const [fontSizeVal, setFontSizeVal] = useState(14);
  const [colorVal, setColorVal] = useState('#ff0000');
  const [urlVal, setUrlVal] = useState('https://');
  const [imageBytes, setImageBytes] = useState(null);
  const [imageName, setImageName] = useState('');
  const [opacityVal, setOpacityVal] = useState(1.0);

  // Merge state variables
  const [mergeFiles, setMergeFiles] = useState([]); // List of { id, file, bytes }

  // Extract images output
  const [extractedImages, setExtractedImages] = useState([]); // List of { name, dataUrl }

  // Canvas scaling layout mapper
  const canvasRefs = useRef({});
  const pageContainerRefs = useRef({});

  // Pointer sensor setup for dnd-kit (handles dragging)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Reset tool states when a file is closed
  const resetFileState = () => {
    setOriginalBytes(null);
    setFileName('');
    setPdfjsDoc(null);
    setTotalPages(0);
    setVersions([]);
    setActiveVersionIndex(-1);
    setActiveTool(null);
    setOverlays([]);
    setSelectedOverlayIdx(null);
    setPageOrder([]);
    setMergeFiles([]);
    setExtractedImages([]);
  };

  // --- PDF RECONSTRUCTION LOGIC ---
  const applyVersionOps = async (baseBytes, ops) => {
    let bytes = baseBytes;
    for (const op of ops) {
      if (op.type === 'reorder') {
        bytes = await reorderPages(bytes, op.payload.pageOrder);
      } else if (op.type === 'extract_pages') {
        bytes = await extractPages(bytes, op.payload.range, op.payload.totalPages);
      } else if (op.type === 'apply_overlays') {
        bytes = await applyOverlays(bytes, op.payload.overlays);
      }
    }
    return bytes;
  };

  const loadVersion = async (versionIndex) => {
    setLoading(true);
    setLoadingMsg('Reconstructing version...');
    try {
      const verObj = versions[versionIndex];
      const verBytes = await applyVersionOps(originalBytes, verObj.ops);
      const doc = await loadPdfDoc(verBytes);
      setPdfjsDoc(doc);
      setTotalPages(doc.numPages);
      
      // Reset reorder pageOrder array
      const initialOrder = Array.from({ length: doc.numPages }, (_, i) => i);
      setPageOrder(initialOrder);
      
      setActiveVersionIndex(versionIndex);
      setRenderTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Error rendering PDF version: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActiveVersionBytes = async () => {
    if (activeVersionIndex === -1) return null;
    return await applyVersionOps(originalBytes, versions[activeVersionIndex].ops);
  };

  // --- FILE HANDLING INPUT HANDLERS ---
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    // File limit warnings (50MB check)
    const largeFile = files.some(f => f.size > 50 * 1024 * 1024);
    if (largeFile) {
      const confirmLarge = window.confirm("Large file detected (50MB+). Processing might be slow on mobile devices. Do you wish to continue?");
      if (!confirmLarge) return;
    }

    setLoading(true);
    setLoadingMsg('Loading PDF...');
    try {
      if (activeTool === 'merge') {
        // Appending to merge files
        const loaded = await Promise.all(
          files.map(async (file, idx) => {
            const buf = await file.arrayBuffer();
            return {
              id: `${Date.now()}-${idx}-${file.name}`,
              file,
              bytes: new Uint8Array(buf)
            };
          })
        );
        
        const nextMerge = [...mergeFiles, ...loaded].slice(0, 10); // clamp 10 files
        setMergeFiles(nextMerge);
      } else {
        // Load single PDF
        const file = files[0];
        setFileName(file.name);
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        
        setOriginalBytes(bytes);
        const doc = await loadPdfDoc(bytes);
        setPdfjsDoc(doc);
        setTotalPages(doc.numPages);

        // Setup base versions list
        const baseVersion = { id: 'orig', label: 'Original PDF Uploaded', ops: [] };
        setVersions([baseVersion]);
        setActiveVersionIndex(0);

        // Page order
        const initialOrder = Array.from({ length: doc.numPages }, (_, i) => i);
        setPageOrder(initialOrder);
      }
    } catch (err) {
      console.error(err);
      alert('Error parsing PDF file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop trigger for files
  const triggerFileSelect = () => {
    const el = document.getElementById('pdfFileInput');
    if (el) el.click();
  };

  // Trigger Merge
  const executeMerge = async () => {
    if (mergeFiles.length < 2) {
      alert('Please add at least 2 PDFs to merge.');
      return;
    }
    
    setLoading(true);
    setLoadingMsg('Merging PDF documents...');
    try {
      const bytesList = mergeFiles.map(m => m.bytes);
      const mergedBytes = await mergePdfs(bytesList);
      
      setFileName(`merged_${Date.now()}.pdf`);
      setOriginalBytes(mergedBytes);
      const doc = await loadPdfDoc(mergedBytes);
      setPdfjsDoc(doc);
      setTotalPages(doc.numPages);

      // Setup version state
      const baseVersion = { id: 'orig', label: 'Merged Document', ops: [] };
      setVersions([baseVersion]);
      setActiveVersionIndex(0);

      const initialOrder = Array.from({ length: doc.numPages }, (_, i) => i);
      setPageOrder(initialOrder);
      
      setActiveTool(null); // close merge dashboard
    } catch (err) {
      console.error(err);
      alert('Merge failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- SAVE OPERATION AND BRANCH LOGIC ---
  const saveOperation = async (opType, payload, label) => {
    // Check if we are editing an older version (branch split)
    const isEditingOld = activeVersionIndex < versions.length - 1;
    
    const newOp = { type: opType, payload };
    
    if (isEditingOld) {
      // Cache temp op and trigger warning popup
      setTempNextOp({ newOp, label });
      setWarningVersionIndex(activeVersionIndex);
      return;
    }
    
    await applyNextOperation(newOp, label);
  };

  const applyNextOperation = async (newOp, label) => {
    setLoading(true);
    setLoadingMsg('Applying edits and saving version...');
    try {
      const nextOps = [...versions[activeVersionIndex].ops, newOp];
      const verId = `v${versions.length}`;
      const newVersion = {
        id: verId,
        label: label || `Edit ${versions.length}`,
        ops: nextOps
      };
      
      const newVersionsList = [...versions.slice(0, activeVersionIndex + 1), newVersion];
      
      // Calculate bytes and load
      const verBytes = await applyVersionOps(originalBytes, nextOps);
      const doc = await loadPdfDoc(verBytes);
      
      setPdfjsDoc(doc);
      setTotalPages(doc.numPages);
      setVersions(newVersionsList);
      setActiveVersionIndex(newVersionsList.length - 1);
      
      // Reset reorder pageOrder array
      const initialOrder = Array.from({ length: doc.numPages }, (_, i) => i);
      setPageOrder(initialOrder);

      // Clear temp states
      setOverlays([]);
      setSelectedOverlayIdx(null);
      setRenderTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to save version: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmBranchSplit = async () => {
    if (!tempNextOp) return;
    const { newOp, label } = tempNextOp;
    await applyNextOperation(newOp, label);
    setWarningVersionIndex(null);
    setTempNextOp(null);
  };

  // --- SAVE OR APPLY HANDLERS PER TOOL ---
  const handleSaveReorder = async () => {
    // Check if order actually changed
    const unchanged = pageOrder.every((val, idx) => val === idx);
    if (unchanged) {
      alert('Order has not changed.');
      return;
    }
    
    await saveOperation('reorder', { pageOrder }, 'Reordered Pages');
    setActiveTool(null);
  };

  const handleSaveExtractPages = async () => {
    if (!extractRange.trim()) {
      alert('Please enter a valid page range (e.g. 1, 3-5).');
      return;
    }
    
    await saveOperation(
      'extract_pages', 
      { range: extractRange, totalPages }, 
      `Extracted Pages (${extractRange})`
    );
    setExtractRange('');
    setActiveTool(null);
  };

  const handleSaveOverlays = async () => {
    if (overlays.length === 0) {
      alert('No overlays added to apply.');
      return;
    }
    
    await saveOperation(
      'apply_overlays',
      { overlays },
      `Added Overlays (${overlays.length} items)`
    );
    setActiveTool(null);
  };

  const handleRunExtractImages = async () => {
    setLoading(true);
    setLoadingMsg('Extracting embedded images...');
    try {
      const activeBytes = await getActiveVersionBytes();
      const files = await extractImagesFromPdf(activeBytes);
      setExtractedImages(files);
      if (files.length === 0) {
        alert('No embedded images found in this PDF document.');
      }
    } catch (err) {
      console.error(err);
      alert('Image extraction failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadAllImagesZip = async () => {
    if (extractedImages.length === 0) return;
    
    setLoading(true);
    setLoadingMsg('Creating ZIP file...');
    try {
      const zip = new JSZip();
      extractedImages.forEach((img, idx) => {
        // Parse raw base64 data
        const base64Data = img.dataUrl.split(',')[1];
        zip.file(img.name, base64Data, { base64: true });
      });
      
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${fileName.replace('.pdf', '')}_extracted_images.zip`;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Failed to generate ZIP: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadActivePdf = async () => {
    setLoading(true);
    setLoadingMsg('Compiling and downloading PDF...');
    try {
      const bytes = await getActiveVersionBytes();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Download failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- DND-KIT drag handlers ---
  const handleDragEndPage = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    
    const oldIndex = pageOrder.indexOf(Number(active.id));
    const newIndex = pageOrder.indexOf(Number(over.id));
    
    setPageOrder(prev => arrayMove(prev, oldIndex, newIndex));
  };

  const handleDragEndFile = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    
    const oldIndex = mergeFiles.findIndex(item => item.id === active.id);
    const newIndex = mergeFiles.findIndex(item => item.id === over.id);
    
    setMergeFiles(prev => arrayMove(prev, oldIndex, newIndex));
  };

  const removeMergeFile = (id) => {
    setMergeFiles(prev => prev.filter(item => item.id !== id));
  };

  // --- INTERACTIVE OVERLAY POSITION/RESIZE HANDLERS ---
  const addOverlayAtPosition = (pageIdx, e) => {
    if (activeTool !== 'overlays') return;
    
    // Check if clicking resize handles or existing overlay directly
    if (e.target.closest('.interactive-overlay') || e.target.closest('.resize-handle')) {
      return; 
    }

    const container = pageContainerRefs.current[pageIdx];
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    // Create item based on activeOverlayTool
    const newOverlay = {
      type: overlayTool,
      pageIndex: pageIdx,
      x: clickX,
      y: clickY,
      w: overlayTool === 'text' ? 0.25 : 0.2,
      h: overlayTool === 'text' ? 0.04 : 0.1,
      opacity: opacityVal
    };

    if (overlayTool === 'link') {
      newOverlay.url = urlVal;
    } else if (overlayTool === 'text') {
      newOverlay.text = textVal;
      newOverlay.fontSize = fontSizeVal;
      newOverlay.color = colorVal;
    } else if (overlayTool === 'stamp' || overlayTool === 'image') {
      if (!imageBytes) {
        alert('Please upload an image first in the sidebar.');
        return;
      }
      newOverlay.imageBytes = imageBytes;
      newOverlay.imageName = imageName;
    }

    setOverlays(prev => [...prev, newOverlay]);
    setSelectedOverlayIdx(overlays.length);
  };

  const handleOverlaySelect = (idx, e) => {
    e.stopPropagation();
    setSelectedOverlayIdx(idx);
    const ov = overlays[idx];
    setOverlayTool(ov.type);
    
    if (ov.type === 'link') {
      setUrlVal(ov.url);
    } else if (ov.type === 'text') {
      setTextVal(ov.text);
      setFontSizeVal(ov.fontSize);
      setColorVal(ov.color);
    } else if (ov.type === 'stamp' || ov.type === 'image') {
      setImageBytes(ov.imageBytes);
      setImageName(ov.imageName || 'Embedded Image');
      setOpacityVal(ov.opacity || 1.0);
    }
  };

  // Drag and resize handlers (using standard pointer movement listeners)
  const startDragResize = (e, index, isResize = false) => {
    e.stopPropagation();
    e.preventDefault();
    
    setSelectedOverlayIdx(index);
    const target = overlays[index];
    
    const clientXStart = e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX;
    const clientYStart = e.clientY !== undefined ? e.clientY : e.touches?.[0]?.clientY;
    
    const container = pageContainerRefs.current[target.pageIndex];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    const onMove = (moveEv) => {
      const clientX = moveEv.clientX !== undefined ? moveEv.clientX : moveEv.touches?.[0]?.clientX;
      const clientY = moveEv.clientY !== undefined ? moveEv.clientY : moveEv.touches?.[0]?.clientY;
      
      const deltaX = (clientX - clientXStart) / rect.width;
      const deltaY = (clientY - clientYStart) / rect.height;
      
      setOverlays(prev => prev.map((ov, idx) => {
        if (idx !== index) return ov;
        if (isResize) {
          return {
            ...ov,
            w: Math.max(0.04, Math.min(1 - ov.x, target.w + deltaX)),
            h: Math.max(0.02, Math.min(1 - ov.y, target.h + deltaY))
          };
        } else {
          return {
            ...ov,
            x: Math.max(0, Math.min(1 - ov.w, target.x + deltaX)),
            y: Math.max(0, Math.min(1 - ov.h, target.y + deltaY))
          };
        }
      }));
    };
    
    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  };

  const removeOverlay = (idx) => {
    setOverlays(prev => prev.filter((_, i) => i !== idx));
    setSelectedOverlayIdx(null);
  };

  // Sync state values with active selected overlay
  useEffect(() => {
    if (selectedOverlayIdx === null || selectedOverlayIdx >= overlays.length) return;
    
    setOverlays(prev => prev.map((ov, idx) => {
      if (idx !== selectedOverlayIdx) return ov;
      const base = { ...ov };
      if (ov.type === 'link') {
        base.url = urlVal;
      } else if (ov.type === 'text') {
        base.text = textVal;
        base.fontSize = fontSizeVal;
        base.color = colorVal;
      } else if (ov.type === 'stamp' || ov.type === 'image') {
        base.imageBytes = imageBytes;
        base.imageName = imageName;
        base.opacity = opacityVal;
      }
      return base;
    }));
  }, [urlVal, textVal, fontSizeVal, colorVal, imageBytes, imageName, opacityVal, selectedOverlayIdx]);

  // Load custom image/stamp files
  const handleOverlayImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageName(file.name);
    
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result);
      setImageBytes(bytes);
    };
    reader.readAsArrayBuffer(file);
  };

  // --- RENDER PDF PAGES HOOK ---
  useEffect(() => {
    let active = true;
    if (pdfjsDoc) {
      const renderAll = async () => {
        for (let i = 1; i <= totalPages; i++) {
          if (!active) break;
          const canvas = canvasRefs.current[i - 1];
          if (canvas) {
            try {
              await renderPageToCanvas(pdfjsDoc, i, canvas, 1.25);
            } catch (err) {
              console.error("Canvas render error on page: " + i, err);
            }
          }
        }
      };
      renderAll();
    }
    return () => {
      active = false;
    };
  }, [pdfjsDoc, renderTrigger, totalPages]);

  return (
    <div className="flex flex-col min-height-screen bg-gray-950 text-gray-100 font-sans antialiased">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-900 bg-gray-950/80 backdrop-blur-md px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="w-10 h-10 flex items-center justify-center bg-gray-900 border border-gray-800 hover:border-purple-500/50 hover:text-purple-400 text-gray-300 rounded-full cursor-pointer transition-all duration-300 font-semibold"
            title="Privacy and File Limits Info"
          >
            ⓘ
          </button>
          <div className="flex flex-col text-left">
            <h1 className="text-base font-bold text-gray-100 tracking-wide flex items-center gap-1.5 leading-none m-0">
              📄 PDF Tools
            </h1>
            <span className="text-[10px] text-gray-500 font-mono mt-1">100% client-side editor</span>
          </div>
        </div>

        {fileName && (
          <div className="hidden sm:flex items-center max-w-[300px] md:max-w-[450px] bg-gray-900 border border-gray-800 rounded-full px-4 py-1.5 text-xs text-gray-300 truncate font-mono">
            {fileName}
          </div>
        )}

        <div className="flex items-center gap-3">
          {originalBytes && (
            <>
              <button
                type="button"
                onClick={downloadActivePdf}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-md cursor-pointer transition-all duration-300 flex items-center gap-1.5"
              >
                ⬇ Download
              </button>
              <button
                type="button"
                onClick={resetFileState}
                className="text-gray-400 hover:text-red-400 text-xs font-semibold px-3 py-2 cursor-pointer transition-colors"
              >
                Close File
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* If no file is loaded, show the Drop Zone and Tool selection dashboard */}
        {!originalBytes ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
            
            {/* Action selector cards */}
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Offline PDF Toolbox
              </h2>
              <p className="text-gray-400 text-sm mt-2 max-w-lg">
                Privacy guaranteed. Your files are processed entirely inside your browser cache and are never uploaded to any server.
              </p>
            </div>

            {/* Merge Mode File List dashboard */}
            {activeTool === 'merge' && mergeFiles.length > 0 && (
              <div className="w-full bg-gray-950 border border-gray-900 rounded-xl p-5 mb-6 text-left">
                <div className="flex justify-between items-center mb-4 border-b border-gray-900 pb-2">
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Files to Merge ({mergeFiles.length}/10)
                  </span>
                  <button
                    type="button"
                    onClick={() => setMergeFiles([])}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndFile}>
                  <SortableContext items={mergeFiles.map(m => m.id)}>
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {mergeFiles.map(m => (
                        <SortableFileItem key={m.id} id={m.id} file={m.file} onRemove={removeMergeFile} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={executeMerge}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    ⚡ Merge PDFs & Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeFiles([])}
                    className="bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs px-4 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Main drag drop area */}
            <div
              onClick={triggerFileSelect}
              className="w-full aspect-[2/1] min-h-[200px] border-2 border-dashed border-gray-800 hover:border-purple-500/50 bg-gray-950 hover:bg-gray-900/10 rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer transition-all duration-300 group mb-8"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files);
                if (files.length) {
                  handleFileUpload({ target: { files } });
                }
              }}
            >
              <div className="w-14 h-14 bg-gray-900 border border-gray-800 group-hover:border-purple-500/40 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-all">
                📂
              </div>
              <p className="text-sm font-semibold text-gray-300">
                {activeTool === 'merge' ? 'Drop 2–10 PDF files to merge' : 'Drop your PDF file here'}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">
                or click to browse local files
              </p>
              <input
                type="file"
                id="pdfFileInput"
                multiple={activeTool === 'merge'}
                accept="application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Tool grid dashboard selector */}
            <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {[
                { id: 'merge', label: '🔀 Merge PDFs', desc: 'Combine 2-10 files' },
                { id: 'reorder', label: '📋 Reorder', desc: 'Rearrange pages' },
                { id: 'extract_pages', label: '✂️ Extract Pages', desc: 'Separate range subset' },
                { id: 'link', label: '🔗 Link Area', desc: 'Draw clickable hyperlink' },
                { id: 'stamp', label: '🖼️ PNG Stamp', desc: 'Place transparent stamp' },
                { id: 'text', label: '🔤 Add Text', desc: 'Type custom texts' },
                { id: 'image', label: '🖼️ Add Image', desc: 'Place jpg/png assets' },
                { id: 'extract_images', label: '🖼️ Extract Img', desc: 'Download PDF assets' },
              ].map(tool => (
                <button
                  type="button"
                  key={tool.id}
                  onClick={() => {
                    if (tool.id === 'merge') {
                      setActiveTool('merge');
                    } else {
                      setActiveTool(tool.id === 'link' || tool.id === 'stamp' || tool.id === 'text' || tool.id === 'image' ? 'overlays' : tool.id);
                      if (tool.id === 'link' || tool.id === 'stamp' || tool.id === 'text' || tool.id === 'image') {
                        setOverlayTool(tool.id);
                      }
                      triggerFileSelect();
                    }
                  }}
                  className={`bg-gray-950 border border-gray-900 rounded-xl p-4 text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-500/50 hover:bg-gray-900/30 ${
                    activeTool === tool.id ? 'border-purple-500 bg-gray-900/50 shadow-lg shadow-purple-500/5' : ''
                  }`}
                >
                  <span className="text-sm font-bold text-gray-200 block">{tool.label}</span>
                  <span className="text-[10px] text-gray-500 mt-1 block leading-tight">{tool.desc}</span>
                </button>
              ))}
            </div>

          </div>
        ) : (
          
          // Workspace layouts once PDF is loaded
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* LEFT COLUMN: PDF Page Previews and drawing canvases */}
            <div className="flex-1 overflow-y-auto bg-gray-900/40 p-6 md:p-10 flex flex-col items-center gap-8 border-r border-gray-900">
              
              {/* Tool Merging & Page Reordering sortable list */}
              {activeTool === 'reorder' ? (
                <div className="w-full max-w-3xl">
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-left">
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Reorder Pages</span>
                      <h3 className="text-lg font-bold text-gray-200">Drag thumbnails to rearrange</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveReorder}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer"
                      >
                        Apply & Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTool(null)}
                        className="bg-gray-900 border border-gray-800 text-xs px-4 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndPage} sensors={sensors}>
                    <SortableContext items={pageOrder} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {pageOrder.map((pageIdx) => (
                          <SortablePageThumbnail
                            key={pageIdx}
                            id={pageIdx}
                            index={pageIdx}
                            totalPages={totalPages}
                            renderTrigger={renderTrigger}
                            pdfDoc={pdfjsDoc}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              ) : activeTool === 'extract_images' && extractedImages.length > 0 ? (
                // Image extractor thumbnails view
                <div className="w-full max-w-3xl text-left">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Image Extractor</span>
                      <h3 className="text-lg font-bold text-gray-200">Extracted {extractedImages.length} Images</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={downloadAllImagesZip}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer"
                      >
                        📦 Download all ZIP
                      </button>
                      <button
                        type="button"
                        onClick={() => setExtractedImages([])}
                        className="bg-gray-900 border border-gray-800 text-xs px-4 rounded-lg cursor-pointer"
                      >
                        Back
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {extractedImages.map((img, idx) => (
                      <div key={idx} className="bg-gray-950 border border-gray-900 rounded-xl p-3 flex flex-col">
                        <img src={img.dataUrl} alt={img.name} className="max-h-[140px] w-full object-contain bg-gray-900 rounded" />
                        <span className="text-[10px] text-gray-400 mt-2 truncate font-mono">{img.name}</span>
                        <a
                          href={img.dataUrl}
                          download={img.name}
                          className="mt-2 block w-full text-center bg-gray-900 hover:bg-gray-800 text-purple-400 font-semibold text-xs py-1.5 rounded transition-colors"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Default View: Scrollable vertical stack of rendered PDF page canvas
                <div className="flex flex-col gap-6 max-w-[620px] w-full">
                  {activeTool === 'overlays' && (
                    <div className="w-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-xl p-3 text-center mb-2 font-medium">
                      💡 Click or tap anywhere on a page below to place your "{overlayTool}" box!
                    </div>
                  )}

                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <div
                      key={idx}
                      ref={el => pageContainerRefs.current[idx] = el}
                      onClick={(e) => addOverlayAtPosition(idx, e)}
                      className="pdf-page-container relative bg-white border border-gray-800 shadow-xl overflow-hidden cursor-crosshair group"
                    >
                      <canvas
                        ref={el => canvasRefs.current[idx] = el}
                        className="block w-full h-auto"
                      />

                      {/* Display drawn edit overlays on top of this page */}
                      {activeTool === 'overlays' && (
                        <div className="overlay-container">
                          {overlays
                            .map((ov, index) => ({ ...ov, originalIndex: index }))
                            .filter(ov => ov.pageIndex === idx)
                            .map(ov => {
                              const active = selectedOverlayIdx === ov.originalIndex;
                              return (
                                <div
                                  key={ov.originalIndex}
                                  onClick={(e) => handleOverlaySelect(ov.originalIndex, e)}
                                  onMouseDown={(e) => startDragResize(e, ov.originalIndex)}
                                  onTouchStart={(e) => startDragResize(e, ov.originalIndex)}
                                  style={{
                                    left: `${ov.x * 100}%`,
                                    top: `${ov.y * 100}%`,
                                    width: `${ov.w * 100}%`,
                                    height: `${ov.h * 100}%`,
                                    opacity: ov.opacity !== undefined ? ov.opacity : 1
                                  }}
                                  className={`interactive-overlay ${active ? 'active' : ''} flex flex-col justify-between`}
                                >
                                  {ov.type === 'link' && (
                                    <div className="bg-blue-600/90 text-[10px] text-white px-1.5 py-0.5 truncate font-mono w-full leading-none">
                                      🔗 {ov.url || 'No URL'}
                                    </div>
                                  )}

                                  {ov.type === 'text' && (
                                    <div
                                      style={{
                                        fontSize: `${ov.fontSize * 0.75}px`, // visual scaling
                                        color: ov.color || '#000000'
                                      }}
                                      className="font-bold p-1 leading-tight select-none truncate w-full h-full text-left"
                                    >
                                      {ov.text || 'Text Box'}
                                    </div>
                                  )}

                                  {ov.type === 'stamp' && (
                                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                      {ov.imageBytes ? (
                                        <div className="text-[10px] font-bold text-purple-400 bg-black/60 px-1 py-0.5 rounded truncate max-w-[80%] font-mono leading-none">
                                          Stamp Logo
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-500 font-bold">Stamp</span>
                                      )}
                                    </div>
                                  )}

                                  {ov.type === 'image' && (
                                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                      <div className="text-[10px] font-bold text-gray-300 bg-black/60 px-1 py-0.5 rounded truncate max-w-[80%] font-mono leading-none">
                                        {ov.imageName || 'Asset Image'}
                                      </div>
                                    </div>
                                  )}

                                  {/* Close button for overlay */}
                                  {active && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeOverlay(ov.originalIndex);
                                      }}
                                      className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-red-600 border border-white hover:bg-red-700 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow transition-colors"
                                    >
                                      ✕
                                    </button>
                                  )}

                                  {/* Resize Handle */}
                                  {active && (
                                    <div
                                      onMouseDown={(e) => startDragResize(e, ov.originalIndex, true)}
                                      onTouchStart={(e) => startDragResize(e, ov.originalIndex, true)}
                                      className="resize-handle"
                                    />
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Tool panels & Version control list */}
            <aside className="w-full md:w-80 bg-gray-950 border-t md:border-t-0 md:border-l border-gray-900 flex flex-col h-auto md:h-full overflow-y-auto">
              
              {/* Dashboard Action List */}
              <div className="p-4 border-b border-gray-900 bg-gray-900/10">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Available Actions</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'reorder', label: '📋 Reorder' },
                    { id: 'extract_pages', label: '✂️ Extract Pages' },
                    { id: 'overlays', label: '✍️ Add Overlays' },
                    { id: 'extract_images', label: '🖼️ Pull Images' },
                  ].map(tool => (
                    <button
                      type="button"
                      key={tool.id}
                      onClick={() => {
                        setActiveTool(tool.id);
                        if (tool.id === 'overlays') {
                          setSelectedOverlayIdx(null);
                        }
                      }}
                      className={`text-xs px-3 py-1.5 font-semibold rounded-lg border cursor-pointer transition-all duration-200 ${
                        activeTool === tool.id
                          ? 'bg-purple-600/10 border-purple-500 text-purple-400'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-700 text-gray-400'
                      }`}
                    >
                      {tool.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Tool Parameters Panel */}
              <div className="flex-1 p-5 border-b border-gray-900">
                
                {/* TOOL: REORDER */}
                {activeTool === 'reorder' && (
                  <div className="text-left flex flex-col h-full justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-200 mb-1">Reorder Pages</h4>
                      <p className="text-xs text-gray-500 leading-normal">
                        Drag thumbnails in the left workspace to rearrange the PDF page order. Click apply to save your new layout.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveReorder}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Apply & Save Version
                    </button>
                  </div>
                )}

                {/* TOOL: EXTRACT PAGES */}
                {activeTool === 'extract_pages' && (
                  <div className="text-left flex flex-col gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-200 mb-1">Extract Pages</h4>
                      <p className="text-xs text-gray-500 leading-normal">
                        Generate a new PDF document consisting of only the pages defined in the range criteria.
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Page Range (Total: {totalPages})</label>
                      <input
                        type="text"
                        placeholder="e.g. 1, 3-5, 7"
                        value={extractRange}
                        onChange={(e) => setExtractRange(e.target.value)}
                        className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 outline-none focus:border-purple-500/50 transition-colors font-mono"
                      />
                      <span className="text-[10px] text-gray-600 leading-normal">
                        Format: Use comma separators and hyphens for range brackets. e.g. "1, 2-4, 5".
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveExtractPages}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer mt-2"
                    >
                      Apply & Save Version
                    </button>
                  </div>
                )}

                {/* TOOL: EXTRACT IMAGES */}
                {activeTool === 'extract_images' && (
                  <div className="text-left flex flex-col gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-200 mb-1">Extract Embedded Images</h4>
                      <p className="text-xs text-gray-500 leading-normal">
                        Extract and download all raw graphic assets and images embedded within this PDF document.
                      </p>
                    </div>

                    {extractedImages.length === 0 ? (
                      <button
                        type="button"
                        onClick={handleRunExtractImages}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Extract PDF Images
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={downloadAllImagesZip}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                        >
                          📦 Download ZIP ({extractedImages.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setExtractedImages([])}
                          className="w-full bg-gray-900 hover:bg-gray-850 text-gray-400 font-semibold text-xs py-2.5 rounded-lg border border-gray-800 transition-colors cursor-pointer"
                        >
                          Clear Extracted
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TOOL: INTERACTIVE OVERLAYS */}
                {activeTool === 'overlays' && (
                  <div className="text-left flex flex-col gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-200 mb-1">Overlay Editor</h4>
                      <p className="text-xs text-gray-500 leading-normal">
                        Select a type, click on the preview page to place it, then drag/resize to configure.
                      </p>
                    </div>

                    {/* Overlay Type Switcher buttons */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'link', label: '🔗 Link' },
                        { id: 'text', label: '🔤 Text' },
                        { id: 'stamp', label: '🖼️ Stamp' },
                        { id: 'image', label: '🖼️ Image' },
                      ].map(type => (
                        <button
                          type="button"
                          key={type.id}
                          onClick={() => {
                            setOverlayTool(type.id);
                            if (type.id !== 'stamp' && type.id !== 'image') {
                              setImageBytes(null);
                              setImageName('');
                            }
                          }}
                          className={`text-[10px] font-bold py-2 rounded border cursor-pointer transition-colors ${
                            overlayTool === type.id
                              ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                              : 'bg-gray-900 border-gray-800 text-gray-400'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-gray-900 pt-3 flex flex-col gap-3">
                      {/* Sub-inputs: Link */}
                      {overlayTool === 'link' && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Target URL</label>
                          <input
                            type="text"
                            value={urlVal}
                            onChange={(e) => setUrlVal(e.target.value)}
                            className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 outline-none"
                          />
                        </div>
                      )}

                      {/* Sub-inputs: Text */}
                      {overlayTool === 'text' && (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Custom Text</label>
                            <input
                              type="text"
                              value={textVal}
                              onChange={(e) => setTextVal(e.target.value)}
                              className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 outline-none"
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <div className="flex-1 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Size ({fontSizeVal}pt)</label>
                              <input
                                type="range"
                                min="8"
                                max="48"
                                value={fontSizeVal}
                                onChange={(e) => setFontSizeVal(Number(e.target.value))}
                                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                              />
                            </div>
                            
                            <div className="flex flex-col gap-1 w-14">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Color</label>
                              <input
                                type="color"
                                value={colorVal}
                                onChange={(e) => setColorVal(e.target.value)}
                                className="w-full h-7 border border-gray-800 bg-transparent rounded cursor-pointer p-0"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-inputs: Stamp & Image */}
                      {(overlayTool === 'stamp' || overlayTool === 'image') && (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">
                              Upload {overlayTool === 'stamp' ? 'PNG Stamp' : 'JPG/PNG Image'}
                            </label>
                            <input
                              type="file"
                              accept={overlayTool === 'stamp' ? 'image/png' : 'image/png, image/jpeg'}
                              onChange={handleOverlayImageUpload}
                              className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1 text-xs text-gray-400 file:mr-2.5 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-gray-800 file:text-purple-400 hover:file:bg-gray-750"
                            />
                            {imageName && (
                              <span className="text-[9px] text-gray-500 truncate mt-1 block max-w-[200px]">
                                Selected: {imageName}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Opacity ({Math.round(opacityVal * 100)}%)</label>
                            <input
                              type="range"
                              min="0.1"
                              max="1"
                              step="0.05"
                              value={opacityVal}
                              onChange={(e) => setOpacityVal(parseFloat(e.target.value))}
                              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedOverlayIdx !== null && selectedOverlayIdx < overlays.length && (
                      <div className="bg-gray-900/60 border border-gray-850 rounded-lg p-2.5 flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-400">Selected Item #{selectedOverlayIdx + 1} ({overlays[selectedOverlayIdx].type})</span>
                        <button
                          type="button"
                          onClick={() => removeOverlay(selectedOverlayIdx)}
                          className="text-[10px] text-red-400 hover:underline font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2 border-t border-gray-900 pt-4 mt-2">
                      <button
                        type="button"
                        onClick={handleSaveOverlays}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Apply & Save Version
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOverlays([]);
                          setSelectedOverlayIdx(null);
                          setActiveTool(null);
                        }}
                        className="bg-gray-900 border border-gray-800 text-xs px-4 rounded-lg cursor-pointer text-gray-400 hover:border-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* NO TOOL SELECTION SCREEN */}
                {!activeTool && (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <p className="text-xs text-gray-500 italic">
                      Select an action card above to start editing this PDF document.
                    </p>
                  </div>
                )}

              </div>

              {/* Version History Sidebar Control */}
              <div className="p-5 flex flex-col gap-4 text-left">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Version History</span>
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {versions.map((ver, idx) => {
                    const isActive = idx === activeVersionIndex;
                    return (
                      <div
                        key={ver.id}
                        className={`flex flex-col border rounded-lg p-2.5 transition-all duration-200 ${
                          isActive 
                            ? 'bg-purple-600/10 border-purple-500/80 shadow-md shadow-purple-500/5' 
                            : 'bg-gray-950 border-gray-900 hover:border-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-200 truncate pr-1">
                            {idx === 0 ? '🟢 ' : '○ '} {ver.label}
                          </span>
                          <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded leading-none">
                            {ver.id === 'orig' ? 'orig' : ver.id}
                          </span>
                        </div>
                        
                        <div className="flex justify-end gap-1.5 mt-2">
                          <button
                            type="button"
                            onClick={() => loadVersion(idx)}
                            disabled={isActive}
                            className="text-[10px] font-bold text-purple-400 hover:underline px-1 py-0.5 cursor-pointer disabled:text-gray-600 disabled:no-underline"
                          >
                            Preview
                          </button>
                          
                          <button
                            type="button"
                            onClick={async () => {
                              setLoading(true);
                              setLoadingMsg('Downloading version...');
                              try {
                                const b = await applyVersionOps(originalBytes, ver.ops);
                                const blob = new Blob([b], { type: 'application/pdf' });
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = `${fileName.replace('.pdf', '')}_${ver.id}.pdf`;
                                link.click();
                              } catch (err) {
                                console.error(err);
                                alert('Download failed: ' + err.message);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="text-[10px] font-bold text-blue-400 hover:underline px-1 py-0.5 cursor-pointer"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </aside>

          </div>
        )}

      </main>

      {/* WARNING MODAL SHEET: Confirm Branch split */}
      {warningVersionIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 animate-fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-sm w-full p-6 text-left shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-full flex items-center justify-center text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">Discard Forward Versions?</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Editing an older version ({versions[warningVersionIndex]?.id}) will split the version history tree. Future versions beyond this point will be discarded. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmBranchSplit}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Continue & Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setWarningVersionIndex(null);
                  setTempNextOp(null);
                }}
                className="flex-1 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT & LIMITS INFO DIALOG */}
      {infoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 animate-fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-gray-900 border-b border-gray-850 p-4 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                ⓘ PDF Tool Specifications
              </h3>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="text-gray-500 hover:text-gray-300 font-bold text-xs"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4 text-left text-xs leading-relaxed text-gray-400">
              <div className="flex items-start gap-2.5 border-b border-gray-900 pb-3">
                <span className="text-sm">📁</span>
                <div>
                  <span className="font-semibold text-gray-200 block mb-0.5">File size limits:</span>
                  - Max file upload limit: 50MB (warning shown at 50MB+)<br />
                  - Max merge size: 100MB total across files<br />
                  - Max merge files: 10 PDF files
                </div>
              </div>

              <div className="flex items-start gap-2.5 border-b border-gray-900 pb-3">
                <span className="text-sm">🔒</span>
                <div>
                  <span className="font-semibold text-gray-200 block mb-0.5">Privacy Protection:</span>
                  100% Client-Side execution. Your documents never leave your local device storage. There is no server interaction or database storage.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-sm">🕓</span>
                <div>
                  <span className="font-semibold text-gray-200 block mb-0.5">Temporary Session History:</span>
                  The operation log and version tree are saved in-memory and will be cleared if you refresh the browser page. Download your edits before leaving.
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border-t border-gray-850 p-4 text-center">
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="bg-gray-800 hover:bg-gray-750 text-purple-400 font-bold text-xs px-5 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Close Info Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global screen spinner loader */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs font-mono text-gray-400">{loadingMsg || 'Processing...'}</p>
        </div>
      )}

    </div>
  );
}
