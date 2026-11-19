const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const FOLDER_MAP = {
  thumbnail: 'ses-lms/thumbnails',
  photo: 'ses-lms/profiles',
  document: 'ses-lms/documents',
  image: 'ses-lms/images',
  images: 'ses-lms/images',
  video: 'ses-lms/videos',
  lessonVideo: 'ses-lms/videos',
  lessonMedia: 'ses-lms/lessons',
  resource: 'ses-lms/resources',
  templateImage: 'ses-lms/templates',
  asset: 'ses-lms/template-assets',
  file: 'ses-lms/lessons',
  logo: 'ses-lms/images',
  favicon: 'ses-lms/images',
  material: 'ses-lms/materials',
  aadhaarFileFront: 'ses-lms/documents',
  aadhaarFileBack: 'ses-lms/documents',
  panFile: 'ses-lms/documents',
  qualificationFile: 'ses-lms/documents',
  centerPhoto: 'ses-lms/images',
  ownerSignature: 'ses-lms/images'
};

const isConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const isCloudinaryUrl = (value) =>
  typeof value === 'string' &&
  (value.includes('res.cloudinary.com') || value.includes('cloudinary.com'));

const isLocalStoredPath = (value) => {
  if (!value || typeof value !== 'string' || isCloudinaryUrl(value) || value.startsWith('data:')) {
    return false;
  }
  return (
    value.startsWith('/uploads/') ||
    value.startsWith('uploads/') ||
    value.startsWith('profiles/') ||
    value.startsWith('documents/') ||
    value.startsWith('materials/') ||
    value.startsWith('thumbnails/') ||
    value.startsWith('images/') ||
    value.includes('/uploads/') ||
    value.includes('public/certificates/')
  );
};

const isStoredFile = (value) => isCloudinaryUrl(value) || isLocalStoredPath(value);

const getFolderForField = (fieldname) => FOLDER_MAP[fieldname] || 'ses-lms/materials';

const buildFilename = (req, file) => {
  const timestamp = Date.now();
  const originalName = file.originalname
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');

  let prefix = 'file';
  if (file.fieldname === 'photo') prefix = 'profile';
  else if (file.fieldname === 'document') prefix = 'doc';
  else if (file.fieldname === 'templateImage') prefix = 'template';
  else if (file.fieldname === 'thumbnail') prefix = 'thumb';

  let namePart = '';
  if (req?.studentName) namePart = `_${req.studentName}`;
  else if (req?.params?.id) namePart = `_${req.params.id}`;

  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  return `${prefix}${namePart}_${timestamp}_${base}`;
};

const getResourceType = (mimetype = '', originalName = '') => {
  const ext = (originalName ? path.extname(originalName) : '').toLowerCase();
  if (mimetype === 'application/pdf' || ext === '.pdf') return 'raw';
  if (mimetype.startsWith('video/') || /^\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(ext)) return 'video';
  if (mimetype.startsWith('image/') || /^\.(jpg|jpeg|png|gif|webp|svg)$/i.test(ext)) return 'image';
  if (mimetype.startsWith('audio/') || /^\.(mp3|wav|ogg|m4a|aac)$/i.test(ext)) return 'video'; // Cloudinary handles audio under video
  if (/^\.(zip|rar|7z|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(ext)) return 'raw';
  return 'auto';
};

const uploadBuffer = (buffer, { folder, publicId, resourceType = 'auto', mimetype, originalName } = {}) => {
  if (!isConfigured()) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  const resolvedType = resourceType === 'auto' ? getResourceType(mimetype, originalName) : resourceType;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resolvedType
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );
    stream.end(buffer);
  });
};

const uploadMulterFile = async (file, req) => {
  const folder = getFolderForField(file.fieldname);
  const publicId = buildFilename(req, file);
  const result = await uploadBuffer(file.buffer, {
    folder,
    publicId,
    mimetype: file.mimetype,
    originalName: file.originalname
  });
  file.url = result.url;
  file.publicId = result.publicId;
  return result;
};

const uploadFilesToCloudinary = async (req) => {
  if (req.file) {
    await uploadMulterFile(req.file, req);
  }

  if (Array.isArray(req.files)) {
    for (const file of req.files) {
      await uploadMulterFile(file, req);
    }
    return;
  }

  if (req.files && typeof req.files === 'object') {
    for (const key of Object.keys(req.files)) {
      for (const file of req.files[key]) {
        await uploadMulterFile(file, req);
      }
    }
  }
};

const uploadBase64Image = async (base64String, folder = 'ses-lms/images') => {
  if (!base64String || !base64String.startsWith('data:image/')) {
    return base64String;
  }

  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured for image upload.');
  }

  const result = await cloudinary.uploader.upload(base64String, {
    folder,
    resource_type: 'image'
  });

  return result.secure_url;
};

const uploadGeneratedImage = async (buffer, folder = 'ses-lms/generated') => {
  const result = await uploadBuffer(buffer, {
    folder,
    resourceType: 'image',
    mimetype: 'image/png'
  });
  return result.url;
};

const uploadGeneratedPdf = async (buffer, folder = 'ses-lms/certificates') => {
  const result = await uploadBuffer(buffer, {
    folder,
    publicId: `certificate_${Date.now()}`,
    resourceType: 'raw',
    mimetype: 'application/pdf'
  });
  return result.url;
};

const getPublicIdFromUrl = (url) => {
  try {
    return cloudinary.utils.public_id(url);
  } catch {
    return null;
  }
};

const deleteStoredFile = async (storedValue) => {
  if (!storedValue || typeof storedValue !== 'string') {
    return;
  }

  if (isCloudinaryUrl(storedValue)) {
    if (!isConfigured()) return;

    const publicId = getPublicIdFromUrl(storedValue);
    if (!publicId) return;

    for (const resourceType of ['image', 'raw', 'video']) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        return;
      } catch {
        // try next resource type
      }
    }
    return;
  }

  const cleanPath = storedValue
    .replace(/^\//, '')
    .replace(/^uploads\//, '')
    .replace(/^api\/uploads\//, '');

  const fullPath = path.join(__dirname, '..', 'uploads', cleanPath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return;
  }

  const publicPath = path.join(__dirname, '..', cleanPath);
  if (fs.existsSync(publicPath)) {
    fs.unlinkSync(publicPath);
  }
};

const LEGACY_TEMPLATE_FOLDERS = [
  'ses-lms/templates',
  'ses-lms/images',
  'ses-lms/generated'
];

const cloudinarySearchCache = new Map();
const loadedTemplateImageCache = new Map();
const TEMPLATE_IMAGE_CACHE_TTL_MS = 30 * 60 * 1000;

const getBasename = (storedValue) => {
  const clean = String(storedValue)
    .replace(/^\//, '')
    .replace(/^uploads\//, '')
    .replace(/^api\/uploads\//, '');
  return path.basename(clean);
};

const getLocalCandidatePaths = (storedValue) => {
  const cleanRelative = String(storedValue)
    .replace(/^\//, '')
    .replace(/^uploads\//, '')
    .replace(/^api\/uploads\//, '');

  return [
    path.join(__dirname, '..', 'uploads', cleanRelative),
    path.join(__dirname, '..', cleanRelative),
    path.join(__dirname, '..', 'public', cleanRelative),
    path.join(__dirname, '..', 'public', 'uploads', cleanRelative)
  ];
};

const resolveImageSource = (storedValue) => {
  if (!storedValue) return null;
  if (typeof storedValue === 'string' && storedValue.startsWith('data:')) {
    return storedValue;
  }
  if (typeof storedValue === 'string' && (isCloudinaryUrl(storedValue) || storedValue.startsWith('http'))) {
    return storedValue;
  }

  for (const fullPath of getLocalCandidatePaths(storedValue)) {
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
};

const searchCloudinaryByBasename = async (basename) => {
  if (!isConfigured() || !basename) return null;

  if (cloudinarySearchCache.has(basename)) {
    return cloudinarySearchCache.get(basename);
  }

  const nameWithoutExt = path.basename(basename, path.extname(basename));

  for (const folder of LEGACY_TEMPLATE_FOLDERS) {
    const candidates = [
      `${folder}/${basename}`,
      `${folder}/${nameWithoutExt}`
    ];

    for (const publicId of candidates) {
      try {
        const result = await cloudinary.api.resource(publicId, { resource_type: 'image' });
        if (result?.secure_url) {
          cloudinarySearchCache.set(basename, result.secure_url);
          return result.secure_url;
        }
      } catch {
        // try next candidate
      }
    }
  }

  cloudinarySearchCache.set(basename, null);
  return null;
};

const uploadLocalFileToCloudinary = async (fullPath, folder = 'ses-lms/templates') => {
  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured for image upload.');
  }

  const basename = path.basename(fullPath, path.extname(fullPath));
  const result = await cloudinary.uploader.upload(fullPath, {
    folder,
    public_id: basename,
    resource_type: 'image',
    overwrite: false
  });

  return result.secure_url;
};

const resolveStoredImageForLoad = async (storedValue) => {
  if (!storedValue) return null;

  const syncSource = resolveImageSource(storedValue);
  if (syncSource) {
    return syncSource;
  }

  if (typeof storedValue === 'string' && (isCloudinaryUrl(storedValue) || storedValue.startsWith('http'))) {
    return storedValue;
  }

  if (typeof storedValue === 'string' && storedValue.startsWith('data:')) {
    return storedValue;
  }

  if (isLocalStoredPath(storedValue)) {
    return searchCloudinaryByBasename(getBasename(storedValue));
  }

  return null;
};

const resolveTemplateImage = async (storedValue) => {
  if (!storedValue) {
    return { source: null, persistUrl: null };
  }

  if (typeof storedValue === 'string' && (isCloudinaryUrl(storedValue) || storedValue.startsWith('http'))) {
    return { source: storedValue, persistUrl: null };
  }

  if (typeof storedValue === 'string' && storedValue.startsWith('data:')) {
    return { source: storedValue, persistUrl: null };
  }

  const syncSource = resolveImageSource(storedValue);
  if (syncSource && fs.existsSync(syncSource)) {
    if (isConfigured()) {
      try {
        const url = await uploadLocalFileToCloudinary(syncSource);
        return { source: url, persistUrl: url };
      } catch (error) {
        console.warn('Cloudinary upload failed, using local file:', error.message);
      }
    }
    return { source: syncSource, persistUrl: null };
  }

  const cloudUrl = await searchCloudinaryByBasename(getBasename(storedValue));
  if (cloudUrl) {
    return { source: cloudUrl, persistUrl: cloudUrl };
  }

  return { source: null, persistUrl: null };
};

const resolveStoredImage = resolveTemplateImage;

const getUploadedUrl = (file) => file?.url || null;

const loadCanvasImage = async (loadImageFn, storedValue) => {
  const source = await resolveStoredImageForLoad(storedValue);
  if (!source) {
    return null;
  }

  try {
    return await loadImageFn(source);
  } catch (error) {
    console.error('Error loading image:', error.message);
    return null;
  }
};

const loadTemplateImageForCanvas = async (loadImageFn, templateImage, onUpgraded) => {
  const cached = loadedTemplateImageCache.get(templateImage);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.image;
  }

  const { source, persistUrl } = await resolveTemplateImage(templateImage);

  if (persistUrl && typeof onUpgraded === 'function') {
    try {
      await onUpgraded(persistUrl);
      loadedTemplateImageCache.delete(templateImage);
      if (persistUrl !== templateImage) {
        loadedTemplateImageCache.delete(persistUrl);
      }
    } catch (error) {
      console.warn('Failed to persist upgraded template image URL:', error.message);
    }
  }

  if (!source) {
    throw new Error(
      `Template image not found: ${templateImage}. Please re-upload the template image in admin settings.`
    );
  }

  try {
    const image = await loadImageFn(source);
    loadedTemplateImageCache.set(templateImage, {
      image,
      expiresAt: Date.now() + TEMPLATE_IMAGE_CACHE_TTL_MS
    });
    if (persistUrl && persistUrl !== templateImage) {
      loadedTemplateImageCache.set(persistUrl, {
        image,
        expiresAt: Date.now() + TEMPLATE_IMAGE_CACHE_TTL_MS
      });
    }
    return image;
  } catch (error) {
    throw new Error(`Failed to load template image: ${templateImage}`);
  }
};

const queueGeneratedImageUpload = (updateFn, buffer, folder) => {
  uploadGeneratedImage(buffer, folder)
    .then((fileUrl) => updateFn(fileUrl))
    .catch((err) => console.error('Background image upload failed:', err.message));
};

const sendStoredFile = async (res, doc, contentType = 'image/png', disposition = null) => {
  const headers = { 'Content-Type': contentType };
  if (disposition) {
    headers['Content-Disposition'] = disposition;
  }

  if (doc?.file && Buffer.isBuffer(doc.file) && doc.file.length > 0) {
    res.set(headers);
    return res.send(doc.file);
  }

  if (doc?.fileUrl) {
    const response = await fetch(doc.fileUrl);
    if (!response.ok) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.set(headers);
    return res.send(buffer);
  }

  return res.status(404).json({ success: false, message: 'File not found' });
};

module.exports = {
  cloudinary,
  isConfigured,
  isCloudinaryUrl,
  isLocalStoredPath,
  isStoredFile,
  getFolderForField,
  uploadBuffer,
  uploadMulterFile,
  uploadFilesToCloudinary,
  uploadBase64Image,
  uploadGeneratedImage,
  uploadGeneratedPdf,
  deleteStoredFile,
  deleteFile: deleteStoredFile,
  resolveImageSource,
  resolveStoredImage,
  resolveTemplateImage,
  searchCloudinaryByBasename,
  uploadLocalFileToCloudinary,
  getUploadedUrl,
  sendStoredFile,
  loadCanvasImage,
  loadTemplateImageForCanvas,
  queueGeneratedImageUpload
};
