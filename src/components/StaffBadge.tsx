import type { StaffRole } from '../services/moderation';
export const StaffBadge = ({ role }: { role: StaffRole }) => role !== 'admin' && role !== 'moderator' ? null :
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 6, padding: '2px 6px', border: '1px solid #bd9d51', borderRadius: 4, color: '#f0d17c', fontSize: 11, fontWeight: 700 }} aria-label={role === 'admin' ? 'Администратор' : 'Модератор'}>
    <svg aria-hidden="true" width="14" height="16" viewBox="0 0 16 18"><path fill={role === 'admin' ? '#d9ae43' : '#91b7bd'} stroke="#32291b" d="M8 1 15 4v5c0 4-3 6-7 8C4 15 1 13 1 9V4z"/><path fill="#25231e" d={role === 'admin' ? 'M8 4l1.1 2.4 2.6.3-1.9 1.8.5 2.6L8 9.9l-2.3 1.2.5-2.6L4.3 6.7l2.6-.3z' : 'M4 8l2.4 2.4L12 5l1 1-6.6 6.5L3 9z'}/></svg>
    {role === 'admin' ? 'АДМИН' : 'МОДЕРАТОР'}
  </span>;
