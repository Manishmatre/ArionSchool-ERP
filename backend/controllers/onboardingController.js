const excelImportService = require('../services/excelImportService');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

exports.previewImport = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Rows array is required' });
    }

    const previewResult = await excelImportService.previewStudents(rows, franchiseId);
    res.status(200).json({
      success: true,
      data: previewResult
    });
  } catch (error) {
    next(error);
  }
};

exports.commitImport = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { rows, academicSessionId } = req.body;

    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Verified rows array is required' });
    }

    const result = await excelImportService.commitStudents(rows, franchiseId, academicSessionId);
    res.status(201).json({
      success: true,
      message: `Successfully imported ${result.importedCount} student records`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
