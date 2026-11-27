const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const CompanyInformation = require('../models/CompanyInformation');
const { formatCourseDuration, resolveStudentPhoto } = require('./templateRenderer');
const { getMarksheetNumberForStudent } = require('./marksheetNumber');
require('./fontLoader');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');
const MAIN_BRANCH_MARKSHEET_PATH = path.join(__dirname, '..', 'assets', 'main-branch-marksheet.jpg');
const FRANCHISE_MARKSHEET_PATH = path.join(__dirname, '..', 'assets', 'branch-marksheet.jpg');
const DEFAULT_IDCARD_FRAME_PATH = path.join(__dirname, '..', 'assets', 'default-idcard-frame.jpg');
const MAIN_BRANCH_CERTIFICATE_PATH = path.join(__dirname, '..', 'assets', 'main-branch-student-certificate.jpg');
const FRANCHISE_CERTIFICATE_PATH = path.join(__dirname, '..', 'assets', 'branch-student-certificate.jpg');
const loadedImageCache = new Map();

// Helper to safely load an image from path, buffer, data URL or remote URL
async function safeLoadImage(source) {
  if (!source) return null;
  const cacheKey = typeof source === 'string' ? source : null;
  if (cacheKey && loadedImageCache.has(cacheKey)) return loadedImageCache.get(cacheKey);

  const imagePromise = (async () => {
    try {
      if (typeof source === 'string') {
        if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('data:')) {
          return await loadImage(source);
        }
        if (fs.existsSync(source)) return await loadImage(source);
      } else if (Buffer.isBuffer(source)) {
        return await loadImage(source);
      }
    } catch (err) {
      console.warn('safeLoadImage warning:', err.message);
    }
    return null;
  })();

  if (cacheKey) {
    loadedImageCache.set(cacheKey, imagePromise);
    if (loadedImageCache.size > 128) loadedImageCache.delete(loadedImageCache.keys().next().value);
  }
  const image = await imagePromise;
  if (!image && cacheKey) loadedImageCache.delete(cacheKey);
  return image;
}

function drawContainedImage(ctx, image, x, y, maxWidth, maxHeight) {
  if (!image?.width || !image?.height) return;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height);
}

// Draw stylized script signature if no signature image exists
function drawScriptSignature(ctx, x, y, width = 120, height = 35, color = '#1a365d') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  // Loop & swoosh signature pattern
  ctx.moveTo(x + 5, y + height - 8);
  ctx.bezierCurveTo(x + 15, y - 5, x + 35, y + height - 15, x + 45, y + 5);
  ctx.bezierCurveTo(x + 55, y + height + 2, x + 70, y - 2, x + 85, y + 12);
  ctx.bezierCurveTo(x + 95, y + 25, x + 110, y + 8, x + width - 10, y + 18);
  ctx.stroke();

  // Decorative underline loop
  ctx.beginPath();
  ctx.lineWidth = 1.2;
  ctx.moveTo(x + 10, y + height - 2);
  ctx.bezierCurveTo(x + 40, y + height + 6, x + 90, y + height + 4, x + width + 5, y + height - 6);
  ctx.stroke();
  ctx.restore();
}

// Helper to draw text scaled down to fit strictly inside maxWidth with margin
function drawFittedHeaderText(ctx, text, centerX, centerY, maxWidth, baseFontSize, fontFamily = 'Arial', fontWeight = 'bold') {
  let size = baseFontSize;
  ctx.save();
  ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  const safeMaxWidth = Math.max(10, maxWidth - 14); // 7px margin on each side
  while (ctx.measureText(text).width > safeMaxWidth && size > 9) {
    size -= 0.5;
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  }
  ctx.fillText(text, centerX, centerY);
  ctx.restore();
}

// Draw Circular Official Seal Stamp
function drawCompanySeal(ctx, centerX, centerY, radius = 45, color = '#1e3a8a') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;

  // Outer circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner dashed circle
  ctx.beginPath();
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1.2;
  ctx.arc(centerX, centerY, radius - 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner solid circle
  ctx.beginPath();
  ctx.lineWidth = 1.5;
  ctx.arc(centerX, centerY, radius - 16, 0, Math.PI * 2);
  ctx.stroke();

  // Center emblem & text
  ctx.font = '900 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SES', centerX, centerY - 5);

  ctx.font = 'bold 8px Arial';
  ctx.fillText('PVT. LTD.', centerX, centerY + 8);

  // Top Arc: STARTOLOGY EDUCARE
  ctx.font = 'bold 6.5px Arial';
  const textTop = 'STARTOLOGY EDUCARE';
  const totalAngleTop = Math.PI * 0.8;
  const startAngleTop = -Math.PI / 2 - totalAngleTop / 2;
  const stepTop = totalAngleTop / (textTop.length - 1);

  for (let i = 0; i < textTop.length; i++) {
    const angle = startAngleTop + i * stepTop;
    ctx.save();
    ctx.translate(centerX + (radius - 10) * Math.cos(angle), centerY + (radius - 10) * Math.sin(angle));
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(textTop[i], 0, 0);
    ctx.restore();
  }

  // Bottom Arc: ★ SERVICES PVT LTD ★
  const textBottom = '★ SERVICES ★';
  const totalAngleBottom = Math.PI * 0.6;
  const startAngleBottom = Math.PI / 2 - totalAngleBottom / 2;
  const stepBottom = totalAngleBottom / (textBottom.length - 1);

  for (let i = 0; i < textBottom.length; i++) {
    const angle = startAngleBottom + i * stepBottom;
    ctx.save();
    ctx.translate(centerX + (radius - 10) * Math.cos(angle), centerY + (radius - 10) * Math.sin(angle));
    ctx.rotate(angle - Math.PI / 2);
    ctx.fillText(textBottom[i], 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

// Draw ISO 9001:2015 Gold Rosette Seal Badge
function drawIsoSeal(ctx, centerX, centerY, radius = 48) {
  ctx.save();

  // Rosette points
  const points = 24;
  const outerR = radius;
  const innerR = radius - 6;

  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Gold ring
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 15, 0, Math.PI * 2);
  ctx.stroke();

  // Text inside
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 8px Arial';
  ctx.fillText('★ CERTIFIED ★', centerX, centerY - 16);

  ctx.font = '900 18px Arial';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('ISO', centerX, centerY - 2);

  ctx.font = 'bold 10px Arial';
  ctx.fillStyle = '#b45309';
  ctx.fillText('9001:2015', centerX, centerY + 13);

  ctx.restore();
}

// Draw National Emblem & MSME & MCA Badge Graphics
function drawAccreditationLogos(ctx, startX, startY) {
  ctx.save();

  // 1. MSME Logo
  const msmeX = startX;
  const msmeY = startY;

  // MSME Box
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(msmeX, msmeY, 82, 34);

  ctx.fillStyle = '#b91c1c';
  ctx.font = '900 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('MSME', msmeX + 41, msmeY + 16);

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 5.5px Arial';
  ctx.fillText('MICRO, SMALL & MEDIUM ENTERPRISES', msmeX + 41, msmeY + 24);
  ctx.fillText('सूक्ष्म, लघु एवं मध्यम उद्यम', msmeX + 41, msmeY + 31);

  // 2. National Emblem of India (Ashoka Lion Capital representation)
  const emblemX = startX + 115;
  const emblemY = startY - 5;

  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';

  // Drawn Stylized Ashoka Pillar & Lions
  ctx.beginPath();
  ctx.moveTo(emblemX, emblemY + 5);
  ctx.lineTo(emblemX - 12, emblemY + 14);
  ctx.lineTo(emblemX - 8, emblemY + 24);
  ctx.lineTo(emblemX + 8, emblemY + 24);
  ctx.lineTo(emblemX + 12, emblemY + 14);
  ctx.closePath();
  ctx.fillStyle = '#475569';
  ctx.fill();

  // Wheel (Ashoka Chakra)
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(emblemX, emblemY + 28, 4, 0, Math.PI * 2);
  ctx.stroke();

  // Pedestal base
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(emblemX - 16, emblemY + 33, 32, 3);

  ctx.font = 'bold 6.5px Arial';
  ctx.fillText('सत्यमेव जयते', emblemX, emblemY + 41);
  ctx.font = 'bold 7px Arial';
  ctx.fillText('GOVERNMENT OF INDIA', emblemX, emblemY + 49);

  // 3. Ministry of Corporate Affairs (MCA)
  const mcaX = startX + 185;
  const mcaY = startY;

  // MCA blocks
  const colors = ['#2563eb', '#1e40af', '#1e3a8a'];
  const letters = ['M', 'C', 'A'];
  letters.forEach((l, idx) => {
    ctx.fillStyle = colors[idx];
    ctx.fillRect(mcaX + idx * 14, mcaY + 2, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(l, mcaX + idx * 14 + 6, mcaY + 11);
  });

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 8.5px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('MINISTRY OF', mcaX + 46, mcaY + 10);
  ctx.fillText('CORPORATE', mcaX + 46, mcaY + 19);
  ctx.fillText('AFFAIRS', mcaX + 46, mcaY + 28);

  ctx.font = 'bold 6.5px Arial';
  ctx.fillStyle = '#2563eb';
  ctx.fillText('GOVERNMENT OF INDIA', mcaX + 46, mcaY + 37);

  ctx.restore();
}

// Fallback Silhouette Avatar for Student Photo
function drawStudentAvatar(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = '#94a3b8';
  // Head
  ctx.beginPath();
  ctx.arc(x + width / 2, y + height * 0.38, width * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders
  ctx.beginPath();
  ctx.arc(x + width / 2, y + height * 0.95, width * 0.42, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * =========================================================================
 * 1. DEFAULT ID CARD CANVAS RENDERER
 * Renders the exact Side-by-Side Front and Back ID Card design from user image
 * =========================================================================
 */
exports.renderDefaultIdCardCanvas = async function(student, customFieldValues = {}, customCompanyInfo = null) {
  let companyInfo = customCompanyInfo;
  if (!companyInfo && mongoose.connection?.readyState === 1) {
    try {
      companyInfo = await CompanyInformation.findOne().lean();
    } catch (e) {
      console.warn('Could not fetch CompanyInformation for ID card:', e.message);
    }
  }

  // Dimensions for Two-Sided Dual-Card View (Front + Back side-by-side in old format)
  const cardW = 540;
  const cardH = 760;
  const gap = 40;
  const margin = 30;

  const totalW = margin * 2 + cardW * 2 + gap; // 1180px
  const totalH = margin * 2 + cardH;          // 820px

  const canvas = createCanvas(totalW, totalH);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, totalW, totalH);

  // Franchise vs Main Branch
  const isFranchise = Boolean(student.franchise && student.franchise.isMainBranch !== true);
  const franchiseName = student.franchise?.name ? String(student.franchise.name).trim() : '';

  // Load Custom or Default Logo
  let logoImg = null;
  if (companyInfo?.logo) {
    logoImg = await safeLoadImage(companyInfo.logo);
  }
  if (!logoImg) {
    logoImg = await safeLoadImage(LOGO_PATH);
  }

  // Load Watermark if available
  let watermarkImg = null;
  if (companyInfo?.watermarkImage) {
    watermarkImg = await safeLoadImage(companyInfo.watermarkImage);
  }

  // Load Company Seal if available
  let sealImg = null;
  if (companyInfo?.companySeal) {
    sealImg = await safeLoadImage(companyInfo.companySeal);
  }

  // Load Super Admin / Authorized Signature if available
  let signatureImg = null;
  if (companyInfo?.superAdminSignature) {
    signatureImg = await safeLoadImage(companyInfo.superAdminSignature);
  }

  // Load Student Photo
  let photoImg = null;
  const photoUrl = student.personalInfo?.photo || student.user?.profilePicture;
  if (photoUrl) {
    photoImg = await safeLoadImage(photoUrl);
  }

  // Extract Student Data
  const firstName = student.personalInfo?.firstName || '';
  const lastName = student.personalInfo?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim().toUpperCase() || 'STUDENT NAME';

  const courseTitle = (
    student.enrolledCourses?.[0]?.course?.title ||
    student.enrolledCourses?.[0]?.course?.name ||
    customFieldValues.course ||
    'CERTIFIED IT & VOCATIONAL SKILLS'
  ).toUpperCase();

  const studentId = student.studentId || customFieldValues.studentId || 'SES-STU-2026-0001';
  const fatherName = (student.personalInfo?.fatherName || customFieldValues.fatherName || '—').toUpperCase();

  let dob = '—';
  if (student.personalInfo?.dateOfBirth) {
    const d = new Date(student.personalInfo.dateOfBirth);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      dob = `${dd}/${mm}/${d.getFullYear()}`;
    }
  } else if (customFieldValues.dateOfBirth) {
    dob = customFieldValues.dateOfBirth;
  }

  const mobileNo = student.contactInfo?.mobile || student.personalInfo?.phone || customFieldValues.mobile || '—';
  const session = customFieldValues.session || (student.batch?.name || student.enrolledCourses?.[0]?.batch?.name || '2026 - 2027');

  const studyCenter = isFranchise
    ? (franchiseName || 'Arion School Study Center')
    : (companyInfo?.name || 'Arion School Central Campus');

  let rawAddress = '';
  if (typeof student.contactInfo?.address === 'string') {
    rawAddress = student.contactInfo.address;
  } else if (typeof student.contactInfo?.address === 'object' && student.contactInfo?.address) {
    const a = student.contactInfo.address;
    rawAddress = [a.street || a.addressLine1, a.city, a.state, a.pincode].filter(Boolean).join(', ');
  }
  if (!rawAddress) rawAddress = customFieldValues.address || (isFranchise ? 'CHHATTISGARH, INDIA' : 'CENTRAL CAMPUS, INDIA');

  // Sanitize address: replace newlines with comma and space to prevent canvas collision
  const cleanAddress = String(rawAddress).replace(/[\r\n]+/g, ', ').replace(/\s+/g, ' ').trim().toUpperCase();

  // Helper to draw EXACT SAME matching border on BOTH Front and Back cards
  function drawCardBorders(startX, startY) {
    // 1. Top-Right Blue Corner Bar
    ctx.fillStyle = '#25438d';
    ctx.fillRect(startX + cardW - 130, startY, 130, 24);
    ctx.fillRect(startX + cardW - 24, startY, 24, 180);

    // 2. Bottom-Left Red Corner Bar
    ctx.fillStyle = '#e04f47';
    ctx.fillRect(startX, startY + cardH - 24, 130, 24);
    ctx.fillRect(startX, startY + cardH - 180, 24, 180);

    // 3. Thin Red Framing Lines
    ctx.strokeStyle = '#e04f47';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX + 24, startY + cardH - 180);
    ctx.lineTo(startX + 24, startY + 24);
    ctx.lineTo(startX + cardW - 130, startY + 24);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX + cardW - 24, startY + 180);
    ctx.lineTo(startX + cardW - 24, startY + cardH - 24);
    ctx.lineTo(startX + 130, startY + cardH - 24);
    ctx.stroke();
  }

  // =========================================================================
  // CARD 1: FRONT (Left Card)
  // =========================================================================
  const frontX = margin;
  const frontY = margin;
  const frontCenterX = frontX + cardW / 2;

  // Card Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(frontX, frontY, cardW, cardH);

  // Draw Exact Same Border on Front Card
  drawCardBorders(frontX, frontY);

  function wrapTextSafely(text, maxWidth) {
    const words = String(text || '').trim().split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      if (!word) continue;

      if (ctx.measureText(word).width > maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        let chunk = '';
        for (let c = 0; c < word.length; c++) {
          const testChunk = chunk + word[c];
          if (ctx.measureText(testChunk).width > maxWidth && chunk) {
            lines.push(chunk);
            chunk = word[c];
          } else {
            chunk = testChunk;
          }
        }
        if (chunk) {
          currentLine = chunk;
        }
      } else {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(candidate).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = candidate;
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines.length ? lines : ['—'];
  }

  // Watermark
  if (watermarkImg) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    const wmSize = 250;
    ctx.drawImage(watermarkImg, frontCenterX - wmSize / 2, frontY + cardH / 2 - wmSize / 2, wmSize, wmSize);
    ctx.restore();
  }

  // Header: Generous spacing from top to logo (frontY + 36)
  let afterHeaderY = frontY + 36;
  if (logoImg) {
    const logoW = 140;
    const logoH = 66;
    drawContainedImage(ctx, logoImg, frontCenterX - logoW / 2, afterHeaderY, logoW, logoH);
    afterHeaderY += logoH + 14;

    if (isFranchise && franchiseName) {
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      const fLines = wrapTextSafely(franchiseName.toUpperCase(), cardW - 80);
      for (const fLine of fLines) {
        ctx.fillText(fLine, frontCenterX, afterHeaderY + 4);
        afterHeaderY += 18;
      }
      afterHeaderY += 4;
    }
  } else {
    ctx.fillStyle = '#1e3a8a';
    ctx.font = '900 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SES EDUCARE', frontCenterX, afterHeaderY + 26);
    afterHeaderY += 46;
  }

  // Header Ribbon / Tag: STUDENT IDENTITY CARD (with breathing room)
  const tagW = 275;
  const tagH = 28;
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(frontCenterX - tagW / 2, afterHeaderY, tagW, tagH);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('STUDENT IDENTITY CARD', frontCenterX, afterHeaderY + 19);

  // Student Photo (More spacing below ribbon)
  const photoW = 118;
  const photoH = 136;
  const photoX = frontCenterX - photoW / 2;
  const photoY = afterHeaderY + tagH + 14;

  if (photoImg) {
    ctx.drawImage(photoImg, photoX, photoY, photoW, photoH);
    ctx.strokeStyle = '#25438d';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(photoX, photoY, photoW, photoH);
  } else {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.strokeStyle = '#25438d';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(photoX, photoY, photoW, photoH);
    drawStudentAvatar(ctx, photoX + 15, photoY + 15, photoW - 30, photoH - 30);
  }

  // Student Name (More big text!)
  const nameY = photoY + photoH + 26;
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(fullName, frontCenterX, nameY);

  // Course Name (wrapped cleanly if long)
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'center';
  const cLines = wrapTextSafely(courseTitle, cardW - 80);
  let curCourseY = nameY + 22;
  for (const cLine of cLines) {
    ctx.fillText(cLine, frontCenterX, curCourseY);
    curCourseY += 18;
  }

  // Student ID Badge Pill
  const idPillY = curCourseY + 8;
  const pillW = 250;
  const pillH = 27;
  ctx.fillStyle = '#eff6ff';
  ctx.fillRect(frontCenterX - pillW / 2, idPillY, pillW, pillH);
  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(frontCenterX - pillW / 2, idPillY, pillW, pillH);

  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 13.5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`ID NO. : ${studentId}`, frontCenterX, idPillY + 18);

  // Details Table (Increased field and value font sizes, wrapping for Study Center & Address)
  const listStartX = frontX + 38;
  const colonX = frontX + 160;
  const valX = frontX + 175;
  const maxValW = 265; // Safe wrap boundary to guarantee zero border overflow
  let rowY = idPillY + pillH + 22;
  const rowGap = 28;

  const infoRows = [
    { label: "Father's Name", value: fatherName },
    { label: 'Date of Birth', value: dob },
    { label: 'Mobile No.', value: mobileNo },
    { label: 'Session', value: session },
    { label: 'Study Center', value: studyCenter },
    { label: 'Address', value: cleanAddress }
  ];

  ctx.textAlign = 'left';

  for (const row of infoRows) {
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px Arial';
    ctx.fillText(row.label, listStartX, rowY);

    ctx.fillStyle = '#64748b';
    ctx.fillText(':', colonX, rowY);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px Arial';

    const lines = wrapTextSafely(row.value, maxValW);
    let curY = rowY;
    for (const line of lines) {
      ctx.fillText(line, valX, curY);
      curY += 19;
    }
    rowY = curY + (rowGap - 19);
  }

  // Official Seal Stamp (Bottom-Left)
  if (sealImg) {
    ctx.drawImage(sealImg, frontX + 45, frontY + cardH - 100, 68, 68);
  } else {
    drawCompanySeal(ctx, frontX + 80, frontY + cardH - 65, 32, '#1e3a8a');
  }

  // Authorised Sign (Bottom-Right)
  const sigX = frontX + cardW - 110;
  if (signatureImg) {
    ctx.drawImage(signatureImg, sigX - 60, frontY + cardH - 100, 120, 42);
  } else {
    drawScriptSignature(ctx, sigX - 60, frontY + cardH - 96, 120, 32, '#1e3a8a');
  }

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(sigX - 60, frontY + cardH - 48);
  ctx.lineTo(sigX + 60, frontY + cardH - 48);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'italic bold 15px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(isFranchise ? 'Center Head' : 'Director', sigX, frontY + cardH - 56);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px Arial';
  ctx.fillText('Authorised Signatory', sigX, frontY + cardH - 34);


  // =========================================================================
  // CARD 2: BACK (Right Card - EXACT SAME BORDER AS FRONT CARD!)
  // =========================================================================
  const backX = margin + cardW + gap;
  const backY = margin;
  const backCenterX = backX + cardW / 2;

  // Card Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(backX, backY, cardW, cardH);

  // Draw Exact Same Border on Back Card!
  drawCardBorders(backX, backY);

  // Watermark on Back
  if (watermarkImg) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    const wmSize = 250;
    ctx.drawImage(watermarkImg, backCenterX - wmSize / 2, backY + cardH / 2 - wmSize / 2, wmSize, wmSize);
    ctx.restore();
  }

  // Header Logo (Generous top and bottom spacing)
  let backHeaderY = backY + 28;
  if (logoImg) {
    const logoW = 140;
    const logoH = 62;
    drawContainedImage(ctx, logoImg, backCenterX - logoW / 2, backHeaderY, logoW, logoH);
    backHeaderY += logoH + 48; // Generous 48px gap so logo and T&C text NEVER touch
  } else {
    backHeaderY += 56;
  }

  // Section Heading: TERMS & CONDITIONS
  ctx.fillStyle = '#1e3a8a';
  ctx.font = '900 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('TERMS & CONDITIONS', backCenterX, backHeaderY);

  // Terms & Conditions Bullet Points (Big, clear, well-spaced text)
  const terms = [
    'ID Card must be carried during class and lab sessions.',
    'Entry to class / examination will not be allowed without ID Card.',
    'The ID Card is non-transferable and must not be used by others.',
    'In case of lost or damaged ID Card, inform the institute immediately.'
  ];

  ctx.textAlign = 'left';
  let termY = backHeaderY + 30;

  for (const term of terms) {
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('•', backX + 46, termY);

    ctx.fillStyle = '#1e293b';
    ctx.font = '600 15px Arial';

    const maxW = cardW - 110;
    const words = term.split(' ');
    let line = '';
    let lineY = termY;

    for (let n = 0; n < words.length; n++) {
      const testLine = line ? (line + ' ' + words[n]) : words[n];
      if (ctx.measureText(testLine).width > maxW && line) {
        ctx.fillText(line, backX + 66, lineY);
        line = words[n];
        lineY += 19;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, backX + 66, lineY);
    termY = lineY + 31;
  }

  // Middle Section: Dynamic QR Verification
  const qrSectionY = termY + 10;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(backX + 40, qrSectionY);
  ctx.lineTo(backX + cardW - 40, qrSectionY);
  ctx.stroke();

  try {
    const verifyUrl = `https://myapp.seseducare.com/verify/id-card/${studentId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 90 });
    const qrImg = await safeLoadImage(qrDataUrl);
    if (qrImg) {
      const qrSize = 85;
      const qrX = backCenterX - 145;
      const qrY = qrSectionY + 16;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      ctx.fillStyle = '#64748b';
      ctx.font = '9.5px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Scan to Verify Card', qrX + qrSize / 2, qrY + qrSize + 13);
    }
  } catch (qrErr) {
    console.warn('QR generation error for back ID card:', qrErr.message);
  }

  // Right side of QR: Credential verification shield badge
  const credX = backCenterX + 55;
  const qrCenterY = qrSectionY + 16;
  ctx.fillStyle = '#15803d';
  ctx.font = '900 15px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('★ VERIFIED STUDENT ★', credX, qrCenterY + 22);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Arial';
  ctx.fillText('Official Digital Credential', credX, qrCenterY + 42);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`Valid Session: ${session}`, credX, qrCenterY + 62);

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 11px Arial';
  ctx.fillText('Govt. Recognized • ISO 9001:2015', credX, qrCenterY + 80);

  // Lower Section: Office Location & Big Contact Details
  const officeSectionY = qrCenterY + 85 + 28;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(backX + 40, officeSectionY);
  ctx.lineTo(backX + cardW - 40, officeSectionY);
  ctx.stroke();

  const officeStreet = companyInfo?.address?.street || 'First Floor, Gariyaband Road';
  const officeCity = companyInfo?.address?.city
    ? `${companyInfo.address.city}${companyInfo.address.state ? ` (${companyInfo.address.state})` : ''}`
    : 'Near SBI Bank, Rajim, Chhattisgarh';
  const phoneVal = companyInfo?.phone || '+91 91651 79272';
  const webVal = companyInfo?.website || 'www.seseducare.com';

  ctx.textAlign = 'center';
  ctx.fillStyle = '#1e3a8a';
  ctx.font = '900 16px Arial';
  ctx.fillText(isFranchise ? 'AUTHORISED STUDY CENTER' : 'CENTRAL ADMINISTRATIVE CAMPUS', backCenterX, officeSectionY + 22);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14.5px Arial';
  ctx.fillText(officeStreet, backCenterX, officeSectionY + 44);

  ctx.fillStyle = '#475569';
  ctx.font = '600 13.5px Arial';
  ctx.fillText(officeCity, backCenterX, officeSectionY + 64);

  // Contact Section with BIG prominent text
  ctx.fillStyle = '#dc2626';
  ctx.font = '900 16px Arial';
  ctx.fillText('HELPLINE & SUPPORT', backCenterX, officeSectionY + 94);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 28px Arial';
  ctx.fillText(phoneVal, backCenterX, officeSectionY + 128);

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(webVal, backCenterX, officeSectionY + 154);

  return canvas.toBuffer('image/png');
};



/**
 * =========================================================================
 * 2. DEFAULT MARKSHEET CANVAS RENDERER
 * Renders the exact Marksheet layout from user image with 100% vector accuracy
 * =========================================================================
 */
exports.renderDefaultMarksheetCanvas = async function(data) {
  const { student, course, marks = [], totalMarks = 500, totalObtainedMarks = 0, percentage = 0, grade = 'A+', qrCodeDataUrl } = data;

  let companyInfo = data.companyInfo;
  if (!companyInfo && mongoose.connection?.readyState === 1) {
    try {
      companyInfo = await CompanyInformation.findOne().lean();
    } catch (e) {
      console.warn('Could not fetch CompanyInformation for marksheet:', e.message);
    }
  }

  const mainBranchBackground = await safeLoadImage(MAIN_BRANCH_MARKSHEET_PATH);
  const isMainBranchStudent = !data.student?.franchise || data.student.franchise.isMainBranch === true;
  const franchiseBackground = isMainBranchStudent ? null : await safeLoadImage(FRANCHISE_MARKSHEET_PATH);
  const selectedBackground = isMainBranchStudent ? mainBranchBackground : (franchiseBackground || mainBranchBackground);
  if (selectedBackground) {
    return renderMainBranchMarksheet(data, companyInfo, selectedBackground, { isFranchise: !isMainBranchStudent });
  }

  // A4 dimensions at 150 DPI
  const width = 1240;
  const height = 1754;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Load Logos & Template Assets
  let logoImg = null;
  if (companyInfo?.logo) {
    logoImg = await safeLoadImage(companyInfo.logo);
  }
  if (!logoImg) {
    logoImg = await safeLoadImage(LOGO_PATH);
  }

  let watermarkImg = null;
  if (companyInfo?.watermarkImage) {
    watermarkImg = await safeLoadImage(companyInfo.watermarkImage);
  }

  let sealImg = null;
  if (companyInfo?.companySeal) {
    sealImg = await safeLoadImage(companyInfo.companySeal);
  }

  let ceoSigImg = null;
  if (companyInfo?.superAdminSignature) {
    ceoSigImg = await safeLoadImage(companyInfo.superAdminSignature);
  }

  let controllerSigImg = null;
  if (companyInfo?.controllerSignature) {
    controllerSigImg = await safeLoadImage(companyInfo.controllerSignature);
  }

  let isoImg = null;
  if (companyInfo?.isoLogo) {
    isoImg = await safeLoadImage(companyInfo.isoLogo);
  }

  let msmeImg = null;
  if (companyInfo?.msmeLogo) {
    msmeImg = await safeLoadImage(companyInfo.msmeLogo);
  }

  let govtEmblemImg = null;
  if (companyInfo?.govtEmblem) {
    govtEmblemImg = await safeLoadImage(companyInfo.govtEmblem);
  }

  let skillIndiaImg = null;
  if (companyInfo?.skillIndiaLogo) {
    skillIndiaImg = await safeLoadImage(companyInfo.skillIndiaLogo);
  }

  let photoImg = null;
  const photoUrl = student.personalInfo?.photo || student.user?.profilePicture;
  if (photoUrl) {
    photoImg = await safeLoadImage(photoUrl);
  }

  // Generate dynamic QR Code if not provided
  let qrImg = null;
  if (qrCodeDataUrl) {
    qrImg = await safeLoadImage(qrCodeDataUrl);
  } else {
    try {
      const qrData = student.enrollmentNumber || student.studentId || 'SES-EDUCARE-VERIFIED';
      const autoQrUrl = await QRCode.toDataURL(qrData, { margin: 1 });
      qrImg = await safeLoadImage(autoQrUrl);
    } catch {}
  }

  // Watermark (subtle background emblem)
  if (watermarkImg) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    const wmSize = 520;
    ctx.drawImage(watermarkImg, (width - wmSize) / 2, (height - wmSize) / 2 + 50, wmSize, wmSize);
    ctx.restore();
  }

  // -------------------------------------------------------------
  // BORDERS
  // -------------------------------------------------------------
  // Outer thin dark border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  // Inner bold solid red border (Image match)
  ctx.strokeStyle = '#c5221f';
  ctx.lineWidth = 10;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Micro inner border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // -------------------------------------------------------------
  // HEADER
  // -------------------------------------------------------------
  const legalNameVal = (companyInfo?.legalName || 'STARTOLOGY EDUCARE  SERVICES PVT.LTD.').toUpperCase();
  const cinVal = companyInfo?.cin || companyInfo?.registrationNumber || 'U78100CT2025PTC018743';
  const isoVal = companyInfo?.isoNumber || 'ISO 9001:2015';

  ctx.fillStyle = '#c5221f';
  ctx.font = '900 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(legalNameVal, width / 2, 72);

  // Left: Official SES Logo
  if (logoImg) {
    const logoW = 150;
    const logoH = 80;
    ctx.drawImage(logoImg, 55, 90, logoW, logoH);
  }

  // Center Subtitle Information
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';

  ctx.font = '900 15px Arial';
  ctx.fillText(`Reg.No: ${cinVal}`, width / 2, 114);

  ctx.font = 'bold 15px Arial';
  ctx.fillText('Registered Under Ministry of Corporate Affairs, Govt. of India', width / 2, 138);

  ctx.font = 'bold 15px Arial';
  ctx.fillText(`An ${isoVal} Certified Company`, width / 2, 162);

  // Right: Student Passport Photo
  const photoW = 110;
  const photoH = 135;
  const photoX = width - 55 - photoW;
  const photoY = 88;

  if (photoImg) {
    ctx.drawImage(photoImg, photoX, photoY, photoW, photoH);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.strokeRect(photoX, photoY, photoW, photoH);
  } else {
    drawStudentAvatar(ctx, photoX, photoY, photoW, photoH);
  }

  // -------------------------------------------------------------
  // DOCUMENT TITLE: MARKSHEET
  // -------------------------------------------------------------
  const marksheetY = 250;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  const titleRuleWidth = ctx.measureText('MARKSHEET').width + 24;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;

  // Top framing line
  ctx.beginPath();
  ctx.moveTo(width / 2 - titleRuleWidth / 2, marksheetY - 26);
  ctx.lineTo(width / 2 + titleRuleWidth / 2, marksheetY - 26);
  ctx.stroke();

  // Bottom framing line
  ctx.beginPath();
  ctx.moveTo(width / 2 - titleRuleWidth / 2, marksheetY + 12);
  ctx.lineTo(width / 2 + titleRuleWidth / 2, marksheetY + 12);
  ctx.stroke();

  ctx.fillText('MARKSHEET', width / 2, marksheetY);

  // -------------------------------------------------------------
  // STUDENT & COURSE INFORMATION GRID (Two Columns, aligned colons)
  // -------------------------------------------------------------
  const firstName = student.personalInfo?.firstName || '';
  const lastName = student.personalInfo?.lastName || '';
  const studentFullName = `${firstName} ${lastName}`.trim().toUpperCase() || 'STUDENT NAME';

  const fatherName = (student.personalInfo?.fatherName || '—').toUpperCase();
  const motherName = (student.personalInfo?.motherName || '—').toUpperCase();

  let dob = '—';
  if (student.personalInfo?.dateOfBirth) {
    const d = new Date(student.personalInfo.dateOfBirth);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    dob = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  const gender = (student.personalInfo?.gender || 'Male').replace(/\b\w/g, l => l.toUpperCase());
  const courseTitle = course?.title || 'Computer Application';
  let duration = data.duration || course?.duration;
  if (!duration && course?.durationValue) {
    const unit = course.durationType ? (course.durationType.charAt(0).toUpperCase() + course.durationType.slice(1)) : 'Months';
    duration = `${course.durationValue} ${unit}`;
  } else if (!duration && course?.totalHours) {
    duration = `${course.totalHours} Hours`;
  }
  if (!duration) duration = '6 Months';
  else if (!/\b(month|year|week|day|hour)s?\b/i.test(String(duration).trim())) duration = `${String(duration).trim()} Months`;

  let sessionVal = data.session || student.session || student.academicInfo?.session || student.enrolledCourses?.[0]?.session || student.enrolledCourses?.[0]?.batch?.name;
  if (!sessionVal) {
    const d = student.admissionDate || student.createdAt || new Date();
    const yr = new Date(d).getFullYear();
    sessionVal = `${yr} - ${yr + 1}`;
  }

  let marksheetNo = data.marksheetNumber;
  if (!marksheetNo || String(marksheetNo).startsWith('SES-CERT')) {
    marksheetNo = getMarksheetNumberForStudent(student, new Date().getFullYear(), data.certificateNumber);
  }
  if (String(marksheetNo).startsWith('SES-CERT-')) {
    marksheetNo = String(marksheetNo).replace(/^SES-CERT-/i, 'SES-MARKS-');
  }

  const enrollmentNo = student.enrollmentNumber || student.studentId || 'SES-ENR-2026-0001';

  const leftColX = 75;
  const leftColonX = 230;
  const leftValX = 250;

  const rightColX = 640;
  const rightColonX = 815;
  const rightValX = 835;

  let infoY = 300;
  const infoRowH = 32;

  const leftFields = [
    { label: 'Student Name', value: studentFullName },
    { label: "Father's Name", value: fatherName },
    { label: 'Mothers Name', value: motherName },
    { label: 'Date Of Birth', value: dob },
    { label: 'Gender', value: gender }
  ];

  const rightFields = [
    { label: 'Course', value: courseTitle },
    { label: 'Duration', value: duration },
    { label: 'Session', value: sessionVal },
    { label: 'Marksheet No.', value: marksheetNo },
    { label: 'Enrollment No.', value: enrollmentNo }
  ];

  for (let i = 0; i < 5; i++) {
    const rowY = infoY + i * infoRowH;

    // Left Column
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px Arial';
    ctx.fillText(leftFields[i].label, leftColX, rowY);
    ctx.fillText(':', leftColonX, rowY);

    ctx.font = '500 15px monospace';
    ctx.fillText(leftFields[i].value, leftValX, rowY);

    // Right Column
    ctx.font = 'bold 15px Arial';
    ctx.fillText(rightFields[i].label, rightColX, rowY);
    ctx.fillText(':', rightColonX, rowY);

    ctx.font = '500 15px monospace';
    ctx.fillText(rightFields[i].value, rightValX, rowY);
  }

  // -------------------------------------------------------------
  // STATEMENT OF MARKS SECTION
  // -------------------------------------------------------------
  const statementY = 480;
  ctx.fillStyle = '#c5221f';
  ctx.font = '900 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('STATEMENT OF MARKS', width / 2, statementY);

  // -------------------------------------------------------------
  // MARKS TABLE (5 Columns: SR. NO. | SUBJECT | MAX. | MIN. | OBTAINED MARKS)
  // -------------------------------------------------------------
  const tableX = 110;
  const tableW = width - 220; // 1020px
  const tableTopY = 510;

  const col0W = Math.round(tableW * 0.08); // 82px - SR. NO.
  const col1W = Math.round(tableW * 0.47); // 479px - SUBJECT
  const col2W = Math.round(tableW * 0.10); // 102px - MAX.
  const col3W = Math.round(tableW * 0.10); // 102px - MIN.
  const col4W = tableW - col0W - col1W - col2W - col3W; // 255px - OBTAINED MARKS (~25%)

  const col0X = tableX;
  const col1X = col0X + col0W;
  const col2X = col1X + col1W;
  const col3X = col2X + col2W;
  const col4X = col3X + col3W;

  const headerH = 46;
  const rowH = 42;

  // Header Row
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(tableX, tableTopY, tableW, headerH);
  ctx.beginPath();
  ctx.moveTo(col1X, tableTopY);
  ctx.lineTo(col1X, tableTopY + headerH);
  ctx.moveTo(col2X, tableTopY);
  ctx.lineTo(col2X, tableTopY + headerH);
  ctx.moveTo(col3X, tableTopY);
  ctx.lineTo(col3X, tableTopY + headerH);
  ctx.moveTo(col4X, tableTopY);
  ctx.lineTo(col4X, tableTopY + headerH);
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawFittedHeaderText(ctx, 'SR. NO.', col0X + col0W / 2, tableTopY + headerH / 2, col0W, 14, 'Arial', '900');
  drawFittedHeaderText(ctx, 'SUBJECT', col1X + col1W / 2, tableTopY + headerH / 2, col1W, 14, 'Arial', '900');
  drawFittedHeaderText(ctx, 'MAX.', col2X + col2W / 2, tableTopY + headerH / 2, col2W, 14, 'Arial', '900');
  drawFittedHeaderText(ctx, 'MIN.', col3X + col3W / 2, tableTopY + headerH / 2, col3W, 14, 'Arial', '900');
  drawFittedHeaderText(ctx, 'OBTAINED MARKS', col4X + col4W / 2, tableTopY + headerH / 2, col4W, 14, 'Arial', '900');

  // Default marks rows if none provided
  const displayMarks = (marks && marks.length > 0) ? marks : [
    { subject: 'FUNDAMENTALS OF COMPUTER & IT', totalMarks: 100, minMarks: 40, obtainedMarks: 91 },
    { subject: 'MICROSOFT OFFICE WORD', totalMarks: 100, minMarks: 40, obtainedMarks: 89 },
    { subject: 'MICROSOFT OFFICE EXCEL', totalMarks: 100, minMarks: 40, obtainedMarks: 90 },
    { subject: 'MICROSOFT OFFICE POWERPOINT', totalMarks: 100, minMarks: 40, obtainedMarks: 94 },
    { subject: 'MICROSOFT OFFICE ACCESS', totalMarks: 100, minMarks: 40, obtainedMarks: 89 }
  ];

  let currentTableRowY = tableTopY + headerH;

  displayMarks.forEach((mark, index) => {
    ctx.strokeRect(tableX, currentTableRowY, tableW, rowH);
    ctx.beginPath();
    ctx.moveTo(col1X, currentTableRowY);
    ctx.lineTo(col1X, currentTableRowY + rowH);
    ctx.moveTo(col2X, currentTableRowY);
    ctx.lineTo(col2X, currentTableRowY + rowH);
    ctx.moveTo(col3X, currentTableRowY);
    ctx.lineTo(col3X, currentTableRowY + rowH);
    ctx.moveTo(col4X, currentTableRowY);
    ctx.lineTo(col4X, currentTableRowY + rowH);
    ctx.stroke();

    const minScore = mark.minMarks != null ? mark.minMarks : Math.round((Number(mark.totalMarks) || 100) * 0.4);

    ctx.textBaseline = 'middle';
    // SR. NO. (Centered)
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(String(index + 1), col0X + col0W / 2, currentTableRowY + rowH / 2);

    // Subject Name (Left-aligned with padding)
    ctx.textAlign = 'left';
    ctx.font = '600 13px Arial';
    ctx.fillText((mark.subject || '').toUpperCase(), col1X + 14, currentTableRowY + rowH / 2, col1W - 20);

    // Max Marks (Centered)
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(String(mark.totalMarks ?? 100), col2X + col2W / 2, currentTableRowY + rowH / 2);

    // Min Marks (Centered)
    ctx.fillText(String(minScore), col3X + col3W / 2, currentTableRowY + rowH / 2);

    // Obtained Marks (Centered)
    ctx.fillText(String(mark.obtainedMarks ?? 0), col4X + col4W / 2, currentTableRowY + rowH / 2);

    currentTableRowY += rowH;
  });

  const totalMinMarks = displayMarks.reduce((sum, m) => sum + (m.minMarks != null ? Number(m.minMarks) : Math.round((Number(m.totalMarks) || 100) * 0.4)), 0);

  // TOTAL ROW
  ctx.strokeRect(tableX, currentTableRowY, tableW, rowH);
  ctx.beginPath();
  ctx.moveTo(col1X, currentTableRowY);
  ctx.lineTo(col1X, currentTableRowY + rowH);
  ctx.moveTo(col2X, currentTableRowY);
  ctx.lineTo(col2X, currentTableRowY + rowH);
  ctx.moveTo(col3X, currentTableRowY);
  ctx.lineTo(col3X, currentTableRowY + rowH);
  ctx.moveTo(col4X, currentTableRowY);
  ctx.lineTo(col4X, currentTableRowY + rowH);
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.font = '900 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TOTAL', col1X + col1W / 2, currentTableRowY + rowH / 2);

  ctx.fillText(String(totalMarks), col2X + col2W / 2, currentTableRowY + rowH / 2);
  ctx.fillText(String(totalMinMarks), col3X + col3W / 2, currentTableRowY + rowH / 2);
  ctx.fillText(String(totalObtainedMarks), col4X + col4W / 2, currentTableRowY + rowH / 2);

  currentTableRowY += rowH;

  // -------------------------------------------------------------
  // SUMMARY: PERCENTAGE & GRADE
  // -------------------------------------------------------------
  const summaryY = currentTableRowY + 36;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';

  ctx.font = 'bold 16px Arial';
  ctx.fillText('Percentage', 75, summaryY);
  ctx.fillText(':', 200, summaryY);
  ctx.font = '500 16px monospace';
  ctx.fillText(`${Number(percentage).toFixed(2)}%`, 220, summaryY);

  ctx.font = 'bold 16px Arial';
  ctx.fillText('Grade', 75, summaryY + 30);
  ctx.fillText(':', 200, summaryY + 30);
  ctx.font = '500 16px monospace';
  ctx.fillText(grade || 'A+', 220, summaryY + 30);

  // -------------------------------------------------------------
  // ISSUE DETAILS, QR CODE & ISO SEAL
  // -------------------------------------------------------------
  const certRowY = summaryY + 110;

  // Place & Date of Issue
  const placeStreet = (companyInfo?.address?.street || 'GARIYABAND ROAD NEAR SBI BANK').toUpperCase();
  const placeCity = `${(companyInfo?.address?.city || 'RAJIM').toUpperCase()} , ${(companyInfo?.address?.state || 'C.G').toUpperCase()} - ${companyInfo?.address?.zipCode || '493885'}`;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`Place  :  ${placeStreet},`, 75, certRowY);
  ctx.fillText(`              ${placeCity}`, 75, certRowY + 22);

  const issueDateFormatted = data.issueDate
    ? new Date(data.issueDate).toLocaleDateString('en-US')
    : new Date().toLocaleDateString('en-US');

  ctx.fillText(`Date of Issue  :  ${issueDateFormatted}`, 75, certRowY + 54);

  // ISO Rosette Badge (Custom image if uploaded, else vector fallback)
  if (isoImg) {
    ctx.drawImage(isoImg, width - 280, certRowY - 20, 92, 92);
  } else {
    drawIsoSeal(ctx, width - 235, certRowY + 20, 46);
  }

  // Verification QR Code
  const qrSize = 100;
  const qrX = width - 150;
  const qrY = certRowY - 30;

  if (qrImg) {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 9.5px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Scan to Verify Marksheet', qrX + qrSize / 2, qrY + qrSize + 14);

  // -------------------------------------------------------------
  // FOOTER ACCREDITATION, STAMP & SIGNATURE
  // -------------------------------------------------------------
  const footerY = height - 140;

  // Left: Official Circular Company Seal Stamp
  if (sealImg) {
    ctx.drawImage(sealImg, 80, footerY - 25, 100, 100);
  } else {
    drawCompanySeal(ctx, 130, footerY + 20, 44, '#1e3a8a');
  }
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Seal', 130, footerY + 76);

  // Center Accreditation Logos (Custom images if uploaded, else vector drawing)
  const hasCustomBadges = msmeImg || govtEmblemImg || skillIndiaImg;
  if (hasCustomBadges) {
    const badges = [
      { img: msmeImg, w: 90, h: 42 },
      { img: govtEmblemImg, w: 46, h: 56 },
      { img: skillIndiaImg, w: 80, h: 42 }
    ].filter(b => b.img);

    const totalBadgeW = badges.reduce((acc, b) => acc + b.w, 0) + (badges.length - 1) * 25;
    let badgeStartX = (width - totalBadgeW) / 2;

    badges.forEach(b => {
      ctx.drawImage(b.img, badgeStartX, footerY - 20, b.w, b.h);
      badgeStartX += b.w + 25;
    });
  } else {
    drawAccreditationLogos(ctx, width / 2 - 130, footerY - 30);
  }

  // Center Registered Entity Information
  const registeredName = companyInfo?.legalName || 'Startology Educare Services Private Limited';
  const officeAddress = [
    companyInfo?.address?.street,
    companyInfo?.address?.city,
    companyInfo?.address?.state ? `${companyInfo.address.state} - ${companyInfo.address.zipCode || ''}` : '',
    companyInfo?.address?.country || 'India'
  ].filter(Boolean).join(', ') || 'Kanha Bhairav, Rajim, Phingeshwar, Raipur- 493885, Chattisgarh, India';
  const websiteUrl = companyInfo?.website || 'www.seseducare.com';

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 17px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(registeredName, width / 2, footerY + 40);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 12.5px Arial';
  ctx.fillText(officeAddress, width / 2, footerY + 60);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(websiteUrl, width / 2, footerY + 80);

  // Signatures: Controller of Examinations and Chief Executive Officer
  if (controllerSigImg) {
    ctx.drawImage(controllerSigImg, width / 2 + 100, footerY - 10, 125, 42);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Controller of Examinations', width / 2 + 162, footerY + 48);

    if (ceoSigImg) {
      ctx.drawImage(ceoSigImg, width - 195, footerY - 10, 130, 42);
    } else {
      drawScriptSignature(ctx, width - 195, footerY - 5, 130, 36, '#1e3a8a');
    }
    ctx.fillText('Chief Executive Officer', width - 130, footerY + 48);
  } else {
    if (ceoSigImg) {
      ctx.drawImage(ceoSigImg, width - 220, footerY - 5, 145, 45);
    } else {
      drawScriptSignature(ctx, width - 220, footerY + 10, 140, 36, '#1e3a8a');
    }
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Chief Executive Officer', width - 145, footerY + 72);
  }

  return canvas.toBuffer('image/png');
};

exports.renderDefaultStudentCertificateCanvas = async function(data) {
  const { student = {}, course = {}, issueDate, certificateNumber, grade } = data;
  let companyInfo = data.companyInfo;
  if (!companyInfo && mongoose.connection.readyState === 1) {
    try {
      companyInfo = await CompanyInformation.findOne().lean();
    } catch (e) {
      console.warn('Could not fetch CompanyInformation for student certificate:', e.message);
    }
  }

  const franchise = student.franchise || {};
  const isFranchise = Boolean(franchise._id && franchise.isMainBranch !== true);

  const templatePath = isFranchise ? FRANCHISE_CERTIFICATE_PATH : MAIN_BRANCH_CERTIFICATE_PATH;
  const background = (await safeLoadImage(templatePath)) || (await safeLoadImage(MAIN_BRANCH_CERTIFICATE_PATH));

  const width = background ? background.width : 1024;
  const height = background ? background.height : 723;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (background) {
    ctx.drawImage(background, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  // 1. Title: CERTIFICATE
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b74934';
  ctx.font = 'bold 56px "Times New Roman", Georgia, serif';
  ctx.fillText('CERTIFICATE', width / 2, 222);

  // 2. "This is to certify that"
  ctx.fillStyle = '#1f2937';
  ctx.font = '17px Arial, sans-serif';
  ctx.fillText('This is to certify that', width / 2, 253);

  // 3. Student Name (uppercase, auto-fitted if long)
  const firstName = student.personalInfo?.firstName || '';
  const lastName = student.personalInfo?.lastName || '';
  const rawStudentName = `${firstName} ${lastName}`.trim() || student.user?.name || 'STUDENT NAME';
  const studentName = rawStudentName.toUpperCase();

  ctx.fillStyle = '#000000';
  let nameFontSize = 28;
  ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;
  while (ctx.measureText(studentName).width > 620 && nameFontSize > 16) {
    nameFontSize -= 1;
    ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;
  }
  ctx.fillText(studentName, width / 2, 296);

  // 4. Divider Line with Center Circle
  ctx.beginPath();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1.5;
  ctx.moveTo(206, 306);
  ctx.lineTo(825, 306);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(width / 2, 306, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#111827';
  ctx.fill();

  // 5. "has successfully completed the course"
  ctx.fillStyle = '#1f2937';
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText('has successfully completed the course', width / 2, 333);

  // 6. Course Title (uppercase, auto-fitted if long)
  const rawCourseTitle = String(course.title || course.name || 'Course Title').toUpperCase();
  ctx.fillStyle = '#000000';
  let courseFontSize = 20;
  ctx.font = `bold ${courseFontSize}px Arial, sans-serif`;
  while (ctx.measureText(rawCourseTitle).width > 640 && courseFontSize > 13) {
    courseFontSize -= 1;
    ctx.font = `bold ${courseFontSize}px Arial, sans-serif`;
  }
  ctx.fillText(rawCourseTitle, width / 2, 378);

  // 7. Course Duration
  let durationText = '';
  if (course.duration) {
    const raw = String(course.duration).trim();
    durationText = /\b(month|year|week|day)s?\b/i.test(raw) ? raw : `${raw} Months`;
  } else if (course.durationValue) {
    durationText = `${course.durationValue} ${course.durationType || 'Months'}`;
  } else {
    durationText = '6 Months';
  }

  // Branch-specific layout
  if (isFranchise) {
    // Duration
    ctx.fillStyle = '#1f2937';
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText(`with a duration of ${durationText}`, width / 2, 398);

    // "at"
    ctx.fillText('at', width / 2, 424);

    // Franchise Center Name
    const rawCenterName = String(franchise.name || data.customFieldValues?.centerName || 'CENTRAL CAMPUS').toUpperCase();
    ctx.fillStyle = '#000000';
    let centerFontSize = 20;
    ctx.font = `bold ${centerFontSize}px Arial, sans-serif`;
    while (ctx.measureText(rawCenterName).width > 580 && centerFontSize > 13) {
      centerFontSize -= 1;
      ctx.font = `bold ${centerFontSize}px Arial, sans-serif`;
    }
    ctx.fillText(rawCenterName, width / 2, 456);

    // Franchise Center Code
    const centerCode = franchise.code || data.customFieldValues?.centerCode;
    if (centerCode) {
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillText(`(${centerCode})`, width / 2, 480);
    }

    // Performance Statements
    ctx.fillStyle = '#1f2937';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('and has shown sincere efforts, discipline, and good performance during the training period.', width / 2, 509);
    ctx.fillText('We wish him/her a bright future and success in career.', width / 2, 532);

    // Grade
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'italic bold 22px "Times New Roman", Georgia, serif';
    ctx.fillText(grade && grade !== 'A+' ? (String(grade).toLowerCase().includes('grade') ? grade : `Grade : ${grade}`) : 'Grade', width / 2, 561);

    // Bottom Left Details
    const address = student.contactInfo?.address || {};
    const centerAddress = franchise.address || {};
    const place = data.customFieldValues?.place || [address.city || centerAddress.city, address.state || centerAddress.state].filter(Boolean).join(', ') || companyInfo?.address?.city || 'Rajim, Chhattisgarh';
    const issueDateFormatted = issueDate ? new Date(issueDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#111111';
    ctx.fillText('Certificate No. :', 55, 504);
    ctx.fillText('Place :', 55, 556);
    ctx.fillText('Date of Issue :', 55, 610);

    ctx.font = '14px "Times New Roman", Arial, sans-serif';
    ctx.fillText(certificateNumber || '—', 185, 504);
    ctx.fillText(place, 185, 556);
    ctx.fillText(issueDateFormatted, 185, 610);

    // Center Head Signature if available
    const centerSigUrl = franchise.owner?.ownerSignature || companyInfo?.controllerSignature;
    if (centerSigUrl) {
      const centerSig = await safeLoadImage(centerSigUrl);
      if (centerSig) {
        ctx.drawImage(centerSig, 65, 620, 100, 38);
      }
    }
  } else {
    // Main Branch Duration
    ctx.fillStyle = '#1f2937';
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText(`with a duration of ${durationText}`, width / 2, 402);

    // Performance Statements
    ctx.fillStyle = '#1f2937';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('and has shown sincere efforts, discipline, and good performance during the training period.', width / 2, 430);
    ctx.fillText('We wish him/her a bright future and success in career.', width / 2, 453);

    // Grade
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'italic bold 22px "Times New Roman", Georgia, serif';
    ctx.fillText(grade && grade !== 'A+' ? (String(grade).toLowerCase().includes('grade') ? grade : `Grade : ${grade}`) : 'Grade', width / 2, 488);

    // Bottom Left Details
    const address = student.contactInfo?.address || {};
    const companyAddress = typeof companyInfo?.address === 'string'
      ? companyInfo.address
      : [companyInfo?.address?.city, companyInfo?.address?.state].filter(Boolean).join(', ');
    const place = data.customFieldValues?.place || [address.city, address.state].filter(Boolean).join(', ') || companyAddress || 'Rajim, Chhattisgarh';
    const issueDateFormatted = issueDate ? new Date(issueDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#111111';
    ctx.fillText('Certificate No. :', 55, 504);
    ctx.fillText('Place :', 55, 532);
    ctx.fillText('Date of Issue :', 55, 560);

    ctx.font = '14px "Times New Roman", Arial, sans-serif';
    ctx.fillText(certificateNumber || '—', 185, 504);
    ctx.fillText(place, 185, 532);
    ctx.fillText(issueDateFormatted, 185, 560);
  }

  // 12. Student Passport Photo (Top-Right)
  const photoX = 887, photoY = 156, photoW = 80, photoH = 102;
  const photoUrl = student.personalInfo?.photo || student.user?.profilePicture;
  const photoImg = photoUrl ? await safeLoadImage(photoUrl) : null;
  if (photoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoW, photoH);
    ctx.clip();
    const scale = Math.max(photoW / photoImg.width, photoH / photoImg.height);
    const drawW = photoImg.width * scale;
    const drawH = photoImg.height * scale;
    ctx.drawImage(photoImg, photoX + (photoW - drawW) / 2, photoY + (photoH - drawH) / 2, drawW, drawH);
    ctx.restore();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(photoX, photoY, photoW, photoH);
  } else {
    drawStudentAvatar(ctx, photoX, photoY, photoW, photoH);
  }

  // 13. Verification QR Code (Bottom-Right)
  let qrImg = null;
  if (data.qrCodeDataUrl) {
    qrImg = await safeLoadImage(data.qrCodeDataUrl);
  } else {
    try {
      const verifyTarget = certificateNumber || student.enrollmentNumber || student.studentId || 'SES-EDUCARE-VERIFIED';
      const verifyUrl = `${process.env.FRONTEND_URL || 'https://seseducare.com'}/verify-certificate?student=${encodeURIComponent(verifyTarget)}`;
      const autoQr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 140, errorCorrectionLevel: 'M' });
      qrImg = await safeLoadImage(autoQr);
    } catch (e) {
      console.warn('Could not generate verification QR for student certificate:', e.message);
    }
  }

  const qrX = 896;
  const qrY = isFranchise ? 492 : 476;
  const qrSize = 68;

  if (qrImg) {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.font = 'bold 8px Arial, sans-serif';
  ctx.fillText('Scan to Verify Certificate', qrX + qrSize / 2, qrY + qrSize + 11);

  return canvas.toBuffer('image/png');
};

async function renderMainBranchMarksheet(data, companyInfo, background, { isFranchise = false } = {}) {
  const { student = {}, course = {}, marks = [], totalMarks = 0, totalObtainedMarks = 0, percentage = 0, grade = '', issueDate } = data;
  const certificateNo = data.certificateNumber || '—';
  const width = background.width;
  const height = background.height;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(background, 0, 0, width, height);

  const firstName = student.personalInfo?.firstName || '';
  const lastName = student.personalInfo?.lastName || '';
  const studentName = `${firstName} ${lastName}`.trim() || '—';
  const dateText = issueDate ? new Date(issueDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const franchise = student.franchise || {};

  // Derive robust session
  let session = data.session || student.session || student.academicInfo?.session || student.enrolledCourses?.[0]?.session || student.enrolledCourses?.[0]?.batch?.name;
  if (!session || session === '—' || session === '-') {
    const d = student.admissionDate || student.createdAt || (issueDate ? new Date(issueDate) : new Date());
    const yr = new Date(d).getFullYear();
    session = `${yr} - ${yr + 1}`;
  }

  // Derive robust durationText
  let durationText = data.duration || course.duration;
  if (!durationText && course.durationValue) {
    const unit = course.durationType ? (course.durationType.charAt(0).toUpperCase() + course.durationType.slice(1)) : 'Months';
    durationText = `${course.durationValue} ${unit}`;
  } else if (!durationText && course.totalHours) {
    durationText = `${course.totalHours} Hours`;
  }
  if (!durationText || durationText === '—' || durationText === '-') {
    durationText = data.customFieldValues?.duration || '6 Months';
  }
  if (durationText && !/\b(month|year|week|day|hour)s?\b/i.test(String(durationText).trim())) {
    durationText = `${String(durationText).trim()} Months`;
  }
  const leftDetails = [
    { label: 'Student Name', value: studentName, x: 102, colonX: 281, valueX: 305, width: 385 },
    { label: "Father's Name", value: student.personalInfo?.fatherName || '—', x: 102, colonX: 281, valueX: 305, width: 385 },
    { label: "Mother's Name", value: student.personalInfo?.motherName || '—', x: 102, colonX: 281, valueX: 305, width: 385 },
    { label: 'Date Of Birth', value: student.personalInfo?.dateOfBirth ? new Date(student.personalInfo.dateOfBirth).toLocaleDateString('en-IN') : '—', x: 102, colonX: 281, valueX: 305, width: 385 },
    { label: 'Gender', value: student.personalInfo?.gender || '—', x: 102, colonX: 281, valueX: 305, width: 385 },
    ...(isFranchise ? [{ label: 'Center Name', value: franchise.name || '—', x: 102, colonX: 281, valueX: 305, width: 385 }] : [])
  ];
  let marksheetNo = data.marksheetNumber;
  if (!marksheetNo || String(marksheetNo).startsWith('SES-CERT')) {
    marksheetNo = getMarksheetNumberForStudent(student, new Date().getFullYear(), data.certificateNumber);
  }
  if (String(marksheetNo).startsWith('SES-CERT-')) {
    marksheetNo = String(marksheetNo).replace(/^SES-CERT-/i, 'SES-MARKS-');
  }

  const rightDetails = [
    { label: 'Course', value: course.title || '—', x: 735, colonX: 885, valueX: 909, width: 440 },
    { label: 'Duration', value: durationText, x: 735, colonX: 885, valueX: 909, width: 440 },
    { label: 'Session', value: session, x: 735, colonX: 885, valueX: 909, width: 440 },
    { label: 'Marksheet No.', value: marksheetNo, x: 735, colonX: 885, valueX: 909, width: 440 },
    { label: 'Enrollment No.', value: student.enrollmentNumber || student.studentId || '—', x: 735, colonX: 885, valueX: 909, width: 440 },
    ...(isFranchise ? [{ label: 'Center Code', value: franchise.code || '—', x: 735, colonX: 885, valueX: 909, width: 440 }] : [])
  ];

  const wrapDetailValue = (value, maxWidth) => {
    const words = String(value).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : ['—'];
  };

  ctx.textBaseline = 'middle';
  let detailY = 475;
  for (let index = 0; index < leftDetails.length; index += 1) {
    const row = [leftDetails[index], rightDetails[index]];
    const values = row.map((field) => {
      ctx.font = '24px Arial';
      return wrapDetailValue(field.value, field.width);
    });
    const lineCount = Math.max(...values.map((lines) => lines.length));

    row.forEach((field, fieldIndex) => {
      ctx.fillStyle = '#111111';
      ctx.textAlign = 'left';
      ctx.font = '24px "Times New Roman", serif';
      ctx.fillText(field.label, field.x, detailY, field.colonX - field.x - 12);
      ctx.textAlign = 'center';
      ctx.fillText(':', field.colonX, detailY);

      ctx.fillStyle = '#111111';
      ctx.textAlign = 'left';
      ctx.font = '24px Arial';
      const lines = values[fieldIndex];
      const firstLineY = detailY - ((lines.length - 1) * 13);
      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, field.valueX, firstLineY + lineIndex * 26);
      });
    });
    detailY += Math.max(42, lineCount * 26 + 12);
  }

  // Student photo is positioned in the reserved upper-right box from the reference layout.
  const photoX = 1228;
  const photoY = 284;
  const photoW = 132;
  const photoH = 166;
  const photoSource = student.personalInfo?.photo || student.user?.profilePicture;
  const photoImage = await safeLoadImage(photoSource);
  ctx.save();
  if (photoImage) {
    const scale = Math.max(photoW / photoImage.width, photoH / photoImage.height);
    const drawW = photoImage.width * scale;
    const drawH = photoImage.height * scale;
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoW, photoH);
    ctx.clip();
    ctx.drawImage(photoImage, photoX + (photoW - drawW) / 2, photoY + (photoH - drawH) / 2, drawW, drawH);
  } else {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Student Photo', photoX + photoW / 2, photoY + photoH / 2);
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('MARKSHEET', width / 2, 360);
  const titleRuleWidth = ctx.measureText('MARKSHEET').width + 18;
  ctx.beginPath();
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2;
  ctx.moveTo(width / 2 - titleRuleWidth / 2, 382);
  ctx.lineTo(width / 2 + titleRuleWidth / 2, 382);
  ctx.stroke();

  ctx.fillStyle = '#d83f36';
  ctx.font = 'bold 31px Arial';
  ctx.fillText('STATEMENT OF MARKS', width / 2, 784);

  const rows = marks.filter((mark) => mark?.subject?.trim());
  const tableX = 140;
  const tableY = 844;
  const tableWidth = width - 280;
  const tableMaxHeight = 450;
  
  // 5 Columns: SR. NO. | SUBJECT | MAX. | MIN. | OBTAINED MARKS
  const col0W = Math.round(tableWidth * 0.08); // SR. NO.
  const col1W = Math.round(tableWidth * 0.47); // SUBJECT
  const col2W = Math.round(tableWidth * 0.10); // MAX.
  const col3W = Math.round(tableWidth * 0.10); // MIN.
  const col4W = tableWidth - col0W - col1W - col2W - col3W; // OBTAINED MARKS (~25%)

  const colX = [
    tableX,
    tableX + col0W,
    tableX + col0W + col1W,
    tableX + col0W + col1W + col2W,
    tableX + col0W + col1W + col2W + col3W,
    tableX + tableWidth
  ];

  const headerHeight = 46;
  const dataRowHeight = Math.min(56, (tableMaxHeight - headerHeight) / (rows.length + 1));
  const tableHeight = headerHeight + dataRowHeight * (rows.length + 1);
  const tableFontSize = Math.max(12, Math.min(22, dataRowHeight * 0.40));

  // Keep the marks grid clear while allowing the security watermark to show through.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(tableX, tableY, tableWidth, headerHeight);
  ctx.strokeStyle = 'rgba(49, 89, 143, 0.75)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(tableX, tableY, tableWidth, tableHeight);
  for (const lineX of colX.slice(1, -1)) {
    ctx.beginPath();
    ctx.moveTo(lineX, tableY);
    ctx.lineTo(lineX, tableY + tableHeight);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(tableX, tableY + headerHeight);
  ctx.lineTo(tableX + tableWidth, tableY + headerHeight);
  ctx.stroke();

  ctx.fillStyle = '#171717';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawFittedHeaderText(ctx, 'SR. NO.', colX[0] + col0W / 2, tableY + headerHeight / 2, col0W, tableFontSize, 'Arial', 'bold');
  drawFittedHeaderText(ctx, 'SUBJECT', colX[1] + col1W / 2, tableY + headerHeight / 2, col1W, tableFontSize, 'Arial', 'bold');
  drawFittedHeaderText(ctx, 'MAX.', colX[2] + col2W / 2, tableY + headerHeight / 2, col2W, tableFontSize, 'Arial', 'bold');
  drawFittedHeaderText(ctx, 'MIN.', colX[3] + col3W / 2, tableY + headerHeight / 2, col3W, tableFontSize, 'Arial', 'bold');
  drawFittedHeaderText(ctx, 'OBTAINED MARKS', colX[4] + col4W / 2, tableY + headerHeight / 2, col4W, tableFontSize, 'Arial', 'bold');

  let totalMinMarks = 0;
  rows.forEach((mark, index) => {
    const rowY = tableY + headerHeight + dataRowHeight * index;
    ctx.beginPath();
    ctx.moveTo(tableX, rowY + dataRowHeight);
    ctx.lineTo(tableX + tableWidth, rowY + dataRowHeight);
    ctx.stroke();

    const minScore = mark.minMarks != null ? mark.minMarks : Math.round((Number(mark.totalMarks) || 100) * 0.4);
    totalMinMarks += Number(minScore) || 0;

    // SR. NO.
    ctx.font = `${tableFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(String(index + 1), colX[0] + col0W / 2, rowY + dataRowHeight / 2);

    // SUBJECT
    ctx.textAlign = 'left';
    ctx.fillText(String(mark.subject), colX[1] + 10, rowY + dataRowHeight / 2, col1W - 18);

    // MAX.
    ctx.textAlign = 'center';
    ctx.fillText(String(mark.totalMarks ?? 0), colX[2] + col2W / 2, rowY + dataRowHeight / 2);

    // MIN.
    ctx.fillText(String(minScore), colX[3] + col3W / 2, rowY + dataRowHeight / 2);

    // OBTAINED MARKS
    ctx.fillText(String(mark.obtainedMarks ?? 0), colX[4] + col4W / 2, rowY + dataRowHeight / 2);
  });

  const totalY = tableY + headerHeight + dataRowHeight * rows.length;
  ctx.beginPath();
  ctx.moveTo(tableX, totalY + dataRowHeight);
  ctx.lineTo(tableX + tableWidth, totalY + dataRowHeight);
  ctx.stroke();
  ctx.font = `bold ${tableFontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('', colX[0] + col0W / 2, totalY + dataRowHeight / 2);
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL', colX[1] + 10, totalY + dataRowHeight / 2);
  ctx.textAlign = 'center';
  ctx.fillText(String(totalMarks), colX[2] + col2W / 2, totalY + dataRowHeight / 2);
  ctx.fillText(String(totalMinMarks), colX[3] + col3W / 2, totalY + dataRowHeight / 2);
  ctx.fillText(String(totalObtainedMarks), colX[4] + col4W / 2, totalY + dataRowHeight / 2);

  ctx.fillStyle = '#171717';
  ctx.textAlign = 'left';
  const summaryY = tableY + tableHeight + 70;
  ctx.font = 'bold 24px "Times New Roman", serif';
  ctx.fillText('Percentage', 72, summaryY);
  ctx.fillText(':', 230, summaryY);
  ctx.fillStyle = '#111111';
  ctx.font = '25px Arial';
  ctx.fillText(`${Number(percentage).toFixed(2)}%`, 252, summaryY);
  ctx.fillStyle = '#171717';
  ctx.font = 'bold 24px "Times New Roman", serif';
  ctx.fillText('Grade', 72, summaryY + 40);
  ctx.fillText(':', 230, summaryY + 40);
  ctx.fillStyle = '#111111';
  ctx.font = '25px Arial';
  ctx.fillText(grade || '—', 252, summaryY + 40);

  const franchiseAddress = typeof franchise.address === 'string'
    ? franchise.address
    : [franchise.address?.street, franchise.address?.city, franchise.address?.state, franchise.address?.pincode || franchise.address?.zipCode, franchise.address?.country].filter(Boolean).join(', ');
  const companyAddress = isFranchise && franchiseAddress
    ? franchiseAddress
    : typeof companyInfo?.address === 'string'
    ? companyInfo.address
    : [companyInfo?.address?.street, companyInfo?.address?.city, companyInfo?.address?.state, companyInfo?.address?.zipCode].filter(Boolean).join(', ');
  const wrapCanvasText = (value, maxWidth) => {
    const words = String(value || '—').trim().split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const parts = [];
      let part = '';
      for (const character of word) {
        if (part && ctx.measureText(`${part}${character}`).width > maxWidth) {
          parts.push(part);
          part = character;
        } else {
          part += character;
        }
      }
      if (part) parts.push(part);
      for (const piece of parts) {
        const candidate = line ? `${line} ${piece}` : piece;
        if (line && ctx.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = piece;
        } else {
          line = candidate;
        }
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : ['—'];
  };

  // Use the same label/value typography and aligned colon as the student details.
  const detailColonX = 238;
  const detailValueX = 262;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#171717';
  ctx.font = 'bold 22px "Times New Roman", serif';
  ctx.fillText('Place', 72, 1532);
  ctx.fillText(':', detailColonX, 1532);
  ctx.fillStyle = '#111111';
  ctx.font = '22px Arial';
  const addressLines = wrapCanvasText(companyAddress || 'Kanha Bhairav, Rajim, Chhattisgarh, India', 820);
  addressLines.forEach((line, index) => ctx.fillText(line, detailValueX, 1532 + index * 27));

  const issueDateY = 1532 + Math.max(1, addressLines.length) * 27 + 18;
  ctx.fillStyle = '#171717';
  ctx.font = 'bold 22px "Times New Roman", serif';
  ctx.fillText('Date of Issue', 72, issueDateY);
  ctx.fillText(':', detailColonX, issueDateY);
  ctx.fillStyle = '#111111';
  ctx.font = '22px Arial';
  ctx.fillText(dateText, detailValueX, issueDateY);

  if (isFranchise) {
    const centerHeadSignature = await safeLoadImage(franchise.owner?.ownerSignature);
    if (centerHeadSignature) {
      ctx.drawImage(centerHeadSignature, 72, 1815, 210, 56);
    }
  }

  let qrImage = await safeLoadImage(data.qrCodeDataUrl);
  if (!qrImage) {
    try {
      const qrData = await QRCode.toDataURL(data.marksheetNumber || student.enrollmentNumber || student.studentId || 'SES-EDUCARE-VERIFIED', { margin: 1, width: 120 });
      qrImage = await safeLoadImage(qrData);
    } catch (error) {
      console.warn('Could not generate marksheet QR code:', error.message);
    }
  }
  if (qrImage) {
    ctx.drawImage(qrImage, 1224, 1604, 104, 104);
    ctx.fillStyle = '#171717';
    ctx.textAlign = 'center';
    ctx.font = '11px Arial';
    ctx.fillText('Scan to Verify Marksheet', 1276, 1724);
  }

  // The reference image carries the official header, watermark, footer badges and signatures.
  return canvas.toBuffer('image/png');
}

