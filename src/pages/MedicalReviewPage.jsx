import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { generateCiomsPdf, generateAdrPdf } from '../lib/pdf-generator';

const Section = ({ title, children, noBg = false }) => (
  <div className="mb-2">
    <div className="bg-brand-primary text-white px-2 py-0.5 text-xs font-bold border border-slate-200">
      {title}
    </div>
    <div className={cn("border border-t-0 border-slate-200 p-1.5", noBg ? "bg-white" : "bg-[#FFFFFF]")}>
      {children}
    </div>
  </div>
);

export default function MedicalReviewPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Medical Review');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printCioms, setPrintCioms] = useState(true);
  const [printAdr, setPrintAdr] = useState(false);
  const [printLayout, setPrintLayout] = useState(null);
  const [showCaseDetailsModal, setShowCaseDetailsModal] = useState(false);
  const [showAuditLogModal, setShowAuditLogModal] = useState(false);
  const [showClosePrompt, setShowClosePrompt] = useState(false);
  const [showRoutePrompt, setShowRoutePrompt] = useState(false);

  const [narrativeText, setNarrativeText] = useState("A pharmacist reported on a male patient who was prescribed Wonder Drug for an unspecified indication. The patient developed medically significant. The dose of Wonder Drug was taken prior to the event.");
  const [summaryData, setSummaryData] = useState({
    suspectProduct: 'Wonder Drug (EU)',
    gender: 'Female',
    reportType: 'Spontaneous',
    diagnosis: '',
    genericName: 'AMOXICILLIN TRIHYDRATE',
    age: '44 Years',
    reporterType: 'Pharmacist',
    caseSerious: 'Yes',
    indication: '',
    causal: 'Yes'
  });

  const generateSummaryFromNarrative = () => {
    const text = narrativeText.toLowerCase();
    
    let newSummary = { ...summaryData };
    
    // Gender
    if (text.includes('male') && !text.includes('female')) newSummary.gender = 'Male';
    else if (text.includes('female')) newSummary.gender = 'Female';
    else newSummary.gender = 'Unknown';
    
    // Reporter
    if (text.includes('pharmacist')) newSummary.reporterType = 'Pharmacist';
    else if (text.includes('doctor') || text.includes('physician')) newSummary.reporterType = 'Physician';
    else if (text.includes('nurse')) newSummary.reporterType = 'Nurse';
    else if (text.includes('consumer') || text.includes('patient')) newSummary.reporterType = 'Consumer';
    
    // Product
    if (text.includes('wonder drug')) newSummary.suspectProduct = 'Wonder Drug (EU)';
    
    // Seriousness
    if (text.includes('medically significant') || text.includes('death') || text.includes('hospital') || text.includes('life-threatening')) newSummary.caseSerious = 'Yes';
    else newSummary.caseSerious = 'No';

    // Age parsing (e.g. "44 year old", "44 years")
    const ageMatch = text.match(/(\d+)(?:\s*-?\s*)(?:year|yr)s?\s*old/i) || text.match(/(\d+)\s*years?/i);
    if (ageMatch && ageMatch[1]) {
      newSummary.age = `${ageMatch[1]} Years`;
    }

    setSummaryData(newSummary);
  };

  useEffect(() => {
    const handleSave = () => {
      setTimeout(() => {
        setShowSaveSuccess(true);
      }, 500);
    };

    const handlePrint = () => {
      setShowPrintModal(true);
    };

    const handlePrintMedicalSummary = () => {
      setPrintLayout('medical_summary');
    };

    const handleViewRevisions = () => {
      setShowCaseDetailsModal(true);
    };

    const handleCloseCase = () => {
      setShowClosePrompt(true);
    };

    window.addEventListener('save_case', handleSave);
    window.addEventListener('print_case', handlePrint);
    window.addEventListener('print_medical_summary', handlePrintMedicalSummary);
    window.addEventListener('view_case_revisions', handleViewRevisions);
    window.addEventListener('close_case', handleCloseCase);
    return () => {
      window.removeEventListener('save_case', handleSave);
      window.removeEventListener('print_case', handlePrint);
      window.removeEventListener('print_medical_summary', handlePrintMedicalSummary);
      window.removeEventListener('view_case_revisions', handleViewRevisions);
      window.removeEventListener('close_case', handleCloseCase);
    };
  }, []);

  useEffect(() => {
    if (printLayout) {
      const timer = setTimeout(() => {
        window.print();
        setPrintLayout(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [printLayout]);

  const tabs = [
    'Medical Review',
    'Temporal View',
    'Action Items / Addl Info'
  ];

  /* ── style tokens ── */
  const inp = "h-7 border border-slate-200 rounded px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 w-full transition-all duration-150";
  const sel = "h-[20px] border border-slate-200 px-0.5 text-xs bg-white focus:outline-none focus:border-blue-500 w-full";
  const lbl = "text-[11px] font-semibold text-gray-700 leading-tight block mb-px";

  return (
    <>
    <div className="min-h-full bg-white flex flex-col font-sans text-[12px] print:hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-1 bg-white border-b border-slate-200">
          <span className="text-xs text-gray-600">
            Case Actions &gt; <span className="font-semibold text-gray-800">Medical Review</span>
          </span>
        </div>

        <div className="px-3 pt-1.5 pb-1 flex justify-between items-end border-b border-gray-300 mb-2">
          <h1 className="text-[13px] font-bold text-emerald-700">
            Medical Review - CaseForm - 2010EU00000 "KE"
          </h1>
          <div className="flex gap-1">
            <span className="px-2 text-[11px] bg-gray-100 border border-gray-300">DOHS-/</span>
            <button className="px-2 py-0.5 text-[11px] bg-gray-200 border border-gray-400 hover:bg-gray-300">View Draft</button>
          </div>
        </div>

        <div className="mx-3 flex">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1 text-xs font-semibold border border-b-0 rounded-t-sm mr-0.5",
                activeTab === tab
                  ? "bg-white border-slate-200 text-black relative top-[1px] z-10 pb-[5px]"
                  : "bg-white border-gray-300 text-blue-600 hover:bg-blue-50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mx-3 mb-3 border border-slate-200 bg-white p-2 relative z-0 shadow-sm min-h-[400px]">
          {activeTab === 'Medical Review' && (
            <div className="flex flex-col gap-2">
              <Section title="Case Narrative" noBg>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-gray-500">Narrative</span>
                  <div className="flex gap-1">
                    <button className="px-2 py-0.5 text-[9px] border border-gray-400 bg-gray-100">Show Differences</button>
                    <button onClick={generateSummaryFromNarrative} className="px-2 py-0.5 text-[9px] border border-gray-400 bg-slate-50 hover:bg-slate-100 font-semibold text-emerald-700">Generate</button>
                  </div>
                </div>
                <textarea 
                  className="w-full h-16 border border-slate-200 p-1 text-xs resize-none focus:outline-none focus:border-blue-500"
                  value={narrativeText}
                  onChange={(e) => setNarrativeText(e.target.value)}
                />
              </Section>

              <Section title="Summary">
                <div className="grid grid-cols-4 gap-x-4 gap-y-2 py-1 px-2">
                  <div>
                    <span className={lbl}>First Suspect Product?</span>
                    <span className="text-xs text-blue-800 font-semibold">{summaryData.suspectProduct}</span>
                  </div>
                  <div>
                    <span className={lbl}>Gender</span>
                    <span className="text-xs text-blue-800 font-semibold">{summaryData.gender}</span>
                  </div>
                  <div>
                    <span className={lbl}>Report Type</span>
                    <span className="text-xs text-blue-800 font-semibold">{summaryData.reportType}</span>
                  </div>
                  <div>
                    <span className={lbl}>Company Diagnosis/Syndrome</span>
                    <span className="text-xs text-blue-800 font-semibold">{summaryData.diagnosis}</span>
                  </div>
                  <div>
                    <span className={lbl}>Generic Name</span>
                    <span className="text-xs text-blue-800 font-semibold">{summaryData.genericName}</span>
                  </div>
                  <div>
                    <span className={lbl}>Age</span>
                    <span className="text-xs text-blue-800 font-semibold">{summaryData.age}</span>
                  </div>
                  <div>
                    <span className={lbl}>Reporter Type</span>
                    <span className="text-xs text-blue-800 font-semibold">{summaryData.reporterType}</span>
                  </div>
                  <div>
                    <span className={lbl}>Case Serious</span>
                    <span className="text-xs text-blue-800 font-semibold">{summaryData.caseSerious}</span>
                  </div>
                  <div className="col-span-2">
                    <span className={lbl}>Coded Indication (Coded/Reported)</span>
                    <span className="text-xs text-blue-800 font-semibold">{summaryData.indication}</span>
                  </div>
                  <div className="col-span-2">
                    <span className={lbl}>Company Agent Causal</span>
                    <span className="text-xs text-blue-800 font-semibold">{summaryData.causal}</span>
                  </div>
                </div>
              </Section>

              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-1">
                  <Section title="Case Assessment">
                    <div className="p-1">
                      <span className={lbl}>Case Serious</span>
                      <select className={sel} defaultValue="">
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </div>
                  </Section>
                </div>
                <div className="col-span-4">
                  <Section title="Event Assessment">
                    <div className="flex gap-4 p-1 items-center mb-1 border-b border-slate-200 pb-2">
                      <span className="text-[11px] font-bold text-gray-700">Display Options</span>
                      <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" defaultChecked /> Suspect Products</label>
                      <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" defaultChecked /> Non-Suspect Products</label>
                      <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" defaultChecked /> Patient History</label>
                      <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" defaultChecked /> Patient Lab Data</label>
                      <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" defaultChecked /> Relevant Tests</label>
                      <div className="flex flex-col gap-0.5 ml-4">
                        <label className="flex items-center gap-1 text-[11px]"><input type="radio" name="evt" defaultChecked /> All Events</label>
                        <label className="flex items-center gap-1 text-[11px]"><input type="radio" name="evt" /> Serious Events Only</label>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className={lbl}>Product</span>
                      <select className="w-48 h-[20px] border border-slate-200 text-xs">
                        <option>--All--</option>
                      </select>
                    </div>
                  </Section>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Temporal View' && (
            <div className="flex flex-col gap-2 h-full">
              <Section title="Event Assessment" noBg>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-white text-gray-800 border-b border-slate-200">
                        <th className="px-1 py-1 w-6">ID</th>
                        <th className="px-1 py-1 w-8">Info</th>
                        <th className="px-1 py-1 w-32">Item</th>
                        <th className="px-1 py-1 w-24">Start</th>
                        <th className="px-1 py-1 w-24">Stop</th>
                        <th className="px-1 py-1 w-16 border-r border-slate-200">Duration</th>
                        <th className="px-1 py-1 font-normal text-[9px] text-center">16-SEP-2010</th>
                        <th className="px-1 py-1 font-normal text-[9px] text-center">23-SEP-2010</th>
                        <th className="px-1 py-1 font-normal text-[9px] text-center">30-SEP-2010</th>
                        <th className="px-1 py-1 font-normal text-[9px] text-center">7-OCT-2010</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#D1FAF0] hover:bg-blue-50">
                        <td className="px-1 py-0.5 text-blue-600">S-MED</td>
                        <td className="px-1 py-0.5 flex justify-center"><div className="w-3 h-3 rounded-full border-2 border-orange-500"></div></td>
                        <td className="px-1 py-0.5">Wonder Drug (EU) - Regimen 1</td>
                        <td className="px-1 py-0.5">15-SEP-2010 00:00</td>
                        <td className="px-1 py-0.5">21-SEP-2010 00:00</td>
                        <td className="px-1 py-0.5 border-r border-slate-200">6 days</td>
                        <td colSpan={4} className="relative">
                          <div className="absolute top-1/2 left-[10%] w-[30%] h-1 bg-blue-600 -translate-y-1/2"></div>
                        </td>
                      </tr>
                      <tr className="border-b border-[#D1FAF0] hover:bg-blue-50">
                        <td className="px-1 py-0.5 text-blue-600">S-EV</td>
                        <td className="px-1 py-0.5 flex justify-center"><div className="w-3 h-3 rounded-full border-2 border-orange-500"></div></td>
                        <td className="px-1 py-0.5">Headache</td>
                        <td className="px-1 py-0.5">20-SEP-2010 00:00</td>
                        <td className="px-1 py-0.5">22-SEP-2010 00:00</td>
                        <td className="px-1 py-0.5 border-r border-slate-200">3 days</td>
                        <td colSpan={4} className="relative">
                          <div className="absolute top-1/2 left-[35%] w-[10%] h-2 bg-red-500 -translate-y-1/2"></div>
                        </td>
                      </tr>
                      <tr className="border-b border-[#D1FAF0] hover:bg-blue-50">
                        <td className="px-1 py-0.5 text-blue-600">NS-EV</td>
                        <td className="px-1 py-0.5 flex justify-center"><div className="w-3 h-3 rounded-full border-2 border-orange-500"></div></td>
                        <td className="px-1 py-0.5">Vomiting</td>
                        <td className="px-1 py-0.5">21-SEP-2010 00:00</td>
                        <td className="px-1 py-0.5">21-SEP-2010 00:00</td>
                        <td className="px-1 py-0.5 border-r border-slate-200">1 day</td>
                        <td colSpan={4} className="relative">
                          <div className="absolute top-1/2 left-[40%] w-[2%] h-2 bg-yellow-400 -translate-y-1/2 border border-black"></div>
                        </td>
                      </tr>
                      <tr className="border-b border-[#D1FAF0] hover:bg-blue-50">
                        <td className="px-1 py-0.5 text-blue-600">NS-EV</td>
                        <td className="px-1 py-0.5 flex justify-center"><div className="w-3 h-3 rounded-full border-2 border-orange-500"></div></td>
                        <td className="px-1 py-0.5">Photophobia</td>
                        <td className="px-1 py-0.5">20-SEP-2010 00:00</td>
                        <td className="px-1 py-0.5">24-SEP-2010 00:00</td>
                        <td className="px-1 py-0.5 border-r border-slate-200">5 days</td>
                        <td colSpan={4} className="relative">
                          <div className="absolute top-1/2 left-[35%] w-[15%] h-2 bg-blue-600 -translate-y-1/2"></div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'Action Items / Addl Info' && (
            <div className="p-4 flex justify-center text-gray-500 italic">
              Action Items and Additional Info will be displayed here.
            </div>
          )}
        </div>
      </div>

      {/* Save Success Modal */}
      {showSaveSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
          <div className="bg-slate-50 w-[400px] border-[2px] border-slate-200 rounded-t-[4px] shadow-sm flex flex-col font-sans overflow-hidden">
            <div className="bg-gradient-to-b from-brand-primary to-brand-primary/80 px-2 py-1 flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-white font-bold text-[12px] tracking-wide">
                <span>Argus Safety - Webpage Dialog</span>
              </div>
              <button onClick={() => setShowSaveSuccess(false)} className="bg-emerald-500 border border-white text-white rounded-[2px] w-[20px] h-[20px] flex items-center justify-center hover:bg-emerald-400 leading-none text-[12px] font-bold">✕</button>
            </div>
            
            <div className="p-4 bg-white flex-1 min-h-[100px] flex gap-3 relative">
              <div className="text-[32px] leading-none select-none drop-shadow-sm">ℹ️</div>
              <div className="text-[12px] font-sans pt-2">
                Case 2010EU00000 was saved successfully.
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-2 border-t border-gray-300 flex justify-center gap-2">
              <button onClick={() => setShowSaveSuccess(false)} className="px-5 py-0.5 border border-gray-400 bg-white hover:bg-slate-50 text-xs shadow-sm">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Print Case Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white w-[600px] border-[2px] border-slate-200 rounded-sm shadow-sm flex flex-col font-sans overflow-hidden">
            <div className="bg-gradient-to-b from-[#84D3BF] to-[#5CB8A1] px-2 py-1 flex justify-between items-center border-b border-white">
              <span className="text-white font-bold text-xs tracking-wide">Print Case</span>
              <button onClick={() => setShowPrintModal(false)} className="text-white hover:text-red-200 leading-none text-[12px] font-bold">✕</button>
            </div>

            <div className="flex px-2 pt-1 bg-white gap-0.5 border-b border-gray-400 mt-1">
              <div className="px-3 py-0.5 text-xs font-bold bg-white text-black border border-gray-400 border-b-white z-10 translate-y-[1px]">Print</div>
            </div>

            <div className="bg-white border-t border-gray-400 p-8 border-b">
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-[11px] text-gray-800 font-bold cursor-pointer">
                  <input type="checkbox" checked={printCioms} onChange={(e) => setPrintCioms(e.target.checked)} className="w-3 h-3 accent-gray-500" /> CIOMS Format
                </label>
                <label className="flex items-center gap-2 text-[11px] text-gray-800 font-bold cursor-pointer">
                  <input type="checkbox" checked={printAdr} onChange={(e) => setPrintAdr(e.target.checked)} className="w-3 h-3 accent-gray-500" /> ADR Format
                </label>
              </div>
            </div>

            <div className="bg-white px-4 py-3 flex justify-center gap-3">
              <button onClick={() => {
                setShowPrintModal(false);
                const pdfData = {
                  initials: 'A. M.',
                  country: 'GERMANY',
                  age: summaryData.age,
                  sex: summaryData.gender,
                  description: narrativeText,
                  suspectDrug: summaryData.suspectProduct,
                  controlNo: '100078',
                  reportDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-').toUpperCase()
                };
                if (printCioms) generateCiomsPdf(pdfData);
                if (printAdr) generateAdrPdf(pdfData);
              }} className="px-4 py-0.5 text-[11px] bg-white border border-gray-400 text-gray-800 hover:bg-gray-50 shadow-sm">Print</button>
              <button onClick={() => setShowPrintModal(false)} className="px-4 py-0.5 text-[11px] bg-white border border-gray-400 text-gray-800 hover:bg-gray-50 shadow-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Case Details Modal */}
      {showCaseDetailsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
          <div className="bg-white w-[600px] border-[2px] border-slate-200 rounded-sm shadow-sm flex flex-col font-sans overflow-hidden">
            <div className="bg-gradient-to-b from-[#84D3BF] to-[#5CB8A1] px-2 py-1 flex justify-between items-center border-b border-white">
              <span className="text-white font-bold text-xs tracking-wide">Case Details</span>
              <button onClick={() => setShowCaseDetailsModal(false)} className="text-white hover:text-red-200 leading-none text-[12px] font-bold">✕</button>
            </div>
            <div className="bg-white border-t border-gray-400 p-2 min-h-[300px]">
              <div className="font-sans text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-3 h-3 flex items-center justify-center border border-gray-400 text-[9px] cursor-pointer bg-white leading-none">+</span>
                  <span className="text-yellow-500">📁</span>
                  <span>Reports (3)</span>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-3 h-3 flex items-center justify-center border border-gray-400 text-[9px] cursor-pointer bg-white leading-none">+</span>
                  <span className="text-yellow-500">📁</span>
                  <span>References</span>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-3 h-3 flex items-center justify-center border border-gray-400 text-[9px] cursor-pointer bg-white leading-none">-</span>
                  <span className="text-yellow-500">📁</span>
                  <span>Revisions</span>
                </div>
                <div className="pl-5 flex flex-col text-[11px]">
                  <div onClick={() => setShowAuditLogModal(true)} className="flex items-center gap-1 mb-1 cursor-pointer w-fit pr-1">
                    <span className="text-gray-500 border border-gray-400 px-0.5 text-[8px]">📄</span>
                    <span className="text-black hover:bg-blue-100">Revision History</span>
                  </div>
                  <div className="grid grid-cols-[80px_100px_20px_100px_1fr] gap-2 mb-1 hover:bg-blue-50 cursor-pointer">
                    <span className="flex items-center gap-1 text-gray-500"><span className="text-[8px]">📄</span> <span className="text-black">2010NA000014</span></span>
                    <span>26-JUL-2011 13:50</span>
                    <span>3</span>
                    <span>Data Entry 10 (NA)</span>
                    <span>Data Entry</span>
                  </div>
                  <div className="grid grid-cols-[80px_100px_20px_100px_1fr] gap-2 mb-1 hover:bg-blue-50 cursor-pointer">
                    <span className="flex items-center gap-1 text-gray-500"><span className="text-[8px]">📄</span> <span className="text-black">2010NA000014</span></span>
                    <span>26-JUL-2011 13:44</span>
                    <span>2</span>
                    <span>Data Entry 10 (NA)</span>
                    <span>Data Entry</span>
                  </div>
                  <div className="grid grid-cols-[80px_100px_20px_100px_1fr] gap-2 hover:bg-blue-50 cursor-pointer">
                    <span className="flex items-center gap-1 text-gray-500"><span className="text-[8px]">📄</span> <span className="text-black">2010NA000014</span></span>
                    <span>17-FEB-2011 19:43</span>
                    <span>1</span>
                    <span>Axel Hagel (NA)</span>
                    <span>Case Triage</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white px-4 py-2 flex justify-end border-t border-gray-400">
              <button onClick={() => setShowCaseDetailsModal(false)} className="px-5 py-0.5 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Details Modal */}
      {showAuditLogModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20">
          <div className="bg-white w-[800px] border-[2px] border-slate-200 rounded-sm shadow-sm flex flex-col font-sans overflow-hidden">
            <div className="bg-gradient-to-b from-[#84D3BF] to-[#5CB8A1] px-2 py-1 flex justify-between items-center border-b border-white">
              <span className="text-white font-bold text-xs tracking-wide">Audit Log Details - 2010NA000014</span>
              <button onClick={() => setShowAuditLogModal(false)} className="text-white hover:text-red-200 leading-none text-[12px] font-bold">✕</button>
            </div>
            <div className="bg-white p-1 h-[400px] flex flex-col">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 px-1 text-[11px] font-bold">Total Number of Rows (21)</div>
              <div className="flex-1 bg-white border border-gray-400 overflow-y-auto mb-1">
                <table className="w-full text-left text-[9px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-400 sticky top-0">
                      <th className="px-1 font-normal w-[120px]">Parent▲</th>
                      <th className="px-1 font-normal w-[120px]">Field</th>
                      <th className="px-1 font-normal w-[140px]">Old Value</th>
                      <th className="px-1 font-normal w-[140px]">New Value</th>
                      <th className="px-1 font-normal w-[30px]">Rev</th>
                      <th className="px-1 font-normal">User name</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="px-1 py-0.5">General Information</td><td className="px-1 py-0.5">Case Last Update Date And Time</td><td className="px-1 py-0.5">17-FEB-2011 11:13:51</td><td className="px-1 py-0.5">25-JUL-2011 10:44:28</td><td className="px-1 py-0.5">2</td><td className="px-1 py-0.5">Data Entry 10 (NA)</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="px-1 py-0.5">General Information</td><td className="px-1 py-0.5">Case Last Update Date And Time</td><td className="px-1 py-0.5">26-JUL-2011 10:44:28</td><td className="px-1 py-0.5">26-JUL-2011 10:50:53</td><td className="px-1 py-0.5">3</td><td className="px-1 py-0.5">Data Entry 10 (NA)</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="px-1 py-0.5">General Information</td><td className="px-1 py-0.5">Case Last Update User</td><td className="px-1 py-0.5">Axel Hagel (NA)</td><td className="px-1 py-0.5">Data Entry 10 (NA)</td><td className="px-1 py-0.5">2</td><td className="px-1 py-0.5">Data Entry 10 (NA)</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="px-1 py-0.5">General Information</td><td className="px-1 py-0.5">Case Status</td><td className="px-1 py-0.5">Case Triage</td><td className="px-1 py-0.5">Data Entry</td><td className="px-1 py-0.5">2</td><td className="px-1 py-0.5">Data Entry 10 (NA)</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="px-1 py-0.5">General Information</td><td className="px-1 py-0.5">Master Owned By User ID</td><td className="px-1 py-0.5">0</td><td className="px-1 py-0.5">0</td><td className="px-1 py-0.5">2</td><td className="px-1 py-0.5">Data Entry 10 (NA)</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="px-1 py-0.5">General Information</td><td className="px-1 py-0.5">Previous State</td><td className="px-1 py-0.5">New Case</td><td className="px-1 py-0.5">Case Triage</td><td className="px-1 py-0.5">2</td><td className="px-1 py-0.5">Data Entry 10 (NA)</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="px-1 py-0.5">E. Routing 2</td><td className="px-1 py-0.5">Case Routing Follow-up Seq Number</td><td className="px-1 py-0.5">&lt;Added&gt;</td><td className="px-1 py-0.5">0</td><td className="px-1 py-0.5">2</td><td className="px-1 py-0.5">Data Entry 10 (NA)</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="px-1 py-0.5">E. Routing 2</td><td className="px-1 py-0.5">Comment</td><td className="px-1 py-0.5">&lt;Added&gt;</td><td className="px-1 py-0.5">Case routed from Case Triage by Data Entry 10 (NA) to Data Entry. Any</td><td className="px-1 py-0.5">2</td><td className="px-1 py-0.5">Data Entry 10 (NA)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
  
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 px-1 text-[11px] font-bold">Total Number of Rows (3)</div>
              <div className="h-[60px] bg-white border border-gray-400 overflow-y-auto mb-1">
                <table className="w-full text-left text-[9px] border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer">
                      <td className="px-1 py-0.5 w-[20px] text-center">3</td><td className="px-1 py-0.5 w-[120px]">26-JUL-2011 13:50</td><td className="px-1 py-0.5">Data Entry 10 (NA)</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer">
                      <td className="px-1 py-0.5 w-[20px] text-center">2</td><td className="px-1 py-0.5 w-[120px]">26-JUL-2011 13:44</td><td className="px-1 py-0.5">Data Entry 10 (NA)</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer">
                      <td className="px-1 py-0.5 w-[20px] text-center">1</td><td className="px-1 py-0.5 w-[120px]">17-FEB-2011 19:43</td><td className="px-1 py-0.5">Axel Hagel (NA)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="text-[9px] text-gray-500 italic mt-0.5">* Dates are shown in GMT format without any local timezone adjustment.</div>
            </div>
            <div className="bg-white px-4 py-2 flex justify-end gap-2 border-t border-gray-400">
              <button className="px-5 py-0.5 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Print</button>
              <button onClick={() => setShowAuditLogModal(false)} className="px-5 py-0.5 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Close Prompt Modal */}
      {showClosePrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-transparent">
          <div className="bg-white w-[350px] border-[2px] border-slate-200 rounded-t-[4px] shadow-sm flex flex-col font-sans overflow-hidden">
            <div className="bg-gradient-to-b from-brand-primary to-brand-primary/80 px-2 py-1 flex justify-between items-center">
              <span className="text-white font-bold text-xs tracking-wide">Argus Safety Web -- Webpage Dialog</span>
              <button onClick={() => setShowClosePrompt(false)} className="bg-emerald-500 border border-white text-white rounded-[2px] w-[18px] h-[18px] flex items-center justify-center hover:bg-emerald-400 leading-none text-[12px] font-bold">✕</button>
            </div>
            <div className="bg-white border-b border-gray-400 p-6 flex items-center gap-4">
              <div className="text-[32px] text-blue-600 leading-none pb-2">?</div>
              <div className="text-[12px] text-black">Save changes to Case?</div>
            </div>
            <div className="bg-slate-50 px-4 py-2 flex justify-center gap-2 border-b border-gray-400">
              <button onClick={() => {
                setShowClosePrompt(false);
                window.dispatchEvent(new CustomEvent('save_case'));
                setTimeout(() => {
                  setShowRoutePrompt(true);
                }, 1000);
              }} className="w-20 py-0.5 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Yes</button>
              <button onClick={() => {
                setShowClosePrompt(false);
                setShowRoutePrompt(true);
              }} className="w-20 py-0.5 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">No</button>
              <button onClick={() => setShowClosePrompt(false)} className="w-20 py-0.5 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Route Prompt Modal */}
      {showRoutePrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-transparent">
          <div className="bg-white w-[350px] border-[2px] border-slate-200 rounded-t-[4px] shadow-sm flex flex-col font-sans overflow-hidden">
            <div className="bg-gradient-to-b from-brand-primary to-brand-primary/80 px-2 py-1 flex justify-between items-center">
              <span className="text-white font-bold text-xs tracking-wide">Routing</span>
              <button onClick={() => {
                setShowRoutePrompt(false);
                navigate('/');
              }} className="bg-emerald-500 border border-white text-white rounded-[2px] w-[18px] h-[18px] flex items-center justify-center hover:bg-emerald-400 leading-none text-[12px] font-bold">✕</button>
            </div>
            <div className="bg-white border-b border-gray-400 p-6 flex items-center gap-4">
              <div className="text-[32px] text-blue-600 leading-none pb-2">?</div>
              <div className="text-[12px] text-black">Route Case to Next State?</div>
            </div>
            <div className="bg-slate-50 px-4 py-2 flex justify-center gap-2 border-b border-gray-400">
              <button onClick={() => {
                setShowRoutePrompt(false);
                navigate('/');
              }} className="w-20 py-0.5 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Route</button>
              <button onClick={() => {
                setShowRoutePrompt(false);
                navigate('/');
              }} className="w-20 py-0.5 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>

    {/* Printable PDF Layouts */}
    {printLayout === 'case_form' && (
      <div className="hidden print:block font-sans text-[12px] bg-white text-black p-8 w-full max-w-[1000px] mx-auto">
        <div className="flex justify-between items-end border-b-2 border-gray-400 pb-1 mb-2">
          <div className="w-[200px] border border-gray-400 p-1 flex justify-center text-red-600 font-bold text-lg tracking-tighter shadow-sm bg-gray-50">
            ORACLE<br/><span className="text-[11px] text-gray-500 font-normal leading-none tracking-normal">HEALTH SCIENCES</span>
          </div>
          <div className="flex flex-col items-end">
            <h1 className="text-blue-800 text-xl font-bold">Case Record</h1>
            <span className="text-[11px] text-gray-500">28-Jul-2011 01:58 GMT-4:000000</span>
          </div>
        </div>
        
        <h2 className="text-blue-800 text-lg mb-2">Case Number 2010EU00000</h2>

        <div className="border-[2px] border-black">
          <div className="flex border-b-[2px] border-black h-24">
            <div className="w-1/2 p-4 flex items-center justify-center border-r-[2px] border-black">
              <div className="font-barcode text-5xl tracking-widest bg-gray-100 px-4 py-2 w-full text-center">||| | ||||| |||| | |||||||</div>
            </div>
            <div className="w-1/2 p-1 text-[11px] grid grid-cols-2 gap-y-1 content-center">
              <div className="font-bold">Case ID:</div><div className="text-right pr-2">100078</div>
              <div className="font-bold">Received On:</div><div className="text-right pr-2">20-OCT-2010</div>
              <div className="font-bold">Initial Case User:</div><div className="text-right pr-2">Data Entry 2 (EU)</div>
              <div className="font-bold">Initial Case Site:</div><div className="text-right pr-2">European Union</div>
            </div>
          </div>

          <div className="bg-gray-200 border-b border-black px-1 font-bold text-xs">General Information</div>
          <div className="p-1 border-b border-black grid grid-cols-5 text-[11px] gap-2">
            <div><div className="font-bold">Report Type</div><div>Spontaneous</div></div>
            <div><div className="font-bold">Case Country</div><div>GERMANY</div></div>
            <div><div className="font-bold">Initial Receipt Date</div><div>20-OCT-2010</div></div>
            <div><div className="font-bold">Safety Receipt Date</div><div>21-OCT-2010</div></div>
            <div><div className="font-bold">Case Status</div><div>Data Entry</div></div>
          </div>
          <div className="p-1 border-b border-black text-[11px] min-h-[30px]">
            <div className="font-bold">Initial Justification</div>
          </div>
          <div className="p-1 border-b border-black grid grid-cols-2 text-[11px] min-h-[40px]">
            <div><div className="font-bold flex items-center gap-1"><input type="checkbox" className="w-3 h-3" /> Case Requires Follow-up</div></div>
            <div><div className="font-bold">Classification</div></div>
          </div>

          <div className="bg-gray-200 border-b border-black px-1 font-bold text-xs">Follow-up Log</div>
          <div className="p-1 border-b border-black text-[11px] text-center font-bold">
            No Information Present
          </div>

          <div className="bg-gray-200 border-b border-black px-1 font-bold text-xs">Reporter Information</div>
          <div className="p-1 text-[11px] grid grid-cols-4 gap-2">
            <div className="col-span-1">
              <div className="flex gap-2 font-bold mb-1"><span>1</span><span>Name</span></div>
              <div className="pl-4">Andrea Mueller</div>
            </div>
            <div className="col-span-2">
              <div className="font-bold mb-1">Occupation</div>
              <div className="h-8"></div>
            </div>
            <div className="col-span-1 text-right pr-2">
              <div className="font-bold mb-1">Health Care Professional</div>
              <div>No</div>
            </div>
            <div className="col-span-2 border-t border-gray-300 pt-1 mt-1">
              <div className="font-bold">Institution</div>
            </div>
            <div className="col-span-2 border-t border-gray-300 pt-1 mt-1 text-right pr-2">
              <div className="font-bold">Reporter ID</div>
            </div>
          </div>
        </div>
      </div>
    )}

    {printLayout === 'medical_summary' && (
      <div className="hidden print:block font-sans text-[12px] bg-white text-black p-8 w-full max-w-[1000px] mx-auto">
        <h1 className="text-center font-bold text-[14px] mb-4">Medical Summary</h1>
        <h2 className="font-bold text-[12px] mb-2 border-b-2 border-black pb-1">Case Number: 2010EU00000</h2>
        
        <div className="grid grid-cols-2 gap-4 border-b border-black pb-2 mb-2">
          <div>
            <h3 className="font-bold mb-1 italic">General Case Information</h3>
            <div className="grid grid-cols-[120px_1fr] text-[11px] gap-y-0.5">
              <div className="font-bold">Report Type</div><div>Spontaneous</div>
              <div className="font-bold">Initial Receipt Date</div><div>20-Oct-2010</div>
              <div className="font-bold">Case Creation Time</div><div>20-Oct-2010 16:29</div>
              <div className="font-bold">Case Country</div><div>GERMANY</div>
              <div className="font-bold">Health Care Professional</div><div>No</div>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-1 italic">Patient Information</h3>
            <div className="grid grid-cols-[100px_1fr] text-[11px] gap-y-0.5">
              <div className="font-bold">Age</div><div>21 Years</div>
              <div className="font-bold">Date of Birth</div><div>08-NOV-1988</div>
              <div className="font-bold">Weight</div><div>90.700 kg</div>
            </div>
          </div>
        </div>

        <div className="border-b border-black pb-2 mb-2">
          <h3 className="font-bold mb-1 italic">Reporter Information</h3>
          <div className="grid grid-cols-[120px_1fr] text-[11px]">
            <div className="font-bold">Reporter Type</div><div>Consumer</div>
          </div>
        </div>

        <div className="border-b border-black pb-2 mb-2">
          <h3 className="font-bold mb-1 italic">Narrative / Comment</h3>
          <div className="grid grid-cols-[120px_1fr] text-[11px]">
            <div className="font-bold">Case Serious</div><div>Yes</div>
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-1 italic">Medications - Suspect</h3>
          <table className="w-full text-left text-[9px] border-collapse border border-black mb-1">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-1 py-0.5 w-4">#</th>
                <th className="border border-black px-1 py-0.5">Product Name<br/>Generic Name</th>
                <th className="border border-black px-1 py-0.5">Reported Indication</th>
                <th className="border border-black px-1 py-0.5">Duration of<br/>Administration</th>
                <th className="border border-black px-1 py-0.5">Total Dosage<br/>Total Dose to<br/>Primary Event</th>
                <th className="border border-black px-1 py-0.5">Time Between First<br/>Dose/Primary Event<br/>Time between Last<br/>Dose/Primary Event</th>
                <th className="border border-black px-1 py-0.5">Action Taken</th>
                <th className="border border-black px-1 py-0.5">Dechallenge<br/>Results<br/>Rechallenge<br/>Results</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-1 py-0.5 align-top">1</td>
                <td className="border border-black px-1 py-0.5 align-top">(not reported)<br/><br/></td>
                <td className="border border-black px-1 py-0.5 align-top"></td>
                <td className="border border-black px-1 py-0.5 align-top"></td>
                <td className="border border-black px-1 py-0.5 align-top"></td>
                <td className="border border-black px-1 py-0.5 align-top"></td>
                <td className="border border-black px-1 py-0.5 align-top"></td>
                <td className="border border-black px-1 py-0.5 align-top">Unk<br/>Unk</td>
              </tr>
            </tbody>
          </table>
          <div className="text-[9px] font-bold">Dosage Regimens:</div>
          <div className="text-[9px] pl-4 italic">No Information present</div>
        </div>
      </div>
    )}

    {printLayout === 'cioms_format' && (
      <div className="hidden print:block font-sans text-[12px] bg-white text-black p-8 w-full max-w-[1000px] mx-auto">
        <h1 className="text-center font-bold text-[16px] mb-4 tracking-wider">CIOMS FORM</h1>
        <div className="border-[2px] border-black p-4 bg-white shadow-sm">
          <h2 className="font-bold border-b border-black mb-3 pb-1 text-[13px] bg-gray-100 px-2">I. REACTION INFORMATION</h2>
          <div className="grid grid-cols-2 gap-6 mb-6 px-2">
            <div className="space-y-1">
              <div className="font-bold text-[10px] text-gray-700">1. PATIENT INITIALS</div>
              <div className="border-b border-gray-400 h-6 pl-1 font-semibold text-gray-900">A. M.</div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-[10px] text-gray-700">2. COUNTRY</div>
              <div className="border-b border-gray-400 h-6 pl-1 font-semibold text-gray-900">GERMANY</div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-[10px] text-gray-700">3. DATE OF BIRTH</div>
              <div className="border-b border-gray-400 h-6 pl-1 font-semibold text-gray-900">08-NOV-1988</div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-[10px] text-gray-700">4. AGE</div>
              <div className="border-b border-gray-400 h-6 pl-1 font-semibold text-gray-900">21 Years</div>
            </div>
          </div>
          
          <h2 className="font-bold border-b border-black mb-3 pb-1 text-[13px] bg-gray-100 px-2">II. SUSPECT DRUG(S) INFORMATION</h2>
          <div className="mb-6 px-2 space-y-1">
            <div className="font-bold text-[10px] text-gray-700">14. SUSPECT DRUG(S) (include generic name)</div>
            <div className="border-b border-gray-400 h-6 pl-1 font-semibold text-gray-900">Wonder Drug (EU)</div>
          </div>
          
          <h2 className="font-bold border-b border-black mb-3 pb-1 text-[13px] bg-gray-100 px-2">III. CONCOMITANT DRUG(S) AND HISTORY</h2>
          <div className="mb-6 h-12 border-b border-gray-400 px-2 space-y-1">
            <div className="font-bold text-[10px] text-gray-700">22. CONCOMITANT DRUG(S)</div>
          </div>
          
          <h2 className="font-bold border-b border-black mb-3 pb-1 text-[13px] bg-gray-100 px-2">IV. MANUFACTURER INFORMATION</h2>
          <div className="mb-4 h-12 border-b border-gray-400 px-2 space-y-1">
            <div className="font-bold text-[10px] text-gray-700">24. NAME AND ADDRESS OF MANUFACTURER</div>
            <div className="font-semibold text-gray-900 pl-1">ORACLE HEALTH SCIENCES</div>
          </div>
        </div>
      </div>
    )}

    {printLayout === 'adr_format' && (
      <div className="hidden print:block font-sans text-[12px] bg-white text-black p-8 w-full max-w-[1000px] mx-auto">
        <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-6">
          <div>
            <h1 className="font-bold text-[18px] text-blue-900">SUSPECTED ADVERSE DRUG REACTION REPORTING FORM</h1>
            <p className="text-[10px] text-gray-600 mt-1">For VOLUNTARY reporting of Adverse Drug Reactions by Healthcare Professionals</p>
          </div>
          <div className="text-right">
            <div className="border border-black p-2 text-center bg-gray-50">
              <span className="font-bold text-[10px] block">FOR OFFICE USE ONLY</span>
              <span className="text-[10px]">ADR No. 100078</span>
            </div>
          </div>
        </div>

        <div className="border-[2px] border-black p-5 bg-white shadow-sm">
          <h2 className="font-bold bg-blue-50 border-b border-black mb-3 px-2 py-1 text-[13px] text-blue-900">1. Patient Details</h2>
          <div className="grid grid-cols-2 gap-6 mb-6 px-2">
            <div className="space-y-1">
              <div className="font-bold text-[10px] text-gray-700">Patient Initials</div>
              <div className="border-b border-gray-400 h-6 pl-1 font-semibold text-gray-900">A. M.</div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-[10px] text-gray-700">Age at time of event</div>
              <div className="border-b border-gray-400 h-6 pl-1 font-semibold text-gray-900">21 Years</div>
            </div>
          </div>

          <h2 className="font-bold bg-blue-50 border-b border-black mb-3 px-2 py-1 text-[13px] text-blue-900">2. Suspected Adverse Reaction</h2>
          <div className="mb-6 px-2 space-y-1">
            <div className="font-bold text-[10px] text-gray-700">Date of reaction started</div>
            <div className="border-b border-gray-400 h-6 pl-1 font-semibold text-gray-900">20-SEP-2010</div>
          </div>

          <h2 className="font-bold bg-blue-50 border-b border-black mb-3 px-2 py-1 text-[13px] text-blue-900">3. Suspected Medication(s)</h2>
          <div className="mb-6 px-2 space-y-1">
            <div className="font-bold text-[10px] text-gray-700">Name of the drug (Brand/Generic name)</div>
            <div className="border-b border-gray-400 h-6 pl-1 font-semibold text-gray-900">Wonder Drug (EU)</div>
          </div>

          <h2 className="font-bold bg-blue-50 border-b border-black mb-3 px-2 py-1 text-[13px] text-blue-900">4. Reporter Details</h2>
          <div className="mb-4 px-2 space-y-1">
            <div className="font-bold text-[10px] text-gray-700">Name and Professional Address</div>
            <div className="border-b border-gray-400 h-6 pl-1 font-semibold text-gray-900">Andrea Mueller</div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
