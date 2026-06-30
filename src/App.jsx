import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
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
import CVMaker from './components/CVMaker';

// Translations dictionary for premium multilingual support
const dictionary = {
  en: {
    specsTitle: "ⓘ PDF Tool Specifications & Q&A",
    faqTitle: "💡 Frequently Asked Questions (Q&A)",
    closeSheet: "Close Info Sheet",
    downloadAll: "Download All Versions",
    limits: "File Size Limits",
    privacy: "Privacy Protection",
    session: "Temporary Session History",
    tech: "Project Info & Tech Stack",
    limitsDesc: "- Max file upload limit: 50MB (warning shown at 50MB+)\n- Max merge size: 100MB total across files\n- Max merge files: 10 PDF files",
    privacyDesc: "100% Client-Side execution. Your documents never leave your local device storage. There is no server interaction or database storage.",
    sessionDesc: "The operation log and version tree are saved in-memory and will be cleared if you refresh the browser page. Download your edits before leaving.",
    techDesc: "Client-side only processing using React, Vite, Tailwind CSS, and PDF-lib.",
    q1: "Q1: How does it not use a server?",
    a1: "The application runs entirely in your local browser sandbox. It reads files locally via HTML5 File APIs (`ArrayBuffer`) and processes/writes them using client-side JavaScript. There are zero backend HTTP calls or database APIs transmitting your documents.",
    q2: "Q2: How does the workflow work in a client device?",
    a2_1: "Upload: The PDF is parsed locally using PDF.js.",
    a2_2: "Editing: Edits (like reordering, page extraction, overlays) are tracked as lightweight JSON operation logs rather than saving massive PDF files, optimizing memory.",
    a2_3: "Reconstruction: When previewing or saving, `pdf-lib` recompiles the PDF by applying the operation queue step-by-step onto the original file array buffer.",
    a2_4: "Download: A local Blob URL is generated, allowing the browser to download the file directly from your RAM.",
    q3: "Q3: What is client-side processing?",
    a3: "Client-side processing means all computational tasks, rendering, and file manipulations happen directly on the user's local machine (the client) within the browser's execution engine, instead of sending data to a remote cloud server to be processed.",
    q4: "Q4: What is the tech stack needed?",
    a4: "The app is built using React, Vite, and Tailwind CSS. It leverages Mozilla's PDF.js to read and render PDF pages onto HTML5 canvas elements, PDF-Lib to create/modify PDF binary bytes offline, and JSZip to bundle files into a ZIP inside the browser.",
    q5: "Q5: What is PDF-Lib for this, and is it using my data?",
    a5: "PDF-Lib is a pure JavaScript library that reads, modifies, and compiles PDF binary structures directly in the browser's memory. It does not collect, store, or transmit your data. The program is fully offline-able because all code libraries (Vite bundles, PDF.js, PDF-lib, JSZip) are served directly to your browser cache, running independently of the internet once loaded.",
    appTitle: "Offline PDF Toolbox",
    appDesc: "Privacy guaranteed. Your files are processed entirely inside your browser cache and are never uploaded to any server.",
    tool_merge: "🔀 Merge PDFs",
    tool_reorder: "📋 Reorder",
    tool_extract_pages: "✂️ Extract Pages ",
    tool_link: "🔗 Link Area",
    tool_stamp: "🖼️ PNG Stamp",
    tool_text: "🔤 Add Text",
    tool_image: "🖼️ Add Image",
    tool_extract_images: "🖼️ Extract Img",
    tool_cv_maker: "📄 CV Maker",
    combineFilesDesc: "Combine 2-10 files",
    rearrangePagesDesc: "Rearrange pages",
    separateRangeDesc: "Separate range subset",
    drawHyperlinkDesc: "Draw clickable hyperlink",
    placeStampDesc: "Place transparent stamp",
    addCustomTextDesc: "Type custom texts",
    addImageAssetsDesc: "Place jpg/png assets",
    extractAssetsDesc: "Download PDF assets",
    cvMakerDesc: "Create A4 resume from Markdown or form",
    dropMerge: "Drop 2–10 PDF files to merge",
    dropSingle: "Drop your PDF file here",
    orBrowse: "or click to browse local files",
    filesToMerge: "Files to Merge",
    clearAll: "Clear All",
    mergeAndEdit: "⚡ Merge PDFs & Edit",
    cancel: "Cancel",
    resetZoom: "🔄 Reset Zoom",
    zoomLabel: "🔍 Zoom",
    applyAndSave: "Apply & Save Version",
    dragRearrange: "Drag thumbnails to rearrange",
    extractedImagesTitle: "Image Extractor",
    extractedImagesCount: "Extracted Images",
    downloadZip: "📦 Download all ZIP",
    back: "Back",
    clickOverlayInstruction: "💡 Click or tap anywhere on a page below to place your item!",
    overlayEditor: "Overlay Editor",
    overlayDesc: "Select a type, click on the preview page to place it, then drag/resize to configure.",
    customText: "Custom Text",
    size: "Size",
    color: "Color",
    opacity: "Opacity",
    uploadStamp: "Upload Stamp",
    uploadImage: "Upload Image",
    noOverlayYet: "No link overlays added yet. Click \"+ Add Row\" or click on the PDF to create one.",
    noToolSelected: "Select an action card above to start editing this PDF document.",
    versionHistory: "Version History",
    availableActions: "Available Actions",
    warningDiscardTitle: "Discard Forward Versions?",
    warningDiscardDesc: "Editing an older version will split the version history tree. Future versions beyond this point will be discarded.",
    continueEdit: "Continue & Edit",
    closeFileTitle: "Close File?",
    closeFileDesc: "Are you sure you want to close this file? Any unsaved changes will be lost.",
    closeFileBtn: "Close File",
    pageWord: "Page"
  },
  id: {
    specsTitle: "ⓘ Spesifikasi Alat PDF & Tanya Jawab",
    faqTitle: "💡 Pertanyaan yang Sering Diajukan (Q&A)",
    closeSheet: "Tutup Lembar Info",
    limits: "Batas Ukuran File",
    privacy: "Perlindungan Privasi",
    session: "Riwayat Sesi Sementara",
    tech: "Info Proyek & Teknologi",
    limitsDesc: "- Batas unggah file maks: 50MB (peringatan ditampilkan pada 50MB+)\n- Ukuran penggabungan maks: total 100MB antar file\n- File penggabungan maks: 10 file PDF",
    privacyDesc: "Eksekusi 100% di Sisi Klien. Dokumen Anda tidak pernah meninggalkan penyimpanan perangkat lokal Anda. Tidak ada interaksi server atau penyimpanan basis data.",
    sessionDesc: "Log operasi dan pohon versi disimpan di memori dan akan dihapus jika Anda menyegarkan halaman browser. Unduh hasil edit Anda sebelum pergi.",
    techDesc: "Pemrosesan sisi klien saja menggunakan React, Vite, Tailwind CSS, dan PDF-lib.",
    q1: "Q1: Bagaimana program ini tidak menggunakan server?",
    a1: "Aplikasi berjalan sepenuhnya di sandbox browser lokal Anda. Aplikasi membaca file secara lokal melalui HTML5 File API (`ArrayBuffer`) dan memproses/menuliskannya menggunakan JavaScript sisi klien. Tidak ada panggilan HTTP backend atau API basis data yang mengirimkan dokumen Anda.",
    q2: "Q2: Bagaimana alur kerja di perangkat klien?",
    a2_1: "Unggah: PDF diurai secara lokal menggunakan PDF.js.",
    a2_2: "Pengeditan: Edits (seperti penyusunan ulang, ekstraksi halaman, overlay) dilacak sebagai log operasi JSON ringan alih-alih menyimpan file PDF yang besar, sehingga mengoptimalkan memori.",
    a2_3: "Rekonstruksi: Saat pratinjau atau menyimpan, `pdf-lib` mengompilasi ulang PDF dengan menerapkan antrean operasi langkah demi langkah ke buffer array file asli.",
    a2_4: "Unduh: URL Blob lokal dibuat, memungkinkan browser mengunduh file langsung dari RAM Anda.",
    q3: "Q3: Apa itu pemrosesan sisi klien?",
    a3: "Pemrosesan sisi klien berarti semua tugas komputasi, rendering, dan manipulasi file terjadi langsung di mesin lokal pengguna (klien) dalam mesin eksekusi browser, alih-alih mengirim data ke server cloud jarak jauh untuk diproses.",
    q4: "Q4: Apa tumpukan teknologi yang dibutuhkan?",
    a4: "Aplikasi ini dibangun menggunakan React, Vite, dan Tailwind CSS. Aplikasi ini memanfaatkan PDF.js milik Mozilla untuk membaca dan merender halaman PDF ke elemen kanvas HTML5, PDF-Lib untuk membuat/memodifikasi byte biner PDF secara offline, dan JSZip untuk membundel file ke dalam ZIP di dalam browser.",
    q5: "Q5: Apa itu PDF-Lib, dan apakah menggunakan data saya?",
    a5: "PDF-Lib adalah pustaka JavaScript murni yang membaca, memodifikasi, yasa, dan mengompilasi struktur biner PDF secara langsung di memori browser Anda. PDF-Lib tidak mengumpulkan, menyimpan, otonom, atau mengirimkan data Anda. Program ini sepenuhnya dapat berjalan secara offline karena semua pustaka kode (bundel Vite, PDF.js, PDF-lib, JSZip) disajikan langsung ke cache browser Anda, berjalan secara independen dari internet setelah dimuat.",
    appTitle: "Offline PDF Toolbox",
    appDesc: "Privasi terjamin. File Anda diproses sepenuhnya di dalam cache browser Anda dan tidak pernah diunggah ke server mana pun.",
    tool_merge: "🔀 Gabung PDF",
    tool_reorder: "📋 Susun Ulang",
    tool_extract_pages: "✂️ Ekstrak Halaman",
    tool_link: "🔗 Area Tautan",
    tool_stamp: "🖼️ Cap PNG",
    tool_text: "🔤 Tambah Teks",
    tool_image: "🖼️ Tambah Gambar",
    tool_extract_images: "🖼️ Ekstrak Gambar",
    tool_cv_maker: "📄 CV Maker",
    combineFilesDesc: "Gabungkan 2-10 berkas",
    rearrangePagesDesc: "Susun ulang halaman",
    separateRangeDesc: "Pisahkan subset rentang",
    drawHyperlinkDesc: "Gambar tautan yang dapat diklik",
    placeStampDesc: "Tempatkan cap transparan",
    addCustomTextDesc: "Ketik teks khusus",
    addImageAssetsDesc: "Tempatkan aset jpg/png",
    extractAssetsDesc: "Unduh aset gambar PDF",
    cvMakerDesc: "Buat CV A4 elegan dari Markdown atau form",
    dropMerge: "Letakkan 2-10 file PDF untuk digabungkan",
    dropSingle: "Letakkan file PDF Anda di sini",
    orBrowse: "atau klik untuk memilih file lokal",
    filesToMerge: "Berkas Penggabungan",
    clearAll: "Hapus Semua",
    mergeAndEdit: "⚡ Gabung PDF & Edit",
    cancel: "Batal",
    resetZoom: "🔄 Reset Zoom",
    zoomLabel: "🔍 Zoom",
    applyAndSave: "Terapkan & Simpan Versi",
    dragRearrange: "Seret gambar kagem susun ulang",
    extractedImagesTitle: "Pengekstrak Gambar",
    extractedImagesCount: "Gambar Terekstrak",
    downloadZip: "📦 Unduh semua ZIP",
    back: "Kembali",
    clickOverlayInstruction: "💡 Klik atau ketuk di mana saja pada halaman di bawah untuk menempatkan item Anda!",
    overlayEditor: "Editor Overlay",
    overlayDesc: "Pilih jenis, klik pada halaman pratinjau untuk menempatkannya, lalu seret/ubah ukuran untuk mengonfigurasi.",
    customText: "Teks Kustom",
    size: "Ukuran",
    color: "Warna",
    opacity: "Transparansi",
    uploadStamp: "Unggah Cap",
    uploadImage: "Unggah Gambar",
    noOverlayYet: "Belum ada tautan ditambahkan. Klik \"+ Tambah Baris\" atau klik pada PDF untuk membuatnya.",
    noToolSelected: "Pilih kartu tindakan di atas untuk mulai mengedit dokumen PDF ini.",
    versionHistory: "Riwayat Versi",
    availableActions: "Tindakan Tersedia",
    warningDiscardTitle: "Buang Versi Berikutnya?",
    warningDiscardDesc: "Mengedit versi lama akan memisahkan pohon riwayat versi. Versi berikutnya setelah titik ini akan dibuang.",
    continueEdit: "Lanjutkan & Edit",
    closeFileTitle: "Tutup Berkas?",
    closeFileDesc: "Apakah Anda yakin ingin menutup file ini? Semua perubahan yang belum disimpan akan hilang.",
    closeFileBtn: "Tutup Berkas",
    pageWord: "Halaman"
  },
  ar: {
    specsTitle: "ⓘ مواصفات أداة PDF والأسئلة الشائعة",
    faqTitle: "💡 الأسئلة الشائعة (س وج)",
    closeSheet: "إغلاق ورقة المعلومات",
    limits: "حدود حجم الملف",
    privacy: "حماية الخصوصية",
    session: "سجل الجلسة المؤقت",
    tech: "معلومات المشروع والتقنيات",
    limitsDesc: "- الحد الأقصى لتحميل الملف: 50 ميجابايت (تحذير عند 50+ ميجابايت)\n- الحجم الأقصى للدمج: 100 ميجابايت إجمالاً\n- الحد الأقصى لملفات الدمج: 10 ملفات PDF",
    privacyDesc: "تشغيل 100% على جانب العميل. مستنداتك لا تغادر جهازك المحلي أبدًا. لا يوجد تفاعل مع خوادم خارجية أو قواعد بيانات سحابية.",
    sessionDesc: "سجل العمليات وشجرة النسخ يتم حفظهما في الذاكرة المؤقتة وسيتم مسحهما عند تحديث الصفحة. يرجى تحميل تعديلاتك قبل المغادرة.",
    techDesc: "معالجة على جانب العميل فقط باستخدام React و Vite و Tailwind CSS و PDF-lib.",
    q1: "س1: كيف لا يتم استخدام خادم؟",
    a1: "يعمل التطبيق بالكامل في بيئة المتصفح المحلية الآمنة. يقرأ الملفات محلياً عبر واجهات ملفات HTML5 ويعدلها برمجياً باستخدام جافا سكريبت بدون أي إرسال للبيانات إلى خوادم خارجية.",
    q2: "س2: كيف يعمل مسار العمل في جهاز العميل؟",
    a2_1: "الرفع: يتم قراءة ملف الـ PDF محلياً بواسطة مكتبة PDF.js.",
    a2_2: "التعديل: يتم حفظ التعديلات كملف سجل عمليات JSON خفيف لتوفير الذاكرة.",
    a2_3: "إعادة البناء: عند العرض أو الحفظ، تقوم مكتبة `pdf-lib` بتجميع الملف مجدداً بتطبيق العمليات خطوة بخطوة.",
    a2_4: "التحميل: يتم إنشاء رابط محلي آمن لتحميل الملف مباشرة من ذاكرة الرام الخاصة بك.",
    q3: "س3: ما هي المعالجة على جانب العميل؟",
    a3: "المعالجة على جانب العميل تعني أن جميع المهام الحسابية، والعرض، وتعديل الملفات تتم مباشرة على جهاز المستخدم دون الحاجة لإرسال البيانات إلى خادم سحابي.",
    q4: "س4: ما هي التقنيات المستخدمة؟",
    a4: "تم بناء التطبيق باستخدام React و Vite و Tailwind CSS. ويعتمد على PDF.js للعرض، و PDF-Lib لتعديل البايتات الثنائية للملف، و JSZip لضغط الملفات.",
    q5: "س5: ما هي مكتبة PDF-Lib وهل تستخدم بياناتي؟",
    a5: "مكتبة PDF-Lib هي مكتبة جافا سكريبت نقية لقراءة وتعديل ملفات PDF داخل الذاكرة المحلية. لا تقوم بجمع أو تخزين أي بيانات. التطبيق يعمل بالكامل بدون إنترنت بمجرد تحميله في ذاكرة المتصفح المؤقتة.",
    appTitle: "أدوات PDF دون اتصال بالإنترنت",
    appDesc: "الخصوصية مضمونة. تتم معالجة ملفاتك بالكامل داخل متصفحك ولا يتم إرسالها إلى أي خادم.",
    tool_merge: "🔀 دمج ملفات PDF",
    tool_reorder: "📋 إعادة الترتيب",
    tool_extract_pages: "✂️ استخراج صفحات",
    tool_link: "🔗 منطقة رابط",
    tool_stamp: "🖼️ ختم PNG",
    tool_text: "🔤 إضافة نص",
    tool_image: "🖼️ إضافة صورة",
    tool_extract_images: "🖼️ استخراج صور",
    combineFilesDesc: "دمج 2-10 ملفات",
    rearrangePagesDesc: "إعادة ترتيب الصفحات",
    separateRangeDesc: "فصل نطاق محدد",
    drawHyperlinkDesc: "رسم رابط قابل للنقر",
    placeStampDesc: "وضع ختم شفاف",
    addCustomTextDesc: "كتابة نصوص مخصصة",
    addImageAssetsDesc: "إضافة صور jpg/png",
    extractAssetsDesc: "تحميل أصول ملف PDF",
    dropMerge: "قم بإسقاط 2 إلى 10 ملفات PDF لدمجها",
    dropSingle: "قم بإسقاط ملف الـ PDF الخاص بك هنا",
    orBrowse: "أو انقر لتصفح الملفات المحلية",
    filesToMerge: "الملفات لدمجها",
    clearAll: "مسح الكل",
    mergeAndEdit: "⚡ دمج و تحرير",
    cancel: "إلغاء",
    resetZoom: "🔄 إعادة ضبط",
    zoomLabel: "🔍 تكبير",
    applyAndSave: "تطبيق وحفظ النسخة",
    dragRearrange: "اسحب الصور المصغرة لإعادة الترتيب",
    extractedImagesTitle: "مستخرج الصور",
    extractedImagesCount: "الصور المستخرجة",
    downloadZip: "📦 تحميل الكل في ملف ZIP",
    back: "رجوع",
    clickOverlayInstruction: "💡 انقر أو اضغط في أي مكان على الصفحة لوضع العنصر الخاص بك!",
    overlayEditor: "محرر الطبقات",
    overlayDesc: "اختر النوع، انقر على الصفحة لوضعها، ثم اسحب وتغير الحجم للضبط.",
    customText: "نص مخصص",
    size: "الحجم",
    color: "اللون",
    opacity: "الشفافية",
    uploadStamp: "رفع ختم",
    uploadImage: "رفع صورة",
    noOverlayYet: "لم يتم إضافة روابط بعد. انقر على إضافة صف أو على ملف الـ PDF.",
    noToolSelected: "اختر عملية من الأعلى لبدء تعديل هذا الملف.",
    versionHistory: "سجل النسخ",
    availableActions: "العمليات المتاحة",
    warningDiscardTitle: "تجاهل النسخ التالية؟",
    warningDiscardDesc: "تعديل نسخة قديمة سيؤدي إلى تقسيم شجرة النسخ وتجاهل النسخ اللاحقة لها.",
    continueEdit: "المتابعة والتعديل",
    closeFileTitle: "إغلاق الملف؟",
    closeFileDesc: "هل أنت متأكد من رغبتك في إغلاق هذا الملف؟ ستفقد جميع التغييرات غير المحفوظة.",
    closeFileBtn: "إغلاق الملف",
    pageWord: "صفحة"
  },
  es: {
    specsTitle: "ⓘ Especificaciones de Herramienta PDF y P&R",
    faqTitle: "💡 Preguntas Frecuentes (P&R)",
    closeSheet: "Cerrar Hoja de Información",
    limits: "Límites de Tamaño de Archivo",
    privacy: "Protección de Privacidad",
    session: "Historial de Sesión Temporal",
    tech: "Información del Proyecto y Stack",
    limitsDesc: "- Límite de subida de archivo: 50MB (alerta a partir de 50MB+)\n- Tamaño máximo de fusión: 100MB en total\n- Cantidad máxima de archivos: 10 PDFs",
    privacyDesc: "Ejecución 100% del Lado del Cliente. Tus documentos nunca salen del almacenamiento de tu dispositivo local. No hay interacción con servidores ni almacenamiento en bases de datos.",
    sessionDesc: "El registro de operaciones y el árbol de versiones se guardan en memoria y se borrarán si recargas la página. Descarga tus ediciones antes de salir.",
    techDesc: "Procesamiento exclusivo del lado del cliente utilizando React, Vite, Tailwind CSS y PDF-lib.",
    q1: "Q1: ¿Cómo funciona sin un servidor?",
    a1: "La aplicación se ejecuta completamente dentro del entorno seguro de tu navegador. Lee los archivos localmente a través de las APIs de archivos de HTML5 y los modifica utilizando JavaScript en el cliente, sin transmitir datos a servidores externos.",
    q2: "Q2: ¿Cómo es el flujo de trabajo en el dispositivo del cliente?",
    a2_1: "Subida: El PDF se analiza localmente usando PDF.js.",
    a2_2: "Edición: Las ediciones se registran como ligeras operaciones JSON para optimizar el uso de memoria.",
    a2_3: "Reconstrucción: Al previsualizar o guardar, `pdf-lib` recompila el PDF aplicando las operaciones paso a paso sobre el buffer original.",
    a2_4: "Descarga: Se genera una URL de Blob local que permite descargar el archivo directamente de tu memoria RAM.",
    q3: "Q3: ¿Qué es el procesamiento del lado del cliente?",
    a3: "El procesamiento del lado del cliente significa que todas las tareas computacionales, renderizado y manipulación de archivos ocurren en la máquina del usuario final en lugar de en un servidor central.",
    q4: "Q4: ¿Qué stack tecnológico se utiliza?",
    a4: "La aplicación está construida con React, Vite y Tailwind CSS. Utiliza PDF.js para visualizar el PDF, PDF-Lib para modificar los bytes binarios y JSZip para empaquetar archivos ZIP.",
    q5: "Q5: ¿Qué es PDF-Lib y si mis datos están seguros?",
    a5: "PDF-Lib es una biblioteca de JavaScript pura que manipula estructuras binarias de PDF en memoria. No recopila ni transmite tus datos. La aplicación funciona 100% offline una vez cargada en el caché del navegador.",
    appTitle: "Caja de Herramientas PDF Offline",
    appDesc: "Privacidad garantizada. Sus archivos se procesan en la caché del navegador y nunca se suben a ningún servidor.",
    tool_merge: "🔀 Fusionar PDFs",
    tool_reorder: "📋 Reordenar",
    tool_extract_pages: "✂️ Extraer Páginas",
    tool_link: "🔗 Área de enlace",
    tool_stamp: "🖼️ Sello PNG",
    tool_text: "🔤 Añadir Texto",
    tool_image: "🖼️ Añadir Imagen",
    tool_extract_images: "🖼️ Extraer Img",
    combineFilesDesc: "Combinar 2-10 archivos",
    rearrangePagesDesc: "Reorganizar páginas",
    separateRangeDesc: "Separar rango de páginas",
    drawHyperlinkDesc: "Dibujar enlace clicable",
    placeStampDesc: "Colocar sello transparente",
    addCustomTextDesc: "Escribir textos personalizados",
    addImageAssetsDesc: "Colocar imágenes jpg/png",
    extractAssetsDesc: "Extraer activos del PDF",
    dropMerge: "Suelte 2-10 archivos PDF para fusionar",
    dropSingle: "Suelte su archivo PDF aquí",
    orBrowse: "o haga clic para buscar archivos locales",
    filesToMerge: "Archivos a fusionar",
    clearAll: "Borrar Todo",
    mergeAndEdit: "⚡ Fusionar y Editar",
    cancel: "Cancelar",
    resetZoom: "🔄 Restablecer Zoom",
    zoomLabel: "🔍 Zoom",
    applyAndSave: "Aplicar y Guardar Versión",
    dragRearrange: "Arrastre miniaturas para reorganizar",
    extractedImagesTitle: "Extractor de Imágenes",
    extractedImagesCount: "Imágenes Extraídas",
    downloadZip: "📦 Descargar todo en ZIP",
    back: "Volver",
    clickOverlayInstruction: "💡 ¡Haga clic en cualquier lugar de la página para colocar su elemento!",
    overlayEditor: "Editor de Capas",
    overlayDesc: "Seleccione un tipo, haga clic en la página para colocarlo, luego arrastre/cambie el tamaño.",
    customText: "Texto Personalizado",
    size: "Tamaño",
    color: "Color",
    opacity: "Opacidad",
    uploadStamp: "Subir Sello",
    uploadImage: "Subir Imagen",
    noOverlayYet: "No se han añadido enlaces. Haga clic en añadir fila o sobre el PDF.",
    noToolSelected: "Seleccione una acción arriba para comenzar a editar.",
    versionHistory: "Historial de Versiones",
    availableActions: "Acciones Disponibles",
    warningDiscardTitle: "¿Descartar Versiones Siguientes?",
    warningDiscardDesc: "Editar una versión anterior dividirá el historial. Se descartarán las versiones futuras.",
    continueEdit: "Continuar y Editar",
    closeFileTitle: "¿Cerrar Archivo?",
    closeFileDesc: "¿Está seguro de que desea cerrar este archivo? Todos los cambios no guardados se perderán.",
    closeFileBtn: "Cerrar Archivo",
    pageWord: "Página"
  },
  jv: {
    specsTitle: "ⓘ Spesifikasi Piranti PDF & Pitakon",
    faqTitle: "💡 Pitakon sing Sering Ditakokake (Q&A)",
    closeSheet: "Tutup Info",
    limits: "Watesan Ukuran Berkas",
    privacy: "Perlindungan Privasi",
    session: "Riwayat Sesi Sawetara",
    tech: "Info Proyek & Teknologi",
    limitsDesc: "- Watesan unggah berkas maks: 50MB (wonten pepenget yen 50MB+)\n- Ukuran nggabungake maks: total 100MB antar berkas\n- Gunggunge nggabungake maks: 10 berkas PDF",
    privacyDesc: "Eksekusi 100% wonten ing Klien. Dokumen panjenengan boten nate medal saking piranti lokal. Boten wonten interaksi server utawi database.",
    sessionDesc: "Log operasi kaliyan wit versi dipunsimpen wonten memori lan badhe ical menawi kaca browser dipun-refresh. Unduh asil edit sadurunge kesah.",
    techDesc: "Pemrosesan wonten ing sisi klien kemawon nggunakake React, Vite, Tailwind CSS, lan PDF-lib.",
    q1: "Q1: Kados pundi program punika boten nggunakake server?",
    a1: "Aplikasi mlaku sakabehe wonten ing sandbox browser lokal panjenengan. Membaca berkas sacara lokal nggunakake HTML5 File API lan dipunproses nganggo JavaScript sisi klien.",
    q2: "Q2: Kados pundi alur kerjanipun wonten piranti klien?",
    a2_1: "Unggah: PDF dipun-urai sacara lokal nganggo PDF.js.",
    a2_2: "Pengeditan: Edit dipun-lacak minangka log operasi JSON ingkang entheng supados ngirit memori.",
    a2_3: "Rekonstruksi: Nalika pratinjau utawi nyimpen, `pdf-lib` ngrakit malih PDF kanthi ngecakake operasi siji-siji.",
    a2_4: "Unduh: URL Blob lokal dipundamel supados saged ngunduh langsung saking RAM.",
    q3: "Q3: Napa ingkang dipunwastani pemrosesan sisi klien?",
    a3: "Pemrosesan sisi klien tegesipun sedaya tugas komputasi, rendering, lan manipulasi berkas kedadosan langsung wonten ing komputer pangguna piyambak.",
    q4: "Q4: Napa kemawon teknologi ingkang dipunginakaken?",
    a4: "Aplikasi punika dipundamel nganggo React, Vite, lan Tailwind CSS. Uga nggunakake PDF.js, PDF-Lib, lan JSZip.",
    q5: "Q5: Napa PDF-Lib punika, lan punapa ngginakaken data kula?",
    a5: "PDF-Lib punika pustaka JavaScript murni ingkang maos lan ngrakit PDF wonten ing memori browser. Boten mendhet utawi nyimpen data panjenengan. Aplikasi saged mlaku offline sakwese dipun-dimuat.",
    appTitle: "Kotak Piranti PDF Offline",
    appDesc: "Privasi terjamin. Berkas panjenengan dipunproses wonten ing memori browser lan boten nate dipungunggah dhateng server.",
    tool_merge: "🔀 Gabung PDF",
    tool_reorder: "📋 Susun Ulang",
    tool_extract_pages: "✂️ Ekstrak Kaca",
    tool_link: "🔗 Area Tautan",
    tool_stamp: "🖼️ Cap PNG",
    tool_text: "🔤 Tambah Teks",
    tool_image: "🖼️ Tambah Gambar",
    tool_extract_images: "🖼️ Ekstrak Gambar",
    combineFilesDesc: "Nggabungake 2-10 berkas",
    rearrangePagesDesc: "Nata malih kaca",
    separateRangeDesc: "Misahake rentang kaca",
    drawHyperlinkDesc: "Nggambar tautan",
    placeStampDesc: "Nyelehake cap transparan",
    addCustomTextDesc: "Nulis teks khusus",
    addImageAssetsDesc: "Nyelehake gambar jpg/png",
    extractAssetsDesc: "Unduh gambar saking PDF",
    dropMerge: "Selehake 2-10 berkas PDF kagem nggabung",
    dropSingle: "Selehake berkas PDF panjenengan wonten mriki",
    orBrowse: "utawi klik kagem pados berkas lokal",
    filesToMerge: "Berkas sing Digabung",
    clearAll: "Ical Sedanten",
    mergeAndEdit: "⚡ Gabung & Edit",
    cancel: "Batal",
    resetZoom: "🔄 Reset Zoom",
    zoomLabel: "🔍 Zoom",
    applyAndSave: "Cakake & Simpen Versi",
    dragRearrange: "Seret gambar kagem nata malih",
    extractedImagesTitle: "Pengekstrak Gambar",
    extractedImagesCount: "Gambar sing Di-ekstrak",
    downloadZip: "📦 Unduh sedanten ZIP",
    back: "Wangsul",
    clickOverlayInstruction: "💡 Klik utawi tutul wonten pundi kemawon ing kaca ngisor kagem nyelehake barang!",
    overlayEditor: "Editor Overlay",
    overlayDesc: "Pilih jenis, klik kaca pratinjau kagem nyelehake, banjur seret/atur ukuran.",
    customText: "Teks Khusus",
    size: "Ukuran",
    color: "Warna",
    opacity: "Transparansi",
    uploadStamp: "Unggah Cap",
    uploadImage: "Unggah Gambar",
    noOverlayYet: "Dereng wonten tautan. Klik \"+ Tambah Baris\" utawi klik wonten PDF.",
    noToolSelected: "Pilih tindakan wonten ing nginggil kagem ngedit PDF punika.",
    versionHistory: "Riwayat Versi",
    availableActions: "Tindakan sing Wonten",
    warningDiscardTitle: "Bucal Versi Salajengipun?",
    warningDiscardDesc: "Ngedit versi lami badhe misahake riwayat versi. Versi salajengipun badhe dipunbucal.",
    continueEdit: "Lajengaken & Edit",
    closeFileTitle: "Tutup Berkas?",
    closeFileDesc: "Punapa panjenengan yakin badhe nutup berkas punika? Sedaya owah-owahan badhe ical.",
    closeFileBtn: "Tutup Berkas",
    pageWord: "Kaca"
  },
  ja: {
    specsTitle: "ⓘ PDFツールの仕様とQ&A",
    faqTitle: "💡 よくある質問 (Q&A)",
    closeSheet: "情報シートを閉じる",
    limits: "ファイルサイズの制限",
    privacy: "プライバシー保護",
    session: "一時的なセッション履歴",
    tech: "プロジェクト情報と技術スタック",
    limitsDesc: "- 最大ファイルアップロード制限：50MB（50MB超で警告表示）\n- 最大結合サイズ：ファイル全体で合計100MB\n- 最大結合ファイル数：10個のPDFファイル",
    privacyDesc: "100%クライアント側で実行されます。ドキュメントがローカルデバイスのストレージから送信されることはありません。サーバーとの通信やデータベースへの保存はありません。",
    sessionDesc: "操作ログとバージョンツリーはメモリに保存され、ブラウザのページを更新すると消去されます。ページを離れる前に編集内容をダウンロードしてください。",
    techDesc: "React、Vite、Tailwind CSS、およびPDF-libを使用したクライアント側のみの処理。",
    q1: "Q1：サーバーを使用しない仕組みは？",
    a1: "アプリケーションはブラウザのローカルサンドボックス内だけで動作します。HTML5のFile API（`ArrayBuffer`）を介してファイルをローカルに読み込み、クライアント側のJavaScriptを使用して処理および保存します。ドキュメントを送信するバックエンドのHTTP通信やデータベースAPIは一切ありません。",
    q2: "Q2：クライアントデバイス内でのワークフローはどのようになりますか？",
    a2_1: "アップロード：PDFはPDF.jsを使用してローカルで解析されます。",
    a2_2: "編集：編集内容（並べ替え、ページ抽出、オーバーレイなど）は、大容量のPDFファイルを直接保存するのではなく、軽量なJSON操作ログとして追跡され、メモリ使用量が最適化されます。",
    a2_3: "再構築：プレビューまたは保存時に、`pdf-lib`がオリジナルのファイルアレイバッファに対して操作キューをステップバイステップで適用し、PDFを再コンパイルします。",
    a2_4: "ダウンロード：ローカルBlob URLが生成され、ブラウザはRAMから直接ファイルをダウンロードできます。",
    q3: "Q3：クライアント側処理とは何ですか？",
    a3: "クライアント側処理とは、データを処理のためにリモートクラウドサーバーに送信するのではなく、すべての計算タスク、レンダリング、ファイル操作をユーザーのローカルマシン（クライアント）のブラウザ実行エンジン内で直接行うことを意味します。",
    q4: "Q4：必要な技術スタックは何ですか？",
    a4: "React、Vite、Tailwind CSSを使用して構築されています。MozillaのPDF.jsを利用してPDFページをHTML5キャンバス要素に読み込んで描画し、PDF-Libを使用してオフラインでPDFバイナリバイトを作成/変更し、JSZipを使用してブラウザ内でファイルをZIPにバンドルします。",
    q5: "Q5：PDF-Libの役割は何ですか？また、私のデータは使用されますか？",
    a5: "PDF-Libは、ブラウザのメモリ内でPDFバイナリ構造を直接読み取り、変更し、コンパイルする純粋なJavaScriptライブラリです。お客様のデータを収集、保存、または送信することはありません。読み込み後はインターネットから独立して動作するため、すべてのコードライブラリはブラウザキャッシュに直接提供され、完全にオフラインで動作可能です。",
    appTitle: "オフラインPDFツールボックス",
    appDesc: "プライバシーは完全に保護されています。ファイルはブラウザのキャッシュ内でのみ処理され、サーバーにアップロードされることはありません。",
    tool_merge: "🔀 PDF結合",
    tool_reorder: "📋 ページ並べ替え",
    tool_extract_pages: "✂️ ページ抽出",
    tool_link: "🔗 リンク範囲",
    tool_stamp: "🖼️ PNGスタンプ",
    tool_text: "🔤 テキスト追加",
    tool_image: "🖼️ 画像追加",
    tool_extract_images: "🖼️ 画像抽出",
    combineFilesDesc: "2〜10個のファイルを結合",
    rearrangePagesDesc: "ページの順序を並べ替え",
    separateRangeDesc: "指定範囲のページを分離",
    drawHyperlinkDesc: "クリック可能なリンク枠を描画",
    placeStampDesc: "透過スタンプを配置",
    addCustomTextDesc: "カスタムテキストを入力",
    addImageAssetsDesc: "JPG/PNG画像を配置",
    extractAssetsDesc: "PDF内の画像を保存",
    dropMerge: "結合する2〜10個のPDFファイルをドロップ",
    dropSingle: "ここにPDFファイルをドロップ",
    orBrowse: "またはローカルファイルを参照",
    filesToMerge: "結合するファイル",
    clearAll: "すべてクリア",
    mergeAndEdit: "⚡ 結合して編集",
    cancel: "キャンセル",
    resetZoom: "🔄 ズームをリセット",
    zoomLabel: "🔍 ズーム",
    applyAndSave: "適用してバージョンを保存",
    dragRearrange: "サムネイルをドラッグして並べ替え",
    extractedImagesTitle: "画像抽出ツール",
    extractedImagesCount: "抽出された画像",
    downloadZip: "📦 まとめてZIPダウンロード",
    back: "戻る",
    clickOverlayInstruction: "💡 下のページ内をクリック/タップしてアイテムを配置します！",
    overlayEditor: "オーバーレイエディター",
    overlayDesc: "タイプを選択し、プレビューページ上をクリックして配置後、ドラッグ/サイズ調整を行います。",
    customText: "カスタムテキスト",
    size: "サイズ",
    color: "カラー",
    opacity: "不透明度",
    uploadStamp: "スタンプをアップロード",
    uploadImage: "画像をアップロード",
    noOverlayYet: "追加されたリンクはありません。「+ 行を追加」をクリックするか、PDFをクリックして作成してください。",
    noToolSelected: "上のアクションカードを選択して、PDFの編集を開始してください。",
    versionHistory: "バージョン履歴",
    availableActions: "利用可能なアクション",
    warningDiscardTitle: "以降のバージョンを破棄しますか？",
    warningDiscardDesc: "古いバージョンを編集すると、履歴が分岐し、この時点より先のバージョンが破棄されます。",
    continueEdit: "続行して編集",
    closeFileTitle: "ファイルを閉じますか？",
    closeFileDesc: "このファイルを閉じてもよろしいですか？保存されていない変更はすべて失われます。",
    closeFileBtn: "ファイルを閉じる",
    pageWord: "ページ"
  },
  zh: {
    specsTitle: "ⓘ PDF 工具规范及常见问题",
    faqTitle: "💡 常见问题解答 (Q&A)",
    closeSheet: "关闭信息表",
    limits: "文件大小限制",
    privacy: "隐私保护",
    session: "临时会话历史",
    tech: "项目信息与技术栈",
    limitsDesc: "- 最大文件上传限制：50MB（超过50MB会显示警告）\n- 最大合并大小：所有文件总计100MB\n- 最大合并文件数：10个PDF文件",
    privacyDesc: "100% 客户端执行。您的文档绝不会离开您的本地设备存储。没有任何服务器交互或数据库存储。",
    sessionDesc: "操作日志和版本树保存在内存中，刷新浏览器页面将被清除。请在离开前下载您的编辑。",
    techDesc: "仅使用 React、Vite、Tailwind CSS 和 PDF-lib 进行客户端处理。",
    q1: "Q1：如何实现不使用服务器？",
    a1: "该应用完全在您本地的浏览器沙箱中运行。它通过 HTML5 文件 API（`ArrayBuffer`）在本地读取文件，并使用客户端 JavaScript 进行处理和保存。不存在任何向后端发送文档的 HTTP 请求或数据库 API。",
    q2: "Q2：客户端设备上的工作流程是怎样的？",
    a2_1: "上传：PDF 在本地使用 PDF.js 解析。",
    a2_2: "编辑：编辑操作（如重新排序、页面提取、覆盖层等）作为轻量级的 JSON操作日志进行跟踪，而不是保存巨大的 PDF 文件，从而优化了内存使用。",
    a2_3: "重建：在预览或保存时，`pdf-lib` 通过将操作队列逐步应用到原始文件数组缓冲区来重新编译 PDF。",
    a2_4: "下载：生成本地 Blob URL，允许浏览器直接从您的内存下载文件。",
    q3: "Q3：什么是客户端处理？",
    a3: "客户端处理意味着所有计算任务、渲染和文件操作都直接在用户的本地机器（客户端）的浏览器执行引擎中进行，而不是将数据发送到远程云服务器进行处理。",
    q4: "Q4：需要什么技术栈？",
    a4: "该应用使用 React、Vite 和 Tailwind CSS 构建。它利用 Mozilla 的 PDF.js 将 PDF 页面读取并渲染到 HTML5 画布元素上，使用 PDF-Lib 离线创建/修改 PDF 二进制字节，并使用 JSZip 在浏览器内将文件打包为 ZIP。",
    q5: "Q5：PDF-Lib 的作用是什么？它会使用我的数据吗？",
    a5: "PDF-Lib 是一个纯 JavaScript 库，在浏览器的内存中直接读取、修改和编译 PDF 二进制结构。它不会收集、存储或传输您的数据。在加载后，所有代码库都直接服务于浏览器缓存，独立于互联网运行，完全支持离线操作。",
    appTitle: "离线 PDF 工具箱",
    appDesc: "隐私保障。您的文件完全在浏览器缓存中处理，绝不上传到任何服务器。",
    tool_merge: "🔀 合并 PDF",
    tool_reorder: "📋 重新排序",
    tool_extract_pages: "✂️ 提取页面",
    tool_link: "🔗 链接区域",
    tool_stamp: "🖼️ PNG 印章",
    tool_text: "🔤 添加文本",
    tool_image: "🖼️ 添加图片",
    tool_extract_images: "🖼️ 提取图片",
    combineFilesDesc: "合并 2-10 个文件",
    rearrangePagesDesc: "重新排列页面顺序",
    separateRangeDesc: "分离指定范围页面",
    drawHyperlinkDesc: "绘制可点击的链接框",
    placeStampDesc: "放置透明印章",
    addCustomTextDesc: "输入自定义文本",
    addImageAssetsDesc: "放置 JPG/PNG 图片",
    extractAssetsDesc: "保存 PDF 中的图片",
    dropMerge: "拖入 2–10 个 PDF 文件进行合并",
    dropSingle: "将 PDF 文件拖到此处",
    orBrowse: "或点击浏览本地文件",
    filesToMerge: "待合并文件",
    clearAll: "清除全部",
    mergeAndEdit: "⚡ 合并并编辑",
    cancel: "取消",
    resetZoom: "🔄 重置缩放",
    zoomLabel: "🔍 缩放",
    applyAndSave: "应用并保存版本",
    dragRearrange: "拖拽缩略图以重新排序",
    extractedImagesTitle: "图片提取工具",
    extractedImagesCount: "已提取图片",
    downloadZip: "📦 下载全部 ZIP",
    back: "返回",
    clickOverlayInstruction: "💡 在下方页面任意位置点击或轻触即可放置您的项目！",
    overlayEditor: "覆盖层编辑器",
    overlayDesc: "选择一个类型，点击预览页面进行放置，然后拖拽/调整大小来进行配置。",
    customText: "自定义文本",
    size: "大小",
    color: "颜色",
    opacity: "不透明度",
    uploadStamp: "上传印章",
    uploadImage: "上传图片",
    noOverlayYet: "尚未添加链接覆盖层。点击“+ 添加行”或在 PDF 上点击以创建。",
    noToolSelected: "在上方选择一个操作卡片以开始编辑此 PDF文档。",
    versionHistory: "版本历史",
    availableActions: "可用操作",
    warningDiscardTitle: "放弃后续版本？",
    warningDiscardDesc: "编辑较旧的版本将拆分版本历史树。此时间点之后的未来版本将被放弃。",
    continueEdit: "继续并编辑",
    closeFileTitle: "关闭文件？",
    closeFileDesc: "您确定要关闭此文件吗？所有未保存的更改都将丢失。",
    closeFileBtn: "关闭文件",
    pageWord: "页"
  },
  ru: {
    specsTitle: "ⓘ Спецификации инструмента PDF и вопросы-ответы",
    faqTitle: "💡 Часто задаваемые вопросы (Q&A)",
    closeSheet: "Закрыть информационный лист",
    limits: "Ограничения размера файла",
    privacy: "Защита конфиденциальности",
    session: "Временная история сессии",
    tech: "Информация о проекте и стек технологий",
    limitsDesc: "- Максимальный размер загрузки: 50 МБ (предупреждение при 50 МБ+)\n- Максимальный размер объединения: всего 100 МБ\n- Максимальное количество объединяемых файлов: 10 файлов PDF",
    privacyDesc: "Исполнение на 100% на стороне клиента. Ваши документы никогда не покидают ваше локальное хранилище. Взаимодействие с сервером или хранение в базе данных отсутствует.",
    sessionDesc: "Журнал операций и дерево версий сохраняются в оперативной памяти и будут очищены при обновлении страницы. Скачайте ваши файлы перед выходом.",
    techDesc: "Обработка исключительно на стороне клиента с использованием React, Vite, Tailwind CSS и PDF-lib.",
    q1: "Q1: Как это работает без сервера?",
    a1: "Приложение работает полностью в песочнице вашего локального браузера. Оно читает файлы локально через HTML5 File API (`ArrayBuffer`) и обрабатывает/сохраняет их с помощью JavaScript на стороне клиента. Передача документов на внешние серверы отсутствует.",
    q2: "Q2: Как устроен рабочий процесс на устройстве клиента?",
    a2_1: "Загрузка: PDF парсится локально с помощью PDF.js.",
    a2_2: "Редактирование: Изменения отслеживаются как легковесный журнал операций JSON для оптимизации памяти.",
    a2_3: "Реконструкция: При предпросмотре или скачивании `pdf-lib` пересобирает PDF, применяя операции пошагово.",
    a2_4: "Скачивание: Создается локальная ссылка Blob для скачивания файла прямо из оперативной памяти.",
    q3: "Q3: Что такое обработка на стороне клиента?",
    a3: "Это означает, что все вычисления, отрисовка и манипуляции с файлами происходят непосредственно на компьютере пользователя в браузере, без отправки данных на удаленный облачный сервер.",
    q4: "Q4: Какой стек технологий используется?",
    a4: "Приложение построено на React, Vite и Tailwind CSS. Используются PDF.js для отрисовки страниц, PDF-Lib для модификации бинарной структуры PDF и JSZip для архивации.",
    q5: "Q5: Что такое PDF-Lib и в безопасности ли мои данные?",
    a5: "PDF-Lib — это чистая библиотека JavaScript для модификации файлов PDF в оперативной памяти. Она не собирает и не передает ваши данные. Приложение работает автономно после загрузки в кэш.",
    appTitle: "Локальный PDF Инструментарий",
    appDesc: "Конфиденциальность гарантирована. Ваши файлы обрабатываются исключительно в браузере и не передаются на сервер.",
    tool_merge: "🔀 Объединить PDF",
    tool_reorder: "📋 Переставить страницы",
    tool_extract_pages: "✂️ Извлечь страницы",
    tool_link: "🔗 Область ссылки",
    tool_stamp: "🖼️ Штамп PNG",
    tool_text: "🔤 Добавить текст",
    tool_image: "🖼️ Добавить изображение",
    tool_extract_images: "🖼️ Извлечь картинки",
    combineFilesDesc: "Объединить 2-10 файлов",
    rearrangePagesDesc: "Изменить порядок страниц",
    separateRangeDesc: "Выделить диапазон страниц",
    drawHyperlinkDesc: "Создать кликабельную ссылку",
    placeStampDesc: "Поместить прозрачный штамп",
    addCustomTextDesc: "Ввести произвольный текст",
    addImageAssetsDesc: "Вставить картинку JPG/PNG",
    extractAssetsDesc: "Скачать картинки из PDF",
    dropMerge: "Перетащите 2-10 файлов PDF для объединения",
    dropSingle: "Перетащите ваш PDF файл сюда",
    orBrowse: "или выберите файлы на компьютере",
    filesToMerge: "Файлы для объединения",
    clearAll: "Очистить всё",
    mergeAndEdit: "⚡ Объединить и редактировать",
    cancel: "Отмена",
    resetZoom: "🔄 Сбросить масштаб",
    zoomLabel: "🔍 Масштаб",
    applyAndSave: "Применить и сохранить версию",
    dragRearrange: "Перетащите миниатюры для сортировки",
    extractedImagesTitle: "Извлечение картинок",
    extractedImagesCount: "Извлеченные картинки",
    downloadZip: "📦 Скачать все в ZIP",
    back: "Назад",
    clickOverlayInstruction: "💡 Нажмите в любом месте страницы ниже, чтобы разместить элемент!",
    overlayEditor: "Редактор слоев",
    overlayDesc: "Выберите тип, нажмите на страницу для размещения, затем настройте размер.",
    customText: "Ваш текст",
    size: "Размер",
    color: "Цвет",
    opacity: "Прозрачность",
    uploadStamp: "Загрузить штамп",
    uploadImage: "Загрузить картинку",
    noOverlayYet: "Ссылки еще не добавлены. Нажмите «+ Добавить строку» или кликните по PDF.",
    noToolSelected: "Выберите действие выше, чтобы начать редактирование PDF.",
    versionHistory: "История версий",
    availableActions: "Доступные действия",
    warningDiscardTitle: "Сбросить последующие версии?",
    warningDiscardDesc: "Редактирование старой версии разделит историю. Последующие версии будут удалены.",
    continueEdit: "Продолжить",
    closeFileTitle: "Закрыть файл?",
    closeFileDesc: "Вы уверены, что хотите закрыть файл? Несохраненные изменения будут потеряны.",
    closeFileBtn: "Закрыть файл",
    pageWord: "Страница"
  },
  ga: {
    specsTitle: "ⓘ Sonraíochtaí Uirlis PDF & Ceisteanna",
    faqTitle: "💡 Ceisteanna Coitianta (Q&A)",
    closeSheet: "Dún Bileog Eolais",
    limits: "Teorainneacha Méid Comhaid",
    privacy: "Cosaint Príobháideachais",
    session: "Stair Sheisiún Sealadach",
    tech: "Eolas faoin Tionscadal & Teicneolaíocht",
    limitsDesc: "- Teorainn uaslódála: 50MB (rabhadh ag 50MB+)\n- Cumasc uasta: 100MB san iomlán\n- Uasmhéid comhaid: 10 comhad PDF",
    privacyDesc: "Rith 100% ar thaobh an chliaint. Ní fhágann do dhoiciméid do ghléas riamh. Gan aon idirghníomhú le freastalaí.",
    sessionDesc: "Sábhálfar stair na n-oibríochtaí i gcuimhne RAM sealadach. Glanfar é ar athnuachan an leathanaigh.",
    techDesc: "Próiseáil ar thaobh an chliaint amháin ag baint úsáide as React, Vite, Tailwind CSS, agus PDF-lib.",
    q1: "Q1: Conas nach n-úsáideann sé freastalaí?",
    a1: "Ritheann an feidhmchlár go hiomlán i mbosca gainimh do bhrabhsálaí áitiúil. Léann sé comhaid go háitiúil trí HTML5 File APIs agus próiseálann sé iad ag baint úsáide as JavaScript. Níl aon ghlaonna HTTP backend ann.",
    q2: "Q2: Conas a oibríonn an sreabhadh oibre ar ghléas an chliaint?",
    a2_1: "Uaslódáil: Déantar an PDF a pharsáil go háitiúil ag baint úsáide as PDF.js.",
    a2_2: "Eagarthóireacht: Déantar rianú ar eagarthóireacht mar logaí JSON éadroma chun cuimhne a bharrfheabhsú.",
    a2_3: "Athchruthú: Nuair a dhéantar réamhamharc nó sábháil, athchomitiú `pdf-lib` an PDF go céim ar chéim.",
    a2_4: "Íoslódáil: Gintear URL Blob áitiúil chun an comhad a íoslódáil go díreach ó RAM.",
    q3: "Q3: Cad é próiseáil ar thaobh an chliaint?",
    a3: "Ciallaíonn sé go dtarlaíonn gach tasc ríomhaireachta agus ionramháil comhad go díreach ar ghléas áitiúil an úsáideora.",
    q4: "Q4: Cad é an cruach teicneolaíochta?",
    a4: "Tógtha le React, Vite, agus Tailwind CSS. Úsáideann sé PDF.js le haghaidh rindreála, PDF-Lib le haghaidh modhnú binary, agus JSZip le haghaidh ZIP.",
    q5: "Q5: Cad chuige PDF-Lib, agus an bhfuil mo chuid sonraí sábháilte?",
    a5: "Is leabharlann JavaScript í PDF-Lib a oibríonn i gcuimhne an bhrabhsálaí. Ní bhailíonn sí aon sonraí. Ritheann an clár go hiomlán as líne tar éis é a lódáil.",
    appTitle: "Bosca Uirlisí PDF As Líne",
    appDesc: "Príobháideachas ráthaithe. Déantar do chomhaid a phróiseáil go hiomlán i dtaisce an bhrabhsálaí.",
    tool_merge: "🔀 Cumaisc PDFanna",
    tool_reorder: "📋 Athordaigh",
    tool_extract_pages: "✂️ Sliocht Leathanaigh",
    tool_link: "🔗 Limistéar Nasc",
    tool_stamp: "🖼️ Stampa PNG",
    tool_text: "🔤 Cuir Téacs leis",
    tool_image: "🖼️ Cuir Íomhá leis",
    tool_extract_images: "🖼️ Sliocht Íomhánna",
    combineFilesDesc: "Comhcheangail 2-10 comhad",
    rearrangePagesDesc: "Athordaigh leathanaigh",
    separateRangeDesc: "Deighil raon leathanaigh",
    drawHyperlinkDesc: "Tarraing nasc inchliceáilte",
    placeStampDesc: "Cuir stampa trédhearcach",
    addCustomTextDesc: "Scríobh téacs saincheaptha",
    addImageAssetsDesc: "Cuir íomhánna JPG/PNG leis",
    extractAssetsDesc: "Íoslódáil íomhánna as PDF",
    dropMerge: "Scaoil 2–10 comhad PDF anseo le cumasc",
    dropSingle: "Scaoil do chomhad PDF anseo",
    orBrowse: "nó cliceáil chun brabhsáil go háitiúil",
    filesToMerge: "Comhaid le Cumasc",
    clearAll: "Glan Gach Rud",
    mergeAndEdit: "⚡ Cumaisc & Cuir in Eagar",
    cancel: "Cealaigh",
    resetZoom: "🔄 Athshocraigh Zúmáil",
    zoomLabel: "🔍 Zúmáil",
    applyAndSave: "Cuir i bhfeidhm & Sábháil Leagan",
    dragRearrange: "Tarraing mionshamhlacha le hathordú",
    extractedImagesTitle: "Sliocht Íomhánna",
    extractedImagesCount: "Íomhánna Sliochtaithe",
    downloadZip: "📦 Íoslódáil ZIP go léir",
    back: "Ar ais",
    clickOverlayInstruction: "💡 Cliceáil áit ar bith ar leathanach thíos chun do mhír a chur!",
    overlayEditor: "Eagarthóir Sraitheanna",
    overlayDesc: "Roghnaigh cineál, cliceáil ar leathanach le cur síos, ansin tarraing/athraigh méid.",
    customText: "Téacs Téama",
    size: "Méid",
    color: "Dath",
    opacity: "Teimhneacht",
    uploadStamp: "Uaslódáil Stampa",
    uploadImage: "Uaslódáil Íomhá",
    noOverlayYet: "Níor cuireadh aon nasc leis fós. Cliceáil ar \"+ Cuir Ríomh\" nó ar an PDF.",
    noToolSelected: "Roghnaigh uirlis thuas chun tosú ar an PDF a chur in eagar.",
    versionHistory: "Stair Leaganacha",
    availableActions: "Gníomhartha Reatha",
    warningDiscardTitle: "Discard Forward Versions?",
    warningDiscardDesc: "Déanfaidh eagarthóireacht ar leagan níos sine an stair a scoilt. Caillfear leaganacha amach anseo.",
    continueEdit: "Lean ar aghaidh & Cuir in Eagar",
    closeFileTitle: "Dún Comhad?",
    closeFileDesc: "An bhfuil tú cinnte go dteastaíonn uait an comhad seo a dhúnadh? Caillfear athruithe.",
    closeFileBtn: "Dún Comhad",
    pageWord: "Leathanach"
  },
  hi: {
    specsTitle: "ⓘ पीडीएफ उपकरण विनिर्देश और प्रश्न-उत्तर",
    faqTitle: "💡 अक्सर पूछे जाने वाले प्रश्न (Q&A)",
    closeSheet: "जानकारी पत्रक बंद करें",
    limits: "फ़ाइल आकार सीमाएँ",
    privacy: "गोपनीयता सुरक्षा",
    session: "अस्थायी सत्र इतिहास",
    tech: "परियोजना विवरण और तकनीक",
    limitsDesc: "- अधिकतम फ़ाइल अपलोड सीमा: 50MB (50MB+ पर चेतावनी)\n- अधिकतम विलय आकार: कुल मिलाकर 100MB\n- अधिकतम विलय फ़ाइल संख्या: 10 पीडीएफ फ़ाइलें",
    privacyDesc: "100% क्लाइंट-साइड निष्पादन। आपके दस्तावेज़ आपके स्थानीय डिवाइस स्टोरेज से कभी बाहर नहीं जाते हैं। कोई सर्वर संचार या डेटाबेस प्रविष्टि नहीं होती है।",
    sessionDesc: "संचालन लॉग और संस्करण ट्री मेमोरी में सहेजे जाते हैं और ब्राउज़र रिफ्रेश करने पर नष्ट हो जाते हैं। बाहर निकलने से पहले अपने संपादन डाउनलोड करें।",
    techDesc: "रिएक्ट, विट, टेलविंड सीएसएस और पीडीएफ-लिब का उपयोग करके केवल क्लाइंट-साइड प्रोसेसिंग।",
    q1: "Q1: बिना सर्वर के यह कैसे काम करता है?",
    a1: "एप्लिकेशन पूरी तरह से आपके ब्राउज़र के स्थानीय सैंडबॉक्स में चलता है। यह HTML5 फ़ाइल API (`ArrayBuffer`) के माध्यम से फ़ाइलों को स्थानीय रूप से पढ़ता है और क्लाइंट-साइड जावास्क्रिप्ट का उपयोग करके संसाधित और सुरक्षित करता है। कोई HTTP बैकएंड अनुरोध नहीं है।",
    q2: "Q2: क्लाइंट डिवाइस पर कार्यप्रवाह कैसा है?",
    a2_1: "अपलोड: पीडीएफ को पीडीएफ.जेएस का उपयोग करके स्थानीय स्तर पर पार्स किया जाता है।",
    a2_2: "संपादन: भारी पीडीएफ फाइलों को रखने के बजाय मेमोरी उपयोग को अनुकूलित करने के लिए संपादन को हल्के जेएसओएन ऑपरेशन लॉग के रूप में ट्रैक किया जाता है।",
    a2_3: "पुनर्निर्माण: पूर्वावलोकन या डाउनलोड के समय, `pdf-lib` मूल फाइल बफर पर संचालन कतार लागू करके पीडीएफ को फिर से संकलित करता है।",
    a2_4: "डाउनलोड: स्थानीय ब्लॉब यूआरएल उत्पन्न होता है जो सीधे रैम से डाउनलोड करने की अनुमति देता है।",
    q3: "Q3: क्लाइंट-साइड प्रोसेसिंग क्या है?",
    a3: "क्लाइंट-साइड प्रोसेसिंग का अर्थ है कि सभी गणना कार्य, रेंडरिंग और फ़ाइल संचालन सीधे उपयोगकर्ता के स्थानीय मशीन पर किए जाते हैं, न कि किसी दूरस्थ क्लाउड सर्वर पर।",
    q4: "Q4: इसमें कौन सी तकनीकें प्रयुक्त हैं?",
    a4: "यह रिएक्ट, विट और टेलविंड सीएसएस के साथ बनाया गया है। रेंडरिंग के लिए PDF.js, बाइनरी संपादन के लिए PDF-Lib और ब्राउज़र में ज़िप बनाने के लिए JSZip का उपयोग होता है।",
    q5: "Q5: PDF-Lib क्या है और क्या यह मेरे डेटा का उपयोग करता है?",
    a5: "PDF-Lib एक शुद्ध जावास्क्रिप्ट लाइब्रेरी है जो ब्राउज़र मेमोरी में पीडीएफ़ संरचना को पढ़ती और बदलती है। यह आपका डेटा एकत्र या प्रसारित नहीं करती है। लोड होने के बाद यह पूरी तरह ऑफ़लाइन काम कर सकती है।",
    appTitle: "ऑफ़लाइन पीडीएफ टूलबॉक्स",
    appDesc: "गोपनीयता की गारंटी। आपकी फ़ाइलें आपके ब्राउज़र कैश में संसाधित की जाती हैं और कभी किसी सर्वर पर अपलोड नहीं की जाती हैं।",
    tool_merge: "🔀 पीडीएफ विलय",
    tool_reorder: "📋 क्रम बदलें",
    tool_extract_pages: "✂️ पृष्ठ निकालें",
    tool_link: "🔗 लिंक क्षेत्र",
    tool_stamp: "🖼️ पीएनजी स्टैम्प",
    tool_text: "🔤 टेक्स्ट जोड़ें",
    tool_image: "🖼️ छवि जोड़ें",
    tool_extract_images: "🖼️ छवियां निकालें",
    combineFilesDesc: "2-10 फ़ाइलें मर्ज करें",
    rearrangePagesDesc: "पृष्ठों का क्रम बदलें",
    separateRangeDesc: "विशिष्ट पृष्ठ सीमा अलग करें",
    drawHyperlinkDesc: "क्लिक करने योग्य लिंक बनाएं",
    placeStampDesc: "पारदर्शी स्टैम्प लगाएं",
    addCustomTextDesc: "कस्टम टेक्स्ट टाइप करें",
    addImageAssetsDesc: "जेपीजी/पीएनजी चित्र लगाएं",
    extractAssetsDesc: "पीडीएफ से छवियां डाउनलोड करें",
    dropMerge: "मर्ज करने के लिए 2-10 पीडीएफ फाइलें यहां छोड़ें",
    dropSingle: "अपनी पीडीएफ फाइल यहां छोड़ें",
    orBrowse: "या स्थानीय फ़ाइलों के लिए ब्राउज़ करें",
    filesToMerge: "विलय के लिए फाइलें",
    clearAll: "सभी साफ़ करें",
    mergeAndEdit: "⚡ मर्ज करें और संपादित करें",
    cancel: "रद्द करें",
    resetZoom: "🔄 ज़ूम रीसेट",
    zoomLabel: "🔍 ज़ूम",
    applyAndSave: "लागू करें और संस्करण सहेजें",
    dragRearrange: "क्रम बदलने के लिए थंबनेल खींचें",
    extractedImagesTitle: "छवि निष्कर्षक",
    extractedImagesCount: "निकाली गई छवियां",
    downloadZip: "📦 सभी ज़िप डाउनलोड करें",
    back: "पीछे",
    clickOverlayInstruction: "💡 नीचे किसी पृष्ठ पर कहीं भी क्लिक या स्पर्श करें!",
    overlayEditor: "ओवरले संपादक",
    overlayDesc: "एक प्रकार चुनें, पूर्वावलोकन पृष्ठ पर क्लिक करें, फिर खींचें या आकार बदलें।",
    customText: "कस्टम टेक्स्ट",
    size: "आकार",
    color: "रंग",
    opacity: "अपारदर्शिता",
    uploadStamp: "स्टैम्प अपलोड करें",
    uploadImage: "छवि अपलोड करें",
    noOverlayYet: "कोई लिंक नहीं जोड़ा गया। '+ पंक्ति जोड़ें' पर क्लिक करें या पीडीएफ पर क्लिक करें।",
    noToolSelected: "संपादन शुरू करने के लिए ऊपर से एक टूल चुनें।",
    versionHistory: "संस्करण इतिहास",
    availableActions: "उपलब्ध क्रियाएं",
    warningDiscardTitle: "आगे के संस्करण छोड़ें?",
    warningDiscardDesc: "पुराने संस्करण को संपादित करने से इतिहास विभाजित हो जाएगा। इस बिंदु के बाद के संस्करण हटा दिए जाएंगे।",
    continueEdit: "जारी रखें और संपादित करें",
    closeFileTitle: "फ़ाइल बंद करें?",
    closeFileDesc: "क्या आप वाकई इस फ़ाइल को बंद करना चाहते हैं? सभी सहेजे न गए बदलाव नष्ट हो जाएंगे।",
    closeFileBtn: "फ़ाइल बंद करें",
    pageWord: "पृष्ठ"
  },
  ms: {
    specsTitle: "ⓘ Spesifikasi Alat PDF & Soal Jawab",
    faqTitle: "💡 Soalan Lazim (Q&A)",
    closeSheet: "Tutup Risalah Maklumat",
    limits: "Had Saiz Fail",
    privacy: "Perlindungan Privasi",
    session: "Sejarah Sesi Sementara",
    tech: "Maklumat Projek & Teknologi",
    limitsDesc: "- Had muat naik fail maks: 50MB (amaran dipaparkan jika lebih 50MB)\n- Saiz gabungan maks: Jumlah 100MB fail keseluruhan\n- Bilangan gabungan maks: 10 fail PDF",
    privacyDesc: "Operasi 100% pada sisi klien. Dokumen anda tidak akan keluar dari peranti tempatan anda. Tiada interaksi pelayan atau penyimpanan pangkalan data.",
    sessionDesc: "Log operasi dan rekod versi disimpan dalam memori RAM sahaja dan akan dipadamkan apabila halaman penyemak imbas dimuat semula. Muat turun suntingan sebelum keluar.",
    techDesc: "Pemprosesan hanya pada sisi klien menggunakan React, Vite, Tailwind CSS dan PDF-lib.",
    q1: "Q1: Bagaimana ia berfungsi tanpa pelayan?",
    a1: "Aplikasi berjalan sepenuhnya dalam sandbox tempatan penyemak imbas anda. Fail dibaca secara tempatan melalui HTML5 File API (`ArrayBuffer`) dan diproses oleh JavaScript pada sisi klien.",
    q2: "Q2: Bagaimanakah aliran kerja pada peranti klien?",
    a2_1: "Muat Naik: PDF dianalisis secara tempatan menggunakan PDF.js.",
    a2_2: "Sunting: Suntingan dikesan sebagai log operasi JSON yang ringan untuk menjimatkan penggunaan memori RAM.",
    a2_3: "Pembinaan Semula: Semasa pratinjau atau muat turun, `pdf-lib` membina semula PDF dengan memproses semula senarai operasi ke atas fail asal.",
    a2_4: "Muat Turun: URL Blob tempatan dijana untuk membolehkan fail dimuat turun terus dari memori RAM.",
    q3: "Q3: Apakah pemprosesan sisi klien?",
    a3: "Pemprosesan sisi klien bermaksud semua tugas pengiraan, rendering dan operasi fail berlaku terus dalam enjin pelayar pada komputer tempatan pengguna, tanpa menghantar data ke pelayan awan.",
    q4: "Q4: Apakah stack teknologi yang digunakan?",
    a4: "Dibina menggunakan React, Vite, dan Tailwind CSS. Menggunakan PDF.js untuk paparan, PDF-Lib untuk perubahan fail binari, dan JSZip untuk pembungkusan fail ke format ZIP.",
    q5: "Q5: Apakah peranan PDF-Lib dan adakah data saya selamat?",
    a5: "PDF-Lib ialah pustaka JavaScript tulen untuk membaca, mengubah suai dan menyusun struktur binari PDF dalam memori pelayar. Ia tidak mengumpul atau menghantar data anda. Aplikasi boleh berfungsi tanpa talian internet sepenuhnya.",
    appTitle: "Kotak Alat PDF Luar Talian",
    appDesc: "Privasi terjamin. Fail anda diproses sepenuhnya dalam cache pelayar dan tidak akan dimuat naik ke pelayan.",
    tool_merge: "🔀 Gabung PDF",
    tool_reorder: "📋 Susun Semula Halaman",
    tool_extract_pages: "✂️ Ekstrak Halaman",
    tool_link: "🔗 Kawasan Pautan",
    tool_stamp: "🖼️ Cap PNG",
    tool_text: "🔤 Tambah Teks",
    tool_image: "🖼️ Tambah Gambar",
    tool_extract_images: "🖼️ Ekstrak Gambar",
    combineFilesDesc: "Gabungkan 2 hingga 10 fail",
    rearrangePagesDesc: "Susun semula susunan halaman",
    separateRangeDesc: "Asingkan julat halaman tertentu",
    drawHyperlinkDesc: "Lukis kotak pautan boleh klik",
    placeStampDesc: "Letakkan cap lut sinar",
    addCustomTextDesc: "Masukkan teks tersuai",
    addImageAssetsDesc: "Letakkan imej JPG/PNG",
    extractAssetsDesc: "Simpan imej daripada PDF",
    dropMerge: "Lepaskan 2–10 fail PDF di sini untuk digabungkan",
    dropSingle: "Lepaskan fail PDF anda di sini",
    orBrowse: "atau klik untuk mencari fail tempatan",
    filesToMerge: "Fail untuk Digabungkan",
    clearAll: "Padam Semua",
    mergeAndEdit: "⚡ Gabung & Sunting",
    cancel: "Batal",
    resetZoom: "🔄 Set Semula Zum",
    zoomLabel: "🔍 Zum",
    applyAndSave: "Guna & Simpan Versi",
    dragRearrange: "Heret lakaran kecil untuk susun semula",
    extractedImagesTitle: "Alat Ekstrak Imej",
    extractedImagesCount: "Imej yang Diekstrak",
    downloadZip: "📦 Muat Turun Semua ZIP",
    back: "Kembali",
    clickOverlayInstruction: "💡 Klik atau ketik di mana-mana sahaja pada halaman di bawah untuk meletakkan item anda!",
    overlayEditor: "Editor Tindihan",
    overlayDesc: "Pilih jenis, klik halaman pratinjau untuk meletakkan, kemudian heret/ubah saiz untuk konfigurasi.",
    customText: "Teks Tersuai",
    size: "Saiz",
    color: "Warna",
    opacity: "Kelegapan",
    uploadStamp: "Muat Naik Cap",
    uploadImage: "Muat Naik Gambar",
    noOverlayYet: "Tiada tindihan pautan ditambah lagi. Klik \"+ Tambah Baris\" atau klik pada PDF untuk menciptanya.",
    noToolSelected: "Pilih kad tindakan di atas untuk mula menyunting dokumen PDF ini.",
    versionHistory: "Sejarah Versi",
    availableActions: "Tindakan Tersedia",
    warningDiscardTitle: "Buang Versi Seterusnya?",
    warningDiscardDesc: "Menyunting versi yang lebih lama akan memisahkan sejarah pokok versi. Versi masa depan selepas ini akan dibuang.",
    continueEdit: "Teruskan & Sunting",
    closeFileTitle: "Tutup Fail?",
    closeFileDesc: "Adakah anda pasti mahu menutup fail ini? Semua suntingan yang belum disimpan akan hilang.",
    closeFileBtn: "Tutup Fail",
    pageWord: "Halaman"
  },
  vi: {
    specsTitle: "ⓘ Thông số kỹ thuật & Hỏi đáp về Công cụ PDF",
    faqTitle: "💡 Câu hỏi thường gặp (Q&A)",
    closeSheet: "Đóng bảng thông tin",
    limits: "Giới hạn kích thước tệp",
    privacy: "Bảo mật quyền riêng tư",
    session: "Lịch sử phiên tạm thời",
    tech: "Thông tin dự án & Công nghệ",
    limitsDesc: "- Giới hạn tải lên tối đa: 50MB (cảnh báo trên 50MB)\n- Kích thước gộp tối đa: tổng cộng 100MB giữa các tệp\n- Số lượng tệp gộp tối đa: 10 tệp PDF",
    privacyDesc: "Thực thi 100% phía máy khách (Client-Side). Tài liệu của bạn không bao giờ rời khỏi thiết bị lưu trữ cục bộ. Không có tương tác máy chủ hay lưu trữ cơ sở dữ liệu.",
    sessionDesc: "Nhật ký hoạt động và cây phiên bản được lưu trong bộ nhớ tạm và sẽ bị xóa khi làm mới trang trình duyệt. Hãy tải xuống bản chỉnh sửa trước khi thoát.",
    techDesc: "Xử lý hoàn toàn ở phía máy khách bằng React, Vite, Tailwind CSS và PDF-lib.",
    q1: "Q1: Làm thế nào ứng dụng hoạt động không cần máy chủ?",
    a1: "Ứng dụng chạy hoàn toàn trong hộp cát trình duyệt cục bộ của bạn. Nó đọc tệp cục bộ thông qua HTML5 File API (`ArrayBuffer`) và xử lý bằng JavaScript ở phía máy khách. Không có yêu cầu HTTP nào gửi đến máy chủ phụ trợ.",
    q2: "Q2: Quy trình làm việc trên thiết bị khách diễn ra như thế nào?",
    a2_1: "Tải lên: PDF được phân tích cục bộ bằng PDF.js.",
    a2_2: "Chỉnh sửa: Các chỉnh sửa được theo dõi dưới dạng nhật ký hoạt động JSON nhẹ để tối ưu hóa bộ nhớ.",
    a2_3: "Tái cấu trúc: Khi xem trước hoặc tải xuống, `pdf-lib` sẽ biên dịch lại PDF bằng cách áp dụng từng hoạt động vào bộ đệm gốc.",
    a2_4: "Tải xuống: Một URL Blob cục bộ được tạo để trình duyệt tải trực tiếp từ bộ nhớ RAM.",
    q3: "Q3: Xử lý phía máy khách là gì?",
    a3: "Xử lý phía máy khách nghĩa là mọi tác vụ tính toán, hiển thị và thao tác tệp đều diễn ra trực tiếp trong công cụ thực thi trình duyệt trên máy của người dùng, không truyền dữ liệu đến máy chủ đám mây.",
    q4: "Q4: Bộ công nghệ được sử dụng là gì?",
    a4: "Được xây dựng bằng React, Vite và Tailwind CSS. Sử dụng PDF.js để kết xuất trang, PDF-Lib để thay đổi cấu trúc nhị phân PDF và JSZip để đóng gói tệp ZIP.",
    q5: "Q5: Vai trò của PDF-Lib là gì và dữ liệu của tôi có an toàn không?",
    a5: "PDF-Lib là một thư viện JavaScript thuần túy đọc, sửa đổi và biên dịch cấu trúc nhị phân PDF trong bộ nhớ trình duyệt. Nó không thu thập hay truyền tải dữ liệu của bạn. Hoạt động hoàn toàn ngoại tuyến sau khi tải.",
    appTitle: "Hộp công cụ PDF Ngoại tuyến",
    appDesc: "Bảo mật tuyệt đối. Tệp của bạn được xử lý hoàn toàn trong bộ nhớ cache trình duyệt và không bao giờ tải lên bất kỳ máy chủ nào.",
    tool_merge: "🔀 Gộp PDF",
    tool_reorder: "📋 Sắp xếp lại trang",
    tool_extract_pages: "✂️ Trích xuất trang",
    tool_link: "🔗 Vùng liên kết",
    tool_stamp: "🖼️ Đóng dấu PNG",
    tool_text: "🔤 Thêm văn bản",
    tool_image: "🖼️ Thêm hình ảnh",
    tool_extract_images: "🖼️ Trích xuất ảnh",
    combineFilesDesc: "Gộp từ 2 đến 10 tệp",
    rearrangePagesDesc: "Sắp xếp lại thứ tự trang",
    separateRangeDesc: "Tách một phạm vi trang cụ thể",
    drawHyperlinkDesc: "Vẽ hộp liên kết có thể nhấp",
    placeStampDesc: "Chèn hình ảnh dấu trong suốt",
    addCustomTextDesc: "Nhập văn bản tùy chỉnh",
    addImageAssetsDesc: "Chèn hình ảnh JPG/PNG",
    extractAssetsDesc: "Lưu hình ảnh từ PDF",
    dropMerge: "Thả 2-10 tệp PDF vào đây để gộp",
    dropSingle: "Thả tệp PDF của bạn vào đây",
    orBrowse: "hoặc nhấp để chọn tệp cục bộ",
    filesToMerge: "Tệp cần gộp",
    clearAll: "Xóa tất cả",
    mergeAndEdit: "⚡ Gộp & Chỉnh sửa",
    cancel: "Hủy",
    resetZoom: "🔄 Đặt lại thu phóng",
    zoomLabel: "🔍 Thu phóng",
    applyAndSave: "Áp dụng & Lưu phiên bản",
    dragRearrange: "Kéo hình thu nhỏ để sắp xếp",
    extractedImagesTitle: "Bộ trích xuất hình ảnh",
    extractedImagesCount: "Hình ảnh đã trích xuất",
    downloadZip: "📦 Tải xuống tất cả ZIP",
    back: "Quay lại",
    clickOverlayInstruction: "💡 Nhấp hoặc chạm vào bất kỳ đâu trên trang bên dưới để đặt mục của bạn!",
    overlayEditor: "Trình chỉnh sửa lớp phủ",
    overlayDesc: "Chọn một loại, nhấp vào trang xem trước để đặt, sau đó kéo/thay đổi kích thước.",
    customText: "Văn bản tùy chỉnh",
    size: "Kích thước",
    color: "Màu sắc",
    opacity: "Độ mờ",
    uploadStamp: "Tải lên con dấu",
    uploadImage: "Tải lên hình ảnh",
    noOverlayYet: "Chưa có liên kết lớp phủ nào. Nhấp '+ Thêm hàng' hoặc nhấp vào PDF để tạo.",
    noToolSelected: "Chọn một thẻ hành động ở trên để bắt đầu chỉnh sửa tài liệu PDF này.",
    versionHistory: "Lịch sử phiên bản",
    availableActions: "Hành động khả dụng",
    warningDiscardTitle: "Hủy các phiên bản sau?",
    warningDiscardDesc: "Chỉnh sửa phiên bản cũ hơn sẽ phân nhánh lịch sử. Các phiên bản tiếp theo sau thời điểm này sẽ bị hủy bỏ.",
    continueEdit: "Tiếp tục & Chỉnh sửa",
    closeFileTitle: "Đóng tệp?",
    closeFileDesc: "Bạn có chắc chắn muốn đóng tệp này không? Mọi thay đổi chưa lưu sẽ bị mất.",
    closeFileBtn: "Đóng tệp",
    pageWord: "Trang"
  }
};

// --- SUB-COMPONENTS FOR DRAG & DROP REORDERING ---

// Sortable item wrapper for PDF Page thumbnails
function SortablePageThumbnail({ id, index, totalPages, renderTrigger, pdfDoc, pageWord, onPreview }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const canvasRef = useRef(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    touchAction: 'none',
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
      className="bg-gray-900 border border-gray-800 rounded-lg p-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:border-purple-500/50 transition-colors group relative h-full"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onPreview(index);
        }}
        className="relative overflow-hidden rounded bg-white shadow-lg w-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity group-hover:ring-2 group-hover:ring-purple-500/30"
      >
        <canvas ref={canvasRef} className="w-full h-auto object-contain block" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="text-white text-[11px] font-bold bg-black/75 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-lg border border-gray-800/50">
            🔍 Zoom Page
          </span>
        </div>
      </div>
      <span className="text-base font-semibold text-gray-300 mt-1.5 group-hover:text-purple-400 transition-colors">
        {pageWord || "Page"} {index + 1}
      </span>
    </div>
  );
}

// Page thumbnail item for PDF page extraction
function ExtractPageThumbnail({ index, pdfDoc, renderTrigger, isSelected, onToggle, pageWord }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (pdfDoc && canvasRef.current) {
      renderPageToCanvas(pdfDoc, index + 1, canvasRef.current, 0.4).then(() => {
        if (!active) return;
      }).catch(err => console.error("Extract thumbnail render error", err));
    }
    return () => {
      active = false;
    };
  }, [pdfDoc, index, renderTrigger]);

  return (
    <div
      onClick={onToggle}
      className={`bg-gray-900 border rounded-lg p-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-250 group relative ${isSelected
          ? 'border-purple-500 ring-2 ring-purple-500/30'
          : 'border-gray-800 hover:border-gray-700'
        }`}
    >
      <div className="relative overflow-hidden rounded bg-white shadow-lg w-full flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-auto object-contain block" />
        {isSelected && (
          <div className="absolute inset-0 bg-purple-600/10 flex items-center justify-center">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg text-sm font-bold animate-scale-up">
              ✓
            </div>
          </div>
        )}
      </div>
      <span className={`text-base font-semibold mt-1.5 transition-colors ${isSelected ? 'text-purple-400 font-bold' : 'text-gray-300 group-hover:text-gray-200'
        }`}>
        {pageWord} {index + 1}
      </span>
    </div>
  );
}

// Sortable item wrapper for Merge Files list
function SortableFileItem({ id, file, onRemove, cols }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  };

  const isCompactCard = cols >= 5;

  if (isCompactCard) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative bg-gray-900 border border-gray-800 hover:border-purple-500/30 rounded-lg p-3 cursor-move flex flex-col items-center justify-center text-center group h-32"
      >
        {/* Drag handle area */}
        <div className="absolute inset-0 cursor-move" {...attributes} {...listeners} />

        {/* File icon */}
        <div className="relative z-10 w-10 h-10 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center text-lg mb-2 pointer-events-none">
          📄
        </div>

        {/* File Info */}
        <div className="relative z-10 flex flex-col items-center w-full pointer-events-none">
          <span className="text-[11px] font-semibold text-gray-200 truncate w-full px-1">
            {file.name}
          </span>
          <span className="text-[9px] text-gray-500 mt-0.5">
            {(file.size / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>

        {/* Delete Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors font-bold text-xs z-20 cursor-pointer"
        >
          ✕
        </button>
      </div>
    );
  }

  // Row Layout for cols === 1 or 2
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-purple-500/30 rounded-lg p-3 cursor-move relative"
    >
      <div className="flex items-center gap-3 w-[85%]" {...attributes} {...listeners}>
        <span className="text-gray-500">☰</span>
        <div className="flex flex-col text-left truncate">
          <span className="text-xs font-semibold text-gray-200 truncate">
            {file.name}
          </span>
          <span className="text-[10px] text-gray-500">
            {(file.size / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(id);
        }}
        className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-full transition-colors font-bold text-sm z-10 cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}

// --- MAIN APPLICATION COMPONENT ---

export default function App() {
  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧', flagUrl: 'https://flagcdn.com/w40/gb.png' },
    { code: 'id', name: 'Bahasa Indo', flag: '🇮🇩', flagUrl: 'https://flagcdn.com/w40/id.png' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦', flagUrl: 'https://flagcdn.com/w40/sa.png' },
    { code: 'es', name: 'Español', flag: '🇪🇸', flagUrl: 'https://flagcdn.com/w40/es.png' },
    { code: 'jv', name: 'Basa Jawa', flag: '🌾', flagUrl: 'https://flagcdn.com/w40/id.png', isSubLang: true },
    { code: 'ja', name: '日本語', flag: '🇯🇵', flagUrl: 'https://flagcdn.com/w40/jp.png' },
    { code: 'zh', name: '中文', flag: '🇨🇳', flagUrl: 'https://flagcdn.com/w40/cn.png' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺', flagUrl: 'https://flagcdn.com/w40/ru.png' },
    { code: 'ga', name: 'Gaeilge', flag: '🇮🇪', flagUrl: 'https://flagcdn.com/w40/ie.png' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', flagUrl: 'https://flagcdn.com/w40/in.png' },
    { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾', flagUrl: 'https://flagcdn.com/w40/my.png' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', flagUrl: 'https://flagcdn.com/w40/vn.png' },
  ];

  // File states
  const [originalBytes, setOriginalBytes] = useState(null);
  const [fileName, setFileName] = useState('');
  const [pdfjsDoc, setPdfjsDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);

  // Mobile layout drawer toggle
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Theme state: light or dark, defaults to localStorage or system media preference
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  // Precache crucial assets in the background to make the app 100% offline-ready
  useEffect(() => {
    const precacheAssets = async () => {
      const getLocalAssetUrl = (filename) => {
        const base = import.meta.env.BASE_URL || '/';
        let resolvedBase = base;
        if (base.startsWith('.')) {
          const pathname = window.location.pathname;
          const dir = pathname.substring(0, pathname.lastIndexOf('/') + 1);
          resolvedBase = dir + base.slice(1);
        }
        resolvedBase = resolvedBase.replace(/\/+/g, '/');
        return new URL(resolvedBase + filename, window.location.origin).toString();
      };

      const localAssets = [
        'pdf.worker.min.mjs',
        'favicon.svg',
        'icons.svg'
      ];
      
      const flagUrls = languages.map(lang => lang.flagUrl).filter(Boolean);

      // Trigger background fetches for local assets
      for (const asset of localAssets) {
        try {
          const url = getLocalAssetUrl(asset);
          await fetch(url);
          console.log(`Pre-cached static asset: ${asset}`);
        } catch (e) {
          console.warn(`Failed to pre-fetch asset: ${asset}`, e);
        }
      }

      // Trigger background fetches for flag CDN images
      for (const url of flagUrls) {
        try {
          await fetch(url);
          console.log(`Pre-cached flag CDN image: ${url}`);
        } catch (e) {
          console.warn(`Failed to pre-fetch flag image: ${url}`, e);
        }
      }
    };
    
    // Delay slightly to not block initial rendering/main thread
    const timer = setTimeout(precacheAssets, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Prevent unsaved data loss on refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (originalBytes) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to refresh the page? Your session will close and the file won't be saved.";
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [originalBytes]);

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
  const [previewPageIdx, setPreviewPageIdx] = useState(null);
  const [workspaceCols, setWorkspaceCols] = useState(5);
  const [expandedAccordions, setExpandedAccordions] = useState([]);
  const [faqOpen, setFaqOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [showDownloadAllModal, setShowDownloadAllModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Reorder page indices (0-indexed list of pages, e.g. [0, 1, 2...])
  const [pageOrder, setPageOrder] = useState([]);

  // Extract page inputs
  const [extractRange, setExtractRange] = useState('');

  // Overlays parameters
  const [overlays, setOverlays] = useState([]); // Active list of overlays in current editing draft
  const [selectedOverlayIdx, setSelectedOverlayIdx] = useState(null);
  const [overlayTool, setOverlayTool] = useState('link'); // 'link', 'stamp', 'text', 'image'

  // Input builders for overlays
  const [textVal, setTextVal] = useState('');
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

  // Zoom feature state
  const [zoomLevel, setZoomLevel] = useState(100);
  const [pageInputVal, setPageInputVal] = useState('1');
  const pageInputRef = useRef(null);

  // Sync page input when pdfjsDoc is loaded
  useEffect(() => {
    setPageInputVal('1');
  }, [pdfjsDoc]);

  const jumpToPage = (pageNum) => {
    const pageIdx = parseInt(pageNum, 10) - 1;
    if (pageIdx >= 0 && pageIdx < totalPages) {
      const el = pageContainerRefs.current[pageIdx];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleScroll = (e) => {
    if (totalPages <= 0) return;
    const container = e.currentTarget;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    
    let closestPageIdx = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < totalPages; i++) {
      const el = pageContainerRefs.current[i];
      if (el) {
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elCenter - containerCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestPageIdx = i;
        }
      }
    }
    const newPageNumStr = String(closestPageIdx + 1);
    if (document.activeElement !== pageInputRef.current && pageInputVal !== newPageNumStr) {
      setPageInputVal(newPageNumStr);
    }
  };

  const pinchState = useRef({ active: false, startDist: 0, startZoom: 100 });

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchState.current = { active: true, startDist: dist, startZoom: zoomLevel };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchState.current.active) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchState.current.startDist;
      let newZoom = Math.round(pinchState.current.startZoom * ratio);
      newZoom = Math.max(50, Math.min(300, newZoom));
      setZoomLevel(newZoom);
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      pinchState.current.active = false;
    }
  };

  // Configured sensors for dnd-kit (Mouse for desktop, Touch with hold-to-drag for mobile)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms press-and-hold to activate dragging on touch screens
        tolerance: 5, // drag cancels if finger moves more than 5px before activation
      },
    })
  );

  const modalCanvasRef = useRef(null);

  // Render high-res fullscreen preview page
  useEffect(() => {
    let active = true;
    if (previewPageIdx !== null && pdfjsDoc && modalCanvasRef.current) {
      renderPageToCanvas(pdfjsDoc, previewPageIdx + 1, modalCanvasRef.current, 1.5).then(() => {
        if (!active) return;
      }).catch(err => console.error("Modal page preview render error", err));
    }
    return () => {
      active = false;
    };
  }, [previewPageIdx, pdfjsDoc, renderTrigger]);

  // Reset tool states when a file is closed
  const resetFileState = () => {
    setOriginalBytes(null);
    setFileName('');
    setPdfjsDoc(null);
    setTotalPages(0);
    setIsMobileDrawerOpen(false);
    setVersions([]);
    setActiveVersionIndex(-1);
    setActiveTool(null);
    setOverlays([]);
    setSelectedOverlayIdx(null);
    setShowCloseConfirm(false);
    setPageOrder([]);
    setPreviewPageIdx(null);
    setWorkspaceCols(5);
    setMergeFiles([]);
    setExtractedImages([]);
    setExtractRange('');
    setPageInputVal('1');
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
      setIsMobileDrawerOpen(false); // Close mobile drawer
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

  // Helper to parse range string like "1, 3-5, 7" into a Set of 0-based page indices
  const parseRangeToSet = (rangeStr, total) => {
    const indices = new Set();
    if (!rangeStr) return indices;
    const parts = rangeStr.split(',');
    for (let part of parts) {
      part = part.trim();
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let i = min; i <= max; i++) {
            if (i >= 1 && i <= total) {
              indices.add(i - 1);
            }
          }
        }
      } else {
        const val = parseInt(part, 10);
        if (!isNaN(val) && val >= 1 && val <= total) {
          indices.add(val - 1);
        }
      }
    }
    return indices;
  };

  // Helper to format a Set of 0-based page indices into a range string like "1, 3-5, 7"
  const formatSetToRange = (indexSet) => {
    const sorted = Array.from(indexSet).sort((a, b) => a - b);
    if (sorted.length === 0) return '';
    const ranges = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        if (start === end) {
          ranges.push(`${start + 1}`);
        } else {
          ranges.push(`${start + 1}-${end + 1}`);
        }
        start = sorted[i];
        end = sorted[i];
      }
    }
    if (start === end) {
      ranges.push(`${start + 1}`);
    } else {
      ranges.push(`${start + 1}-${end + 1}`);
    }
    return ranges.join(', ');
  };

  const isPageSelectedForExtract = (index) => {
    const set = parseRangeToSet(extractRange, totalPages);
    return set.has(index);
  };

  const toggleExtractPage = (index) => {
    const set = parseRangeToSet(extractRange, totalPages);
    if (set.has(index)) {
      set.delete(index);
    } else {
      set.add(index);
    }
    setExtractRange(formatSetToRange(set));
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
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const versionLabel = versions[activeVersionIndex]?.label || 'Original';
      const safeLabel = versionLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
      const finalName = `${baseName}_${dateStr}_v${activeVersionIndex + 1}_${safeLabel}.pdf`;

      link.download = finalName;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Download failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadAllVersionsZip = async () => {
    setLoading(true);
    setLoadingMsg('Generating ZIP of all versions...');
    try {
      const zip = new JSZip();
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

      for (let i = 0; i < versions.length; i++) {
        const ver = versions[i];
        const bytes = await applyVersionOps(originalBytes, ver.ops);
        const safeLabel = (ver.label || 'Original').replace(/[^a-zA-Z0-9_-]/g, '_');
        const finalName = `${baseName}_${dateStr}_v${i + 1}_${safeLabel}.pdf`;
        zip.file(finalName, bytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${baseName}_${dateStr}_All_Versions.zip`;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Download all failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadEachVersionIndividually = async () => {
    setLoading(true);
    setLoadingMsg('Preparing sequential downloads...');
    try {
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

      for (let i = 0; i < versions.length; i++) {
        const ver = versions[i];
        const bytes = await applyVersionOps(originalBytes, ver.ops);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const safeLabel = (ver.label || 'Original').replace(/[^a-zA-Z0-9_-]/g, '_');
        const finalName = `${baseName}_${dateStr}_v${i + 1}_${safeLabel}.pdf`;
        link.download = finalName;
        link.click();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (err) {
      console.error(err);
      alert('Download all failed: ' + err.message);
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
  }, [pdfjsDoc, renderTrigger, totalPages, activeTool]);

  const renderSidebarContent = () => (
    <>
      {/* Dashboard Action List */}
      <div className="p-4 border-b border-gray-900 bg-gray-900/10 shrink-0">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">{dictionary[currentLanguage]?.availableActions || "Available Actions"}</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'reorder', label: dictionary[currentLanguage]?.tool_reorder || '📋 Reorder' },
            { id: 'extract_pages', label: dictionary[currentLanguage]?.tool_extract_pages || '✂️ Extract Pages' },
            { id: 'overlays', label: `✍️ ${dictionary[currentLanguage]?.overlayEditor || 'Overlay Editor'}` },
            { id: 'extract_images', label: dictionary[currentLanguage]?.tool_extract_images || '🖼️ Pull Images' },
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
              className={`text-xs px-3 py-1.5 font-semibold rounded-lg border cursor-pointer transition-all duration-200 ${activeTool === tool.id
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
      <div className="flex-1 p-5 border-b border-gray-900 overflow-y-auto min-h-0">

        {/* TOOL: REORDER */}
        {activeTool === 'reorder' && (
          <div className="text-left flex flex-col h-full justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-gray-200 mb-1">{dictionary[currentLanguage]?.tool_reorder || "Reorder Pages"}</h4>
              <p className="text-xs text-gray-500 leading-normal">
                {dictionary[currentLanguage]?.dragRearrange || "Drag thumbnails in the left workspace to rearrange the PDF page order."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveReorder}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              {dictionary[currentLanguage]?.applyAndSave || "Apply & Save Version"}
            </button>
          </div>
        )}

        {/* TOOL: EXTRACT PAGES */}
        {activeTool === 'extract_pages' && (
          <div className="text-left flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-bold text-gray-200 mb-1">{dictionary[currentLanguage]?.tool_extract_pages || "Extract Pages"}</h4>
              <p className="text-xs text-gray-500 leading-normal">
                {dictionary[currentLanguage]?.separateRangeDesc || "Generate a new PDF document consisting of only the pages defined in the range criteria."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-400 uppercase">{dictionary[currentLanguage]?.pageRange || "Page Range"} (Total: {totalPages})</label>
              <input
                type="text"
                placeholder="e.g. 1, 3-5, 7"
                value={extractRange}
                onChange={(e) => setExtractRange(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 outline-none focus:border-purple-500/50 transition-colors font-mono"
              />
              <span className="text-xs text-gray-600 leading-normal">
                {dictionary[currentLanguage]?.formatRange || "Format: Use comma separators and hyphens for range brackets. e.g. \"1, 2-4, 5\"."}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSaveExtractPages}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer mt-2"
            >
              {dictionary[currentLanguage]?.applyAndSave || "Apply & Save Version"}
            </button>
          </div>
        )}

        {/* TOOL: EXTRACT IMAGES */}
        {activeTool === 'extract_images' && (
          <div className="text-left flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-bold text-gray-200 mb-1">{dictionary[currentLanguage]?.extractedImagesTitle || "Extract Embedded Images"}</h4>
              <p className="text-xs text-gray-500 leading-normal">
                {dictionary[currentLanguage]?.extractAssetsDesc || "Extract and download all raw graphic assets and images embedded within this PDF document."}
              </p>
            </div>

            {extractedImages.length === 0 ? (
              <button
                type="button"
                onClick={handleRunExtractImages}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {dictionary[currentLanguage]?.runExtract || "Extract PDF Images"}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={downloadAllImagesZip}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  {dictionary[currentLanguage]?.downloadZip || "📦 Download ZIP"} ({extractedImages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setExtractedImages([])}
                  className="w-full bg-gray-900 hover:bg-gray-850 text-gray-400 font-semibold text-xs py-2.5 rounded-lg border border-gray-800 transition-colors cursor-pointer"
                >
                  {dictionary[currentLanguage]?.clearAll || "Clear Extracted"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TOOL: INTERACTIVE OVERLAYS */}
        {activeTool === 'overlays' && (
          <div className="text-left flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-bold text-gray-200 mb-1">{dictionary[currentLanguage]?.overlayEditor || "Overlay Editor"}</h4>
              <p className="text-xs text-gray-500 leading-normal">
                {dictionary[currentLanguage]?.overlayDesc || "Select a type, click on the preview page to place it, then drag/resize to configure."}
              </p>
            </div>

            {/* Overlay Type Switcher buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'link', label: dictionary[currentLanguage]?.tool_link?.replace("🔗 ", "") || "Link" },
                { id: 'text', label: dictionary[currentLanguage]?.tool_text?.replace("🔤 ", "") || "Text" },
                { id: 'stamp', label: dictionary[currentLanguage]?.tool_stamp?.replace("🖼️ ", "") || "Stamp" },
                { id: 'image', label: dictionary[currentLanguage]?.tool_image?.replace("🖼️ ", "") || "Image" },
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
                  className={`text-xs font-bold py-2 rounded border cursor-pointer transition-colors ${overlayTool === type.id
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
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">{dictionary[currentLanguage]?.tool_link?.replace("🔗 ", "") || "Link"} URL</label>
                    <input
                      type="text"
                      value={urlVal}
                      onChange={(e) => setUrlVal(e.target.value)}
                      className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 outline-none w-full"
                      placeholder="https://"
                      disabled={selectedOverlayIdx === null || overlays[selectedOverlayIdx]?.type !== 'link'}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-400 uppercase">{dictionary[currentLanguage]?.tool_link?.replace("🔗 ", "") || "Link"} Table</label>
                      <button
                        type="button"
                        onClick={() => {
                          const newOverlay = { type: 'link', x: 0.1, y: 0.1, w: 0.2, h: 0.1, pageIndex: 0, url: 'https://' };
                          setOverlays(prev => [...prev, newOverlay]);
                          setSelectedOverlayIdx(overlays.length);
                          setOverlayTool('link');
                          setUrlVal('https://');
                        }}
                        className="text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded"
                      >
                        + Add Row
                      </button>
                    </div>

                    {overlays.filter(ov => ov.type === 'link').length === 0 ? (
                      <div className="text-xs text-gray-500 italic p-3 border border-gray-800 rounded bg-gray-900/50">
                        {dictionary[currentLanguage]?.noOverlayYet || 'No link overlays added yet. Click "+ Add Row" or click on the PDF to create one.'}
                      </div>
                    ) : (
                      <div className="border border-gray-800 rounded overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-xs text-gray-300">
                          <thead className="bg-gray-900 sticky top-0">
                            <tr>
                              <th className="p-2 font-bold border-b border-gray-800 w-10 text-center">No</th>
                              <th className="p-2 font-bold border-b border-gray-800">URL</th>
                              <th className="p-2 font-bold border-b border-gray-800 w-16 text-center">Active</th>
                              <th className="p-2 font-bold border-b border-gray-800 w-16 text-center">✕</th>
                            </tr>
                          </thead>
                          <tbody>
                            {overlays.map((ov, index) => {
                              if (ov.type !== 'link') return null;
                              const isActive = selectedOverlayIdx === index;
                              return (
                                <tr key={index} className={`border-b border-gray-800 last:border-0 ${isActive ? 'bg-purple-900/30' : 'bg-gray-950 hover:bg-gray-900/50'}`}>
                                  <td className="p-2 text-center">{index + 1}</td>
                                  <td className="p-2 truncate max-w-[120px]" title={ov.url}>{ov.url || '-'}</td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedOverlayIdx(index);
                                        setOverlayTool('link');
                                        setUrlVal(ov.url);
                                      }}
                                      className={`px-2 py-1 rounded font-semibold ${isActive ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
                                    >
                                      {isActive ? '✓' : 'Set'}
                                    </button>
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeOverlay(index)}
                                      className="text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-inputs: Text */}
              {overlayTool === 'text' && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">{dictionary[currentLanguage]?.customText || "Custom Text"}</label>
                    <input
                      type="text"
                      value={textVal}
                      onChange={(e) => setTextVal(e.target.value)}
                      className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 outline-none w-full"
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">{dictionary[currentLanguage]?.size || "Size"} ({fontSizeVal}pt)</label>
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
                      <label className="text-xs font-bold text-gray-400 uppercase">{dictionary[currentLanguage]?.color || "Color"}</label>
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
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      {overlayTool === 'stamp' ? (dictionary[currentLanguage]?.uploadStamp || 'Upload Stamp') : (dictionary[currentLanguage]?.uploadImage || 'Upload Image')}
                    </label>
                    <input
                      type="file"
                      accept={overlayTool === 'stamp' ? 'image/png' : 'image/png, image/jpeg'}
                      onChange={handleOverlayImageUpload}
                      className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1 text-xs text-gray-400 file:mr-2.5 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-purple-400 hover:file:bg-gray-750 w-full"
                    />
                    {imageName && (
                      <span className="text-[10px] text-gray-500 truncate mt-1 block max-w-[200px]">
                        Selected: {imageName}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">{dictionary[currentLanguage]?.opacity || "Opacity"} ({Math.round(opacityVal * 100)}%)</label>
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
              <div className="bg-gray-900/60 border border-gray-850 rounded-lg p-2.5 flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">Item #{selectedOverlayIdx + 1} ({overlays[selectedOverlayIdx].type})</span>
                <button
                  type="button"
                  onClick={() => removeOverlay(selectedOverlayIdx)}
                  className="text-xs text-red-400 hover:underline font-bold"
                >
                  {dictionary[currentLanguage]?.cancel || "Delete"}
                </button>
              </div>
            )}

            <div className="flex gap-2 border-t border-gray-900 pt-4 mt-4">
              <button
                type="button"
                onClick={handleSaveOverlays}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {dictionary[currentLanguage]?.applyAndSave || "Apply & Save Version"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOverlays([]);
                  setSelectedOverlayIdx(null);
                  setActiveTool(null);
                  setIsMobileDrawerOpen(false);
                }}
                className="bg-gray-900 border border-gray-800 text-xs px-4 rounded-lg cursor-pointer text-gray-400 hover:border-gray-700"
              >
                {dictionary[currentLanguage]?.cancel || "Cancel"}
              </button>
            </div>
          </div>
        )}

        {/* NO TOOL SELECTION SCREEN */}
        {!activeTool && (
          <div className="h-full flex items-center justify-center text-center p-4">
            <p className="text-xs text-gray-500 italic">
              {dictionary[currentLanguage]?.noToolSelected || "Select an action card above to start editing this PDF document."}
            </p>
          </div>
        )}

      </div>

      {/* Version History Sidebar Control */}
      <div className="p-5 flex flex-col gap-4 text-left shrink-0">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">{dictionary[currentLanguage]?.versionHistory || "Version History"}</span>
        <div id="version-history-list" className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
          {versions.map((ver, idx) => {
            const isActive = idx === activeVersionIndex;
            return (
              <div
                key={ver.id}
                className={`flex flex-col border rounded-lg p-2.5 transition-all duration-200 ${isActive
                  ? 'bg-purple-600/10 border-purple-500/80 shadow-md shadow-purple-500/5'
                  : 'bg-gray-950 border-gray-900 hover:border-gray-800'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-200 truncate pr-1">
                    {idx === 0 ? '🟢 ' : '○ '} {ver.label}
                  </span>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded leading-none">
                    {ver.id === 'orig' ? 'orig' : ver.id}
                  </span>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      loadVersion(idx);
                      setIsMobileDrawerOpen(false);
                    }}
                    disabled={isActive}
                    className="text-sm font-bold text-purple-400 hover:underline px-1 py-0.5 cursor-pointer disabled:text-gray-500 disabled:no-underline disabled:cursor-default"
                  >
                    {isActive
                      ? (currentLanguage === 'id' ? 'Sedang Dilihat' : currentLanguage === 'es' ? 'Viendo' : currentLanguage === 'ar' ? 'معاينة' : currentLanguage === 'jv' ? 'Dipirsani' : 'Viewing')
                      : (currentLanguage === 'id' ? 'Pratinjau' : currentLanguage === 'es' ? 'Previsualizar' : currentLanguage === 'ar' ? 'عرض' : currentLanguage === 'jv' ? 'Pratinjau' : 'Preview')}
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
                    className="text-sm font-bold text-blue-400 hover:underline px-1 py-0.5 cursor-pointer"
                  >
                    {currentLanguage === 'id' ? 'Unduh' : currentLanguage === 'es' ? 'Descargar' : currentLanguage === 'ar' ? 'تنزيل' : currentLanguage === 'jv' ? 'Unduh' : 'Download'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-gray-100 font-sans antialiased">

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-900 bg-gray-950/80 backdrop-blur-md px-3 md:px-5 py-2 md:py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="w-8 h-8 flex items-center justify-center bg-gray-900 border border-gray-800 hover:border-purple-500/50 hover:text-purple-400 text-gray-300 rounded-full cursor-pointer transition-all duration-300 text-xs font-semibold"
            title="Privacy and File Limits Info"
          >
            ⓘ
          </button>

          <button
            type="button"
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 flex items-center justify-center bg-gray-900 border border-gray-800 hover:border-purple-500/50 hover:text-purple-400 text-gray-300 rounded-full cursor-pointer transition-all duration-300 text-xs"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen(prev => !prev)}
              className="w-8 h-8 flex items-center justify-center bg-gray-900 border border-gray-850 hover:border-purple-500/50 hover:text-purple-400 text-gray-300 rounded-full cursor-pointer transition-all duration-300 text-sm select-none overflow-hidden"
              title="Change Language"
            >
              {(() => {
                const lang = languages.find(l => l.code === currentLanguage);
                if (lang?.isSubLang) {
                  return (
                    <div className="flex items-center justify-center gap-0.5">
                      <img src={lang.flagUrl} alt="" className="w-3.5 h-2.5 object-cover rounded-sm border border-gray-200/25 dark:border-gray-800/50 shadow-[0_1px_2px_rgba(0,0,0,0.45)] shrink-0" />
                      <span className="text-[8px] text-gray-500 font-bold">&gt;</span>
                      <span className="text-xs shrink-0">{lang.flag}</span>
                    </div>
                  );
                }
                if (lang?.flagUrl) {
                  return <img src={lang.flagUrl} alt={lang.name} className="w-5 h-3.5 object-cover rounded-sm border border-gray-200/25 dark:border-gray-800/50 shadow-[0_1px_2px_rgba(0,0,0,0.45)]" />;
                }
                return lang?.flag;
              })()}
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute left-0 mt-2 w-40 bg-gray-950 border border-gray-850 rounded-xl overflow-y-auto shadow-2xl z-50 animate-fade-in flex flex-col p-1.5 gap-0.5 max-h-64">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setCurrentLanguage(lang.code);
                        setLangOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold cursor-pointer transition-all ${currentLanguage === lang.code
                        ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20'
                        : 'text-gray-400 hover:bg-gray-900/40 border border-transparent'
                        }`}
                    >
                      <span className="text-sm shrink-0 flex items-center justify-start gap-1 w-9">
                        {lang.isSubLang ? (
                          <>
                            <img src={lang.flagUrl} alt="" className="w-4 h-3 object-cover rounded-sm border border-gray-200/25 dark:border-gray-800/50 shadow-[0_1px_2px_rgba(0,0,0,0.45)] shrink-0" />
                            <span className="text-[10px] text-gray-500 font-bold leading-none">&gt;</span>
                            <span className="shrink-0">{lang.flag}</span>
                          </>
                        ) : lang.flagUrl ? (
                          <img src={lang.flagUrl} alt={lang.name} className="w-5 h-3.5 object-cover rounded-sm border border-gray-200/25 dark:border-gray-800/50 shadow-[0_1px_2px_rgba(0,0,0,0.45)]" />
                        ) : (
                          lang.flag
                        )}
                      </span>
                      <span className="truncate">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col text-left">
            <h1 className="text-sm font-extrabold text-gray-100 tracking-wide uppercase leading-none m-0">
              pdf tools
            </h1>
          </div>
        </div>

        {fileName && (
          <div className="hidden sm:flex items-center max-w-[300px] md:max-w-[450px] bg-gray-900 border border-gray-800 rounded-full px-3 py-1 text-[11px] text-gray-300 truncate font-mono">
            {fileName}
          </div>
        )}
        {activeTool === 'cv_maker' && (
          <div className="hidden sm:flex items-center bg-purple-950/40 border border-purple-500/20 rounded-full px-3 py-1 text-[11px] text-purple-400 font-semibold">
            ✨ CV Maker Workspace
          </div>
        )}

        <div className="flex items-center gap-2">
          {originalBytes && (
            <button
              type="button"
              onClick={() => setShowDownloadAllModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white font-semibold text-xs px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-lg shadow-md cursor-pointer transition-all duration-300 flex items-center justify-center gap-1.5"
              title={dictionary[currentLanguage]?.downloadAll || "Download All Versions"}
            >
              ⬇ <span className="hidden sm:inline">{dictionary[currentLanguage]?.downloadAll || "Download All Versions"}</span>
            </button>
          )}
          {(originalBytes || activeTool === 'cv_maker') && (
            <button
              type="button"
              onClick={() => {
                if (activeTool === 'cv_maker') {
                  if (window.confirm(currentLanguage === 'id' ? 'Apakah Anda yakin ingin keluar dari CV Maker?' : 'Are you sure you want to exit CV Maker?')) {
                    setActiveTool(null);
                  }
                } else {
                  setShowCloseConfirm(true);
                }
              }}
              className="text-red-500 hover:text-red-400 text-sm font-semibold px-2 py-1.5 cursor-pointer transition-colors flex items-center justify-center"
              title={activeTool === 'cv_maker' ? "Exit CV Maker" : "Close File"}
            >
              ✖
            </button>
          )}
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {originalBytes && activeVersionIndex !== -1 && activeVersionIndex < versions.length - 1 && (
          <div className="absolute top-0 left-0 w-full bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-500 text-xs sm:text-xs py-1.5 px-3 md:px-6 z-40 flex justify-between items-center backdrop-blur-md">
            <span className="font-medium">You are previewing an older version. New edits will discard forward history.</span>
            <button
              type="button"
              onClick={() => loadVersion(versions.length - 1)}
              className="font-bold underline hover:text-yellow-400 cursor-pointer ml-4 whitespace-nowrap"
            >
              Return to Latest
            </button>
          </div>
        )}

        {/* If no file is loaded, show the Drop Zone and Tool selection dashboard */}
        {!originalBytes && activeTool !== 'cv_maker' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">

            {/* Action selector cards */}
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                {dictionary[currentLanguage]?.appTitle || "Offline PDF Toolbox"}
              </h2>
              <p className="text-gray-400 text-sm mt-2 max-w-lg">
                {dictionary[currentLanguage]?.appDesc}
              </p>
            </div>

            {/* Merge Mode File List dashboard */}
            {activeTool === 'merge' && mergeFiles.length > 0 && (
              <div className="w-full bg-gray-950 border border-gray-900 rounded-xl p-5 mb-6 text-left">
                <div className="flex justify-between items-center mb-4 border-b border-gray-900 pb-2">
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    {dictionary[currentLanguage]?.filesToMerge || "Files to Merge"} ({mergeFiles.length}/10)
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-900/60 border border-gray-850 p-0.5 rounded-lg shrink-0 scale-90 origin-right">
                      <span className="text-[10px] uppercase font-bold text-gray-500 px-2 tracking-wider">Cols:</span>
                      {[1, 2, 5, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setWorkspaceCols(num)}
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${workspaceCols === num
                              ? 'bg-purple-600 text-white shadow'
                              : 'text-gray-400 hover:text-gray-250'
                            }`}
                        >
                          {num === 1 ? '1' : num}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMergeFiles([])}
                      className="text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      {dictionary[currentLanguage]?.clearAll || "Clear All"}
                    </button>
                  </div>
                </div>
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndFile}>
                  <SortableContext items={mergeFiles.map(m => m.id)}>
                    <div className={`grid ${workspaceCols === 1 ? 'grid-cols-1' : workspaceCols === 2 ? 'grid-cols-2' : workspaceCols === 5 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10'} gap-2.5 max-h-[320px] overflow-y-auto pr-1`}>
                      {mergeFiles.map(m => (
                        <SortableFileItem key={m.id} id={m.id} file={m.file} onRemove={removeMergeFile} cols={workspaceCols} />
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
                    {dictionary[currentLanguage]?.mergeAndEdit || "⚡ Merge PDFs & Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeFiles([])}
                    className="bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs px-4 rounded-lg cursor-pointer"
                  >
                    {dictionary[currentLanguage]?.cancel || "Cancel"}
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
                {activeTool === 'merge'
                  ? (dictionary[currentLanguage]?.dropMerge || 'Drop 2–10 PDF files to merge')
                  : (dictionary[currentLanguage]?.dropSingle || 'Drop your PDF file here')}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">
                {dictionary[currentLanguage]?.orBrowse || "or click to browse local files"}
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
            <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-3.5">
              {[
                { id: 'merge', label: dictionary[currentLanguage]?.tool_merge || '🔀 Merge PDFs', desc: dictionary[currentLanguage]?.combineFilesDesc || 'Combine 2-10 files' },
                { id: 'reorder', label: dictionary[currentLanguage]?.tool_reorder || '📋 Reorder', desc: dictionary[currentLanguage]?.rearrangePagesDesc || 'Rearrange pages' },
                { id: 'extract_pages', label: dictionary[currentLanguage]?.tool_extract_pages || '✂️ Extract Pages', desc: dictionary[currentLanguage]?.separateRangeDesc || 'Separate range subset' },
                { id: 'link', label: dictionary[currentLanguage]?.tool_link || '🔗 Link Area', desc: dictionary[currentLanguage]?.drawHyperlinkDesc || 'Draw clickable hyperlink' },
                { id: 'stamp', label: dictionary[currentLanguage]?.tool_stamp || '🖼️ PNG Stamp', desc: dictionary[currentLanguage]?.placeStampDesc || 'Place transparent stamp' },
                { id: 'text', label: dictionary[currentLanguage]?.tool_text || '🔤 Add Text', desc: dictionary[currentLanguage]?.addCustomTextDesc || 'Type custom texts' },
                { id: 'image', label: dictionary[currentLanguage]?.tool_image || '🖼️ Add Image', desc: dictionary[currentLanguage]?.addImageAssetsDesc || 'Place jpg/png assets' },
                { id: 'extract_images', label: dictionary[currentLanguage]?.tool_extract_images || '🖼️ Extract Img', desc: dictionary[currentLanguage]?.extractAssetsDesc || 'Download PDF assets' },
                { id: 'cv_maker', label: dictionary[currentLanguage]?.tool_cv_maker || '📄 CV Maker', desc: dictionary[currentLanguage]?.cvMakerDesc || 'Create A4 resume from Markdown or form' },
              ].map(tool => (
                <button
                  type="button"
                  key={tool.id}
                  onClick={() => {
                    if (tool.id === 'merge') {
                      setActiveTool('merge');
                    } else if (tool.id === 'cv_maker') {
                      setActiveTool('cv_maker');
                    } else {
                      setActiveTool(tool.id === 'link' || tool.id === 'stamp' || tool.id === 'text' || tool.id === 'image' ? 'overlays' : tool.id);
                      if (tool.id === 'link' || tool.id === 'stamp' || tool.id === 'text' || tool.id === 'image') {
                        setOverlayTool(tool.id);
                      }
                      triggerFileSelect();
                    }
                  }}
                  className={`bg-gray-950 border border-gray-900 rounded-xl p-4 text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-500/50 hover:bg-gray-900/30 ${activeTool === tool.id ? 'border-purple-500 bg-gray-900/50 shadow-lg shadow-purple-500/5' : ''
                    }`}
                >
                  <span className="text-sm font-bold text-gray-200 block">{tool.label}</span>
                  <span className="text-xs text-gray-500 mt-1 block leading-tight">{tool.desc}</span>
                </button>
              ))}
            </div>

          </div>
        ) : activeTool === 'cv_maker' ? (
          <CVMaker 
            currentLanguage={currentLanguage} 
            onBack={() => setActiveTool(null)}
            onLoadPDF={async (pdfBytes, filename) => {
              setLoading(true);
              setLoadingMsg('Loading compiled PDF...');
              try {
                setFileName(filename);
                setOriginalBytes(pdfBytes);
                const doc = await loadPdfDoc(pdfBytes);
                setPdfjsDoc(doc);
                setTotalPages(doc.numPages);
                setVersions([{ id: 'orig', label: 'CV PDF Generated', ops: [] }]);
                setActiveVersionIndex(0);
                const initialOrder = Array.from({ length: doc.numPages }, (_, i) => i);
                setPageOrder(initialOrder);
                // Switch active tool to 'overlays' so the user is directly in the PDF Editor with this PDF!
                setActiveTool('overlays');
                // Set default overlay tool to 'link' or similar
                setOverlayTool('link');
              } catch (err) {
                console.error(err);
                alert('Error loading compiled PDF: ' + err.message);
              } finally {
                setLoading(false);
              }
            }}
          />
        ) : (

          // Workspace layouts once PDF is loaded
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

            {/* LEFT COLUMN: PDF Page Previews and drawing canvases */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-gray-900/40 border-r border-gray-900">

              {/* Frozen Zoom Toolbar */}
              {activeTool !== 'reorder' && (
                <div className="w-full bg-gray-950/80 backdrop-blur-md border-b border-gray-900 px-4 py-2 flex items-center justify-center gap-4 z-20 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(100)}
                    disabled={zoomLevel === 100}
                    className={`text-xs font-bold whitespace-nowrap w-[90px] text-left transition-colors ${zoomLevel === 100 ? 'text-gray-400 cursor-default' : 'text-blue-400 hover:text-blue-300 cursor-pointer'}`}
                  >
                    {zoomLevel === 100 ? (dictionary[currentLanguage]?.zoomLabel || '🔍 Zoom') : (dictionary[currentLanguage]?.resetZoom || '🔄 Reset Zoom')}
                  </button>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                    className="w-full max-w-[200px] h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <span className="text-xs font-bold text-gray-300 w-10 text-right mr-2">{zoomLevel}%</span>

                  {/* Editable Page Input Box / Total Pages */}
                  <div className="flex items-center gap-1.5 bg-gray-900/60 border border-gray-800 px-2 py-0.5 rounded-lg shrink-0">
                    <input
                      ref={pageInputRef}
                      type="text"
                      value={pageInputVal}
                      onChange={(e) => setPageInputVal(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          let val = parseInt(pageInputVal, 10);
                          if (isNaN(val) || val < 1) val = 1;
                          if (val > totalPages) val = totalPages;
                          setPageInputVal(String(val));
                          jumpToPage(val);
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={() => {
                        let val = parseInt(pageInputVal, 10);
                        if (isNaN(val) || val < 1) val = 1;
                        if (val > totalPages) val = totalPages;
                        setPageInputVal(String(val));
                        jumpToPage(val);
                      }}
                      className="w-8 bg-gray-950 text-center text-xs font-bold text-purple-400 focus:outline-none border border-gray-800 rounded focus:border-purple-500 py-0.5"
                    />
                    <span className="text-xs font-bold text-gray-500 select-none">/ {totalPages}</span>
                  </div>
                </div>
              )}

              <div
                className="flex-1 overflow-auto p-4 md:p-10 flex flex-col gap-8 pb-28 md:pb-10"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onScroll={handleScroll}
                style={{ touchAction: 'pan-x pan-y' }}
              >

                {/* Tool Merging & Page Reordering sortable list */}
                {activeTool === 'reorder' ? (
                  <div className="w-full max-w-full">
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-left">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{dictionary[currentLanguage]?.tool_reorder || "Reorder Pages"}</span>
                        <h3 className="text-lg font-bold text-gray-200">{dictionary[currentLanguage]?.dragRearrange || "Drag thumbnails to rearrange"}</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-gray-900/60 border border-gray-855 p-0.5 rounded-lg shrink-0 scale-90 origin-right">
                          <span className="text-[10px] uppercase font-bold text-gray-500 px-2 tracking-wider">Cols:</span>
                          {[1, 2, 5, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setWorkspaceCols(num)}
                              className={`px-2.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${workspaceCols === num
                                  ? 'bg-purple-600 text-white shadow'
                                  : 'text-gray-400 hover:text-gray-250'
                                }`}
                            >
                              {num === 1 ? '1' : num}
                            </button>
                          ))}
                        </div>
                        <div className="hidden md:flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveReorder}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer"
                          >
                            {dictionary[currentLanguage]?.applyAndSave?.replace(" Version", "") || "Apply & Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTool(null)}
                            className="bg-gray-900 border border-gray-800 text-xs px-4 rounded-lg cursor-pointer"
                          >
                            {dictionary[currentLanguage]?.cancel || "Cancel"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndPage} sensors={sensors}>
                      <SortableContext items={pageOrder} strategy={rectSortingStrategy}>
                        <div className={`grid ${workspaceCols === 1 ? 'grid-cols-1' : workspaceCols === 2 ? 'grid-cols-2' : workspaceCols === 5 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10'} gap-3 sm:gap-4 md:gap-5`}>
                          {pageOrder.map((pageIdx) => (
                            <SortablePageThumbnail
                              key={pageIdx}
                              id={pageIdx}
                              index={pageIdx}
                              totalPages={totalPages}
                              renderTrigger={renderTrigger}
                              pdfDoc={pdfjsDoc}
                              pageWord={dictionary[currentLanguage]?.pageWord || "Page"}
                              onPreview={setPreviewPageIdx}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                ) : activeTool === 'extract_pages' ? (
                  <div className="w-full max-w-full">
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-left">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{dictionary[currentLanguage]?.tool_extract_pages || "Extract Pages"}</span>
                        <h3 className="text-lg font-bold text-gray-200">Select pages to extract</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-gray-900/60 border border-gray-855 p-0.5 rounded-lg shrink-0 scale-90 origin-right">
                          <span className="text-[10px] uppercase font-bold text-gray-500 px-2 tracking-wider">Cols:</span>
                          {[1, 2, 5, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setWorkspaceCols(num)}
                              className={`px-2.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${workspaceCols === num
                                  ? 'bg-purple-600 text-white shadow'
                                  : 'text-gray-400 hover:text-gray-250'
                                }`}
                            >
                              {num === 1 ? '1' : num}
                            </button>
                          ))}
                        </div>
                        <div className="hidden md:flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveExtractPages}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer"
                          >
                            {dictionary[currentLanguage]?.applyAndSave?.replace(" Version", "") || "Apply & Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTool(null)}
                            className="bg-gray-900 border border-gray-800 text-xs px-4 rounded-lg cursor-pointer"
                          >
                            {dictionary[currentLanguage]?.cancel || "Cancel"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={`grid ${workspaceCols === 1 ? 'grid-cols-1' : workspaceCols === 2 ? 'grid-cols-2' : workspaceCols === 5 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10'} gap-3 sm:gap-4 md:gap-5`}>
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <ExtractPageThumbnail
                          key={idx}
                          index={idx}
                          pdfDoc={pdfjsDoc}
                          renderTrigger={renderTrigger}
                          isSelected={isPageSelectedForExtract(idx)}
                          onToggle={() => toggleExtractPage(idx)}
                          pageWord={dictionary[currentLanguage]?.pageWord || "Page"}
                        />
                      ))}
                    </div>
                  </div>
                ) : activeTool === 'extract_images' && extractedImages.length > 0 ? (
                  // Image extractor thumbnails view
                  <div className="w-full max-w-full text-left">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{dictionary[currentLanguage]?.extractedImagesTitle || "Image Extractor"}</span>
                        <h3 className="text-lg font-bold text-gray-200">{dictionary[currentLanguage]?.extractedImagesCount || "Extracted Images"} ({extractedImages.length})</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-gray-900/60 border border-gray-855 p-0.5 rounded-lg shrink-0 scale-90 origin-right">
                          <span className="text-[10px] uppercase font-bold text-gray-500 px-2 tracking-wider">Cols:</span>
                          {[1, 2, 5, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setWorkspaceCols(num)}
                              className={`px-2.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${workspaceCols === num
                                  ? 'bg-purple-600 text-white shadow'
                                  : 'text-gray-400 hover:text-gray-250'
                                }`}
                            >
                              {num === 1 ? '1' : num}
                            </button>
                          ))}
                        </div>
                        <div className="hidden md:flex gap-2">
                          <button
                            type="button"
                            onClick={downloadAllImagesZip}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer"
                          >
                            {dictionary[currentLanguage]?.downloadZip || "📦 Download all ZIP"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExtractedImages([])}
                            className="bg-gray-900 border border-gray-800 text-xs px-4 rounded-lg cursor-pointer"
                          >
                            {dictionary[currentLanguage]?.back || "Back"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={`grid ${workspaceCols === 1 ? 'grid-cols-1' : workspaceCols === 2 ? 'grid-cols-2' : workspaceCols === 5 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10'} gap-4`}>
                      {extractedImages.map((img, idx) => (
                        <div key={idx} className="bg-gray-950 border border-gray-900 rounded-xl p-3 flex flex-col">
                          <img src={img.dataUrl} alt={img.name} className="max-h-[140px] w-full object-contain bg-gray-900 rounded" />
                          <span className="text-xs text-gray-400 mt-2 truncate font-mono">{img.name}</span>
                          <a
                            href={img.dataUrl}
                            download={img.name}
                            className="mt-2 block w-full text-center bg-gray-900 hover:bg-gray-850 border border-gray-850 hover:border-gray-800 text-purple-400 font-semibold text-xs py-1.5 rounded transition-colors"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Default View: Scrollable vertical stack of rendered PDF page canvas
                  <div
                    className="flex flex-col gap-6 origin-top transition-all duration-75 mx-auto"
                    style={{ width: `${zoomLevel}%`, maxWidth: `${6.2 * zoomLevel}px` }}
                  >
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
                        className="pdf-page-container w-full relative bg-white border border-gray-800 shadow-xl overflow-hidden cursor-crosshair group"
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
                                      <div className="bg-blue-600/90 text-xs text-white px-1.5 py-0.5 truncate font-mono w-full leading-none">
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
                                          <div className="text-xs font-bold text-purple-400 bg-black/60 px-1 py-0.5 rounded truncate max-w-[80%] font-mono leading-none">
                                            Stamp Logo
                                          </div>
                                        ) : (
                                          <span className="text-xs text-gray-500 font-bold">Stamp</span>
                                        )}
                                      </div>
                                    )}

                                    {ov.type === 'image' && (
                                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                        <div className="text-xs font-bold text-gray-300 bg-black/60 px-1 py-0.5 rounded truncate max-w-[80%] font-mono leading-none">
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
                                        className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-red-600 border border-white hover:bg-red-700 text-white font-bold text-xs rounded-full flex items-center justify-center shadow transition-colors"
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
            </div>

            {/* Desktop Sidebar (hidden on mobile viewports) */}
            <aside className="hidden md:flex w-80 bg-gray-950 border-l border-gray-900 flex-col h-full overflow-hidden">
              {renderSidebarContent()}
            </aside>

            {/* Backdrop for Mobile Drawer */}
            {isMobileDrawerOpen && (
              <div
                className="fixed inset-0 bg-black/60 z-30 md:hidden animate-fade-in"
                onClick={() => setIsMobileDrawerOpen(false)}
              />
            )}

            {/* Mobile Drawer (visible on mobile, animated slide up) */}
            <div
              className={`fixed bottom-0 left-0 right-0 z-40 bg-gray-950 border-t border-gray-900 rounded-t-2xl shadow-2xl transition-transform duration-300 max-h-[75vh] flex flex-col md:hidden ${isMobileDrawerOpen ? 'translate-y-0' : 'translate-y-full'
                }`}
            >
              {/* Drawer handle bar */}
              <div
                className="flex items-center justify-center py-3 border-b border-gray-900 cursor-pointer"
                onClick={() => setIsMobileDrawerOpen(false)}
              >
                <div className="w-12 h-1.5 bg-gray-800 rounded-full" />
              </div>
              <div className="flex-1 overflow-y-auto pb-6">
                {renderSidebarContent()}
              </div>
            </div>

            {/* Mobile Sticky Bottom Action Bar */}
            {!isMobileDrawerOpen && (
              <div className={`fixed bottom-0 left-0 right-0 z-20 bg-gray-950/95 backdrop-blur-md border-t border-gray-900 px-4 flex md:hidden ${!activeTool ? 'py-3 flex-col gap-2' : 'h-16 items-center justify-between'}`}>
                {!activeTool ? (
                  <>
                    <div className="text-xs text-gray-500 w-full text-left font-medium">
                      Current Active Version:
                    </div>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => setIsMobileDrawerOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-3 py-2 rounded-lg cursor-pointer shrink-0"
                      >
                        🛠️ Tools
                      </button>
                      <span className="text-xs font-bold text-gray-300 truncate flex-1 text-center">
                        {versions[activeVersionIndex]?.label || 'Original PDF'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileDrawerOpen(true);
                          setTimeout(() => {
                            const list = document.getElementById('version-history-list');
                            if (list) list.scrollTop = list.scrollHeight;
                          }, 300);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        ⬇ Download
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                        {activeTool === 'reorder' && 'Reorder'}
                        {activeTool === 'extract_pages' && 'Extract'}
                        {activeTool === 'extract_images' && 'Images'}
                        {activeTool === 'overlays' && `${overlayTool.toUpperCase()}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {['overlays', 'extract_pages', 'extract_images'].includes(activeTool) && (
                        <button
                          type="button"
                          onClick={() => setIsMobileDrawerOpen(true)}
                          className="bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1"
                        >
                          ⚙️ Config
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (activeTool === 'reorder') handleSaveReorder();
                          else if (activeTool === 'extract_pages') handleSaveExtractPages();
                          else if (activeTool === 'overlays') handleSaveOverlays();
                        }}
                        disabled={activeTool === 'extract_images'}
                        className={`bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-3 py-2 rounded-lg cursor-pointer ${activeTool === 'extract_images' ? 'hidden' : ''
                          }`}
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (activeTool === 'overlays') {
                            setOverlays([]);
                            setSelectedOverlayIdx(null);
                          } else if (activeTool === 'extract_images') {
                            setExtractedImages([]);
                          }
                          setActiveTool(null);
                        }}
                        className="bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 text-xs px-3 py-2 rounded-lg cursor-pointer"
                      >
                        {activeTool === 'extract_images' ? (dictionary[currentLanguage]?.back || 'Back') : (dictionary[currentLanguage]?.cancel || 'Cancel')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* CLOSE FILE CONFIRMATION MODAL */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 animate-fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-sm w-full p-6 text-left shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">{dictionary[currentLanguage]?.closeFileTitle || "Close File?"}</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                {dictionary[currentLanguage]?.closeFileDesc || "Are you sure you want to close this file? Any unsaved changes will be lost."}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCloseConfirm(false);
                  resetFileState();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {dictionary[currentLanguage]?.closeFileBtn || "Close File"}
              </button>
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {dictionary[currentLanguage]?.cancel || "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WARNING MODAL SHEET: Confirm Branch split */}
      {warningVersionIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 animate-fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-sm w-full p-6 text-left shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-full flex items-center justify-center text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">{dictionary[currentLanguage]?.warningDiscardTitle || "Discard Forward Versions?"}</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                {dictionary[currentLanguage]?.warningDiscardDesc || "Editing an older version will split the version history tree. Future versions beyond this point will be discarded."} ({versions[warningVersionIndex]?.id})
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmBranchSplit}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {dictionary[currentLanguage]?.continueEdit || "Continue & Edit"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setWarningVersionIndex(null);
                  setTempNextOp(null);
                }}
                className="flex-1 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {dictionary[currentLanguage]?.cancel || "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT & LIMITS INFO DIALOG */}
      {infoOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 flex justify-center items-start animate-fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col my-auto md:my-8 shrink-0">
            <div className="bg-gray-900 border-b border-gray-850 p-4 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                {dictionary[currentLanguage]?.specsTitle || "ⓘ PDF Tool Specifications & Q&A"}
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
              {/* ACCORDION 1: File Size Limits */}
              <div className="flex flex-col border border-gray-900 rounded-xl overflow-hidden bg-gray-900/10">
                <button
                  type="button"
                  onClick={() => setExpandedAccordions(prev => prev.includes('limits') ? prev.filter(x => x !== 'limits') : [...prev, 'limits'])}
                  className="w-full flex items-center justify-between text-left p-3 hover:bg-gray-900/30 transition-all font-bold text-gray-300"
                >
                  <span className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {dictionary[currentLanguage]?.limits || "File Size Limits"}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${expandedAccordions.includes('limits') ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {expandedAccordions.includes('limits') && (
                  <div className="p-3 border-t border-gray-900/60 bg-gray-950/40 text-gray-400 text-[11px] leading-relaxed">
                    {(dictionary[currentLanguage]?.limitsDesc || "").split('\n').map((line, lIdx) => (
                      <React.Fragment key={lIdx}>{line}<br /></React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* ACCORDION 2: Privacy Protection */}
              <div className="flex flex-col border border-gray-900 rounded-xl overflow-hidden bg-gray-900/10">
                <button
                  type="button"
                  onClick={() => setExpandedAccordions(prev => prev.includes('privacy') ? prev.filter(x => x !== 'privacy') : [...prev, 'privacy'])}
                  className="w-full flex items-center justify-between text-left p-3 hover:bg-gray-900/30 transition-all font-bold text-gray-300"
                >
                  <span className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {dictionary[currentLanguage]?.privacy || "Privacy Protection"}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${expandedAccordions.includes('privacy') ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {expandedAccordions.includes('privacy') && (
                  <div className="p-3 border-t border-gray-900/60 bg-gray-950/40 text-gray-400 text-[11px] leading-relaxed">
                    {dictionary[currentLanguage]?.privacyDesc}
                  </div>
                )}
              </div>

              {/* ACCORDION 3: Temporary Session History */}
              <div className="flex flex-col border border-gray-900 rounded-xl overflow-hidden bg-gray-900/10">
                <button
                  type="button"
                  onClick={() => setExpandedAccordions(prev => prev.includes('session') ? prev.filter(x => x !== 'session') : [...prev, 'session'])}
                  className="w-full flex items-center justify-between text-left p-3 hover:bg-gray-900/30 transition-all font-bold text-gray-300"
                >
                  <span className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {dictionary[currentLanguage]?.session || "Temporary Session History"}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${expandedAccordions.includes('session') ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {expandedAccordions.includes('session') && (
                  <div className="p-3 border-t border-gray-900/60 bg-gray-950/40 text-gray-400 text-[11px] leading-relaxed">
                    {dictionary[currentLanguage]?.sessionDesc}
                  </div>
                )}
              </div>

              {/* ACCORDION 4: Project Info & Tech Stack */}
              <div className="flex flex-col border border-gray-900 rounded-xl overflow-hidden bg-gray-900/10">
                <button
                  type="button"
                  onClick={() => setExpandedAccordions(prev => prev.includes('tech') ? prev.filter(x => x !== 'tech') : [...prev, 'tech'])}
                  className="w-full flex items-center justify-between text-left p-3 hover:bg-gray-900/30 transition-all font-bold text-gray-300"
                >
                  <span className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {dictionary[currentLanguage]?.tech || "Project Info & Tech Stack"}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${expandedAccordions.includes('tech') ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {expandedAccordions.includes('tech') && (
                  <div className="p-3 border-t border-gray-900/60 bg-gray-950/40 text-gray-400 text-[11px] leading-relaxed">
                    {dictionary[currentLanguage]?.techDesc} <br />
                    <a href="https://github.com/pakcli/client-side-pdf-editor" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline mt-1.5 inline-block font-bold">
                      Source Code on GitHub
                    </a>
                  </div>
                )}
              </div>

              {/* Q&A Section Accordion */}
              <div className="flex flex-col border border-gray-900 rounded-xl overflow-hidden bg-gray-900/10">
                <button
                  type="button"
                  onClick={() => setFaqOpen(prev => !prev)}
                  className="w-full flex items-center justify-between text-left p-3 hover:bg-gray-900/30 transition-all font-bold text-gray-300"
                >
                  <span className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h2v-2.172a5 5 0 01-.012 0z" />
                    </svg>
                    {dictionary[currentLanguage]?.faqTitle || "Frequently Asked Questions (Q&A)"}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${faqOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {faqOpen && (
                  <div className="p-3 border-t border-gray-900/60 bg-gray-950/40 flex flex-col gap-3">
                    {/* Q1 */}
                    <div className="flex flex-col border border-gray-900 rounded-xl overflow-hidden bg-gray-900/10">
                      <button
                        type="button"
                        onClick={() => setExpandedAccordions(prev => prev.includes('q1') ? prev.filter(x => x !== 'q1') : [...prev, 'q1'])}
                        className="w-full flex items-center justify-between text-left p-3 hover:bg-gray-900/30 transition-all font-bold text-gray-300"
                      >
                        <span>{dictionary[currentLanguage]?.q1}</span>
                        <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${expandedAccordions.includes('q1') ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {expandedAccordions.includes('q1') && (
                        <div className="p-3 border-t border-gray-900/60 bg-gray-950/40 text-gray-450 text-[11px] leading-relaxed">
                          {dictionary[currentLanguage]?.a1}
                        </div>
                      )}
                    </div>

                    {/* Q2 */}
                    <div className="flex flex-col border border-gray-900 rounded-xl overflow-hidden bg-gray-900/10">
                      <button
                        type="button"
                        onClick={() => setExpandedAccordions(prev => prev.includes('q2') ? prev.filter(x => x !== 'q2') : [...prev, 'q2'])}
                        className="w-full flex items-center justify-between text-left p-3 hover:bg-gray-900/30 transition-all font-bold text-gray-300"
                      >
                        <span>{dictionary[currentLanguage]?.q2}</span>
                        <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${expandedAccordions.includes('q2') ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {expandedAccordions.includes('q2') && (
                        <div className="p-3 border-t border-gray-900/60 bg-gray-950/40 text-gray-450 text-[11px] leading-relaxed">
                          <ol className="list-decimal pl-4 flex flex-col gap-1">
                            <li>{dictionary[currentLanguage]?.a2_1 || "Upload: The PDF is parsed locally using PDF.js."}</li>
                            <li>{dictionary[currentLanguage]?.a2_2 || "Editing: Edits are tracked as logs."}</li>
                            <li>{dictionary[currentLanguage]?.a2_3 || "Reconstruction: pdf-lib compiles the PDF."}</li>
                            <li>{dictionary[currentLanguage]?.a2_4 || "Download: Local Blob URL download."}</li>
                          </ol>
                        </div>
                      )}
                    </div>

                    {/* Q3 */}
                    <div className="flex flex-col border border-gray-900 rounded-xl overflow-hidden bg-gray-900/10">
                      <button
                        type="button"
                        onClick={() => setExpandedAccordions(prev => prev.includes('q3') ? prev.filter(x => x !== 'q3') : [...prev, 'q3'])}
                        className="w-full flex items-center justify-between text-left p-3 hover:bg-gray-900/30 transition-all font-bold text-gray-300"
                      >
                        <span>{dictionary[currentLanguage]?.q3}</span>
                        <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${expandedAccordions.includes('q3') ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {expandedAccordions.includes('q3') && (
                        <div className="p-3 border-t border-gray-900/60 bg-gray-950/40 text-gray-455 text-[11px] leading-relaxed">
                          {dictionary[currentLanguage]?.a3}
                        </div>
                      )}
                    </div>

                    {/* Q4 */}
                    <div className="flex flex-col border border-gray-900 rounded-xl overflow-hidden bg-gray-900/10">
                      <button
                        type="button"
                        onClick={() => setExpandedAccordions(prev => prev.includes('q4') ? prev.filter(x => x !== 'q4') : [...prev, 'q4'])}
                        className="w-full flex items-center justify-between text-left p-3 hover:bg-gray-900/30 transition-all font-bold text-gray-300"
                      >
                        <span>{dictionary[currentLanguage]?.q4}</span>
                        <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${expandedAccordions.includes('q4') ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {expandedAccordions.includes('q4') && (
                        <div className="p-3 border-t border-gray-900/60 bg-gray-950/40 text-gray-455 text-[11px] leading-relaxed">
                          {dictionary[currentLanguage]?.a4}
                        </div>
                      )}
                    </div>

                    {/* Q5 */}
                    <div className="flex flex-col border border-gray-900 rounded-xl overflow-hidden bg-gray-900/10">
                      <button
                        type="button"
                        onClick={() => setExpandedAccordions(prev => prev.includes('q5') ? prev.filter(x => x !== 'q5') : [...prev, 'q5'])}
                        className="w-full flex items-center justify-between text-left p-3 hover:bg-gray-900/30 transition-all font-bold text-gray-300"
                      >
                        <span>{dictionary[currentLanguage]?.q5}</span>
                        <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${expandedAccordions.includes('q5') ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {expandedAccordions.includes('q5') && (
                        <div className="p-3 border-t border-gray-900/60 bg-gray-950/40 text-gray-455 text-[11px] leading-relaxed">
                          {dictionary[currentLanguage]?.a5}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-900 border-t border-gray-850 p-4 text-center shrink-0">
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="bg-gray-800 hover:bg-gray-750 text-purple-400 font-bold text-xs px-5 py-2 rounded-lg cursor-pointer transition-colors"
              >
                {dictionary[currentLanguage]?.closeSheet || "Close Info Sheet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOWNLOAD ALL VERSIONS MODAL */}
      {showDownloadAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 animate-fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-sm w-full p-6 text-left shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full flex items-center justify-center text-xl">
              ⬇
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">Download All Versions</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Choose how you would like to download all the version history files:
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDownloadAllModal(false);
                  downloadAllVersionsZip();
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                📦 Download ZIP (All-in-One)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDownloadAllModal(false);
                  downloadEachVersionIndividually();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                📄 Download Individually (Sequential)
              </button>
              <button
                type="button"
                onClick={() => setShowDownloadAllModal(false)}
                className="w-full bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PAGE PREVIEW MODAL */}
      {previewPageIdx !== null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-6 animate-fade-in select-none">
          {/* Close Backdrop Click */}
          <div className="absolute inset-0" onClick={() => setPreviewPageIdx(null)} />

          {/* Modal Content */}
          <div className="relative z-10 bg-gray-950 border border-gray-800 rounded-2xl max-w-xl md:max-w-2xl w-full flex flex-col overflow-hidden shadow-2xl h-[90vh]">

            {/* Modal Header */}
            <div className="p-4 border-b border-gray-900 bg-gray-900/10 flex items-center justify-between shrink-0">
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
                  {dictionary[currentLanguage]?.tool_reorder || "Reorder Pages"} — Preview
                </span>
                <h3 className="text-sm font-bold text-gray-200">
                  {dictionary[currentLanguage]?.pageWord || "Page"} {previewPageIdx + 1} / {totalPages}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPageIdx(null)}
                className="w-8 h-8 flex items-center justify-center bg-gray-900 border border-gray-850 hover:border-red-500/50 hover:text-red-400 text-gray-300 rounded-full cursor-pointer font-bold transition-all text-xs"
                title="Close Preview"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Scrollable canvas render */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-900/10">
              <div className="bg-white rounded-lg shadow-2xl overflow-hidden max-w-full">
                <canvas ref={modalCanvasRef} className="block max-w-full h-auto object-contain" />
              </div>
            </div>

            {/* Modal Footer: Navigation */}
            <div className="p-4 border-t border-gray-900 bg-gray-900/10 flex items-center justify-between shrink-0 gap-3">
              <button
                type="button"
                disabled={previewPageIdx === 0}
                onClick={() => setPreviewPageIdx(prev => prev - 1)}
                className="bg-gray-900 hover:bg-gray-850 border border-gray-850 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
              >
                ◀ Previous
              </button>

              <button
                type="button"
                onClick={() => setPreviewPageIdx(null)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg cursor-pointer transition-colors"
              >
                Close Preview
              </button>

              <button
                type="button"
                disabled={previewPageIdx === totalPages - 1}
                onClick={() => setPreviewPageIdx(prev => prev + 1)}
                className="bg-gray-900 hover:bg-gray-850 border border-gray-850 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
              >
                Next ▶
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
