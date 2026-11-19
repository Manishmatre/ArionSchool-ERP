import { useCallback, useEffect, useRef, useState } from 'react';
import { FiEye, FiZoomIn, FiZoomOut, FiMaximize2 } from 'react-icons/fi';
import { getFieldLabel, getFieldPreviewContent, getFieldDisplayLabel, toDisplayCoords } from './templateFieldUtils';

const RESIZE_HANDLES = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'];

const ZOOM_STEP = 10;
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;

const MarksTablePreview = () => (
  <div className="w-full h-full flex flex-col text-[8px] overflow-hidden">
    <div className="flex border-b border-gray-400 bg-gray-200 font-bold">
      <div className="w-6 p-0.5 border-r border-gray-400 text-center">SR.</div>
      <div className="flex-1 p-0.5 border-r border-gray-400">Subject</div>
      <div className="w-8 p-0.5 border-r border-gray-400 text-center">Max</div>
      <div className="w-8 p-0.5 border-r border-gray-400 text-center">Min</div>
      <div className="w-14 p-0.5 text-center">Obtained</div>
    </div>
    <div className="flex border-b border-gray-300">
      <div className="w-6 p-0.5 border-r border-gray-300 text-center">1</div>
      <div className="flex-1 p-0.5 border-r border-gray-300">Subject 1</div>
      <div className="w-8 p-0.5 border-r border-gray-300 text-center">100</div>
      <div className="w-8 p-0.5 border-r border-gray-300 text-center">40</div>
      <div className="w-14 p-0.5 text-center">85</div>
    </div>
    <div className="flex bg-gray-100 font-bold">
      <div className="w-6 p-0.5 border-r border-gray-300 text-center"></div>
      <div className="flex-1 p-0.5 border-r border-gray-300">TOTAL</div>
      <div className="w-8 p-0.5 border-r border-gray-300 text-center">100</div>
      <div className="w-8 p-0.5 border-r border-gray-300 text-center">40</div>
      <div className="w-14 p-0.5 text-center">85</div>
    </div>
  </div>
);

/** Scale template to fill panel width, height follows image aspect ratio */
const fitToWidth = (panelW, naturalW, naturalH) => {
  const width = panelW;
  const height = panelW * (naturalH / naturalW);
  return {
    width: Math.floor(width),
    height: Math.floor(height),
    scaleX: width / naturalW,
    scaleY: height / naturalH
  };
};

/** Scale template to fit inside panel (width + height) */
const fitToPanel = (panelW, panelH, naturalW, naturalH) => {
  const panelAspect = panelW / panelH;
  const imageAspect = naturalW / naturalH;

  let width;
  let height;
  if (imageAspect > panelAspect) {
    width = panelW;
    height = panelW / imageAspect;
  } else {
    height = panelH;
    width = panelH * imageAspect;
  }

  return {
    width: Math.floor(width),
    height: Math.floor(height),
    scaleX: width / naturalW,
    scaleY: height / naturalH
  };
};

/** Render at exact template pixel dimensions × zoom factor */
const scaleFromNatural = (naturalW, naturalH, zoomPercent) => {
  const factor = zoomPercent / 100;
  const width = Math.floor(naturalW * factor);
  const height = Math.floor(naturalH * factor);
  return { width, height, scaleX: factor, scaleY: factor };
};

const TemplateCanvas = ({
  fields,
  catalog,
  previewMap,
  previewMode,
  selectedField,
  canvasRef,
  onCanvasClick,
  onFieldClick,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  imageUrl,
  previewAssets = {},
  onTemplateSizeChange
}) => {
  const viewportRef = useRef(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [layout, setLayout] = useState({ width: 0, height: 0, scaleX: 1, scaleY: 1 });
  const [scrollNeeded, setScrollNeeded] = useState(false);
  /** 'fit-width' | 'fit-panel' | number (zoom % of natural px) */
  const [zoomMode, setZoomMode] = useState('fit-width');

  const measureLayout = useCallback(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    const img = canvas?.querySelector('img');
    if (!viewport || !img?.naturalWidth) return;

    const panelW = viewport.clientWidth - 16;
    const panelH = viewport.clientHeight - 16;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    let fitted;
    if (zoomMode === 'fit-width') {
      fitted = fitToWidth(panelW, nw, nh);
    } else if (zoomMode === 'fit-panel') {
      fitted = fitToPanel(panelW, panelH, nw, nh);
    } else {
      fitted = scaleFromNatural(nw, nh, zoomMode);
    }

    if (fitted.width <= 0) return;

    setNaturalSize({ width: nw, height: nh });
    setLayout(fitted);
    setScrollNeeded(fitted.width > panelW || fitted.height > panelH);

    onTemplateSizeChange?.({ width: nw, height: nh });
  }, [canvasRef, onTemplateSizeChange, zoomMode]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return undefined;

    const img = canvas.querySelector('img');
    if (!img) return undefined;

    const onLoad = () => measureLayout();
    img.addEventListener('load', onLoad);
    if (img.complete && img.naturalWidth) measureLayout();

    const observer = new ResizeObserver(measureLayout);
    observer.observe(viewport);

    window.addEventListener('resize', measureLayout);

    return () => {
      img.removeEventListener('load', onLoad);
      observer.disconnect();
      window.removeEventListener('resize', measureLayout);
    };
  }, [canvasRef, imageUrl, measureLayout]);

  const zoomIn = () => {
    setZoomMode((prev) => {
      const base = typeof prev === 'number' ? prev : 100;
      return Math.min(MAX_ZOOM, base + ZOOM_STEP);
    });
  };

  const zoomOut = () => {
    setZoomMode((prev) => {
      const base = typeof prev === 'number' ? prev : 100;
      return Math.max(MIN_ZOOM, base - ZOOM_STEP);
    });
  };

  const zoomLabel =
    zoomMode === 'fit-width'
      ? 'Full width'
      : zoomMode === 'fit-panel'
        ? 'Fit panel'
        : `${zoomMode}%`;

  const sortedFields = [...fields]
    .map((field, index) => ({ field, index }))
    .sort((a, b) => (a.field.zIndex || 0) - (b.field.zIndex || 0));

  return (
    <div className="w-full h-full min-h-[55vh] flex flex-col border-2 border-gray-300 rounded-lg bg-gray-200 overflow-hidden">
      {!previewMode && (
        <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-gray-300 bg-white rounded-t-lg">
          <span className="text-xs text-gray-500 mr-2">
            {scrollNeeded ? 'Scroll to pan · ' : ''}
            Template {naturalSize.width}×{naturalSize.height}px
          </span>
          <button type="button" title="Full panel width" onClick={() => setZoomMode('fit-width')} className={`px-2 py-1 text-xs rounded border ${zoomMode === 'fit-width' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 hover:bg-gray-50'}`}>
            Full width
          </button>
          <button type="button" title="Fit inside panel" onClick={() => setZoomMode('fit-panel')} className={`px-2 py-1 text-xs rounded border ${zoomMode === 'fit-panel' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 hover:bg-gray-50'}`}>
            Fit panel
          </button>
          <button type="button" title="Actual template size (100%)" onClick={() => setZoomMode(100)} className={`px-2 py-1 text-xs rounded border ${zoomMode === 100 ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 hover:bg-gray-50'}`}>
            Actual size
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button type="button" title="Zoom out" onClick={zoomOut} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
            <FiZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 w-16 text-center">{zoomLabel}</span>
          <button type="button" title="Zoom in" onClick={zoomIn} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
            <FiZoomIn className="w-4 h-4" />
          </button>
          <button type="button" title="Full width" onClick={() => setZoomMode('fit-width')} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
            <FiMaximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        ref={viewportRef}
        className="flex-1 min-h-[50vh] w-full overflow-auto p-2"
      >
        <div className="min-w-full min-h-min flex justify-center items-start">
          <div
            ref={canvasRef}
            className="relative shrink-0 shadow-md bg-white"
            style={{
              width: layout.width || undefined,
              height: layout.height || undefined
            }}
            onClick={onCanvasClick}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <img
              src={imageUrl}
              alt="Template"
              className="block w-full h-full select-none"
              draggable={false}
              onLoad={measureLayout}
            />

            {layout.width > 0 && sortedFields.map(({ field, index }) => {
              const { scaleX, scaleY } = layout;
              const display = toDisplayCoords(field, scaleX, scaleY);
              const isSelected = selectedField === index;
              const rotation = field.rotation || 0;
              const fontScale = scaleX;

              const previewFontSize =
                field.fontSizeUnit === 'px'
                  ? `${(field.fontSize || 12) * fontScale}px`
                  : field.fontSizeUnit === 'em' || field.fontSizeUnit === '%'
                    ? `${field.fontSize}${field.fontSizeUnit}`
                    : `${(field.fontSize || 12) * fontScale}px`;

              return (
                <div
                  key={`${field.fieldName}-${index}`}
                  className={`absolute ${!previewMode && isSelected ? 'ring-2 ring-blue-500' : ''} ${!previewMode ? 'hover:ring-1 hover:ring-blue-300' : ''}`}
                  style={{
                    left: `${display.x}px`,
                    top: `${display.y}px`,
                    width: `${display.width}px`,
                    height: `${display.height}px`,
                    cursor: !previewMode ? 'move' : 'default',
                    zIndex: (field.zIndex || 0) + 10
                  }}
                  onMouseDown={(e) => !previewMode && onMouseDown(e, index)}
                  onClick={(e) => !previewMode && onFieldClick(e, index)}
                >
                  <div
                    className="w-full h-full flex items-center overflow-hidden"
                    style={{
                      transform: rotation ? `rotate(${rotation}deg)` : undefined,
                      transformOrigin: 'center center',
                      color: field.color,
                      backgroundColor: field.backgroundColor && field.backgroundColor !== 'transparent' ? field.backgroundColor : undefined,
                      fontSize: previewFontSize,
                      fontFamily: field.fontFamily,
                      fontWeight: field.fontWeight,
                      textAlign: field.alignment,
                      textTransform: field.textTransform,
                      letterSpacing: `${(field.letterSpacing || 0) * fontScale}px`,
                      lineHeight: field.lineHeight || 1.2,
                      padding: `${(field.padding || 0) * fontScale}px`,
                      borderRadius: `${(field.borderRadius || 0) * fontScale}px`,
                      justifyContent: field.alignment === 'center' ? 'center' : field.alignment === 'right' ? 'flex-end' : 'flex-start',
                      border: field.fieldType === 'image' || field.fieldType === 'qrCode' ? '1px dashed #94a3b8' : 'none'
                    }}
                  >
                    {field.fieldType === 'image' && previewMode && previewAssets[field.fieldName] ? (
                      <img
                        src={previewAssets[field.fieldName]}
                        alt={getFieldDisplayLabel(field, catalog)}
                        className="w-full h-full"
                        style={{ objectFit: field.objectFit || 'contain' }}
                      />
                    ) : field.fieldType === 'image' || field.fieldType === 'qrCode' ? (
                      <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full">
                        <FiEye size={Math.max(14, 18 * fontScale)} />
                      <span className="mt-1 text-center px-1 truncate w-full" style={{ fontSize: `${Math.max(10, 12 * fontScale)}px` }}>
                        {getFieldDisplayLabel(field, catalog)}
                      </span>
                      </div>
                    ) : field.fieldType === 'table' ? (
                      <MarksTablePreview />
                    ) : (
                      <span className="truncate w-full">{getFieldPreviewContent(field, previewMap)}</span>
                    )}
                  </div>

                  {!previewMode && isSelected && (
                    <>
                      {RESIZE_HANDLES.map((handle) => (
                        <div
                          key={handle}
                          className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-sm z-20 shadow-sm"
                          style={{
                            cursor: `${handle}-resize`,
                            top: handle.includes('top') ? -8 : handle.includes('bottom') ? 'calc(100% - 8px)' : 'calc(50% - 8px)',
                            left: handle.includes('left') ? -8 : handle.includes('right') ? 'calc(100% - 8px)' : 'calc(50% - 8px)'
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            onMouseDown(e, index, handle);
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {naturalSize.width > 0 && layout.width > 0 && (
        <div className="shrink-0 px-3 py-1.5 text-xs text-gray-500 bg-white border-t border-gray-200 text-center">
          Display {layout.width}×{layout.height}px · {zoomLabel}
          {scrollNeeded ? ' · Scroll to see full certificate' : ''}
        </div>
      )}
    </div>
  );
};

export default TemplateCanvas;
