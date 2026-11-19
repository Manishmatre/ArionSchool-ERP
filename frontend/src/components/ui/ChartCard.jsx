import React from 'react';
import { Card, CardHeader } from './Card';

/**
 * Wrapper for a chart with a consistent header and body height.
 */
const ChartCard = ({ title, subtitle, icon, action, height = 300, className = '', children, bodyClassName = '' }) => (
  <Card className={className}>
    <CardHeader title={title} subtitle={subtitle} icon={icon} action={action} />
    <div className={bodyClassName} style={{ width: '100%', height }}>
      {children}
    </div>
  </Card>
);

export default ChartCard;
