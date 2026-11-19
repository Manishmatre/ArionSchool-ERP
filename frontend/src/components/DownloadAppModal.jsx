import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  FiX, FiDownload, FiSmartphone, FiCheckCircle, FiExternalLink, 
  FiCopy, FiCheck, FiInfo, FiLayers, FiHelpCircle 
} from 'react-icons/fi';
import { FaAndroid, FaApple } from 'react-icons/fa';
import { getLatestAppVersion, trackAppDownload } from '../api/appVersionApi';
import { CURRENT_APP_VERSION, CURRENT_APP_BUILD } from '../../../mobile/src/config/version.js';

const DownloadAppModal = ({ isOpen, onClose, initialPlatform = 'android' }) => {
  const [activeTab, setActiveTab] = useState(initialPlatform);
  const [copied, setCopied] = useState(false);
  const [copiedType, setCopiedType] = useState('');
  
  const [latestAndroid, setLatestAndroid] = useState({
    versionName: CURRENT_APP_VERSION,
    versionCode: CURRENT_APP_BUILD,
    fileSize: '39.8 MB',
    apkUrl: `/SES-Educare-v${CURRENT_APP_VERSION}.apk`,
    releaseNotes: `SES Educare Android app version ${CURRENT_APP_VERSION}.`
  });

  const [latestIos, setLatestIos] = useState({
    versionName: CURRENT_APP_VERSION,
    versionCode: CURRENT_APP_BUILD,
    fileSize: '4.8 MB',
    apkUrl: `/SES-Educare-v${CURRENT_APP_VERSION}.ipa`,
    iosUrl: 'https://testflight.apple.com/join/seseducare',
    releaseNotes: `SES Educare iOS app version ${CURRENT_APP_VERSION}.`
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialPlatform);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Fetch dynamic latest versions from server
      getLatestAppVersion('android')
        .then((res) => {
          if (res?.data) setLatestAndroid(res.data);
        })
        .catch(() => {});

      getLatestAppVersion('ios')
        .then((res) => {
          if (res?.data) setLatestIos(res.data);
        })
        .catch(() => {});

      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, initialPlatform]);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://myapp.seseducare.com';
  
  // Android URLs
  const rawApkPath = latestAndroid.apkUrl || `/SES-Educare-v${CURRENT_APP_VERSION}.apk`;
  const apkDownloadUrl = rawApkPath.startsWith('http')
    ? rawApkPath
    : `${currentHost}${rawApkPath.startsWith('/') ? '' : '/'}${rawApkPath}`;

  // iOS URLs
  const rawIpaPath = latestIos.apkUrl || `/SES-Educare-v${CURRENT_APP_VERSION}.ipa`;
  const ipaDownloadUrl = rawIpaPath.startsWith('http')
    ? rawIpaPath
    : `${currentHost}${rawIpaPath.startsWith('/') ? '' : '/'}${rawIpaPath}`;
  const hasRealTestFlight = Boolean(
    latestIos.iosUrl && 
    latestIos.iosUrl.trim().length > 0 &&
    !latestIos.iosUrl.includes('/seseducare') &&
    latestIos.iosUrl.startsWith('http')
  );
  const iosTestFlightUrl = hasRealTestFlight ? latestIos.iosUrl : '';
  const otaSafariUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(`${currentHost}/manifest.plist`)}`;

  const activeDownloadUrl = activeTab === 'android' ? apkDownloadUrl : ipaDownloadUrl;
  
  // Dynamic QR Code for scanning directly from mobile camera
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeDownloadUrl)}`;

  const handleCopy = (text, type = '') => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setCopiedType(type);
    setTimeout(() => {
      setCopied(false);
      setCopiedType('');
    }, 2000);
  };

  const handleDownloadAndroid = () => {
    trackAppDownload('android');
    const link = document.createElement('a');
    link.href = apkDownloadUrl;
    link.setAttribute('download', `SES-Educare-v${latestAndroid.versionName}.apk`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadIpa = () => {
    trackAppDownload('ios');
    const link = document.createElement('a');
    link.href = ipaDownloadUrl;
    link.setAttribute('download', `SES-Educare-v${latestIos.versionName}.ipa`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 min-h-screen"
      style={{ margin: 0 }}
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-scaleIn my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition"
            aria-label="Close"
          >
            <FiX className="text-xl" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center p-2 text-primary-700 flex-shrink-0">
              <FiSmartphone className="text-2xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Download SES Educare App</h3>
              <p className="text-xs text-primary-100">Live mobile platform for Students, Parents & School Staff</p>
            </div>
          </div>

          {/* Platform Tabs */}
          <div className="flex gap-2 mt-4 bg-primary-900/40 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                activeTab === 'android'
                  ? 'bg-white text-primary-800 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <FaAndroid className="text-emerald-500 text-base" />
              <span>Android (APK)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                activeTab === 'ios'
                  ? 'bg-white text-primary-800 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <FaApple className="text-slate-800 text-base" />
              <span>iOS (Apple IPA)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[calc(85vh-140px)] overflow-y-auto">
          {activeTab === 'android' ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 flex-shrink-0 text-center">
                  <img
                    src={qrCodeUrl}
                    alt="Scan to Download Android APK"
                    className="w-32 h-32 mx-auto object-contain"
                  />
                  <span className="text-[10px] text-slate-500 font-medium block mt-1">Scan to Install on Phone</span>
                </div>
                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Latest Release v{latestAndroid.versionName} (Build #{latestAndroid.versionCode || 1})
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">SES Educare for Android</h4>
                  <p className="text-xs text-slate-600">
                    Compatible with all Android devices (Samsung, Redmi, OnePlus, Vivo, Oppo, Realme, etc.)
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-3 text-[11px] text-slate-500 pt-0.5">
                    <span>File size: <b>{latestAndroid.fileSize || '39.5 MB'}</b></span>
                    <span>•</span>
                    <span className="text-emerald-700 font-medium">Auto-Update Ready</span>
                  </div>
                  {latestAndroid.releaseNotes && (
                    <div className="bg-white p-2 rounded border border-slate-100 text-[11px] text-slate-600 text-left">
                      <span className="font-semibold text-slate-700">What's new:</span> {latestAndroid.releaseNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleDownloadAndroid}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition"
                >
                  <FiDownload className="text-lg" />
                  <span>Download APK ({latestAndroid.fileSize || '39.5 MB'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(apkDownloadUrl, 'apk')}
                  className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-xl transition text-xs"
                  title="Copy direct download link"
                >
                  {copied && copiedType === 'apk' ? <FiCheck className="text-emerald-600 text-base" /> : <FiCopy className="text-base" />}
                  <span>{copied && copiedType === 'apk' ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              {/* Direct Link Display */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Direct APK Download Link:</span>
                <a 
                  href={apkDownloadUrl}
                  download={`SES-Educare-v${latestAndroid.versionName}.apk`}
                  className="text-primary-600 hover:text-primary-800 break-all text-[11px] underline flex items-center gap-1"
                >
                  <span>{apkDownloadUrl}</span>
                  <FiExternalLink className="flex-shrink-0" />
                </a>
              </div>

              {/* Fast Installation Guide */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                  <FiCheckCircle className="text-amber-600 text-sm" /> Fast Installation Guide:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-amber-800 text-[11px] pl-1">
                  <li>Tap <b>Download APK</b> above or scan the QR code with your phone camera.</li>
                  <li>When browser asks, choose <b>Download anyway</b> and tap <b>Open</b>.</li>
                  <li>If prompted, enable <b>Allow from this source</b> to complete installation.</li>
                  <li>Log in with your existing student, parent, or school staff credentials.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* iOS Version Badge Card */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 flex-shrink-0 text-center">
                  <img
                    src={qrCodeUrl}
                    alt="Scan for iOS Download"
                    className="w-32 h-32 mx-auto object-contain"
                  />
                  <span className="text-[10px] text-slate-500 font-medium block mt-1">Scan with iPhone</span>
                </div>
                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                    <FaApple className="text-blue-700" />
                    iOS Release v{latestIos.versionName} (Build #{latestIos.versionCode || 1})
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">SES Educare for iPhone & iPad</h4>
                  <p className="text-xs text-slate-600">
                    Compatible with iPhone and iPad running iOS 14.0 or higher.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-3 text-[11px] text-slate-500 pt-0.5">
                    <span>File size: <b>{latestIos.fileSize || '4.7 MB'}</b></span>
                    <span>•</span>
                    <span className="text-blue-700 font-medium">Direct IPA Ready</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for iOS */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadIpa}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition"
                  >
                    <FiDownload className="text-lg" />
                    <span>Download .IPA File ({latestIos.fileSize || '4.7 MB'})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(ipaDownloadUrl, 'ipa')}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-xl transition text-xs"
                    title="Copy direct IPA download link"
                  >
                    {copied && copiedType === 'ipa' ? <FiCheck className="text-emerald-600 text-base" /> : <FiCopy className="text-base" />}
                    <span>{copied && copiedType === 'ipa' ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>

                {hasRealTestFlight ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={iosTestFlightUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition text-xs"
                    >
                      <FaApple className="text-base" />
                      <span>Install via Apple TestFlight (1-Tap)</span>
                      <FiExternalLink className="text-xs opacity-80" />
                    </a>
                    <a
                      href={otaSafariUrl}
                      className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold py-2.5 px-4 rounded-xl transition text-xs"
                      title="Install directly over-the-air in Safari on iPhone"
                    >
                      <span>Safari 1-Tap Install</span>
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={otaSafariUrl}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition text-xs"
                      title="Open in iPhone Safari to install directly without PC"
                    >
                      <FaApple className="text-base" />
                      <span>Safari Wireless 1-Tap Install (OTA)</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Direct Link Display */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Direct iOS IPA Link:</span>
                <a 
                  href={ipaDownloadUrl}
                  download={`SES-Educare-v${latestIos.versionName}.ipa`}
                  className="text-primary-600 hover:text-primary-800 break-all text-[11px] underline flex items-center gap-1"
                >
                  <span>{ipaDownloadUrl}</span>
                  <FiExternalLink className="flex-shrink-0" />
                </a>
              </div>

              {/* How it Works Guide for iOS */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-2">
                <p className="font-semibold text-blue-950 flex items-center gap-1.5">
                  <FiHelpCircle className="text-blue-600 text-sm" /> How iOS Users Can Install & Use:
                </p>
                <div className="space-y-1.5 text-blue-800 text-[11px] pl-1">
                  <div className="bg-white/80 p-2 rounded border border-blue-100">
                    <b className="text-blue-950">Option 1: Direct .IPA Sideload (Works on Any iPhone/iPad)</b>
                    <p className="mt-0.5">1. Tap <b>Download .IPA File</b> above to get <code>SES-Educare-v{latestIos.versionName}.ipa</code>.</p>
                    <p>2. Open free software <b>Sideloadly</b> (<a href="https://sideloadly.io" target="_blank" rel="noreferrer" className="underline text-blue-700">sideloadly.io</a>) or <b>AltStore</b> on PC or Mac.</p>
                    <p>3. Drag the .IPA file and install directly to your connected iPhone using your Apple ID.</p>
                  </div>

                  <div className="bg-white/80 p-2 rounded border border-blue-100">
                    <b className="text-blue-950">Option 2: Safari 1-Tap Wireless Install (OTA)</b>
                    <p className="mt-0.5">Open this download page inside <b>Safari on your iPhone</b> and tap <b>Safari Wireless 1-Tap Install</b> to install directly onto your home screen.</p>
                  </div>

                  <div className="bg-white/80 p-2 rounded border border-blue-100">
                    <b className="text-blue-950">Option 3: Apple TestFlight</b>
                    <p className="mt-0.5">SuperAdmin can publish an Apple TestFlight public invite link in <b>Admin &gt; App Management</b> at any time for 1-tap TestFlight distribution.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>SES Educare Mobile Suite</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-medium px-3 py-1 rounded-lg hover:bg-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default DownloadAppModal;
