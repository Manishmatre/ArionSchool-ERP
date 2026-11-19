import {
  FiTrash2,
  FiCopy,
  FiArrowUp,
  FiArrowDown,
  FiRotateCw,
  FiRotateCcw,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiBold,
  FiType
} from 'react-icons/fi';
import { FONT_FAMILIES } from './fieldCatalogs';
import { getFieldLabel, getFieldDisplayLabel } from './templateFieldUtils';
import FieldSizeControls from './FieldSizeControls';

const chipClass = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-md bg-white text-sm';
const inputMd = 'border border-gray-300 rounded-md px-2 py-1.5 text-sm w-20 h-9 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed';
const btnMd = 'p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 h-9 min-w-[36px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white';

const InlineFieldEditor = ({
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
  const hasField = field && index !== null && index !== undefined;

  const noop = () => {};
  const update = hasField ? onUpdate : noop;

  const f = field || {
    fieldName: '',
    fieldType: 'text',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fontSize: 12,
    fontSizeUnit: 'px',
    fontFamily: 'Arial',
    fontWeight: 'normal',
    color: '#000000',
    backgroundColor: 'transparent',
    alignment: 'left',
    textTransform: 'none',
    rotation: 0,
    zIndex: 0,
    objectFit: 'cover',
    defaultValue: ''
  };
  const isText = ['text', 'date', 'number', 'table', 'customText'].includes(f.fieldType);
  const isImage = f.fieldType === 'image' || f.fieldType === 'qrCode';
  const isCustomText = f.fieldType === 'customText';

  return (
    <div className="w-full bg-white border border-blue-200 rounded-lg shadow-sm p-3 space-y-3 min-h-[148px]">
      {/* Row 1: Field name, position, size, actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className={`${chipClass} ${hasField ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 text-gray-400'} font-medium`}>
          <FiType className="w-4 h-4" />
          {hasField ? getFieldDisplayLabel(f, catalog) : 'Select a field on canvas'}
        </div>

        {hasField && isCustomText && (
          <div className={chipClass}>
            <span className="text-gray-500 text-sm">Preview value</span>
            <input
              type="text"
              disabled={!hasField}
              value={f.defaultValue || ''}
              onChange={(e) => update(index, { defaultValue: e.target.value })}
              className={`${inputMd} min-w-[140px]`}
              placeholder="e.g. 45 WPM"
            />
          </div>
        )}

        <div className={chipClass}>
          <span className="text-gray-500 text-sm">X</span>
          <input
            type="number"
            disabled={!hasField}
            value={f.x}
            onChange={(e) => update(index, { x: parseInt(e.target.value, 10) || 0 })}
            className={inputMd}
          />
        </div>
        <div className={chipClass}>
          <span className="text-gray-500 text-sm">Y</span>
          <input
            type="number"
            disabled={!hasField}
            value={f.y}
            onChange={(e) => update(index, { y: parseInt(e.target.value, 10) || 0 })}
            className={inputMd}
          />
        </div>

        <FieldSizeControls
          field={f}
          index={index ?? 0}
          templateSize={templateSize}
          onUpdate={update}
          variant="inline"
          disabled={!hasField}
        />

        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" disabled={!hasField} onClick={() => onDuplicate(index)} className={btnMd} title="Duplicate">
            <FiCopy className="w-4 h-4" />
          </button>
          <button type="button" disabled={!hasField} onClick={() => onRemove(index)} className={`${btnMd} text-red-600 border-red-200 hover:bg-red-50 disabled:text-red-300`} title="Delete">
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Typography — always visible, disabled when not a text field */}
      <div className={`flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 ${!isText ? 'opacity-50' : ''}`}>
        <button type="button" disabled={!isText} onClick={() => update(index, { fontSize: Math.max(1, (f.fontSize || 12) - 1) })} className={btnMd} title="Smaller">A−</button>
        <input
          type="number"
          disabled={!isText}
          value={f.fontSize}
          min={1}
          max={500}
          onChange={(e) => update(index, { fontSize: parseInt(e.target.value, 10) || 12 })}
          className={`${inputMd} w-16`}
        />
        <button type="button" disabled={!isText} onClick={() => update(index, { fontSize: (f.fontSize || 12) + 1 })} className={btnMd} title="Larger">A+</button>

        <select
          disabled={!isText}
          value={f.fontSizeUnit || 'px'}
          onChange={(e) => update(index, { fontSizeUnit: e.target.value })}
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm h-9 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="px">px</option>
          <option value="%">%</option>
          <option value="em">em</option>
          <option value="auto">auto</option>
        </select>

        <select
          disabled={!isText}
          value={f.fontFamily || 'Arial'}
          onChange={(e) => update(index, { fontFamily: e.target.value })}
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm h-9 bg-white min-w-[120px] disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {FONT_FAMILIES.map((font) => <option key={font} value={font}>{font}</option>)}
        </select>

        <button
          type="button"
          disabled={!isText}
          onClick={() => update(index, { fontWeight: f.fontWeight === 'bold' ? 'normal' : 'bold' })}
          className={`${btnMd} ${f.fontWeight === 'bold' && isText ? 'bg-blue-100 border-blue-400 text-blue-700' : ''}`}
          title="Bold"
        >
          <FiBold className="w-4 h-4" />
        </button>

        <input type="color" disabled={!isText} value={f.color || '#000000'} onChange={(e) => update(index, { color: e.target.value })} className="w-9 h-9 border border-gray-300 rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" title="Text color" />
        <input type="color" disabled={!isText} value={f.backgroundColor === 'transparent' ? '#ffffff' : f.backgroundColor} onChange={(e) => update(index, { backgroundColor: e.target.value })} className="w-9 h-9 border border-gray-300 rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" title="Background" />

        <div className="flex border border-gray-300 rounded-md overflow-hidden">
          {[
            { value: 'left', icon: FiAlignLeft },
            { value: 'center', icon: FiAlignCenter },
            { value: 'right', icon: FiAlignRight }
          ].map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              disabled={!isText}
              onClick={() => update(index, { alignment: value })}
              className={`p-2 h-9 disabled:cursor-not-allowed disabled:opacity-50 ${f.alignment === value && isText ? 'bg-blue-100 text-blue-700' : 'bg-white hover:bg-gray-50'}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <select
          disabled={!isText}
          value={f.textTransform || 'none'}
          onChange={(e) => update(index, { textTransform: e.target.value })}
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm h-9 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="none">Aa</option>
          <option value="uppercase">AA</option>
          <option value="lowercase">aa</option>
          <option value="capitalize">Ab</option>
        </select>
      </div>

      {/* Row 3: Rotation, layer, image fit — always visible */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
        <button type="button" disabled={!hasField} onClick={() => onRotate(index, -15)} className={btnMd} title="Rotate left"><FiRotateCcw className="w-4 h-4" /></button>
        <input
          type="number"
          disabled={!hasField}
          value={f.rotation || 0}
          onChange={(e) => update(index, { rotation: parseInt(e.target.value, 10) || 0 })}
          className={`${inputMd} w-16`}
          title="Rotation"
        />
        <button type="button" disabled={!hasField} onClick={() => onRotate(index, 15)} className={btnMd} title="Rotate right"><FiRotateCw className="w-4 h-4" /></button>

        <button type="button" disabled={!hasField} onClick={() => onLayerChange(index, -1)} className={btnMd} title="Layer down"><FiArrowDown className="w-4 h-4" /></button>
        <span className="text-sm text-gray-600 px-1">Layer {f.zIndex || 0}</span>
        <button type="button" disabled={!hasField} onClick={() => onLayerChange(index, 1)} className={btnMd} title="Layer up"><FiArrowUp className="w-4 h-4" /></button>

        <select
          disabled={!isImage}
          value={f.objectFit || 'cover'}
          onChange={(e) => update(index, { objectFit: e.target.value })}
          className={`border border-gray-300 rounded-md px-2 py-1.5 text-sm h-9 bg-white ml-2 disabled:bg-gray-100 disabled:cursor-not-allowed ${!isImage ? 'opacity-50' : ''}`}
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </div>
    </div>
  );
};

export default InlineFieldEditor;
