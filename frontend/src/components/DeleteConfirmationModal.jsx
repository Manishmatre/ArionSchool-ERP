import { FiTrash2, FiAlertTriangle, FiBook, FiFileText, FiHelpCircle } from 'react-icons/fi';
import Modal from './ui/Modal';
import Button from './ui/Button';

const DeleteConfirmationModal = ({
  show,
  onClose,
  onConfirm,
  itemType,
  itemName,
  associatedItems = [],
  loading = false,
}) => {
  const getIcon = (type) => {
    switch (type) {
      case 'program': return <FiBook className="text-danger-500" />;
      case 'course': return <FiBook className="text-primary-500" />;
      case 'topic': return <FiFileText className="text-success-500" />;
      case 'mcq': return <FiHelpCircle className="text-purple-500" />;
      default: return <FiTrash2 className="text-slate-500" />;
    }
  };

  const getAssociatedIcon = (type) => {
    switch (type) {
      case 'courses': return <FiBook className="text-primary-500" />;
      case 'topics': return <FiFileText className="text-success-500" />;
      case 'mcqs': return <FiHelpCircle className="text-purple-500" />;
      default: return <FiAlertTriangle className="text-slate-500" />;
    }
  };

  const typeLabel = itemType ? itemType.charAt(0).toUpperCase() + itemType.slice(1) : 'Item';

  return (
    <Modal
      open={show}
      onClose={onClose}
      title={`Delete ${typeLabel}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          {associatedItems.length > 0 && (
            <Button variant="secondary" onClick={() => onConfirm(false)} disabled={loading} icon={FiTrash2}>
              Delete Only This {typeLabel}
            </Button>
          )}
          <Button variant="danger" onClick={() => onConfirm(true)} disabled={loading} loading={loading} icon={FiTrash2}>
            {associatedItems.length > 0
              ? `Delete All (${associatedItems.reduce((sum, item) => sum + item.count, 0) + 1})`
              : `Delete ${typeLabel}`}
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-50">{getIcon(itemType)}</span>
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold text-slate-900">"{itemName}"</span>?
        </p>
      </div>

      {associatedItems.length > 0 && (
        <>
          <div className="bg-warning-50 border border-warning-100 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <FiAlertTriangle className="text-warning-600" />
              <span className="font-medium text-warning-800 text-sm">This {itemType} has associated items:</span>
            </div>
            <ul className="space-y-1.5">
              {associatedItems.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-slate-700">
                  {getAssociatedIcon(item.type)}
                  {item.count} {item.type} associated
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-danger-50 border border-danger-100 rounded-xl p-3">
            <p className="text-sm text-danger-800">
              <strong>Warning:</strong> Deleting only this {itemType} may break references in associated items.
            </p>
          </div>
        </>
      )}
    </Modal>
  );
};

export default DeleteConfirmationModal;
