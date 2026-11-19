import Badge from './Badge';

const STATUS_VARIANT = {
  active: 'success',
  completed: 'success',
  approved: 'success',
  pass: 'success',
  graduated: 'primary',
  scheduled: 'primary',
  pending: 'warning',
  suspended: 'warning',
  warning: 'warning',
  inactive: 'neutral',
  dropped: 'danger',
  failed: 'danger',
  fail: 'danger',
  rejected: 'danger',
  error: 'danger',
  ongoing: 'success',
  present: 'success',
  absent: 'danger',
  'half-day': 'warning',
  half_day: 'warning',
  leave: 'info',
  late: 'warning',
  not_marked: 'neutral',
};

const StatusBadge = ({ status, label }) => {
  const key = (status || '').toLowerCase();
  const variant = STATUS_VARIANT[key] || 'neutral';
  const text = label || status || '—';
  return (
    <Badge variant={variant} className="capitalize">
      {text}
    </Badge>
  );
};

export default StatusBadge;
