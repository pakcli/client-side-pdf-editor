import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PDFDocument, rgb, StandardFonts, PDFName, PDFString } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Default templates from developer_brief.md
const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CV - {{NAME}}</title>
    <link rel='stylesheet' href='https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css'>
    <link rel='stylesheet' href='https://cdn-uicons.flaticon.com/2.6.0/uicons-brands/css/uicons-brands.css'>
</head>
<body>
    <div class="a4-page">
        <!-- HEADER UTAMA -->
        <div class="cv-header">
            <div class="name-container">
                <div class="vertical-bar"></div>
                <div class="name-block">
                    <h1>{{NAME}}</h1>
                    <div class="job-title">{{ROLE}}</div>
                </div>
            </div>
            <div class="contact-info">
                {{CONTACT_INFO}}
            </div>
        </div>

        <!-- CAREER OBJECTIVE -->
        <div class="cv-section">
            <div class="section-title">Career Objective</div>
            <div class="section-content">
                <p>{{CAREER_OBJECTIVE}}</p>
            </div>
        </div>

        <!-- {{SECTION_EXPERIENCE}} -->
        <!-- WORK EXPERIENCE -->
        <div class="cv-section">
            <div class="section-title">Work Experience</div>
            <div class="section-content">
                <!-- {{LOOP_EXPERIENCE}} -->
                <div class="experience-item">
                    <div class="item-header">
                        <span class="item-title">{{TITLE}}, <span class="item-org">{{ORGANIZATION}}</span></span>
                        <span class="item-timeline">{{DATE_START}} - {{DATE_END}}</span>
                    </div>
                    <div class="item-meta">{{WORK_TYPE}} | {{PLACE}}</div>
                    <div class="item-desc">{{DESCRIPTION}}</div>
                </div>
                <!-- {{END_LOOP_EXPERIENCE}} -->
            </div>
        </div>
        <!-- {{END_SECTION_EXPERIENCE}} -->

        <!-- {{SECTION_EDUCATION}} -->
        <!-- EDUCATION -->
        <div class="cv-section">
            <div class="section-title">Education</div>
            <div class="section-content">
                <!-- {{LOOP_EDUCATION}} -->
                <div class="education-item">
                    <div class="item-header">
                        <span class="item-title">{{TITLE}} | <span class="item-org">{{ORGANIZATION}}</span></span>
                        <span class="item-timeline">{{DATE_START}} - {{DATE_END}}</span>
                    </div>
                    <div class="item-meta">GPA/Nilai: {{NILAI}}</div>
                    <div class="item-desc">{{DESCRIPTION}}</div>
                </div>
                <!-- {{END_LOOP_EDUCATION}} -->
            </div>
        </div>
        <!-- {{END_SECTION_EDUCATION}} -->

        <!-- {{SECTION_ACHIEVEMENT}} -->
        <!-- ACHIEVEMENTS & CERTIFICATIONS -->
        <div class="cv-section">
            <div class="section-title">Achievements & Certifications</div>
            <div class="section-content">
                <!-- {{LOOP_ACHIEVEMENT}} -->
                <div class="achievement-item">
                    <div class="item-header">
                        <span class="item-title">{{TITLE}}</span>
                        <span class="item-timeline">{{DATE_START}}</span>
                    </div>
                    <div class="item-meta">Penerbit: {{ORGANIZATION}} | Skor: {{NILAI}}</div>
                    <div class="item-desc">{{DESCRIPTION}}</div>
                </div>
                <!-- {{END_LOOP_ACHIEVEMENT}} -->
            </div>
        </div>
        <!-- {{END_SECTION_ACHIEVEMENT}} -->
    </div>
</body>
</html>`;

const DEFAULT_CSS_TEMPLATE = `/* RESET & FONTS */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,600;1,400&display=swap');

:root {
    --text-primary: #333333;
    --text-secondary: #555555;
    --gray-bg: #e2e8f0;
    --bar-color: #333333;
    --font-serif: 'Playfair Display', Georgia, serif;
    --font-sans: 'Inter', Helvetica, sans-serif;
}

body {
    margin: 0;
    padding: 0;
    color: var(--text-primary);
    background-color: #f7fafc;
}

/* KERTAS PRATINJAU A4 */
.a4-page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 20mm 15mm;
    background-color: #ffffff;
    box-sizing: border-box;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

/* HEADER STYLE (GAURAV CHEEMA STYLE) */
.cv-header {
    margin-bottom: 25px;
    text-align: center;
}

.name-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
    gap: 15px;
}

.vertical-bar {
    width: 3px;
    height: 45px;
    background-color: var(--bar-color);
}

.name-block {
    text-align: left;
}

.name-block h1 {
    font-family: var(--font-serif);
    font-size: 32px;
    margin: 0;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.job-title {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 2px;
    color: var(--text-secondary);
    margin-top: 3px;
    text-transform: uppercase;
}

.contact-info {
    font-family: var(--font-sans);
    font-size: 12px;
    color: var(--text-secondary);
    letter-spacing: 0.2px;
}

/* SEKSI LAYOUT */
.cv-section {
    margin-bottom: 22px;
    page-break-inside: avoid;
}

.section-title {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    background-color: #eaeaea; /* Light gray block header */
    padding: 5px 10px;
    letter-spacing: 1.5px;
    margin-bottom: 12px;
    color: #222;
}

.section-content {
    font-family: var(--font-sans);
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-primary);
    padding: 0 5px;
}

/* ITEM DETAIL LAYOUT */
.experience-item, .education-item, .achievement-item {
    margin-bottom: 14px;
    page-break-inside: avoid;
}

.item-header {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    font-size: 13.5px;
    margin-bottom: 2px;
}

.item-title {
    color: #2d3748;
}

.item-org {
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    font-size: 12px;
}

.item-timeline {
    font-size: 12.5px;
    color: #2d3748;
}

.item-meta {
    font-size: 12px;
    font-style: italic;
    color: var(--text-secondary);
    margin-bottom: 4px;
}

.item-desc {
    font-size: 12.5px;
    color: var(--text-primary);
}

/* Bullet list styling dalam deskripsi */
.item-desc ul {
    margin: 5px 0 0 20px;
    padding: 0;
}

.item-desc li {
    margin-bottom: 3px;
}

/* ATURAN CETAK (PRINT RULES) */
@media print {
    body {
        background-color: #ffffff;
        color: #000000;
    }
    
    .a4-page {
        box-shadow: none;
        padding: 0;
        margin: 0;
        width: 100%;
        min-height: auto;
    }
    
    /* Mencegah pemotongan elemen di tengah halaman */
    .cv-section {
        page-break-inside: avoid;
    }
}`;

const AI_PROMPT_TEXT = `Buatkan saya template resume/CV berstandar A4 menggunakan HTML dan CSS murni yang kompatibel dengan parser regex sederhana. Ikuti aturan wajib berikut:

1. Gunakan tag placeholder tunggal ini untuk data profil utama:
   - {{NAME}} untuk Nama Lengkap
   - {{ROLE}} untuk Judul Pekerjaan Utama
   - {{CONTACT_INFO}} untuk baris kontak (telepon, email, lokasi, link)
   - {{CAREER_OBJECTIVE}} untuk paragraf ringkasan profil

2. Untuk seksi dinamis, gunakan pembatas seksi dan loop komentar HTML persis seperti format di bawah ini agar parser regex kami dapat mengulang data dan menyembunyikan seksi kosong:

   Untuk Pengalaman Kerja:
   <!-- {{SECTION_EXPERIENCE}} -->
   <div class="cv-section">
     <h2>Work Experience</h2>
     <!-- {{LOOP_EXPERIENCE}} -->
     <div class="job-item">
       <h3>{{TITLE}} di {{ORGANIZATION}} ({{WORK_TYPE}} | {{PLACE}})</h3>
       <span class="timeline">{{DATE_START}} - {{DATE_END}}</span>
       <div class="desc">{{DESCRIPTION}}</div>
     </div>
     <!-- {{END_LOOP_EXPERIENCE}} -->
   </div>
   <!-- {{END_SECTION_EXPERIENCE}} -->

   Untuk Pendidikan:
   <!-- {{SECTION_EDUCATION}} -->
   <div class="cv-section">
     <h2>Education</h2>
     <!-- {{LOOP_EDUCATION}} -->
     <div class="edu-item">
       <h3>{{TITLE}} | {{ORGANIZATION}} (Nilai: {{NILAI}})</h3>
       <span class="timeline">{{DATE_START}} - {{DATE_END}}</span>
       <div class="desc">{{DESCRIPTION}}</div>
     </div>
     <!-- {{END_LOOP_EDUCATION}} -->
   </div>
   <!-- {{END_SECTION_EDUCATION}} -->

   Untuk Sertifikasi/Achievement:
   <!-- {{SECTION_ACHIEVEMENT}} -->
   <div class="cv-section">
     <h2>Achievements & Certifications</h2>
     <!-- {{LOOP_ACHIEVEMENT}} -->
     <div class="ach-item">
       <h3>{{TITLE}} oleh {{ORGANIZATION}}</h3>
       <span class="timeline">{{DATE_START}} (Skor: {{NILAI}})</span>
       <div class="desc">{{DESCRIPTION}}</div>
     </div>
     <!-- {{END_LOOP_ACHIEVEMENT}} -->
   </div>
   <!-- {{END_SECTION_ACHIEVEMENT}} -->

3. Pastikan CSS dioptimalkan untuk media cetak menggunakan @media print agar margin halaman terkunci di ukuran A4 (210mm x 297mm), tanpa menyertakan elemen UI browser.`;

const PAGE_DIMENSIONS_MM = {
  a4: { w: '210mm', h: '297mm', desc: 'A4' },
  f4: { w: '215.9mm', h: '330.2mm', desc: 'F4 / Folio' },
  b5: { w: '176mm', h: '250mm', desc: 'B5' },
  letter: { w: '215.9mm', h: '279.4mm', desc: 'Letter' },
  legal: { w: '215.9mm', h: '355.6mm', desc: 'Legal' }
};

const CONTACT_TYPES = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'location', label: 'Location' },
  { value: 'website', label: 'Website' },
  { value: 'github', label: 'GitHub' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'dribbble', label: 'Dribbble' },
  { value: 'generic', label: 'Other' }
];

const getContactIcon = (type) => {
  switch (type) {
    case 'phone': return '📞';
    case 'email': return '✉️';
    case 'location': return '📍';
    case 'github': return '🐙';
    case 'linkedin': return '💼';
    case 'twitter': return '🐦';
    case 'dribbble': return '🎨';
    case 'website':
    case 'generic':
    default: return '🔗';
  }
};

const getContactFlaticonClass = (type) => {
  switch (type) {
    case 'phone': return 'fi fi-rr-phone-call';
    case 'email': return 'fi fi-rr-envelope';
    case 'location': return 'fi fi-rr-marker';
    case 'github': return 'fi fi-brands-github';
    case 'linkedin': return 'fi fi-brands-linkedin';
    case 'twitter': return 'fi fi-brands-twitter';
    case 'dribbble': return 'fi fi-brands-dribbble';
    case 'website':
    case 'generic':
    default: return 'fi fi-rr-globe';
  }
};

const MOCK_PROFILE = {
  name: "Gaurav Cheema",
  role: "Lead Systems Architect & Developer",
  contacts: [
    { id: 'c-1', type: 'phone', value: '+1-555-0199', include: true },
    { id: 'c-2', type: 'email', value: 'gaurav.cheema@systems.io', include: true },
    { id: 'c-3', type: 'location', value: 'Detroit, MI', include: true },
    { id: 'c-4', type: 'github', value: 'github.com/gaurav-cheema', include: true },
    { id: 'c-5', type: 'linkedin', value: 'linkedin.com/in/gaurav', include: true }
  ],
  careerObjective: "Innovative and highly analytical Lead Architect with 7+ years of experience in system design, offline-first client-side web application architectures, and building resilient browser tools. Proven expertise in optimizing client memory buffers and leveraging JavaScript canvas/web APIs."
};

const MOCK_RECORDS = [
  {
    id: 'mock-exp-1',
    type: 'experience',
    title: 'Senior Frontend Architect',
    organization: 'Systems Local Corp',
    workType: 'hybrid',
    place: 'Detroit, MI',
    datestart: '2023-03',
    dateend: 'Present',
    description: 'Designed and deployed offline-first Client-side PDF editors and document processors.\nReduced memory spikes by 40% using delta op logs instead of copying full binary buffers.\nMentored junior developers on browser memory sandboxing and pdf-lib configurations.',
    include: true
  },
  {
    id: 'mock-exp-2',
    type: 'experience',
    title: 'Software Developer',
    organization: 'Web Sandbox LLC',
    workType: 'onsite',
    place: 'Chicago, IL',
    datestart: '2020-06',
    dateend: '2023-02',
    description: 'Created responsive layouts using HTML5 and tailored HSL CSS utility sets.\nCollaborated on a local PWA caching system that allowed full functionality on high-latency networks.',
    include: true
  },
  {
    id: 'mock-edu-1',
    type: 'education',
    title: 'B.Sc. in Computer Science',
    organization: 'Michigan State University',
    datestart: '2016-09',
    dateend: '2020-05',
    nilai: '3.85 / 4.00',
    description: 'Specialization in Software Architecture & Web Engineering.',
    include: true
  },
  {
    id: 'mock-ach-1',
    type: 'achievement',
    title: 'AWS Certified Solutions Architect',
    organization: 'Amazon Web Services',
    datestart: '2024-02',
    nilai: 'Pass (Score: 820)',
    description: 'Credential validation for designing secure and robust cloud infrastructure designs.',
    include: true
  }
];

export default function CVMaker({ currentLanguage, onLoadPDF, onBack }) {
  // Main states loading from localStorage
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('cv_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Migrate if contacts list doesn't exist
      if (!parsed.contacts) {
        parsed.contacts = [];
        if (parsed.phone) {
          parsed.contacts.push({ id: `c-phone-${Date.now()}`, type: 'phone', value: parsed.phone, include: true });
        }
        if (parsed.email) {
          parsed.contacts.push({ id: `c-email-${Date.now()}`, type: 'email', value: parsed.email, include: true });
        }
        if (parsed.location) {
          parsed.contacts.push({ id: `c-loc-${Date.now()}`, type: 'location', value: parsed.location, include: true });
        }
        if (parsed.links && Array.isArray(parsed.links)) {
          parsed.links.forEach((l, idx) => {
            parsed.contacts.push({ id: `c-link-${idx}-${Date.now()}`, type: l.type || 'generic', value: l.value || '', include: l.include !== false });
          });
        }
        
        // Old single contactInfo string migration fallback
        if (parsed.contactInfo && parsed.contacts.length === 0) {
          const parts = parsed.contactInfo.split(/•|\|/);
          const phone = (parts[0] || '').replace(/📞/g, '').trim();
          const email = (parts[1] || '').replace(/✉️/g, '').trim();
          const location = (parts[2] || '').replace(/📍/g, '').trim();
          const link = (parts[3] || '').replace(/🔗/g, '').trim();

          if (phone) parsed.contacts.push({ id: 'c-phone-mig', type: 'phone', value: phone, include: true });
          if (email) parsed.contacts.push({ id: 'c-email-mig', type: 'email', value: email, include: true });
          if (location) parsed.contacts.push({ id: 'c-loc-mig', type: 'location', value: location, include: true });
          if (link) parsed.contacts.push({ id: 'c-link-mig', type: 'generic', value: link, include: true });
        }
      }

      const mappedContacts = (parsed.contacts || []).map(c => ({
        ...c,
        include: c.include !== false
      }));

      return {
        name: parsed.name || '',
        role: parsed.role || '',
        contacts: mappedContacts,
        careerObjective: parsed.careerObjective || ''
      };
    }
    return MOCK_PROFILE;
  });

  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem('cv_records');
    return saved ? JSON.parse(saved) : MOCK_RECORDS;
  });

  const [htmlTemplate, setHtmlTemplate] = useState(() => {
    let template = localStorage.getItem('cv_html_template') || DEFAULT_HTML_TEMPLATE;
    
    let modified = false;

    // Inject Flaticon links if missing
    if (!template.includes('uicons-regular-rounded')) {
      const flaticonLinks = `\n    <link rel='stylesheet' href='https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css'>\n    <link rel='stylesheet' href='https://cdn-uicons.flaticon.com/2.6.0/uicons-brands/css/uicons-brands.css'>`;
      template = template.replace('</head>', `${flaticonLinks}\n</head>`);
      modified = true;
    }

    // Auto-migrate old templates to wrap loops in SECTION comments if missing
    const keys = ['EXPERIENCE', 'EDUCATION', 'ACHIEVEMENT'];
    keys.forEach(key => {
      const loopStart = `<!-- {{LOOP_${key}}} -->`;
      const secStart = `<!-- {{SECTION_${key}}} -->`;
      const secEnd = `<!-- {{END_SECTION_${key}}} -->`;
      
      if (template.includes(loopStart) && !template.includes(secStart)) {
        const pattern = new RegExp(`(<div class="cv-section">[\\s\\S]*?<!-- {{LOOP_${key}}} -->[\\s\\S]*?<!-- {{END_LOOP_${key}}} -->[\\s\\S]*?</div>\\s*</div>)`, 'g');
        if (pattern.test(template)) {
          pattern.lastIndex = 0; // reset regex index
          template = template.replace(pattern, `${secStart}\n$1\n${secEnd}`);
          modified = true;
        }
      }
    });
    
    if (modified) {
      localStorage.setItem('cv_html_template', template);
    }
    return template;
  });

  const [cssTemplate, setCssTemplate] = useState(() => {
    return localStorage.getItem('cv_css_template') || DEFAULT_CSS_TEMPLATE;
  });

  const [pageSize, setPageSize] = useState(() => {
    return localStorage.getItem('cv_page_size') || 'a4';
  });

  useEffect(() => {
    localStorage.setItem('cv_page_size', pageSize);
  }, [pageSize]);

  // UI state
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'html', 'css'
  const [zoom, setZoom] = useState(0.8);
  const [mobileView, setMobileView] = useState('edit'); // 'edit', 'preview'
  
  // Touch Gestures Refs & State for Pinch-to-Zoom
  const touchStartDistRef = useRef(0);
  const touchStartZoomRef = useRef(0);
  const zoomRef = useRef(zoom);
  const previewContainerRef = useRef(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartDistRef.current = dist;
        touchStartZoomRef.current = zoomRef.current;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && touchStartDistRef.current > 0) {
        e.preventDefault(); // Stop default browser zoom
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = dist / touchStartDistRef.current;
        const newZoom = Math.min(2.0, Math.max(0.3, Number((touchStartZoomRef.current * ratio).toFixed(2))));
        setZoom(newZoom);
      }
    };

    const handleTouchEnd = () => {
      touchStartDistRef.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const [isCopied, setIsCopied] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState({});
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [autoAssign, setAutoAssign] = useState(() => {
    return localStorage.getItem('cv_auto_assign') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('cv_auto_assign', autoAssign);
  }, [autoAssign]);

  // Rendered iframe content (decoupled from direct keystroke triggers to avoid flicker)
  const [previewHtml, setPreviewHtml] = useState('');

  const iframeRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto save to localStorage
  useEffect(() => {
    localStorage.setItem('cv_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('cv_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('cv_html_template', htmlTemplate);
  }, [htmlTemplate]);

  useEffect(() => {
    localStorage.setItem('cv_css_template', cssTemplate);
  }, [cssTemplate]);

  // Section loop filters
  const experiences = useMemo(() => records.filter(r => r.type === 'experience'), [records]);
  const educations = useMemo(() => records.filter(r => r.type === 'education'), [records]);
  const achievements = useMemo(() => records.filter(r => r.type === 'achievement'), [records]);

  // Main compilation engine
  const handleAssignData = () => {
    let output = htmlTemplate;

    // 1. Swap main profile info
    const contactFields = [];
    if (profile.contacts && Array.isArray(profile.contacts)) {
      profile.contacts.forEach(c => {
        if (c.value && c.include !== false) {
          const iconClass = getContactFlaticonClass(c.type);
          const iconHtml = `<i class="${iconClass}" style="font-size: 11px; margin-right: 4px; vertical-align: middle; display: inline-block;"></i>`;
          if (c.type === 'phone') {
            contactFields.push(`<a href="tel:${c.value}" style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 4px;">${iconHtml}${c.value}</a>`);
          } else if (c.type === 'email') {
            contactFields.push(`<a href="mailto:${c.value}" style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 4px;">${iconHtml}${c.value}</a>`);
          } else if (c.type === 'location') {
            contactFields.push(`<span style="display: inline-flex; align-items: center; gap: 4px;">${iconHtml}${c.value}</span>`);
          } else {
            let href = c.value;
            if (!/^https?:\/\//i.test(href)) {
              href = 'https://' + href;
            }
            contactFields.push(`<a href="${href}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 4px;">${iconHtml}${c.value}</a>`);
          }
        }
      });
    }
    const combinedContactInfo = contactFields.join('  &bull;  ');

    output = output.replace(/{{NAME}}/g, profile.name || '');
    output = output.replace(/{{ROLE}}/g, profile.role || '');
    output = output.replace(/{{CONTACT_INFO}}/g, combinedContactInfo);
    output = output.replace(/{{CAREER_OBJECTIVE}}/g, profile.careerObjective || '');

    // 2. Helper loop compiler
    const compileSection = (html, key, sectionRecords) => {
      const hasRecords = sectionRecords.some(r => r.include);
      const sectionRegex = new RegExp(`<!-- {{SECTION_${key}}} -->([\\s\\S]*?)<!-- {{END_SECTION_${key}}} -->`, 'g');
      
      if (sectionRegex.test(html)) {
        sectionRegex.lastIndex = 0;
        if (!hasRecords) {
          return html.replace(sectionRegex, '');
        } else {
          html = html.replace(sectionRegex, '$1');
        }
      }

      const loopRegex = new RegExp(`<!-- {{LOOP_${key}}} -->([\\s\\S]*?)<!-- {{END_LOOP_${key}}} -->`, 'g');
      
      return html.replace(loopRegex, (_, blockTemplate) => {
        return sectionRecords
          .filter(r => r.include)
          .map(record => {
            let itemHtml = blockTemplate;
            itemHtml = itemHtml.replace(/{{TITLE}}/g, record.title || '');
            itemHtml = itemHtml.replace(/{{ORGANIZATION}}/g, record.organization || '');
            itemHtml = itemHtml.replace(/{{WORK_TYPE}}/g, record.workType || '');
            itemHtml = itemHtml.replace(/{{PLACE}}/g, record.place || '');
            itemHtml = itemHtml.replace(/{{DATE_START}}/g, record.datestart || '');
            itemHtml = itemHtml.replace(/{{DATE_END}}/g, record.dateend || '');
            itemHtml = itemHtml.replace(/{{NILAI}}/g, record.nilai || '');
            
            // Format descriptions (bullet list)
            if (record.description) {
              const descHtml = record.description.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map(line => `<li>${line.replace(/^[*-\s]+/, '')}</li>`)
                .join('');
              itemHtml = itemHtml.replace(/{{DESCRIPTION}}/g, `<ul>${descHtml}</ul>`);
            } else {
              itemHtml = itemHtml.replace(/{{DESCRIPTION}}/g, '');
            }
            return itemHtml;
          }).join('\n');
      });
    };

    // 3. Compile categories
    output = compileSection(output, 'EXPERIENCE', experiences);
    output = compileSection(output, 'EDUCATION', educations);
    output = compileSection(output, 'ACHIEVEMENT', achievements);

    // 4. Inject CSS with Dynamic Page Size Overrides
    const currentDims = PAGE_DIMENSIONS_MM[pageSize] || PAGE_DIMENSIONS_MM.a4;
    const sizeOverrides = `
    .a4-page {
      width: ${currentDims.w} !important;
      min-height: ${currentDims.h} !important;
    }
    `;
    const cssInjected = `<style>${cssTemplate}\n${sizeOverrides}</style></head>`;
    output = output.replace('</head>', cssInjected);

    setPreviewHtml(output);
  };

  // Compile on mount or configuration changes if auto-assign is enabled
  useEffect(() => {
    handleAssignData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoAssign) {
      handleAssignData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, records, htmlTemplate, cssTemplate, autoAssign]);

  useEffect(() => {
    handleAssignData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // Reset to default templates
  const handleResetTemplates = () => {
    if (window.confirm(currentLanguage === 'id' ? 'Kembalikan template HTML & CSS ke bawaan?' : 'Reset HTML & CSS to default?')) {
      setHtmlTemplate(DEFAULT_HTML_TEMPLATE);
      setCssTemplate(DEFAULT_CSS_TEMPLATE);
    }
  };

  // AI Prompt Copier
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT_TEXT);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Inline Record CRUD functions
  const addRecord = (type) => {
    const newId = `rec-${Date.now()}`;
    const newRec = {
      id: newId,
      type,
      title: '',
      organization: '',
      workType: 'onsite',
      place: '',
      datestart: '',
      dateend: '',
      nilai: '',
      description: '',
      include: true
    };
    setRecords(prev => [...prev, newRec]);
    setExpandedRecords(prev => ({ ...prev, [newId]: true }));
  };

  const handleFieldChange = (id, field, value) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleInclude = (id) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, include: !r.include } : r));
  };

  const toggleExpand = (id) => {
    setExpandedRecords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const next = {};
    records.forEach(r => {
      next[r.id] = true;
    });
    setExpandedRecords(next);
  };

  const collapseAll = () => {
    setExpandedRecords({});
  };

  const deleteRecord = (id) => {
    if (window.confirm(currentLanguage === 'id' ? 'Hapus item ini?' : 'Delete this item?')) {
      setRecords(prev => prev.filter(r => r.id !== id));
      setExpandedRecords(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };
  const handleExportPDF = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  const handleAssignToEditorDirectly = async () => {
    if (!onLoadPDF) return;
    
    const btn = document.getElementById('assign-direct-btn');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '⚡ Compiling...';
      btn.disabled = true;
    }
    
    try {
      const pdfDoc = await PDFDocument.create();
      
      const ICON_PATHS = {
        phone: 'M 3 1 C 1.9 1 1 1.9 1 3 C 1 10.2 6.8 16 14 16 C 15.1 16 16 15.1 16 14 L 16 12.5 C 16 11.9 15.6 11.5 15.1 11.3 L 12.8 10.3 C 12.3 10.1 11.7 10.3 11.4 10.7 L 10.4 11.9 C 8.1 10.7 6.3 8.9 5.1 6.6 L 6.3 5.6 C 6.7 5.3 6.9 4.7 6.7 4.2 L 5.7 1.9 C 5.5 1.4 5.1 1 4.5 1 L 3 1 Z',
        email: 'M 1 3 C 0.45 3 0 3.45 0 4 L 0 12 C 0 12.55 0.45 13 1 13 L 15 13 C 15.55 13 16 12.55 16 12 L 16 4 C 16 3.45 15.55 3 15 3 L 1 3 Z M 1.5 4.5 L 8 9 L 14.5 4.5 L 14.5 5.5 L 8 10.5 L 1.5 5.5 L 1.5 4.5 Z',
        location: 'M 8 1 C 4.5 1 1.5 4 1.5 7.5 C 1.5 11.9 8 17 8 17 C 8 17 14.5 11.9 14.5 7.5 C 14.5 4 11.5 1 8 1 Z M 8 10.2 C 6.5 10.2 5.3 9 5.3 7.5 C 5.3 6 6.5 4.8 8 4.8 C 9.5 4.8 10.7 6 10.7 7.5 C 10.7 9 9.5 10.2 8 10.2 Z',
        link: 'M 8 1 C 4.1 1 1 4.1 1 8 C 1 11.9 4.1 15 8 15 C 11.9 15 15 11.9 15 8 C 15 4.1 11.9 1 8 1 Z M 9.5 2.5 C 10.2 3.9 10.7 5.4 10.8 7 L 5.2 7 C 5.3 5.4 5.8 3.9 6.5 2.5 C 7 2.2 7.5 2 8 2 C 8.5 2 9 2.2 9.5 2.5 Z M 4.8 8 L 11.2 8 C 11.1 9.6 10.6 11.1 9.5 12.5 C 9 12.8 8.5 13 8 13 C 7.5 13 7 12.8 6.5 12.5 C 5.8 11.1 5.3 9.6 4.8 8 Z M 2.1 8 L 3.7 8 C 3.9 9.9 4.4 11.8 5.2 13.4 C 3.6 12.2 2.5 10.2 2.1 8 Z M 2.1 7 C 2.5 4.8 3.6 2.8 5.2 1.6 C 4.4 3.2 3.9 5.1 3.7 7 L 2.1 7 Z M 12.3 1.6 C 13.9 2.8 15 4.8 15.4 7 L 13.8 7 C 13.6 5.1 13.1 3.2 12.3 1.6 Z M 13.8 8 L 15.4 8 C 15 10.2 13.9 12.2 12.3 13.4 C 13.1 11.8 13.6 9.9 13.8 8 Z'
      };
      
      // Use fontkit + local TTF fonts served from public/fonts/ (same-origin, works offline).
      // Fonts match the HTML preview exactly: Inter (body) + Playfair Display SemiBold (name).
      pdfDoc.registerFontkit(fontkit);

      const basePath = window.location.origin + (import.meta.env.BASE_URL || '/');
      const fetchLocalFont = async (filename) => {
        const res = await fetch(basePath.replace(/\/$/, '') + '/fonts/' + filename);
        if (!res.ok) throw new Error(`Missing local font: ${filename}`);
        return await res.arrayBuffer();
      };

      let fontRegular, fontBold, fontItalic, fontBoldSerif;
      try {
        const [interReg, interBold, interItalic] = await Promise.all([
          fetchLocalFont('Inter-Regular.ttf'),
          fetchLocalFont('Inter-SemiBold.ttf'),
          fetchLocalFont('Inter-Italic.ttf')
        ]);
        fontRegular = await pdfDoc.embedFont(interReg);
        fontBold    = await pdfDoc.embedFont(interBold);
        fontItalic  = await pdfDoc.embedFont(interItalic);
      } catch (_) {
        fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        fontItalic  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      }
      
      // Playfair Display SemiBold for name header (serif accent matching HTML preview)
      try {
        const playfairBuf = await fetchLocalFont('PlayfairDisplay-SemiBold.ttf');
        fontBoldSerif = await pdfDoc.embedFont(playfairBuf);
      } catch (_) {
        fontBoldSerif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      }
      
      // Embed Flaticon uicons fonts (same fonts used in HTML preview) for exact icon matching
      // Codepoints extracted from the CSS: fi-rr-phone-call=U+EBDE, fi-rr-envelope=U+E5FE,
      // fi-rr-marker=U+EA01, fi-rr-globe=U+E793, fi-brands-github=U+E787,
      // fi-brands-linkedin=U+E9A9, fi-brands-twitter=U+F07C, fi-brands-dribbble=U+E5AE
      let fontIconRR = null;
      let fontIconBrands = null;
      try {
        const [rrBuf, brandsBuf] = await Promise.all([
          fetchLocalFont('uicons-regular-rounded.ttf'),
          fetchLocalFont('uicons-brands.ttf')
        ]);
        fontIconRR     = await pdfDoc.embedFont(rrBuf);
        fontIconBrands = await pdfDoc.embedFont(brandsBuf);
      } catch (_) {
        // Icons will fall back to text char if font unavailable
      }
      
      // Map contact type → { font, codepoint }
      const ICON_CODEPOINTS = {
        phone:    { font: 'rr',     cp: 0xEBDE },
        email:    { font: 'rr',     cp: 0xE5FE },
        location: { font: 'rr',     cp: 0xEA01 },
        website:  { font: 'rr',     cp: 0xE793 },
        link:     { font: 'rr',     cp: 0xE793 },
        github:   { font: 'brands', cp: 0xE787 },
        linkedin: { font: 'brands', cp: 0xE9A9 },
        twitter:  { font: 'brands', cp: 0xF07C },
        dribbble: { font: 'brands', cp: 0xE5AE },
        generic:  { font: 'rr',     cp: 0xE793 }
      };
      
      const PAGE_SIZES = {
        a4: [595.28, 841.89],
        f4: [612.00, 936.00],
        b5: [498.90, 708.66],
        letter: [612.00, 792.00],
        legal: [612.00, 1008.00]
      };
      
      const dims = PAGE_SIZES[pageSize] || PAGE_SIZES.a4;
      let page = pdfDoc.addPage(dims);
      const { width, height } = page.getSize();
      
      const addLinkAnnotation = (x, y, w, h, url) => {
        const rect = [x, y, x + w, y + h];
        const linkAction = pdfDoc.context.obj({
          Type: PDFName.of('Annot'),
          Subtype: PDFName.of('Link'),
          Rect: rect,
          Border: [0, 0, 0],
          A: {
            Type: PDFName.of('Action'),
            S: PDFName.of('URI'),
            URI: PDFString.of(url)
          }
        });
        const linkRef = pdfDoc.context.register(linkAction);
        page.node.addAnnot(linkRef);
      };
      
      // Margins matching the clean original style (50pt)
      const marginTop = 50;
      const marginSide = 50;
      let y = height - marginTop;
      const margin = marginSide;
      const contentWidth = width - 2 * margin;
      
      const checkPageOverflow = (neededHeight) => {
        if (y - neededHeight < marginTop) {
          page = pdfDoc.addPage(dims);
          y = height - marginTop;
          return true;
        }
        return false;
      };
      
      const wrapText = (text, maxWidth, font, fontSize) => {
        const paragraphs = (text || '').split('\n');
        const allLines = [];
        for (const para of paragraphs) {
          const words = para.split(' ');
          let currentLine = '';
          for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);
            if (testWidth <= maxWidth) {
              currentLine = testLine;
            } else {
              allLines.push(currentLine);
              currentLine = word;
            }
          }
          if (currentLine) {
            allLines.push(currentLine);
          }
        }
        return allLines;
      };
      
      const drawWrappedText = (text, fontSize, font, color = rgb(0.1, 0.1, 0.1), lineSpacing = 1.25) => {
        const lines = wrapText(text, contentWidth, font, fontSize);
        const lineHeight = fontSize * lineSpacing;
        
        for (const line of lines) {
          checkPageOverflow(lineHeight);
          page.drawText(line, {
            x: margin,
            y: y - fontSize,
            size: fontSize,
            font: font,
            color: color
          });
          y -= lineHeight;
        }
      };
      
      const drawDescription = (descText) => {
        const lines = (descText || '').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const cleanText = trimmed.substring(1).trim();
            checkPageOverflow(12);
            page.drawText('•', {
              x: margin + 8,
              y: y - 9.5,
              size: 8.5,
              font: fontBold,
              color: rgb(0.2, 0.2, 0.2)
            });
            
            const wrappedLines = wrapText(cleanText, contentWidth - 20, fontRegular, 8.5);
            for (const wl of wrappedLines) {
              checkPageOverflow(12);
              page.drawText(wl, {
                x: margin + 20,
                y: y - 9.5,
                size: 8.5,
                font: fontRegular,
                color: rgb(0.2, 0.2, 0.2)
              });
              y -= 12;
            }
          } else {
            drawWrappedText(trimmed, 8.5, fontRegular, rgb(0.2, 0.2, 0.2), 1.25);
          }
        }
      };
      
      // ── 1. Centered Header matching CSS exactly ──
      // CSS: h1 { font-size: 32px } → 32px * (72/96) = 24pt
      // CSS: .job-title { font-size: 14px } → 14px * (72/96) = 10.5pt
      // CSS: .vertical-bar { width: 3px; height: 45px }
      // CSS: .name-container { gap: 15px }
      // CSS: .name-block h1 margin-bottom ≈ 3px
      const nameText = (profile.name || '').toUpperCase();
      const roleText = (profile.role || '').toUpperCase();
      
      const nameFontSize = 24;   // 32px CSS
      const roleFontSize = 10.5; // 14px CSS
      
      const nameW = fontBoldSerif.widthOfTextAtSize(nameText, nameFontSize);
      const roleW = fontBoldSerif.widthOfTextAtSize(roleText, roleFontSize); // use bold for width calc
      // role is fontRegular, recalc
      const roleWActual = fontRegular.widthOfTextAtSize(roleText, roleFontSize);
      const nameBlockW = Math.max(nameW, roleWActual);
      
      const barWidth = 2.25; // 3px → 3 * 0.75 = 2.25pt
      const gap = 11.25;    // 15px → 15 * 0.75 = 11.25pt
      // bar height: 45px → 33.75pt
      const barHeightPt = 33.75;
      
      const totalHeaderW = barWidth + gap + nameBlockW;
      const startX = (width - totalHeaderW) / 2;
      
      // vertical center of the name+role block
      // name line: 24pt descender top, role line: 10.5pt
      // total text height ≈ 24 + 3 + 10.5 = 37.5pt
      const headerTextH = nameFontSize + 2.25 + roleFontSize;
      const barTopY = y - (headerTextH - barHeightPt) / 2 - 0;
      
      checkPageOverflow(headerTextH + 10);
      
      // Draw vertical accent bar (CSS: background-color: #333333)
      page.drawRectangle({
        x: startX,
        y: barTopY - barHeightPt,
        width: barWidth,
        height: barHeightPt,
        color: rgb(0.2, 0.2, 0.2)
      });
      
      // Draw name — baseline from top of row
      if (profile.name) {
        page.drawText(nameText, {
          x: startX + barWidth + gap,
          y: y - nameFontSize,
          size: nameFontSize,
          font: fontBoldSerif,
          color: rgb(0.13, 0.13, 0.13)
        });
      }
      
      // Draw role — 2.25pt gap below name
      if (profile.role) {
        page.drawText(roleText, {
          x: startX + barWidth + gap,
          y: y - nameFontSize - 2.25 - roleFontSize,
          size: roleFontSize,
          font: fontRegular,
          color: rgb(0.33, 0.33, 0.33)
        });
      }
      
      y -= headerTextH + 10; // 10pt gap below header block (CSS: margin-bottom: 10px → 7.5pt ≈ 10)
      
      // 2. Centered Contacts with Flaticon icon glyphs (exact match to HTML preview)
      if (profile.contacts && profile.contacts.length > 0) {
        const activeContacts = profile.contacts.filter(c => c.value && c.include !== false);
        if (activeContacts.length > 0) {
          const iconFontSizeC = 8.5;
          const iconGapC = 3.5;
          
          const itemsData = activeContacts.map(c => {
            const text = c.value;
            const textW = fontRegular.widthOfTextAtSize(text, 8.5);
            
            // Use the explicit user-selected type, fall back to auto-detection
            let contactType = c.type || 'generic';
            if (contactType === 'generic' || !ICON_CODEPOINTS[contactType]) {
              // Auto-detect from value
              const val = (text || '').trim().toLowerCase();
              const hasLetters = /[a-z]/.test(val);
              if (val.includes('@')) contactType = 'email';
              else if (val.includes('github.com') || val.includes('github')) contactType = 'github';
              else if (val.includes('linkedin.com') || val.includes('linkedin')) contactType = 'linkedin';
              else if (val.includes('http') || val.includes('www') || val.includes('.com') || val.includes('.net') || val.includes('.org') || val.includes('.me') || val.includes('.io')) contactType = 'website';
              else if (!hasLetters && /^[+\d\s()-]{7,}$/.test(val)) contactType = 'phone';
              else contactType = 'location';
            }
            
            const iconDef = ICON_CODEPOINTS[contactType] || ICON_CODEPOINTS.generic;
            const iconFont = iconDef.font === 'brands' ? fontIconBrands : fontIconRR;
            let iconWidth = 0;
            if (iconFont) {
              const iconChar = String.fromCodePoint(iconDef.cp);
              iconWidth = iconFont.widthOfTextAtSize(iconChar, iconFontSizeC) + iconGapC;
            }
            
            return {
              contactType,
              value: text,
              width: textW + iconWidth,
              hasIcon: !!iconFont
            };
          });
          
          // CSS: contact-info separator is '  •  ' with spacing
          const spacerStr = '  •  ';
          const spacerW = fontRegular.widthOfTextAtSize(spacerStr, 8.5);
          
          const totalContactsW = itemsData.reduce((sum, item) => sum + item.width, 0) + (itemsData.length - 1) * spacerW;
          let currentX = (width - totalContactsW) / 2;
          
          checkPageOverflow(12);
          
          itemsData.forEach((item, idx) => {
            const iconColor = rgb(0.4, 0.4, 0.45);
            const iconFontSize = 8.5;
            const iconGap = 3.5;
            
            if (item.hasIcon) {
              const iconDef = ICON_CODEPOINTS[item.contactType] || ICON_CODEPOINTS.generic;
              const iconFont = iconDef.font === 'brands' ? fontIconBrands : fontIconRR;
              if (iconFont) {
                // Render the exact same Flaticon glyph used in HTML preview
                const iconChar = String.fromCodePoint(iconDef.cp);
                page.drawText(iconChar, {
                  x: currentX,
                  y: y - iconFontSize,
                  size: iconFontSize,
                  font: iconFont,
                  color: iconColor
                });
                const iconW = iconFont.widthOfTextAtSize(iconChar, iconFontSize);
                currentX += iconW + iconGap;
              } else {
                currentX += 10;
              }
            }
            
            page.drawText(item.value, {
              x: currentX,
              y: y - 8.5,
              size: 8.5,
              font: fontRegular,
              color: rgb(0.3, 0.3, 0.35)
            });
            
            const textWidth = fontRegular.widthOfTextAtSize(item.value, 8.5);
            
            if (['email', 'github', 'linkedin', 'website', 'link', 'twitter', 'dribbble'].includes(item.contactType)) {
              let targetUrl = item.value;
              if (item.contactType === 'email') {
                targetUrl = `mailto:${item.value}`;
              } else if (!item.value.startsWith('http://') && !item.value.startsWith('https://')) {
                targetUrl = `https://${item.value}`;
              }
              
              page.drawLine({
                start: { x: currentX, y: y - 9.5 },
                end: { x: currentX + textWidth, y: y - 9.5 },
                thickness: 0.5,
                color: rgb(0.3, 0.3, 0.35)
              });
              
              addLinkAnnotation(currentX, y - 8.5, textWidth, 8.5, targetUrl);
            }
            
            currentX += textWidth;
            
            if (idx < itemsData.length - 1) {
              page.drawText(spacerStr, {
                x: currentX,
                y: y - 8.5,
                size: 8.5,
                font: fontRegular,
                color: rgb(0.55, 0.55, 0.6)
              });
              currentX += spacerW;
            }
          });
          
          y -= 14;
        }
      }
      
      // Divider line below contacts (CSS: .cv-header margin-bottom: 25px → 18.75pt)
      y -= 6;
      page.drawLine({
        start: { x: margin, y: y },
        end: { x: width - margin, y: y },
        thickness: 0.75,
        color: rgb(0.88, 0.88, 0.88)
      });
      y -= 14;
      
      // Section Header drawer matching CSS:
      // .section-title { font-size: 14px→10.5pt; font-weight:600; background:#eaeaea; padding:5px 10px→3.75pt 7.5pt; margin-bottom:12px→9pt }
      const drawSectionTitle = (title) => {
        checkPageOverflow(30);
        // CSS: .cv-section margin-bottom: 22px = 16.5pt; prior section's bottom adds spacing
        // Banner: height = font(10.5) + padding-top(3.75) + padding-bottom(3.75) = 18pt
        const bannerHeight = 18;
        const bannerPaddingLeft = 7.5;
        const bannerPaddingV = 3.75;
        
        page.drawRectangle({
          x: margin,
          y: y - bannerHeight,
          width: contentWidth,
          height: bannerHeight,
          color: rgb(0.918, 0.918, 0.918) // #eaeaea
        });
        
        page.drawText(title.toUpperCase(), {
          x: margin + bannerPaddingLeft,
          y: y - bannerHeight + bannerPaddingV,
          size: 10.5,
          font: fontBold,
          color: rgb(0.133, 0.133, 0.133) // #222
        });
        
        // margin-bottom: 12px = 9pt after banner
        y -= bannerHeight + 9;
      };
      
      // 3. Career Objective (matches HTML template: "Career Objective")
      if (profile.careerObjective) {
        drawSectionTitle(currentLanguage === 'id' ? 'Ringkasan Karir' : 'Career Objective');
        // CSS: .section-content { font-size: 13px→9.75pt; line-height: 1.5; padding: 0 5px }
        drawWrappedText(profile.careerObjective, 9.75, fontRegular, rgb(0.2, 0.2, 0.2), 1.5);
        y -= 16.5; // CSS: .cv-section margin-bottom: 22px = 16.5pt
      }
      
      // Filter lists from the records state
      const experienceRecs = records.filter(r => r.type === 'experience' && r.include);
      const educationRecs = records.filter(r => r.type === 'education' && r.include);
      const achievementRecs = records.filter(r => r.type === 'achievement' && r.include);
      
      // ── Helper to draw a record item row (experience/education/achievement) ──
      // CSS: .item-header { font-size: 13.5px→10.125pt; font-weight:600; margin-bottom:2px }
      // CSS: .item-title color: #2d3748, .item-org: uppercase text-secondary font-size:12px
      // CSS: .item-timeline { font-size: 12.5px→9.375pt; color:#2d3748 }
      // CSS: .item-meta { font-size:12px→9pt; font-style:italic; color:text-secondary; margin-bottom:4px }
      // CSS: .item-desc { font-size:12.5px→9.375pt }
      const itemTitleSize = 10.125;
      const itemMetaSize = 9;
      const itemDescSize = 9.375;
      const itemTimelineSize = 9.375;

      const drawRecordItem = (rec, showNilai = false, nilaiLabel = 'GPA / Score') => {
        checkPageOverflow(40);
        const rowY = y;
        
        // Title + Org on left — CSS: .item-title, .item-org
        const titleStr = rec.title || '';
        const orgStr = rec.organization ? `, ${rec.organization.toUpperCase()}` : '';
        const fullTitleStr = titleStr + orgStr;
        
        // Just draw the whole thing in bold; org portion is styled lighter in HTML but same weight here
        page.drawText(fullTitleStr, {
          x: margin,
          y: rowY - itemTitleSize,
          size: itemTitleSize,
          font: fontBold,
          color: rgb(0.176, 0.216, 0.282) // #2d3748
        });
        
        // Date on right — CSS: .item-timeline
        const dateStr = rec.dateend
          ? `${rec.datestart || ''}  –  ${rec.dateend}`
          : `${rec.datestart || ''}`;
        const dateWidth = fontItalic.widthOfTextAtSize(dateStr, itemTimelineSize);
        page.drawText(dateStr, {
          x: width - margin - dateWidth,
          y: rowY - itemTimelineSize,
          size: itemTimelineSize,
          font: fontItalic,
          color: rgb(0.176, 0.216, 0.282) // #2d3748
        });
        
        // margin-bottom: 2px = 1.5pt
        y -= itemTitleSize + 1.5;
        
        // Meta row — CSS: .item-meta
        const metaParts = [];
        if (rec.workType) metaParts.push(rec.workType);
        if (rec.place) metaParts.push(rec.place);
        if (showNilai && rec.nilai) metaParts.push(`${nilaiLabel}: ${rec.nilai}`);
        
        if (metaParts.length > 0) {
          const metaStr = metaParts.join('  |  ');
          page.drawText(metaStr, {
            x: margin,
            y: y - itemMetaSize,
            size: itemMetaSize,
            font: fontItalic,
            color: rgb(0.333, 0.333, 0.333) // #555
          });
          // margin-bottom: 4px = 3pt
          y -= itemMetaSize + 3;
        }
        
        if (rec.description) {
          drawDescription(rec.description);
        }
        // CSS: .experience-item margin-bottom: 14px = 10.5pt
        y -= 10.5;
      };

      // 4. Experiences
      if (experienceRecs.length > 0) {
        drawSectionTitle(currentLanguage === 'id' ? 'Pengalaman Kerja' : 'Work Experience');
        for (const rec of experienceRecs) {
          drawRecordItem(rec, false);
        }
        y -= 6; // Extra space to make total gap between sections 16.5pt
      }
      
      // 5. Education
      if (educationRecs.length > 0) {
        drawSectionTitle(currentLanguage === 'id' ? 'Pendidikan' : 'Education');
        for (const rec of educationRecs) {
          // Show GPA in meta row
          drawRecordItem({ ...rec, workType: rec.nilai ? `GPA / Score: ${rec.nilai}` : (rec.workType || ''), place: rec.place }, false);
        }
        y -= 6; // Extra space to make total gap 16.5pt
      }
      
      // 6. Achievements
      if (achievementRecs.length > 0) {
        drawSectionTitle(currentLanguage === 'id' ? 'Penghargaan & Sertifikasi' : 'Achievements & Certifications');
        for (const rec of achievementRecs) {
          // CSS template: "Penerbit: {{ORGANIZATION}} | Skor: {{NILAI}}"
          const achievMeta = rec.nilai ? `Penerbit: ${rec.organization || ''} | Skor: ${rec.nilai}` : (rec.organization || '');
          drawRecordItem({ ...rec, organization: '', workType: achievMeta, place: '' }, false);
        }
      }
      
      const finalPdfBytes = await pdfDoc.save();
      onLoadPDF(finalPdfBytes, 'Generated-CV.pdf');
    } catch (err) {
      console.error(err);
      alert(currentLanguage === 'id' ? 'Gagal memproses CV ke editor: ' + err.message : 'Error sending CV to Editor: ' + err.message);
    } finally {
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  };

  // Frontmatter parser
  const parseMarkdownFile = (rawContent) => {
    const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
    const match = rawContent.match(fmRegex);
    
    let metadata = {};
    let body = rawContent;

    if (match) {
      body = rawContent.replace(fmRegex, '').trim();
      match[1].split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, ''); // strip quotes
          metadata[key] = value;
        }
      });
    }

    return { metadata, body };
  };

  // File Upload Handlers for Batch Import (No Popup)
  const handleBatchImportChange = (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.endsWith('.md') || f.name.endsWith('.markdown'));
    if (files.length === 0) {
      alert(currentLanguage === 'id' ? 'Unggah file dengan format .md saja!' : 'Please upload markdown (.md) files only!');
      return;
    }

    const loaders = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({ name: file.name, content: event.target.result });
        };
        reader.readAsText(file);
      });
    });

    Promise.all(loaders).then(loaded => {
      const newRecs = loaded.map((file, idx) => {
        const { metadata, body } = parseMarkdownFile(file.content);
        
        // Autodetect common frontmatter fields
        const keys = Object.keys(metadata);
        const titleKey = keys.find(k => /title|pos|role/i.test(k)) || 'title';
        const orgKey = keys.find(k => /org|comp|school|univ|inst/i.test(k)) || 'organization';
        const workTypeKey = keys.find(k => /type|work/i.test(k)) || 'workType';
        const placeKey = keys.find(k => /place|loc/i.test(k)) || 'place';
        const startKey = keys.find(k => /start/i.test(k)) || 'datestart';
        const endKey = keys.find(k => /end/i.test(k)) || 'dateend';
        const nilaiKey = keys.find(k => /nilai|gpa|score|grade/i.test(k)) || 'nilai';

        // Guess type
        let recordType = 'experience';
        if (/education|school|univ/i.test(file.name) || metadata.school || metadata.university || metadata.gpa || metadata.nilai) {
          recordType = 'education';
        } else if (/achievement|cert|award/i.test(file.name) || metadata.issuer || metadata.score) {
          recordType = 'achievement';
        }

        return {
          id: `imported-${idx}-${Date.now()}`,
          type: recordType,
          title: metadata[titleKey] || metadata.title || '',
          organization: metadata[orgKey] || metadata.organization || metadata.company || metadata.school || '',
          workType: metadata[workTypeKey] || 'onsite',
          place: metadata[placeKey] || '',
          datestart: metadata[startKey] || metadata.start || '',
          dateend: metadata[endKey] || metadata.end || '',
          nilai: metadata[nilaiKey] || metadata.nilai || '',
          description: body.trim(),
          include: true
        };
      });

      setRecords(prev => [...prev, ...newRecs]);
      
      // Auto expand imported records
      setExpandedRecords(prev => {
        const next = { ...prev };
        newRecs.forEach(r => {
          next[r.id] = true;
        });
        return next;
      });

      alert(currentLanguage === 'id' ? `Berhasil mengimpor ${newRecs.length} record ke sidebar! Edit langsung di tempat.` : `Successfully imported ${newRecs.length} records into the sidebar! Edit them inline below.`);
    });
  };

  const triggerImportSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative bg-gray-950 text-gray-200 pb-16 md:pb-0">
      
      {/* LEFT SIDEBAR: Controls and Inline Data Inputs */}
      <div className={`w-full md:w-[420px] shrink-0 border-r border-gray-900 flex flex-col bg-gray-950/80 overflow-hidden ${mobileView === 'edit' ? 'flex h-full' : 'hidden md:flex'}`}>
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-900 bg-gray-950/50 p-2 gap-1.5 shrink-0 items-center">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-400 hover:text-gray-200 text-xs px-2.5 py-2 rounded-lg transition-colors cursor-pointer font-bold shrink-0 active:scale-[0.98]"
              title={currentLanguage === 'id' ? 'Kembali ke Tools PDF' : 'Back to PDF Tools'}
            >
              ⬅️
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              activeTab === 'editor' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200 bg-gray-900/30'
            }`}
          >
            {currentLanguage === 'id' ? '📝 Form Data' : '📝 Profile & Data'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('html')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              activeTab === 'html' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200 bg-gray-900/30'
            }`}
          >
            HTML Template
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('css')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              activeTab === 'css' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200 bg-gray-900/30'
            }`}
          >
            CSS Template
          </button>
        </div>

        {/* Tab Scroll Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-6">
          
          {/* TAB 1: FORM DATA EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-6">
              {/* PAGE SIZE CONFIGURATION */}
              <div className="bg-gray-950 border border-gray-850 p-3 rounded-lg flex items-center justify-between gap-4">
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  {currentLanguage === 'id' ? 'Ukuran Halaman PDF:' : 'PDF Page Size:'}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value)}
                  className="bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs font-semibold text-gray-200 focus:border-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="a4">A4 (210 x 297 mm)</option>
                  <option value="f4">F4 / Folio (215.9 x 330.2 mm)</option>
                  <option value="b5">B5 (176 x 250 mm)</option>
                  <option value="letter">Letter (8.5 x 11 in)</option>
                  <option value="legal">Legal (8.5 x 14 in)</option>
                </select>
              </div>

              <div className="space-y-4 w-full max-w-full">
                <div className="flex justify-between items-center border-b border-gray-900 pb-1.5 w-full max-w-full">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {currentLanguage === 'id' ? 'Profil Utama' : 'Main Profile'}
                  </h3>
                  <div className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={expandAll}
                      className="text-[9px] font-bold text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                    >
                      {currentLanguage === 'id' ? 'Buka Semua' : 'Expand All'}
                    </button>
                    <span className="text-[9px] text-gray-600 font-bold">|</span>
                    <button
                      type="button"
                      onClick={collapseAll}
                      className="text-[9px] font-bold text-gray-400 hover:text-gray-350 hover:underline cursor-pointer"
                    >
                      {currentLanguage === 'id' ? 'Tutup Semua' : 'Collapse All'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-3.5 w-full max-w-full">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                      {currentLanguage === 'id' ? 'Nama Lengkap' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full max-w-full min-w-0 bg-gray-900 border border-gray-850 rounded-lg px-3 py-2 text-xs text-gray-200 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                      {currentLanguage === 'id' ? 'Judul Pekerjaan' : 'Job Title / Role'}
                    </label>
                    <input
                      type="text"
                      value={profile.role}
                      onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full max-w-full min-w-0 bg-gray-900 border border-gray-850 rounded-lg px-3 py-2 text-xs text-gray-200 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  {/* Dynamic Contacts List */}
                  <div className="space-y-2 w-full max-w-full">
                    <div className="flex justify-between items-center w-full max-w-full">
                      <label className="text-[10px] uppercase font-bold text-gray-500 block">
                        📞 {currentLanguage === 'id' ? 'Kontak & Tautan' : 'Contact Information & Links'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newContact = { id: `c-${Date.now()}`, type: 'generic', value: '', include: true };
                          setProfile(prev => ({ ...prev, contacts: [...(prev.contacts || []), newContact] }));
                        }}
                        className="text-[9px] font-bold text-purple-400 hover:text-purple-300 border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 rounded cursor-pointer shrink-0"
                      >
                        + Add Contact
                      </button>
                    </div>

                    {(!profile.contacts || profile.contacts.length === 0) ? (
                      <p className="text-[10px] text-gray-650 italic">No contact information added yet.</p>
                    ) : (
                      <div className="space-y-2 w-full max-w-full">
                        {profile.contacts.map(c => (
                          <div key={c.id} className="flex gap-2 items-center w-full max-w-full">
                            <input
                              type="checkbox"
                              checked={c.include !== false}
                              onChange={(e) => {
                                setProfile(prev => ({
                                  ...prev,
                                  contacts: prev.contacts.map(item => item.id === c.id ? { ...item, include: e.target.checked } : item)
                                }));
                              }}
                              className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                            />
                             {/* Custom Flaticon Dropdown Selector */}
                             <div className="relative shrink-0">
                               <button
                                 type="button"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setActiveDropdownId(activeDropdownId === c.id ? null : c.id);
                                 }}
                                 className="bg-gray-900 border border-gray-850 rounded-lg px-2.5 py-2 text-[11px] text-gray-300 w-28 flex items-center justify-between gap-1 focus:outline-none cursor-pointer hover:border-purple-500/50"
                               >
                                 <span className="flex items-center gap-1.5 truncate">
                                   <i className={`${getContactFlaticonClass(c.type)} text-purple-400`} style={{ fontSize: '10px' }}></i>
                                   <span className="capitalize">{c.type === 'generic' ? 'Other' : (c.type === 'website' ? 'Link' : c.type)}</span>
                                 </span>
                                 <span className="text-[8px] text-gray-500">▼</span>
                               </button>
                               
                               {activeDropdownId === c.id && (
                                 <>
                                   <div 
                                     className="fixed inset-0 z-10" 
                                     onClick={() => setActiveDropdownId(null)}
                                   />
                                   <div className="absolute left-0 mt-1 w-32 bg-gray-950 border border-gray-850 rounded-lg shadow-xl z-20 py-1 max-h-60 overflow-y-auto">
                                     {CONTACT_TYPES.map(option => (
                                       <button
                                         key={option.value}
                                         type="button"
                                         onClick={() => {
                                           setProfile(prev => ({
                                             ...prev,
                                             contacts: prev.contacts.map(item => item.id === c.id ? { ...item, type: option.value } : item)
                                           }));
                                           setActiveDropdownId(null);
                                         }}
                                         className="w-full text-left px-2.5 py-1.5 text-[11px] text-gray-300 hover:bg-purple-600 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                                       >
                                         <i className={`${getContactFlaticonClass(option.value)} ${c.type === option.value ? 'text-purple-400' : 'text-gray-400'}`} style={{ fontSize: '10px' }}></i>
                                         <span>{option.label === 'Website' ? 'Link' : option.label}</span>
                                       </button>
                                     ))}
                                   </div>
                                 </>
                               )}
                             </div>
                            <input
                              type="text"
                              value={c.value}
                              onChange={(e) => {
                                setProfile(prev => ({
                                  ...prev,
                                  contacts: prev.contacts.map(item => item.id === c.id ? { ...item, value: e.target.value } : item)
                                }));
                              }}
                              className="flex-1 min-w-0 bg-gray-900 border border-gray-850 rounded-lg px-2 py-2 text-xs text-gray-200 focus:outline-none"
                              placeholder="username, URL, or value"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setProfile(prev => ({
                                  ...prev,
                                  contacts: prev.contacts.filter(item => item.id !== c.id)
                                }));
                              }}
                              className="text-xs text-red-500 hover:text-red-400 font-bold px-1.5 py-1 shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                      {currentLanguage === 'id' ? 'Ringkasan Karir' : 'Career Objective / Summary'}
                    </label>
                    <textarea
                      value={profile.careerObjective}
                      onChange={(e) => setProfile(prev => ({ ...prev, careerObjective: e.target.value }))}
                      rows={4}
                      className="w-full max-w-full min-w-0 bg-gray-900 border border-gray-850 rounded-lg px-3 py-2 text-xs text-gray-200 focus:border-purple-500 focus:outline-none resize-y"
                      placeholder="Write a brief professional summary..."
                    />
                  </div>
                </div>
              </div>

              {/* Work Experience Section (Inline Editable Rows) */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center border-b border-gray-900 pb-1.5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    💼 {currentLanguage === 'id' ? 'Pengalaman Kerja' : 'Work Experience'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => addRecord('experience')}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 rounded cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
                
                {experiences.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">No experience records yet.</p>
                ) : (
                  <div className="space-y-3">
                    {experiences.map(item => {
                      const isExpanded = !!expandedRecords[item.id];
                      return (
                        <div key={item.id} className="bg-gray-900/30 border border-gray-850 rounded-xl overflow-hidden transition-all duration-300">
                          {/* Row Header */}
                          <div className="p-3 flex items-center justify-between gap-2.5 bg-gray-900/60 border-b border-gray-850/50">
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={item.include}
                                onChange={() => toggleInclude(item.id)}
                                className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <span 
                                onClick={() => toggleExpand(item.id)} 
                                className="text-xs font-bold text-gray-200 truncate cursor-pointer hover:text-purple-400 flex-1"
                              >
                                {item.title || (currentLanguage === 'id' ? '[Posisi Baru]' : '[New Position]')}
                                <span className="text-[10px] text-gray-500 font-medium block truncate">
                                  {item.organization || (currentLanguage === 'id' ? '[Perusahaan]' : '[Company]')}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleExpand(item.id)}
                                className="text-[10px] text-gray-400 hover:text-gray-200"
                              >
                                {isExpanded ? '▲' : '▼'}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteRecord(item.id)}
                                className="text-xs text-red-500 hover:text-red-400 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Row Body (Expanded Fields) */}
                          {isExpanded && (
                            <div className="p-3.5 space-y-3 bg-gray-950/40 border-t border-gray-900">
                              <div className="grid grid-cols-2 gap-2.5">
                                <div className="col-span-2">
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Position Title</label>
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. Senior Frontend Developer"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Company / Org</label>
                                  <input
                                    type="text"
                                    value={item.organization}
                                    onChange={(e) => handleFieldChange(item.id, 'organization', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. Contoso LLC"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Start Date</label>
                                  <input
                                    type="text"
                                    value={item.datestart}
                                    onChange={(e) => handleFieldChange(item.id, 'datestart', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. Jan 2024"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">End Date</label>
                                  <input
                                    type="text"
                                    value={item.dateend}
                                    onChange={(e) => handleFieldChange(item.id, 'dateend', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="Present"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Work Type</label>
                                  <select
                                    value={item.workType}
                                    onChange={(e) => handleFieldChange(item.id, 'workType', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
                                  >
                                    <option value="onsite">On-Site</option>
                                    <option value="hybrid">Hybrid</option>
                                    <option value="remote">Remote</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Location</label>
                                  <input
                                    type="text"
                                    value={item.place}
                                    onChange={(e) => handleFieldChange(item.id, 'place', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. Detroit, MI"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Description (One bullet per line)</label>
                                  <textarea
                                    value={item.description}
                                    onChange={(e) => handleFieldChange(item.id, 'description', e.target.value)}
                                    rows={3}
                                    className="w-full bg-gray-900 border border-gray-855 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none resize-y"
                                    placeholder="Bullet point 1&#10;Bullet point 2"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Education Section (Inline Editable Rows) */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center border-b border-gray-900 pb-1.5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    🎓 {currentLanguage === 'id' ? 'Pendidikan' : 'Education'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => addRecord('education')}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 rounded cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {educations.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">No education records yet.</p>
                ) : (
                  <div className="space-y-3">
                    {educations.map(item => {
                      const isExpanded = !!expandedRecords[item.id];
                      return (
                        <div key={item.id} className="bg-gray-900/30 border border-gray-850 rounded-xl overflow-hidden transition-all duration-300">
                          {/* Row Header */}
                          <div className="p-3 flex items-center justify-between gap-2.5 bg-gray-900/60 border-b border-gray-855/50">
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={item.include}
                                onChange={() => toggleInclude(item.id)}
                                className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <span 
                                onClick={() => toggleExpand(item.id)} 
                                className="text-xs font-bold text-gray-200 truncate cursor-pointer hover:text-purple-400 flex-1"
                              >
                                {item.title || (currentLanguage === 'id' ? '[Jurusan Baru]' : '[New Major]')}
                                <span className="text-[10px] text-gray-500 font-medium block truncate">
                                  {item.organization || (currentLanguage === 'id' ? '[Sekolah/Kampus]' : '[Institution]')}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleExpand(item.id)}
                                className="text-[10px] text-gray-400 hover:text-gray-200"
                              >
                                {isExpanded ? '▲' : '▼'}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteRecord(item.id)}
                                className="text-xs text-red-500 hover:text-red-400 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Row Body (Expanded Fields) */}
                          {isExpanded && (
                            <div className="p-3.5 space-y-3 bg-gray-950/40 border-t border-gray-900">
                              <div className="grid grid-cols-2 gap-2.5">
                                <div className="col-span-2">
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Degree / Major</label>
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. B.Sc. in Computer Science"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">School / University</label>
                                  <input
                                    type="text"
                                    value={item.organization}
                                    onChange={(e) => handleFieldChange(item.id, 'organization', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-855 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. Michigan State University"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Start Date</label>
                                  <input
                                    type="text"
                                    value={item.datestart}
                                    onChange={(e) => handleFieldChange(item.id, 'datestart', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. 2016"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">End Date</label>
                                  <input
                                    type="text"
                                    value={item.dateend}
                                    onChange={(e) => handleFieldChange(item.id, 'dateend', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. 2020"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">GPA / Score</label>
                                  <input
                                    type="text"
                                    value={item.nilai}
                                    onChange={(e) => handleFieldChange(item.id, 'nilai', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-855 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. GPA 3.85 / 4.00"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Details (Optional)</label>
                                  <textarea
                                    value={item.description}
                                    onChange={(e) => handleFieldChange(item.id, 'description', e.target.value)}
                                    rows={2}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none resize-y"
                                    placeholder="Thesis, projects, specializations..."
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Achievements & Certifications (Inline Editable Rows) */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center border-b border-gray-900 pb-1.5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    🏆 {currentLanguage === 'id' ? 'Prestasi & Sertifikasi' : 'Achievements'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => addRecord('achievement')}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 rounded cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {achievements.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">No achievement records yet.</p>
                ) : (
                  <div className="space-y-3">
                    {achievements.map(item => {
                      const isExpanded = !!expandedRecords[item.id];
                      return (
                        <div key={item.id} className="bg-gray-900/30 border border-gray-850 rounded-xl overflow-hidden transition-all duration-300">
                          {/* Row Header */}
                          <div className="p-3 flex items-center justify-between gap-2.5 bg-gray-900/60 border-b border-gray-850/50">
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={item.include}
                                onChange={() => toggleInclude(item.id)}
                                className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <span 
                                onClick={() => toggleExpand(item.id)} 
                                className="text-xs font-bold text-gray-200 truncate cursor-pointer hover:text-purple-400 flex-1"
                              >
                                {item.title || (currentLanguage === 'id' ? '[Prestasi Baru]' : '[New Achievement]')}
                                <span className="text-[10px] text-gray-500 font-medium block truncate">
                                  {item.organization || (currentLanguage === 'id' ? '[Penerbit]' : '[Issuer]')}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleExpand(item.id)}
                                className="text-[10px] text-gray-400 hover:text-gray-200"
                              >
                                {isExpanded ? '▲' : '▼'}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteRecord(item.id)}
                                className="text-xs text-red-500 hover:text-red-400 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Row Body (Expanded Fields) */}
                          {isExpanded && (
                            <div className="p-3.5 space-y-3 bg-gray-950/40 border-t border-gray-900">
                              <div className="grid grid-cols-2 gap-2.5">
                                <div className="col-span-2">
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Achievement Title</label>
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. AWS Certified Solutions Architect"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Issuer / Organization</label>
                                  <input
                                    type="text"
                                    value={item.organization}
                                    onChange={(e) => handleFieldChange(item.id, 'organization', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. Amazon Web Services"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Date Earned</label>
                                  <input
                                    type="text"
                                    value={item.datestart}
                                    onChange={(e) => handleFieldChange(item.id, 'datestart', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. Feb 2024"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Score / Grade</label>
                                  <input
                                    type="text"
                                    value={item.nilai}
                                    onChange={(e) => handleFieldChange(item.id, 'nilai', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none"
                                    placeholder="e.g. Score: 820"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[9px] uppercase font-extrabold text-gray-500 block mb-0.5">Details (Optional)</label>
                                  <textarea
                                    value={item.description}
                                    onChange={(e) => handleFieldChange(item.id, 'description', e.target.value)}
                                    rows={2}
                                    className="w-full bg-gray-900 border border-gray-850 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none resize-y"
                                    placeholder="Description of the award or cert scope..."
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Utility Wizards & Rendering Actions */}
              <div className="pt-5 border-t border-gray-900 flex flex-col gap-3">
                {/* ASSIGN DATA TO CV TO RENDER BUTTON */}
                {/* ASSIGN DATA TO CV TO RENDER BUTTON */}
                <div className="flex gap-2 items-center w-full">
                  <button
                    type="button"
                    onClick={handleAssignData}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-95 text-white font-bold text-xs py-3 rounded-lg transition-all shadow-lg hover:shadow-purple-500/10 cursor-pointer text-center active:scale-[0.99]"
                  >
                    🎯 {currentLanguage === 'id' ? 'Terapkan Data ke CV' : 'Assign Data to CV to Render'}
                  </button>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0 bg-gray-900 border border-gray-800 px-3 py-3 rounded-lg hover:border-purple-500/30">
                    <input
                      type="checkbox"
                      checked={autoAssign}
                      onChange={(e) => setAutoAssign(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-gray-400">Auto</span>
                  </label>
                </div>

                {/* BATCH IMPORT MARKDOWN BUTTON */}
                <button
                  type="button"
                  onClick={triggerImportSelector}
                  className="w-full bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-200 font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer text-center"
                >
                  🚀 {currentLanguage === 'id' ? 'Impor File Markdown Massal' : 'Batch Markdown Import'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".md,.markdown"
                  className="hidden"
                  onChange={handleBatchImportChange}
                />

                {/* Beginner Guide Dropdown */}
                <details className="w-full bg-gray-950/40 border border-gray-900 rounded-xl p-3 text-[11px] text-gray-400 group cursor-pointer transition-all select-none">
                  <summary className="font-bold text-gray-300 flex items-center justify-between list-none [&::-webkit-details-marker]:hidden focus:outline-none">
                    <span>💡 Tips: Markdown Frontmatter Guide</span>
                    <span className="text-purple-400 font-mono text-[9px] group-open:rotate-180 transition-transform duration-200">▼</span>
                  </summary>
                  <div className="mt-2.5 space-y-2 text-gray-400 border-t border-gray-900 pt-2.5 select-text cursor-default leading-relaxed text-[10px]">
                    <p>
                      Frontmatter is metadata placed at the very beginning of a Markdown file bounded by triple-dashes (<code>---</code>).
                    </p>
                    <pre className="bg-gray-950 border border-gray-850 p-2.5 rounded text-[9px] font-mono text-purple-300 leading-normal overflow-x-auto">
{`---
title: Software Developer
organization: Contoso Suites
datestart: Jan 2024
dateend: Present
place: Detroit, MI
workType: hybrid
---
- Developed offline PDF editor.
- Optimized JavaScript canvas.`}
                    </pre>
                    <p className="text-[9px] text-gray-500">
                      Files are automatically parsed and added as editable items directly into your lists above!
                    </p>
                  </div>
                </details>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="flex-1 bg-gray-900 hover:bg-gray-850 border border-gray-800 text-xs py-2 rounded-lg transition-colors cursor-pointer text-center font-bold text-purple-400"
                  >
                    {isCopied ? '✅ Prompt Copied!' : '🤖 Copy AI Prompt'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetTemplates}
                    className="bg-gray-900 hover:bg-gray-855 border border-gray-800 text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer text-center"
                    title="Reset Default Template"
                  >
                    🔄
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: HTML TEMPLATE EDITOR */}
          {activeTab === 'html' && (
            <div className="h-full flex flex-col space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Edit HTML Raw Markup</span>
                <button
                  type="button"
                  onClick={handleResetTemplates}
                  className="text-[10px] text-red-400 hover:underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>
              <textarea
                value={htmlTemplate}
                onChange={(e) => setHtmlTemplate(e.target.value)}
                className="w-full flex-1 min-h-[400px] bg-gray-950 border border-gray-850 rounded-lg p-3 text-xs font-mono text-purple-300 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAssignData}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-95 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer text-center"
              >
                🎯 {currentLanguage === 'id' ? 'Terapkan Template HTML' : 'Apply HTML Template'}
              </button>
            </div>
          )}

          {/* TAB 3: CSS TEMPLATE EDITOR */}
          {activeTab === 'css' && (
            <div className="h-full flex flex-col space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Edit CSS Stylesheet</span>
                <button
                  type="button"
                  onClick={handleResetTemplates}
                  className="text-[10px] text-red-400 hover:underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>
              <textarea
                value={cssTemplate}
                onChange={(e) => setCssTemplate(e.target.value)}
                className="w-full flex-1 min-h-[400px] bg-gray-950 border border-gray-850 rounded-lg p-3 text-xs font-mono text-purple-300 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAssignData}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-95 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer text-center"
              >
                🎯 {currentLanguage === 'id' ? 'Terapkan CSS Template' : 'Apply CSS Template'}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT PREVIEW: Canvas rendering sandboxed in an iframe */}
      <div className={`flex-1 flex flex-col bg-gray-900/60 overflow-hidden relative ${mobileView === 'preview' ? 'flex h-full' : 'hidden md:flex'}`}>
        
        {/* Top toolbar */}
        <div className="h-14 border-b border-gray-900 bg-gray-950/60 flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:inline">
              {currentLanguage === 'id' ? 'Pratinjau Langsung' : 'Live Preview'}
            </span>
            <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-850 px-2 md:px-3 py-1 rounded-lg w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold">Zoom:</span>
              
              {/* Slider zoom controller */}
              <input
                type="range"
                min="0.3"
                max="2.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-16 sm:w-28 accent-purple-600 bg-gray-850 rounded-lg cursor-pointer h-1"
                title="Adjust Zoom"
              />
              
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(0.3, Number((prev - 0.05).toFixed(2))))}
                  className="text-xs hover:text-purple-400 px-1 font-extrabold cursor-pointer text-gray-500"
                >
                  -
                </button>
                <span className="text-[10px] sm:text-xs font-mono font-bold w-10 text-center text-gray-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(2.0, Number((prev + 0.05).toFixed(2))))}
                  className="text-xs hover:text-purple-400 px-1 font-extrabold cursor-pointer text-gray-500"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 items-center shrink-0">
            <button
              type="button"
              onClick={handleExportPDF}
              className="bg-gray-900 border border-gray-800 hover:bg-gray-850 text-gray-300 hover:text-white font-semibold text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 active:scale-[0.98]"
            >
              🖨️ {currentLanguage === 'id' ? 'Cetak / Simpan' : 'Print / Save'}
            </button>
          </div>
        </div>

        {/* Dynamic zooming container (with ref for pinch-to-zoom gestures) */}
        <div 
          ref={previewContainerRef}
          className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start bg-gray-950/40 relative font-sans select-none"
        >
          {(() => {
            const currentDims = PAGE_DIMENSIONS_MM[pageSize] || PAGE_DIMENSIONS_MM.a4;
            return (
              <div
                className="transition-all duration-150 shadow-2xl shrink-0"
                style={{
                  width: currentDims.w,
                  height: currentDims.h,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  marginBottom: `calc(${currentDims.h} * (${zoom} - 1))`
                }}
              >
                <iframe
                  ref={iframeRef}
                  title="A4 CV Preview Canvas"
                  srcDoc={previewHtml}
                  className="w-full h-full border border-gray-800 bg-white"
                />
              </div>
            );
          })()}
        </div>

      </div>

      {/* Bottom Navigation Bar for Mobile View switching */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-gray-900 bg-gray-950/95 backdrop-blur-md flex items-center justify-around z-20">
        <button
          type="button"
          onClick={() => setMobileView('edit')}
          className={`flex-1 py-1 text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
            mobileView === 'edit' ? 'text-purple-400' : 'text-gray-400'
          }`}
        >
          <span className="text-base">📝</span>
          <span>{currentLanguage === 'id' ? 'Form Data' : 'Profile & Data'}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('preview')}
          className={`flex-1 py-1 text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
            mobileView === 'preview' ? 'text-purple-400' : 'text-gray-400'
          }`}
        >
          <span className="text-base">👁️</span>
          <span>{currentLanguage === 'id' ? 'Pratinjau' : 'Live Preview'}</span>
        </button>
      </div>

    </div>
  );
}
