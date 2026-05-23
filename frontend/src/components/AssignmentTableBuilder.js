import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const COLUMN_TYPES = ['TEXT', 'NUMBER', 'DATE', 'CHECKBOX'];

export default function AssignmentTableBuilder({ columns, rows, onChange }) {
  const [addingCol, setAddingCol] = useState(false);
  const [newCol, setNewCol] = useState({ column_name: '', column_type: 'TEXT' });

  const addColumn = () => {
    if (!newCol.column_name.trim()) return;
    const colIndex = columns.length; // use array index as stable key
    const col = {
      column_id: colIndex,           // integer index — maps to colMap on backend
      column_name: newCol.column_name.trim(),
      column_type: newCol.column_type,
      column_order: colIndex,
      is_predefined: 0,
    };
    const updatedCols = [...columns, col];
    const updatedRows = rows.map(row => ({
      ...row,
      cells: { ...row.cells, [colIndex]: col.column_type === 'CHECKBOX' ? 'false' : '' }
    }));
    onChange({ columns: updatedCols, rows: updatedRows });
    setNewCol({ column_name: '', column_type: 'TEXT' });
    setAddingCol(false);
  };

  const removeColumn = (colIndex) => {
    const updatedCols = columns.filter((_, i) => i !== colIndex);
    // Re-index remaining columns
    const reindexed = updatedCols.map((col, i) => ({ ...col, column_id: i, column_order: i }));
    const updatedRows = rows.map(row => {
      const newCells = {};
      reindexed.forEach((col, i) => {
        // old index of this column in original array
        const oldIndex = columns.findIndex(c => c.column_id === col.column_id || (i >= colIndex ? i + 1 : i) === columns.indexOf(col));
        newCells[i] = row.cells[col.column_id] ?? '';
      });
      return { ...row, cells: newCells };
    });
    onChange({ columns: reindexed, rows: updatedRows });
  };

  const addRow = () => {
    const newRow = {
      row_id: `r_${Date.now()}`,
      row_order: rows.length,
      cells: columns.reduce((acc, col, i) => {
        acc[i] = col.column_type === 'CHECKBOX' ? 'false' : '';
        return acc;
      }, {}),
    };
    onChange({ columns, rows: [...rows, newRow] });
  };

  const removeRow = (rowId) => {
    onChange({ columns, rows: rows.filter(r => r.row_id !== rowId) });
  };

  const updateCell = (rowId, colIndex, value) => {
    onChange({
      columns,
      rows: rows.map(row =>
        row.row_id === rowId ? { ...row, cells: { ...row.cells, [colIndex]: value } } : row
      )
    });
  };

  const renderCell = (row, col, colIndex) => {
    const val = row.cells[colIndex] ?? '';
    switch (col.column_type) {
      case 'CHECKBOX':
        return (
          <input type="checkbox" className="w-4 h-4 accent-navy-700"
            checked={val === 'true' || val === true}
            onChange={e => updateCell(row.row_id, colIndex, String(e.target.checked))} />
        );
      case 'DATE':
        return (
          <input type="date"
            className="w-full border border-transparent focus:border-navy-300 rounded px-1 py-0.5 text-xs bg-transparent focus:bg-white"
            value={val} onChange={e => updateCell(row.row_id, colIndex, e.target.value)} />
        );
      case 'NUMBER':
        return (
          <input type="number"
            className="w-full border border-transparent focus:border-navy-300 rounded px-1 py-0.5 text-xs bg-transparent focus:bg-white"
            value={val} onChange={e => updateCell(row.row_id, colIndex, e.target.value)} />
        );
      default:
        return (
          <input type="text"
            className="w-full border border-transparent focus:border-navy-300 rounded px-1 py-0.5 text-xs bg-transparent focus:bg-white"
            value={val} onChange={e => updateCell(row.row_id, colIndex, e.target.value)} />
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-navy-800">Data Table</h4>
        <div className="flex gap-2">
          <button type="button" onClick={() => setAddingCol(!addingCol)}
            className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5">
            <Plus size={12} /> Add Column
          </button>
          <button type="button" onClick={addRow}
            className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5">
            <Plus size={12} /> Add Row
          </button>
        </div>
      </div>

      {addingCol && (
        <div className="flex gap-2 items-end bg-navy-50 p-3 rounded-lg border border-navy-200">
          <div className="flex-1">
            <label className="label">Column Name</label>
            <input className="input text-xs" placeholder="e.g. Employee Name"
              value={newCol.column_name}
              onChange={e => setNewCol({ ...newCol, column_name: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColumn(); } }}
              autoFocus />
          </div>
          <div className="w-36">
            <label className="label">Type</label>
            <select className="input text-xs" value={newCol.column_type}
              onChange={e => setNewCol({ ...newCol, column_type: e.target.value })}>
              {COLUMN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button type="button" onClick={addColumn} className="btn-primary text-xs px-3 py-2">Add</button>
          <button type="button" onClick={() => setAddingCol(false)} className="btn-secondary text-xs px-3 py-2">Cancel</button>
        </div>
      )}

      {columns.length === 0 ? (
        <div className="border-2 border-dashed border-navy-200 rounded-lg py-10 text-center text-gray-400 text-sm">
          No columns yet. Click "Add Column" to start building your data table.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-navy-200">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-navy-700">
                <th className="px-2 py-2 text-left text-white font-medium w-8">#</th>
                {columns.map((col, i) => (
                  <th key={i} className="px-3 py-2 text-left text-white font-medium min-w-28">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{col.column_name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-navy-300 text-xs opacity-75">{col.column_type}</span>
                        {!col.is_predefined && (
                          <button type="button" onClick={() => removeColumn(i)}
                            className="text-red-300 hover:text-red-100 ml-1"><Trash2 size={11} /></button>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-white font-medium w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={columns.length + 2} className="text-center py-6 text-gray-400">No rows. Click "Add Row" to add data.</td></tr>
              )}
              {rows.map((row, ri) => (
                <tr key={row.row_id} className={ri % 2 === 0 ? 'bg-white' : 'bg-navy-50'}>
                  <td className="px-2 py-1.5 text-gray-400 text-center">{ri + 1}</td>
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-2 py-1 border-l border-navy-100">
                      {renderCell(row, col, colIndex)}
                    </td>
                  ))}
                  <td className="px-2 py-1 border-l border-navy-100">
                    <button type="button" onClick={() => removeRow(row.row_id)}
                      className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400">{columns.length} column(s) · {rows.length} row(s)</p>
    </div>
  );
}
