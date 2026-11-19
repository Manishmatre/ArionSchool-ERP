import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { toast } from 'react-toastify';
import { 
  FiSmartphone, FiPlus, FiDownload, FiCheckCircle, FiTrash2, 
  FiExternalLink, FiUpload, FiRefreshCw, FiAlertTriangle, FiLayers, FiActivity
} from 'react-icons/fi';
import { FaAndroid, FaApple } from 'react-icons/fa';
import { 
  getAllAppVersions, 
  createAppVersion, 
  setActiveAppVersion, 
  deleteAppVersion 
} from '../../api/appVersionApi';
import { 
  StatCard, Button, TableWrapper, Table, TableHead, TableBody, TableRow, 
  TableHeader, TableCell, TableEmpty, Badge, IconButton, Modal, PageLoading 
} from '../../components/ui';

const AppManagement = () => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    platform: 'android',
    versionName: '',
    versionCode: '',
    apkUrl: '/SES-Educare-v1.0.4.apk',
    iosUrl: 'https://testflight.apple.com/join/seseducare',
    fileSize: '40.0 MB',
    releaseNotes: '',
    isMandatory: false,
    isActive: true
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await getAllAppVersions();
      const list = res.data || [];
      setVersions(list);

      // Auto-suggest next version code
      const highestCode = list.reduce((max, item) => Math.max(max, item.versionCode || 0), 0);
      setFormData(prev => ({
        ...prev,
        versionCode: highestCode ? (highestCode + 1).toString() : '2',
        versionName: `1.0.${highestCode || 1}`
      }));
    } catch (error) {
      console.error('Error fetching app versions:', error);
      toast.error('Failed to load app versions');
    } finally {
      setLoading(false);
    }
  };

  const activeAndroid = versions.find(v => v.platform === 'android' && v.isActive);
  const activeIos = versions.find(v => v.platform === 'ios' && v.isActive);

  const getDownloadLink = (ver) => {
    if (ver.isActive) return ver.platform === 'ios' ? '/api/download/ios-ipa' : '/api/download/android';
    if (ver.apkUrl && !ver.apkUrl.includes('LMS')) {
      return ver.apkUrl;
    }
    return ver.platform === 'ios' ? '/api/download/ios-ipa' : '/api/download/android';
  };

  const handleOpenPublishModal = () => {
    const highestCode = versions.reduce((max, item) => Math.max(max, item.versionCode || 0), 0);
    setFormData({
      platform: 'android',
      versionName: `1.0.${highestCode ? highestCode : 1}`,
      versionCode: (highestCode + 1).toString(),
      apkUrl: '/SES-Educare-v1.0.4.apk',
      iosUrl: 'https://testflight.apple.com/join/seseducare',
      fileSize: '39.5 MB',
      releaseNotes: 'Performance improvements and bug fixes.',
      isMandatory: false,
      isActive: true
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setFormData(prev => ({
        ...prev,
        fileSize: `${mb} MB`,
        apkUrl: `/uploads/${file.name}`
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.versionName || !formData.versionCode) {
      toast.error('Version Name and Build Number are required');
      return;
    }

    try {
      setSubmitting(true);
      const postData = new FormData();
      postData.append('platform', formData.platform);
      postData.append('versionName', formData.versionName);
      postData.append('versionCode', formData.versionCode);
      postData.append('apkUrl', formData.apkUrl);
      postData.append('iosUrl', formData.iosUrl);
      postData.append('fileSize', formData.fileSize);
      postData.append('releaseNotes', formData.releaseNotes);
      postData.append('isMandatory', formData.isMandatory);
      postData.append('isActive', formData.isActive);

      if (selectedFile) {
        postData.append('apkFile', selectedFile);
      }

      await createAppVersion(postData);
      toast.success(`App Version ${formData.versionName} published successfully!`);
      setIsModalOpen(false);
      fetchVersions();
    } catch (error) {
      console.error('Error publishing release:', error);
      toast.error(error.response?.data?.message || 'Failed to publish app release');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetActive = async (id, versionName) => {
    try {
      await setActiveAppVersion(id);
      toast.success(`Version ${versionName} is now the LIVE active app release!`);
      fetchVersions();
    } catch (error) {
      toast.error('Failed to change active version');
    }
  };

  const handleDelete = async (id, versionName) => {
    if (!window.confirm(`Are you sure you want to delete the release record for v${versionName}?`)) {
      return;
    }
    try {
      await deleteAppVersion(id);
      toast.success(`Version record deleted`);
      fetchVersions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete release');
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="App Management" subtitle="Manage mobile app versions, live releases and auto-updates" icon={FiSmartphone} />
        <PageLoading message="Loading app version releases..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Mobile App Management"
          subtitle="Manage mobile application releases, live active version, auto-update alerts and APK distributions"
          icon={FiSmartphone}
          actions={
            <Button icon={FiPlus} onClick={handleOpenPublishModal}>
              Publish New App Release
            </Button>
          }
        />

        {/* Live App Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Current Live Android"
            value={activeAndroid ? `v${activeAndroid.versionName} (Build #${activeAndroid.versionCode})` : 'v1.0.0 (Build #1)'}
            tone="success"
            icon={FaAndroid}
            description="Users download this release everywhere"
          />
          <StatCard
            title="Total App Downloads"
            value={versions.reduce((acc, v) => acc + (v.downloadCount || 0), 0)}
            tone="info"
            icon={FiDownload}
            description="Across web portal and direct APK links"
          />
          <StatCard
            title="Auto-Update Status"
            value="Active & Enabled"
            tone="purple"
            icon={FiActivity}
            description="App checks for updates on startup"
          />
          <StatCard
            title="iOS App Status"
            value="Apple TestFlight Beta"
            tone="primary"
            icon={FaApple}
            description="Available for iPhone and iPad"
          />
        </div>

        {/* Releases Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <FiLayers className="text-primary-600" />
                Mobile Application Release History
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The active version marked as <b>Live</b> is served to all students and school campuses across download buttons and update prompts.
              </p>
            </div>
            <button
              onClick={fetchVersions}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-200 hover:bg-primary-50 transition"
            >
              <FiRefreshCw /> Refresh List
            </button>
          </div>

          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>Platform & Version</TableHeader>
                  <TableHeader>Build Serial #</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Mandatory Update</TableHeader>
                  <TableHeader>File Size</TableHeader>
                  <TableHeader>Release Date</TableHeader>
                  <TableHeader>Downloads</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                {versions.length === 0 ? (
                  <TableEmpty colSpan={8} title="No app releases recorded" description="Click 'Publish New App Release' to create your first release." />
                ) : (
                  versions.map((ver) => (
                    <TableRow key={ver._id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ver.platform === 'android' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-800'}`}>
                            {ver.platform === 'android' ? <FaAndroid className="text-base" /> : <FaApple className="text-base" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">v{ver.versionName}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{ver.releaseNotes || 'No notes'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          Build #{ver.versionCode}
                        </span>
                      </TableCell>
                      <TableCell>
                        {ver.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            LIVE (Active)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            Archived
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ver.isMandatory ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                            <FiAlertTriangle className="text-xs" /> Yes (Force)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Optional</span>
                        )}
                      </TableCell>
                      <TableCell>{ver.fileSize || '39.5 MB'}</TableCell>
                      <TableCell>{new Date(ver.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-slate-700">{ver.downloadCount || 0}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {!ver.isActive && (
                            <button
                              onClick={() => handleSetActive(ver._id, ver.versionName)}
                              className="text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded transition"
                              title="Make this release active immediately"
                            >
                              Make Live
                            </button>
                          )}
                          <a
                            href={getDownloadLink(ver)}
                            download
                            className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                            title={`Download ${ver.platform === 'ios' ? 'IPA' : 'APK'}`}
                          >
                            <FiDownload className="text-base" />
                          </a>
                          {!ver.isActive && (
                            <button
                              onClick={() => handleDelete(ver._id, ver.versionName)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Delete record"
                            >
                              <FiTrash2 className="text-base" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        </div>

        {/* Publish Release Modal */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Publish New App Release"
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button icon={FiUpload} onClick={handleSubmit} loading={submitting}>
                Publish Release
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 text-xs text-primary-900 flex items-start gap-2.5">
              <FiCheckCircle className="text-primary-600 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Automatic App Update Deployment</p>
                <p className="text-primary-800 mt-0.5">
                  When you publish a new version with higher build serial number and keep <b>Make Live</b> checked, the Android mobile application will automatically display an update prompt to all installed users!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="android">Android (APK)</option>
                  <option value="ios">iOS (Apple TestFlight / App Store)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Version Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1.0.1"
                  value={formData.versionName}
                  onChange={(e) => setFormData({ ...formData, versionName: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Build Serial Number (versionCode) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2"
                  value={formData.versionCode}
                  onChange={(e) => setFormData({ ...formData, versionCode: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 font-mono"
                  required
                  min="1"
                />
                <span className="text-[10px] text-slate-500">Sequential integer used by app to determine updates.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display File Size</label>
                <input
                  type="text"
                  placeholder="e.g. 39.5 MB"
                  value={formData.fileSize}
                  onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {formData.platform === 'android' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload New APK File (Optional)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-primary-400 bg-slate-50 transition cursor-pointer">
                    <input
                      type="file"
                      accept=".apk,application/vnd.android.package-archive"
                      onChange={handleFileChange}
                      className="hidden"
                      id="apk-upload-input"
                    />
                    <label htmlFor="apk-upload-input" className="cursor-pointer block">
                      <FiUpload className="text-2xl text-slate-400 mx-auto mb-1" />
                      <span className="text-xs font-semibold text-primary-600 block">
                        {selectedFile ? selectedFile.name : 'Click to select .apk file from your computer'}
                      </span>
                      <span className="text-[10px] text-slate-400">Up to 150MB APK file</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Or Direct APK Download URL / Path
                  </label>
                  <input
                    type="text"
                    value={formData.apkUrl}
                    onChange={(e) => setFormData({ ...formData, apkUrl: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 font-mono text-xs focus:ring-2 focus:ring-primary-500"
                    placeholder="/SES-Educare-v1.0.0.apk or https://..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload New iOS .IPA File (Optional)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-primary-400 bg-slate-50 transition cursor-pointer">
                    <input
                      type="file"
                      accept=".ipa,application/octet-stream"
                      onChange={handleFileChange}
                      className="hidden"
                      id="ipa-upload-input"
                    />
                    <label htmlFor="ipa-upload-input" className="cursor-pointer block">
                      <FiUpload className="text-2xl text-slate-400 mx-auto mb-1" />
                      <span className="text-xs font-semibold text-primary-600 block">
                        {selectedFile ? selectedFile.name : 'Click to select .ipa file from your computer'}
                      </span>
                      <span className="text-[10px] text-slate-400">iOS Package file (.ipa)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Direct .IPA Download URL or Path
                  </label>
                  <input
                    type="text"
                    value={formData.apkUrl}
                    onChange={(e) => setFormData({ ...formData, apkUrl: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 font-mono text-xs focus:ring-2 focus:ring-primary-500"
                    placeholder="/SES-Educare-v1.0.0.ipa"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apple TestFlight or App Store URL
                  </label>
                  <input
                    type="url"
                    value={formData.iosUrl}
                    onChange={(e) => setFormData({ ...formData, iosUrl: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 font-mono text-xs focus:ring-2 focus:ring-primary-500"
                    placeholder="https://testflight.apple.com/join/..."
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Release Notes / Changelog</label>
              <textarea
                rows={3}
                value={formData.releaseNotes}
                onChange={(e) => setFormData({ ...formData, releaseNotes: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                placeholder="What's new in this update? (e.g., Performance boost, camera scanner improvements)"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <span>Set as LIVE Active Release immediately</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.isMandatory}
                  onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>Force Mandatory Update (User cannot skip)</span>
              </label>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default AppManagement;
