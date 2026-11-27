import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiLayers, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiArrowLeft, FiX, FiSave, FiImage } from 'react-icons/fi';
import api from '../../api/axios';
import PasswordInput from '../../components/PasswordInput';
import PhoneInput from '../../components/PhoneInput';
import DocumentUploadPreview from '../../components/DocumentUploadPreview';
import { toAbsoluteUrl } from '../../utils/url';
import { FormPageLayout, FormSection, FormGrid, Button } from '../../components/ui';

const EditCampus = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [filePreviews, setFilePreviews] = useState({});
  const [plans, setPlans] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    establishedDate: '',
    status: 'active',
    plan: '',
    isMainBranch: false,
    aadhaarNumber: '',
    panNumber: '',
    qualification: '',
    aadhaarFileFront: null,
    aadhaarFileBack: null,
    panFile: null,
    qualificationFile: null,
    centerPhoto: null,
    ownerSignature: null
  });

  useEffect(() => {
    const fetchFranchise = async () => {
      try {
        const franchiseRes = await api.get(`/campuses/${id}`);
        const franchiseData = franchiseRes.data.data;

        setFormData({
          name: franchiseData.name || '',
          code: franchiseData.code || '',
          email: franchiseData.contactInfo?.email || '',
          phone: franchiseData.contactInfo?.phone || '',
          address: franchiseData.address?.street || '',
          city: franchiseData.address?.city || '',
          state: franchiseData.address?.state || '',
          pincode: franchiseData.address?.pincode || '',
          adminName: franchiseData.owner?.name || '',
          adminEmail: franchiseData.owner?.email || '',
          adminPhone: franchiseData.owner?.mobile || '',
          establishedDate: franchiseData.establishedDate ? franchiseData.establishedDate.split('T')[0] : '',
          status: franchiseData.status || 'active',
          plan: franchiseData.plan?._id || franchiseData.plan || '',
          isMainBranch: franchiseData.isMainBranch || false,
          aadhaarNumber: franchiseData.owner?.aadhaarNumber || '',
          panNumber: franchiseData.owner?.panNumber || '',
          qualification: franchiseData.owner?.qualification || '',
          aadhaarFileFront: franchiseData.owner?.aadhaarFileFront || null,
          aadhaarFileBack: franchiseData.owner?.aadhaarFileBack || null,
          panFile: franchiseData.owner?.panFile || null,
          qualificationFile: franchiseData.owner?.qualificationFile || null,
          centerPhoto: franchiseData.owner?.centerPhoto || null,
          ownerSignature: franchiseData.owner?.ownerSignature || null
        });

        setFilePreviews({
          aadhaarFileFront: franchiseData.owner?.aadhaarFileFront ? toAbsoluteUrl(franchiseData.owner.aadhaarFileFront) : null,
          aadhaarFileBack: franchiseData.owner?.aadhaarFileBack ? toAbsoluteUrl(franchiseData.owner.aadhaarFileBack) : null,
          panFile: franchiseData.owner?.panFile ? toAbsoluteUrl(franchiseData.owner.panFile) : null,
          qualificationFile: franchiseData.owner?.qualificationFile ? toAbsoluteUrl(franchiseData.owner.qualificationFile) : null,
          centerPhoto: franchiseData.owner?.centerPhoto ? toAbsoluteUrl(franchiseData.owner.centerPhoto) : null,
          ownerSignature: franchiseData.owner?.ownerSignature ? toAbsoluteUrl(franchiseData.owner.ownerSignature) : null
        });
      } catch (error) {
        toast.error('Failed to fetch campus data');
        console.error(error);
      }
    };
    fetchFranchise();
  }, [id]);

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      setFormData(prev => ({ ...prev, [name]: file }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviews(prev => ({ ...prev, [name]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = (name) => {
    setFormData(prev => ({ ...prev, [name]: null }));
    setFilePreviews(prev => ({ ...prev, [name]: null }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === 'aadhaarNumber') {
      formattedValue = value.replace(/[^0-9]/g, '').slice(0, 12);
    } else if (name === 'panNumber') {
      formattedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };
  const fileFields = [
    { name: 'centerPhoto', label: 'School Building / Campus Photo' },
    { name: 'ownerSignature', label: 'Principal / Head Official Signature' },
    { name: 'aadhaarFileFront', label: 'Aadhaar Card (Front)' },
    { name: 'aadhaarFileBack', label: 'Aadhaar Card (Back)' },
    { name: 'panFile', label: 'PAN Card' },
    { name: 'qualificationFile', label: 'Affiliation / Registration Certificate' },
  ];

  const activePreviews = useMemo(() => 
    fileFields.filter(field => filePreviews[field.name]),
    [filePreviews]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const postData = new FormData();
    
    // File field names that need special handling
    const fileFields = ['aadhaarFileFront', 'aadhaarFileBack', 'panFile', 'qualificationFile', 'centerPhoto', 'ownerSignature'];
    
    for (const key in formData) {
      // For file fields, only append if it's a File object (newly uploaded)
      if (fileFields.includes(key)) {
        if (formData[key] instanceof File) {
          postData.append(key, formData[key]);
        }
        // If it's a string (existing URL) or null, don't append it to preserve existing image
      } else {
        // For non-file fields, append as usual
        postData.append(key, formData[key]);
      }
    }

    try {
      await api.put(`/campuses/${id}`, postData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('School campus updated successfully!');
      navigate('/admin/campuses');
    } catch (error) {
      toast.error('Failed to update school campus');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Edit School Campus"
        subtitle="Update the details of the school campus"
        icon={FiLayers}
        actions={
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/campuses')}>
            Back to List
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => navigate('/admin/campuses')}>
                Cancel
              </Button>
              <Button type="submit" icon={FiSave} loading={loading} disabled={loading}>
                {loading ? 'Updating...' : 'Update Campus'}
              </Button>
            </>
          }
        >
          <FormSection title="School Campus Information" icon={FiLayers}>
            <FormGrid>
              <div>
                <label className="form-label">School Campus Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field" placeholder="e.g., Arion School Delhi" required />
              </div>
              <div>
                <label className="form-label">Campus Code *</label>
                <input type="text" name="code" value={formData.code} onChange={handleChange} className="input-field" placeholder="e.g., SES-DEL-001" required />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="campus@example.com" required />
              </div>
              <div>
                <label className="form-label">Phone *</label>
                <PhoneInput name="phone" value={formData.phone} onChange={handleChange} className="input-field" placeholder="Enter 10-digit phone number" required />
              </div>
              <div>
                <label className="form-label">Established Date</label>
                <input type="date" name="establishedDate" value={formData.establishedDate} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="input-field">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="form-label">Affiliation Board</label>
                <select name="affiliationBoard" value={formData.affiliationBoard || 'CBSE'} onChange={handleChange} className="input-field">
                  <option value="CBSE">CBSE (Central Board of Secondary Education)</option>
                  <option value="ICSE">ICSE / CISCE</option>
                  <option value="State Board">M.P. State Board</option>
                  <option value="Other">Other Educational Board</option>
                </select>
              </div>
              <div>
                <label className="form-label">Branch Type</label>
                <div className="flex items-center gap-4 input-field">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="isMainBranch"
                      checked={formData.isMainBranch === false}
                      onChange={() => setFormData(prev => ({ ...prev, isMainBranch: false }))}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="ml-2 text-slate-700">Branch Campus</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="isMainBranch"
                      checked={formData.isMainBranch === true}
                      onChange={() => setFormData(prev => ({ ...prev, isMainBranch: true }))}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="ml-2 text-slate-700">Main Campus</span>
                  </label>
                </div>
              </div>
              <div className="md:col-span-2">
                <DocumentUploadPreview 
                  name="centerPhoto"
                  label="Upload Campus Photo"
                  fileName={formData.centerPhoto?.name || (filePreviews.centerPhoto ? 'Current Photo' : '')}
                  onChange={handleFileChange}
                  onRemove={() => handleRemoveFile('centerPhoto')}
                  accept="image/*"
                />
              </div>
            </FormGrid>
          </FormSection>

          <FormSection title="Address Information" icon={FiMapPin}>
            <FormGrid>
              <div className="md:col-span-2">
                <label className="form-label">Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="input-field"
                  placeholder="Street address, building number, etc."
                  required
                ></textarea>
              </div>
              <div>
                <label className="form-label">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., New Delhi"
                  required
                />
              </div>
              <div>
                <label className="form-label">State *</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Delhi"
                  required
                />
              </div>
              <div>
                <label className="form-label">Pincode *</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., 110001"
                  required
                />
              </div>
            </FormGrid>
          </FormSection>

          <FormSection title="Principal / Campus Admin Details" icon={FiUser}>
            <FormGrid>
              <div>
                <label className="form-label">Admin Name *</label>
                <input
                  type="text"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="form-label">Admin Email *</label>
                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="form-label">Admin Phone *</label>
                <PhoneInput
                  name="adminPhone"
                  value={formData.adminPhone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter 10-digit phone number"
                  required
                />
              </div>
              <div>
                <label className="form-label">Admin Password</label>
                <PasswordInput
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Leave blank to keep unchanged"
                />
              </div>
              <div className="sm:col-span-2">
                <DocumentUploadPreview 
                  name="ownerSignature"
                  label="Upload Principal / Head Signature"
                  fileName={formData.ownerSignature?.name || (filePreviews.ownerSignature ? 'Current File' : '')}
                  onChange={handleFileChange}
                  onRemove={() => handleRemoveFile('ownerSignature')}
                  accept="image/*"
                />
              </div>
              <div>
                <label className="form-label">Aadhaar Number</label>
                <input
                  type="text"
                  name="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter 12-digit Aadhaar number"
                  maxLength="12"
                  pattern="\d{12}"
                />
              </div>
              <div>
                <DocumentUploadPreview 
                  name="aadhaarFileFront"
                  label="Upload Aadhaar Card (Front)"
                  fileName={formData.aadhaarFileFront?.name || (filePreviews.aadhaarFileFront ? 'Current File' : '')}
                  onChange={handleFileChange}
                  onRemove={() => handleRemoveFile('aadhaarFileFront')}
                  accept="image/*,.pdf"
                />
              </div>
              <div>
                <DocumentUploadPreview 
                  name="aadhaarFileBack"
                  label="Upload Aadhaar Card (Back)"
                  fileName={formData.aadhaarFileBack?.name || (filePreviews.aadhaarFileBack ? 'Current File' : '')}
                  onChange={handleFileChange}
                  onRemove={() => handleRemoveFile('aadhaarFileBack')}
                  accept="image/*,.pdf"
                />
              </div>
              <div>
                <label className="form-label">PAN Number</label>
                <input
                  type="text"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter 10-character PAN number"
                  maxLength="10"
                  pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                />
              </div>
              <div>
                <DocumentUploadPreview 
                  name="panFile"
                  label="Upload PAN Card"
                  fileName={formData.panFile?.name || (filePreviews.panFile ? 'Current File' : '')}
                  onChange={handleFileChange}
                  onRemove={() => handleRemoveFile('panFile')}
                  accept="image/*,.pdf"
                />
              </div>
              <div>
                <label className="form-label">Qualification</label>
                <select
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select Qualification</option>
                  <option value="10th Pass">10th Pass</option>
                  <option value="12th Pass">12th Pass</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Post Graduate">Post Graduate</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <DocumentUploadPreview 
                  name="qualificationFile"
                  label="Upload Qualification Certificate"
                  fileName={formData.qualificationFile?.name || (filePreviews.qualificationFile ? 'Current File' : '')}
                  onChange={handleFileChange}
                  onRemove={() => handleRemoveFile('qualificationFile')}
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>
            </FormGrid>
          </FormSection>

          {activePreviews.length > 0 && (
            <FormSection title="File Previews" icon={FiImage}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {activePreviews.map(field => (
                  <div key={field.name} className="relative group">
                    <img 
                      src={filePreviews[field.name]} 
                      alt={`${field.label} preview`} 
                      className="w-full h-32 object-cover rounded-lg shadow-md"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1 rounded-b-lg">
                      {field.label}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(field.name)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </FormSection>
          )}
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default EditCampus;

