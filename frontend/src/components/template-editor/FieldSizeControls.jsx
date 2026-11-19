import { FiMinus, FiPlus, FiMaximize2 } from 'react-icons/fi';
import {
  adjustFieldSize,
  scaleFieldSize,
  getDefaultSizesForType,
  getSizeStepForTemplate,
  SCALE_STEP_PERCENT,
  MIN_FIELD_SIZE
} from './templateFieldUtils';

const btnMd = 'p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 h-9 min-w-[36px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white';
const inputMd = 'border border-gray-300 rounded-md px-2 py-1.5 text-sm w-20 h-9 text-center disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed';

/**
 * Width / height inputs with +/- steppers and proportional scale controls.
 * variant: 'inline' (toolbar) | 'panel' (sidebar)
 */
const FieldSizeControls = ({ field, index, templateSize, onUpdate, variant = 'inline', disabled = false }) => {
  const sizeStep = getSizeStepForTemplate(templateSize);

  const chipClass =
    variant === 'inline'
      ? 'inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-md bg-white text-sm'
      : '';

  const labelClass = variant === 'panel' ? 'block text-xs font-medium text-gray-600 mb-1' : 'text-gray-500 text-sm';

  const widthBlock = (
    <div className={variant === 'inline' ? chipClass : ''}>
      {variant === 'panel' && <span className={labelClass}>Width</span>}
      {variant === 'inline' && <span className={labelClass}>W</span>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          title={`Decrease width (${sizeStep}px)`}
          className={btnMd}
          onClick={() => onUpdate(index, adjustFieldSize(field, 'width', -sizeStep))}
        >
          <FiMinus className="w-4 h-4" />
        </button>
        <input
          type="number"
          disabled={disabled}
          min={MIN_FIELD_SIZE}
          value={field.width}
          onChange={(e) => onUpdate(index, { width: Math.max(MIN_FIELD_SIZE, parseInt(e.target.value, 10) || MIN_FIELD_SIZE) })}
          className={inputMd}
        />
        <button
          type="button"
          disabled={disabled}
          title={`Increase width (${sizeStep}px)`}
          className={btnMd}
          onClick={() => onUpdate(index, adjustFieldSize(field, 'width', sizeStep))}
        >
          <FiPlus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const heightBlock = (
    <div className={variant === 'inline' ? chipClass : ''}>
      {variant === 'panel' && <span className={labelClass}>Height</span>}
      {variant === 'inline' && <span className={labelClass}>H</span>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          title={`Decrease height (${sizeStep}px)`}
          className={btnMd}
          onClick={() => onUpdate(index, adjustFieldSize(field, 'height', -sizeStep))}
        >
          <FiMinus className="w-4 h-4" />
        </button>
        <input
          type="number"
          disabled={disabled}
          min={MIN_FIELD_SIZE}
          value={field.height}
          onChange={(e) => onUpdate(index, { height: Math.max(MIN_FIELD_SIZE, parseInt(e.target.value, 10) || MIN_FIELD_SIZE) })}
          className={inputMd}
        />
        <button
          type="button"
          disabled={disabled}
          title={`Increase height (${sizeStep}px)`}
          className={btnMd}
          onClick={() => onUpdate(index, adjustFieldSize(field, 'height', sizeStep))}
        >
          <FiPlus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const scaleBlock = (
    <div className={variant === 'inline' ? chipClass : 'col-span-2'}>
      <span className={labelClass}>
        {variant === 'inline' ? 'Scale' : 'Scale W & H together'}
      </span>
      <div className={`flex items-center gap-1 ${variant === 'panel' ? 'mt-1' : ''}`}>
        <button
          type="button"
          disabled={disabled}
          title={`Shrink ${SCALE_STEP_PERCENT}%`}
          className={btnMd}
          onClick={() => onUpdate(index, scaleFieldSize(field, -SCALE_STEP_PERCENT))}
        >
          <FiMinus className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-600 px-2 min-w-[72px] text-center">
          {field.width}×{field.height}
        </span>
        <button
          type="button"
          disabled={disabled}
          title={`Grow ${SCALE_STEP_PERCENT}%`}
          className={btnMd}
          onClick={() => onUpdate(index, scaleFieldSize(field, SCALE_STEP_PERCENT))}
        >
          <FiPlus className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          title="Reset to template default size"
          className={`${btnMd} px-2 text-sm gap-1`}
          onClick={() => onUpdate(index, getDefaultSizesForType(field.fieldType, templateSize))}
        >
          <FiMaximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (variant === 'panel') {
    return (
      <div className="space-y-3">
        {scaleBlock}
        <div className="grid grid-cols-2 gap-3">
          <div>{widthBlock}</div>
          <div>{heightBlock}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {scaleBlock}
      {widthBlock}
      {heightBlock}
    </>
  );
};

export default FieldSizeControls;
