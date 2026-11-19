require('./fontLoader');
/**
 * Shared canvas rendering helpers for marksheet, certificate, and ID card templates.
 */

const fs = require('fs');
const { registerFont } = require('canvas');

const unicodeFontFamily = 'CertificateUnicode';
let unicodeFontRegistered = false;

function registerUnicodeFont() {
  if (unicodeFontRegistered) return true;

  const candidates = [
    process.env.CERTIFICATE_FONT_PATH,
    '/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansDevanagari-Regular.ttf',
    'C:/Windows/Fonts/NotoSansDevanagari-Regular.ttf',
    'C:/Windows/Fonts/Nirmala.ttf'
  ].filter(Boolean);
  const fontPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!fontPath) return false;

  try {
    registerFont(fontPath, { family: unicodeFontFamily });
    unicodeFontRegistered = true;
    return true;
  } catch (error) {
    console.warn(`Unable to register certificate Unicode font at ${fontPath}:`, error.message);
    return false;
  }
}

function resolveFontFamily(field, text) {
  const configuredFamily = field.fontFamily || 'Arial';
  if (/[^\u0000-\u007f]/.test(text) && registerUnicodeFont()) {
    return unicodeFontFamily;
  }
  return configuredFamily;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function applyTextTransform(text, transform) {
  if (!text || !transform || transform === 'none') return text;
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\w/g, (l) => l.toUpperCase());
    default:
      return text;
  }
}

function resolveFontSize(ctx, field, text) {
  let fontSize = field.fontSize || 12;
  const fontFamily = resolveFontFamily(field, String(text || ''));

  if (field.fontSizeUnit === '%') {
    fontSize = (field.fontSize / 100) * 12;
  } else if (field.fontSizeUnit === 'em') {
    fontSize = field.fontSize * 12;
  } else if (field.fontSizeUnit === 'auto') {
    const maxWidth = field.width || 200;
    const testFontSize = 12;
    ctx.font = `${field.fontWeight || 'normal'} ${testFontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(String(text || ''));
    const ratio = metrics.width > 0 ? maxWidth / metrics.width : 1;
    fontSize = Math.floor(testFontSize * Math.min(ratio, 3));
  }

  return fontSize;
}

function withFieldTransform(ctx, field, drawFn) {
  const rotation = Number(field.rotation) || 0;
  if (!rotation) {
    drawFn(ctx);
    return;
  }

  const cx = field.x + (field.width || 0) / 2;
  const cy = field.y + (field.height || 0) / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  drawFn(ctx);
  ctx.restore();
}

function drawTemplateTextField(ctx, field, rawText) {
  if (field.x === undefined || field.y === undefined) return;

  const text = applyTextTransform(String(rawText ?? ''), field.textTransform);

  withFieldTransform(ctx, field, (activeCtx) => {
    activeCtx.fillStyle = field.color || '#000000';
    const fontSize = resolveFontSize(activeCtx, field, text);
    activeCtx.font = `${field.fontWeight || 'normal'} ${fontSize}px ${resolveFontFamily(field, text)}`;
    activeCtx.textAlign = field.alignment || 'left';
    activeCtx.textBaseline = 'top';

    if (field.letterSpacing) {
      activeCtx.letterSpacing = `${field.letterSpacing}px`;
    }

    const bg = field.backgroundColor;
    if (bg && bg !== 'transparent' && bg !== '#ffffff') {
      activeCtx.fillStyle = bg;
      const padding = field.padding || 0;
      const borderRadius = field.borderRadius || 0;
      if (borderRadius > 0) {
        roundRect(
          activeCtx,
          field.x - padding,
          field.y - padding,
          field.width + padding * 2,
          field.height + padding * 2,
          borderRadius
        );
        activeCtx.fill();
      } else {
        activeCtx.fillRect(
          field.x - padding,
          field.y - padding,
          field.width + padding * 2,
          field.height + padding * 2
        );
      }
      activeCtx.fillStyle = field.color || '#000000';
    }

    if (field.textShadowX || field.textShadowY || field.textShadowBlur) {
      activeCtx.shadowColor = field.textShadowColor || '#000000';
      activeCtx.shadowOffsetX = field.textShadowX || 0;
      activeCtx.shadowOffsetY = field.textShadowY || 0;
      activeCtx.shadowBlur = field.textShadowBlur || 0;
    }

    const maxWidth = field.width || 200;
    const lineHeight = (field.lineHeight || 1.2) * fontSize;
    const padding = field.padding || 0;

    const drawLine = (line, y) => {
      let drawX = field.x + padding;
      if (field.alignment === 'center') {
        drawX = field.x + maxWidth / 2 + padding;
        activeCtx.textAlign = 'center';
      } else if (field.alignment === 'right') {
        drawX = field.x + maxWidth + padding;
        activeCtx.textAlign = 'right';
      } else {
        activeCtx.textAlign = field.alignment || 'left';
      }
      activeCtx.fillText(line, drawX, y);
    };

    if (text.includes('\n')) {
      let y = field.y;
      text.split('\n').forEach((line) => {
        drawLine(line, y);
        y += lineHeight;
      });
    } else if (!text || activeCtx.measureText(text).width <= maxWidth) {
      drawLine(text, field.y);
    } else {
      const words = text.split(' ');
      let line = '';
      let y = field.y;
      words.forEach((word, i) => {
        const testLine = `${line}${word} `;
        if (activeCtx.measureText(testLine).width > maxWidth && i > 0) {
          drawLine(line.trim(), y);
          line = `${word} `;
          y += lineHeight;
        } else {
          line = testLine;
        }
      });
      if (line.trim()) drawLine(line.trim(), y);
    }

    activeCtx.shadowColor = 'transparent';
    activeCtx.shadowOffsetX = 0;
    activeCtx.shadowOffsetY = 0;
    activeCtx.shadowBlur = 0;
    if (activeCtx.letterSpacing) activeCtx.letterSpacing = 'normal';
  });
}

function drawTemplateImage(ctx, field, image) {
  if (!image || field.x === undefined || field.y === undefined) return;

  withFieldTransform(ctx, field, (activeCtx) => {
    const fit = field.objectFit || 'cover';
    const { x, y, width, height } = field;

    if (fit === 'fill') {
      activeCtx.drawImage(image, x, y, width, height);
      return;
    }

    const scale = fit === 'contain'
      ? Math.min(width / image.width, height / image.height)
      : Math.max(width / image.width, height / image.height);

    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const drawX = x + (width - drawW) / 2;
    const drawY = y + (height - drawH) / 2;

    activeCtx.save();
    activeCtx.beginPath();
    activeCtx.rect(x, y, width, height);
    activeCtx.clip();
    activeCtx.drawImage(image, drawX, drawY, drawW, drawH);
    activeCtx.restore();
  });
}

function drawTemplateQR(ctx, field, qrImage) {
  if (!qrImage || field.x === undefined || field.y === undefined) return;
  withFieldTransform(ctx, field, (activeCtx) => {
    activeCtx.drawImage(qrImage, field.x, field.y, field.width || 150, field.height || 150);
  });
}

function sortFieldsByZIndex(fields = []) {
  return [...fields].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
}

function resolveCustomFieldValue(field, customFieldValues = {}) {
  if (field?.fieldType !== 'customText') return '';
  const submitted = customFieldValues?.[field.fieldName];
  if (submitted === undefined || submitted === null) return '';
  const text = String(submitted).trim();
  return text || '';
}

const TEMPLATE_FIELD_LABEL_ALIASES = {
  'course duration': 'courseDuration',
  'certificate no': 'certificateNo',
  'certificate number': 'certificateNumber',
  'student name': 'studentName',
  'student id': 'studentId',
  'enrollment no': 'enrollmentNumber',
  'enrollment number': 'enrollmentNumber',
  'course name': 'courseName',
  'course code': 'courseCode',
  'issue date': 'issueDate',
  'franchise name': 'franchiseName',
  'franchise code': 'franchiseCode',
  'franchise address': 'franchiseAddress',
  place: 'franchiseAddress'
};

function normalizeTemplateFieldName(fieldName) {
  let name = String(fieldName || '')
    .trim()
    .replace(/^\[+/, '')
    .replace(/\]+$/, '')
    .replace(/_\d+$/, '');

  const alias = TEMPLATE_FIELD_LABEL_ALIASES[name.toLowerCase()];
  return alias || name;
}

function formatCourseDuration(course) {
  if (!course) return '';

  const plain = typeof course.toObject === 'function' ? course.toObject() : course;

  if (plain.estimatedTime && String(plain.estimatedTime).trim()) {
    return String(plain.estimatedTime).trim();
  }

  if (plain.durationValue != null && plain.durationValue !== '') {
    const value = Number(plain.durationValue);
    const unit = String(plain.durationType || 'months').toLowerCase();
    const word = value === 1 ? unit.replace(/s$/, '') : unit;
    return `${value} ${word.charAt(0).toUpperCase() + word.slice(1)}`;
  }

  if (plain.duration != null && String(plain.duration).trim() !== '') {
    const duration = String(plain.duration).trim();
    if (plain.durationUnit) {
      return `${duration} ${String(plain.durationUnit).trim()}`.trim();
    }
    return duration;
  }

  return '';
}

function lookupTemplateFieldValue(fieldMap, fieldName) {
  const normalized = normalizeTemplateFieldName(fieldName);
  if (!normalized) return undefined;

  if (Object.prototype.hasOwnProperty.call(fieldMap, normalized)) {
    return fieldMap[normalized];
  }

  const lower = normalized.toLowerCase();
  const matchedKey = Object.keys(fieldMap).find((key) => key.toLowerCase() === lower);
  if (matchedKey && Object.prototype.hasOwnProperty.call(fieldMap, matchedKey)) {
    return fieldMap[matchedKey];
  }

  const squashed = lower.replace(/[\s_-]+/g, '');
  const squashedKey = Object.keys(fieldMap).find(
    (key) => key.toLowerCase().replace(/[\s_-]+/g, '') === squashed
  );
  if (squashedKey && Object.prototype.hasOwnProperty.call(fieldMap, squashedKey)) {
    return fieldMap[squashedKey];
  }

  return undefined;
}

function resolveTemplateFieldType(field) {
  return field?.fieldType || field?.type || '';
}

function isTemplateTextLikeField(field) {
  return ['text', 'date', 'number'].includes(resolveTemplateFieldType(field));
}

/** Student photo from Student doc or linked User profile — null when missing. */
function resolveStudentPhoto(student) {
  if (!student) return null;
  const candidates = [
    student.personalInfo?.photo,
    student.photo,
    student.user?.profilePicture
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

module.exports = {
  roundRect,
  applyTextTransform,
  resolveFontSize,
  withFieldTransform,
  drawTemplateTextField,
  drawTemplateImage,
  drawTemplateQR,
  sortFieldsByZIndex,
  resolveCustomFieldValue,
  normalizeTemplateFieldName,
  formatCourseDuration,
  lookupTemplateFieldValue,
  resolveTemplateFieldType,
  isTemplateTextLikeField,
  resolveStudentPhoto
};
