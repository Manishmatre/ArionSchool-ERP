import { useCallback, useRef, useState } from 'react';

export function useTemplateCanvas(fields, updateField) {
  const canvasRef = useRef(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const [previewMode, setPreviewMode] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draggedField, setDraggedField] = useState(null);
  const [resizeField, setResizeField] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const getImageMetrics = useCallback(() => {
    const canvas = canvasRef.current;
    const img = canvas?.querySelector('img');
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return {
      img,
      rect,
      scaleX: img.naturalWidth / rect.width,
      scaleY: img.naturalHeight / rect.height,
      invScaleX: rect.width / img.naturalWidth,
      invScaleY: rect.height / img.naturalHeight
    };
  }, []);

  const handleCanvasClick = useCallback((e) => {
    if (isDragging || isResizing) return;
    if (e.target === e.currentTarget || e.target.tagName === 'IMG') {
      setSelectedField(null);
    }
  }, [isDragging, isResizing]);

  const handleFieldClick = useCallback((e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedField(index);
  }, []);

  const handleMouseDown = useCallback((e, fieldIndex, handle = null) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedField(fieldIndex);

    const metrics = getImageMetrics();
    if (!metrics) return;

    const field = fieldsRef.current[fieldIndex];
    if (!field) return;

    if (handle) {
      setIsResizing(true);
      setResizeField(fieldIndex);
      setResizeHandle(handle);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: field.width,
        height: field.height,
        fieldX: field.x,
        fieldY: field.y
      });
    } else {
      setIsDragging(true);
      setDraggedField(fieldIndex);
      setDragOffset({
        x: (e.clientX - metrics.rect.left) * metrics.scaleX - field.x,
        y: (e.clientY - metrics.rect.top) * metrics.scaleY - field.y
      });
    }
  }, [getImageMetrics]);

  const handleMouseMove = useCallback((e) => {
    const metrics = getImageMetrics();
    if (!metrics) return;

    if (isDragging && draggedField !== null) {
      const field = fieldsRef.current[draggedField];
      const newX = (e.clientX - metrics.rect.left) * metrics.scaleX - dragOffset.x;
      const newY = (e.clientY - metrics.rect.top) * metrics.scaleY - dragOffset.y;
      updateField(draggedField, {
        x: Math.round(Math.max(0, Math.min(newX, metrics.img.naturalWidth - field.width))),
        y: Math.round(Math.max(0, Math.min(newY, metrics.img.naturalHeight - field.height)))
      });
    } else if (isResizing && resizeField !== null) {
      const deltaX = (e.clientX - resizeStart.x) * metrics.scaleX;
      const deltaY = (e.clientY - resizeStart.y) * metrics.scaleY;
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.fieldX;
      let newY = resizeStart.fieldY;

      if (resizeHandle.includes('right')) newWidth = resizeStart.width + deltaX;
      if (resizeHandle.includes('left')) {
        newWidth = resizeStart.width - deltaX;
        newX = resizeStart.fieldX + deltaX;
      }
      if (resizeHandle.includes('bottom')) newHeight = resizeStart.height + deltaY;
      if (resizeHandle.includes('top')) {
        newHeight = resizeStart.height - deltaY;
        newY = resizeStart.fieldY + deltaY;
      }

      const patch = {
        width: Math.round(Math.max(20, newWidth)),
        height: Math.round(Math.max(20, newHeight))
      };
      if (resizeHandle.includes('left')) patch.x = Math.round(Math.max(0, newX));
      if (resizeHandle.includes('top')) patch.y = Math.round(Math.max(0, newY));
      updateField(resizeField, patch);
    }
  }, [dragOffset, draggedField, getImageMetrics, isDragging, isResizing, resizeField, resizeHandle, resizeStart, updateField]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setDraggedField(null);
    setResizeField(null);
    setResizeHandle(null);
  }, []);

  const nudgeField = useCallback((index, dx, dy) => {
    const field = fieldsRef.current[index];
    if (!field) return;
    updateField(index, { x: Math.max(0, field.x + dx), y: Math.max(0, field.y + dy) });
  }, [updateField]);

  const rotateField = useCallback((index, delta) => {
    const field = fieldsRef.current[index];
    if (!field) return;
    updateField(index, { rotation: ((field.rotation || 0) + delta + 360) % 360 });
  }, [updateField]);

  return {
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
    nudgeField,
    rotateField,
    getImageMetrics
  };
}
