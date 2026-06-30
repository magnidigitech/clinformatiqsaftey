import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, RotateCcw, AlertCircle, FileText, Lock, Unlock } from 'lucide-react';
import { useCases } from '../hooks/useCases';
import { Button } from '../components/ui/Button';

export default function CaseOpenPage() {
  const { cases } = useCases();
  const [searchParams, setSearchParams] = useState({
    caseNumber: '',
    receiptDateRangeFrom: '',
    receiptDateRangeTo: '',
    productFamily: '',
    advancedCondition: ''
  });

  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState([]);

  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isSearchingDrug, setIsSearchingDrug] = useState(false);
  const drugDictionaryRef = useRef(null);

  useEffect(() => {
    setIsSearchingDrug(true);
    fetch('/drug-lookup.json')
      .then(res => res.json())
      .then(data => {
        drugDictionaryRef.current = data;
        setIsSearchingDrug(false);
      })
      .catch(err => {
        console.error("Failed to load drug dictionary", err);
        setIsSearchingDrug(false);
      });
  }, []);

  const displayCases = hasSearched ? results : cases;

  const handleSearch = () => {
    // Simple frontend search simulation
    const filtered = cases.filter(c => {
      let match = true;
      if (searchParams.caseNumber && !c.case_number.includes(searchParams.caseNumber)) match = false;
      return match;
    });
    setResults(filtered);
    setHasSearched(true);
  };

  const handleClear = () => {
    setSearchParams({
      caseNumber: '',
      receiptDateRangeFrom: '',
      receiptDateRangeTo: '',
      productFamily: '',
      advancedCondition: ''
    });
    setResults([]);
    setHasSearched(false);
  };

  const handleInputChange = (field) => (e) => {
    setSearchParams(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleProductFamilyChange = (e) => {
    const val = e.target.value;
    setSearchParams(prev => ({ ...prev, productFamily: val }));
    
    if (val.length < 3) {
      setDrugSuggestions([]);
      setShowProductDropdown(false);
      return;
    }
    
    setShowProductDropdown(true);
    if (!drugDictionaryRef.current) return;
    
    const valLower = val.toLowerCase();
    const uniqueDrugs = [];
    const seen = new Set();
    
    for (let i = 0; i < drugDictionaryRef.current.length; i++) {
      const item = drugDictionaryRef.current[i];
      const matchBrand = item.brand && item.brand.toLowerCase().includes(valLower);
      const matchGeneric = item.generic && item.generic.toLowerCase().includes(valLower);
      
      if (matchBrand || matchGeneric) {
        const bName = (item.brand || '').toUpperCase();
        if (bName && !seen.has(bName)) {
          seen.add(bName);
          uniqueDrugs.push({
            brand_name: item.brand,
            generic_name: item.generic
          });
          if (uniqueDrugs.length >= 15) break;
        }
      }
    }
    
    setDrugSuggestions(uniqueDrugs);
  };

  const selectProduct = (product) => {
    setSearchParams(prev => ({ ...prev, productFamily: product.brand_name }));
    setShowProductDropdown(false);
  };

  return (
    <div className="min-h-full bg-slate-50 flex flex-col font-sans">
      <div className="px-8 pt-6 flex justify-between items-center">
        <div className="text-sm font-medium text-slate-500">
          Case Actions <span className="mx-2 text-slate-300">/</span> <span className="text-brand-primary font-semibold">Case Open</span>
        </div>
      </div>

      <div className="px-8 py-4 mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Case Open</h1>
      </div>

      <div className="px-8 pb-16 space-y-6 max-w-[1400px]">
        {/* Search Criteria Card */}
        <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-brand-primary text-white px-6 py-4 flex items-center gap-2">
            <Search size={18} />
            <h2 className="text-base font-bold uppercase tracking-wide">Case Search Criteria</h2>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Search For</label>
              <div className="flex items-center gap-2">
                <select className="h-10 px-3 text-sm rounded-sm border border-slate-200 focus:ring-slate-400 focus:border-slate-400 shadow-sm bg-white w-1/3">
                  <option>Case #</option>
                  <option>Project ID</option>
                  <option>Patient ID</option>
                </select>
                <input 
                  type="text" 
                  className="h-10 px-3 text-sm rounded-sm border border-slate-200 focus:ring-slate-400 focus:border-slate-400 shadow-sm flex-1 bg-white" 
                  value={searchParams.caseNumber}
                  onChange={handleInputChange('caseNumber')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block flex items-center gap-1">
                <span className="text-rose-500 text-[10px]">▼</span> Date Range
              </label>
              <select className="h-10 px-3 text-sm rounded-sm border border-slate-200 focus:ring-slate-400 focus:border-slate-400 shadow-sm w-full bg-white">
                <option>Initial Receipt Date</option>
                <option>Follow-up Date</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">From</label>
                <input 
                  type="date" 
                  className="h-10 px-3 text-sm rounded-sm border border-slate-200 focus:ring-slate-400 focus:border-slate-400 shadow-sm w-full bg-white text-slate-700"
                  value={searchParams.receiptDateRangeFrom}
                  onChange={handleInputChange('receiptDateRangeFrom')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">To</label>
                <input 
                  type="date" 
                  className="h-10 px-3 text-sm rounded-sm border border-slate-200 focus:ring-slate-400 focus:border-slate-400 shadow-sm w-full bg-white text-slate-700"
                  value={searchParams.receiptDateRangeTo}
                  onChange={handleInputChange('receiptDateRangeTo')}
                />
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Product Family</label>
              <input 
                type="text" 
                className="h-10 px-3 text-sm rounded-sm border border-slate-200 focus:ring-slate-400 focus:border-slate-400 shadow-sm w-full bg-slate-50 relative z-10"
                value={searchParams.productFamily}
                onChange={handleProductFamilyChange}
                onFocus={() => { if (drugSuggestions.length > 0) setShowProductDropdown(true); }}
                onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
              />
              {showProductDropdown && (
                <div className="absolute z-50 w-full bg-white mt-1 rounded-sm shadow-lg border border-slate-200 max-h-60 overflow-y-auto">
                  {isSearchingDrug && drugSuggestions.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 text-center">Searching...</div>
                  ) : drugSuggestions.length > 0 ? (
                    <ul className="py-1">
                      {drugSuggestions.map((prod, idx) => (
                        <li 
                          key={idx} 
                          className="px-3 py-2 hover:bg-brand-primary hover:text-white cursor-pointer text-sm transition-colors border-b border-slate-100 last:border-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectProduct(prod);
                          }}
                        >
                          <div className="font-bold">{prod.brand_name}</div>
                          <div className="text-xs opacity-80">{prod.generic_name}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-sm text-slate-500 text-center">No products found</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Advanced Condition</label>
              <input 
                type="text" 
                className="h-10 px-3 text-sm rounded-sm border border-slate-200 focus:ring-slate-400 focus:border-slate-400 shadow-sm w-full bg-white"
                value={searchParams.advancedCondition}
                onChange={handleInputChange('advancedCondition')}
              />
            </div>
          </div>

          <div className="bg-slate-100 px-8 py-4 border-t border-slate-200 flex justify-end gap-3">
            <Button variant="outline" onClick={handleClear} className="h-10 px-6 rounded-sm font-bold flex items-center gap-2">
              <RotateCcw size={16} /> Clear
            </Button>
            <Button onClick={handleSearch} className="h-10 px-8 rounded-sm font-bold flex items-center gap-2 shadow-sm">
              <Search size={16} /> Search
            </Button>
          </div>
        </div>

        {/* Results Card */}
        <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
          <div className="bg-brand-primary text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-base font-bold uppercase tracking-wide flex items-center gap-2">
              <FileText size={18} />
              Open Cases ({displayCases.length})
            </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-4 border-r border-slate-200 text-center w-16">Lock State</th>
                    <th className="px-6 py-4 border-r border-slate-200">Case #</th>
                    <th className="px-6 py-4 border-r border-slate-200">Initial Receipt Date</th>
                    <th className="px-6 py-4 border-r border-slate-200">Products</th>
                    <th className="px-6 py-4">Report Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayCases.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-medium flex flex-col items-center justify-center">
                        <AlertCircle size={32} className="text-slate-300 mb-3" />
                        {hasSearched ? "No cases match the specified criteria." : "No open cases found."}
                      </td>
                    </tr>
                  ) : (
                    displayCases.map((c, idx) => (
                      <tr key={c.case_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-center border-r border-slate-100">
                          {c.is_locked ? 
                            <Lock size={18} className="text-rose-500 inline" /> : 
                            <Unlock size={18} className="text-amber-500 inline" />
                          }
                        </td>
                        <td className="px-6 py-4 font-bold border-r border-slate-100">
                          <Link to={`/cases/${c.case_id}`} className="text-brand-primary hover:underline">{c.case_number}</Link>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium border-r border-slate-100">
                          {c.receipt_date ? new Date(c.receipt_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 border-r border-slate-100">
                          {c.products?.map(p => p.drug_name).join(', ') || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">
                          {c.case_type || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </div>
    </div>
  );
}
