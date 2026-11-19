import { createContext } from 'react';

/**
 * Provides the live DOM element for SectionNavTabs' #header-extra-actions-portal
 * scoped strictly to the current <Layout> instance so route transitions never
 * portal PageHeader actions into an unmounting previous page's detached DOM node.
 */
const HeaderPortalContext = createContext(null);

export default HeaderPortalContext;

