import React, { useState, useLayoutEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import HeaderPortalContext from '../context/HeaderPortalContext';

// Recursively strips any redundant "Back" button so SectionNavTabs' canonical Back button is never duplicated
const sanitizeActions = (node) => {
  if (!node) return null;
  return React.Children.map(node, (child) => {
    if (!React.isValidElement(child)) return child;

    // Handle React Fragment
    if (child.type === React.Fragment) {
      return <React.Fragment key={child.key}>{sanitizeActions(child.props.children)}</React.Fragment>;
    }

    // Check if the button has "Back" label and back icon
    const iconName = child.props?.icon?.name || '';
    const hasBackIcon = iconName === 'FiArrowLeft' || iconName === 'FiChevronLeft' || Boolean(child.props?.icon);
    
    let textContent = '';
    const rawChildren = child.props?.children;
    if (typeof rawChildren === 'string') {
      textContent = rawChildren;
    } else if (Array.isArray(rawChildren)) {
      textContent = rawChildren.map(c => (typeof c === 'string' ? c : c?.props?.children || '')).join('');
    } else if (rawChildren?.props?.children) {
      textContent = typeof rawChildren.props.children === 'string' ? rawChildren.props.children : '';
    }

    const isBackText = /^\s*back\s*$/i.test(String(textContent).trim());

    if (isBackText && (hasBackIcon || !rawChildren || isBackText)) {
      return null;
    }

    return child;
  });
};

/**
 * PageHeader Component:
 * - Page titles and breadcrumbs are rendered cleanly in the top dark header (Navbar).
 * - Contextual action buttons are teleported into the top horizontal sub-tab bar (#header-extra-actions-portal).
 * - Duplicate heading and subtitles in the main body are removed.
 * - Duplicate Back buttons are automatically filtered out.
 */
export default function PageHeader({ actions }) {
  const contextPortalEl = useContext(HeaderPortalContext);
  const [fallbackEl, setFallbackEl] = useState(null);

  useLayoutEffect(() => {
    if (contextPortalEl) return;
    if (typeof document !== 'undefined') {
      const el = document.getElementById('header-extra-actions-portal');
      if (el && el.isConnected && el !== fallbackEl) {
        setFallbackEl(el);
      }
    }
  });

  const targetEl = contextPortalEl?.isConnected
    ? contextPortalEl
    : fallbackEl?.isConnected
    ? fallbackEl
    : null;

  if (!actions || !targetEl) return null;

  const cleanedActions = sanitizeActions(actions);
  if (!cleanedActions) return null;

  return createPortal(cleanedActions, targetEl);
}
