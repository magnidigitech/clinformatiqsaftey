import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import DrugAutocomplete from '../components/ui/DrugAutocomplete';
import IcdBrowserModal from '../components/IcdBrowserModal';
import { stripHtml } from '../utils/icdApi';
import { generateCiomsPdf, generateAdrPdf } from '../lib/pdf-generator';
import { getDueDate, getDueStatus, formatDueDate, getDueBadgeClasses, getDueLabel } from '../utils/dueDateUtils';

const HUMAN_READABLE_TABLES = {
  'spt_org_cases': 'Case General',
  'spt_org_event': 'Events',
  'spt_org_product': 'Products',
  'spt_org_cad': 'Patient',
  'spt_org_contact_log': 'Contacts',
  'spt_org_case_action_items': 'Action Items',
  'instructor_feedback': 'Instructor Feedback'
};

function toHumanReadableField(key) {
  return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function calculateDifferences(auditLogs) {
  const rows = [];
  
  auditLogs.forEach((log, index) => {
    const parentTable = HUMAN_READABLE_TABLES[log.table_name] || log.table_name;
    const revNumber = auditLogs.length - index;
    const userName = log.user ? `${log.user.full_name} (${log.user.username})` : 'System';
    
    let oldObj = {};
    let newObj = {};
    try { if (log.old_value) oldObj = JSON.parse(log.old_value); } catch(e) {}
    try { if (log.new_value) newObj = JSON.parse(log.new_value); } catch(e) {}
    
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    let changesFound = false;
    
    allKeys.forEach(key => {
      if (key === 'updated_at' || key === 'created_at' || key === 'lock_time' || key === 'locked_by' || key.endsWith('_id')) return;
      
      const oldVal = oldObj[key] !== undefined && oldObj[key] !== null ? String(oldObj[key]) : '';
      const newVal = newObj[key] !== undefined && newObj[key] !== null ? String(newObj[key]) : '';
      
      if (oldVal !== newVal) {
        changesFound = true;
        rows.push({
          parent: parentTable,
          field: toHumanReadableField(key),
          oldValue: oldVal,
          newValue: newVal,
          rev: revNumber,
          user: userName,
          time: new Date(log.changed_at).toLocaleString()
        });
      }
    });

    if (!changesFound && log.action === 'CREATE') {
       rows.push({ parent: parentTable, field: 'Record Created', oldValue: '', newValue: 'NEW', rev: revNumber, user: userName, time: new Date(log.changed_at).toLocaleString() });
    } else if (!changesFound && log.action === 'DELETE') {
       rows.push({ parent: parentTable, field: 'Record Deleted', oldValue: 'EXISTING', newValue: 'DELETED', rev: revNumber, user: userName, time: new Date(log.changed_at).toLocaleString() });
    }
  });
  
  return rows;
}

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const isReadOnly = caseData && user?.role !== 'ADMIN' ? ((caseData.locked_by != null && caseData.locked_by !== user?.username) || (caseData.assigned_to ? caseData.assigned_to !== user?.user_id : caseData.student_id !== user?.user_id)) : false;

  const [loading, setLoading] = useState(true);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState('Patient');
  const [activeSubTab, setActiveSubTab] = useState('Patient');
  const [productTabs, setProductTabs] = useState([
    { 
      id: 1, 
      name: '', 
      isDR: false,
      genericName: '',
      obtainCountry: '',
      formulation: '',
      authCountry: '',
      role: 'Suspect',
      datasheets: [
        { 
          name: 'Core Data Sheet', 
          licenses: [{ name: 'Global' }] 
        },
        { 
          name: 'USPI', 
          licenses: [{ name: 'US (Inv: 48,811)' }] 
        },
        { 
          name: 'SmPC', 
          licenses: [{ name: 'EU (Inv: )' }] 
        }
      ]
    }
  ]);
  const [activeProductTab, setActiveProductTab] = useState(1);
  const activeProduct = productTabs.find(p => p.id === activeProductTab) || {};

  const updateActiveProduct = (field, value) => {
    setProductTabs(prev => prev.map(p => {
      if (p.id === activeProductTab) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const updateActiveProductFields = (fields) => {
    setProductTabs(prev => prev.map(p => {
      if (p.id === activeProductTab) {
        return { ...p, ...fields };
      }
      return p;
    }));
  };

  const handleDeleteProductTab = (idToDelete) => {
    setProductTabs(prev => {
      const newTabs = prev.filter(t => t.id !== idToDelete);
      if (activeProductTab === idToDelete && newTabs.length > 0) {
        setActiveProductTab(newTabs[0].id);
      } else if (newTabs.length === 0) {
        setActiveProductTab(null);
      }
      return newTabs;
    });
  };

  const [eventTabs, setEventTabs] = useState([
    { 
      id: 1, 
      name: '', 
      descriptionReported: '',
      descriptionCoded: '',
      chapter: '',
      block: '',
      category: '',
      entity: '',
      entityCode: '',
      seriousnessCriteria: []
    }
  ]);

  // Map seriousness criteria keys to short abbreviations for the assessment table
  const SERIOUSNESS_ABBREV = {
    death: 'D',
    medically_significant: 'MS',
    hospitalized: 'H',
    life_threatening: 'LT',
    disability: 'DI',
    intervention_required: 'IR',
    other: 'OT',
    congenital_anomaly: 'CA'
  };

  const getSeriousnessAbbrev = (criteria = []) => {
    if (!criteria || criteria.length === 0) return '';
    return criteria.map(c => SERIOUSNESS_ABBREV[c] || c).join(', ');
  };
  const [activeEventTab, setActiveEventTab] = useState(1);
  const activeEvent = eventTabs.find(e => e.id === activeEventTab) || {};

  const updateActiveEvent = (field, value) => {
    setEventTabs(prev => prev.map(e => {
      if (e.id === activeEventTab) {
        return { ...e, [field]: value };
      }
      return e;
    }));
  };

  const handleDeleteEventTab = (idToDelete) => {
    setEventTabs(prev => {
      const newTabs = prev.filter(t => t.id !== idToDelete);
      if (activeEventTab === idToDelete && newTabs.length > 0) {
        setActiveEventTab(newTabs[0].id);
      } else if (newTabs.length === 0) {
        setActiveEventTab(null);
      }
      return newTabs;
    });
  };

  const [eventAssessments, setEventAssessments] = useState([]);

  const getAssessment = (productId, eventId, field) => {
    const assessment = eventAssessments.find(a => a.productId === productId && a.eventId === eventId);
    return assessment ? assessment[field] : '';
  };

  const updateAssessment = (productId, eventId, field, value) => {
    setEventAssessments(prev => {
      const existingIndex = prev.findIndex(a => a.productId === productId && a.eventId === eventId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], [field]: value };
        return updated;
      } else {
        return [...prev, { productId, eventId, [field]: value }];
      }
    });
  };

  const [reporterTabs, setReporterTabs] = useState([
    {
      id: 1, backendId: null,
      sal: '', firstName: '', middleName: '', lastName: '', suffix: '', hcp: '', occupation: '',
      address: '', institution: '', department: '', city: '', state: '', postalCode: '', country: '',
      phone: '', altPhone: '', fax: '', reporterId: '', reporterRef: '', email: '', reporterType: '',
      reportMedia: '', intermediary: '', protectConfidentiality: false, primaryReporter: false,
      correspondenceContact: false
    }
  ]);
  const [activeReporterTab, setActiveReporterTab] = useState(1);
  const activeReporter = reporterTabs.find(r => r.id === activeReporterTab) || {};

  const updateActiveReporter = (field, value) => {
    setReporterTabs(prev => prev.map(r => {
      if (r.id === activeReporterTab) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const handleDeleteReporterTab = (idToDelete) => {
    setReporterTabs(prev => {
      const newTabs = prev.filter(t => t.id !== idToDelete);
      if (activeReporterTab === idToDelete && newTabs.length > 0) {
        setActiveReporterTab(newTabs[0].id);
      } else if (newTabs.length === 0) {
        setActiveReporterTab(null);
      }
      return newTabs;
    });
  };

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

  const updateAttachment = (id, field, value) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const [references, setReferences] = useState([]);
  const [selectedReferenceId, setSelectedReferenceId] = useState(null);

  const handleAddReference = () => {
    const newRef = { id: Date.now(), type: '', refId: '', notes: '' };
    setReferences(prev => [...prev, newRef]);
    setSelectedReferenceId(newRef.id);
  };

  const handleDeleteReference = () => {
    if (selectedReferenceId) {
      setReferences(prev => prev.filter(r => r.id !== selectedReferenceId));
      setSelectedReferenceId(null);
    }
  };

  const updateReference = (id, field, value) => {
    setReferences(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleLinkCase = async (caseNumber) => {
    if (!caseNumber) return;
    try {
      const res = await api.get(`/cases/number/${caseNumber}`);
      if (res.data.success && res.data.data) {
        const linkedCase = res.data.data;
        const patient = linkedCase.patient;
        if (patient) {
          setForm(prev => ({
            ...prev,
            parentInitials: patient.patient_code || '',
            parentDob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '',
            parentAge: patient.age_value || '',
            parentAgeUnits: patient.age_unit || '',
            parentGender: patient.sex || '',
            parentWeight: patient.weight_kg || '',
            parentHeight: patient.height_cm || '',
            parentMedicalHistory: patient.medical_history || '',
          }));
          alert(`Parent details auto-filled from case ${caseNumber}`);
        } else {
          alert('Linked case has no patient details to copy.');
        }
      } else {
        alert('Case not found.');
      }
    } catch (err) {
      console.error('Failed to fetch linked case', err);
      alert('Error fetching linked case details.');
    }
  };

  // Contacts
  const [contacts, setContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);

  const handleAddContact = () => {
    const newContact = { id: Date.now(), date: '00-MMM-0000', dateSent: '00-MMM-0000', code: '', description: '', group: '', user: '' };
    setContacts(prev => [...prev, newContact]);
    setSelectedContactId(newContact.id);
  };

  const handleDeleteContact = () => {
    if (selectedContactId) {
      setContacts(prev => prev.filter(c => c.id !== selectedContactId));
      setSelectedContactId(null);
    }
  };

  const updateContact = (id, field, value) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // Action Items
  const [actionItems, setActionItems] = useState([]);
  const [selectedActionItemId, setSelectedActionItemId] = useState(null);

  const handleAddActionItem = () => {
    const newItem = { id: Date.now(), dateOpen: '00-MMM-0000', dateDue: '00-MMM-0000', dateCompleted: '00-MMM-0000', code: '', description: '', group: '', user: '' };
    setActionItems(prev => [...prev, newItem]);
    setSelectedActionItemId(newItem.id);
  };

  const handleDeleteActionItem = () => {
    if (selectedActionItemId) {
      setActionItems(prev => prev.filter(i => i.id !== selectedActionItemId));
      setSelectedActionItemId(null);
    }
  };

  const updateActionItem = (id, field, value) => {
    setActionItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  // Modal states
  const [isWhoDrugModalOpen, setIsWhoDrugModalOpen] = useState(false);
  const [isCompanyProductModalOpen, setIsCompanyProductModalOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printCioms, setPrintCioms] = useState(true);
  const [printAdr, setPrintAdr] = useState(false);
  const [printLayout, setPrintLayout] = useState(null);
  const [showCaseDetailsModal, setShowCaseDetailsModal] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  
  const uniqueRevs = Array.from(new Set(revisions.map(r => r.rev))).map(revNum => revisions.find(r => r.rev === revNum));

  const [hasValidationWarning, setHasValidationWarning] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showClosePrompt, setShowClosePrompt] = useState(false);
  const [showRoutePrompt, setShowRoutePrompt] = useState(false);
  
  const [orgUsers, setOrgUsers] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [routeComments, setRouteComments] = useState('');
  
  // Save modal state
  const [isSaving, setIsSaving] = useState(false);
  const [manualLock, setManualLock] = useState(false);

  // Example dummy state for the form
  const [form, setForm] = useState({
    caseReportType: '',
    caseCountry: '',
    caseReceiptDate: '',
    safetyReceiptDate: '',
    initialJustification: '',
    caseClassifications: [],
    followUps: [],
    // Study
    projectId: '',
    studyId: '',
    centerId: '',
    studyPhase: '',
    studyName: '',
    otherId: '',
    studyType: '',
    blindingStatus: '',
    studyDescription: '',
    unblindingDate: '',
    weekNum: '',
    visitNum: '',
    observeStudyType: '',

    // Patient Subtab
    sponsorIdentifier: '',
    patId: '',
    randomizationNum: '',
    patFirstName: '',
    patLastName: '',
    patInitials: '',
    patAddress: '',
    patCity: '',
    patCountry: '',
    patState: '',
    patPostalCode: '',
    patPhone: '',
    patProtectConfidentiality: false,
    childOnlyCase: false,
    
    patDob: '',
    patAge: '',
    patAgeUnits: '',
    patAgeGroup: '',
    patEthnicity: '',
    patOccupation: '',
    patWeight: '',
    patWeightUnits: '',
    patHeight: '',
    patHeightUnits: '',
    patGender: '',
    patPregnant: '',
    patDateOfLmp: '',
    patBreastfeeding: false,

    // Parent Subtab
    parentInitials: '',
    parentDob: '',
    parentAge: '',
    parentAgeUnits: '',
    parentGender: '',
    parentDateOfLmp: '',
    parentWeight: '',
    parentHeight: '',
    parentBreastfeeding: false,
    parentMedicalHistory: '',
    
    dueDate: '',
    weeksAtOnset: '',
    weeksAtExposure: '',
    trimesterFirst: false,
    trimesterSecond: false,
    trimesterThird: false,
    numOfFetus: '',
    prospective: false,
    retrospective: false,
    deliveryDate: '',
    deliveryWeight: '',
    apgar1: '',
    apgar2: '',
    apgar3: '',
    deliveryType: '',
    deliveryNotes: '',
    birthType: '',
    fetalOutcome: '',
  });

  useEffect(() => {
    setLoading(true);
    api.get(`/cases/${id}`).then(res => {
      const data = res.data?.data || res.data;
      setCaseData(data);
      
      // Hydrate core form fields
      setForm(prev => {
        const p = data.patient || {};
        return {
          ...prev,
          caseReceiptDate: data.receipt_date ? new Date(data.receipt_date).toISOString().split('T')[0] : prev.caseReceiptDate,
          safetyReceiptDate: data.aware_date ? new Date(data.aware_date).toISOString().split('T')[0] : prev.safetyReceiptDate,
          caseCountry: data.case_country || prev.caseCountry,
          caseReportType: data.case_type || prev.caseReportType,
          caseSerious: data.serious_flag === 'Y' ? 'Yes' : 'No',
          // Patient
          patInitials: p.patient_code || prev.patInitials,
          patDob: p.dob ? new Date(p.dob).toISOString().split('T')[0] : prev.patDob,
          patAge: p.age_value ? String(p.age_value) : prev.patAge,
          patAgeUnits: p.age_unit || prev.patAgeUnits,
          patGender: p.sex || prev.patGender,
          patWeight: p.weight_kg ? String(p.weight_kg) : prev.patWeight,
          patHeight: p.height_cm ? String(p.height_cm) : prev.patHeight,
          patEthnicity: p.ethnicity || prev.patEthnicity,
        };
      });
      
      // Hydrate Reporters
      if (data.reporters && data.reporters.length > 0) {
        const newTabs = data.reporters.map(r => ({
          id: r.reporter_id || Date.now() + Math.random(),
          backendId: r.reporter_id,
          sal: r.salutation || '',
          firstName: r.first_name || '',
          middleName: r.middle_name || '',
          lastName: r.last_name || '',
          suffix: r.suffix || '',
          hcp: r.health_care_professional || '',
          occupation: r.occupation || '',
          address: r.address || '',
          institution: r.institution || '',
          department: r.department || '',
          city: r.city || '',
          state: r.state || '',
          postalCode: r.postal_code || '',
          country: r.country || '',
          phone: r.phone_number || '',
          altPhone: r.alternate_phone || '',
          fax: r.fax_number || '',
          reporterId: r.reporter_identifier || '',
          reporterRef: r.reporter_reference || '',
          email: r.email_address || '',
          reporterType: r.reporter_type || '',
          reportMedia: r.report_media || '',
          intermediary: r.intermediary || '',
          protectConfidentiality: r.protect_confidentiality === 'Y',
          primaryReporter: r.primary_reporter === 'Y',
          correspondenceContact: r.correspondence_contact === 'Y'
        }));
        setReporterTabs(newTabs);
        setActiveReporterTab(newTabs[0].id);
      }
      
      // Hydrate Products
      if (data.products && data.products.length > 0) {
        setProductTabs(data.products.map(prod => ({
          id: prod.product_id,
          backendId: prod.product_id,
          name: prod.drug_name || '',
          genericName: '',
          role: 'Suspect',
          action: 'Unknown',
          indications: prod.indication ? [{ id: 1, reported: prod.indication, coded: '' }] : [],
          datasheets: [
            { name: 'Core Data Sheet', licenses: [{ name: 'Global' }] },
            { name: 'USPI', licenses: [{ name: 'US (Inv: 48,811)' }] },
            { name: 'SmPC', licenses: [{ name: 'EU (Inv: )' }] }
          ]
        })));
        setActiveProductTab(data.products[0].product_id);
      }

      // Hydrate Events
      if (data.events && data.events.length > 0) {
        setEventTabs(data.events.map(evt => {
          let criteria = [];
          if (evt.serious_criteria) {
            try { criteria = JSON.parse(evt.serious_criteria); } catch(e) { criteria = []; }
          }
          return {
            id: evt.event_id,
            backendId: evt.event_id,
            chapter: evt.chapter || '',
            block: evt.block || '',
            category: evt.category || '',
            entity: evt.entity_title || evt.entity_code || '',
            entityCode: evt.entity_code || '',
            descriptionCoded: evt.narrative || '',
            name: evt.entity_title || evt.entity_code || evt.narrative || 'Event',
            seriousnessCriteria: criteria
          };
        }));
        setActiveEventTab(data.events[0].event_id);
        
        const loadedAssessments = [];
        data.events.forEach(evt => {
          if (evt.causalities && evt.causalities.length > 0) {
            evt.causalities.forEach(c => {
               const prodId = data.products?.find(p => p.product_id === c.product_id)?.product_id || c.product_id;
               let parsedListedness = {};
               try {
                 if (c.listedness_data) parsedListedness = JSON.parse(c.listedness_data);
               } catch (e) {}
               
               loadedAssessments.push({
                  productId: prodId,
                  eventId: evt.event_id,
                  causalityReported: c.causality_reported || '',
                  causalityDetermined: c.causality_determined || '',
                  seriousness: c.seriousness || '',
                  ...parsedListedness
               });
            });
          }
        });
        if (loadedAssessments.length > 0) setEventAssessments(loadedAssessments);
      }
      
      // Hydrate Action Items
      if (data.action_items && data.action_items.length > 0) {
        setActionItems(data.action_items.map(item => ({
          id: item.action_id,
          backendId: item.action_id,
          dateOpen: item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).toUpperCase().replace(/ /g, '-') : '00-MMM-0000',
          dateDue: item.due_date ? new Date(item.due_date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).toUpperCase().replace(/ /g, '-') : '00-MMM-0000',
          dateCompleted: item.completed_at ? new Date(item.completed_at).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).toUpperCase().replace(/ /g, '-') : '00-MMM-0000',
          code: item.action_type || '',
          description: item.description || '',
          group: 'Data Entry',
          user: item.assigned_to ? String(item.assigned_to) : ''
        })));
      } else {
        setActionItems([]);
      }
      
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  const h = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const hc = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.checked }));

  // Case Classifications State
  const [selectedClasses, setSelectedClasses] = useState([]);
  const handleAddClassification = () => {
    setForm(p => ({
      ...p,
      caseClassifications: [...(p.caseClassifications || []), { id: Date.now(), text: '' }]
    }));
  };
  const handleDeleteClassification = () => {
    if (selectedClasses.length === 0) {
      alert("Please select at least one classification to delete.");
      return;
    }
    setForm(p => ({
      ...p,
      caseClassifications: (p.caseClassifications || []).filter(c => !selectedClasses.includes(c.id))
    }));
    setSelectedClasses([]);
  };

  // Follow-ups State
  const [selectedFollowUps, setSelectedFollowUps] = useState([]);
  const [showSignificantModal, setShowSignificantModal] = useState(false);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [activeJustificationRowId, setActiveJustificationRowId] = useState(null);
  const [justificationText, setJustificationText] = useState("");

  const handleAddFollowUpClick = () => {
    setShowSignificantModal(true);
  };

  const handleSignificantModalYes = () => {
    addFollowUpRow(true);
    setShowSignificantModal(false);
  };

  const handleSignificantModalNo = () => {
    addFollowUpRow(false);
    setShowSignificantModal(false);
  };

  const addFollowUpRow = (isSignificant) => {
    const newId = Date.now();
    setForm(p => ({
      ...p,
      followUps: [...(p.followUps || []), {
        id: newId,
        followUpReceived: '',
        safetyReceived: '00-MMM-0000',
        significant: isSignificant,
        dataCleanUp: false,
        justification: ''
      }]
    }));
  };

  const handleDeleteFollowUp = () => {
    if (selectedFollowUps.length === 0) {
      alert("Please select at least one follow-up to delete.");
      return;
    }
    setForm(p => ({
      ...p,
      followUps: (p.followUps || []).filter(f => !selectedFollowUps.includes(f.id))
    }));
    setSelectedFollowUps([]);
  };

  const updateFollowUp = (id, field, value) => {
    setForm(p => {
      const newFollowUps = [...(p.followUps || [])];
      const index = newFollowUps.findIndex(f => f.id === id);
      if (index !== -1) {
        newFollowUps[index] = { ...newFollowUps[index], [field]: value };
      }
      return { ...p, followUps: newFollowUps };
    });
  };

  const handlePatGenderChange = (e) => {
    const newGender = e.target.value;
    setForm(p => ({
      ...p,
      patGender: newGender,
      ...(newGender === 'Male' ? { patPregnant: '', patDateOfLmp: '' } : {})
    }));
  };

  const [labTests, setLabTests] = useState([]);

  const handleAddLabTest = () => {
    setLabTests(p => [...p, { id: Date.now(), reported: '', name: '', units: '', low: '', high: '', encoded: false }]);
  };

  const removeLabTest = (id) => {
    setLabTests(p => p.filter(t => t.id !== id));
  };

  const updateLabTest = (id, field, value) => {
    setLabTests(p => {
      const newTests = [...p];
      const index = newTests.findIndex(t => t.id === id);
      if (index !== -1) {
        newTests[index] = { ...newTests[index], [field]: value };
      }
      return newTests;
    });
  };

  const [dosageTabs, setDosageTabs] = useState([{ 
    id: 1, 
    name: 'New Regimen',
    startDate: '', stopDate: '', ongoing: false, outsideRange: false, duration: '',
    doseNumber: '', dose: '', doseUnits: '', frequency: '', doseDescription: '',
    dailyDosage: '', dailyDosageUnits: '', regimenDosage: '', regimenDosageUnits: '',
    patientRoute: '', parentRoute: '', accidentalExposure: '', packageId: '', batchLot: '', expirationDate: ''
  }]);
  const [activeDosageTab, setActiveDosageTab] = useState(1);

  const activeRegimen = dosageTabs.find(t => t.id === activeDosageTab) || dosageTabs[0];

  const updateDosageTab = (id, field, value) => {
    setDosageTabs(p => p.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  useEffect(() => {
    if (activeRegimen?.ongoing) {
      if (activeRegimen.stopDate !== '') updateDosageTab(activeDosageTab, 'stopDate', '');
      if (activeRegimen.duration !== '') updateDosageTab(activeDosageTab, 'duration', '');
    } else {
      if (activeRegimen?.startDate && activeRegimen?.stopDate) {
        const start = new Date(activeRegimen.startDate);
        const stop = new Date(activeRegimen.stopDate);
        if (!isNaN(start) && !isNaN(stop)) {
          const diffDays = Math.ceil(Math.abs(stop - start) / (1000 * 60 * 60 * 24));
          if (activeRegimen.duration !== String(diffDays)) {
            updateDosageTab(activeDosageTab, 'duration', String(diffDays));
          }
        }
      }
    }
  }, [activeRegimen?.ongoing, activeRegimen?.startDate, activeRegimen?.stopDate, activeDosageTab]);

  const [labDates, setLabDates] = useState([]);

  const handleAddDate = () => {
    setLabDates(p => [...p, { id: Date.now(), date: '' }]);
  };

  const updateLabDate = (id, newDate) => {
    setLabDates(p => p.map(d => d.id === id ? { ...d, date: newDate } : d));
  };

  const [productIndications, setProductIndications] = useState([]);
  const [activeIndicationId, setActiveIndicationId] = useState(null);
  const indicationsScrollRef = useRef(null);

  const handleAddProductIndication = () => {
    setProductIndications(p => [...p, { id: Date.now(), reported: '', coded: '' }]);
  };

  const handleDeleteProductIndication = () => {
    if (activeIndicationId) {
      setProductIndications(p => p.filter(ind => ind.id !== activeIndicationId));
      setActiveIndicationId(null);
    } else if (productIndications.length > 0) {
      setProductIndications(p => p.slice(0, -1));
    }
  };

  const scrollIndications = (direction) => {
    if (indicationsScrollRef.current) {
      const scrollAmount = 30;
      if (direction === 'up') {
        indicationsScrollRef.current.scrollTop -= scrollAmount;
      } else {
        indicationsScrollRef.current.scrollTop += scrollAmount;
      }
    }
  };

  const [showIcdBrowser, setShowIcdBrowser] = useState(false);
  const [icdSearchTerm, setIcdSearchTerm] = useState('');
  const [activeIcdContext, setActiveIcdContext] = useState(null); // { type: 'lab'|'event', id: ... }

  const openIcdBrowser = (type, id, searchTerm) => {
    setActiveIcdContext({ type, id });
    setIcdSearchTerm(searchTerm || '');
    setShowIcdBrowser(true);
  };

  const handleIcdSelect = (entity) => {
    if (!entity) {
      setShowIcdBrowser(false);
      return;
    }
    if (activeIcdContext) {
      const title = stripHtml(entity.title);
      const code = entity.theCode || entity.id.split('/').pop();
      
      if (activeIcdContext.type === 'lab') {
        updateLabTest(activeIcdContext.id, 'name', title);
        updateLabTest(activeIcdContext.id, 'encoded', true);
      } else if (activeIcdContext.type === 'indication') {
        setProductIndications(p => p.map(item => item.id === activeIcdContext.id ? { ...item, coded: title } : item));
      } else if (activeIcdContext.type === 'event') {
        setEventTabs(tabs => tabs.map(tab => {
          if (tab.id === activeIcdContext.id) {
            return {
              ...tab,
              chapter: entity.chapter || '',
              block: entity.block || '',
              category: entity.category || '',
              entity: title,
              entityCode: code,
              descriptionCoded: title,
              name: title
            };
          }
          return tab;
        }));
      }
    }
    setShowIcdBrowser(false);
  };

  const openJustificationModal = (id, currentText) => {
    setActiveJustificationRowId(id);
    setJustificationText(currentText || '');
    setShowJustificationModal(true);
  };

  const handleJustificationOk = () => {
    setForm(p => {
      const newFollowUps = [...(p.followUps || [])];
      const index = newFollowUps.findIndex(f => f.id === activeJustificationRowId);
      if (index !== -1) {
        newFollowUps[index].justification = justificationText;
      }
      return { ...p, followUps: newFollowUps };
    });
    setShowJustificationModal(false);
  };

  useEffect(() => {
    if (form.patAge) {
      const age = parseInt(form.patAge, 10);
      if (!isNaN(age)) {
        let group = '';
        if (age <= 12) group = 'Child';
        else if (age >= 13 && age <= 19) group = 'Teenager';
        else if (age >= 20 && age <= 64) group = 'Adult';
        else if (age >= 65) group = 'Elderly';

        if (form.patAgeGroup !== group) {
          setForm(p => ({ ...p, patAgeGroup: group }));
        }
      }
    }
  }, [form.patAge]);

  useEffect(() => {
    const handleSave = async () => {
      if (isReadOnly) {
        alert("This case is read-only. You do not have permission to edit it.");
        return;
      }
      if (!id) return;
      setIsSaving(true);
      try {
        // Save General Case Info
        await api.put(`/cases/${id}`, {
          receipt_date: form.caseReceiptDate,
          aware_date: form.safetyReceiptDate,
          case_type: form.caseReportType,
          serious_flag: form.caseSerious === 'Yes' ? 'Y' : 'N'
        });

        // Save Patient Info
        await api.post(`/cases/${id}/patient`, {
          patient_code: form.patInitials,
          dob: form.patDob,
          age_value: form.patAge,
          age_unit: form.patAgeUnits,
          sex: form.patGender,
          weight_kg: form.patWeight,
          height_cm: form.patHeight,
          ethnicity: form.patEthnicity
        });

        // Upsert Reporters
        for (const rep of reporterTabs) {
          const reporterPayload = {
            salutation: rep.sal || null,
            first_name: rep.firstName || null,
            middle_name: rep.middleName || null,
            last_name: rep.lastName || null,
            suffix: rep.suffix || null,
            health_care_professional: rep.hcp || null,
            occupation: rep.occupation || null,
            address: rep.address || null,
            institution: rep.institution || null,
            department: rep.department || null,
            city: rep.city || null,
            state: rep.state || null,
            postal_code: rep.postalCode || null,
            country: rep.country || null,
            phone_number: rep.phone || null,
            alternate_phone: rep.altPhone || null,
            fax_number: rep.fax || null,
            reporter_identifier: rep.reporterId || null,
            reporter_reference: rep.reporterRef || null,
            email_address: rep.email || null,
            reporter_type: rep.reporterType || null,
            report_media: rep.reportMedia || null,
            intermediary: rep.intermediary || null,
            protect_confidentiality: rep.protectConfidentiality ? 'Y' : 'N',
            primary_reporter: rep.primaryReporter ? 'Y' : 'N',
            correspondence_contact: rep.correspondenceContact ? 'Y' : 'N'
          };

          if (rep.backendId) {
            try {
              await api.put(`/cases/${id}/reporters/${rep.backendId}`, reporterPayload);
            } catch(e) {
              await api.post(`/cases/${id}/reporters`, reporterPayload);
            }
          } else {
            try {
              const res = await api.post(`/cases/${id}/reporters`, reporterPayload);
              rep.backendId = res.data.data?.reporter_id;
            } catch (e) {
              console.warn("Reporter save failed", e);
            }
          }
        }

        // Upsert Products
        for (const prod of productTabs) {
          if (prod.backendId) {
            await api.put(`/cases/${id}/products/${prod.backendId}`, {
              drug_name: prod.name || prod.genericName,
              indication: prod.indications && prod.indications.length > 0 ? prod.indications[0].reported : null
            });
          } else {
            try {
              const res = await api.post(`/cases/${id}/products`, {
                drug_name: prod.name || prod.genericName || 'Unknown Product',
                indication: prod.indications && prod.indications.length > 0 ? prod.indications[0].reported : null
              });
              prod.backendId = res.data.data.product_id;
            } catch (e) {
              console.warn("Product save failed", e);
            }
          }
        }

        // Upsert Events
        for (const evt of eventTabs) {
          // Compute causalities for this event
          const causalities = eventAssessments
            .filter(a => a.eventId === evt.id)
            .map(a => {
              const prod = productTabs.find(p => p.id === a.productId);
              if (!prod || !prod.backendId) return null;
              
              // Extract only listedness keys
              const listednessData = {};
              Object.keys(a).forEach(k => {
                if (k.startsWith('listedness-')) listednessData[k] = a[k];
              });
              
              return {
                product_id: prod.backendId,
                causality_reported: a.causalityReported || null,
                causality_determined: a.causalityDetermined || null,
                seriousness: a.seriousness || null,
                listedness_data: Object.keys(listednessData).length > 0 ? JSON.stringify(listednessData) : null
              };
            })
            .filter(Boolean);

          if (evt.backendId) {
            await api.put(`/cases/${id}/events/${evt.backendId}`, {
              chapter: evt.chapter || null,
              block: evt.block || null,
              category: evt.category || null,
              entity_title: evt.entity || null,
              entity_code: evt.entityCode || null,
              narrative: evt.descriptionCoded,
              serious_criteria: evt.seriousnessCriteria && evt.seriousnessCriteria.length > 0 ? JSON.stringify(evt.seriousnessCriteria) : null,
              causalities
            });
          } else {
            try {
              const res = await api.post(`/cases/${id}/events`, {
                chapter: evt.chapter || null,
                block: evt.block || null,
                category: evt.category || null,
                entity_title: evt.entity || 'Unknown Entity',
                entity_code: evt.entityCode || null,
                narrative: evt.descriptionCoded,
                serious_criteria: evt.seriousnessCriteria && evt.seriousnessCriteria.length > 0 ? JSON.stringify(evt.seriousnessCriteria) : null,
                causalities
              });
              evt.backendId = res.data.data.event_id;
            } catch (e) {
              console.warn("Event save failed", e);
            }
          }
        }

        // Upsert Action Items
        for (const item of actionItems) {
          if (!item.code && !item.description) continue;
          
          if (item.backendId) {
            await api.put(`/cases/${id}/action-items/${item.backendId}`, {
              action_type: item.code || 'Follow-up',
              description: item.description,
              due_date: item.dateDue && item.dateDue !== '00-MMM-0000' ? item.dateDue : null,
              status: item.dateCompleted && item.dateCompleted !== '00-MMM-0000' ? 'COMPLETED' : 'OPEN',
              completed_at: item.dateCompleted && item.dateCompleted !== '00-MMM-0000' ? item.dateCompleted : null,
            });
          } else {
            try {
              const res = await api.post(`/cases/${id}/action-items`, {
                action_type: item.code || 'Follow-up',
                description: item.description,
                due_date: item.dateDue && item.dateDue !== '00-MMM-0000' ? item.dateDue : null,
                status: item.dateCompleted && item.dateCompleted !== '00-MMM-0000' ? 'COMPLETED' : 'OPEN',
                completed_at: item.dateCompleted && item.dateCompleted !== '00-MMM-0000' ? item.dateCompleted : null,
              });
              item.backendId = res.data.data.action_id;
            } catch (e) {
              console.warn("Action Item save failed", e);
            }
          }
        }

        setIsSaving(false);
        window.dispatchEvent(new CustomEvent('save_success'));
      } catch (err) {
        console.error("Save error:", err);
        setIsSaving(false);
        alert("Error saving case to database: " + (err.response?.data?.message || err.message));
      }
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

    const handleValidationCheck = () => {
      const errors = [];
      if (!form.caseReceiptDate) errors.push("GENERAL: Initial Receipt Date is required.");
      if (!form.caseCountry) errors.push("GENERAL: Case Country is required.");
      if (!form.patId && !form.patInitials && !form.patFirstName) errors.push("PATIENT: Patient ID, Initials, or Name is required.");
      
      if (productTabs.length === 0) {
        errors.push("PRODUCTS: At least one Suspect Product is required.");
      } else {
        productTabs.forEach((p, idx) => {
          if (!p.name) errors.push(`PRODUCTS: Product Name is required (Product ${idx + 1}).`);
        });
      }

      if (eventTabs.length === 0) {
        errors.push("EVENTS: At least one Event is required.");
      } else {
        eventTabs.forEach((e, idx) => {
          if (!e.description) errors.push(`EVENTS: Event Description is required (Event ${idx + 1}).`);
        });
      }

      setValidationErrors(errors);
      setHasValidationWarning(errors.length > 0);
      setShowValidationModal(true);
    };

    const handleCloseCase = () => {
      if (!caseData) return;
      if (isReadOnly) {
        alert("This case is read-only. You cannot close it.");
        return;
      }
      if (caseData.workflow_state !== 'QC_COMPLETED' && caseData.assigned_to !== user?.user_id) {
        alert("You cannot close this case. It must be routed for QC.");
        return;
      }
      setShowClosePrompt(true);
    };

    const handleRouteCase = () => {
      if (isReadOnly) {
        alert("This case is read-only. You cannot route it.");
        return;
      }
      setShowRoutePrompt(true);
      api.get('/users/org').then(res => {
        setOrgUsers(res.data.data);
      }).catch(err => console.error("Failed to fetch org users:", err));
    };

    const handleLockCase = async () => {
      try {
        await api.post(`/cases/${id}/lock`);
        alert("Case locked successfully. Other users can no longer see or edit this case.");
        setCaseData(p => ({...p, locked_by: user.username}));
        setManualLock(true);
      } catch (err) {
        console.error("Failed to lock case:", err);
        alert("Failed to lock case.");
      }
    };

    if (!isReadOnly && caseData && !caseData.locked_by && id) {
      api.post(`/cases/${id}/lock`).then(() => {
        setCaseData(p => ({...p, locked_by: user.username}));
      }).catch(err => console.error("Auto-lock failed", err));
    }

    window.addEventListener('save_case', handleSave);
    window.addEventListener('print_case', handlePrint);
    window.addEventListener('print_medical_summary', handlePrintMedicalSummary);
    window.addEventListener('view_case_revisions', handleViewRevisions);
    window.addEventListener('validation_check', handleValidationCheck);
    window.addEventListener('close_case', handleCloseCase);
    window.addEventListener('route_case', handleRouteCase);
    window.addEventListener('lock_case', handleLockCase);
    return () => {
      // Auto-unlock when leaving if we locked it
      if (!isReadOnly && caseData && !caseData.locked_by && id) {
        api.post(`/cases/${id}/unlock`).catch(err => console.error("Auto-unlock failed", err));
      }
      window.removeEventListener('save_case', handleSave);
      window.removeEventListener('print_case', handlePrint);
      window.removeEventListener('print_medical_summary', handlePrintMedicalSummary);
      window.removeEventListener('view_case_revisions', handleViewRevisions);
      window.removeEventListener('validation_check', handleValidationCheck);
      window.removeEventListener('close_case', handleCloseCase);
      window.removeEventListener('route_case', handleRouteCase);
      window.removeEventListener('lock_case', handleLockCase);
    };
  }, [id, form, reporterTabs, productTabs, eventTabs, actionItems, references, contacts, labTests, labDates, isReadOnly, caseData, user]);

  useEffect(() => {
    if (printLayout) {
      const timer = setTimeout(() => {
        window.print();
        setPrintLayout(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [printLayout]);

  useEffect(() => {
    if (showCaseDetailsModal && id) {
      setLoadingRevisions(true);
      api.get(`/cases/${id}/revisions`).then(res => {
        const rawLogs = res.data?.data || [];
        const parsedRows = calculateDifferences(rawLogs);
        setRevisions(parsedRows);
      }).catch(err => {
        console.error("Error fetching revisions:", err);
        setRevisions([]);
      }).finally(() => {
        setLoadingRevisions(false);
      });
    }
  }, [showCaseDetailsModal, id]);


  const caseTabs = [
    'General', 'Patient', 'Products', 'Events', 'Analysis', 'Activities', 'Additional Info'
  ];

  const getDisplayStatus = (state) => {
    if (!state || state === 'DRAFT') return 'Data Entry';
    if (state === 'PENDING_QC') return 'QC';
    if (state === 'QC_COMPLETED') return 'QC Completed';
    if (state === 'CLOSED') return 'Closed';
    return state;
  };

  // Shared classes
  const inp = "h-7 border border-slate-200 rounded px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 w-full transition-all duration-150";
  const sel = "h-7 border border-slate-200 rounded px-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 w-full appearance-none transition-all duration-150";
  const lbl = "text-[11px] font-semibold text-slate-600 leading-tight mb-0.5";
  const secHeader = "bg-gradient-to-r from-slate-50 to-slate-100/80 text-slate-700 px-3 py-1.5 text-xs font-bold border-b border-slate-200 flex justify-between items-center";

  return (
    <>
    <div className="min-h-full bg-slate-50/50 flex flex-col font-sans text-[12px] print:hidden">
      {/* ===== Case Title Bar ===== */}
      <div className="px-4 py-2.5 flex justify-between items-center bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-lg leading-none">{caseData?.locked_by ? '🔒' : '🔓'}</span>
          <h1 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            CaseForm - {caseData?.case_number || '2010NA000028'} {form.studyId} "JY"
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          {caseData?.student && (
            <span className="ml-2 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
              Creator: {caseData.student.full_name}
            </span>
          )}
          <span className="ml-2">Case Status :</span> 
          <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
            <span className="text-gray-500">📋</span> {getDisplayStatus(caseData?.workflow_state)}
            {hasValidationWarning && (
              <div 
                className="w-2.5 h-2.5 bg-orange-400 border border-orange-500 cursor-pointer ml-1.5 rounded-full shadow-sm animate-pulse"
                onDoubleClick={() => setShowValidationModal(true)}
                title="Double-click to view validations"
              ></div>
            )}
          </span>
          {(() => {
            const { dueDate, phase } = getDueDate(caseData);
            const status = getDueStatus(dueDate);
            if (!dueDate) return null;
            return (
              <span className={`ml-2 flex items-center gap-1.5 border px-2 py-1 rounded-md font-bold ${getDueBadgeClasses(status)}`}>
                <span>⏰</span>
                <span>Due: {formatDueDate(dueDate)}</span>
                <span className="text-[10px] font-normal">({phase})</span>
                {status === 'overdue' && <span className="text-[10px] font-bold animate-pulse">OVERDUE</span>}
                {status === 'due-today' && <span className="text-[10px] font-bold">TODAY</span>}
              </span>
            );
          })()}
        </div>
      </div>

      {/* ===== Form Tabs ===== */}
      <div className="flex items-end px-4 pt-1.5 bg-white border-b border-slate-200 relative z-0">
        <div className="flex flex-1 gap-0.5">
          {caseTabs.map((tab, i) => (
            <div key={i} onClick={() => {
              setActiveTab(tab);
              if (tab === 'Patient') setActiveSubTab('Patient');
              if (tab === 'Events') setActiveSubTab('Event');
              if (tab === 'Analysis') setActiveSubTab('Case Analysis');
            }} className={cn("px-4 py-1.5 text-xs border border-slate-200 border-b-0 rounded-t-md cursor-pointer whitespace-nowrap transition-colors duration-150",
              tab === activeTab ? "bg-white font-bold text-slate-800 border-b-white z-10 translate-y-[1px] shadow-sm" : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700")}>
              {tab}
            </div>
          ))}
        </div>
        {/* Status Indicators */}
        <div className="absolute right-4 bottom-1 flex items-center gap-6 text-[10px] font-bold">
          <div className="flex items-center gap-1">
            
          </div>
          
        </div>
      </div>

      {/* Sub Tabs for Patient */}
      {activeTab === 'Patient' && (
        <div className="flex px-4 pt-1 pb-1.5 bg-slate-50/50 gap-1 border-b border-slate-200">
          <div onClick={() => setActiveSubTab('Patient')} className={cn("px-4 py-0.5 text-[11px] font-bold border border-gray-300 cursor-pointer shadow-sm rounded-t-sm", activeSubTab === 'Patient' ? "bg-white text-slate-800 border-b-white z-10 translate-y-[1px] shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200/60")}>
            Patient
          </div>
          <div onClick={() => setActiveSubTab('Parent')} className={cn("px-4 py-0.5 text-[11px] font-bold border border-gray-300 cursor-pointer shadow-sm rounded-t-sm", activeSubTab === 'Parent' ? "bg-white text-slate-800 border-b-white z-10 translate-y-[1px] shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200/60")}>
            Parent
          </div>
        </div>
      )}

      {/* Sub Tabs for Products */}
      {activeTab === 'Products' && (
        <div className="flex px-4 pt-1 pb-1.5 bg-slate-50/50 gap-1 border-b border-slate-200 items-end">
          {productTabs.map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveProductTab(tab.id)}
              className={cn(
                "px-3 py-0.5 text-[10px] font-bold border border-gray-400 cursor-pointer shadow-sm rounded-t-sm flex gap-1 items-center",
                activeProductTab === tab.id 
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 z-10 translate-y-[1px] shadow-sm" 
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200/60"
              )}
            >
              <span>{tab.name || '(Empty)'}</span>
              {tab.isDR && <span className="bg-white border border-gray-400 px-0.5 text-[8px] text-amber-600">DR</span>}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProductTab(tab.id);
                }}
                className={cn(
                  "ml-1 w-3 h-3 flex items-center justify-center rounded-sm hover:bg-black/10 transition-colors",
                  activeProductTab === tab.id ? "text-black" : "text-gray-500"
                )}
                title="Delete Tab"
              >
                ✕
              </button>
            </div>
          ))}
          <div 
            onClick={() => {
              const newId = Date.now();
              setProductTabs([...productTabs, { 
                id: newId, 
                name: 'New Product', 
                isDR: false,
                genericName: '',
                obtainCountry: '',
                formulation: '',
                authCountry: ''
              }]);
              setActiveProductTab(newId);
            }}
            className="px-6 py-0.5 text-[9px] bg-white text-gray-500 border border-gray-400 rounded-t-sm cursor-pointer hover:bg-gray-100"
          >
            (New)
          </div>
          <div className="ml-auto flex gap-1">
            <button className="h-5 w-5 bg-white border border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-500 hover:bg-slate-50 transition-colors">&lt;</button>
            <button className="h-5 w-5 bg-white border border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-500 hover:bg-slate-50 transition-colors">&gt;</button>
          </div>
        </div>
      )}

      {/* Sub Tabs for Events */}
      {activeTab === 'Events' && (
        <div className="flex px-4 pt-1 pb-1.5 bg-slate-50/50 gap-1 border-b border-slate-200 items-end">
          <div onClick={() => setActiveSubTab('Event')} className={cn("px-4 py-0.5 text-[11px] font-bold border border-gray-300 cursor-pointer shadow-sm rounded-t-sm", activeSubTab === 'Event' ? "bg-white text-slate-800 border-b-white z-10 translate-y-[1px] shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200/60")}>
            Event
          </div>
          <div onClick={() => setActiveSubTab('Event Assessment')} className={cn("px-4 py-0.5 text-[11px] font-bold border border-gray-300 cursor-pointer shadow-sm rounded-t-sm", activeSubTab === 'Event Assessment' ? "bg-white text-slate-800 border-b-white z-10 translate-y-[1px] shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200/60")}>
            Event Assessment
          </div>
          {activeSubTab === 'Event Assessment' && (
            <div className="ml-auto flex gap-1 pb-0.5 pr-4">
              <button className="h-[18px] px-3 text-[10px] bg-white border border-gray-400 text-blue-700 shadow-sm hover:bg-gray-50">Recalculate</button>
            </div>
          )}
        </div>
      )}

      {/* Sub Tabs for Analysis */}
      {activeTab === 'Analysis' && (
        <div className="flex px-4 pt-1 pb-1.5 bg-slate-50/50 gap-1 border-b border-slate-200 items-end">
          {['Case Analysis', 'MedWatch Info'].map(subTab => (
            <div key={subTab} onClick={() => setActiveSubTab(subTab)} className={cn("px-4 py-0.5 text-[11px] font-bold border border-gray-300 cursor-pointer shadow-sm rounded-t-sm", activeSubTab === subTab ? "bg-white text-slate-800 border-b-white z-10 translate-y-[1px] shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200/60")}>
              {subTab}
            </div>
          ))}
        </div>
      )}

      {/* ===== Main Content ===== */}
      <div className="flex-1 p-2 overflow-y-auto">
        <fieldset disabled={isReadOnly} className="bg-white border border-gray-300 p-1 space-y-2 min-h-full">

          {activeTab === 'General' && (
            <>
              {/* ======== General Information ======== */}
              <div className="border border-gray-300 shadow-sm rounded-sm overflow-hidden">
                <div className={secHeader}>General Information</div>
                <div className="p-2 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={lbl}>Case Report Type</label><input className={inp} value={form.caseReportType} onChange={h('caseReportType')} /></div>
                      <div><label className={lbl}>Case Country</label><input className={inp} value={form.caseCountry} onChange={h('caseCountry')} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div><label className={lbl}>Case Receipt Date</label><input type="date" className={inp} value={form.caseReceiptDate} onChange={h('caseReceiptDate')} /></div>
                      <div><label className={lbl}>Safety Receipt Date</label><input type="date" className={inp} value={form.safetyReceiptDate} onChange={h('safetyReceiptDate')} /></div>
                      <div className="flex items-end gap-1">
                        <div className="flex-1"><label className={lbl}>Initial Justification</label><input className={cn(inp, "bg-slate-50")} value={form.initialJustification} onChange={h('initialJustification')} /></div>
                        <span className="w-3 h-3 bg-green-500 rounded-full shrink-0 mb-[3px] shadow-sm"></span>
                      </div>
                    </div>

                    {/* Follow-ups Table */}
                    <div className="border border-gray-300 mt-2">
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 px-2 py-0.5 text-[10px] font-bold flex justify-between items-center border-b border-emerald-100">
                        <span>Follow-ups ({(form.followUps || []).length})</span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer font-normal"><input type="checkbox" className="accent-white w-2.5 h-2.5" />Case Requires Follow-up</label>
                          <div className="flex gap-0.5">
                            <button onClick={handleAddFollowUpClick} className="h-[16px] px-2 text-[9px] bg-gray-100 text-black border border-gray-400 hover:bg-gray-200">Add</button>
                            <button onClick={handleDeleteFollowUp} className="h-[16px] px-2 text-[9px] bg-gray-100 text-black border border-gray-400 hover:bg-gray-200">Delete</button>
                          </div>
                        </div>
                      </div>
                      <div className="h-[100px] bg-white overflow-y-auto">
                        <table className="w-full text-[9px] text-left border-collapse">
                          <thead>
                            <tr className="bg-emerald-50 border-b border-slate-200 text-emerald-700">
                              <th className="px-1 py-0.5 w-8 border-r border-slate-200 text-center font-normal">#</th>
                              <th className="px-1 py-0.5 border-r border-slate-200 font-normal">Follow-up Received <span className="text-amber-500">▼</span></th>
                              <th className="px-1 py-0.5 border-r border-slate-200 font-normal">Safety Received</th>
                              <th className="px-1 py-0.5 border-r border-slate-200 font-normal text-center">Significant</th>
                              <th className="px-1 py-0.5 border-r border-slate-200 font-normal text-center">Data Clean Up</th>
                              <th className="px-1 py-0.5 font-normal">Follow up Justification</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(form.followUps || []).map((item, idx) => (
                              <tr key={item.id} className={idx % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                                <td className="px-1 py-1 border-b border-slate-200 border-r border-slate-200 text-center align-middle font-bold text-gray-800">
                                  <label className="flex items-center justify-center cursor-pointer gap-1 text-[10px]">
                                    <input type="checkbox" className="w-2.5 h-2.5"
                                      checked={selectedFollowUps.includes(item.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedFollowUps([...selectedFollowUps, item.id]);
                                        else setSelectedFollowUps(selectedFollowUps.filter(id => id !== item.id));
                                      }}
                                    />
                                    {idx + 1}
                                  </label>
                                </td>
                                <td className="px-1 py-1 border-b border-slate-200 border-r border-slate-200">
                                  <input className={cn(inp, "h-[16px] w-[80px]")} value={item.followUpReceived} onChange={(e) => updateFollowUp(item.id, 'followUpReceived', e.target.value)} />
                                </td>
                                <td className="px-1 py-1 border-b border-slate-200 border-r border-slate-200">
                                  <input className={cn(inp, "h-[16px] w-[70px]")} value={item.safetyReceived} onChange={(e) => updateFollowUp(item.id, 'safetyReceived', e.target.value)} />
                                </td>
                                <td className="px-1 py-1 border-b border-slate-200 border-r border-slate-200 text-center">
                                  <input type="checkbox" className="w-3 h-3" checked={item.significant} onChange={(e) => updateFollowUp(item.id, 'significant', e.target.checked)} />
                                </td>
                                <td className="px-1 py-1 border-b border-slate-200 border-r border-slate-200 text-center">
                                  <input type="checkbox" className="w-3 h-3" checked={item.dataCleanUp} onChange={(e) => updateFollowUp(item.id, 'dataCleanUp', e.target.checked)} />
                                </td>
                                <td className="px-1 py-1 border-b border-slate-200">
                                  <div className="flex items-center gap-1">
                                    <input className={cn(inp, "h-[16px] flex-1 bg-slate-50")} value={item.justification} readOnly />
                                    <button 
                                      onClick={() => openJustificationModal(item.id, item.justification)}
                                      className="w-3 h-3 rounded-full bg-green-500 border border-green-700 shadow-sm shrink-0"
                                      title="Add Justification"
                                    ></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Case Classification Table */}
                  <div className="pt-2 h-full">
                    <div className="border border-gray-300 h-full flex flex-col bg-white overflow-hidden">
                      <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left text-[10px]">
                          <thead className="sticky top-0 bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800">
                            <tr className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 border-b border-emerald-100">
                              <th className="px-1 py-0.5 w-12 text-center font-normal border-r border-emerald-100">#</th>
                              <th className="px-1 py-0.5 font-bold flex justify-between items-center">
                                Classification
                                <div className="flex gap-0.5">
                                  <button onClick={handleAddClassification} className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400 hover:bg-gray-200 shadow-sm leading-none">Add</button>
                                  <button onClick={handleDeleteClassification} className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400 hover:bg-gray-200 shadow-sm leading-none">Delete</button>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(form.caseClassifications || []).map((item, idx) => (
                              <tr key={item.id} className={idx % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                                <td className="px-1 py-1 border-b border-gray-300 border-r border-slate-200 text-center align-top pt-[5px]">
                                  <label className="flex items-center justify-center cursor-pointer gap-1 text-gray-700 font-normal text-[10px]">
                                    <input type="checkbox" className="w-2.5 h-2.5" 
                                      checked={selectedClasses.includes(item.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedClasses([...selectedClasses, item.id]);
                                        else setSelectedClasses(selectedClasses.filter(id => id !== item.id));
                                      }}
                                    />
                                    {idx + 1}.
                                  </label>
                                </td>
                                <td className="px-1 py-1 border-b border-gray-300">
                                  <input 
                                    className="h-[18px] border border-slate-200 px-1 text-[11px] bg-white focus:outline-none focus:border-blue-500 w-full"
                                    value={item.text}
                                    onChange={(e) => {
                                      const newClasses = [...form.caseClassifications];
                                      const index = newClasses.findIndex(c => c.id === item.id);
                                      if (index !== -1) {
                                        newClasses[index].text = e.target.value;
                                        setForm(p => ({ ...p, caseClassifications: newClasses }));
                                      }
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ======== Study Information ======== */}
              <div className="border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                <div className={secHeader}>
                  <div className="flex items-center gap-2">Study Information <button className="h-[16px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400 font-normal hover:bg-gray-200 flex items-center gap-1 shadow-sm"><span className="text-amber-500">📂</span> Select</button></div>
                  <button className="w-3 h-3 bg-slate-50 text-black text-[8px] flex items-center justify-center font-bold border border-gray-400 shadow-sm">−</button>
                </div>
                <div className="p-2 bg-white">
                  <div className="grid grid-cols-4 gap-2 mb-1">
                    <div><label className={lbl}>Project ID</label><input className={inp} value={form.projectId} onChange={h('projectId')} /></div>
                    <div><label className={lbl}>Study ID</label><input className={inp} value={form.studyId} onChange={h('studyId')} /></div>
                    <div><label className={lbl}>Center ID</label><input className={inp} value={form.centerId} onChange={h('centerId')} /></div>
                    <div><label className={lbl}>Study Phase</label><input className={inp} value={form.studyPhase} onChange={h('studyPhase')} /></div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-1">
                    <div className="col-span-1"><label className={lbl}>Study Name</label><input className={inp} value={form.studyName} onChange={h('studyName')} /></div>
                    <div><label className={lbl}>Other ID</label><input className={inp} value={form.otherId} onChange={h('otherId')} /></div>
                    <div><label className={lbl}>Study Type</label><select className={cn(sel, "bg-gray-100 text-gray-500")} disabled value={form.studyType}><option>{form.studyType}</option></select></div>
                    <div><label className={lbl}>Blinding Status</label><select className={sel} value={form.blindingStatus} onChange={h('blindingStatus')}><option>{form.blindingStatus}</option></select></div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-2 row-span-2 flex flex-col">
                      <label className={lbl}>Study Description</label>
                      <textarea className={cn(inp, "h-full min-h-[46px] resize-none leading-tight py-1 bg-white")} value={form.studyDescription} onChange={h('studyDescription')} />
                    </div>
                    <div><label className={lbl}>Unblinding Date</label><input type="date" className={inp} value={form.unblindingDate} onChange={h('unblindingDate')} /></div>
                    <div className="flex gap-2">
                      <div className="flex-1"><label className={lbl}>Week #</label><input className={inp} value={form.weekNum} onChange={h('weekNum')} /></div>
                      <div className="flex-1"><label className={lbl}>Visit #</label><input className={inp} value={form.visitNum} onChange={h('visitNum')} /></div>
                    </div>
                    <div className="col-start-3 col-span-2 mt-[-20px]"><label className={lbl}>Observe Study Type</label><select className={sel} value={form.observeStudyType} onChange={h('observeStudyType')}><option>{form.observeStudyType}</option></select></div>
                  </div>
                </div>
              </div>

              {/* ======== Reporter Information ======== */}
              <div className="border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                <div className={secHeader}>
                  <div className="flex items-center gap-2">Reporter Information (1) <button className="h-[16px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400 font-normal hover:bg-gray-200 flex items-center gap-1 shadow-sm"><span className="text-amber-500">📂</span> Select</button></div>
                  <div className="flex items-center gap-2">
                    
                    <button className="w-3 h-3 bg-slate-50 text-black text-[8px] flex items-center justify-center font-bold border border-gray-400 shadow-sm">−</button>
                  </div>
                </div>
                <div className="p-2 bg-white">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      {/* Row 1 */}
                      <div className="flex gap-2">
                        <div className="w-10"><label className={lbl}>Sal.</label><input className={inp} value={activeReporter.sal || ''} onChange={(e) => updateActiveReporter('sal', e.target.value)} /></div>
                        <div className="flex-1"><label className={lbl}>First Name</label><input className={inp} value={activeReporter.firstName || ''} onChange={(e) => updateActiveReporter('firstName', e.target.value)} /></div>
                        <div className="w-16"><label className={lbl}>Middle Name</label><input className={inp} value={activeReporter.middleName || ''} onChange={(e) => updateActiveReporter('middleName', e.target.value)} /></div>
                        <div className="flex-1"><label className={lbl}>Last Name</label><input className={inp} value={activeReporter.lastName || ''} onChange={(e) => updateActiveReporter('lastName', e.target.value)} /></div>
                        <div className="w-12"><label className={lbl}>Suffix</label><input className={inp} value={activeReporter.suffix || ''} onChange={(e) => updateActiveReporter('suffix', e.target.value)} /></div>
                        <div className="w-32"><label className={lbl}>Health Care Professional</label><select className={sel} value={activeReporter.hcp || ''} onChange={(e) => updateActiveReporter('hcp', e.target.value)}><option></option><option>Yes</option><option>No</option><option>Unk</option></select></div>
                        <div className="w-32"><label className={lbl}>Occupation</label><input className={inp} value={activeReporter.occupation || ''} onChange={(e) => updateActiveReporter('occupation', e.target.value)} /></div>
                      </div>
                      {/* Row 2 */}
                      <div className="flex gap-2">
                        <div className="w-1/2 pr-2">
                          <label className={lbl}>Address</label>
                          <textarea className={cn(inp, "h-[62px] resize-none w-full")} value={activeReporter.address || ''} onChange={(e) => updateActiveReporter('address', e.target.value)} />
                        </div>
                        <div className="w-1/2 space-y-1">
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className={lbl}>Institution</label><input className={inp} value={activeReporter.institution || ''} onChange={(e) => updateActiveReporter('institution', e.target.value)} /></div>
                            <div><label className={lbl}>Department</label><input className={inp} value={activeReporter.department || ''} onChange={(e) => updateActiveReporter('department', e.target.value)} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className={lbl}>City</label><input className={inp} value={activeReporter.city || ''} onChange={(e) => updateActiveReporter('city', e.target.value)} /></div>
                            <div><label className={lbl}>State/Province</label><input className={inp} value={activeReporter.state || ''} onChange={(e) => updateActiveReporter('state', e.target.value)} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className={lbl}>Postal Code</label><input className={inp} value={activeReporter.postalCode || ''} onChange={(e) => updateActiveReporter('postalCode', e.target.value)} /></div>
                            <div><label className={lbl}>Country</label><input className={inp} value={activeReporter.country || ''} onChange={(e) => updateActiveReporter('country', e.target.value)} /></div>
                          </div>
                        </div>
                      </div>
                      {/* Row 3 */}
                      <div className="grid grid-cols-4 gap-2">
                        <div><label className={lbl}>Phone Number</label><input className={inp} value={activeReporter.phone || ''} onChange={(e) => updateActiveReporter('phone', e.target.value)} /></div>
                        <div><label className={lbl}>Alternate Phone</label><input className={inp} value={activeReporter.altPhone || ''} onChange={(e) => updateActiveReporter('altPhone', e.target.value)} /></div>
                        <div><label className={lbl}>FAX Number</label><input className={inp} value={activeReporter.fax || ''} onChange={(e) => updateActiveReporter('fax', e.target.value)} /></div>
                        <div><label className={lbl}>Reporter ID</label><input className={inp} value={activeReporter.reporterId || ''} onChange={(e) => updateActiveReporter('reporterId', e.target.value)} /></div>
                      </div>
                      {/* Row 4 */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-2"><label className={lbl}>Email Address</label><input className={inp} value={activeReporter.email || ''} onChange={(e) => updateActiveReporter('email', e.target.value)} /></div>
                        <div><label className={lbl}>Reporter Type</label><input className={inp} value={activeReporter.reporterType || ''} onChange={(e) => updateActiveReporter('reporterType', e.target.value)} /></div>
                        <div><label className={lbl}>Reporter's Reference #</label><input className={inp} value={activeReporter.reporterRef || ''} onChange={(e) => updateActiveReporter('reporterRef', e.target.value)} /></div>
                      </div>
                      {/* Row 5 */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-start-3"><label className={lbl}>Report Media</label><input className={inp} value={activeReporter.reportMedia || ''} onChange={(e) => updateActiveReporter('reportMedia', e.target.value)} /></div>
                        <div><label className={lbl}>Intermediary</label><input className={inp} value={activeReporter.intermediary || ''} onChange={(e) => updateActiveReporter('intermediary', e.target.value)} /></div>
                      </div>
                    </div>

                    {/* Right side checkboxes */}
                    <div className="w-48 pt-4 pl-2 border-l border-gray-300">
                      <div className="text-[10px] font-bold text-gray-800 mb-2 leading-tight">Report Sent to Regulatory Authority by Reporter?</div>
                      <div className="space-y-1 text-[10px] text-gray-800 font-semibold">
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={activeReporter.protectConfidentiality || false} onChange={(e) => updateActiveReporter('protectConfidentiality', e.target.checked)} className="w-3 h-3" /> Protect Confidentiality</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={activeReporter.primaryReporter || false} onChange={(e) => updateActiveReporter('primaryReporter', e.target.checked)} className="w-3 h-3" /> Primary Reporter</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={activeReporter.correspondenceContact || false} onChange={(e) => updateActiveReporter('correspondenceContact', e.target.checked)} className="w-3 h-3" /> Correspondence Contact</label>
                      </div>
                    </div>
                  </div>

                  {/* Inner Tabs for Reporter */}
                  <div className="mt-2 flex gap-1 border-b border-gray-300 items-end">
                    {reporterTabs.map((tab, index) => (
                      <div 
                        key={tab.id}
                        className={cn("px-3 py-0.5 text-[9px] font-bold border border-gray-400 border-b-0 rounded-t-sm shadow-sm flex items-center cursor-pointer gap-1", activeReporterTab === tab.id ? "bg-emerald-100 text-emerald-800 border-emerald-300 z-10 translate-y-[1px]" : "bg-slate-100 text-slate-500 hover:bg-slate-200/60")}
                        onClick={() => setActiveReporterTab(tab.id)}
                      >
                        {(() => {
                          if (!tab.lastName && !tab.firstName) return `Reporter ${index + 1}`;
                          const namePart = [tab.lastName ? tab.lastName.toUpperCase() : '', tab.firstName].filter(Boolean).join(', ');
                          const typePart = tab.reporterType ? ` (${tab.reporterType.substring(0,3)}...)` : '';
                          return `${namePart}${typePart}`;
                        })()}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReporterTab(tab.id);
                          }}
                          className={cn("w-3 h-3 flex items-center justify-center rounded-sm hover:bg-black/10 transition-colors", activeReporterTab === tab.id ? "text-emerald-900" : "text-gray-500")}
                          title="Delete Reporter"
                        >✕</button>
                      </div>
                    ))}
                    <div 
                      className="px-6 py-0.5 text-[9px] bg-white text-gray-500 border border-gray-400 border-b-0 rounded-t-sm cursor-pointer hover:bg-gray-100 flex items-center shadow-sm"
                      onClick={() => {
                        const newId = Date.now();
                        setReporterTabs(p => [...p, { id: newId, backendId: null, sal: '', firstName: '', middleName: '', lastName: '', suffix: '', hcp: '', occupation: '', address: '', institution: '', department: '', city: '', state: '', postalCode: '', country: '', phone: '', altPhone: '', fax: '', reporterId: '', reporterRef: '', email: '', reporterType: '', reportMedia: '', intermediary: '', protectConfidentiality: false, primaryReporter: false, correspondenceContact: false }]);
                        setActiveReporterTab(newId);
                      }}
                    >
                      (New)
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Patient' && activeSubTab === 'Patient' && (
            <>
              {/* ======== Patient Information ======== */}
              <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                <div className={secHeader}>
                  <span>Patient Information</span>
                  <div className="flex items-center gap-1">
                    <button className="h-6 px-2.5 text-[10px] font-medium bg-white text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors">Patient Info From Reporter</button>
                    <button className="h-6 px-2.5 text-[10px] font-medium bg-white text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors">Current Medical Status</button>
                    <button className="h-6 px-2.5 text-[10px] font-medium bg-white text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors">Patient Death Info</button>
                    
                    <button className="w-3 h-3 ml-1 bg-slate-50 text-black text-[8px] flex items-center justify-center font-bold border border-gray-400 shadow-sm">−</button>
                  </div>
                </div>
                <div className="p-2 bg-white grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div><label className={lbl}>Sponsor Identifier</label><input className={inp} value={form.sponsorIdentifier} onChange={h('sponsorIdentifier')} /></div>
                    <div><label className={lbl}>Pat. ID</label><input className={inp} value={form.patId} onChange={h('patId')} /></div>
                    <div><label className={lbl}>First Name</label><input className={inp} value={form.patFirstName} onChange={h('patFirstName')} /></div>
                    <div className="flex gap-2">
                      <div className="flex-1"><label className={lbl}>Last Name</label><input className={inp} value={form.patLastName} onChange={h('patLastName')} /></div>
                      <div className="w-12"><label className={lbl}>Initials</label><input className={inp} value={form.patInitials} onChange={h('patInitials')} /></div>
                    </div>
                    <div className="col-span-2 pr-1">
                      <label className={lbl}>Address</label>
                      <textarea className={cn(inp, "h-[44px] resize-none")} value={form.patAddress} onChange={h('patAddress')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 content-start">
                    <div><label className={lbl}>Randomization #</label><input className={inp} value={form.randomizationNum} onChange={h('randomizationNum')} /></div>
                    <div className="row-span-2 flex flex-col justify-end gap-1 pl-2 mb-1">
                      <label className="flex items-center gap-1 cursor-pointer text-[10px] font-semibold text-gray-700"><input type="checkbox" checked={form.patProtectConfidentiality} onChange={hc('patProtectConfidentiality')} className="w-3 h-3" /> Protect Confidentiality</label>
                      <label className="flex items-center gap-1 cursor-pointer text-[10px] font-semibold text-gray-700"><input type="checkbox" checked={form.childOnlyCase} onChange={hc('childOnlyCase')} className="w-3 h-3" /> Child Only Case</label>
                    </div>
                    <div className="col-start-1 mt-6"><label className={lbl}>Patient City</label><input className={inp} value={form.patCity} onChange={h('patCity')} /></div>
                    <div className="col-start-2 mt-6"><label className={lbl}>Country</label><input className={inp} value={form.patCountry} onChange={h('patCountry')} /></div>
                    <div><label className={lbl}>State/Province</label><input className={inp} value={form.patState} onChange={h('patState')} /></div>
                    <div><label className={lbl}>Postal Code</label><input className={inp} value={form.patPostalCode} onChange={h('patPostalCode')} /></div>
                    <div className="col-start-2"><label className={lbl}>Phone Number</label><input className={inp} value={form.patPhone} onChange={h('patPhone')} /></div>
                  </div>
                </div>
              </div>

              {/* ======== Patient Details ======== */}
              <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                <div className={secHeader}>
                  <span>Patient Details</span>
                  <button className="w-3 h-3 bg-slate-50 text-black text-[8px] flex items-center justify-center font-bold border border-gray-400 shadow-sm">−</button>
                </div>
                <div className="p-2 bg-white">
                  <div className="flex gap-2">
                    <div className="w-24"><label className={lbl}>Date of Birth</label><input type="date" className={inp} value={form.patDob} onChange={h('patDob')} /></div>
                    <div className="w-12"><label className={lbl}>Age</label><input className={inp} value={form.patAge} onChange={h('patAge')} /></div>
                    <div className="w-20"><label className={lbl}>Units</label><input className={inp} value={form.patAgeUnits} onChange={h('patAgeUnits')} /></div>
                    <div className="w-32"><label className={lbl}>Age Group</label><input className={cn(inp, "bg-slate-50")} value={form.patAgeGroup} onChange={h('patAgeGroup')} /></div>
                    <div className="w-32"><label className={lbl}>Ethnicity</label><input className={inp} value={form.patEthnicity} onChange={h('patEthnicity')} /></div>
                    <div className="w-32"><label className={lbl}>Occupation</label><input className={inp} value={form.patOccupation} onChange={h('patOccupation')} /></div>
                    <div className="w-20"><label className={lbl}>Weight</label><div className="flex gap-0.5"><input className={inp} value={form.patWeight} onChange={h('patWeight')} /><input className={cn(inp, "w-10 bg-gray-50")} value={form.patWeightUnits} onChange={h('patWeightUnits')} /></div></div>
                    <div className="w-20"><label className={lbl}>Height</label><div className="flex gap-0.5"><input className={inp} value={form.patHeight} onChange={h('patHeight')} /><input className={cn(inp, "w-10 bg-gray-50")} value={form.patHeightUnits} onChange={h('patHeightUnits')} /></div></div>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <div className="w-24"><label className={lbl}>Gender</label><select className={sel} value={form.patGender} onChange={handlePatGenderChange}><option>Male</option><option>Female</option><option>Unknown</option></select></div>
                    <div className="w-24"><label className={lbl}>Pregnant</label><select className={cn(sel, form.patGender === 'Male' && "bg-gray-100 text-gray-500")} value={form.patPregnant} onChange={h('patPregnant')} disabled={form.patGender === 'Male'}><option></option><option>Yes</option><option>No</option><option>Unk</option></select></div>
                    <div className="w-32 ml-44"><label className={lbl}>Date of LMP</label><input type="date" className={cn(inp, form.patGender === 'Male' && "bg-gray-100 text-gray-500")} value={form.patDateOfLmp} onChange={h('patDateOfLmp')} disabled={form.patGender === 'Male'} /></div>
                    <div className="flex items-end mb-1"><label className="flex items-center gap-1 cursor-pointer text-[10px] font-semibold text-gray-700"><input type="checkbox" checked={form.patBreastfeeding} onChange={hc('patBreastfeeding')} className="w-3 h-3" /> Breastfeeding</label></div>
                  </div>
                </div>
              </div>

              {form.patPregnant === 'Yes' && (
                <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden mb-2 mt-2">
                  {/* ======== Pregnancy Information ======== */}
                  <div className={secHeader}>
                    <span>Pregnancy Information</span>
                    <button className="w-3 h-3 bg-slate-50 text-black text-[8px] flex items-center justify-center font-bold border border-gray-400 shadow-sm">−</button>
                  </div>
                  <div className="p-1 bg-white">
                    <div className="border border-gray-300 p-2 bg-white">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="grid grid-cols-3 gap-2 mb-1">
                            <div><label className={lbl}>Due Date</label><input type="date" className={inp} value={form.dueDate} onChange={h('dueDate')} /></div>
                            <div><label className={lbl}>Weeks at Onset</label><input className={inp} value={form.weeksAtOnset} onChange={h('weeksAtOnset')} /></div>
                            <div><label className={lbl}>Weeks at Exposure</label><input className={inp} value={form.weeksAtExposure} onChange={h('weeksAtExposure')} /></div>
                          </div>
                          <div className="flex gap-4 mt-2">
                            <div className="w-32"><label className={lbl}>Number of Fetus</label><input className={inp} value={form.numOfFetus} onChange={h('numOfFetus')} /></div>
                            <div className="flex items-end pb-1 gap-4">
                              <label className="flex items-center gap-1 text-[10px] font-normal text-gray-800"><input type="radio" name="pective" checked={form.prospective} onChange={() => setForm(p=>({...p, prospective:true, retrospective:false}))} className="w-3 h-3" /> Prospective</label>
                              <label className="flex items-center gap-1 text-[10px] font-normal text-gray-800"><input type="radio" name="pective" checked={form.retrospective} onChange={() => setForm(p=>({...p, prospective:false, retrospective:true}))} className="w-3 h-3" /> Retrospective</label>
                            </div>
                          </div>
                        </div>
                        <div className="w-[200px] border border-gray-300 p-1">
                          <label className={lbl}>Trimester of Exposure</label>
                          <div className="space-y-1 mt-1 pl-1">
                            <label className="flex items-center gap-1 text-[10px] font-normal text-gray-800"><input type="checkbox" checked={form.trimesterFirst} onChange={hc('trimesterFirst')} className="w-3 h-3" /> First</label>
                            <label className="flex items-center gap-1 text-[10px] font-normal text-gray-800"><input type="checkbox" checked={form.trimesterSecond} onChange={hc('trimesterSecond')} className="w-3 h-3" /> Second</label>
                            <label className="flex items-center gap-1 text-[10px] font-normal text-gray-800"><input type="checkbox" checked={form.trimesterThird} onChange={hc('trimesterThird')} className="w-3 h-3" /> Third</label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-[2px] border-slate-200 p-1 mt-2 mb-1">
                        <div className="grid grid-cols-5 gap-2 mb-1">
                          <div className="col-span-1"><label className={lbl}>Delivery Date</label><input type="date" className={inp} value={form.deliveryDate} onChange={h('deliveryDate')} /></div>
                          <div className="col-span-1">
                            <label className={lbl}>Weight</label>
                            <div className="flex gap-1">
                              <input className={cn(inp, "flex-1")} value={form.deliveryWeight} onChange={h('deliveryWeight')} />
                              <select className={cn(sel, "w-8 bg-gray-100")}><option></option></select>
                            </div>
                          </div>
                          <div className="col-span-1"><label className={lbl}>APGAR Score #1</label><input className={inp} value={form.apgar1} onChange={h('apgar1')} /></div>
                          <div className="col-span-1"><label className={lbl}>APGAR Score #2</label><input className={inp} value={form.apgar2} onChange={h('apgar2')} /></div>
                          <div className="col-span-1"><label className={lbl}>APGAR Score #3</label><input className={inp} value={form.apgar3} onChange={h('apgar3')} /></div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-[40%]"><label className={lbl}>Delivery Type</label><input className={inp} value={form.deliveryType} onChange={h('deliveryType')} /></div>
                          <div className="flex-1"><label className={lbl}>Delivery Notes</label><input className={inp} value={form.deliveryNotes} onChange={h('deliveryNotes')} /></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======== Other Relevant History (0) ======== */}
              <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                <div className={secHeader}>
                  <span>Other Relevant History (0)</span>
                  <div className="flex items-center gap-1">
                    <button className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400">Copy</button>
                    <button className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400">Add</button>
                    <button className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400">Delete</button>
                    <button className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400">Up ∧</button>
                    <button className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400">Down ∨</button>
                    <button className="w-3 h-3 ml-1 bg-slate-50 text-black text-[8px] flex items-center justify-center font-bold border border-gray-400 shadow-sm">∧</button>
                  </div>
                </div>
                <div className="bg-white">
                  <table className="w-full text-[10px] text-left">
                    <thead>
                      <tr className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 border-b border-gray-300">
                        <th className="px-1 py-0.5 w-4 font-normal">#</th>
                        <th className="px-1 py-0.5 w-24 font-normal">Start / Stop Date</th>
                        <th className="px-1 py-0.5 w-48 font-normal">Condition Type / Verbatim / Indication /<br/>Reaction</th>
                        <th className="px-1 py-0.5 font-normal">Coded PT / Description of condition LLT /<br/>Indication PT / Reaction PT</th>
                        <th className="px-1 py-0.5 w-48 font-normal">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2].map((num) => (
                        <tr key={num} className={num % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-1 py-1 align-top border-b border-gray-300 text-red-600 font-bold">{num}.</td>
                          <td className="px-1 py-1 align-top border-b border-gray-300 space-y-1">
                            <input className={inp} defaultValue="" />
                            <input className={inp} defaultValue="" />
                            <label className="flex items-center gap-1 font-semibold text-gray-700 mt-1"><input type="checkbox" className="w-3 h-3" /> Ongoing</label>
                          </td>
                          <td className="px-1 py-1 align-top border-b border-gray-300">
                            <div className="flex gap-1 mb-1">
                              <input className={cn(inp, "flex-1")} /><button className="h-[20px] px-1 text-[9px] border border-gray-300 bg-gray-100 text-gray-400" disabled>Encode</button>
                            </div>
                            <div className="flex gap-1 mb-1">
                              <input className={cn(inp, "flex-1")} /><button className="h-[20px] px-1 text-[9px] border border-gray-300 bg-gray-100 text-gray-400" disabled>Encode</button>
                            </div>
                            <div className="flex gap-1">
                              <input className={cn(inp, "flex-1")} /><button className="h-[20px] px-1 text-[9px] border border-gray-300 bg-gray-100 text-gray-400" disabled>Encode</button>
                            </div>
                          </td>
                          <td className="px-1 py-1 align-top border-b border-gray-300">
                            <div className="flex gap-1 mb-1">
                              <input className={cn(inp, "flex-1 bg-slate-50")} /><button className="h-[20px] w-[20px] border border-red-500 text-red-500 font-bold bg-white leading-none">X</button>
                            </div>
                            <div className="flex gap-1 mb-1">
                              <input className={cn(inp, "flex-1 bg-slate-50")} /><button className="h-[20px] w-[20px] border border-red-500 text-red-500 font-bold bg-white leading-none">X</button>
                            </div>
                            <div className="flex gap-1">
                              <input className={cn(inp, "flex-1 bg-slate-50")} /><button className="h-[20px] w-[20px] border border-red-500 text-red-500 font-bold bg-white leading-none">X</button>
                            </div>
                          </td>
                          <td className="px-1 py-1 align-top border-b border-gray-300 relative">
                            <textarea className={cn(inp, "w-full h-[62px] resize-none")} />
                            <div className="absolute top-1 right-2 flex gap-1">
                              
                              <span className="text-[12px]">👓</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ======== Lab Data (4) ======== */}
              <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                <div className={secHeader}>
                  <span>Lab Data (4)</span>
                  <button className="w-3 h-3 bg-slate-50 text-black text-[8px] flex items-center justify-center font-bold border border-gray-400 shadow-sm">−</button>
                </div>
                <div className="bg-slate-50 p-1 grid grid-cols-[200px_1fr] gap-1">
                  {/* Left Column (Tests) */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 p-1 space-y-1">
                    <div className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 mb-2 items-center">
                      <span className="text-[10px] font-bold text-gray-900 leading-tight">Lab Data Test as<br/>Reported</span>
                      <button onClick={handleAddLabTest} className="h-[18px] px-2 text-[9px] bg-gray-100 border border-gray-400 hover:bg-gray-200">Add Test</button>
                      
                      <span className="text-[10px] font-bold text-gray-900 col-span-2">Test Name</span>
                      
                      <span className="text-[10px] font-bold text-gray-900">Units</span>
                      <button className="h-[18px] px-1 text-[9px] bg-gray-100 border border-gray-400 hover:bg-gray-200">Select Lab Test Group</button>
                      
                      <span className="text-[10px] font-bold text-gray-900 col-span-2">Norm Low / Norm High</span>
                    </div>
                    
                    <div className="flex justify-end mt-4 mb-2">
                      <div className="bg-white px-6 py-0.5 text-[10px] font-bold text-gray-900">Date</div>
                    </div>
                    
                    {/* Dynamic Tests */}
                    {labTests.map(test => (
                      <div key={test.id} className="mt-2 space-y-1">
                        <div className="flex justify-end pr-1">
                          <button onClick={() => openIcdBrowser('lab', test.id, test.name || test.reported)} className="h-[16px] px-2 text-[9px] bg-gray-100 border border-gray-400 text-gray-600 hover:bg-gray-200">Encode</button>
                        </div>
                        <div className="flex gap-0.5">
                          <input className={cn(inp, "flex-1 h-[18px]")} value={test.reported} onChange={(e) => updateLabTest(test.id, 'reported', e.target.value)} />
                          <button onClick={() => openIcdBrowser('lab', test.id, test.reported)} className="w-5 h-[18px] bg-gray-100 border border-gray-400 flex items-center justify-center text-[10px] hover:bg-gray-200">🔍</button>
                        </div>
                        <div className="flex gap-0.5">
                          <input 
                            className={cn(inp, "flex-1 h-[18px]", test.encoded && "bg-slate-50")} 
                            value={test.name} 
                            onChange={(e) => {
                              updateLabTest(test.id, 'name', e.target.value);
                              updateLabTest(test.id, 'encoded', false);
                            }} 
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                openIcdBrowser('lab', test.id, test.name);
                              }
                            }}
                          />
                          {test.encoded ? (
                            <span className="w-5 h-[18px] bg-gray-100 border border-gray-400 flex items-center justify-center text-[10px] text-green-600 font-bold">✓</span>
                          ) : (
                            <button className="w-5 h-[18px] bg-gray-100 border border-gray-400 flex items-center justify-center text-[10px] text-red-600 font-bold pb-0.5 hover:bg-gray-200" onClick={() => removeLabTest(test.id)}>❌</button>
                          )}
                        </div>
                        <input className={cn(inp, "w-full h-[18px]")} value={test.units} onChange={(e) => updateLabTest(test.id, 'units', e.target.value)} />
                        <div className="flex gap-1">
                          <input className={cn(inp, "w-1/2 h-[18px]")} value={test.low} onChange={(e) => updateLabTest(test.id, 'low', e.target.value)} />
                          <input className={cn(inp, "w-1/2 h-[18px]")} value={test.high} onChange={(e) => updateLabTest(test.id, 'high', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Right Column (Results) */}
                  <div className="bg-white p-1 overflow-x-auto">
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 mb-2 items-start">
                      <div className="flex flex-col text-[10px] font-bold text-gray-800 leading-[14px]">
                        <span>Results / Units</span>
                        <span>Assessment</span>
                        <span>Notes</span>
                      </div>
                      <button onClick={handleAddDate} className="h-[18px] px-2 text-[9px] bg-gray-100 border border-gray-400 hover:bg-gray-200 self-start mt-0.5">Add Date</button>
                    </div>
                    
                    <div className="flex gap-4">
                      {labDates.map((dateObj, colIndex) => (
                        <div key={dateObj.id} className="w-[180px] flex flex-col">
                          <div className="mt-4 mb-2">
                            <input 
                              className={cn(inp, "h-[18px] w-full")} 
                              value={dateObj.date}
                              onChange={(e) => updateLabDate(dateObj.id, e.target.value)}
                            />
                          </div>
                          
                          {/* Results aligned with Tests */}
                          {labTests.map((test, i) => (
                            <div key={`res-${dateObj.id}-${test.id}`} className="mt-2 space-y-1">
                              <div className="flex gap-1">
                                <input className={cn(inp, "flex-1 h-[18px]")} defaultValue="" />
                                <input className={cn(inp, "w-[40px] h-[18px]")} defaultValue="" />
                              </div>
                              <input className={cn(inp, "w-full h-[18px]")} />
                              <div className="flex gap-1 h-[62px]">
                                <textarea className={cn(inp, "flex-1 h-full resize-none")} />
                                <div className="flex flex-col justify-between w-[20px] pb-1 pt-0.5">
                                  <span className="text-[14px] leading-none cursor-pointer drop-shadow-sm">🔬</span>
                                  <span className="text-[12px] leading-none text-purple-600 font-bold tracking-[-1px] cursor-pointer drop-shadow-sm ml-0.5">⇦⇨</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Patient' && activeSubTab === 'Parent' && (
            <>
              {/* ======== Parent Information ======== */}
              <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                <div className={secHeader}>Parent Information</div>
                <div className="p-2 bg-white">
                  <div className="flex gap-2 mb-2">
                    <div className="w-20"><label className={lbl}>Parent Initials</label><input className={inp} value={form.parentInitials} onChange={h('parentInitials')} /></div>
                    <div className="w-24"><label className={lbl}>Date of Birth</label><input type="date" className={inp} value={form.parentDob} onChange={h('parentDob')} /></div>
                    <div className="w-12"><label className={lbl}>Age</label><input className={inp} value={form.parentAge} onChange={h('parentAge')} /></div>
                    <div className="w-20"><label className={lbl}>Units</label><input className={inp} value={form.parentAgeUnits} onChange={h('parentAgeUnits')} /></div>
                    <div className="w-24"><label className={lbl}>Gender</label><select className={sel} value={form.parentGender} onChange={h('parentGender')}><option>Male</option><option>Female</option><option>Unknown</option></select></div>
                    <div className="w-24"><label className={lbl}>Date of LMP</label><input type="date" className={inp} value={form.parentDateOfLmp} onChange={h('parentDateOfLmp')} /></div>
                    <div className="w-16"><label className={lbl}>Weight</label><input className={inp} value={form.parentWeight} onChange={h('parentWeight')} /></div>
                    <div className="w-16"><label className={lbl}>Height</label><input className={inp} value={form.parentHeight} onChange={h('parentHeight')} /></div>
                    <div className="flex items-end mb-1"><label className="flex items-center gap-1 cursor-pointer text-[10px] font-semibold text-gray-700"><input type="checkbox" checked={form.parentBreastfeeding} onChange={hc('parentBreastfeeding')} className="w-3 h-3" /> Parent Breastfeeding</label></div>
                  </div>
                  <div>
                    <label className={lbl}>Medical History</label>
                    <div className="relative">
                      <textarea className={cn(inp, "w-full h-[36px] resize-none")} value={form.parentMedicalHistory} onChange={h('parentMedicalHistory')} />
                      <div className="absolute top-1 right-2"><span className="text-[12px]">👓</span></div>
                    </div>
                  </div>
                </div>
              </div>



              {/* ======== Other Relevant History (0) ======== */}
              <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                <div className={secHeader}>
                  <span>Other Relevant History (0)</span>
                  <div className="flex items-center gap-1">
                    <button className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400">Copy</button>
                    <button className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400">Add</button>
                    <button className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400">Delete</button>
                    <button className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400">Up ∧</button>
                    <button className="h-[16px] px-2 text-[9px] font-normal bg-gray-100 text-black border border-gray-400">Down ∨</button>
                    <button className="w-3 h-3 ml-1 bg-slate-50 text-black text-[8px] flex items-center justify-center font-bold border border-gray-400 shadow-sm">∧</button>
                  </div>
                </div>
                <div className="bg-white">
                  <table className="w-full text-[10px] text-left">
                    <thead>
                      <tr className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 border-b border-gray-300">
                        <th className="px-1 py-0.5 w-4 font-normal">#</th>
                        <th className="px-1 py-0.5 w-24 font-normal">Start / Stop Date</th>
                        <th className="px-1 py-0.5 w-48 font-normal">Condition Type / Verbatim / Indication /<br/>Reaction</th>
                        <th className="px-1 py-0.5 font-normal">Coded PT / Description of condition LLT /<br/>Indication PT / Reaction PT</th>
                        <th className="px-1 py-0.5 w-48 font-normal">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2].map((num) => (
                        <tr key={num} className={num % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-1 py-1 align-top border-b border-gray-300 text-red-600 font-bold">{num}.</td>
                          <td className="px-1 py-1 align-top border-b border-gray-300 space-y-1">
                            <input className={inp} defaultValue="" />
                            <input className={inp} defaultValue="" />
                            <label className="flex items-center gap-1 font-semibold text-gray-700 mt-1"><input type="checkbox" className="w-3 h-3" /> Ongoing</label>
                          </td>
                          <td className="px-1 py-1 align-top border-b border-gray-300">
                            <div className="flex gap-1 mb-1">
                              <input className={cn(inp, "flex-1")} /><button className="h-[20px] px-1 text-[9px] border border-gray-300 bg-gray-100 text-gray-400" disabled>Encode</button>
                            </div>
                            <div className="flex gap-1 mb-1">
                              <input className={cn(inp, "flex-1")} /><button className="h-[20px] px-1 text-[9px] border border-gray-300 bg-gray-100 text-gray-400" disabled>Encode</button>
                            </div>
                            <div className="flex gap-1">
                              <input className={cn(inp, "flex-1")} /><button className="h-[20px] px-1 text-[9px] border border-gray-300 bg-gray-100 text-gray-400" disabled>Encode</button>
                            </div>
                          </td>
                          <td className="px-1 py-1 align-top border-b border-gray-300">
                            <div className="flex gap-1 mb-1">
                              <input className={cn(inp, "flex-1 bg-slate-50")} /><button className="h-[20px] w-[20px] border border-red-500 text-red-500 font-bold bg-white leading-none">X</button>
                            </div>
                            <div className="flex gap-1 mb-1">
                              <input className={cn(inp, "flex-1 bg-slate-50")} /><button className="h-[20px] w-[20px] border border-red-500 text-red-500 font-bold bg-white leading-none">X</button>
                            </div>
                            <div className="flex gap-1">
                              <input className={cn(inp, "flex-1 bg-slate-50")} /><button className="h-[20px] w-[20px] border border-red-500 text-red-500 font-bold bg-white leading-none">X</button>
                            </div>
                          </td>
                          <td className="px-1 py-1 align-top border-b border-gray-300 relative">
                            <textarea className={cn(inp, "w-full h-[62px] resize-none")} />
                            <div className="absolute top-1 right-2 flex gap-1">
                              
                              <span className="text-[12px]">👓</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}

          {activeTab === 'Products' && (
            <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden min-h-full">
              <div className="bg-slate-50 px-2 py-0.5 text-[11px] font-bold border-b border-slate-200 flex items-center gap-2 shadow-inner">
                <span className="text-gray-800">Drug</span>
              </div>
              <div className="p-1.5 space-y-2">

                {/* ======== Product Information ======== */}
                <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                  <div className={secHeader}>
                    <span>Product Information</span>
                    <div className="flex items-center gap-1">
                      <button className="w-3 h-3 ml-1 bg-slate-50 text-black text-[8px] flex items-center justify-center font-bold border border-gray-400 shadow-sm">−</button>
                    </div>
                  </div>
                  <div className="p-2 bg-white space-y-2">
                    <div className="flex gap-4 items-center">
                      <div className="flex-1 max-w-sm"><label className={lbl}>Product Name</label>
                          <DrugAutocomplete
                            value={activeProduct.name || activeProduct.genericName || ''}
                            onChange={(val) => updateActiveProduct('name', typeof val === 'object' ? val.target.value : val)}
                          onSelect={(drug) => {
                            updateActiveProductFields({
                              name: drug.brand || drug.generic || '',
                              genericName: drug.generic || '',
                              formulation: drug.form || '',
                              obtainCountry: '',
                              authCountry: '',
                              ndc: drug.ndc || '',
                              labeler: drug.labeler || '',
                              route: drug.route || '',
                              pharmClass: drug.pharm || '',
                              activeIngredients: drug.active || '',
                              concentration: drug.conc || '',
                              units: drug.unit || ''
                            });
                          }}
                          placeholder="Search drug / brand name…"
                        />

                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-700"><input type="radio" name="productRole" checked={activeProduct.role === 'Suspect'} onChange={() => updateActiveProduct('role', 'Suspect')} className="w-3 h-3" /> Suspect</label>
                        <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-700"><input type="radio" name="productRole" checked={activeProduct.role === 'Concomitant'} onChange={() => updateActiveProduct('role', 'Concomitant')} className="w-3 h-3" /> Concomitant</label>
                        <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-700"><input type="radio" name="productRole" checked={activeProduct.role === 'Treatment'} onChange={() => updateActiveProduct('role', 'Treatment')} className="w-3 h-3" /> Treatment</label>
                      </div>
                    </div>
                    <div><label className={lbl}>Generic Name</label><input className={inp} value={activeProduct.genericName || ''} onChange={(e) => updateActiveProduct('genericName', e.target.value)} /></div>
                    <div className="grid grid-cols-4 gap-2">
                      <div><label className={lbl}>Company Drug Code</label><input className={inp} value={activeProduct.companyDrugCode || ''} onChange={(e) => updateActiveProduct('companyDrugCode', e.target.value)} /></div>
                      <div><label className={lbl}>Obtain Drug Country</label><input className={inp} value={activeProduct.obtainCountry || ''} onChange={(e) => updateActiveProduct('obtainCountry', e.target.value)} /></div>
                      <div><label className={lbl}>Drug Code</label><input className={inp} value={activeProduct.ndc || ''} onChange={(e) => updateActiveProduct('ndc', e.target.value)} /></div>
                      <div><label className={lbl}>WHO Medicinal Product ID</label><input className={inp} value={activeProduct.whoId || ''} onChange={(e) => updateActiveProduct('whoId', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div><label className={lbl}>Formulation</label><input className={inp} value={activeProduct.formulation || ''} onChange={(e) => updateActiveProduct('formulation', e.target.value)} /></div>
                      <div><label className={lbl}>Route of Administration</label><input className={inp} value={activeProduct.route || ''} onChange={(e) => updateActiveProduct('route', e.target.value)} /></div>
                      <div><label className={lbl}>Drug Authorization Country</label><input className={inp} value={activeProduct.authCountry || ''} onChange={(e) => updateActiveProduct('authCountry', e.target.value)} /></div>
                      <div className="col-span-2"><label className={lbl}>Manufacturer / Labeler</label><input className={inp} value={activeProduct.labeler || ''} onChange={(e) => updateActiveProduct('labeler', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      <div><label className={lbl}>Concentration</label><input className={inp} value={activeProduct.concentration || ''} onChange={(e) => updateActiveProduct('concentration', e.target.value)} /></div>
                      <div><label className={lbl}>Units</label><input className={inp} value={activeProduct.units || ''} onChange={(e) => updateActiveProduct('units', e.target.value)} /></div>
                      <div><label className={lbl}>Interaction?</label><select className={sel} value={activeProduct.interaction || ''} onChange={(e) => updateActiveProduct('interaction', e.target.value)}><option value=""></option><option value="Yes">Yes</option><option value="No">No</option><option value="Unknown">Unknown</option></select></div>
                      <div><label className={lbl}>Contraindicated?</label><select className={sel} value={activeProduct.contraindicated || ''} onChange={(e) => updateActiveProduct('contraindicated', e.target.value)}><option value=""></option><option value="Yes">Yes</option><option value="No">No</option><option value="Unknown">Unknown</option></select></div>
                    </div>
                  </div>
                </div>

                {/* ======== Product Indication ======== */}
                <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                  <div className={secHeader}>
                    <span>Product Indication ({productIndications.length})</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => {
                        if (activeIndicationId) {
                          const activeInd = productIndications.find(i => i.id === activeIndicationId);
                          openIcdBrowser('indication', activeIndicationId, activeInd?.reported);
                        } else {
                          alert('Please select a product indication row first.');
                        }
                      }} className="h-5 px-2.5 rounded-sm text-[10px] font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1">🪄 Encode</button>
                      <button onClick={handleAddProductIndication} className="h-5 px-2.5 rounded-sm text-[10px] font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1">➕ Add</button>
                      <button onClick={handleDeleteProductIndication} className="h-5 px-2.5 rounded-sm text-[10px] font-medium bg-white text-red-600 border border-slate-300 hover:bg-red-50 shadow-sm transition-all flex items-center gap-1">🗑️ Delete</button>
                      <div className="flex gap-0.5 ml-1">
                        <button onClick={() => scrollIndications('up')} className="h-5 px-2 rounded-sm text-[10px] font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center">▲</button>
                        <button onClick={() => scrollIndications('down')} className="h-5 px-2 rounded-sm text-[10px] font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center">▼</button>
                      </div>
                      <button className="w-4 h-4 ml-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-[10px] flex items-center justify-center font-bold border border-slate-300 shadow-sm transition-all">−</button>
                    </div>
                  </div>
                  <div className="bg-white">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 border-b border-gray-300 flex text-[10px]">
                      <div className="px-1 py-0.5 w-[30px] font-normal">#</div>
                      <div className="px-1 py-0.5 flex-1 font-normal">Reported Indication</div>
                      <div className="px-1 py-0.5 flex-1 font-normal">Coded Indication</div>
                    </div>
                    <div ref={indicationsScrollRef} className="max-h-[70px] overflow-y-auto">
                      <table className="w-full text-[10px] text-left table-fixed">
                        <tbody>
                          {productIndications.map((ind, index) => (
                            <tr 
                              key={ind.id} 
                              onClick={() => setActiveIndicationId(ind.id)}
                              className={cn(
                                "cursor-pointer",
                                activeIndicationId === ind.id ? "bg-white" : (index % 2 === 0 ? "bg-white" : "bg-slate-50")
                              )}
                            >
                              <td className="px-1 py-1 align-middle border-b border-gray-300 text-red-600 font-bold w-[30px]">{index + 1}.</td>
                              <td className="px-1 py-1 align-middle border-b border-gray-300">
                                <div className="flex gap-1 relative">
                                  <input 
                                    className={cn(inp, "flex-1")} 
                                    value={ind.reported}
                                    onChange={(e) => setProductIndications(p => p.map(item => item.id === ind.id ? { ...item, reported: e.target.value } : item))}
                                  />
                                  
                                </div>
                              </td>
                              <td className="px-1 py-1 align-middle border-b border-gray-300">
                                <div className="flex gap-1">
                                  <input 
                                    className={cn(inp, "flex-1", ind.coded ? "bg-slate-50" : "")} 
                                    value={ind.coded}
                                    onChange={(e) => setProductIndications(p => p.map(item => item.id === ind.id ? { ...item, coded: e.target.value } : item))}
                                  />
                                  <button onClick={() => { setProductIndications(p => p.filter(item => item.id !== ind.id)); if (activeIndicationId === ind.id) setActiveIndicationId(null); }} className="h-[20px] w-[20px] border border-red-500 text-red-500 hover:bg-red-50 transition-colors font-bold bg-white leading-none">X</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ======== Dosage Regimens (1) ======== */}
                <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                  <div className={secHeader}>
                    <span>Dosage Regimens (1)</span>
                    <button className="w-3 h-3 bg-slate-50 text-black text-[8px] flex items-center justify-center font-bold border border-gray-400 shadow-sm">−</button>
                  </div>
                  <div className="p-2 bg-white space-y-2">
                    <div className="grid grid-cols-6 gap-2 items-start">
                      <div><label className={lbl}>Start Date/Time</label><input type="datetime-local" className={inp} value={activeRegimen.startDate} onChange={(e) => updateDosageTab(activeDosageTab, 'startDate', e.target.value)} /></div>
                      <div><label className={lbl}>Stop Date/Time</label><input type="datetime-local" className={inp} value={activeRegimen.stopDate} onChange={(e) => updateDosageTab(activeDosageTab, 'stopDate', e.target.value)} /></div>
                      <div className="flex flex-col gap-1 mt-3">
                        <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" checked={activeRegimen.ongoing} onChange={(e) => updateDosageTab(activeDosageTab, 'ongoing', e.target.checked)} /> Ongoing</label>
                        <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" checked={activeRegimen.outsideRange} onChange={(e) => updateDosageTab(activeDosageTab, 'outsideRange', e.target.checked)} /> Outside Therapeutic Range</label>
                      </div>
                      <div><label className={lbl}>Duration of Regimen</label><input className={inp} value={activeRegimen.duration} onChange={(e) => updateDosageTab(activeDosageTab, 'duration', e.target.value)} /></div>
                      <div><label className={lbl}>Dose Number</label><input className={inp} value={activeRegimen.doseNumber} onChange={(e) => updateDosageTab(activeDosageTab, 'doseNumber', e.target.value)} /></div>
                      <div className="flex gap-1">
                        <div className="flex-1"><label className={lbl}>Dose</label><input className={inp} value={activeRegimen.dose} onChange={(e) => updateDosageTab(activeDosageTab, 'dose', e.target.value)} /></div>
                        <div className="w-10"><label className={lbl}>Units</label><input className={inp} value={activeRegimen.doseUnits} onChange={(e) => updateDosageTab(activeDosageTab, 'doseUnits', e.target.value)} /></div>
                        <div className="flex-1"><label className={lbl}>Frequency</label><input className={inp} value={activeRegimen.frequency} onChange={(e) => updateDosageTab(activeDosageTab, 'frequency', e.target.value)} /></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      <div><label className={lbl}>Dose Description</label><input className={inp} value={activeRegimen.doseDescription} onChange={(e) => updateDosageTab(activeDosageTab, 'doseDescription', e.target.value)} /></div>
                      <div className="flex gap-1">
                        <div className="flex-1"><label className={lbl}>Daily Dosage</label><input className={inp} value={activeRegimen.dailyDosage} onChange={(e) => updateDosageTab(activeDosageTab, 'dailyDosage', e.target.value)} /></div>
                        <div className="w-10"><label className={lbl}>Units</label><input className={inp} value={activeRegimen.dailyDosageUnits} onChange={(e) => updateDosageTab(activeDosageTab, 'dailyDosageUnits', e.target.value)} /></div>
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1"><label className={lbl}>Regimen Dosage</label><input className={inp} value={activeRegimen.regimenDosage} onChange={(e) => updateDosageTab(activeDosageTab, 'regimenDosage', e.target.value)} /></div>
                        <div className="w-10"><label className={lbl}>Units</label><input className={inp} value={activeRegimen.regimenDosageUnits} onChange={(e) => updateDosageTab(activeDosageTab, 'regimenDosageUnits', e.target.value)} /></div>
                      </div>
                      <div className="col-span-1"><label className={lbl}>Patient Route of Administration</label><input className={inp} value={activeRegimen.patientRoute} onChange={(e) => updateDosageTab(activeDosageTab, 'patientRoute', e.target.value)} /></div>
                      <div className="col-span-2"><label className={lbl}>Parent Route of Administration</label><input className={inp} value={activeRegimen.parentRoute} onChange={(e) => updateDosageTab(activeDosageTab, 'parentRoute', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div><label className={lbl}>Accidental Exposure</label><input className={inp} value={activeRegimen.accidentalExposure} onChange={(e) => updateDosageTab(activeDosageTab, 'accidentalExposure', e.target.value)} /></div>
                      <div><label className={lbl}>Package ID</label><input className={inp} value={activeRegimen.packageId} onChange={(e) => updateDosageTab(activeDosageTab, 'packageId', e.target.value)} /></div>
                      <div className="flex gap-2 col-span-2">
                        <div className="flex-1"><label className={lbl}>Batch / Lot #</label><input className={inp} value={activeRegimen.batchLot} onChange={(e) => updateDosageTab(activeDosageTab, 'batchLot', e.target.value)} /></div>
                        <div className="flex-1"><label className={lbl}>Expiration Date</label><input type="date" className={inp} value={activeRegimen.expirationDate} onChange={(e) => updateDosageTab(activeDosageTab, 'expirationDate', e.target.value)} /></div>
                      </div>
                    </div>
                    
                    {/* Inner Tabs for Dosage */}
                    <div className="mt-2 flex gap-1 border-b border-slate-200 pb-0.5 overflow-x-auto">
                      {dosageTabs.map(tab => (
                        <div 
                          key={tab.id}
                          onClick={() => setActiveDosageTab(tab.id)}
                          className={cn(
                            "px-4 py-0.5 text-[9px] font-bold border border-gray-400 border-b-0 rounded-t-sm shadow-sm flex items-center relative z-10 cursor-pointer whitespace-nowrap min-w-[80px]",
                            activeDosageTab === tab.id 
                              ? "bg-white text-gray-700 translate-y-[2px]" 
                              : "bg-gray-100 text-gray-500 hover:bg-gray-50"
                          )}
                        >
                          <span className="text-amber-500 absolute left-2 text-[10px]">💊</span>
                          <span className="ml-3 truncate">{tab.name}</span>
                          {dosageTabs.length > 1 && (
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setDosageTabs(p => p.filter(t => t.id !== tab.id)); 
                                if (activeDosageTab === tab.id) setActiveDosageTab(dosageTabs[0].id); 
                              }} 
                              className="ml-2 text-gray-400 hover:text-red-500"
                            >×</button>
                          )}
                        </div>
                      ))}
                      <div onClick={() => { 
                        const newId = Date.now(); 
                        setDosageTabs(p => [...p, { 
                          id: newId, 
                          name: 'New Regimen',
                          startDate: '', stopDate: '', ongoing: false, outsideRange: false, duration: '',
                          doseNumber: '', dose: '', doseUnits: '', frequency: '', doseDescription: '',
                          dailyDosage: '', dailyDosageUnits: '', regimenDosage: '', regimenDosageUnits: '',
                          patientRoute: '', parentRoute: '', accidentalExposure: '', packageId: '', batchLot: '', expirationDate: ''
                        }]); 
                        setActiveDosageTab(newId); 
                      }} className="px-4 py-0.5 text-[9px] bg-white text-gray-500 border border-gray-400 border-b-0 rounded-t-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap">(New)</div>
                      <div className="ml-auto flex gap-1 items-end sticky right-0 bg-white pl-2">
                        <button className="h-5 w-5 bg-white border border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-500 hover:bg-slate-50 transition-colors">&lt;</button>
                        <button className="h-5 w-5 bg-white border border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-500 hover:bg-slate-50 transition-colors">&gt;</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ======== Product Details ======== */}
                <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                  <div className={secHeader}>
                    <span>Product Details</span>
                    <button className="w-3 h-3 bg-slate-50 text-black text-[8px] flex items-center justify-center font-bold border border-gray-400 shadow-sm">−</button>
                  </div>
                  <div className="p-2 bg-white">
                    <div className="grid grid-cols-5 gap-4">
                      <div className="col-span-4 space-y-2">
                        <div className="grid grid-cols-4 gap-2">
                          <div><label className={lbl}>First Dose</label><input className={inp} value={activeProduct?.firstDose || ''} onChange={(e) => updateActiveProduct('firstDose', e.target.value)} /></div>
                          <div><label className={lbl}>Last Dose</label><input className={inp} value={activeProduct?.lastDose || ''} onChange={(e) => updateActiveProduct('lastDose', e.target.value)} /></div>
                          <div><label className={lbl}>Duration of Administration</label><input className={inp} value={activeProduct?.durationOfAdmin || ''} onChange={(e) => updateActiveProduct('durationOfAdmin', e.target.value)} /></div>
                          <div className="flex gap-1">
                            <div className="flex-1"><label className={lbl}>Total Dosage</label><input className={inp} /></div>
                            <div className="w-12"><label className={lbl}>Units</label><input className={inp} /></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div><label className={lbl}>Time Between First Dose/Primary Event</label><input className={inp} /></div>
                          <div><label className={lbl}>Time between Last Dose/Primary Event</label><input className={inp} /></div>
                          <div className="flex gap-1">
                            <div className="flex-1"><label className={lbl}>Total Dose to Primary Event</label><input className={inp} /></div>
                            <div className="w-12"><label className={lbl}>Units</label><input className={inp} /></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div><label className={lbl}>Action Taken</label><input className={inp} value={activeProduct.actionTaken || ''} onChange={(e) => updateActiveProduct('actionTaken', e.target.value)} /></div>
                          <div><label className={lbl}>Dechallenge Results</label><select className={sel}><option></option><option>Unk</option><option>Pos</option><option>Neg</option><option>N/A</option></select></div>
                          <div><label className={lbl}>Date</label><input type="date" className={inp} /></div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div><label className={lbl}>Taken Previously / Tolerated</label><select className={sel}><option></option><option>Unknown / N/A</option><option>No / N/A</option><option>Yes / Unknown</option><option>Yes / Tolerated</option><option>Yes / Not Tolerated</option></select></div>
                          <div><label className={lbl}>Rechallenge Results</label><select className={sel}><option></option><option>Unk</option><option>Pos</option><option>Neg</option><option>N/A</option></select></div>
                          <div><label className={lbl}>Start Date/Time</label><input type="datetime-local" className={inp} /></div>
                          <div><label className={lbl}>Stop Date/Time</label><input type="datetime-local" className={inp} /></div>
                        </div>
                      </div>
                      
                      {/* Checkboxes right side */}
                      <div className="space-y-1 mt-4">
                        <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" /> Abuse</label>
                        <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" /> Overdose</label>
                        <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" /> Tampering</label>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'Events' && activeSubTab === 'Event' && (
            <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden min-h-full flex flex-col">
              {/* Inner Tab bar for specific Event */}
              <div className="bg-slate-50 px-2 py-0.5 text-[11px] font-bold border-b border-slate-200 flex items-end gap-1 shadow-inner relative pt-1">
                <span className="text-amber-500 absolute left-2 text-[10px] top-1">⚡</span>
                <div className="flex ml-4 items-end gap-1">
                  {eventTabs.map(tab => (
                    <div 
                      key={tab.id}
                      onClick={() => setActiveEventTab(tab.id)}
                      className={cn(
                        "px-8 py-0.5 text-[10px] font-bold border border-gray-400 cursor-pointer shadow-sm rounded-t-sm flex items-center gap-1",
                        activeEventTab === tab.id 
                          ? "bg-white text-black z-10 translate-y-[1px] border-b-white" 
                          : "bg-slate-50 text-gray-800 border-b-0"
                      )}
                    >
                      <span>{tab.name || '(Empty)'}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEventTab(tab.id);
                        }}
                        className={cn(
                          "ml-1 w-3 h-3 flex items-center justify-center rounded-sm hover:bg-black/10 transition-colors",
                          activeEventTab === tab.id ? "text-black" : "text-gray-500"
                        )}
                        title="Delete Tab"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div 
                    onClick={() => {
                      const newId = Date.now();
                      setEventTabs([...eventTabs, { 
                        id: newId, 
                        name: 'New Event', 
                        descriptionReported: '',
                        descriptionCoded: '',
                        chapter: '',
                        block: '',
                        category: '',
                        entity: '',
                        entityCode: ''
                      }]);
                      setActiveEventTab(newId);
                    }}
                    className="px-6 py-0.5 text-[9px] bg-white text-gray-500 border border-gray-400 border-b-0 rounded-t-sm cursor-pointer hover:bg-gray-100"
                  >
                    (New)
                  </div>
                </div>
                <div className="ml-auto flex gap-1 mb-0.5">
                  <button className="h-5 w-5 bg-white border border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-500 hover:bg-slate-50 transition-colors">&lt;</button>
                  <button className="h-5 w-5 bg-white border border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-500 hover:bg-slate-50 transition-colors">&gt;</button>
                </div>
              </div>
              <div className="p-1.5 space-y-2 flex-1 bg-white">
                {/* ======== Event Information ======== */}
                <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden bg-white">
                  <div className={secHeader}>
                    <span>Event Information</span>
                    <button className="h-[18px] px-2 text-[10px] font-normal bg-white text-blue-800 border border-gray-400">Relationships</button>
                  </div>
                  <div className="p-2 space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Left Side */}
                      <div className="space-y-2">
                        <div>
                          <label className={lbl}>Description as Reported</label>
                          <div className="flex gap-1 relative">
                            <input className={inp} value={activeEvent.descriptionReported || ''} onChange={(e) => updateActiveEvent('descriptionReported', e.target.value)} />
                            
                          </div>
                        </div>
                        <div>
                          <label className={lbl}>Description to be Coded</label>
                          <div className="flex gap-1">
                            <input className={inp} value={activeEvent.descriptionCoded || ''} onChange={(e) => {
                              updateActiveEvent('descriptionCoded', e.target.value);
                              updateActiveEvent('name', e.target.value);
                            }} onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                openIcdBrowser('event', activeEventTab, activeEvent.descriptionCoded);
                              }
                            }} />
                            <button onClick={() => openIcdBrowser('event', activeEventTab, activeEvent.descriptionCoded)} className="h-[20px] px-2 text-[10px] bg-gray-100 border border-gray-400 hover:bg-gray-200 cursor-pointer">Encode</button>
                          </div>
                        </div>

                        {/* Event Coding Panel */}
                        <div className="border border-slate-200 bg-slate-50 p-1 mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold px-1 bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800">Event Coding (ICD-11)</span>
                            {activeEvent.entity && <span className="bg-white border border-green-500 px-1 text-green-500 font-bold text-[10px]">✓</span>}
                          </div>
                          <div className="grid grid-cols-[140px_1fr] gap-x-2 gap-y-1">
                            <label className={lbl}>Chapter</label><input className={cn(inp, activeEvent.chapter && "bg-slate-50")} value={activeEvent.chapter || ''} onChange={(e) => updateActiveEvent('chapter', e.target.value)} />
                            <label className={lbl}>SOC</label><input className={cn(inp, activeEvent.block && "bg-slate-50")} value={activeEvent.block || ''} onChange={(e) => updateActiveEvent('block', e.target.value)} />
                            <label className={lbl}>HLGT</label><input className={cn(inp, activeEvent.category && "bg-slate-50")} value={activeEvent.category || ''} onChange={(e) => updateActiveEvent('category', e.target.value)} />
                            <label className={lbl}>PT</label>
                            <div className="flex gap-1">
                              <input className={cn(inp, "flex-1", activeEvent.entity && "bg-slate-50")} value={activeEvent.entity || ''} onChange={(e) => updateActiveEvent('entity', e.target.value)} onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  openIcdBrowser('event', activeEventTab, activeEvent.entity);
                                }
                              }} />
                              <button onClick={() => openIcdBrowser('event', activeEventTab, activeEvent.entity)} className="w-5 h-[20px] bg-gray-100 border border-gray-400 flex items-center justify-center text-[10px] hover:bg-gray-200">🔍</button>
                            </div>
                            <label className={lbl}>PT code</label>
                            <input className={cn(inp, activeEvent.entityCode && "bg-slate-50")} value={activeEvent.entityCode || ''} onChange={(e) => updateActiveEvent('entityCode', e.target.value)} />
                          </div>
                        </div>
                        
                        {/* Seriousness Criteria Panel */}
                        <div className="border border-slate-200 bg-white p-1 mt-2">
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 px-2 py-0.5 text-[11px] font-bold border-b border-emerald-100 mb-1">Seriousness Criteria</div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pl-2 pb-1">
                            {[
                              { key: 'death', label: 'Death' },
                              { key: 'medically_significant', label: 'Medically Significant' },
                              { key: 'hospitalized', label: 'Hospitalized' },
                              { key: 'life_threatening', label: 'Life-threatening' },
                              { key: 'disability', label: 'Disability' },
                              { key: 'intervention_required', label: 'Intervention Required' },
                              { key: 'other', label: 'Other:' },
                              { key: 'congenital_anomaly', label: 'Congenital Anomaly' },
                            ].map(item => (
                              <label key={item.key} className="flex items-center gap-1 text-[10px] text-gray-700">
                                <input
                                  type="checkbox"
                                  className="w-3 h-3"
                                  checked={(activeEvent.seriousnessCriteria || []).includes(item.key)}
                                  onChange={(e) => {
                                    const prev = activeEvent.seriousnessCriteria || [];
                                    const updated = e.target.checked
                                      ? [...prev, item.key]
                                      : prev.filter(k => k !== item.key);
                                    updateActiveEvent('seriousnessCriteria', updated);
                                  }}
                                />
                                {item.label}
                              </label>
                            ))}
                            <input className={cn(inp, "col-span-1 mt-1")} />
                          </div>
                        </div>
                      </div>

                      {/* Right Side */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                          <label className={lbl}>Diagnosis</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-700"><input type="checkbox" className="w-3 h-3" /> Diagnosis</label>
                            <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-700"><input type="checkbox" className="w-3 h-3" /> Symptoms</label>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div><label className={lbl}>Onset Date/Time</label><input type="datetime-local" className={inp} defaultValue="" /></div>
                          <div><label className={lbl}>Onset From Last Dose</label><input className={inp} defaultValue="" /></div>
                          <div><label className={lbl}>Term Highlighted by Reporter</label><select className={sel}><option></option><option>Yes</option><option>No</option><option>UNK</option></select></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <div className="col-span-2"><label className={lbl}>Stop Date/Time</label><input type="datetime-local" className={cn(inp, "bg-slate-50")} defaultValue="" /></div>
                          <div><label className={lbl}>Duration</label><input className={inp} /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div><label className={lbl}>Onset Latency</label><input className={inp} defaultValue="" /></div>
                          <div><label className={lbl}>Receipt Date</label><input type="date" className={inp} defaultValue="" /></div>
                          <div><label className={lbl}>Patient Has Prior History?</label><select className={sel}><option></option><option>Yes</option><option>No</option><option>UNK</option></select></div>
                          <div className="col-start-3"><label className={lbl}>Treatment Received?</label><select className={sel}><option></option><option>Yes</option><option>No</option><option>UNK</option></select></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div><label className={lbl}>Intensity</label><input className={inp} /></div>
                          <div><label className={lbl}>Frequency</label><input className={inp} /></div>
                          <div><label className={lbl}>Outcome of Event</label><input className={inp} defaultValue="" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" /> Lack of Efficacy</label>
                          <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" /> Adverse Drug Withdrawal Reaction</label>
                          <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" /> Progression of Disease</label>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div><label className={lbl}>Related to Study Conduct?<br/>(As Reported)</label><select className={sel}><option></option></select></div>
                          <div><label className={lbl}>Related to Study Conduct?</label><select className={sel}><option></option></select></div>
                        </div>
                        <div className="mt-1">
                          <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" /> Dropped From Study Due to Event</label>
                        </div>
                        
                        <div className="border border-gray-300 mt-4 h-32 flex flex-col bg-white">
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 px-2 py-0.5 text-[10px] font-bold flex justify-between items-center border-b border-emerald-100">
                            <span># Nature of Event</span>
                            <div className="flex gap-0.5">
                              <button className="h-[16px] px-2 text-[9px] bg-gray-100 text-black border border-gray-400">Add...</button>
                              <button className="h-[16px] px-2 text-[9px] bg-gray-100 text-black border border-gray-400">Delete...</button>
                            </div>
                          </div>
                          <div className="flex-1"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 px-2 py-0.5 text-[11px] font-bold border-b border-t border-emerald-100 flex justify-between items-center mt-2 shadow-sm">
                    <span>Details</span>
                    <div className="flex items-center gap-1">
                      
                      <span className="text-[12px] bg-white px-0.5 border border-gray-300">📄</span>
                    </div>
                  </div>
                  <div className="p-2 h-16 bg-white">
                    <span className="text-[11px] text-gray-800">Possible</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Events' && activeSubTab === 'Event Assessment' && (
            <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden min-h-full bg-white flex flex-col">
              <table className="w-full text-[10px] text-left border-collapse">
                <thead className="bg-slate-100 text-slate-500 hover:bg-slate-200/60 border-b border-slate-200">
                  <tr>
                    <th className="px-1 py-1 font-bold border-r border-gray-300 w-1/4">Product</th>
                    <th className="px-1 py-1 font-bold border-r border-gray-300">As Reported Causality / As Determined Causa<br/>Event LLT (Description) / PT</th>
                    <th className="px-1 py-1 font-bold border-r border-gray-300">Seriousness<br/>Severity<br/>Duration</th>
                    <th className="px-1 py-1 font-bold border-r border-gray-300">Data Sheet</th>
                    <th className="px-1 py-1 font-bold border-r border-gray-300">License ⊟</th>
                    <th className="px-1 py-1 font-bold">As Determined<br/>Listedness</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="px-1 py-1 border-r border-b border-gray-300">
                      <select className={cn(sel, "w-full mb-1")}><option>--All--</option></select>
                    </td>
                    <td className="px-1 py-1 border-r border-b border-gray-300">
                      <select className={cn(sel, "w-full mb-1")}><option>--All--</option></select>
                    </td>
                    <td className="px-1 py-1 border-r border-b border-gray-300"></td>
                    <td className="px-1 py-1 border-r border-b border-gray-300">
                      <select className={cn(sel, "w-full mb-1")}>
                        <option>IB</option>
                        <option>SMPC</option>
                        <option>USPI</option>
                      </select>
                    </td>
                    <td className="px-1 py-1 border-r border-b border-gray-300">
                      <select className={cn(sel, "w-full mb-1")}><option>--Assigned--</option></select>
                    </td>
                    <td className="px-1 py-1 border-b border-gray-300"></td>
                  </tr>
                  {productTabs.filter(p => p.role === 'Suspect' || p.role === 'Interacting').map(product => 
                    eventTabs.map(event => {
                      const activeDatasheets = product.datasheets || [{ name: 'IB', licenses: [{name: 'CA (Inv: CAN235)'}, {name: 'EU (Inv: )'}, {name: 'US (Inv: 48,811)'}] }];
                      return (
                        <tr key={`${product.id}-${event.id}`}>
                          <td className="px-1 py-1 border-r border-gray-300 align-top">
                            <div className="flex gap-1 items-start mt-1">
                              <span className="bg-white border border-gray-400 px-0.5 text-[8px] text-amber-600 font-bold h-3">{product.isDR ? 'DR' : 'S'}</span>
                              
                              <span className="text-[12px] border border-gray-300 leading-none h-3 bg-white">📄</span>
                            </div>
                            <div className="text-blue-700 underline cursor-pointer mt-1 font-semibold leading-tight pr-2">{product.name || '(Unnamed Product)'}</div>
                          </td>
                          <td className="px-1 py-1 border-r border-gray-300 align-top">
                            <div className="flex gap-1 mt-1">
                              <select className={cn(sel, "w-20 text-red-600 font-semibold")} value={getAssessment(product.id, event.id, 'causalityReported')} onChange={(e) => updateAssessment(product.id, event.id, 'causalityReported', e.target.value)}>
                                <option value=""></option>
                                <option value="Certain">Certain</option>
                                <option value="Probable / Likely">Probable / Likely</option>
                                <option value="Possible">Possible</option>
                                <option value="Unlikely">Unlikely</option>
                                <option value="Conditional / Unclassified">Conditional / Unclassified</option>
                                <option value="Unassessable / Unclassifiable">Unassessable / Unclassifiable</option>
                                <option value="Not Related">Not Related</option>
                              </select>
                              <select className={cn(sel, "w-20 text-red-600 font-semibold")} value={getAssessment(product.id, event.id, 'causalityDetermined')} onChange={(e) => updateAssessment(product.id, event.id, 'causalityDetermined', e.target.value)}>
                                <option value=""></option>
                                <option value="Certain">Certain</option>
                                <option value="Probable / Likely">Probable / Likely</option>
                                <option value="Possible">Possible</option>
                                <option value="Unlikely">Unlikely</option>
                                <option value="Conditional / Unclassified">Conditional / Unclassified</option>
                                <option value="Unassessable / Unclassifiable">Unassessable / Unclassifiable</option>
                                <option value="Not Related">Not Related</option>
                              </select>
                            </div>
                            <div className="mt-1">
                              <span className="text-blue-700 underline cursor-pointer font-semibold">{event.name && event.name !== 'Unknown Entity' ? event.name : ''}</span> 
                              {event.descriptionReported && <span className="text-blue-700 underline cursor-pointer italic ml-1">({event.descriptionReported})</span>}
                              <div className="flex flex-col gap-0.5 mt-1 text-[9px] text-gray-600">
                                {event.chapter && <div><span className="text-gray-400">└</span> Chapter: <span className="text-blue-600">{event.chapter}</span></div>}
                                {event.block && <div className="pl-2"><span className="text-gray-400">└</span> SOC: <span className="text-blue-600">{event.block}</span></div>}
                                {event.category && <div className="pl-4"><span className="text-gray-400">└</span> HLGT: <span className="text-blue-600">{event.category}</span></div>}
                                <div className={event.category ? "pl-6 flex items-center gap-1 mt-0.5" : "pl-2 flex items-center gap-1 mt-0.5"}>
                                  <span className="text-gray-400">└</span>
                                  <span>PT:</span>
                                  <span className="text-blue-700 underline cursor-pointer">{event.entity || event.descriptionCoded || '...'}</span>
                                  {event.entityCode && <span className="text-gray-500">[{event.entityCode}]</span>}
                                  {event.entity && <span className="bg-white border border-green-500 px-1 text-green-500 font-bold text-[8px] leading-none py-0.5">✓</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-1 py-1 border-r border-gray-300 align-top pt-2 text-gray-800">{getSeriousnessAbbrev(event.seriousnessCriteria) || '—'}</td>
                          
                          {/* Datasheet Column */}
                          <td className="px-1 py-1 border-r border-gray-300 align-top pt-2 space-y-4">
                            {activeDatasheets.map((ds, idx) => (
                              <div key={idx} className="text-blue-700 underline cursor-pointer" style={{ marginBottom: `${(ds.licenses?.length || 1) * 20}px` }}>{ds.name}</div>
                            ))}
                          </td>
                          
                          {/* License Column */}
                          <td className="px-1 py-1 border-r border-gray-300 align-top pt-2">
                            {activeDatasheets.map((ds, dsIdx) => (
                              <div key={`lic-grp-${dsIdx}`} className="space-y-1" style={{ marginBottom: '20px' }}>
                                {ds.licenses?.map((lic, licIdx) => (
                                  <div key={`lic-${licIdx}`} className="text-blue-700 underline cursor-pointer truncate h-5 leading-5">{lic.name}</div>
                                ))}
                              </div>
                            ))}
                          </td>
                          
                          {/* Listedness Column */}
                          <td className="px-1 py-1 align-top pt-2">
                            {activeDatasheets.map((ds, dsIdx) => (
                              <div key={`list-grp-${dsIdx}`} className="space-y-1" style={{ marginBottom: '20px' }}>
                                {ds.licenses?.map((lic, licIdx) => {
                                  const listKey = `listedness-${dsIdx}-${licIdx}`;
                                  const listValue = getAssessment(product.id, event.id, listKey) || 'Listed';
                                  return (
                                    <div key={`list-${licIdx}`} className="flex items-center gap-1 h-5">
                                      <select className={cn(sel, "w-20", listValue === 'Unlisted' ? 'text-red-600' : 'text-green-600')} value={listValue} onChange={(e) => updateAssessment(product.id, event.id, listKey, e.target.value)}>
                                        <option>Listed</option>
                                        <option>Unlisted</option>
                                        <option>Unknown</option>
                                      </select>
                                      <div className={cn("w-2 h-2 rounded-full border border-gray-400", listValue === 'Unlisted' ? 'bg-red-500' : listValue === 'Listed' ? 'bg-green-500' : 'bg-gray-400')}></div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ======== Analysis Tab Content ======== */}
          {activeTab === 'Analysis' && activeSubTab === 'Case Analysis' && (
            <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden bg-white">
              <div className={secHeader}>Case Analysis</div>
              <div className="p-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-center mb-1">
                        <label className={lbl}>Narrative</label>
                        <div className="flex items-center gap-1">
                          <button className="h-[18px] px-2 text-[10px] bg-gray-100 border border-gray-400">Show Difference</button>
                          
                          <span className="text-[14px]">🔭</span>
                          <button className="h-[18px] px-2 text-[10px] bg-gray-100 border border-gray-400">Generate</button>
                        </div>
                      </div>
                      <textarea className={cn(inp, "w-full h-[280px] resize-none")} value={form.caseNarrative || ""} onChange={h('caseNarrative')} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className={lbl}>Case Comment</label>
                        <div className="flex items-center gap-1">
                          
                          <span className="text-[14px]">🔭</span>
                          <button className="h-[18px] px-2 text-[10px] bg-gray-100 border border-gray-400">Generate</button>
                        </div>
                      </div>
                      <textarea className={cn(inp, "w-full h-16 resize-none")} />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className={lbl}>Local Evaluator Comment</label>
                        <select className={cn(sel, "w-24")}><option></option></select>
                      </div>
                      <textarea className={cn(inp, "w-full h-16 resize-none bg-slate-50")} />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className={lbl}>Company Comment</label>
                        <div className="flex items-center gap-1">
                          
                          <span className="text-[14px]">🔭</span>
                          <button className="h-[18px] px-2 text-[10px] bg-gray-100 border border-gray-400">Generate</button>
                        </div>
                      </div>
                      <textarea className={cn(inp, "w-full h-16 resize-none")} />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className={lbl}>Evaluation in light of similar<br/>events in the past</label>
                        <div className="flex items-center gap-1">
                          
                          <span className="text-[14px]">🔭</span>
                          <button className="h-[18px] px-2 text-[10px] bg-gray-100 border border-gray-400">Generate</button>
                        </div>
                      </div>
                      <textarea className={cn(inp, "w-full h-16 resize-none")} />
                    </div>
                  </div>
                </div>
              </div>
              <div className={secHeader}>Case Summary</div>
              <div className="p-2 grid grid-cols-[200px_1fr] gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center"><label className={lbl}>Case Serious</label><select className={cn(sel, "w-24")}><option></option><option>Yes</option><option>No</option></select></div>
                  <div className="flex justify-between items-center"><label className={lbl}>Company Agent Causal</label><select className={cn(sel, "w-24")}><option></option><option>Yes</option><option>No</option></select></div>
                  <div className="flex justify-between items-center"><label className={lbl}>Listedness<br/>Determination</label><select className={cn(sel, "w-24")}><option></option><option>Listed</option><option>Unlisted</option><option>Unknown</option></select></div>
                  <div className="flex justify-between items-center"><label className={lbl}>Case Outcome</label><select className={cn(sel, "w-24")}><option></option><option>Recovered/Resolved</option><option>Recovering/Resolving</option><option>Not Recovered/Not Resolved</option><option>Fatal</option><option>Unknown</option><option>Unchanged</option></select></div>
                  <div className="flex justify-between items-center"><label className={lbl}>Company<br/>Diagnosis/Syndrome</label><div className="flex items-center gap-1"><button className="h-[18px] px-2 text-[9px] bg-gray-100 border border-gray-400">Encode</button><span className="text-red-500 font-bold text-[14px] cursor-pointer">❌</span></div></div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2"><label className={lbl}>Notes:</label><input className={cn(inp, "flex-1")} /></div>
                  <div className="flex items-start gap-2"><label className={lbl}>Notes:</label><input className={cn(inp, "flex-1")} /></div>
                  <div className="flex items-start gap-2"><label className={lbl}>Notes:</label><input className={cn(inp, "flex-1")} /></div>
                  <div className="h-[22px]"></div>
                  <div className="flex items-start gap-2 mt-4"><label className={lbl}>Notes:</label><input className={cn(inp, "flex-1")} /></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Analysis' && activeSubTab === 'MedWatch Info' && (
            <div className="border border-slate-200 shadow-sm rounded-sm overflow-hidden bg-white">
              <div className={secHeader}>MedWatch Information</div>
              <div className="p-2 grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="border border-slate-200">
                    <div className="bg-slate-50 px-2 py-0.5 text-[11px] font-bold border-b border-slate-200">B. Adverse Event or Product Problem</div>
                    <div className="p-2">
                      <label className="flex items-center gap-1 text-[10px] font-bold"><span className="w-4">1.</span><input type="checkbox" className="w-3 h-3" /> Adverse Event and/or Product Problem</label>
                    </div>
                  </div>
                  <div className="border border-slate-200">
                    <div className="bg-slate-50 px-2 py-0.5 text-[11px] font-bold border-b border-slate-200">C. Suspect Medication(s)</div>
                    <div className="p-2 flex gap-2 items-center">
                      <label className="text-[10px] font-bold">9. NDC #</label>
                      <input className={cn(inp, "w-32")} />
                    </div>
                  </div>
                  <div className="border border-slate-200">
                    <div className="bg-slate-50 px-2 py-0.5 text-[11px] font-bold border-b border-slate-200">G. All Manufacturers</div>
                    <div className="p-2 space-y-1">
                      <div className="text-[10px] font-bold mb-2">3. Report Source (check all that apply)</div>
                      {['Foreign', 'Literature', 'Health Professional', 'Company Representative', 'Study', 'Consumer', 'User Facility', 'Distributor'].map(src => (
                        <label key={src} className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" /> {src}</label>
                      ))}
                      <div className="flex items-center gap-2 mt-1">
                        <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" /> Other</label>
                        <input className={cn(inp, "w-48")} />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border border-slate-200">
                  <div className="bg-slate-50 px-2 py-0.5 text-[11px] font-bold border-b border-slate-200">F. For Use by User Facility/Importer (Devices Only)</div>
                  <div className="p-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] font-bold mb-1">1. Check one</div>
                        <div className="pl-4 space-y-1">
                          <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="radio" className="w-3 h-3" /> User Facility</label>
                          <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="radio" className="w-3 h-3" /> Importer</label>
                          <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="radio" className="w-3 h-3" /> Suppress Block F Printing</label>
                        </div>
                        <div className="mt-4">
                          <label className="text-[10px] font-bold block mb-0.5">2. UF/Dist report #</label>
                          <input className={cn(inp, "w-full")} />
                        </div>
                        <div className="mt-4">
                          <label className="text-[10px] font-bold block mb-0.5">3. User facility or distributor name/address</label>
                          <textarea className={cn(inp, "w-full h-12 resize-none")} />
                        </div>
                        <div className="mt-4">
                          <label className="text-[10px] font-bold block mb-0.5">4. Contact Person</label>
                          <input className={cn(inp, "w-full")} />
                        </div>
                        <div className="mt-4">
                          <label className="text-[10px] font-bold block mb-0.5">5. Phone Number</label>
                          <input className={cn(inp, "w-full")} />
                        </div>
                        <div className="mt-4">
                          <label className="text-[10px] font-bold block mb-0.5">6. Date aware of event</label>
                          <input type="date" className={cn(inp, "w-full")} />
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-[10px] font-bold mb-1">10. FDA Codes</div>
                        <table className="w-full text-[10px] border border-gray-300">
                          <thead><tr className="bg-slate-50"><th className="border border-gray-300 px-1 text-left">Patient</th><th className="border border-gray-300 px-1 text-left">Device</th></tr></thead>
                          <tbody>
                            {[1,2,3].map(row => (
                              <tr key={row}>
                                <td className="border border-gray-300 p-0.5"><div className="flex gap-1 items-center"><input className={cn(inp, "w-16")} /> - <input className={cn(inp, "w-16")} /></div></td>
                                <td className="border border-gray-300 p-0.5"><div className="flex gap-1 items-center"><input className={cn(inp, "w-16")} /> - <input className={cn(inp, "w-16")} /></div></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-4 flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[10px] font-bold"><span className="w-4">11.</span><input type="checkbox" className="w-3 h-3" /> Report sent to FDA</label>
                          <input className={cn(inp, "w-24")} />
                        </div>
                        <div className="mt-4 space-y-1">
                          <div className="text-[10px] font-bold mb-1">12. Location Where Event Occured</div>
                          {['Hospital', 'Home', 'Nursing Home', 'Outpatient Treatment', 'Outpatient Diagnostic', 'Ambulatory Surgical'].map(loc => (
                            <label key={loc} className="flex items-center gap-1 text-[10px] text-gray-700 pl-4"><input type="checkbox" className="w-3 h-3" /> {loc}</label>
                          ))}
                          <div className="flex items-center gap-2 pl-4 mt-1">
                            <label className="flex items-center gap-1 text-[10px] text-gray-700"><input type="checkbox" className="w-3 h-3" /> Other</label>
                            <input className={cn(inp, "w-32")} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* ======== Activities Tab Content ======== */}
          {activeTab === 'Activities' && (
            <div className="flex flex-col gap-2 min-h-full">
              {/* Contact Log */}
              <div className="border border-slate-200 shadow-sm rounded-sm bg-white">
                <div className={cn(secHeader, "flex justify-between items-center px-2 py-0.5")}>
                  <span>Contact Log ({contacts.length})</span>
                  <div className="flex gap-0.5">
                    <button className="h-[18px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400">New Letter</button>
                    <button onClick={handleAddContact} className="h-[18px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400">Add</button>
                    <button onClick={handleDeleteContact} className="h-[18px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400">Delete</button>
                  </div>
                </div>
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead className="bg-slate-50 text-gray-700 border-b border-gray-300">
                    <tr>
                      <th className="px-1 py-1 font-bold border-r border-gray-300 w-8">#</th>
                      <th className="px-1 py-1 font-bold border-r border-gray-300 w-1/4">Date<br/>Date Sent</th>
                      <th className="px-1 py-1 font-bold border-r border-gray-300">Code<br/>Description</th>
                      <th className="px-1 py-1 font-bold w-1/4">Group<br/>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact, idx) => (
                      <tr 
                        key={contact.id}
                        onClick={() => setSelectedContactId(contact.id)}
                        className={cn("border-b border-gray-300 cursor-pointer", selectedContactId === contact.id ? "bg-slate-50" : (idx % 2 === 0 ? "bg-white" : "bg-white"))}
                      >
                        <td className="px-1 py-1 border-r border-gray-300 align-top text-gray-700 font-bold">{idx + 1}.</td>
                        <td className="px-1 py-1 border-r border-gray-300 align-top space-y-1">
                          <input className={cn(inp, "w-24")} value={contact.date} onChange={(e) => updateContact(contact.id, 'date', e.target.value)} />
                          <div className="flex items-center gap-1">
                            <input className={cn(inp, "w-24")} value={contact.dateSent} onChange={(e) => updateContact(contact.id, 'dateSent', e.target.value)} />
                            <span className="text-[12px] bg-white border border-gray-400 leading-none h-[14px]">✉️</span>
                          </div>
                        </td>
                        <td className="px-1 py-1 border-r border-gray-300 align-top space-y-1">
                          <div className="flex items-center gap-1">
                            <input className={cn(inp, "w-32")} value={contact.code} onChange={(e) => updateContact(contact.id, 'code', e.target.value)} />
                            <span className="text-[14px]">✉️</span>
                          </div>
                          <div className="flex items-center gap-1 w-full">
                            <input className={cn(inp, "flex-1")} value={contact.description} onChange={(e) => updateContact(contact.id, 'description', e.target.value)} />
                            <span className="text-[14px] bg-gray-200 border border-gray-400 px-0.5 leading-none cursor-pointer">🔭</span>
                          </div>
                        </td>
                        <td className="px-1 py-1 align-top space-y-1">
                          <input className={cn(inp, "w-full")} value={contact.group} onChange={(e) => updateContact(contact.id, 'group', e.target.value)} />
                          <input className={cn(inp, "w-full")} value={contact.user} onChange={(e) => updateContact(contact.id, 'user', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Items */}
              <div className="border border-slate-200 shadow-sm rounded-sm bg-white">
                <div className={cn(secHeader, "flex justify-between items-center px-2 py-0.5")}>
                  <span>Action Items ({actionItems.length})</span>
                  <div className="flex gap-2 items-center text-black text-[10px] font-normal">
                    <span className="font-bold mr-1">Show</span>
                    <label className="flex items-center gap-1"><input type="radio" defaultChecked className="w-3 h-3" /> All</label>
                    <label className="flex items-center gap-1 mr-2"><input type="radio" className="w-3 h-3" /> Open</label>
                    <div className="flex gap-0.5">
                      <button onClick={handleAddActionItem} className="h-[18px] px-2 bg-gray-100 border border-gray-400">Add</button>
                      <button onClick={handleDeleteActionItem} className="h-[18px] px-2 bg-gray-100 border border-gray-400">Delete</button>
                      <button className="h-[18px] px-2 bg-gray-100 border border-gray-400">Up ▲</button>
                      <button className="h-[18px] px-2 bg-gray-100 border border-gray-400">Down ▼</button>
                    </div>
                  </div>
                </div>
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead className="bg-slate-50 text-gray-700 border-b border-gray-300">
                    <tr>
                      <th className="px-1 py-1 font-bold border-r border-gray-300 w-8">#</th>
                      <th className="px-1 py-1 font-bold border-r border-gray-300 w-1/4">Date Open<br/>Due / Completed</th>
                      <th className="px-1 py-1 font-bold border-r border-gray-300">Code<br/>Description</th>
                      <th className="px-1 py-1 font-bold w-1/4">Group<br/>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionItems.map((item, idx) => (
                      <tr 
                        key={item.id}
                        onClick={() => setSelectedActionItemId(item.id)}
                        className={cn("border-b border-gray-300 cursor-pointer", selectedActionItemId === item.id ? "bg-slate-50" : (idx % 2 === 0 ? "bg-white" : "bg-white"))}
                      >
                        <td className="px-1 py-1 border-r border-gray-300 align-top font-bold text-gray-700">{idx + 1}.</td>
                        <td className="px-1 py-1 border-r border-gray-300 align-top space-y-1">
                          <input className={cn(inp, "w-24")} value={item.dateOpen} onChange={(e) => updateActionItem(item.id, 'dateOpen', e.target.value)} />
                          <div className="pl-4"><input className={cn(inp, "w-24")} value={item.dateDue} onChange={(e) => updateActionItem(item.id, 'dateDue', e.target.value)} /></div>
                          <div className="pl-8"><input className={cn(inp, "w-24 border-red-500")} value={item.dateCompleted} onChange={(e) => updateActionItem(item.id, 'dateCompleted', e.target.value)} /></div>
                        </td>
                        <td className="px-1 py-1 border-r border-gray-300 align-top space-y-1">
                          <div className="flex justify-between items-center">
                            <input className={cn(inp, "w-48")} value={item.code} onChange={(e) => updateActionItem(item.id, 'code', e.target.value)} />
                            <span className="text-[14px] bg-gray-200 border border-gray-400 px-0.5 leading-none cursor-pointer">🔭</span>
                          </div>
                          <div className="flex items-center gap-1 w-full">
                            <input className={cn(inp, "flex-1")} value={item.description} onChange={(e) => updateActionItem(item.id, 'description', e.target.value)} />
                          </div>
                        </td>
                        <td className="px-1 py-1 align-top space-y-1">
                          <input className={cn(inp, "w-full")} value={item.group} onChange={(e) => updateActionItem(item.id, 'group', e.target.value)} />
                          <input className={cn(inp, "w-full")} value={item.user} onChange={(e) => updateActionItem(item.id, 'user', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Routing Comments */}
              <div className="border border-slate-200 shadow-sm rounded-sm bg-white">
                <div className={cn(secHeader, "flex justify-between items-center px-2 py-0.5")}>
                  <span>Routing Comments (2)</span>
                  <div className="flex gap-0.5">
                    <button className="h-[18px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400">Return</button>
                    <button onClick={() => window.dispatchEvent(new Event('route_case'))} className="h-[18px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400">Route...</button>
                  </div>
                </div>
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead className="bg-slate-50 text-gray-700 border-b border-gray-300">
                    <tr>
                      <th className="px-1 py-1 font-bold border-r border-gray-300 w-8">#</th>
                      <th className="px-1 py-1 font-bold border-r border-gray-300 w-1/4">Date<br/>User</th>
                      <th className="px-1 py-1 font-bold">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-300 bg-white">
                      <td className="px-1 py-1 border-r border-gray-300 align-top">2.</td>
                      <td className="px-1 py-1 border-r border-gray-300 align-top space-y-1">
                        <input className={cn(inp, "w-32")} defaultValue="" />
                        <input className={cn(inp, "w-full")} defaultValue="" />
                      </td>
                      <td className="px-1 py-1 align-top">
                        <div className="flex gap-1 h-full">
                          <textarea className={cn(inp, "w-full h-10 resize-none flex-1 bg-white")} defaultValue="" />
                          <div className="flex items-end pb-1"><span className="text-[14px] bg-gray-200 border border-gray-400 px-0.5 leading-none cursor-pointer">🔭</span></div>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-1 py-1 border-r border-gray-300 align-top">1.</td>
                      <td className="px-1 py-1 border-r border-gray-300 align-top space-y-1">
                        <input className={cn(inp, "w-32")} defaultValue="" />
                        <input className={cn(inp, "w-full")} defaultValue="" />
                      </td>
                      <td className="px-1 py-1 align-top">
                        <div className="flex gap-1 h-full">
                          <textarea className={cn(inp, "w-full h-8 resize-none flex-1 bg-white")} defaultValue="" />
                          <div className="flex items-end pb-1"><span className="text-[14px] bg-gray-200 border border-gray-400 px-0.5 leading-none cursor-pointer">🔭</span></div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Case Lock / Archive */}
              <div className="border border-slate-200 shadow-sm rounded-sm bg-white">
                <div className={secHeader}>Case Lock / Archive</div>
                <div className="p-2 flex gap-4">
                  <div className="space-y-4 w-1/3">
                    <div className="flex items-center gap-1">
                      <label className={cn(lbl, "w-24")}>Case Status</label>
                      <select className={cn(sel, "flex-1")}><option>Unlocked</option></select>
                      <span className="text-yellow-500 text-[14px]">🔓</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className={lbl}>Closure Date</label>
                        <input type="date" className={cn(inp, "w-full")} />
                      </div>
                      <div className="flex-1">
                        <label className={lbl}>Locked or Closed By</label>
                        <input className={cn(inp, "w-full")} />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className={lbl}>Notes</label>
                    <textarea className={cn(inp, "w-full h-16 resize-none bg-slate-50")} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======== Additional Info Tab Content ======== */}
          {activeTab === 'Additional Info' && (
            <div className="flex flex-col gap-2 min-h-full">
              {/* Notes and Attachment */}
              <div className="border border-slate-200 shadow-sm rounded-sm bg-white">
                <div className={cn(secHeader, "flex justify-between items-center px-2 py-0.5")}>
                  <span>Notes and Attachment ({attachments.length})</span>
                  <div className="flex gap-0.5">
                    <input 
                      type="file" 
                      accept=".pdf,.csv" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleAttachFile} 
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="h-[18px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400">Attach File</button>
                    <button onClick={handleAddAttachment} className="h-[18px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400">Add</button>
                    <button onClick={handleDeleteAttachment} className="h-[18px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400">Delete</button>
                    <button className="h-[18px] px-1 text-[10px] bg-gray-100 text-black border border-gray-400 flex items-center justify-center"><div className="w-2 h-0.5 bg-black"></div></button>
                  </div>
                </div>
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead className="bg-slate-50 text-gray-700 border-b border-gray-300">
                    <tr>
                      <th className="px-1 py-1 font-bold border-r border-gray-300 w-8">#</th>
                      <th className="px-1 py-1 font-bold border-r border-gray-300 w-1/4">Classification<br/>Date / Incl. Reg. Sub</th>
                      <th className="px-1 py-1 font-bold border-r border-gray-300">Keywords<br/>Description</th>
                      <th className="px-1 py-1 font-bold w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map((att, idx) => (
                      <tr 
                        key={att.id} 
                        onClick={() => setSelectedAttachmentId(att.id)}
                        className={cn("border-b border-gray-300 cursor-pointer", selectedAttachmentId === att.id ? "bg-slate-50" : (idx % 2 === 0 ? "bg-white" : "bg-white"))}
                      >
                        <td className="px-1 py-1 border-r border-gray-300 align-top text-red-600 font-bold">{idx + 1}.</td>
                        <td className="px-1 py-1 border-r border-gray-300 align-top space-y-1">
                          <input className={cn(inp, "w-full")} value={att.classification} onChange={(e) => updateAttachment(att.id, 'classification', e.target.value)} />
                          <input className={cn(inp, "w-24")} value={att.date} onChange={(e) => updateAttachment(att.id, 'date', e.target.value)} />
                        </td>
                        <td className="px-1 py-1 border-r border-gray-300 align-top space-y-1">
                          <input className={cn(inp, "w-full")} value={att.keywords} onChange={(e) => updateAttachment(att.id, 'keywords', e.target.value)} />
                          <input className={cn(inp, "w-full")} value={att.description} onChange={(e) => updateAttachment(att.id, 'description', e.target.value)} />
                        </td>
                        <td className="px-1 py-1 align-top space-y-1 flex flex-col items-end">
                          <button className="h-[18px] px-2 text-[10px] font-bold bg-white border border-gray-400 text-black flex items-center gap-1"><span className="text-[12px]">🔎</span> Select</button>
                          {att.filename && <div className="text-[9px] text-gray-500 truncate max-w-[80px]" title={att.filename}>{att.filename}</div>}
                          <div className="flex items-center gap-0.5 cursor-pointer mt-1 mr-1">
                            <span className="text-[14px]">🔭</span>
                            <span className="text-[12px] bg-white px-0.5 border border-gray-300 shadow-sm leading-none h-[14px] flex items-center">📄</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* References */}
              <div className="border border-slate-200 shadow-sm rounded-sm bg-white">
                <div className={cn(secHeader, "flex justify-between items-center px-2 py-0.5")}>
                  <span>References ({references.length})</span>
                  <div className="flex gap-0.5">
                    <button className="h-[18px] px-2 text-[10px] font-bold bg-white border border-gray-400 text-black flex items-center gap-1 mr-1"><span className="text-[12px]">🔎</span> Select</button>
                    <button onClick={handleAddReference} className="h-[18px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400">Add</button>
                    <button onClick={handleDeleteReference} className="h-[18px] px-2 text-[10px] bg-gray-100 text-black border border-gray-400">Delete</button>
                    <button className="h-[18px] px-1 text-[10px] bg-gray-100 text-black border border-gray-400 flex items-center justify-center"><div className="w-2 h-0.5 bg-black"></div></button>
                  </div>
                </div>
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead className="bg-slate-50 text-gray-700 border-b border-gray-300">
                    <tr>
                      <th className="px-1 py-1 font-bold border-r border-gray-300 w-8">#</th>
                      <th className="px-1 py-1 font-bold border-r border-gray-300 w-1/4">Type</th>
                      <th className="px-1 py-1 font-bold border-r border-gray-300 w-1/4">ID</th>
                      <th className="px-1 py-1 font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {references.map((ref, idx) => (
                      <tr 
                        key={ref.id} 
                        onClick={() => setSelectedReferenceId(ref.id)}
                        className={cn("border-b border-gray-300 cursor-pointer", selectedReferenceId === ref.id ? "bg-slate-50" : (idx % 2 === 0 ? "bg-white" : "bg-white"))}
                      >
                        <td className="px-1 py-1 border-r border-gray-300 align-top text-red-600 font-bold">{idx + 1}.</td>
                        <td className="px-1 py-1 border-r border-gray-300 align-top">
                          <input className={cn(inp, "w-full")} value={ref.type} onChange={(e) => updateReference(ref.id, 'type', e.target.value)} />
                        </td>
                        <td className="px-1 py-1 border-r border-gray-300 align-top">
                          <div className="flex items-center gap-1">
                            <input className={cn(inp, "w-full")} value={ref.refId} onChange={(e) => updateReference(ref.id, 'refId', e.target.value)} />
                            <span 
                              className="text-[14px] cursor-pointer" 
                              onClick={() => handleLinkCase(ref.refId)}
                              title="Link case and auto-fill parent info"
                            >🌍</span>
                          </div>
                        </td>
                        <td className="px-1 py-1 align-top">
                          <input className={cn(inp, "w-full")} value={ref.notes} onChange={(e) => updateReference(ref.id, 'notes', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
        </fieldset>
      </div>
      {/* Product Browser Modal */}
      {isCompanyProductModalOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-slate-50 w-[800px] border-2 border-emerald-100 shadow-xl flex flex-col font-sans">
            {/* Header */}
            <div className="bg--slate-200 text-white px-2 py-0.5 text-[11px] font-bold border-b border-emerald-100 flex justify-between">
              <span>Product Browser</span>
            </div>
            {/* Body */}
            <div className="p-2 space-y-2 bg-white m-1 border border-gray-300">
              <div className="flex gap-4 items-center mb-2 pb-2 border-b border-gray-300">
                <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" className="w-3 h-3" /> Full Search</label>
                <button className="h-[18px] px-2 text-[9px] bg-gray-100 border border-gray-400">Clear</button>
                <div className="flex items-center gap-1"><label className={lbl}>Drug Code</label><input className={cn(inp, "w-40")} /></div>
                <div className="flex items-center gap-1"><label className={lbl}>Country</label><input className={cn(inp, "w-40")} defaultValue="" /></div>
                <button className="h-[18px] px-3 text-[9px] bg-gray-100 border border-gray-400 ml-auto">Search</button>
              </div>
              <div className="grid grid-cols-4 gap-2 h-[200px]">
                {/* Columns */}
                <div className="flex flex-col border border-gray-300">
                  <div className="bg-gray-100 px-1 py-0.5 text-[10px] font-bold border-b border-gray-300">Ingredient</div>
                  <input className={cn(inp, "m-1")} />
                  <div className="flex-1 overflow-auto p-1 text-[10px]"><div className="bg-slate-50 p-0.5 border border-amber-200">AMOXICILLIN TRIHYDRATE</div></div>
                </div>
                <div className="flex flex-col border border-gray-300">
                  <div className="bg-gray-100 px-1 py-0.5 text-[10px] font-bold border-b border-gray-300">Family</div>
                  <input className={cn(inp, "m-1")} />
                  <div className="flex-1 overflow-auto p-1 text-[10px]"><div className="bg-slate-50 p-0.5 border border-amber-200">Wonder Drug - Family</div></div>
                </div>
                <div className="flex flex-col border border-gray-300">
                  <div className="bg-gray-100 px-1 py-0.5 text-[10px] font-bold border-b border-gray-300">Product Name</div>
                  <input className={cn(inp, "m-1")} />
                  <div className="flex-1 overflow-auto p-1 text-[10px]">
                    <div className="bg-slate-50 p-0.5 border border-amber-200 mb-0.5">Wonder Drug (Tablet...)</div>
                    <div className="bg-slate-50 p-0.5 border border-blue-200">Wonder Drug (Unknown...)</div>
                  </div>
                </div>
                <div className="flex flex-col border border-gray-300">
                  <div className="bg-gray-100 px-1 py-0.5 text-[10px] font-bold border-b border-gray-300">Trade Name</div>
                  <input className={cn(inp, "m-1")} defaultValue="" />
                  <div className="flex-1 overflow-auto p-1 text-[10px]">
                    <div className="p-0.5 text-gray-700">Wonder Drug (USA) (UNITED STATES 88-417)</div>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-300 pt-2 grid grid-cols-2 gap-4">
                <div className="grid grid-cols-[100px_1fr] gap-1 items-center">
                  <label className={lbl}>Family</label><input className={cn(inp, "bg-slate-50")} defaultValue="" />
                  <label className={lbl}>Ingredient</label><input className={cn(inp, "bg-slate-50")} defaultValue="" />
                  <label className={lbl}>Product Name</label><input className={cn(inp, "bg-slate-50")} defaultValue="" />
                  <label className={lbl}>Trade Name</label><input className={cn(inp, "bg-slate-50")} defaultValue="" />
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-1 items-center content-start">
                  <label className={lbl}>Model#</label><input className={cn(inp, "bg-slate-50")} />
                  <label className={lbl}>Company Drug Code</label><input className={cn(inp, "bg-slate-50")} />
                  <label className={lbl}>Indication</label><input className={cn(inp, "bg-slate-50")} />
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="bg-slate-50 p-1.5 flex justify-center gap-2 border-t border-slate-200">
              <button onClick={() => setIsCompanyProductModalOpen(false)} className="h-[20px] px-4 text-[10px] bg-white border border-gray-400 hover:bg-gray-50">Select</button>
              <button onClick={() => setIsCompanyProductModalOpen(false)} className="h-[20px] px-4 text-[10px] bg-white border border-gray-400 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* WHO Drug Coding Modal */}
      {isWhoDrugModalOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-slate-50 w-[850px] border-2 border-emerald-100 shadow-xl flex flex-col font-sans">
            <div className="bg--slate-200 text-white px-2 py-0.5 text-[11px] font-bold border-b border-emerald-100">
              Drug Coding (WHO-DRUG 2009-SEP)
            </div>
            <div className="p-2 space-y-2 bg-white m-1 border border-gray-300">
              <div className="flex flex-wrap gap-1.5 items-end mb-2 text-[10px] font-semibold text-gray-700">
                <div className="flex flex-col"><label>Product Type</label><select className={cn(sel, "w-14")}><option>(All)</option></select></div>
                <div className="flex flex-col"><label>ATC Code</label><input className={cn(inp, "w-14")} /></div>
                <div className="flex flex-col"><label className="flex items-center gap-1"><input type="radio" defaultChecked className="w-3 h-3" /> Drug Code</label><input className={cn(inp, "w-20")} /></div>
                <div className="flex flex-col"><label className="flex items-center gap-1"><input type="radio" className="w-3 h-3" /> Medicinal Prod ID</label><input className={cn(inp, "w-28")} /></div>
                <div className="flex flex-col"><label className="flex items-center gap-1"><input type="radio" className="w-3 h-3" /> Trade Name</label><input className={cn(inp, "w-28")} defaultValue="" /></div>
                <div className="flex flex-col"><label className="flex items-center gap-1"><input type="radio" className="w-3 h-3" /> Ingredient</label><input className={cn(inp, "w-20")} /></div>
                <div className="flex flex-col"><label>Formulation</label><input className={cn(inp, "w-14")} /></div>
                <div className="flex flex-col"><label>Country</label><input className={cn(inp, "w-14")} /></div>
                
                {/* Search / Clear Controls */}
                <div className="flex flex-col gap-1 ml-auto">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1"><input type="checkbox" className="w-3 h-3" /> Full Search</label>
                    <button className="h-[18px] px-3 text-[9px] bg-gray-100 border border-gray-400">Clear</button>
                  </div>
                  <button className="h-[18px] px-3 text-[9px] bg-gray-100 border border-gray-400 self-end">Search</button>
                </div>
              </div>
              <div className="border border-gray-300 h-[150px] overflow-auto">
                <table className="w-full text-[10px] text-left">
                  <thead className="sticky top-0 bg-slate-50 border-b border-gray-300 text-gray-700">
                    <tr>
                      <th className="px-1 py-1 font-bold">Trade Name <span className="text-amber-500">▲</span></th>
                      <th className="px-1 py-1 font-bold">Formulation / Strength</th>
                      <th className="px-1 py-1 font-bold">Sales Country</th>
                      <th className="px-1 py-1 font-bold">Generic?</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-slate-50"><td className="px-1 py-0.5 border-b border-gray-200">NEXIUM /01479302/</td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td></tr>
                    <tr className="bg-white"><td className="px-1 py-0.5 border-b border-gray-200">NEXIUM /01479303/</td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td></tr>
                    <tr className="bg-white"><td className="px-1 py-0.5 border-b border-gray-200">NEXIUM HP</td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td></tr>
                    <tr className="bg-slate-50"><td className="px-1 py-0.5 border-b border-gray-200">NEXIUM I.V.</td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td></tr>
                    <tr className="bg-white"><td className="px-1 py-0.5 border-b border-gray-200">NEXIUM-MUPS /01479302/</td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td><td className="px-1 py-0.5 border-b border-gray-200 border-l"></td></tr>
                  </tbody>
                </table>
              </div>
              <div className="border border-slate-200 mt-2">
                <div className="bg-slate-50 px-2 py-0.5 text-[11px] font-bold border-b border-slate-200">Drug Detail</div>
                <div className="p-1 grid grid-cols-[100px_1fr] gap-x-2 gap-y-1 items-center bg-slate-50">
                  <label className={lbl}>Trade Name</label>
                  <div className="flex gap-2"><input className={cn(inp, "bg-white flex-1")} defaultValue="" /><input className={cn(inp, "bg-white flex-1")} defaultValue="" /></div>
                  <label className={lbl}>MAH</label><input className={cn(inp, "bg-white")} defaultValue="" />
                  <label className={lbl}>Drug Code</label>
                  <div className="flex gap-2 items-center">
                    <input className={cn(inp, "bg-white flex-1")} defaultValue="" />
                    <label className={lbl}>ATC Code</label><input className={cn(inp, "bg-white w-24")} defaultValue="" />
                    <label className={lbl}>ATC Description</label><input className={cn(inp, "bg-white flex-1")} defaultValue="" />
                  </div>
                  <label className={lbl}>Medicinal Product ID</label><input className={cn(inp, "bg-white")} />
                  <label className={lbl}>Ingredients</label><input className={cn(inp, "bg-white")} defaultValue="" />
                </div>
              </div>
            </div>
            <div className="bg-slate-50 p-1.5 flex justify-center gap-2 border-t border-slate-200">
              <button onClick={() => setIsWhoDrugModalOpen(false)} className="h-[20px] px-4 text-[10px] bg-white border border-gray-400 hover:bg-gray-50">Select</button>
              <button onClick={() => setIsWhoDrugModalOpen(false)} className="h-[20px] px-4 text-[10px] bg-white border border-gray-400 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Save Success Modal */}
      {showSaveSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
          <div className="bg-slate-50 w-[400px] border-[2px] border-slate-200 rounded-t-[4px] shadow-xl flex flex-col font-tahoma overflow-hidden">
            {/* Title Bar */}
            <div className="bg-gradient-to-b from-brand-primary to-brand-primary/80 px-2 py-1 flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-white font-bold text-[12px] tracking-wide">
                <span>Argus Safety - Webpage Dialog</span>
              </div>
              <button onClick={() => setShowSaveSuccess(false)} className="bg-emerald-500 border border-white text-white rounded-[2px] w-[20px] h-[20px] flex items-center justify-center hover:bg-emerald-400 leading-none text-[12px] font-bold">✕</button>
            </div>
            
            <div className="p-4 bg-white flex-1 min-h-[100px] flex gap-3 relative">
              <div className="text-[32px] leading-none select-none drop-shadow-md">ℹ️</div>
              <div className="text-[12px] font-sans pt-2">
                Case {caseData?.case_number || '2010NA000028'} was saved successfully.
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-2 border-t border-gray-300 flex justify-center gap-2">
              <button onClick={() => setShowSaveSuccess(false)} className="px-5 py-0.5 border border-gray-400 bg-white hover:bg-slate-50 text-[11px] shadow-sm">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Print Case Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white w-[600px] border-[2px] border-slate-200 rounded-sm shadow-xl flex flex-col font-tahoma overflow-hidden">
            {/* Title Bar */}
            <div className="bg-gradient-to-b from--emerald-200 to--slate-200 px-2 py-1 flex justify-between items-center border-b border-white">
              <span className="text-white font-bold text-[11px] tracking-wide">Print Case</span>
              <button onClick={() => setShowPrintModal(false)} className="text-white hover:text-red-200 leading-none text-[12px] font-bold">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex px-2 pt-1 bg-white gap-0.5 border-b border-gray-400 mt-1">
              <div className="px-3 py-0.5 text-[11px] font-bold bg-white text-black border border-gray-400 border-b-white z-10 translate-y-[1px]">Print</div>
            </div>

            {/* Content area */}
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

            {/* Footer Buttons */}
            <div className="bg-white px-4 py-3 flex justify-center gap-3">
              <button onClick={() => {
                setShowPrintModal(false);
                const onsetDateStr = eventTabs[0]?.dateOfOnset || '';
                let onsetDay = '', onsetMonth = '', onsetYear = '';
                if (onsetDateStr && onsetDateStr !== '00-MMM-0000') {
                  const parts = onsetDateStr.split('-');
                  if (parts.length === 3) {
                    onsetDay = parts[0];
                    onsetMonth = parts[1];
                    onsetYear = parts[2];
                  }
                }
                const p = productTabs[0] || {};
                const therapyDates = [p.dosageStartDate, p.dosageStopDate].filter(Boolean).join(' to ');
                const dailyDose = [p.concentration, p.units].filter(Boolean).join(' ');
                const concomitant = productTabs.filter(pt => pt.role === 'Concomitant').map(pt => pt.name || pt.genericName).join(', ');
                const history = form.patMedicalHistory || form.parentMedicalHistory || '';
                const indication = p.indications && p.indications.length > 0 ? p.indications[0].reported : '';

                const pdfData = {
                  initials: form.patInitials || '',
                  country: form.patCountry || caseData?.country || '',
                  age: form.patAge ? `${form.patAge} ${form.patAgeUnits || ''}`.trim() : '',
                  sex: form.patGender || '',
                  weight: form.patWeight ? `${form.patWeight} ${form.patWeightUnits || ''}`.trim() : '',
                  description: form.caseNarrative || "",
                  onsetDay,
                  onsetMonth,
                  onsetYear,
                  suspectDrug: p.name || p.genericName || '',
                  route: p.route || p.formulation || '',
                  dailyDose,
                  therapyDates,
                  manufacturer: p.labeler || '',
                  indication,
                  concomitant,
                  history,
                  controlNo: caseData?.case_number || '',
                  dateReceived: form.caseReceiptDate || '',
                  reporterName: form.firstName || form.lastName ? `${form.firstName || ''} ${form.lastName || ''}`.trim() : '',
                  reportDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-').toUpperCase()
                };

                if (printCioms) generateCiomsPdf(pdfData);
                if (printAdr) generateAdrPdf(pdfData);
              }} className="px-4 py-0.5 text-[10px] bg-white border border-gray-400 text-gray-800 hover:bg-gray-50 shadow-sm">Print</button>
              <button onClick={() => setShowPrintModal(false)} className="px-4 py-0.5 text-[10px] bg-white border border-gray-400 text-gray-800 hover:bg-gray-50 shadow-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Case Details Modal */}
      {showCaseDetailsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
          <div className="bg-white w-[600px] border-[2px] border-slate-200 rounded-sm shadow-xl flex flex-col font-tahoma overflow-hidden">
            <div className="bg-gradient-to-b from--emerald-200 to--slate-200 px-2 py-1 flex justify-between items-center border-b border-white">
              <span className="text-white font-bold text-[11px] tracking-wide">Case Details</span>
              <button onClick={() => setShowCaseDetailsModal(false)} className="text-white hover:text-red-200 leading-none text-[12px] font-bold">✕</button>
            </div>
            <div className="bg-white border-t border-gray-400 p-2 min-h-[300px] max-h-[60vh] overflow-y-auto">
              <div className="font-sans text-[11px]">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-3 h-3 flex items-center justify-center border border-gray-400 text-[9px] cursor-pointer bg-white leading-none">-</span>
                  <span className="text-yellow-500">📁</span>
                  <span>Revisions</span>
                </div>
                <div className="pl-5 flex flex-col text-[10px]">
                  <div className="flex items-center gap-1 mb-1 w-fit pr-1">
                    <span className="text-gray-500 border border-gray-400 px-0.5 text-[8px]">📄</span>
                    <span className="text-black">Revision History</span>
                  </div>
                  {(() => {
                    const uniqueRevs = Array.from(new Set(revisions.map(r => r.rev))).map(revNum => revisions.find(r => r.rev === revNum));
                    return (
                      <>
                        {loadingRevisions ? (
                          <div className="pl-4 py-1 text-gray-500 italic">Loading...</div>
                        ) : uniqueRevs.length === 0 ? (
                          <div className="pl-4 py-1 text-gray-500 italic">No revision history found.</div>
                        ) : (
                          <>
                            <div className="grid grid-cols-[80px_100px_20px_100px_1fr] gap-2 mb-1 border-b border-gray-300 font-bold text-gray-600 mt-1 pb-1">
                              <span>Case Number</span>
                              <span>Revision Date</span>
                              <span>Rev</span>
                              <span>User</span>
                              <span>Action/Entity</span>
                            </div>
                            {uniqueRevs.map((rev, idx) => (
                              <div key={idx} className="grid grid-cols-[80px_100px_20px_100px_1fr] gap-2 mb-1 hover:bg-blue-50 cursor-pointer">
                                <span className="flex items-center gap-1 text-gray-500"><span className="text-[8px]">▶</span> <span className="text-black">{caseData?.case_number || 'Case'}</span></span>
                                <span>{rev.time}</span>
                                <span>{rev.rev}</span>
                                <span className="truncate" title={rev.user}>{rev.user}</span>
                                <span className="truncate" title={rev.parent}>{rev.parent}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="bg-white px-4 py-2 flex justify-end border-t border-gray-400">
              <button onClick={() => setShowCaseDetailsModal(false)} className="px-5 py-0.5 text-[11px] bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warnings Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-transparent">
          <div className="absolute top-[20%] right-[10%] bg-white w-[400px] border-[2px] border-slate-200 rounded-t-[4px] shadow-xl flex flex-col font-tahoma overflow-hidden">
            {/* Title Bar */}
            <div className="bg-gradient-to-b from-brand-primary to-brand-primary/80 px-2 py-1 flex justify-between items-center">
              <div className="flex items-center gap-1 text-white font-bold text-[11px] tracking-wide">
                <span>Argus Safety - Case Form Validations -- Webpage Dialog</span>
              </div>
              <button onClick={() => setShowValidationModal(false)} className="bg-emerald-500 border border-white text-white rounded-[2px] w-[18px] h-[18px] flex items-center justify-center hover:bg-emerald-400 leading-none text-[12px] font-bold">✕</button>
            </div>
            
            {/* Fake URL Bar */}
            <div className="bg-white border-b border-gray-400 px-2 py-0.5 text-[10px] text-gray-600 flex items-center gap-1">
              <span className="text-blue-600 text-[12px]">🌐</span> http://172.16.12.102:8083/ArgusNET/CommonWebUIComponent/Error/...
            </div>
            
            {/* Content */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 px-2 py-0.5 text-[11px] font-bold border-b border-emerald-100">Case Form Validations</div>
            <div className="bg-white border-b border-gray-400 p-4 flex gap-3 min-h-[140px] max-h-[300px] overflow-y-auto">
              <div className="text-[28px] leading-none drop-shadow-sm select-none">{validationErrors.length > 0 ? '⚠️' : '✅'}</div>
              <div className="text-[11px] font-sans w-full">
                <div className="font-bold mb-1 text-gray-800">{validationErrors.length > 0 ? 'Warnings:' : 'Success:'}</div>
                {validationErrors.length > 0 ? (
                  <ul className="text-gray-700 list-disc pl-4 space-y-1">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-700">No validation warnings found. Case is valid.</div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-b border-gray-400">
              <div></div>
              <div className="flex gap-2">
                <button className="px-5 py-0.5 text-[11px] bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Copy</button>
                <button onClick={() => setShowValidationModal(false)} className="px-5 py-0.5 text-[11px] bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">OK</button>
              </div>
            </div>
            <div className="bg-slate-50 px-2 py-0.5 text-[9px] text-gray-600 flex items-center gap-1">
              <span className="text-[10px]">🌐</span> Internet
            </div>
          </div>
        </div>
      )}

      {/* Close Prompt Modal */}
      {showClosePrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-transparent">
          <div className="bg-white w-[350px] border-[2px] border-slate-200 rounded-t-[4px] shadow-xl flex flex-col font-tahoma overflow-hidden">
            <div className="bg-gradient-to-b from-brand-primary to-brand-primary/80 px-2 py-1 flex justify-between items-center">
              <span className="text-white font-bold text-[11px] tracking-wide">Argus Safety Web -- Webpage Dialog</span>
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
              }} className="w-20 py-0.5 text-[11px] bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Yes</button>
              <button onClick={() => {
                setShowClosePrompt(false);
                setShowRoutePrompt(true);
              }} className="w-20 py-0.5 text-[11px] bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">No</button>
              <button onClick={() => setShowClosePrompt(false)} className="w-20 py-0.5 text-[11px] bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Route Prompt Modal */}
      {showRoutePrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-transparent">
          <div className="bg-white w-[400px] border-[2px] border-slate-200 rounded-t-[4px] shadow-xl flex flex-col font-tahoma overflow-hidden">
            <div className="bg-gradient-to-b from-brand-primary to-brand-primary/80 px-2 py-1 flex justify-between items-center">
              <span className="text-white font-bold text-[11px] tracking-wide">Route Case</span>
              <button onClick={() => setShowRoutePrompt(false)} className="bg-emerald-500 border border-white text-white rounded-[2px] w-[18px] h-[18px] flex items-center justify-center hover:bg-emerald-400 leading-none text-[12px] font-bold">✕</button>
            </div>
            <div className="bg-white border-b border-gray-400 p-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="text-[32px] text-blue-600 leading-none pb-2">?</div>
                <div className="text-[12px] text-black">Select User to Route for QC:</div>
              </div>
              <select className={sel} value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)}>
                <option value="">-- Select User --</option>
                {orgUsers.map(u => (
                  <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
              <textarea 
                className="w-full h-16 border border-slate-300 rounded p-1 text-[11px]" 
                placeholder="Routing comments..."
                value={routeComments}
                onChange={(e) => setRouteComments(e.target.value)}
              />
            </div>
            <div className="bg-slate-50 px-4 py-2 flex justify-center gap-2 border-b border-gray-400">
              <button onClick={() => {
                if (!selectedAssignee) return alert("Please select a user to route to.");
                api.post(`/cases/${id}/route`, { assigned_to: selectedAssignee, comments: routeComments })
                  .then(() => {
                    setShowRoutePrompt(false);
                    navigate('/workflow?filter=new');
                  })
                  .catch(err => {
                    console.error("Routing error:", err);
                    alert("Failed to route case");
                  });
              }} className="w-20 py-0.5 text-[11px] bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Route</button>
              <button onClick={() => setShowRoutePrompt(false)} className="w-20 py-0.5 text-[11px] bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>

    {/* Printable PDF Layouts */}
    {printLayout === 'case_form' && (
      <div className="hidden print:block font-sans text-[12px] bg-white text-black p-8 w-full max-w-[1000px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end border-b-2 border-gray-400 pb-1 mb-2">
          <div className="w-[200px] border border-gray-400 p-1 flex justify-center text-red-600 font-bold text-lg tracking-tighter shadow-sm bg-gray-50">
            ORACLE<br/><span className="text-[10px] text-gray-500 font-normal leading-none tracking-normal">HEALTH SCIENCES</span>
          </div>
          <div className="flex flex-col items-end">
            <h1 className="text-blue-800 text-xl font-bold">Case Record</h1>
            <span className="text-[10px] text-gray-500">28-Jul-2011 01:58 GMT-4:000000</span>
          </div>
        </div>
        
        <h2 className="text-blue-800 text-lg mb-2">Case Number {caseData?.case_number || '2010EU000009'}</h2>

        {/* Main Border Box */}
        <div className="border-[2px] border-black">
          
          {/* Top Info Section */}
          <div className="flex border-b-[2px] border-black h-24">
            <div className="w-1/2 p-4 flex items-center justify-center border-r-[2px] border-black">
              {/* Barcode Mockup */}
              <div className="font-barcode text-5xl tracking-widest bg-gray-100 px-4 py-2 w-full text-center">||| | ||||| |||| | |||||||</div>
            </div>
            <div className="w-1/2 p-1 text-[10px] grid grid-cols-2 gap-y-1 content-center">
              <div className="font-bold">Case ID:</div><div className="text-right pr-2">100078</div>
              <div className="font-bold">Received On:</div><div className="text-right pr-2">20-OCT-2010</div>
              <div className="font-bold">Initial Case User:</div><div className="text-right pr-2">Data Entry 2 (EU)</div>
              <div className="font-bold">Initial Case Site:</div><div className="text-right pr-2">European Union</div>
            </div>
          </div>

          {/* General Information */}
          <div className="bg-gray-200 border-b border-black px-1 font-bold text-[11px]">General Information</div>
          <div className="p-1 border-b border-black grid grid-cols-5 text-[10px] gap-2">
            <div><div className="font-bold">Report Type</div><div>Spontaneous</div></div>
            <div><div className="font-bold">Case Country</div><div>GERMANY</div></div>
            <div><div className="font-bold">Initial Receipt Date</div><div>20-OCT-2010</div></div>
            <div><div className="font-bold">Safety Receipt Date</div><div>21-OCT-2010</div></div>
            <div><div className="font-bold">Case Status</div><div>Data Entry</div></div>
          </div>
          <div className="p-1 border-b border-black text-[10px] min-h-[30px]">
            <div className="font-bold">Initial Justification</div>
          </div>
          <div className="p-1 border-b border-black grid grid-cols-2 text-[10px] min-h-[40px]">
            <div><div className="font-bold flex items-center gap-1"><input type="checkbox" className="w-3 h-3" /> Case Requires Follow-up</div></div>
            <div><div className="font-bold">Classification</div></div>
          </div>

          {/* Follow-up Log */}
          <div className="bg-gray-200 border-b border-black px-1 font-bold text-[11px]">Follow-up Log</div>
          <div className="p-1 border-b border-black text-[10px] text-center font-bold">
            No Information Present
          </div>

          {/* Reporter Information */}
          <div className="bg-gray-200 border-b border-black px-1 font-bold text-[11px]">Reporter Information</div>
          <div className="p-1 text-[10px] grid grid-cols-4 gap-2">
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
        <h2 className="font-bold text-[12px] mb-2 border-b-2 border-black pb-1">Case Number: {caseData?.case_number || '2010EU000009'}</h2>
        
        <div className="grid grid-cols-2 gap-4 border-b border-black pb-2 mb-2">
          <div>
            <h3 className="font-bold mb-1 italic">General Case Information</h3>
            <div className="grid grid-cols-[120px_1fr] text-[10px] gap-y-0.5">
              <div className="font-bold">Report Type</div><div>Spontaneous</div>
              <div className="font-bold">Initial Receipt Date</div><div>20-Oct-2010</div>
              <div className="font-bold">Case Creation Time</div><div>20-Oct-2010 16:29</div>
              <div className="font-bold">Case Country</div><div>GERMANY</div>
              <div className="font-bold">Health Care Professional</div><div>No</div>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-1 italic">Patient Information</h3>
            <div className="grid grid-cols-[100px_1fr] text-[10px] gap-y-0.5">
              <div className="font-bold">Age</div><div>21 Years</div>
              <div className="font-bold">Date of Birth</div><div>08-NOV-1988</div>
              <div className="font-bold">Weight</div><div>90.700 kg</div>
            </div>
          </div>
        </div>

        <div className="border-b border-black pb-2 mb-2">
          <h3 className="font-bold mb-1 italic">Reporter Information</h3>
          <div className="grid grid-cols-[120px_1fr] text-[10px]">
            <div className="font-bold">Reporter Type</div><div>Consumer</div>
          </div>
        </div>

        <div className="border-b border-black pb-2 mb-2">
          <h3 className="font-bold mb-1 italic">Narrative / Comment</h3>
          <div className="grid grid-cols-[120px_1fr] text-[10px]">
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
    {/* Significant Modal */}
    {showSignificantModal && (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[100]">
        <div className="bg-white border border-slate-200 rounded-sm w-[400px] shadow-xl font-sans text-[11px]">
          {/* Modal Header */}
          <div className="bg-brand-primary text-white px-2 py-0.5 flex justify-between items-center cursor-default">
            <div className="flex items-center gap-1">
              <span className="text-amber-500 text-[10px] italic font-serif">e</span>
              <span className="font-bold tracking-wide">Argus Safety -- Webpage Dialog</span>
            </div>
            <button onClick={() => setShowSignificantModal(false)} className="bg-white text-black w-[14px] h-[14px] flex items-center justify-center border border-t-white border-l-white border-b-gray-800 border-r-gray-800 font-bold text-[9px] leading-none active:bg-slate-100">X</button>
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 px-2 py-1 border-b border-emerald-100 font-bold">
            Case Form Operations
          </div>
          {/* Modal Content */}
          <div className="bg-white p-4 h-[120px] flex flex-col justify-between">
            <div className="flex gap-4 mt-2">
              <div className="text-[28px] leading-none text-yellow-400 drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)] select-none">⚠️</div>
              <div className="text-gray-900 mt-1">Is this follow-up significant?</div>
            </div>
            <div className="text-right mt-4">
              <a href="#" className="text-blue-600 underline hover:text-blue-800 text-[10px]">Copy</a>
            </div>
          </div>
          {/* Modal Footer */}
          <div className="p-2 border-t border-gray-400 flex justify-center gap-2 bg-white">
            <button onClick={handleSignificantModalYes} className="px-6 py-0.5 border border-slate-200 rounded-sm active:bg-slate-100 focus:outline border-black outline-1 outline-dotted outline-offset-[-3px]">Yes</button>
            <button onClick={handleSignificantModalNo} className="px-6 py-0.5 border border-slate-200 rounded-sm active:bg-slate-100">No</button>
          </div>
        </div>
      </div>
    )}

    {/* Justification Modal */}
    {showJustificationModal && (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[100]">
        <div className="bg-white border border-slate-200 rounded-sm w-[500px] shadow-xl font-sans text-[11px]">
          {/* Modal Header */}
          <div className="bg-brand-primary text-white px-2 py-0.5 flex justify-between items-center cursor-default">
            <div className="flex items-center gap-1">
              <span className="text-amber-500 text-[10px] italic font-serif">e</span>
              <span className="font-bold tracking-wide">Justification -- Webpage Dialog</span>
            </div>
            <button onClick={() => setShowJustificationModal(false)} className="bg-white text-black w-[14px] h-[14px] flex items-center justify-center border border-t-white border-l-white border-b-gray-800 border-r-gray-800 font-bold text-[9px] leading-none active:bg-slate-100">X</button>
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 text-slate-800 px-2 py-1 border-b border-emerald-100 font-bold">
            Follow-up Justification
          </div>
          {/* Modal Content */}
          <div className="bg-white p-2 border-b border-gray-400">
            <div className="font-bold mb-1 text-gray-900">Please enter a justification for performing this action:</div>
            <textarea 
              className="w-full h-[150px] border border-gray-400 p-1 mb-2 resize-none focus:outline-none focus:border-blue-500 shadow-inner"
              value={justificationText}
              onChange={(e) => setJustificationText(e.target.value)}
            />
            <div className="font-bold mb-1 text-gray-900">Select a standard justification for this field:</div>
            <div className="border border-gray-400 h-[60px] p-1 bg-white overflow-y-auto shadow-inner">
              <div className="cursor-default hover:bg-blue-600 hover:text-white px-1">Not specified</div>
            </div>
          </div>
          {/* Modal Footer */}
          <div className="p-2 flex justify-center gap-2 bg-white">
            <button className="px-4 py-0.5 border border-slate-200 rounded-sm text-gray-500 bg-white" disabled>Spell Check</button>
            <button onClick={handleJustificationOk} className="px-6 py-0.5 border border-slate-200 rounded-sm active:bg-slate-100 border-black outline-1 outline-dotted outline-offset-[-3px] bg-white">OK</button>
            <button onClick={() => setShowJustificationModal(false)} className="px-4 py-0.5 border border-slate-200 rounded-sm active:bg-slate-100 bg-white">Cancel</button>
          </div>
        </div>
      </div>
    )}

    {/* ICD Browser Modal */}
    <IcdBrowserModal 
      isOpen={showIcdBrowser}
      onClose={() => setShowIcdBrowser(false)}
      onSelect={handleIcdSelect}
      initialSearchTerm={icdSearchTerm}
    />

    </>
  );
}


