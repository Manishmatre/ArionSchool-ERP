import { useCallback, useEffect, useRef, useState } from 'react';
import { FiSave, FiEye, FiPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { toAbsoluteUrl } from '../../utils/url';
import { useTemplateCanvas } from './useTemplateCanvas';
import TemplateCanvas from './TemplateCanvas';
import FieldInspector from './FieldInspector';
import InlineFieldEditor from './InlineFieldEditor';
import { createDefaultField, duplicateFieldName } from './templateFieldUtils';

const TemplateEditorPage = ({
  title,
  description,
  templateData,
  setTemplateData,
  fieldCatalog,
  previewMap,
  previewAssets = {},
  metaSection,
  onSave,
  loading,
  pageFormat,
  saveLabel = 'Save Template'
}) => {
  const [templateSize, setTemplateSize] = useState(null);
  const normalizedBackgroundRef = useRef('');

  useEffect(() => {
    if (pageFormat !== 'a4-portrait' || !templateData.templateImage || normalizedBackgroundRef.current === templateData.templateImage) return undefined;
    const source = toAbsoluteUrl(templateData.templateImage);
    normalizedBackgroundRef.current = templateData.templateImage;
    const image = new Image();
    let cancelled = false;
    image.onload = () => {
      const targetWidth = 1240;
      const targetHeight = 1754;
      if (Math.abs(image.width / image.height - targetWidth / targetHeight) < 0.002) return;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, targetWidth, targetHeight);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      const scale = Math.min(targetWidth / image.width, targetHeight / image.height);
      const drawnWidth = image.width * scale;
      const drawnHeight = image.height * scale;
      const offsetX = (targetWidth - drawnWidth) / 2;
      const offsetY = (targetHeight - drawnHeight) / 2;
      context.drawImage(image, offsetX, offsetY, drawnWidth, drawnHeight);
      if (cancelled) return;
      setTemplateData((prev) => ({
        ...prev,
        templateImage: canvas.toDataURL('image/jpeg', 0.94),
        fields: prev.fields.map((field) => ({
          ...field,
          x: field.x * scale + offsetX,
          y: field.y * scale + offsetY,
          width: field.width * scale,
          height: field.height * scale
        }))
      }));
    };
    image.onerror = () => toast.error('Could not load the template background for A4 layout');
    image.src = source;
    return () => { cancelled = true; };
  }, [pageFormat, templateData.templateImage, setTemplateData]);

  const updateField = useCallback((index, patch) => {
    setTemplateData((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) => (i === index ? { ...field, ...patch } : field))
    }));
  }, [setTemplateData]);

  const {
    canvasRef,
    previewMode,
    setPreviewMode,
    selectedField,
    setSelectedField,
    handleCanvasClick,
    handleFieldClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    rotateField,
    nudgeField,
    getImageMetrics
  } = useTemplateCanvas(templateData.fields, updateField);

  const handleTemplateSizeChange = useCallback((size) => {
    setTemplateSize((prev) => {
      if (prev?.width === size.width && prev?.height === size.height) return prev;
      return size;
    });
  }, []);

  const removeField = useCallback((index) => {
    setTemplateData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
    setSelectedField(null);
  }, [setTemplateData, setSelectedField]);

  // Keyboard shortcuts when a field is selected
  useEffect(() => {
    if (previewMode || selectedField === null) return undefined;

    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          nudgeField(selectedField, -step, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          nudgeField(selectedField, step, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          nudgeField(selectedField, 0, -step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          nudgeField(selectedField, 0, step);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          removeField(selectedField);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewMode, selectedField, nudgeField, removeField]);

  const addField = (fieldType) => {
    const catalogItem = fieldCatalog.find((f) => f.value === fieldType);
    if (!catalogItem) return;

    const metrics = getImageMetrics();
    const size = metrics
      ? { width: metrics.img.naturalWidth, height: metrics.img.naturalHeight }
      : templateSize;

    const count = templateData.fields.filter((f) =>
      catalogItem.type === 'customText'
        ? f.fieldType === 'customText'
        : f.fieldName.startsWith(catalogItem.value)
    ).length;
    const newField = createDefaultField(catalogItem, { offset: count }, size);
    if (catalogItem.type === 'customText') {
      newField.fieldName = count > 0 ? duplicateFieldName(templateData.fields, 'customText') : 'customText';
      newField.label = `Custom Field ${count + 1}`;
    } else if (count > 0) {
      newField.fieldName = duplicateFieldName(templateData.fields, catalogItem.value);
    }

    setTemplateData((prev) => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedField(templateData.fields.length);
  };

  const duplicateField = (index) => {
    const source = templateData.fields[index];
    if (!source) return;
    const baseName = source.fieldName.replace(/_\d+$/, '');
    const metrics = getImageMetrics();
    const nudge = metrics ? Math.round(metrics.img.naturalWidth * 0.01) : 20;
    const copy = {
      ...source,
      fieldName: duplicateFieldName(templateData.fields, baseName),
      x: source.x + nudge,
      y: source.y + nudge,
      zIndex: (source.zIndex || 0) + 1
    };
    if (source.fieldType === 'customText') {
      copy.defaultValue = source.defaultValue || '';
    }
    setTemplateData((prev) => ({
      ...prev,
      fields: [...prev.fields, copy]
    }));
  };

  const changeLayer = (index, delta) => {
    const field = templateData.fields[index];
    updateField(index, { zIndex: Math.max(0, (field.zIndex || 0) + delta) });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        if (pageFormat !== 'a4-portrait') {
          setTemplateData((prev) => ({ ...prev, templateImage: reader.result }));
          return;
        }

        // Normalize paper templates to A4 portrait at 150 DPI. Fit the full
        // artwork without cropping so editor coordinates match generated output.
        const canvas = document.createElement('canvas');
        canvas.width = 1240;
        canvas.height = 1754;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        setTemplateData((prev) => ({ ...prev, templateImage: canvas.toDataURL('image/jpeg', 0.94) }));
      };
      image.onerror = () => toast.error('Could not read this background image');
      image.src = reader.result;
    };
    reader.onerror = () => toast.error('Could not read this background image');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!templateData.name?.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!templateData.templateImage) {
      toast.error('Please upload a template background image');
      return;
    }
    await onSave(templateData);
  };

  const selectedFieldData = selectedField !== null ? templateData.fields[selectedField] : null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-72px)]">
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden gap-0 border-t min-h-0">
        {/* Left panel — settings + field tools */}
        <div className="w-full lg:w-80 xl:w-96 overflow-y-auto p-4 bg-gray-50 border-r space-y-4 shrink-0 max-h-[calc(100vh-72px)] lg:max-h-none">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4 space-y-3">
              <h3 className="font-medium text-gray-900">Template Details</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600">Name *</label>
                <input
                  type="text"
                  value={templateData.name || ''}
                  onChange={(e) => setTemplateData((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Description</label>
                <textarea
                  value={templateData.description || ''}
                  onChange={(e) => setTemplateData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Background Image *</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="mt-1 block w-full text-sm" />
                {templateData.templateImage && (
                  <img src={toAbsoluteUrl(templateData.templateImage)} alt="Preview" className="mt-2 h-24 object-contain rounded border" />
                )}
              </div>
              {metaSection}
            </div>

            {!previewMode && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FiPlus className="w-4 h-4" /> Add Fields
                </h3>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {fieldCatalog.map((field) => {
                    const Icon = field.icon;
                    return (
                      <button
                        key={field.value}
                        type="button"
                        onClick={() => addField(field.value)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs hover:bg-blue-100 ${
                          field.type === 'customText'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        <Icon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{field.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-900 mb-3">Field Properties</h3>
              <FieldInspector
                field={selectedFieldData}
                index={selectedField}
                catalog={fieldCatalog}
                templateSize={templateSize}
                onUpdate={updateField}
                onRemove={removeField}
                onDuplicate={duplicateField}
                onLayerChange={changeLayer}
                onRotate={rotateField}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              <FiSave />
              {loading ? 'Saving...' : saveLabel}
            </button>
          </form>
        </div>

        {/* Center — canvas (full height, scrollable) */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 bg-slate-100 min-w-0 min-h-[65vh] lg:min-h-[calc(100vh-72px)]">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div>
              <h3 className="font-medium text-gray-900">{title}</h3>
              {description && <p className="text-sm text-gray-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm ${
                previewMode ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              <FiEye />
              {previewMode ? 'Edit Mode' : 'Preview Mode'}
            </button>
          </div>

          {!previewMode && (
            <div className="mb-2 shrink-0 w-full overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <InlineFieldEditor
                field={selectedFieldData}
                index={selectedField}
                catalog={fieldCatalog}
                templateSize={templateSize}
                onUpdate={updateField}
                onRemove={removeField}
                onDuplicate={duplicateField}
                onLayerChange={changeLayer}
                onRotate={rotateField}
              />
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col">
          {templateData.templateImage ? (
            <TemplateCanvas
              fields={templateData.fields}
              catalog={fieldCatalog}
              previewMap={previewMap}
              previewMode={previewMode}
              selectedField={selectedField}
              canvasRef={canvasRef}
              onCanvasClick={handleCanvasClick}
              onFieldClick={handleFieldClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              imageUrl={toAbsoluteUrl(templateData.templateImage)}
              previewAssets={Object.fromEntries(Object.entries(previewAssets).map(([key, url]) => [key, toAbsoluteUrl(url)]))}
              onTemplateSizeChange={handleTemplateSizeChange}
            />
          ) : (
            <div className="flex items-center justify-center flex-1 min-h-[400px] bg-white rounded-lg border-2 border-dashed border-gray-300 text-gray-500">
              Upload a background image to start designing
            </div>
          )}
          </div>

          {templateData.fields.length > 0 && !previewMode && (
            <p className="text-xs text-gray-500 mt-2 shrink-0">
              {templateData.fields.length} field(s) · Click a field · Edit in toolbar above · Arrow keys to move · Delete to remove · Scroll canvas to reach all areas
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateEditorPage;
