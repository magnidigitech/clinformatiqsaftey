import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useCases } from '../hooks/useCases';
import { cn } from '../lib/utils';
import { AlertCircle, FileText, Check, Unlock, Search, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import DrugAutocomplete from '../components/ui/DrugAutocomplete';

/* ── section wrapper ── */
const Section = ({ title, children, extra }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      {extra}
    </div>
    <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
      {children}
    </div>
  </div>
);

export default function NewCasePage() {
  const { cases, createCase } = useCases();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    caseReceiptDate: '', safetyReceiptDate: '',
    caseCountry: '', caseReportType: '',
    projectId: '', studyId: '', centerId: '', initialJustification: '',
    productName: '', genericName: '',
    descriptionAsReported: '',
    onsetDateTime: '',
    sal: '', repFirstName: '', repMiddleName: '', repLastName: '',
    repSuffix: '', repCountry: '', repState: '', repPostalCode: '', repIntermediary: '',
    patNameOrInitials: '', patId: '', patDOB: '',
    patAge: '', patUnits: '', patGender: '',
    litId: '', litKeywords: '', litJournal: '', litTitle: '',
    fullSearch: false,
    searchType: 'initialReceipt',
    seriousDeath: false, seriousHospitalized: false, seriousCongenital: false,
    seriousLifeThreatening: false, seriousDisability: false, seriousIntervention: false,
    seriousMedicallySignificant: false, seriousOther: false,
    seriousOtherText: '',
    caseNonSerious: false, caseUnableToDetermine: false,
    reportedCausality: '',
  });

  const [isBookInMode, setIsBookInMode] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [showJustificationDialog, setShowJustificationDialog] = useState(false);
  const [justificationDraft, setJustificationDraft] = useState('');
  const [standardJustification, setStandardJustification] = useState('Not specified');

  // Attachments state
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState(null);

  const handleAttachFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const newAttachment = {
        id: Date.now(),
        classification: 'Attachment',
        date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-').toUpperCase(),
        keywords: file.name,
        description: 'Uploaded File',
        filename: file.name
      };
      setAttachments(prev => [...prev, newAttachment]);
      setSelectedAttachmentId(newAttachment.id);
    }
    if (e.target) e.target.value = '';
  };

  const handleAddAttachment = () => {
    const newAttachment = { id: Date.now(), classification: '', date: '00-MMM-0000', keywords: '', description: '', filename: '' };
    setAttachments(prev => [...prev, newAttachment]);
    setSelectedAttachmentId(newAttachment.id);
  };

  const handleDeleteAttachment = () => {
    if (selectedAttachmentId) {
      setAttachments(prev => prev.filter(a => a.id !== selectedAttachmentId));
      setSelectedAttachmentId(null);
    }
  };

  const h = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const hc = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.checked }));

  const handleSearch = () => {
    if (!form.caseCountry && !form.productName && !form.caseReportType) {
      alert("Please enter at least one criteria (e.g. Country, Product Name) to search for duplicates.");
      return;
    }
    const results = cases.filter(c => {
      let match = false;
      if (form.caseCountry && c.case_country === form.caseCountry) match = true;
      if (form.caseReportType && c.case_type === form.caseReportType) match = true;
      if (form.productName && c.products?.some(p => p.drug_name.toLowerCase().includes(form.productName.toLowerCase()))) match = true;
      return match;
    });
    setSearchResults(results);
    setHasSearched(true);
  };

  const validateForm = () => {
    if (!form.caseReceiptDate || !form.caseCountry || !form.caseReportType || !form.productName || !form.patNameOrInitials || !form.descriptionAsReported) {
      alert("Please fill in all mandatory fields before proceeding.");
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (!validateForm()) return;
    setIsBookInMode(true);
  };

  const handleBookIn = () => {
    if (!validateForm()) return;

    const payload = {
      receipt_date: form.caseReceiptDate,
      aware_date: form.safetyReceiptDate || null,
      case_type: form.caseReportType,
      serious_flag: (form.seriousDeath || form.seriousHospitalized || form.seriousLifeThreatening) ? 'Y' : 'N',
      initial_justification: form.initialJustification,
      patient: {
        initials: form.patNameOrInitials,
        dob: form.patDOB || null,
        age: form.patAge,
        ageUnits: form.patUnits,
        gender: form.patGender,
      },
      reporter: {
        firstName: form.repFirstName,
        lastName: form.repLastName,
        country: form.repCountry,
      },
      product: {
        productName: form.productName,
      },
      attachments
    };

    setPendingPayload(payload);
    setShowSuccessModal(true);
  };

  const handleModalYes = async () => {
    try {
      const res = await createCase(pendingPayload);
      if (res && res.data && res.data.case_id) {
        navigate(`/cases/${res.data.case_id}`);
      } else {
        navigate('/cases/open');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleModalNo = () => {
    setShowSuccessModal(false);
    setPendingPayload(null);
  };

  const rangeDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date()).toUpperCase().replace(/ /g, '-');

  const inp    = "h-10 px-3 text-sm rounded-sm border-slate-200 focus:ring-slate-400 focus:border-slate-400 shadow-sm transition-all w-full bg-white";
  const inpReq = "h-10 px-3 text-sm rounded-sm border-slate-400 focus:ring-slate-500 focus:border-slate-500 shadow-sm transition-all w-full bg-slate-50";
  const sel    = "h-10 px-3 text-sm rounded-sm border-slate-200 focus:ring-slate-400 focus:border-slate-400 shadow-sm transition-all w-full bg-white";
  const selReq = "h-10 px-3 text-sm rounded-sm border-slate-400 focus:ring-slate-500 focus:border-slate-500 shadow-sm transition-all w-full bg-slate-50";
  const lbl    = "text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide";
  const rlbl   = "text-xs font-bold text-slate-800 block mb-1.5 uppercase tracking-wide flex items-center";
  const arrow  = <span className="text-rose-500 mr-1 text-[10px] leading-none">▼</span>;

  return (
    <div className="min-h-full bg-slate-50 flex flex-col font-sans">
      <div className="px-8 pt-6 flex justify-between items-center">
        <div className="text-sm font-medium text-slate-500">
          Case Actions <span className="mx-2 text-slate-300">/</span> <span className="text-brand-primary font-semibold">New Case</span>
        </div>
      </div>

      <div className="px-8 py-4 mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          INITIAL CASE ENTRY
        </h1>
      </div>

      <div className="px-8 pb-16 space-y-6 max-w-[1400px]">
        <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="bg-brand-primary text-white px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText size={20} />
              Case Search Criteria
            </h2>
            <div className="flex items-center gap-6 text-sm font-medium">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="st" value="initialReceipt" checked={form.searchType === 'initialReceipt'} onChange={h('searchType')} className="accent-slate-400 w-4 h-4" />
                <span>Initial Receipt Date</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="st" value="receiptRange" checked={form.searchType === 'receiptRange'} onChange={h('searchType')} className="accent-slate-400 w-4 h-4" />
                <span>Receipt Range Limits {rangeDate} - {rangeDate}</span>
              </label>
            </div>
          </div>

          <div className="p-8 space-y-8 bg-slate-50">
            {/* ══════ GENERAL ══════ */}
            <Section title="General">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div>
                  <label className={rlbl}>{arrow}Case Receipt Date</label>
                  <input type="date" className={inpReq} value={form.caseReceiptDate} onChange={h('caseReceiptDate')} />
                </div>
                <div>
                  <label className={lbl}>Safety Receipt Date</label>
                  <input type="date" className={inp} value={form.safetyReceiptDate} onChange={h('safetyReceiptDate')} />
                </div>
                <div>
                  <label className={rlbl}>{arrow}Case Country</label>
                  <select className={selReq} value={form.caseCountry} onChange={h('caseCountry')}>
                    <option value=""></option><option value="US">UNITED STATES</option><option value="GB">UNITED KINGDOM</option>
                    <option value="IN">INDIA</option><option value="DE">GERMANY</option>
                    <option value="FR">FRANCE</option><option value="JP">JAPAN</option>
                  </select>
                </div>
                <div>
                  <label className={rlbl}>{arrow}Case Report Type</label>
                  <select className={selReq} value={form.caseReportType} onChange={h('caseReportType')}>
                    <option value=""></option><option value="Spontaneous">Spontaneous</option><option value="Study">Study</option>
                    <option value="Literature">Literature</option><option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div>
                  <label className={lbl}>Project ID</label>
                  <input className={inp} value={form.projectId} onChange={h('projectId')} />
                </div>
                <div>
                  <label className={lbl}>Study ID</label>
                  <input className={inp} value={form.studyId} onChange={h('studyId')} />
                </div>
                <div>
                  <label className={lbl}>Center ID</label>
                  <input className={inp} value={form.centerId} onChange={h('centerId')} />
                </div>
                <div>
                  <label className={lbl}>Initial Justification</label>
                  <div className="flex items-center gap-2">
                    <input className={inp} value={form.initialJustification} readOnly placeholder="" />
                    <div 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setJustificationDraft(form.initialJustification);
                        setShowJustificationDialog(true);
                      }}
                      style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', borderRadius: '50%', backgroundColor: '#10b981', border: '2px solid #059669', cursor: 'pointer', zIndex: 10, position: 'relative' }}
                      title="Enter justification"
                      role="button"
                      tabIndex={0}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="flex gap-2 items-end relative">
                  <div className="flex-1 relative">
                    <label className={rlbl}>{arrow}Product Name</label>
                    <DrugAutocomplete
                      value={form.productName}
                      onChange={(val) => setForm(p => ({ ...p, productName: val }))}
                      onSelect={(drug) => {
                        setForm(p => ({
                          ...p,
                          productName: drug.brand || drug.generic || '',
                          genericName: drug.generic || ''
                        }));
                      }}
                      placeholder="Search drug / brand name…"
                      inputClass={inpReq}
                    />
                  </div>
                  <Button variant="outline" className="h-10 rounded-sm">Select</Button>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <label className={lbl}>Generic Name</label>
                    <input 
                      className={inp} 
                      value={form.genericName} 
                      onChange={h('genericName')} 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={rlbl}>{arrow}Description as Reported</label>
                  <input className={inpReq} value={form.descriptionAsReported} onChange={h('descriptionAsReported')} />
                </div>
                <div>
                  <label className={lbl}>Onset Date/Time</label>
                  <input type="datetime-local" className={inp} value={form.onsetDateTime} onChange={h('onsetDateTime')} />
                </div>
              </div>
            </Section>

            {/* ══════ REPORTER ══════ */}
            <Section title="Reporter" extra={<Button variant="outline" size="sm" className="rounded-sm">Select</Button>}>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                <div><label className={lbl}>Sal.</label><input className={inp} value={form.sal} onChange={h('sal')} /></div>
                <div><label className={lbl}>First Name</label><input className={inp} value={form.repFirstName} onChange={h('repFirstName')} /></div>
                <div><label className={lbl}>Middle Name</label><input className={inp} value={form.repMiddleName} onChange={h('repMiddleName')} /></div>
                <div><label className={lbl}>Last Name</label><input className={inp} value={form.repLastName} onChange={h('repLastName')} /></div>
                <div><label className={lbl}>Suffix</label><input className={inp} value={form.repSuffix} onChange={h('repSuffix')} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div><label className={lbl}>Country</label><input className={inp} value={form.repCountry} onChange={h('repCountry')} /></div>
                <div><label className={lbl}>State/Province</label><input className={inp} value={form.repState} onChange={h('repState')} /></div>
                <div><label className={lbl}>Postal Code</label><input className={inp} value={form.repPostalCode} onChange={h('repPostalCode')} /></div>
                <div><label className={lbl}>Intermediary</label><input className={inp} value={form.repIntermediary} onChange={h('repIntermediary')} /></div>
              </div>
            </Section>

            {/* ══════ PATIENT ══════ */}
            <Section title="Patient">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                <div className="md:col-span-2">
                  <label className={rlbl}>{arrow}First/Last Name or Initials</label>
                  <input className={inpReq} value={form.patNameOrInitials} onChange={h('patNameOrInitials')} />
                </div>
                <div><label className={lbl}>Pat. ID</label><input className={inp} value={form.patId} onChange={h('patId')} /></div>
                <div><label className={lbl}>Date of Birth</label><input type="date" className={inp} value={form.patDOB} onChange={h('patDOB')} /></div>
                <div><label className={lbl}>Age</label><input type="number" className={inp} value={form.patAge} onChange={h('patAge')} /></div>
                <div><label className={lbl}>Units</label><input className={inp} value={form.patUnits} onChange={h('patUnits')} /></div>
                <div>
                  <label className={lbl}>Gender</label>
                  <select className={sel} value={form.patGender} onChange={h('patGender')}>
                    <option value=""></option><option value="Male">Male</option><option value="Female">Female</option><option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>
            </Section>

            {/* ══════ LITERATURE & REFERENCES ══════ */}
            <Section title="Literature & References">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div><label className={lbl}>ID</label><input className={inp} value={form.litId} onChange={h('litId')} /></div>
                <div><label className={lbl}>Keywords</label><input className={inp} value={form.litKeywords} onChange={h('litKeywords')} /></div>
                <div><label className={lbl}>Journal</label><input className={inp} value={form.litJournal} onChange={h('litJournal')} /></div>
                <div><label className={lbl}>Title</label><input className={inp} value={form.litTitle} onChange={h('litTitle')} /></div>
              </div>
            </Section>
          </div>

          {isBookInMode && (
            <div className="p-8 border-t border-slate-200 bg-white">
              <div className="bg-brand-primary text-white px-4 py-2 font-bold mb-4 rounded-sm">
                BookIn
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Seriousness */}
                <div className="md:col-span-2">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="text-rose-500">🚩</span> Seriousness Criteria
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.seriousDeath} onChange={hc('seriousDeath')} className="w-4 h-4 accent-brand-primary rounded-sm" /> Death</label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.seriousHospitalized} onChange={hc('seriousHospitalized')} className="w-4 h-4 accent-brand-primary rounded-sm" /> Hospitalized</label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.seriousCongenital} onChange={hc('seriousCongenital')} className="w-4 h-4 accent-brand-primary rounded-sm" /> Congenital Anomaly</label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.seriousLifeThreatening} onChange={hc('seriousLifeThreatening')} className="w-4 h-4 accent-brand-primary rounded-sm" /> Life-threatening</label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.seriousDisability} onChange={hc('seriousDisability')} className="w-4 h-4 accent-brand-primary rounded-sm" /> Disability</label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.seriousIntervention} onChange={hc('seriousIntervention')} className="w-4 h-4 accent-brand-primary rounded-sm" /> Intervention Required</label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.seriousMedicallySignificant} onChange={hc('seriousMedicallySignificant')} className="w-4 h-4 accent-brand-primary rounded-sm" /> Medically Significant</label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.seriousOther} onChange={hc('seriousOther')} className="w-4 h-4 accent-brand-primary rounded-sm" /> Other: <input type="text" className="h-8 border border-slate-200 px-2 text-sm w-full bg-white ml-2 rounded-sm" value={form.seriousOtherText} onChange={h('seriousOtherText')}/></label>
                  </div>
                </div>

                <div className="flex flex-col gap-6 pl-8 border-l border-slate-200">
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-800"><input type="checkbox" checked={form.caseNonSerious} onChange={hc('caseNonSerious')} className="w-4 h-4 accent-brand-primary rounded-sm" /> Case is Non-Serious</label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-800"><input type="checkbox" checked={form.caseUnableToDetermine} onChange={hc('caseUnableToDetermine')} className="w-4 h-4 accent-brand-primary rounded-sm" /> Unable to Determine</label>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">Reported Causality</h4>
                    <select className={sel} value={form.reportedCausality} onChange={h('reportedCausality')}>
                      <option></option>
                      <option>Almost Certain</option>
                      <option>Probable</option>
                      <option>Possible</option>
                      <option>Unlikely</option>
                      <option>Unable to Determine</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Attachments and References */}
              <div className="mt-8">
                <div className="bg-brand-primary text-white px-4 py-2 font-bold rounded-t-sm flex justify-between items-center">
                  <span>Attachments and References</span>
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleAttachFile}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs bg-white text-slate-800 rounded-sm font-bold shadow-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Attach File
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs bg-white text-slate-800 rounded-sm"
                      onClick={handleAddAttachment}
                    >
                      Add
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs bg-white text-slate-800 rounded-sm"
                      onClick={handleDeleteAttachment}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="border border-slate-200 border-t-0 bg-white h-32 overflow-y-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                      <tr>
                        <th className="px-4 py-2 border-r border-slate-200 w-12 text-center">#</th>
                        <th className="px-4 py-2 border-r border-slate-200">Classification</th>
                        <th className="px-4 py-2 border-r border-slate-200">Description</th>
                        <th className="px-4 py-2">Filename</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attachments.map((att, idx) => (
                        <tr 
                          key={att.id} 
                          onClick={() => setSelectedAttachmentId(att.id)}
                          className={cn(
                            "cursor-pointer border-b border-slate-100 last:border-0 transition-colors",
                            selectedAttachmentId === att.id ? "bg-blue-50" : "hover:bg-slate-50"
                          )}
                        >
                          <td className="px-4 py-2 border-r border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-2 border-r border-slate-200">{att.classification}</td>
                          <td className="px-4 py-2 border-r border-slate-200">{att.description}</td>
                          <td className="px-4 py-2 text-brand-primary">{att.filename}</td>
                        </tr>
                      ))}
                      {attachments.length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-slate-400 italic">No attachments added</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Action Bar */}
          <div className="bg-slate-100 border-t border-slate-200 p-4 flex items-center justify-between">
            {!isBookInMode ? (
              <>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.fullSearch} onChange={hc('fullSearch')} className="w-4 h-4 accent-brand-primary rounded-sm" />
                  Full Search (Like Soundex)
                </label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={handleSearch} className="h-10 px-6 rounded-sm font-bold flex items-center gap-2">
                    <Search size={16} /> Search
                  </Button>
                  <Button onClick={handleContinue} className="h-10 px-8 rounded-sm font-bold shadow-sm">
                    Continue
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/')} className="h-10 px-6 rounded-sm font-bold">
                    Clear
                  </Button>
                </div>
              </>
            ) : (
              <div className="w-full flex justify-center">
                <Button onClick={handleBookIn} className="h-10 px-12 rounded-sm font-bold shadow-sm bg-brand-primary hover:bg-brand-dark text-white border-0">
                  Book-In
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Inline Search Results */}
        {hasSearched && !isBookInMode && (
          <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
            <div className="bg-brand-primary text-white px-4 py-2 flex justify-between items-center text-sm font-bold">
              <span>Total Number of Rows ({searchResults.length})</span>
              <div className="flex items-center gap-4 text-xs font-normal">
                <div className="flex items-center gap-2">
                  <span>Displaying Rows</span>
                  <select className="h-6 text-black px-1 rounded-sm border border-slate-200">
                    <option>1-{searchResults.length || 1}</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span>Page Size</span>
                  <select className="h-6 text-black px-1 rounded-sm border border-slate-200">
                    <option>100</option>
                  </select>
                </div>
                <div className="flex gap-1">
                  <button className="bg-white text-slate-800 border border-slate-300 px-2 h-6 rounded-sm">&lt;&lt;</button>
                  <button className="bg-white text-slate-800 border border-slate-300 px-2 h-6 rounded-sm">&gt;&gt;</button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
                  <tr>
                    <th className="px-4 py-3 border-r border-slate-200 w-16 align-top">Status</th>
                    <th className="px-4 py-3 border-r border-slate-200 align-top">Case # <span className="text-rose-500 text-[10px]">▲</span><br/><span className="text-slate-600">Reporter</span></th>
                    <th className="px-4 py-3 border-r border-slate-200 align-top">Initial Receipt Date<br/><span className="text-slate-600">Country</span></th>
                    <th className="px-4 py-3 border-r border-slate-200 align-top">Products<br/><span className="text-slate-600">Events</span></th>
                    <th className="px-4 py-3 border-r border-slate-200 align-top">Report Type<br/><span className="text-slate-600">Pat Initials</span></th>
                    <th className="px-4 py-3 align-top">Project ID / Study ID<br/><span className="text-slate-600">Patient ID</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {searchResults.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500 font-medium">
                        No duplicate cases found. You can safely proceed with book-in.
                      </td>
                    </tr>
                  ) : (
                    searchResults.map((c, idx) => {
                      const eventsDesc = c.events?.map(e => e.event_description || e.entity_title || e.entity_code).join(', ') || 'UNKNOWN';
                      const rep = c.reporters?.[0];
                      const repName = rep?.first_name ? `${rep.first_name} ${rep.last_name || ''}` : 'UNKNOWN';
                      const rDate = c.receipt_date ? new Intl.DateTimeFormat('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).format(new Date(c.receipt_date)).toUpperCase().replace(/ /g, '-') : '-';
                      return (
                        <tr key={c.case_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-4 py-3 border-r border-slate-100 text-center"><Unlock size={18} className="text-amber-500 inline" /></td>
                          <td className="px-4 py-3 border-r border-slate-100 align-top">
                            <Link to={`/cases/${c.case_id}`} className="text-brand-primary font-bold hover:underline" target="_blank">{c.case_number}</Link>
                            <div className="text-slate-600 mt-1">{repName}</div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 align-top">
                            <span className="font-bold text-slate-800">{rDate}</span>
                            <div className="text-slate-600 mt-1">{c.case_country || rep?.country || 'UNKNOWN'}</div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 align-top">
                            <span className="font-bold text-slate-800">{c.products?.map(p => p.drug_name).join(', ') || '-'}</span>
                            <div className="text-slate-600 mt-1 max-w-xs truncate" title={eventsDesc}>{eventsDesc}</div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 align-top">
                            <span className="font-bold text-slate-800">{c.case_type || '-'}</span>
                            <div className="text-slate-600 mt-1">{c.patient?.patient_code || 'UNKNOWN'}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="font-bold text-slate-800">{c.project_id || c.study_id || '-'}</span>
                            <div className="text-slate-600 mt-1">{c.patient?.patient_id || 'UNKNOWN'}</div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-sm shadow-xl flex flex-col border border-slate-300">
            <div className="bg-brand-primary p-4 text-white flex justify-between items-center rounded-t-sm">
              <h3 className="font-bold flex items-center gap-2">
                <AlertCircle size={18} />
                Argus Safety - Case Creation -- Webpage Dialog
              </h3>
              <button onClick={handleModalNo} className="text-white/80 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Create Case</h2>
              <p className="text-slate-700 text-base leading-relaxed flex items-center gap-4">
                <span className="text-4xl">⚠️</span>
                You are about to book-in this case. Are you sure you wish to create and open the case?
              </p>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3 rounded-b-sm">
              <Button variant="outline" onClick={handleModalNo} className="rounded-sm px-6 font-bold bg-white">
                No
              </Button>
              <Button onClick={handleModalYes} className="rounded-sm px-8 font-bold shadow-sm">
                Yes
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Justification Dialog */}
      {showJustificationDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/10">
          <div className="bg-[#4a8a9a] border-2 border-emerald-600 shadow-lg w-[440px]">
            <div className="flex justify-between items-center px-2 py-1 border-b border-emerald-500 bg-[#4a8a9a]">
              <span className="text-white font-bold text-[11px] tracking-wide">Justification -- Webpage Dialog</span>
              <button onClick={() => setShowJustificationDialog(false)} className="bg-emerald-500 border border-white text-white rounded-[2px] w-[18px] h-[18px] flex items-center justify-center hover:bg-emerald-400 leading-none text-[12px] font-bold">✕</button>
            </div>
            <div className="bg-[#e4eff1] p-4 border-8 border-[#4a8a9a]">
              <div className="flex flex-col gap-3">
                <div className="text-[12px] text-black font-bold">Please enter a justification for performing this action:</div>
                <textarea 
                  className="w-full border-2 border-blue-400 h-28 text-sm p-2 bg-white text-black resize-none focus:outline-none focus:border-blue-500"
                  value={justificationDraft}
                  onChange={(e) => setJustificationDraft(e.target.value)}
                  autoFocus
                ></textarea>
                <div className="text-[12px] text-black font-bold">Select a standard justification for this field:</div>
                <select 
                  className="w-full border border-gray-400 h-7 text-sm bg-white text-black px-1"
                  value={standardJustification}
                  onChange={(e) => {
                    setStandardJustification(e.target.value);
                    if (e.target.value !== 'Not specified') {
                      setJustificationDraft(e.target.value);
                    }
                  }}
                >
                  <option>Not specified</option>
                  <option>Initial case entry</option>
                  <option>Case creation based on source document</option>
                  <option>Follow-up information received</option>
                  <option>Data correction</option>
                  <option>Medical review update</option>
                  <option>Quality control review</option>
                  <option>Regulatory requirement</option>
                </select>
                <div className="flex justify-end gap-2 mt-3">
                  <button className="w-24 py-1 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Spell Check</button>
                  <button 
                    onClick={() => {
                      setForm(p => ({ ...p, initialJustification: justificationDraft }));
                      setShowJustificationDialog(false);
                    }}
                    className="w-20 py-1 text-xs bg-white border-2 border-gray-500 text-gray-800 hover:bg-slate-50 shadow-sm font-bold"
                  >OK</button>
                  <button 
                    onClick={() => setShowJustificationDialog(false)}
                    className="w-20 py-1 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm"
                  >Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}