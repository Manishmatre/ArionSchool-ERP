import { useState } from 'react';
import { toAbsoluteUrl } from '../../utils/url';

const MarksheetLivePreview = ({ student, course, template, marks, issueDate, assets = {}, renderedImageUrl, serverRendered = false, isRendering = false, renderError = '' }) => {
  const [imageSize, setImageSize] = useState(null);
  const total = marks.reduce((sum, row) => sum + (Number(row.totalMarks) || 0), 0);
  const obtained = marks.reduce((sum, row) => sum + (Number(row.obtainedMarks) || 0), 0);
  const percentage = total ? ((obtained / total) * 100).toFixed(2) : '0.00';
  const studentName = `${student?.personalInfo?.firstName || ''} ${student?.personalInfo?.lastName || ''}`.trim() || 'Student Name';
  const courseTitle = course?.title || 'Course';
  const usedMarkCount = marks.filter((mark) => mark.subject?.trim()).length;
  const defaultRowHeight = Math.min(56, (450 - 46) / (usedMarkCount + 1));
  const defaultTableHeight = 46 + defaultRowHeight * (usedMarkCount + 1);
  const defaultSummaryY = 844 + defaultTableHeight + 70;
  const defaultFields = [
    { fieldName: 'studentPhoto', fieldType: 'image', x: 1228, y: 284, width: 132, height: 166, objectFit: 'cover' },
    { fieldName: 'marksheetTitle', fieldType: 'customText', defaultValue: 'MARKSHEET', x: 350, y: 333, width: 714, height: 55, fontSize: 48, fontWeight: 'bold', alignment: 'center', textDecoration: 'underline' },
    { fieldName: 'studentName', label: 'Student Name', fieldType: 'text', x: 102, y: 461, width: 588, height: 28, fontSize: 22, labelWidth: 179 },
    { fieldName: 'courseName', label: 'Course', fieldType: 'text', x: 735, y: 461, width: 475, height: 28, fontSize: 22, labelWidth: 150 },
    { fieldName: 'fatherName', label: "Father's Name", fieldType: 'text', x: 102, y: 503, width: 588, height: 28, fontSize: 22, labelWidth: 179 },
    { fieldName: 'courseDuration', label: 'Duration', fieldType: 'text', x: 735, y: 503, width: 475, height: 28, fontSize: 22, labelWidth: 150 },
    { fieldName: 'motherName', label: "Mother's Name", fieldType: 'text', x: 102, y: 545, width: 588, height: 28, fontSize: 22, labelWidth: 179 },
    { fieldName: 'session', label: 'Session', fieldType: 'text', x: 735, y: 545, width: 475, height: 28, fontSize: 22, labelWidth: 150 },
    { fieldName: 'dateOfBirth', label: 'Date Of Birth', fieldType: 'text', x: 102, y: 587, width: 588, height: 28, fontSize: 22, labelWidth: 179 },
    { fieldName: 'marksheetNo', label: 'Marksheet No.', fieldType: 'text', x: 735, y: 587, width: 475, height: 28, fontSize: 22, labelWidth: 150 },
    { fieldName: 'gender', label: 'Gender', fieldType: 'text', x: 102, y: 629, width: 588, height: 28, fontSize: 22, labelWidth: 179 },
    { fieldName: 'enrollmentNumber', label: 'Enrollment No.', fieldType: 'text', x: 735, y: 629, width: 475, height: 28, fontSize: 22, labelWidth: 150 },
    { fieldName: 'statementOfMarks', fieldType: 'customText', defaultValue: 'STATEMENT OF MARKS', x: 350, y: 758, width: 714, height: 45, fontSize: 36, color: '#d83f36', fontWeight: 'bold', alignment: 'center' },
    { fieldName: 'marksTable', fieldType: 'table', x: 140, y: 844, width: 1134, height: defaultTableHeight, fontSize: 22 },
    { fieldName: 'percentage', label: 'Percentage', fieldType: 'text', x: 72, y: defaultSummaryY - 14, width: 420, height: 28, fontSize: 24, fontWeight: 'bold', labelWidth: 158 },
    { fieldName: 'grade', label: 'Grade', fieldType: 'text', x: 72, y: defaultSummaryY + 26, width: 420, height: 28, fontSize: 24, fontWeight: 'bold', labelWidth: 158 },
    { fieldName: 'place', label: 'Place', fieldType: 'text', x: 72, y: 1518, width: 850, height: 28, fontSize: 22, fontWeight: 'bold', labelWidth: 58 },
    { fieldName: 'issueDate', label: 'Date of Issue', fieldType: 'text', x: 72, y: 1560, width: 420, height: 28, fontSize: 22, fontWeight: 'bold', labelWidth: 118 },
    { fieldName: 'isoLogo', fieldType: 'image', x: 1216, y: 1450, width: 112, height: 112, objectFit: 'contain' },
    { fieldName: 'qrCode', fieldType: 'qrCode', x: 1224, y: 1604, width: 104, height: 104 }
  ];
  const fields = template?.fields?.length ? template.fields : defaultFields;
  const defaultBackground = student?.franchise && student.franchise.isMainBranch === false
    ? '/marksheets/franchise-marksheet.jpg'
    : '/marksheets/main-branch-marksheet.jpg';
  const background = template?.templateImage ? toAbsoluteUrl(template.templateImage) : defaultBackground;

  if (serverRendered) {
    return (
      <div className="relative mx-auto w-full max-w-[640px] overflow-hidden border border-slate-300 bg-white shadow-lg">
        {renderedImageUrl ? (
          <img src={renderedImageUrl} alt="Rendered marksheet preview" className="block h-auto w-full" />
        ) : background ? (
          <img src={background} alt="Official marksheet background" className="block h-auto w-full" />
        ) : (
          <div className="flex aspect-[210/297] items-center justify-center text-sm text-slate-500">Preparing A4 print preview…</div>
        )}
        {(isRendering || renderError) && (
          <div className="absolute inset-x-0 bottom-0 bg-slate-900/85 px-3 py-2 text-center text-xs text-white" role="status">
            {isRendering ? 'Updating print preview…' : renderError}
          </div>
        )}
      </div>
    );
  }

  const valueFor = (name) => {
    const key = name?.replace(/[_\s-]/g, '').toLowerCase();
    const values = {
      studentname: studentName,
      studentid: student?.studentId || '—',
      enrollmentnumber: student?.enrollmentNumber || student?.studentId || '—',
      fathername: student?.personalInfo?.fatherName || '—',
      mothername: student?.personalInfo?.motherName || '—',
      dateofbirth: student?.personalInfo?.dateOfBirth ? new Date(student.personalInfo.dateOfBirth).toLocaleDateString('en-IN') : '—',
      gender: student?.personalInfo?.gender || '—',
      coursename: courseTitle,
      coursecode: course?.courseCode || '—',
      courseduration: course?.duration ? `${course.duration} Months` : '—',
      duration: course?.duration ? `${course.duration} Months` : '—',
      totalmarks: String(total),
      obtainedmarks: String(obtained),
      percentage: `${percentage}%`,
      grade: Number(percentage) >= 90 ? 'A+' : Number(percentage) >= 75 ? 'A' : Number(percentage) >= 60 ? 'B' : 'C',
      issuedate: issueDate ? new Date(`${issueDate}T00:00:00`).toLocaleDateString('en-IN') : '—',
      certificateno: 'SES-MARKS-2026-0001',
      certificatenumber: 'SES-MARKS-2026-0001',
      marksheetno: 'SES-MARKS-2026-0001',
      marksheetnumber: 'SES-MARKS-2026-0001',
      session: '2026 - 2027',
      place: 'Kanha Bhairav, Rajim, Chhattisgarh, India'
    };
    return values[key] || `[${name || 'Field'}]`;
  };

  const renderTable = () => {
    const previewScale = 640 / (imageSize?.width || 1414);
    const defaultRowStyle = !template?.fields?.length ? { height: `${defaultRowHeight * previewScale}px` } : undefined;
    const totalMin = marks.filter((mark) => mark.subject?.trim()).reduce((sum, m) => sum + (m.minMarks != null ? Number(m.minMarks) : Math.round((Number(m.totalMarks) || 100) * 0.4)), 0);
    return (
    <div className="relative h-full w-full border border-blue-400/80">
      <table className="relative w-full table-fixed border-collapse text-[7px] text-slate-900 sm:text-[9px]">
        <colgroup>
          <col style={{ width: '8%' }} />
          <col style={{ width: '47%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '25%' }} />
        </colgroup>
        <thead>
          <tr className="font-bold bg-slate-100/60" style={defaultRowStyle}>
            <th className="border border-slate-600 p-0.5 text-center">SR. NO.</th>
            <th className="border border-slate-600 p-0.5 text-left pl-1">SUBJECT</th>
            <th className="border border-slate-600 p-0.5 text-center">MAX.</th>
            <th className="border border-slate-600 p-0.5 text-center">MIN.</th>
            <th className="border border-slate-600 p-0.5 text-center whitespace-nowrap">OBTAINED MARKS</th>
          </tr>
        </thead>
        <tbody>
          {marks.filter((mark) => mark.subject?.trim()).map((mark, index) => {
            const minScore = mark.minMarks != null ? mark.minMarks : Math.round((Number(mark.totalMarks) || 100) * 0.4);
            return (
              <tr key={`${mark.subject}-${index}`} style={defaultRowStyle}>
                <td className="border border-slate-500/70 p-0.5 text-center">{index + 1}</td>
                <td className="border border-slate-500/70 p-0.5 text-left pl-1 truncate">{mark.subject}</td>
                <td className="border border-slate-500/70 p-0.5 text-center">{mark.totalMarks}</td>
                <td className="border border-slate-500/70 p-0.5 text-center">{minScore}</td>
                <td className="border border-slate-500/70 p-0.5 text-center">{mark.obtainedMarks}</td>
              </tr>
            );
          })}
          <tr className="font-bold bg-slate-100/40" style={defaultRowStyle}>
            <td className="border border-slate-600 p-0.5 text-center"></td>
            <td className="border border-slate-600 p-0.5 text-left pl-1">TOTAL</td>
            <td className="border border-slate-600 p-0.5 text-center">{total}</td>
            <td className="border border-slate-600 p-0.5 text-center">{totalMin}</td>
            <td className="border border-slate-600 p-0.5 text-center">{obtained}</td>
          </tr>
        </tbody>
      </table>
    </div>
    );
  };

  if (background && imageSize) {
    return (
      <div className="mx-auto w-full max-w-[640px] overflow-hidden border border-slate-300 bg-white shadow-lg" style={{ aspectRatio: `${imageSize.width}/${imageSize.height}` }}>
        <div className="relative h-full w-full">
          <img src={background} alt="Marksheet background" className="absolute inset-0 h-full w-full" onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
          {fields.map((field, index) => {
            const pos = imageSize ? { left: `${field.x / imageSize.width * 100}%`, top: `${field.y / imageSize.height * 100}%`, width: `${field.width / imageSize.width * 100}%`, height: `${field.height / imageSize.height * 100}%` } : {};
            const asset = field.fieldName === 'studentPhoto'
              ? (student?.personalInfo?.photo || student?.user?.profilePicture)
              : assets[field.fieldName];
            return (
              <div key={`${field.fieldName}-${index}`} className="absolute overflow-hidden" style={{ ...pos, zIndex: (field.zIndex || 0) + 1, color: field.color || '#111827', backgroundColor: field.backgroundColor && field.backgroundColor !== 'transparent' ? field.backgroundColor : 'transparent', fontSize: `clamp(5px, ${(field.fontSize || 12) / imageSize.width * 640}px, 18px)`, fontFamily: field.fontFamily || 'Arial', fontWeight: field.fontWeight || 'normal', textAlign: field.alignment || 'left', textDecoration: field.textDecoration || 'none', lineHeight: field.lineHeight || 1.2 }}>
                {field.fieldType === 'table' ? renderTable() : field.fieldType === 'image' ? (asset ? <img src={toAbsoluteUrl(asset)} alt={field.fieldName} className="h-full w-full" style={{ objectFit: field.objectFit || 'contain' }} /> : <span className="flex h-full items-center justify-center border border-dashed border-slate-400 text-[8px]">{field.fieldName === 'studentPhoto' ? 'Student Photo' : 'ISO'}</span>) : field.fieldType === 'qrCode' ? <span className="flex h-full items-center justify-center border border-slate-400 bg-white text-[8px]">QR Preview</span> : (!template?.fields?.length && field.label && field.labelWidth ? (
                  <div className="grid h-full items-center whitespace-nowrap" style={{ gridTemplateColumns: `${(field.labelWidth / field.width) * 100}% ${((field.fieldName === 'place' ? 18 : 24) / field.width) * 100}% 1fr`, fontFamily: 'Times New Roman, serif', fontSize: `clamp(5px, ${(field.fontSize || 12) / imageSize.width * 640}px, 18px)`, fontWeight: field.fontWeight || 'normal' }}>
                    <span className="overflow-hidden text-ellipsis text-slate-900">{field.label && field.label.toLowerCase().includes('certificate no') ? 'Marksheet No.' : field.label}</span>
                    <span className="text-center text-slate-900">:</span>
                    <span className="overflow-hidden text-ellipsis font-sans font-normal text-[#254b78]" style={{ fontSize: `clamp(5px, ${22 / imageSize.width * 640}px, 17px)` }}>{valueFor(field.fieldName)}</span>
                  </div>
                ) : <span>{field.fieldType === 'customText' ? (field.defaultValue || '[Custom text]') : valueFor(field.fieldName)}</span>)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (background) {
    return <div className="mx-auto flex min-h-[400px] max-w-[640px] items-center justify-center border border-slate-200 bg-white"><img src={background} alt="Marksheet background" className="hidden" onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} /><span className="text-sm text-slate-500">Loading print preview…</span></div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-[440px] aspect-[210/297] flex-col border-[5px] border-double border-[#d95b3f] bg-white p-5 shadow-lg sm:p-8">
      <header className="border-b-2 border-[#d95b3f] pb-3 text-center">
        <div className="text-base font-black uppercase leading-tight text-[#d95b3f] sm:text-xl">Startology Educare Services Pvt. Ltd.</div>
        {assets.logo && <img src={toAbsoluteUrl(assets.logo)} alt="Company logo" className="mx-auto mt-2 h-9 max-w-28 object-contain" />}
        <p className="mt-1 text-[8px] text-slate-700 sm:text-[10px]">Reg. No: U78100CT2025PTC018743 · ISO 9001:2015 Certified</p>
      </header>
      <div className="my-5 text-center">
        <h3 className="font-serif text-lg font-black tracking-widest sm:text-2xl">MARKSHEET</h3>
        <p className="mt-1 text-[10px] font-semibold text-slate-700 sm:text-xs">{studentName} · {courseTitle}</p>
      </div>
      <div className="relative">
        {assets.watermarkImage && <img src={toAbsoluteUrl(assets.watermarkImage)} alt="" className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.08] sm:h-56 sm:w-56" />}
        {renderTable()}
      </div>
      <div className="mt-3 text-[9px] text-slate-800 sm:text-xs">
        <p>Issue Date: {issueDate ? new Date(`${issueDate}T00:00:00`).toLocaleDateString('en-IN') : '—'}</p>
        <p>Percentage: {percentage}%</p>
      </div>
      <footer className="mt-auto border-t border-slate-300 pt-3 text-center text-[8px] text-slate-700 sm:text-[10px]">
        <div className="mb-2 flex items-end justify-between">
          {assets.companySeal && <img src={toAbsoluteUrl(assets.companySeal)} alt="Company seal" className="h-12 w-12 object-contain" />}
          {assets.superAdminSignature && <img src={toAbsoluteUrl(assets.superAdminSignature)} alt="Authorized signature" className="h-8 max-w-24 object-contain" />}
        </div>
        <strong>Startology Educare Services Private Limited</strong><br />www.seseducare.com
      </footer>
    </div>
  );
};

export default MarksheetLivePreview;
