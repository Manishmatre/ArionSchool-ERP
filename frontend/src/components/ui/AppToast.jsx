import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle,
} from 'react-icons/fi';

const renderIcon = ({ type }) => {
  const base = 'text-xl flex-shrink-0';
  switch (type) {
    case 'success':
      return <FiCheckCircle className={`${base} text-emerald-400`} aria-hidden />;
    case 'error':
      return <FiXCircle className={`${base} text-rose-400`} aria-hidden />;
    case 'warning':
      return <FiAlertTriangle className={`${base} text-amber-400`} aria-hidden />;
    case 'info':
    default:
      return <FiInfo className={`${base} text-indigo-400`} aria-hidden />;
  }
};

const AppToast = () => (
  <ToastContainer
    position="top-right"
    autoClose={3500}
    hideProgressBar={false}
    newestOnTop
    closeOnClick
    pauseOnFocusLoss
    draggable
    pauseOnHover
    limit={4}
    theme="dark"
    icon={renderIcon}
  />
);

export default AppToast;
