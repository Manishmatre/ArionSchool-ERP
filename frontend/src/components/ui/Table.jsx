import React from 'react';
import EmptyState from './EmptyState';
import { FiInbox } from 'react-icons/fi';

export const TableWrapper = ({ children, className = '' }) => (
  <div className={`card overflow-hidden ${className}`}>
    <div className="overflow-x-auto">{children}</div>
  </div>
);

export const Table = ({ children, className = '' }) => (
  <table className={`data-table min-w-full ${className}`}>{children}</table>
);

export const TableHead = ({ children }) => (
  <thead className="bg-slate-50 border-b border-slate-200">{children}</thead>
);

export const TableBody = ({ children }) => (
  <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
);

export const TableRow = ({ children, className = '', onClick }) => (
  <tr
    className={`hover:bg-slate-50/80 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </tr>
);

export const TableHeader = ({ children, className = '' }) => (
  <th className={`px-4 py-3 text-left text-[0.7rem] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${className}`}>
    {children}
  </th>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap ${className}`}>{children}</td>
);

export const TableEmpty = ({ colSpan = 1, title = 'No records found', description }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-12">
      <EmptyState icon={FiInbox} title={title} description={description} />
    </td>
  </tr>
);
