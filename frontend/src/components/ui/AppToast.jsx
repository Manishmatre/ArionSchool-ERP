import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AppToast.css';
import { useBranding } from '../../context/BrandingContext';
import {
  FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle,
} from 'react-icons/fi';

const renderIcon = ({ type }) => {
  const base = 'ses-toast__icon';
  switch (type) {
    case 'success':
      return <FiCheckCircle className={`${base} ses-toast__icon--success`} aria-hidden />;
    case 'error':
      return <FiXCircle className={`${base} ses-toast__icon--error`} aria-hidden />;
    case 'warning':
      return <FiAlertTriangle className={`${base} ses-toast__icon--warning`} aria-hidden />;
    case 'info':
    default:
      return <FiInfo className={`${base} ses-toast__icon--info`} aria-hidden />;
  }
};

const AppToast = () => {
  const { branding, themeMode } = useBranding();
  const accent = branding?.visual?.secondaryColor || branding?.visual?.primaryColor || '#2563eb';
  const isDark = themeMode === 'full-dark';

  return (
    <ToastContainer
      position="top-right"
      autoClose={2800}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      draggable
      pauseOnHover
      limit={3}
      theme="light"
      icon={renderIcon}
      className={`ses-toast-container${isDark ? ' ses-toast-container--dark' : ''}`}
      toastClassName="ses-toast"
      bodyClassName="ses-toast__body"
      progressClassName="ses-toast__progress"
      style={{ '--app-toast-accent': accent }}
    />
  );
};

export default AppToast;
