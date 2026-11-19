import { FiTrash2, FiCopy, FiArrowUp, FiArrowDown, FiRotateCw, FiRotateCcw } from 'react-icons/fi';
import { FONT_FAMILIES, FONT_WEIGHTS } from './fieldCatalogs';
import { getFieldLabel } from './templateFieldUtils';
import FieldSizeControls from './FieldSizeControls';

const inputClass = 'mt-1 block w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm';
const labelClass = 'block text-xs font-medium text-gray-600';

const FieldInspector = ({
  field,
  index,
  catalog,
  templateSize,
  onUpdate,
  onRemove,
  onDuplicate,
  onLayerChange,
  onRotate
}) => {
  if (!field) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Select a field on the canvas to edit its properties
      </div>
    );
  }

  const isText = ['text', 'date', 'number', 'table', 'customText'].includes(field.fieldType);
  const isImage = field.fieldType === 'image' || field.fieldType === 'qrCode';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">{getFieldLabel(field.fieldName, catalog, field)}</h4>
        <div className="flex gap-1">
          <button type="button" onClick={() => onDuplicate(index)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Duplicate">
            <FiCopy className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onLayerChange(index, 1)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Bring forward">
            <FiArrowUp className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onLayerChange(index, -1)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Send backward">
            <FiArrowDown className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onRotate(index, -15)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Rotate left">
            <FiRotateCcw className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onRotate(index, 15)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Rotate right">
            <FiRotateCw className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onRemove(index)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Remove">
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {field.fieldType === 'customText' && (
        <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div>
            <label className={labelClass}>Preview value on canvas (not printed)</label>
            <input
              type="text"
              value={field.defaultValue || ''}
              onChange={(e) => onUpdate(index, { defaultValue: e.target.value })}
              placeholder="e.g. 45 WPM"
              className={inputClass}
            />
            <p className="text-xs text-amber-800 mt-1">
              Shown only while editing the template. At generation time, enter the actual value to print.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>X</label>
          <input type="number" value={field.x} onChange={(e) => onUpdate(index, { x: parseInt(e.target.value, 10) || 0 })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Y</label>
          <input type="number" value={field.y} onChange={(e) => onUpdate(index, { y: parseInt(e.target.value, 10) || 0 })} className={inputClass} />
        </div>
      </div>

      <FieldSizeControls field={field} index={index} templateSize={templateSize} onUpdate={onUpdate} variant="panel" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Rotation (°)</label>
          <input type="number" value={field.rotation || 0} onChange={(e) => onUpdate(index, { rotation: parseInt(e.target.value, 10) || 0 })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Layer (z-index)</label>
          <input type="number" value={field.zIndex || 0} onChange={(e) => onUpdate(index, { zIndex: parseInt(e.target.value, 10) || 0 })} className={inputClass} />
        </div>
      </div>

      {isText && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Font Size</label>
              <div className="flex">
                <input type="number" value={field.fontSize} onChange={(e) => onUpdate(index, { fontSize: parseInt(e.target.value, 10) || 12 })} className={`${inputClass} rounded-r-none`} min="1" />
                <select value={field.fontSizeUnit || 'px'} onChange={(e) => onUpdate(index, { fontSizeUnit: e.target.value })} className="mt-1 border border-l-0 border-gray-300 rounded-r-md px-1 text-sm bg-gray-50">
                  <option value="px">px</option>
                  <option value="%">%</option>
                  <option value="em">em</option>
                  <option value="auto">auto</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Font Family</label>
              <select value={field.fontFamily} onChange={(e) => onUpdate(index, { fontFamily: e.target.value })} className={inputClass}>
                {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Font Weight</label>
              <select value={field.fontWeight} onChange={(e) => onUpdate(index, { fontWeight: e.target.value })} className={inputClass}>
                {FONT_WEIGHTS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Text Color</label>
              <input type="color" value={field.color} onChange={(e) => onUpdate(index, { color: e.target.value })} className="mt-1 block w-full h-9 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className={labelClass}>Background</label>
              <input type="color" value={field.backgroundColor === 'transparent' ? '#ffffff' : field.backgroundColor} onChange={(e) => onUpdate(index, { backgroundColor: e.target.value })} className="mt-1 block w-full h-9 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className={labelClass}>Align</label>
              <select value={field.alignment} onChange={(e) => onUpdate(index, { alignment: e.target.value })} className={inputClass}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
                <option value="justify">Justify</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Vertical Align</label>
              <select value={field.verticalAlign || 'top'} onChange={(e) => onUpdate(index, { verticalAlign: e.target.value })} className={inputClass}>
                <option value="top">Top</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Transform</label>
              <select value={field.textTransform || 'none'} onChange={(e) => onUpdate(index, { textTransform: e.target.value })} className={inputClass}>
                <option value="none">None</option>
                <option value="uppercase">Uppercase</option>
                <option value="lowercase">Lowercase</option>
                <option value="capitalize">Capitalize</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Line Height</label>
              <input type="number" step="0.1" value={field.lineHeight || 1.2} onChange={(e) => onUpdate(index, { lineHeight: parseFloat(e.target.value) || 1.2 })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Letter Spacing</label>
              <input type="number" step="0.1" value={field.letterSpacing || 0} onChange={(e) => onUpdate(index, { letterSpacing: parseFloat(e.target.value) || 0 })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Padding</label>
              <input type="number" value={field.padding || 0} onChange={(e) => onUpdate(index, { padding: parseInt(e.target.value, 10) || 0 })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Border Radius</label>
              <input type="number" value={field.borderRadius || 0} onChange={(e) => onUpdate(index, { borderRadius: parseInt(e.target.value, 10) || 0 })} className={inputClass} />
            </div>
          </div>
        </>
      )}

      {isImage && (
        <div>
          <label className={labelClass}>Image Fit</label>
          <select value={field.objectFit || 'cover'} onChange={(e) => onUpdate(index, { objectFit: e.target.value })} className={inputClass}>
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default FieldInspector;
