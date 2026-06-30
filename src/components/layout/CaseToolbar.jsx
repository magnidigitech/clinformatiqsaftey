import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  ImagePlus, FilePlus, FolderOpen, ListTodo, XSquare, Printer, Save,
  ArrowRight, ArrowLeft, Lock, Stethoscope, FileCode, FileText,
  FileCheck2, ShieldCheck, HelpCircle
} from 'lucide-react';
import api from '../../services/api';

export default function CaseToolbar({ onAction, caseId }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isNewCasePage = location.pathname === '/cases/new';

  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [routeToNextState, setRouteToNextState] = useState('(Current)');
  const [routeToUser, setRouteToUser] = useState('argus1');
  const [routeComments, setRouteComments] = useState('');
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    const handleSaveSuccess = () => {
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 5000);
    };

    const handleForwardCase = () => {
      setShowRoutingModal(true);
    };

    window.addEventListener('save_success', handleSaveSuccess);
    window.addEventListener('forward_case', handleForwardCase);

    return () => {
      window.removeEventListener('save_success', handleSaveSuccess);
      window.removeEventListener('forward_case', handleForwardCase);
    };
  }, []);

  const handleAction = (action, route) => {
    if (route) {
      navigate(route);
    } else {
      if (onAction) {
        onAction(action);
      }
      window.dispatchEvent(new CustomEvent(action));
    }
  };

  const handleRouteCase = async () => {
    if (!caseId) {
      alert("No case is currently open.");
      setShowRoutingModal(false);
      return;
    }
    try {
      setIsRouting(true);
      await api.put(`/cases/${caseId}`, {
        workflow_state: routeToNextState === '(Current)' ? undefined : routeToNextState,
        assigned_to: routeToUser === 'Any' ? undefined : routeToUser
      });
      setShowRoutingModal(false);
      // Navigate to Dashboard (Personal Argus Status)
      navigate('/');
    } catch (error) {
      console.error("Failed to route case:", error);
      alert("Failed to route case. Check console for details.");
    } finally {
      setIsRouting(false);
    }
  };

  const ToolbarBtn = ({ title, icon: Icon, action, route, iconClass }) => (
    <button
      title={title}
      onClick={() => handleAction(action, route)}
      className="w-[26px] h-[24px] flex items-center justify-center border border-[#6EE7C9] bg-gradient-to-b from-[#F8FCFB] to-[#F0FDFA] hover:from-[#D1FAF0] hover:to-[#A7F3E0] active:from-[#A7F3E0] active:to-[#B8DAD2] rounded-[2px]"
    >
      <Icon className={cn("w-3.5 h-3.5", iconClass || "text-gray-600")} />
    </button>
  );

  return (
    <>
      <div className="border border-[#6EE7C9] rounded-sm bg-[#F0FDFA] p-0.5 flex items-center ml-2">
        {showSaveSuccess && (
          <div className="bg-[#00FFBF] text-black text-[11px] px-2 py-[2px] mr-2 ml-1 shadow-sm border border-yellow-400">
            Case has been saved successfully!
          </div>
        )}
        <div className="flex items-center gap-px">
          <ToolbarBtn title="New Case from Image" icon={ImagePlus} action="new_from_image" />
          <ToolbarBtn title="New Case" icon={FilePlus} action="new_case" route="/cases/new" iconClass="text-amber-500" />
          <ToolbarBtn title="Open Case" icon={FolderOpen} action="open_case" route="/cases/open" iconClass="text-amber-600" />
          
          {!isNewCasePage && (
            <>
              <ToolbarBtn title="Worklist" icon={ListTodo} action="worklist" route="/workflow" />
              <ToolbarBtn title="Close Case" icon={XSquare} action="close_case" iconClass="text-red-500" />
              <ToolbarBtn title="Print Case" icon={Printer} action="print_case" />
              <ToolbarBtn title="Save Case" icon={Save} action="save_case" iconClass="text-blue-500" />
              <ToolbarBtn title="Forward Case" icon={ArrowRight} action="forward_case" iconClass="text-green-600" />
              <ToolbarBtn title="Return Case" icon={ArrowLeft} action="return_case" iconClass="text-red-600" />
              <ToolbarBtn title="Lock Case" icon={Lock} action="lock_case" iconClass="text-red-500" />
              <ToolbarBtn title="Medical Review" icon={Stethoscope} action="medical_review" iconClass="text-red-600" />
              <ToolbarBtn title="Coding Review" icon={FileCode} action="coding_review" />
              <ToolbarBtn title="Draft Report" icon={FileText} action="draft_report" />
              <ToolbarBtn title="E2B Check" icon={FileCheck2} action="e2b_check" iconClass="text-blue-600" />
              <ToolbarBtn title="Validation Check" icon={ShieldCheck} action="validation_check" iconClass="text-red-600" />
              <ToolbarBtn title="Help" icon={HelpCircle} action="help" />
            </>
          )}
        </div>
      </div>

      {/* Case Routing Modal */}
      {showRoutingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
          <div className="bg-[#D8ECE7] w-[650px] border border-[#04785B] shadow-sm flex flex-col font-sans">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#04785B] to-[#80CCB9] text-white px-2 py-1 text-sm font-bold flex justify-between items-center cursor-default">
              <div className="flex items-center gap-1">
                <span className="text-[11px] bg-white text-blue-800 italic font-serif px-1 rounded-sm border border-gray-400">e</span>
                <span>Case Routing -- Webpage Dialog</span>
              </div>
              <button onClick={() => setShowRoutingModal(false)} className="hover:bg-red-500 hover:text-white px-1 font-bold">X</button>
            </div>

            {/* Modal Body */}
            <div className="p-3">
              <div className="bg-white border border-[#7FB9AB] p-2">
                <div className="bg-[#84D3BF] text-white font-bold text-xs px-2 py-0.5 mb-2">Case Routing</div>
                
                <div className="grid grid-cols-[1fr_1.5fr] gap-x-6 gap-y-2 text-[11px] mb-4">
                  <div className="grid grid-cols-[100px_1fr] gap-y-2">
                    <span className="font-bold">Current State</span>
                    <span>{routeToNextState !== '(Current)' ? 'Pending QC' : 'Data Entry'}</span>
                    <span className="font-bold">Date</span>
                    <span>11-MAR-2026 19:22</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-y-2 items-center">
                    <span className="font-bold">Route to Next State</span>
                    <select 
                      className="border border-[#7FB9AB] w-full p-[1px]"
                      value={routeToNextState}
                      onChange={e => setRouteToNextState(e.target.value)}
                    >
                      <option>(Current)</option>
                      <option>Local Affiliate</option>
                      <option>Medical Review</option>
                    </select>
                    
                    <span className="font-bold">Route to User</span>
                    <select 
                      className="border border-[#7FB9AB] w-full p-[1px]"
                      value={routeToUser}
                      onChange={e => setRouteToUser(e.target.value)}
                    >
                      <option>Any</option>
                      <option>Administrator</option>
                      <option>argus1</option>
                      <option>argus2</option>
                      <option>System</option>
                    </select>

                    <span className="font-bold">Password</span>
                    <input type="password" className="border border-[#7FB9AB] w-full p-[1px]" />
                  </div>
                </div>

                <div className="border border-[#7FB9AB]">
                  <table className="w-full text-[11px] text-left border-collapse table-fixed">
                    <thead className="bg-[#D1DBD8]">
                      <tr>
                        <th className="font-normal px-2 py-1 border-b border-r border-[#7FB9AB] w-[110px]">Date</th>
                        <th className="font-normal px-2 py-1 border-b border-r border-[#7FB9AB] w-[80px]">User</th>
                        <th className="font-normal px-2 py-1 border-b border-[#7FB9AB] w-[300px]">Comments</th>
                        <th className="font-normal px-2 py-1 border-b border-[#7FB9AB] w-[100px]">Routings(2)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white border-b border-[#E0E0E0]">
                        <td className="px-2 py-1 align-top border-r border-[#E0E0E0]">11-MAR-2026 19:22</td>
                        <td className="px-2 py-1 align-top border-r border-[#E0E0E0]">argus1</td>
                        <td colSpan={2} className="px-1 py-1 align-top">
                          <textarea 
                            className="w-full border border-[#7FB9AB] h-12 resize-none p-1"
                            value={routeComments}
                            onChange={e => setRouteComments(e.target.value)}
                          ></textarea>
                        </td>
                      </tr>
                      <tr className="bg-[#F9F9F9] border-b border-[#E0E0E0]">
                        <td className="px-2 py-1 align-top border-r border-[#E0E0E0]">10-MAR-2026 08:42</td>
                        <td className="px-2 py-1 align-top border-r border-[#E0E0E0]">argus1</td>
                        <td colSpan={2} className="px-1 py-1 align-top">
                          <div className="border border-[#7FB9AB] bg-white h-12 p-1 overflow-y-auto">
                            Case routed from Data Entry by argus1 to Data Entry, (Any) routed to next wf
                          </div>
                        </td>
                      </tr>
                      <tr className="bg-white">
                        <td className="px-2 py-1 align-top border-r border-[#E0E0E0]">10-MAR-2026 07:20</td>
                        <td className="px-2 py-1 align-top border-r border-[#E0E0E0]">argus1</td>
                        <td colSpan={2} className="px-1 py-1 align-top">
                          <div className="border border-[#7FB9AB] bg-white h-12 p-1 overflow-y-auto">
                            Automated initial case routing did not match to an existing workflow rule.
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-center gap-3 py-2 bg-[#D8ECE7] border-t border-gray-300">
              <button 
                className="px-5 py-0.5 border-[2px] border-t-white border-l-white border-b-gray-800 border-r-gray-800 text-black bg-[#C8D4D1] active:border-t-gray-800 active:border-l-gray-800 active:border-b-white active:border-r-white outline-1 outline-dotted outline-offset-[-3px] text-[11px]"
                onClick={handleRouteCase}
                disabled={isRouting}
              >
                {isRouting ? 'Routing...' : 'OK'}
              </button>
              <button 
                className="px-5 py-0.5 border-[2px] border-t-white border-l-white border-b-gray-800 border-r-gray-800 text-black bg-[#C8D4D1] active:border-t-gray-800 active:border-l-gray-800 active:border-b-white active:border-r-white text-[11px]"
                onClick={() => setShowRoutingModal(false)}
                disabled={isRouting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
