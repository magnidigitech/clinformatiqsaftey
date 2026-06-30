import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { searchIcd, getEntityLineage } from '../utils/icdApi';

export default function IcdBrowserModal({ isOpen, onClose, onSelect, initialSearchTerm = '' }) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(initialSearchTerm);
      setResults([]);
      setSelectedEntity(null);
      if (initialSearchTerm) {
        handleSearch(initialSearchTerm);
      }
    }
  }, [isOpen, initialSearchTerm]);

  useEffect(() => {
    if (selectedEntity && selectedEntity.id && !selectedEntity.lineageFetched) {
      setSelectedEntity(prev => ({ ...prev, lineageFetched: true }));
      getEntityLineage(selectedEntity.id).then(lineage => {
        setSelectedEntity(prev => {
          if (prev && prev.id === selectedEntity.id) {
            return { ...prev, ...lineage };
          }
          return prev;
        });
      });
    }
  }, [selectedEntity]);

  const handleSearch = async (term) => {
    if (!term || term.length < 2) return;
    setIsSearching(true);
    try {
      const res = await searchIcd(term);
      setResults(res);
    } catch (err) {
      console.error('ICD Search error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[100]">
      <div className="bg-white border border-slate-200 rounded-sm w-[950px] shadow-xl font-sans text-[11px]">
        {/* Modal Header */}
        <div className="bg-brand-primary text-white px-2 py-1 flex justify-between items-center cursor-default">
          <div className="flex items-center gap-1">
            <span className="font-bold tracking-wide">ICD-11 Browser</span>
          </div>
          <button onClick={onClose} className="bg-white text-black w-[14px] h-[14px] flex items-center justify-center border border-slate-200 rounded-sm font-bold text-[9px] leading-none active:bg-slate-100">x</button>
        </div>
        
        {/* Modal Content */}
        <div className="bg-white p-2 border-b border-gray-400 flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-2">
            <label className="font-bold">Search</label>
            <input 
              className="border border-slate-200 h-[22px] w-[300px] px-1 font-normal" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch(searchTerm);
              }}
            />
            <button 
              onClick={() => handleSearch(searchTerm)} 
              className="h-[22px] px-4 border border-slate-200 rounded-sm bg-white active:bg-slate-100"
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Grid Area */}
          <div className="border border-slate-200 h-[280px] flex text-[11px] text-black bg-white">
            {[
              { key: 'chapter', label: 'Chapter', w: 'w-[15%]' },
              { key: 'block', label: 'SOC', w: 'w-[15%]' },
              { key: 'category', label: 'HLGT', w: 'w-[15%]' },
              { key: 'entity', label: 'PT', w: 'w-[30%]' },
              { key: 'synonyms', label: 'LLT', w: 'w-[25%]' }
            ].map((col, idx) => (
              <div key={col.key} className={cn("flex flex-col border-slate-200", idx !== 4 && "border-r", col.w)}>
                <div className="font-bold p-1 border-b border-slate-200 h-[22px] flex items-center bg-white">{col.label}</div>
                <div className="flex-1 bg-white overflow-y-auto select-none pt-1">
                  {col.key === 'entity' && results.length === 0 && !isSearching && (
                    <div className="p-2 text-center text-gray-400">No results.</div>
                  )}
                  {col.key === 'entity' && results.map(entity => {
                    const isSelected = selectedEntity?.id === entity.id;
                    return (
                      <div 
                        key={entity.id} 
                        className={cn("px-1 cursor-pointer font-normal", isSelected ? "bg-emerald-50 text-emerald-900 font-bold" : "text-brand-primary hover:bg-gray-100")}
                        onClick={() => setSelectedEntity(entity)}
                        onDoubleClick={() => {
                          setSelectedEntity(entity);
                          if (onSelect) {
                            setTimeout(() => onSelect(entity), 0);
                          }
                        }}
                      >
                        <span dangerouslySetInnerHTML={{ __html: entity.title }}></span>
                        {entity.theCode && <span className="ml-1 text-gray-500">[{entity.theCode}]</span>}
                      </div>
                    );
                  })}
                  {col.key === 'chapter' && selectedEntity && (
                    <div className="px-1 font-bold bg-emerald-50 text-emerald-900">{selectedEntity.chapter || ''}</div>
                  )}
                  {col.key === 'block' && selectedEntity && (
                    <div className="px-1 font-bold bg-emerald-50 text-emerald-900">{selectedEntity.block || ''}</div>
                  )}
                  {col.key === 'category' && selectedEntity && (
                    <div className="px-1 font-bold bg-emerald-50 text-emerald-900">{selectedEntity.category || ''}</div>
                  )}
                  {col.key === 'synonyms' && selectedEntity && selectedEntity.matchingPVs && (
                    <div className="px-1">
                      {selectedEntity.matchingPVs.map((pv, i) => (
                        <div key={i} className="text-gray-600 border-b border-gray-100 pb-[1px] mb-[1px]" dangerouslySetInnerHTML={{ __html: pv.label }}></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom summary box */}
          <div className="border border-slate-200 h-[100px] bg-white mt-2 mb-1 text-[11px] text-black p-1 flex flex-col justify-center leading-[1.4]">
            <div className="flex"><div className="w-[80px] font-bold">Chapter</div><div className="font-normal">{selectedEntity?.chapter || ''}</div></div>
            <div className="flex"><div className="w-[80px] font-bold">SOC</div><div className="font-normal">{selectedEntity?.block || ''}</div></div>
            <div className="flex"><div className="w-[80px] font-bold">HLGT</div><div className="font-normal">{selectedEntity?.category || ''}</div></div>
            <div className="flex"><div className="w-[80px] font-bold">PT</div><div className="font-normal"><span dangerouslySetInnerHTML={{ __html: selectedEntity?.title || '' }}></span> {selectedEntity?.theCode ? `[${selectedEntity.theCode}]` : ''}</div></div>
          </div>
        </div>
        {/* Modal Footer */}
        <div className="p-2 pb-3 flex justify-end gap-2 bg-white">
          {onSelect && (
            <button 
              onClick={() => onSelect(selectedEntity)} 
              className="h-[22px] px-8 border border-slate-200 rounded-sm active:bg-slate-100 border-black outline-1 outline-dotted outline-offset-[-3px] bg-white"
            >
              Select
            </button>
          )}
          <button onClick={onClose} className="h-[22px] px-6 border border-slate-200 rounded-sm active:bg-slate-100 bg-white">Close</button>
        </div>
      </div>
    </div>
  );
}
