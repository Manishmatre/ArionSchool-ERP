const multer = require('multer');
const path = require('path');
const Student = require('../models/Student');
const { uploadFilesToCloudinary } = require('../utils/cloudinary');
const { getMaxUploadBytes } = require('../utils/uploadLimits');

const maxFileSize = getMaxUploadBytes();

const getStudentName = async (studentId) => {
  try {
    if (!studentId) return '';
    const student = await Student.findById(studentId).select('personalInfo.firstName personalInfo.lastName');
    if (student && student.personalInfo) {
      const firstName = student.personalInfo.firstName || '';
      const lastName = student.personalInfo.lastName || '';
      const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`.trim();
      return fullName.replace(/\s+/g, '_');
    }
    return '';
  } catch (error) {
    console.error('Error fetching student name:', error);
    return '';
  }
};

const setStudentName = async (req, res, next) => {
  if (req.params.id) {
    req.studentName = await getStudentName(req.params.id);
  }
  next();
};

const fileFilter = (req, file, cb) => {
  let allowedTypes;

  if (file.fieldname === 'photo' || file.fieldname === 'thumbnail' || file.fieldname === 'templateImage' || file.fieldname === 'asset' || file.fieldname === 'logo' || file.fieldname === 'favicon') {
    allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  } else if (file.fieldname === 'video' || file.fieldname === 'lessonVideo') {
    allowedTypes = /mp4|webm|mov|mkv|avi|m4v/;
  } else if (file.fieldname === 'document') {
    allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt/;
  } else {
    allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|xls|xlsx|ppt|pptx|mp4|webm|mov|mkv|avi|m4v/;
  }

  const rawExt = path.extname(file.originalname).toLowerCase().replace('.', '');
  const extname = allowedTypes.test(rawExt);
  const mimetype =
    allowedTypes.test(file.mimetype) ||
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype.includes('document') ||
    file.mimetype.includes('sheet') ||
    file.mimetype.includes('presentation') ||
    file.mimetype === 'application/octet-stream';

  if (mimetype && extname) {
    return cb(null, true);
  }

  cb(new Error(`Invalid file type for ${file.fieldname}. Allowed extensions: ${allowedTypes.toString().replace(/[\/\\]/g, ', ')}`));
};

const optionalFileFilter = (req, file, cb) => {
  if (!file || !file.originalname) {
    return cb(null, false);
  }
  return fileFilter(req, file, cb);
};

const multerInstance = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSize
  },
  fileFilter
});

const wrapMulterMethod = (method) => (...args) => {
  const multerMiddleware = method(...args);

  return (req, res, next) => {
    multerMiddleware(req, res, async (err) => {
      if (err) return next(err);

      try {
        await uploadFilesToCloudinary(req);
        next();
      } catch (uploadError) {
        next(uploadError);
      }
    });
  };
};

const upload = {
  single: wrapMulterMethod(multerInstance.single.bind(multerInstance)),
  array: wrapMulterMethod(multerInstance.array.bind(multerInstance)),
  fields: wrapMulterMethod(multerInstance.fields.bind(multerInstance)),
  any: wrapMulterMethod(multerInstance.any.bind(multerInstance))
};

const optionalUpload = (fields) => {
  const optionalMulter = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSize
    },
    fileFilter: optionalFileFilter
  });

  return wrapMulterMethod(optionalMulter.fields.bind(optionalMulter))(fields);
};

module.exports = upload;
module.exports.optionalUpload = optionalUpload;
module.exports.setStudentName = setStudentName;
