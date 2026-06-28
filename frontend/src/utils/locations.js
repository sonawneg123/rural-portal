// src/utils/locations.js
export const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Chandigarh','Puducherry',
];

export const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#F59E0B', bg: '#FEF3C7' },
  in_review:   { label: 'In Review',   color: '#3B82F6', bg: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#8B5CF6', bg: '#EDE9FE' },
  resolved:    { label: 'Resolved',    color: '#10B981', bg: '#D1FAE5' },
  rejected:    { label: 'Rejected',    color: '#EF4444', bg: '#FEE2E2' },
};

export const PRIORITY_CONFIG = {
  low:      { label: 'Low',      color: '#6B7280' },
  medium:   { label: 'Medium',   color: '#F59E0B' },
  high:     { label: 'High',     color: '#EF4444' },
  critical: { label: 'Critical', color: '#7C3AED' },
};

export const CAT_EMOJI = {
  'Water Supply':'💧','Roads & Transport':'🛣️','Electricity':'⚡',
  'Healthcare':'🏥','Education':'📚','Agriculture':'🌾',
  'Sanitation':'🗑️','Connectivity':'📶','Public Safety':'🛡️','Govt Schemes':'🏛️',
};

export const formatDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
  : '';

export const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
};
