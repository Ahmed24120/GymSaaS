'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  filterOptions?: { label: string; value: string }[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  onRowClick?: (item: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = 'بحث...',
  searchFilter,
  filterOptions,
  activeFilter,
  onFilterChange,
  onRowClick,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription = 'لم يتم العثور على أي عناصر مطابقة',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || !searchFilter) return data;
    return data.filter((item) => searchFilter(item, searchQuery.trim()));
  }, [data, searchQuery, searchFilter]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search and Filters Bar */}
      {(searchFilter || filterOptions) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {searchFilter && (
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-11 ps-10 pe-4 rounded-xl bg-surface-card border border-surface-border text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gym-500 transition-colors"
              />
              <Search className="w-4 h-4 text-gray-400 absolute start-3.5 top-3.5 pointer-events-none" />
            </div>
          )}

          {filterOptions && onFilterChange && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Filter className="w-4 h-4 text-gray-500 ms-1 shrink-0" />
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onFilterChange(opt.value)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    activeFilter === opt.value
                      ? 'bg-gym-500/20 border-gym-500 text-gym-400'
                      : 'bg-surface-card border-surface-border text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {filteredData.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-card border border-surface-border">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-dark flex items-center justify-center text-gray-500 mb-3 border border-surface-border">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">{emptyTitle}</h4>
          <p className="text-xs text-gray-400">{emptyDescription}</p>
        </div>
      ) : (
        <>
          {/* Mobile View: Cards */}
          <div className="md:hidden space-y-3">
            {filteredData.map((item) => (
              <div
                key={keyExtractor(item)}
                onClick={() => onRowClick && onRowClick(item)}
                className={`p-4 rounded-2xl bg-surface-card border border-surface-border space-y-2.5 transition-all ${
                  onRowClick ? 'active:scale-[0.99] cursor-pointer' : ''
                }`}
              >
                {columns
                  .filter((c) => !c.hideOnMobile)
                  .map((col) => (
                    <div key={col.key} className="flex items-center justify-between text-xs gap-3">
                      <span className="text-gray-400 shrink-0 font-medium">
                        {col.mobileLabel || col.header}
                      </span>
                      <span className="text-white text-end font-semibold overflow-hidden text-ellipsis">
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </span>
                    </div>
                  ))}
              </div>
            ))}
          </div>

          {/* Desktop View: Full Table */}
          <div className="hidden md:block rounded-2xl bg-surface-card border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface-dark border-b border-surface-border text-gray-400 text-xs font-semibold">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} className="py-3.5 px-5 whitespace-nowrap">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {filteredData.map((item) => (
                    <tr
                      key={keyExtractor(item)}
                      onClick={() => onRowClick && onRowClick(item)}
                      className={`hover:bg-surface-border/20 transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      }`}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className="py-3.5 px-5 whitespace-nowrap text-white">
                          {col.render ? col.render(item) : (item as any)[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export default DataTable;
