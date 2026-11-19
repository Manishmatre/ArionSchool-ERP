export const createDefaultField = (catalogItem, position = {}, templateSize = null) => {
  const type = catalogItem.type;
  const isText = type === 'text' || type === 'date' || type === 'number' || type === 'customText';

  const tw = templateSize?.width || 1200;
  const th = templateSize?.height || 850;
  const offset = position.offset ?? 0;

  const defaultsByType = {
    table: {
      width: Math.round(tw * 0.55),
      height: Math.round(th * 0.22),
      fontSize: Math.max(16, Math.round(th * 0.018))
    },
    image: {
      width: Math.round(tw * 0.14),
      height: Math.round(th * 0.18),
      fontSize: 0
    },
    qrCode: {
      width: Math.round(tw * 0.1),
      height: Math.round(tw * 0.1),
      fontSize: 0
    },
    customText: {
      width: Math.round(tw * 0.22),
      height: Math.max(40, Math.round(th * 0.045)),
      fontSize: Math.max(18, Math.round(th * 0.028))
    },
    text: {
      width: Math.round(tw * 0.28),
      height: Math.max(40, Math.round(th * 0.045)),
      fontSize: Math.max(18, Math.round(th * 0.028))
    }
  };

  const key = type === 'table' ? 'table' : type === 'image' ? 'image' : type === 'qrCode' ? 'qrCode' : type === 'customText' ? 'customText' : 'text';
  const sizes = defaultsByType[key];

  const field = {
    fieldName: catalogItem.value,
    fieldType: type,
    x: position.x ?? Math.round(tw * 0.12 + offset * 12),
    y: position.y ?? Math.round(th * 0.12 + offset * 12),
    width: sizes.width,
    height: sizes.height,
    rotation: 0,
    zIndex: 0,
    fontSize: isText ? sizes.fontSize : 0,
    fontSizeUnit: 'px',
    fontFamily: 'Arial',
    fontWeight: 'normal',
    color: '#000000',
    backgroundColor: 'transparent',
    alignment: 'left',
    verticalAlign: 'top',
    textTransform: 'none',
    letterSpacing: 0,
    lineHeight: 1.2,
    padding: 0,
    borderRadius: 0,
    textShadowX: 0,
    textShadowY: 0,
    textShadowBlur: 0,
    textShadowColor: '#000000',
    objectFit: 'cover'
  };

  if (type === 'customText') {
    field.defaultValue = '';
  }

  return field;
};

export const getDefaultSizesForType = (fieldType, templateSize) => {
  const tw = templateSize?.width || 1200;
  const th = templateSize?.height || 850;
  if (fieldType === 'table') return { width: Math.round(tw * 0.55), height: Math.round(th * 0.22) };
  if (fieldType === 'image' || fieldType === 'qrCode') return { width: Math.round(tw * 0.14), height: Math.round(th * 0.14) };
  if (fieldType === 'customText') return { width: Math.round(tw * 0.22), height: Math.max(40, Math.round(th * 0.045)) };
  return { width: Math.round(tw * 0.28), height: Math.max(40, Math.round(th * 0.045)) };
};

export const sanitizeTemplateField = (field) => ({
  ...field,
  label: field.label || '',
  defaultValue: field.defaultValue || '',
  fontSizeUnit: field.fontSizeUnit || 'px',
  fontWeight: field.fontWeight || 'normal',
  alignment: field.alignment || 'left',
  verticalAlign: field.verticalAlign || 'top',
  textTransform: field.textTransform || 'none',
  backgroundColor: field.backgroundColor || 'transparent',
  rotation: field.rotation || 0,
  zIndex: field.zIndex || 0,
  objectFit: field.objectFit || 'cover',
  letterSpacing: field.letterSpacing || 0,
  lineHeight: field.lineHeight || 1.2,
  padding: field.padding || 0,
  borderRadius: field.borderRadius || 0
});

export const sanitizeTemplateFields = (fields = []) =>
  fields.map(sanitizeTemplateField);

export const getFieldLabel = (fieldName, catalog = [], field = null) => {
  if (field?.fieldType === 'customText') return 'Custom Text Field';
  return catalog.find((f) => f.value === fieldName)?.label || fieldName;
};

export const getFieldDisplayLabel = (field, catalog = []) =>
  getFieldLabel(field?.fieldName, catalog, field);

export const getCustomTextFields = (fields = []) =>
  fields.filter((f) => f.fieldType === 'customText');

export const getFieldPreviewContent = (field, previewMap) => {
  if (field.fieldType === 'customText') {
    return field.defaultValue || '[Value to print]';
  }
  if (field.fieldType === 'table') {
    return previewMap.marksTable || '[marksTable]';
  }
  return getPreviewText(field.fieldName, previewMap);
};

export const getDisplayScale = (img) => {
  if (!img) return { scaleX: 1, scaleY: 1 };
  const rect = img.getBoundingClientRect();
  return {
    scaleX: rect.width / (img.naturalWidth || rect.width || 1),
    scaleY: rect.height / (img.naturalHeight || rect.height || 1)
  };
};

export const toDisplayCoords = (field, scaleX, scaleY) => ({
  x: field.x * scaleX,
  y: field.y * scaleY,
  width: field.width * scaleX,
  height: field.height * scaleY
});

export const getPreviewText = (fieldName, previewMap) =>
  previewMap[fieldName] || `[${fieldName}]`;

export const duplicateFieldName = (fields, baseName) => {
  const names = fields.map((f) => f.fieldName);
  if (!names.includes(baseName)) return baseName;
  let i = 2;
  while (names.includes(`${baseName}_${i}`)) i += 1;
  return `${baseName}_${i}`;
};

export const MIN_FIELD_SIZE = 20;
export const SIZE_STEP = 5;
export const SCALE_STEP_PERCENT = 10;

export const getSizeStepForTemplate = (templateSize) => {
  const tw = templateSize?.width || 1200;
  return Math.max(5, Math.round(tw * 0.005));
};

export const adjustFieldSize = (field, dimension, delta) => {
  const key = dimension === 'width' || dimension === 'height' ? dimension : 'width';
  return {
    [key]: Math.max(MIN_FIELD_SIZE, Math.round((field[key] || MIN_FIELD_SIZE) + delta))
  };
};

/** Scale width & height together by percentage (e.g. +10 = 10% larger) */
export const scaleFieldSize = (field, percentDelta) => {
  const factor = 1 + percentDelta / 100;
  return {
    width: Math.max(MIN_FIELD_SIZE, Math.round((field.width || MIN_FIELD_SIZE) * factor)),
    height: Math.max(MIN_FIELD_SIZE, Math.round((field.height || MIN_FIELD_SIZE) * factor))
  };
};
