# Client-Side PDF Tool — Product Brief

> **For:** Software Engineer
> **Version:** 1.2
> **Status:** Ready to implement
> Like PDF24 — but actually works on mobile, 100% client-side, no upload.

---

## 1. Overview

Browser-based PDF editor built in React. Runs entirely in the browser. No server, no upload, no account. File never leaves the device. Inspired by PDF24 but mobile-first, with version control built in.

---

## 2. Core Principles

| Principle | Description |
|-----------|-------------|
| Privacy first | PDF never sent to any server |
| Zero install | Runs in browser |
| Offline capable | PWA, works after first load |
| Mobile first | React, responsive, touch-friendly |
| No account | Open and use immediately |
| Version control | Every save creates a new version, all downloadable |

---

## 3. Features

### 3.1 Merge PDFs
- Select 2–10 PDF files
- Drag to reorder before merging
- Output: single merged PDF

### 3.2 Reorder Pages
- Thumbnail preview of all pages
- Drag and drop to rearrange
- Output: reordered PDF

### 3.3 Extract Pages
- Select specific pages (e.g. 1, 3–5)
- Output: new PDF with selected pages only

### 3.4 Add Hyperlink (Link Area)
- Tap & drag to draw bounding box on a page area
- Input URL
- Output: PDF with clickable link on that area

### 3.5 Stamp with PNG
- Upload a PNG image (e.g. signature, logo, stamp)
- Position, resize, set opacity on page
- Transparent PNG supported
- Output: PDF with PNG embedded as overlay

### 3.6 Add Text Box
- Tap anywhere on a page to place a text box
- Type custom text
- Pick font size, color, position
- Draggable to reposition before applying
- Output: PDF with text overlay

### 3.7 Add Image
- Upload any PNG/JPG
- Place, resize, reposition on page
- Output: PDF with image embedded

### 3.8 Extract Images
- Pull all embedded images from PDF
- Download individually or as ZIP
- Output: PNG/JPG files

---

## 4. Version Control

### Concept
Every time the user saves an edit, a new version is created. The original PDF is always preserved. All versions are downloadable and previewable inline.

### Version Tree Logic
```
Original → v1 → v2 → v3 (current)

If user edits v2 and saves:
Original → v1 → v2 → v2.1 (new current)
                 ↑
                 v3 is removed (forward versions dropped)
```

Like Git — editing an old version creates a new timeline, future versions are discarded.

### Version Storage
- Store **original PDF once** (full copy)
- Store **operation log per version** (not full PDF copies)
- Reconstruct PDF on demand when user previews or downloads a version
- Keeps memory usage low

### Operation Log Example
```json
[
  { "version": "v1", "label": "link added", "op": "add_link", "page": 1, "area": {...}, "url": "https://..." },
  { "version": "v2", "label": "stamp added", "op": "add_stamp", "page": 2, "img": "...", "pos": {...} },
  { "version": "v3", "label": "merged portfolio.pdf", "op": "merge", "file": "portfolio.pdf" }
]
```

### Version Panel UI
```
┌──────────────────────────────┐
│  VERSION HISTORY             │
├──────────────────────────────┤
│  🟢 v3 — merged portfolio   │
│     [👁 Preview] [⬇ Download]│
│                              │
│  ○  v2 — stamp added        │
│     [👁 Preview] [⬇ Download]│
│                              │
│  ○  v1 — link added         │
│     [👁 Preview] [⬇ Download]│
│                              │
│  ○  Original                │
│     [👁 Preview] [⬇ Download]│
└──────────────────────────────┘
```

### Inline PDF Preview (per version)
```
┌──────────────────────────────┐
│  ← v2 — stamp added    [⬇]  │
├──────────────────────────────┤
│                              │
│  [rendered PDF pages here]   │
│                              │
│  [ Edit this version ]       │
└──────────────────────────────┘
```

### Edit Old Version — Warning Prompt
```
⚠️ Editing v2 will remove v3.
[ Cancel ]  [ Continue ]
```

---

## 5. File Limits

| Rule | Limit |
|------|-------|
| Max per file | **50MB** |
| Max total (merge) | **100MB** |
| Max files (merge) | **10 files** |
| Warning shown at | 50MB+ |
| Behavior | Warn, don't block. Show: "Large file — may be slow on mobile." |

---

## 6. Tech Stack

| Layer | Library |
|-------|---------|
| PDF Rendering | PDF.js (Mozilla) |
| PDF Editing | pdf-lib |
| UI Framework | React |
| Styling | Tailwind CSS |
| Drag & Drop | dnd-kit |
| Image/Stamp | pdf-lib embed image |
| Zip Export | JSZip |
| Offline | Service Worker / PWA |
| Version State | React state / localStorage (in-memory) |

All libraries run client-side. No backend required.

---

## 7. UI / UX Wireframe

### Main Screen
```
┌──────────────────────────────┐
│ ⓘ  📄 PDF Tools              │
│    "Your file stays here"    │
├──────────────────────────────┤
│                              │
│    [ Drop PDF here ]         │
│    [ or tap to open ]        │
│                              │
├──────────────────────────────┤
│  ┌────────┐  ┌────────┐      │
│  │🔀 Merge│  │📋 Reorder│    │
│  └────────┘  └────────┘      │
│  ┌────────┐  ┌────────┐      │
│  │✂️ Extract│ │🔗 Link  │    │
│  └────────┘  └────────┘      │
│  ┌────────┐  ┌────────┐      │
│  │🖼️ Stamp │ │🔤 Text  │    │
│  │  PNG   │ │  Box   │      │
│  └────────┘  └────────┘      │
│  ┌────────┐                  │
│  │🖼️ Add  │                  │
│  │ Image  │                  │
│  └────────┘                  │
├──────────────────────────────┤
│  PAGE PREVIEW                │
│  ┌───┐  ┌───┐  ┌───┐        │
│  │ 1 │  │ 2 │  │ 3 │  →     │
│  └───┘  └───┘  └───┘        │
│  (drag to reorder)           │
├──────────────────────────────┤
│  VERSION HISTORY             │
│  🟢 v3  ○ v2  ○ v1  ○ Orig  │
│  [👁][⬇] per version         │
├──────────────────────────────┤
│     [ ⬇ Download PDF ]       │
└──────────────────────────────┘
```

### Add Text Box Flow
```
┌──────────────────────────────┐
│  ← Add Text Box              │
├──────────────────────────────┤
│  [Page preview]              │
│                              │
│  Tap to place text box       │
│  ┌─────────────────┐         │
│  │ Type here...    │         │
│  └─────────────────┘         │
├──────────────────────────────┤
│  Font size: [ 12 ▼ ]         │
│  Color:     [ ⬛ ]           │
│  [ Apply & Save Version ]    │
└──────────────────────────────┘
```

### Stamp / Add Image Flow
```
┌──────────────────────────────┐
│  ← Add Stamp / Image         │
├──────────────────────────────┤
│  [ Upload PNG ]              │
│                              │
│  [Page preview]              │
│  ┌──────┐                    │
│  │ img  │ ← drag to move     │
+  │      │ ← pinch to resize  │
│  └──────┘                    │
├──────────────────────────────┤
│  Opacity: [====|----] 80%    │
│  [ Apply & Save Version ]    │
└──────────────────────────────┘
```

### ⓘ Info Sheet
```
┌──────────────────────────────┐
│  ⓘ About                     │
├──────────────────────────────┤
│  📁 Max file: 50MB           │
│  📁 Max merge: 100MB total   │
│  📁 Max files: 10            │
│                              │
│  🔒 Files never leave device │
│  🕓 Version history in-memory│
│     (cleared on page refresh)│
│                              │
│  pdf-lib + PDF.js — v1.2     │
└──────────────────────────────┘
```

---

## 8. UX Rules

- ⓘ icon always visible top-left
- Dark mode default
- Min touch target 44×44px
- Spinner for heavy operations
- Plain language errors ("File too large" not "Memory exception")
- Warn on 50MB+, don't block
- Pinch to resize images/stamps on mobile
- All overlays (text, image, stamp) draggable before applying
- Every "Apply" action auto-saves a new version
- Confirm before editing old version (will remove forward versions)

---

## 9. Edge Cases

| Scenario | Handling |
|----------|----------|
| File > 50MB | Warn, still attempt |
| Password-protected PDF | Detect, prompt password |
| Corrupted PDF | Clear error message |
| iOS Safari | Test specifically, PWA limited |
| Transparent PNG stamp | Preserve transparency via pdf-lib |
| Text box over image | Z-order support needed |
| Edit old version | Prompt warning, remove forward versions on confirm |
| Page refresh | Version history cleared — warn user versions are session-only |

---

## 10. Out of Scope (v1)

- OCR / text recognition
- Form filling
- Pen / drawing tools
- Cloud save / sync
- Persistent version history across sessions
- Collaboration

---

## 11. Deliverable

- Single-page web app (React)
- Hostable on Vercel, Netlify, GitHub Pages
- PWA-ready (add to home screen on mobile)
- No backend, no database, no env variables needed

---

## 12. Success Checklist

- [ ] Open PDF, see page thumbnails
- [ ] Merge 2+ PDFs
- [ ] Reorder pages via drag & drop
- [ ] Extract specific pages
- [ ] Add clickable hyperlink to selected area
- [ ] Stamp with PNG (transparent support)
- [ ] Add text box anywhere on page
- [ ] Add image anywhere on page
- [ ] Extract embedded images as ZIP
- [ ] Every edit saves a new version automatically
- [ ] All versions downloadable
- [ ] All versions previewable inline
- [ ] Edit old version → warning prompt → removes forward versions
- [ ] Works on Chrome Android + Safari iOS
- [ ] File never sent to server
- [ ] Offline after first visit
- [ ] ⓘ info icon shows limits, privacy note, version note
