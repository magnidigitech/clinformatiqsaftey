import { useState, useEffect, useCallback, useMemo } from 'react';
import useAuth from '@/hooks/useAuth';
import * as userService from '@/services/userService';
import * as collegeBatchService from '@/services/collegeBatchService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import ClinformatiqLogo from '@/components/layout/ClinformatiqLogo';
import * as XLSX from 'xlsx';
import { 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  UserPlus, 
  Trash2, 
  Key, 
  Search, 
  RefreshCw, 
  LogOut, 
  Laptop, 
  Globe, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Upload,
  Download,
  Info,
  Shield,
  Activity,
  Smartphone,
  GraduationCap,
  Building2,
  Layers,
  CheckSquare,
  Square,
  ArrowRight,
  Edit,
  Plus,
  Filter,
  Check,
  UserCheck,
  UserX,
  User
} from 'lucide-react';

export default function UsersPage() {
  const { isAuthenticated, user: currentUser, login, logout } = useAuth();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Authenticated Dashboard state (persisted across refresh)
  const [activeTab, setActiveTabState] = useState(() => {
    return localStorage.getItem('pharmavigil_users_active_tab') || 'users';
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    localStorage.setItem('pharmavigil_users_active_tab', tab);
  };
  const [users, setUsers] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter state for Users
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [collegeFilter, setCollegeFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');

  // Multi-select for bulk user operations
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Create / Edit User Modal State
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'STUDENT',
    org_id: '',
    batch_id: ''
  });
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Create / Edit College Modal State
  const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [collegeForm, setCollegeForm] = useState({
    name: '',
    type: 'COLLEGE', // 'COLLEGE' | 'IN_HOUSE'
    status: 'ACTIVE' // 'ACTIVE' | 'INACTIVE'
  });
  const [isSavingCollege, setIsSavingCollege] = useState(false);
  const [collegeToDelete, setCollegeToDelete] = useState(null);

  // Create / Edit Batch Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [batchForm, setBatchForm] = useState({
    name: '',
    org_id: '',
    description: '',
    status: 'ACTIVE'
  });
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);

  // Bulk Batch Assignment Modal State
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkAssignTarget, setBulkAssignTarget] = useState({
    org_id: '',
    batch_id: ''
  });
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Bulk Delete Modal State
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Batch Roster / Student Inspector Modal State
  const [inspectingBatch, setInspectingBatch] = useState(null);

  // Delete Confirmation Modal State (Single User)
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Reset Password Modal State
  const [userToResetPassword, setUserToResetPassword] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Bulk Excel Upload Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkParsedRows, setBulkParsedRows] = useState([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkSummary, setBulkSummary] = useState(null);

  // Session Detail Inspector Modal State
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState(null);

  // Bulk Session Selection State
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [isBulkRevokingSessions, setIsBulkRevokingSessions] = useState(false);

  // Admin Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    password: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Flash toast message helper
  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  const showErrorToast = (msg) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  // Fetch all data (supports silent background AJAX polling without jumping/loading UI)
  const fetchData = useCallback(async (silent = false) => {
    if (!isAuthenticated) return;
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const [fetchedUsers, fetchedColleges, fetchedBatches, fetchedSessions] = await Promise.all([
        userService.getUsers(),
        collegeBatchService.getColleges(),
        collegeBatchService.getBatches(),
        userService.getActiveSessions()
      ]);
      setUsers(fetchedUsers || []);
      setColleges(fetchedColleges || []);
      setBatches(fetchedBatches || []);
      setSessions(fetchedSessions || []);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Error loading management data:', err);
      if (!silent) {
        showErrorToast(err.response?.data?.message || 'Failed to load system data.');
      }
    } finally {
      if (!silent) setLoading(false);
      else setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      fetchData(false);
    }
  }, [isAuthenticated, fetchData]);

  // AJAX Live Auto-Refresh (Polling every 8 seconds & on window focus)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      // Don't interrupt while user is actively interacting with modals
      if (!isCreateUserModalOpen && !isCollegeModalOpen && !isBatchModalOpen && !isBulkModalOpen && !userToResetPassword && !editingUser && !editingCollege && !editingBatch) {
        fetchData(true);
      }
    }, 8000);

    const handleFocus = () => {
      if (!isCreateUserModalOpen && !isCollegeModalOpen && !isBatchModalOpen && !isBulkModalOpen && !userToResetPassword) {
        fetchData(true);
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, fetchData, isCreateUserModalOpen, isCollegeModalOpen, isBatchModalOpen, isBulkModalOpen, userToResetPassword, editingUser, editingCollege, editingBatch]);

  // Parse raw User-Agent into clean human-readable device & browser info
  const parseUserAgent = (ua) => {
    if (!ua) return { browser: 'Unknown Browser', os: 'Unknown OS', deviceType: 'Desktop', summary: 'Web Client', isMobile: false };
    let os = 'Unknown OS';
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Windows NT 10.0')) os = 'Windows 11/10';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('iPhone')) os = 'iOS (iPhone)';
    else if (ua.includes('iPad')) os = 'iOS (iPad)';
    else if (ua.includes('Android')) os = 'Android';

    let browser = 'Web Browser';
    if (ua.includes('Electron')) browser = 'Electron Desktop App';
    else if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Google Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';

    const isMobile = ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone');
    const deviceType = isMobile ? 'Mobile Device' : 'Desktop Laptop';

    return { browser, os, deviceType, summary: `${browser} (${os})`, isMobile };
  };

  const formatIP = (ip) => {
    if (!ip) return '127.0.0.1 (Localhost)';
    if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') return '127.0.0.1 (Localhost)';
    return ip;
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return 'Just now';
    const diffSec = Math.max(0, Math.floor((new Date() - new Date(dateStr)) / 1000));
    if (diffSec < 45) return 'Active just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    return `${Math.floor(diffSec / 86400)} days ago`;
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      ['Username', 'Password', 'Full Name', 'Email', 'Role', 'College', 'Batch'],
      ['alexj', 'Pass1234!', 'Alex Johnson', 'alex@college.edu', 'STUDENT', 'Pharmavigil College', 'Batch 2026'],
      ['rahuls', 'Pass1234!', 'Rahul Sharma', 'rahul@inhouse.org', 'STUDENT', 'Clinformatiq In-House Lab', 'In-House Cohort A'],
      ['profsmith', 'Pass1234!', 'Prof. Sarah Smith', 'sarah@college.edu', 'INSTRUCTOR', 'Pharmavigil College', 'Batch 2026'],
      ['johnadmin', 'Pass1234!', 'John Administrator', 'john@college.edu', 'ADMIN', 'Pharmavigil College', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'UsersTemplate');
    XLSX.writeFile(wb, 'pharmavigil_users_colleges_batches_template.xlsx');
  };

  // Parse Uploaded Excel/CSV File
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file);
    setBulkSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const normalized = data.map((row) => {
          const getVal = (keys) => {
            for (const k of Object.keys(row)) {
              if (keys.some(key => k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
                return row[k];
              }
            }
            return '';
          };

          const usernameVal = String(getVal(['username', 'user', 'uname'])).trim();
          return {
            username: usernameVal,
            password: String(getVal(['password', 'pass', 'pwd'])).trim() || 'Password123',
            full_name: String(getVal(['fullname', 'full_name', 'name', 'user_name'])).trim() || usernameVal,
            email: String(getVal(['email', 'mail', 'emailaddress'])).trim() || `${usernameVal}@college.edu`,
            role: String(getVal(['role', 'userrole', 'type'])).trim().toUpperCase() || 'STUDENT',
            college: String(getVal(['college', 'collegename', 'organisation', 'org_name', 'org'])).trim(),
            batch: String(getVal(['batch', 'batchname', 'cohort', 'class'])).trim()
          };
        }).filter(r => r.username.length > 0);

        setBulkParsedRows(normalized);
      } catch (err) {
        showErrorToast('Failed to parse Excel/CSV file. Please ensure it is a valid spreadsheet.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm Bulk Import
  const handleConfirmBulkImport = async () => {
    if (bulkParsedRows.length === 0) return;
    setBulkImporting(true);
    setBulkSummary(null);
    try {
      const res = await userService.bulkCreateUsers(bulkParsedRows);
      setBulkSummary(res.summary);
      showToast(`Bulk import completed: ${res.summary.created} created, ${res.summary.skipped} skipped.`);
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Bulk import failed.');
    } finally {
      setBulkImporting(false);
    }
  };

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await login(username, password);
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Check if entered username already exists (case-insensitive)
  const isUsernameTaken = useMemo(() => {
    if (!userForm.username || !userForm.username.trim()) return false;
    const clean = userForm.username.trim().toLowerCase();
    return users.some(u => 
      u.username.toLowerCase() === clean && 
      u.user_id !== editingUser?.user_id
    );
  }, [userForm.username, users, editingUser]);

  // Handle Save User (Create or Edit)
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser && isUsernameTaken) {
      showErrorToast(`Username '${userForm.username.trim()}' is already taken. Please choose a different username.`);
      return;
    }
    setIsSavingUser(true);
    try {
      if (editingUser) {
        await userService.updateUser(editingUser.user_id, {
          full_name: userForm.full_name,
          email: userForm.email,
          role: userForm.role,
          org_id: userForm.org_id ? parseInt(userForm.org_id) : undefined,
          batch_id: userForm.batch_id ? parseInt(userForm.batch_id) : null,
          password: userForm.password ? userForm.password : undefined
        });
        showToast(`User '${userForm.username}' updated successfully.`);
      } else {
        await userService.createUser({
          username: userForm.username.trim(),
          password: userForm.password,
          full_name: userForm.full_name,
          email: userForm.email,
          role: userForm.role,
          org_id: userForm.org_id ? parseInt(userForm.org_id) : undefined,
          batch_id: userForm.batch_id ? parseInt(userForm.batch_id) : null
        });
        showToast(`User '${userForm.username}' created successfully.`);
      }
      setIsCreateUserModalOpen(false);
      setEditingUser(null);
      setUserForm({ username: '', password: '', full_name: '', email: '', role: 'STUDENT', org_id: '', batch_id: '' });
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to save user account.');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Handle Save College / In-House Unit
  const handleSaveCollege = async (e) => {
    e.preventDefault();
    if (!collegeForm.name.trim()) return;
    setIsSavingCollege(true);
    try {
      if (editingCollege) {
        await collegeBatchService.updateCollege(editingCollege.org_id, {
          name: collegeForm.name,
          type: collegeForm.type,
          status: collegeForm.status
        });
        showToast(`College '${collegeForm.name}' updated successfully.`);
      } else {
        await collegeBatchService.createCollege({
          name: collegeForm.name,
          type: collegeForm.type,
          status: collegeForm.status
        });
        showToast(`${collegeForm.type === 'IN_HOUSE' ? 'In-House Unit' : 'College'} '${collegeForm.name}' created successfully.`);
      }
      setIsCollegeModalOpen(false);
      setEditingCollege(null);
      setCollegeForm({ name: '', type: 'COLLEGE', status: 'ACTIVE' });
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to save college/organisation.');
    } finally {
      setIsSavingCollege(false);
    }
  };

  // Handle Delete College
  const handleDeleteCollegeConfirm = async () => {
    if (!collegeToDelete) return;
    try {
      await collegeBatchService.deleteCollege(collegeToDelete.org_id);
      showToast(`College '${collegeToDelete.name}' removed successfully.`);
      setCollegeToDelete(null);
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to delete college.');
    }
  };

  // Handle Save Batch
  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.name.trim() || !batchForm.org_id) return;
    setIsSavingBatch(true);
    try {
      if (editingBatch) {
        await collegeBatchService.updateBatch(editingBatch.batch_id, {
          name: batchForm.name,
          org_id: parseInt(batchForm.org_id),
          description: batchForm.description,
          status: batchForm.status
        });
        showToast(`Batch '${batchForm.name}' updated successfully.`);
      } else {
        await collegeBatchService.createBatch({
          name: batchForm.name,
          org_id: parseInt(batchForm.org_id),
          description: batchForm.description
        });
        showToast(`Batch '${batchForm.name}' created successfully.`);
      }
      setIsBatchModalOpen(false);
      setEditingBatch(null);
      setBatchForm({ name: '', org_id: '', description: '', status: 'ACTIVE' });
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to save batch.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Handle Delete Batch
  const handleDeleteBatchConfirm = async () => {
    if (!batchToDelete) return;
    try {
      await collegeBatchService.deleteBatch(batchToDelete.batch_id);
      showToast(`Batch '${batchToDelete.name}' deleted.`);
      setBatchToDelete(null);
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to delete batch.');
    }
  };

  // Handle Bulk Assign to Batch
  const handleBulkAssignBatchSubmit = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;
    setIsBulkAssigning(true);
    try {
      const res = await collegeBatchService.bulkAssignUsersBatch(
        selectedUserIds,
        bulkAssignTarget.org_id ? parseInt(bulkAssignTarget.org_id) : undefined,
        bulkAssignTarget.batch_id ? parseInt(bulkAssignTarget.batch_id) : null
      );
      showToast(res.message || `Assigned ${selectedUserIds.length} users to batch.`);
      setIsBulkAssignModalOpen(false);
      setSelectedUserIds([]);
      setBulkAssignTarget({ org_id: '', batch_id: '' });
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Bulk batch assignment failed.');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // Handle Bulk Revoke Batch
  const handleBulkRevokeBatch = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      const res = await collegeBatchService.bulkRevokeUsersBatch(selectedUserIds);
      showToast(res.message || `Revoked batch assignment for ${selectedUserIds.length} users.`);
      setSelectedUserIds([]);
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to revoke batch assignments.');
    }
  };

  // Handle Bulk Delete Users
  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await userService.bulkDeleteUsers(selectedUserIds);
      showToast(res.message || `Removed ${selectedUserIds.length} user(s) successfully.`);
      setIsBulkDeleteModalOpen(false);
      setSelectedUserIds([]);
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to remove selected users.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Handle Delete Single User Confirm
  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;
    if (userToDelete.role === 'ADMIN' || userToDelete.username === 'admin') {
      showErrorToast('System Administrator accounts are protected and cannot be deleted.');
      setUserToDelete(null);
      return;
    }
    setIsDeletingUser(true);
    try {
      const res = await userService.deleteUser(userToDelete.user_id);
      showToast(res.message || 'User deleted successfully.');
      setUserToDelete(null);
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to remove user.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Handle Revoke Session
  const handleRevokeSession = async (sessionId) => {
    try {
      await userService.revokeSession(sessionId);
      showToast('Login session revoked immediately.');
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to revoke session.');
    }
  };

  // Handle Reset Password Confirm
  const handleResetPasswordConfirm = async (e) => {
    e.preventDefault();
    if (!userToResetPassword || !resetPasswordValue) return;
    setIsResettingPassword(true);
    try {
      await userService.updateUser(userToResetPassword.user_id, { password: resetPasswordValue });
      showToast(`Password successfully updated for user '${userToResetPassword.username}'.`);
      setUserToResetPassword(null);
      setResetPasswordValue('');
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Toggle Single User Selection
  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Directory users (Excludes System Administrator from student directory)
  const studentUsers = useMemo(() => {
    return users.filter(u => u.role !== 'ADMIN');
  }, [users]);

  // Filtered Users list (Search & Filters applied only to directory users)
  const filteredUsers = useMemo(() => {
    return studentUsers.filter(u => {
      const matchesSearch = 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.organisation?.name && u.organisation.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.batch?.name && u.batch.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
      const matchesCollege = collegeFilter === 'ALL' || String(u.org_id) === String(collegeFilter);
      const matchesBatch = batchFilter === 'ALL' || 
        (batchFilter === 'UNASSIGNED' ? !u.batch_id : String(u.batch_id) === String(batchFilter));

      return matchesSearch && matchesRole && matchesStatus && matchesCollege && matchesBatch;
    });
  }, [studentUsers, searchQuery, roleFilter, statusFilter, collegeFilter, batchFilter]);

  // Toggle Select All filtered users
  const handleToggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.user_id));
    }
  };

  // Open Admin Profile Modal
  const handleOpenProfile = () => {
    const adminUser = users.find(u => u.role === 'ADMIN') || currentUser;
    setProfileForm({
      full_name: adminUser?.full_name || currentUser?.full_name || 'System Administrator',
      email: adminUser?.email || currentUser?.email || 'admin@clinformatiq.com',
      password: ''
    });
    setIsProfileModalOpen(true);
  };

  // Save Admin Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const adminUser = users.find(u => u.role === 'ADMIN') || currentUser;
    if (!adminUser) return;
    setIsSavingProfile(true);
    try {
      await userService.updateUser(adminUser.user_id, {
        full_name: profileForm.full_name,
        email: profileForm.email,
        password: profileForm.password ? profileForm.password : undefined
      });
      showToast('Administrator profile updated successfully.');
      setIsProfileModalOpen(false);
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Dynamic batches list based on selected college in forms
  const formBatches = useMemo(() => {
    if (!userForm.org_id) return batches;
    return batches.filter(b => String(b.org_id) === String(userForm.org_id));
  }, [batches, userForm.org_id]);

  const bulkAssignFormBatches = useMemo(() => {
    if (!bulkAssignTarget.org_id) return batches;
    return batches.filter(b => String(b.org_id) === String(bulkAssignTarget.org_id));
  }, [batches, bulkAssignTarget.org_id]);

  // Toggle single session selection
  const toggleSessionSelection = (sessionId) => {
    setSelectedSessionIds(prev => 
      prev.includes(sessionId) ? prev.filter(id => id !== sessionId) : [...prev, sessionId]
    );
  };

  // Toggle select all other sessions (excluding current active session)
  const handleToggleSelectAllSessions = () => {
    const selectable = filteredSessions.filter(s => !s.is_current);
    if (selectedSessionIds.length === selectable.length && selectable.length > 0) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(selectable.map(s => s.session_id));
    }
  };

  // Bulk revoke selected sessions
  const handleBulkRevokeSessions = async () => {
    if (selectedSessionIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to terminate ${selectedSessionIds.length} selected session(s)? Affected users will be logged out immediately.`)) {
      return;
    }
    setIsBulkRevokingSessions(true);
    try {
      const res = await userService.bulkRevokeSessions(selectedSessionIds);
      showToast(res.message || `Revoked ${selectedSessionIds.length} session(s) successfully.`);
      setSelectedSessionIds([]);
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to revoke sessions.');
    } finally {
      setIsBulkRevokingSessions(false);
    }
  };

  // Revoke all other sessions at once
  const handleRevokeAllOtherSessions = async () => {
    const otherSessions = filteredSessions.filter(s => !s.is_current);
    if (otherSessions.length === 0) {
      showToast('No other active sessions to revoke.');
      return;
    }
    if (!window.confirm(`Terminate all ${otherSessions.length} other active device session(s) across the entire platform?`)) {
      return;
    }
    setIsBulkRevokingSessions(true);
    try {
      const ids = otherSessions.map(s => s.session_id);
      const res = await userService.bulkRevokeSessions(ids);
      showToast(res.message || `Revoked all other active sessions.`);
      setSelectedSessionIds([]);
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Failed to revoke sessions.');
    } finally {
      setIsBulkRevokingSessions(false);
    }
  };

  // Filtered Sessions list
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchesSearch = 
        s.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.ip_address?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [sessions, searchQuery]);

  // ==================== UNAUTHENTICATED LOGIN VIEW ====================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-12 relative">
        {/* Floating Toast Notification for Login Errors */}
        {loginError && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-red-50 border-2 border-red-500/30 text-red-900 px-4 py-3 rounded-lg shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-red-100 text-red-600 rounded-full shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-xs uppercase tracking-wider text-red-800">Authentication Error</p>
                  <p className="text-xs text-red-700 font-medium">{loginError}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setLoginError('')}
                className="text-red-400 hover:text-red-700 p-1 rounded-md transition-colors"
                title="Dismiss"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <Card className="w-full max-w-md shadow-sm rounded-lg border-slate-200 overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50/50 pt-8 pb-6 border-b border-slate-100 flex justify-center items-center">
            <div className="text-center p-0 flex flex-col items-center">
              <ClinformatiqLogo sizeClass="h-24" className="mb-2" />
              <h1 className="text-xl font-bold text-slate-800">Users Portal</h1>
              <p className="text-xs text-slate-500 mt-0.5">Sign in to manage user accounts, colleges & batches</p>
            </div>
          </div>
          
          <CardContent className="pt-8 px-8 pb-6">
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter your username"
                  className="rounded-md h-11 border-slate-300 focus:ring-teal-600 focus:border-teal-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="rounded-md h-11 border-slate-300 focus:ring-teal-600 focus:border-teal-600"
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-md h-11 font-bold bg-[#0F766E] hover:bg-[#115E59] text-white shadow-sm transition-all"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? 'Authenticating...' : 'Log In to Users Portal'}
              </Button>
            </form>
          </CardContent>

          <div className="border-t border-slate-100 bg-slate-50/50 py-4 px-6 text-center text-xs text-slate-500 font-medium">
            <p className="text-slate-400 italic">User registration is currently managed by system administrators.</p>
          </div>
        </Card>
      </div>
    );
  }

  // ==================== AUTHENTICATED MANAGEMENT DASHBOARD ====================
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Clinformatiq Signature Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          <ClinformatiqLogo sizeClass="h-9" />
          <span className="text-slate-300 font-light text-xl">|</span>
          <span className="text-slate-800 font-bold text-sm">Academic & User Management</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleOpenProfile}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-teal-900 hover:bg-teal-50/70 border-slate-300 rounded-lg h-9 px-3 transition-colors"
          >
            <div className="h-5 w-5 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-[10px]">
              {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <span>Profile</span>
          </Button>

          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-red-700 hover:bg-red-50 hover:border-red-200 border-slate-300 rounded-lg h-9 px-3 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-5 w-full space-y-5">
        {/* Header Banner - Minimal Single Line */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 bg-teal-50 text-[#0F766E] rounded-lg border border-teal-100 shrink-0">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 leading-tight truncate">Academic & User Administration</h1>
              <p className="text-slate-500 text-xs truncate hidden sm:block">
                Colleges, in-house units, batches, student enrollments, and live sessions.
              </p>
            </div>
          </div>

          {/* Action Toolbar - Strictly Single Line */}
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto shrink-0 whitespace-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={loading || isRefreshing}
              className="flex items-center gap-1.5 rounded-lg border-slate-200 hover:bg-teal-50/50 hover:border-teal-300 text-slate-700 font-semibold text-xs h-8 px-2.5 transition-all shrink-0"
              title="Live AJAX Sync: Data auto-refreshes in the background"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#0F766E] ${loading || isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Live Sync'}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#0F766E] animate-pulse" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setIsBulkModalOpen(true); setBulkFile(null); setBulkParsedRows([]); setBulkSummary(null); }}
              className="flex items-center gap-1.5 border-slate-200 text-slate-700 hover:border-[#0F766E] hover:text-[#0F766E] hover:bg-teal-50/50 font-semibold rounded-lg text-xs h-8 px-2.5 transition-colors shrink-0"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#0F766E]" />
              <span>Bulk Import</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingCollege(null);
                setCollegeForm({ name: '', type: 'COLLEGE', status: 'ACTIVE' });
                setIsCollegeModalOpen(true);
              }}
              className="flex items-center gap-1.5 border-teal-200 text-[#0F766E] hover:bg-teal-50 font-semibold rounded-lg text-xs h-8 px-2.5 transition-colors shrink-0"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>+ College</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingBatch(null);
                setBatchForm({ name: '', org_id: colleges[0]?.org_id ? String(colleges[0].org_id) : '', description: '', status: 'ACTIVE' });
                setIsBatchModalOpen(true);
              }}
              className="flex items-center gap-1.5 border-teal-200 text-[#0F766E] hover:bg-teal-50 font-semibold rounded-lg text-xs h-8 px-2.5 transition-colors shrink-0"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>+ Batch</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setEditingUser(null);
                setUserForm({
                  username: '',
                  password: '',
                  full_name: '',
                  email: '',
                  role: 'STUDENT',
                  org_id: colleges[0]?.org_id ? String(colleges[0].org_id) : '',
                  batch_id: ''
                });
                setIsCreateUserModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold rounded-lg text-xs h-8 px-3 shadow-xs transition-colors shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Add User</span>
            </Button>
          </div>
        </div>

        {/* Global Toast Alerts */}
        {successMsg && (
          <div className="fixed top-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-top-4">
            <div className="p-4 bg-teal-50 border border-teal-300 text-teal-900 rounded-xl shadow-lg flex items-center justify-between gap-3 text-sm font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#0F766E] shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="text-teal-600 hover:text-teal-900">×</button>
            </div>
          </div>
        )}

        {error && (
          <div className="fixed top-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-top-4">
            <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-xl shadow-lg flex items-center justify-between gap-3 text-sm font-medium">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800">×</button>
            </div>
          </div>
        )}

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 rounded-xl border-slate-200 shadow-xs flex items-center gap-4 bg-white">
            <div className="p-3 bg-teal-50 text-[#0F766E] rounded-xl border border-teal-100">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</p>
              <p className="text-2xl font-extrabold text-slate-900">{studentUsers.length}</p>
            </div>
          </Card>

          <Card className="p-4 rounded-xl border-slate-200 shadow-xs flex items-center gap-4 bg-white">
            <div className="p-3 bg-teal-50 text-[#0F766E] rounded-xl border border-teal-100">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Colleges & In-House</p>
              <p className="text-2xl font-extrabold text-slate-900">
                {colleges.length} <span className="text-xs font-normal text-slate-500">({colleges.filter(c => c.type === 'IN_HOUSE').length} In-House)</span>
              </p>
            </div>
          </Card>

          <Card className="p-4 rounded-xl border-slate-200 shadow-xs flex items-center gap-4 bg-white">
            <div className="p-3 bg-teal-50 text-[#0F766E] rounded-xl border border-teal-100">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Batches</p>
              <p className="text-2xl font-extrabold text-slate-900">{batches.length}</p>
            </div>
          </Card>

          <Card className="p-4 rounded-xl border-slate-200 shadow-xs flex items-center gap-4 bg-white">
            <div className="p-3 bg-teal-50 text-[#0F766E] rounded-xl border border-teal-100">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Students</p>
              <p className="text-2xl font-extrabold text-slate-900">
                {users.filter(u => u.role === 'STUDENT' && u.batch_id).length}
                <span className="text-xs font-normal text-slate-400"> / {studentUsers.length}</span>
              </p>
            </div>
          </Card>
        </div>

        {/* Main Tabs Navigation - Strictly Single Line */}
        <div className="border-b border-slate-200 flex items-center justify-between gap-3 pt-1 flex-nowrap">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none shrink min-w-0 flex-nowrap">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-2 font-semibold text-xs rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'users'
                  ? 'border-[#0F766E] text-[#0F766E] bg-white shadow-2xs font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Users Directory ({studentUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('colleges')}
              className={`px-3.5 py-2 font-semibold text-xs rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'colleges'
                  ? 'border-[#0F766E] text-[#0F766E] bg-white shadow-2xs font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Colleges & In-House ({colleges.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('batches')}
              className={`px-3.5 py-2 font-semibold text-xs rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'batches'
                  ? 'border-[#0F766E] text-[#0F766E] bg-white shadow-2xs font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Batches ({batches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3.5 py-2 font-semibold text-xs rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'sessions'
                  ? 'border-[#0F766E] text-[#0F766E] bg-white shadow-2xs font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <Key className="h-4 w-4" />
              <span>Logins & Sessions ({sessions.length})</span>
            </button>
          </div>

          {/* Search Input - Fixed Right Single Line */}
          <div className="relative w-64 max-w-xs shrink-0 mb-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users, colleges, batches..."
              className="pl-8 h-8 text-xs rounded-lg border-slate-300 focus:ring-teal-600 focus:border-teal-600 bg-white"
            />
          </div>
        </div>

        {/* ==================== TAB 1: USERS DIRECTORY ==================== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Multi-Select Floating Bulk Action Bar */}
            {selectedUserIds.length > 0 && (
              <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#0F766E] text-white font-bold px-2.5 py-1">
                    {selectedUserIds.length} Selected
                  </Badge>
                  <span className="text-xs text-slate-300">Apply actions to selected users simultaneously</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setBulkAssignTarget({ org_id: colleges[0]?.org_id ? String(colleges[0].org_id) : '', batch_id: '' });
                      setIsBulkAssignModalOpen(true);
                    }}
                    className="bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Assign to Batch
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkRevokeBatch}
                    className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5"
                  >
                    <UserX className="h-3.5 w-3.5 text-teal-400" />
                    Revoke Batch
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="border-red-800 bg-red-950/80 hover:bg-red-900 text-red-200 hover:text-white font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    Remove Users ({selectedUserIds.length})
                  </Button>

                  <button
                    onClick={() => setSelectedUserIds([])}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <Card className="rounded-xl border-slate-200 shadow-2xs bg-white overflow-hidden">
              {/* Table Filters Header - Well Spaced Toolbar */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleSelectAll}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#0F766E] bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors"
                  >
                    {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-[#0F766E]" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400" />
                    )}
                    <span>{selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? 'Deselect All' : 'Select All Filtered'}</span>
                  </button>
                  <span className="text-xs font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                    {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} shown
                  </span>

                  {(collegeFilter !== 'ALL' || batchFilter !== 'ALL' || roleFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
                    <button
                      onClick={() => {
                        setCollegeFilter('ALL');
                        setBatchFilter('ALL');
                        setRoleFilter('ALL');
                        setStatusFilter('ALL');
                        setSearchQuery('');
                      }}
                      className="text-xs text-teal-800 hover:text-teal-950 underline font-semibold ml-1"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Filter Controls with Clean Spacing */}
                <div className="flex items-center gap-2.5 text-xs flex-wrap">
                  {/* College Filter */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 font-medium">College:</span>
                    <select
                      value={collegeFilter}
                      onChange={(e) => { setCollegeFilter(e.target.value); setBatchFilter('ALL'); }}
                      className="border-none bg-transparent text-xs text-slate-800 font-semibold focus:ring-0 focus:outline-hidden pr-2 cursor-pointer max-w-[150px] truncate"
                    >
                      <option value="ALL">All Colleges</option>
                      {colleges.map(c => (
                        <option key={c.org_id} value={c.org_id}>
                          {c.type === 'IN_HOUSE' ? '[In-House] ' : ''}{c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Filter */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 font-medium">Batch:</span>
                    <select
                      value={batchFilter}
                      onChange={(e) => setBatchFilter(e.target.value)}
                      className="border-none bg-transparent text-xs text-slate-800 font-semibold focus:ring-0 focus:outline-hidden pr-2 cursor-pointer max-w-[140px] truncate"
                    >
                      <option value="ALL">All Batches</option>
                      <option value="UNASSIGNED">Unassigned</option>
                      {batches
                        .filter(b => collegeFilter === 'ALL' || String(b.org_id) === String(collegeFilter))
                        .map(b => (
                          <option key={b.batch_id} value={b.batch_id}>{b.name}</option>
                        ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 font-medium">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border-none bg-transparent text-xs text-slate-800 font-semibold focus:ring-0 focus:outline-hidden pr-2 cursor-pointer"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse table-auto">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 w-[32%]">User Details</th>
                      <th className="py-3 px-4 w-[24%]">College / Organisation</th>
                      <th className="py-3 px-4 w-[18%]">Batch</th>
                      <th className="py-3 px-4 w-[10%]">Role</th>
                      <th className="py-3 px-4 w-[10%]">Status</th>
                      <th className="py-3 px-4 text-right w-[6%] min-w-[90px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            <div className="p-3 bg-teal-50 text-[#0F766E] rounded-full border border-teal-100 mb-2">
                              <Users className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">No Users Found</p>
                            <p className="text-xs text-slate-400 mt-1 mb-4">
                              {searchQuery || collegeFilter !== 'ALL' || batchFilter !== 'ALL' || statusFilter !== 'ALL'
                                ? 'Try adjusting your search query or clearing active filters.'
                                : 'No students or users enrolled yet. Add users individually or import from Excel.'}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => {
                                  setEditingUser(null);
                                  setUserForm({
                                    username: '',
                                    password: '',
                                    full_name: '',
                                    email: '',
                                    role: 'STUDENT',
                                    org_id: colleges[0]?.org_id ? String(colleges[0].org_id) : '',
                                    batch_id: ''
                                  });
                                  setIsCreateUserModalOpen(true);
                                }}
                                size="sm"
                                className="bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-xs h-8 px-3 rounded-lg shadow-xs"
                              >
                                <UserPlus className="h-3.5 w-3.5 mr-1" />
                                Add User
                              </Button>
                              <Button
                                onClick={() => { setIsBulkModalOpen(true); setBulkFile(null); setBulkParsedRows([]); setBulkSummary(null); }}
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-[#0F766E]" />
                                Bulk Import
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSelected = selectedUserIds.includes(u.user_id);
                        return (
                          <tr key={u.user_id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-teal-50/40' : ''}`}>
                            <td className="py-3 px-3 text-center">
                              {u.role === 'ADMIN' ? (
                                <span className="inline-flex justify-center items-center cursor-not-allowed opacity-40" title="Administrator account is protected and cannot be deleted">
                                  <Square className="h-4 w-4 text-slate-400" />
                                </span>
                              ) : (
                                <button
                                  onClick={() => toggleUserSelection(u.user_id)}
                                  className="text-slate-400 hover:text-[#0F766E] focus:outline-hidden"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-[#0F766E]" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200">
                                  {u.full_name ? u.full_name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-sm leading-tight">{u.full_name}</p>
                                  <p className="text-xs text-slate-500 font-mono">@{u.username} • {u.email}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {u.role === 'ADMIN' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                  Global Admin
                                </span>
                              ) : u.organisation ? (
                                <div className="flex items-center gap-1.5">
                                  {u.organisation.type === 'IN_HOUSE' ? (
                                    <Badge className="bg-slate-900 text-white border-slate-800 text-[10px] font-bold">
                                      In-House
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-semibold">
                                      College
                                    </Badge>
                                  )}
                                  <span className="text-xs font-semibold text-slate-800">{u.organisation.name}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No College</span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {u.role === 'ADMIN' ? (
                                <span className="text-xs text-slate-400 font-mono">—</span>
                              ) : u.batch ? (
                                <Badge className="bg-teal-50/90 text-teal-800 border-teal-200 text-xs font-semibold">
                                  {u.batch.name}
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  Unassigned
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <Badge className={`text-xs font-bold ${
                                u.role === 'ADMIN' 
                                  ? 'bg-teal-900 text-white border-teal-800' 
                                  : u.role === 'INSTRUCTOR'
                                  ? 'bg-teal-100 text-teal-900 border-teal-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {u.role}
                              </Badge>
                            </td>

                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                u.status === 'ACTIVE' 
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200' 
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-[#0F766E]' : 'bg-slate-400'}`} />
                                {u.status}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(u);
                                    setUserForm({
                                      username: u.username,
                                      password: '',
                                      full_name: u.full_name,
                                      email: u.email,
                                      role: u.role,
                                      org_id: u.org_id ? String(u.org_id) : '',
                                      batch_id: u.batch_id ? String(u.batch_id) : ''
                                    });
                                    setIsCreateUserModalOpen(true);
                                  }}
                                  className="text-xs text-slate-700 hover:bg-slate-100 h-8 px-2"
                                  title="Edit User & Credentials"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>

                                {u.role === 'ADMIN' ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200" title="Protected System Administrator">
                                    Protected
                                  </span>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setUserToDelete(u)}
                                    className="text-xs text-red-600 hover:bg-red-50 h-8 px-2"
                                    title="Remove User"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ==================== TAB 2: COLLEGES & IN-HOUSE UNITS ==================== */}
        {activeTab === 'colleges' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Colleges & In-House Organisations</h2>
                <p className="text-xs text-slate-500">
                  Configure partner colleges and internal in-house training teams.
                </p>
              </div>

              <Button
                onClick={() => {
                  setEditingCollege(null);
                  setCollegeForm({ name: '', type: 'COLLEGE' });
                  setIsCollegeModalOpen(true);
                }}
                className="bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold h-9 rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Add College / In-House
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {colleges.map((col) => {
                const isInHouse = col.type === 'IN_HOUSE';
                const collegeBatches = batches.filter(b => b.org_id === col.org_id);
                const studentCount = users.filter(u => u.org_id === col.org_id && u.role === 'STUDENT').length;

                return (
                  <Card key={col.org_id} className="rounded-xl border-slate-200 shadow-xs bg-white overflow-hidden flex flex-col justify-between hover:border-teal-400 transition-all">
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2.5 rounded-xl border ${isInHouse ? 'bg-slate-900 text-teal-400 border-slate-800' : 'bg-teal-50 text-[#0F766E] border-teal-100'}`}>
                            {isInHouse ? <Building2 className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-base leading-tight">{col.name}</h3>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge className={`text-[10px] font-bold ${isInHouse ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-teal-50 text-teal-800 border-teal-200'}`}>
                                {isInHouse ? 'In-House Department' : 'Partner College'}
                              </Badge>
                              <Badge className={`text-[10px] font-bold ${col.status === 'INACTIVE' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-teal-50 text-teal-800 border-teal-200'}`}>
                                {col.status || 'ACTIVE'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">Active Batches</span>
                          <span className="font-bold text-slate-800 text-sm">{collegeBatches.length}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">Enrolled Students</span>
                          <span className="font-bold text-[#0F766E] text-sm">{studentCount}</span>
                        </div>
                      </div>

                      {/* Batches Preview */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Batches:</span>
                        <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                          {collegeBatches.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No batches created yet</span>
                          ) : (
                            collegeBatches.map(b => (
                              <Badge key={b.batch_id} className="text-[11px] bg-teal-50 text-teal-800 border-teal-200">
                                {b.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingBatch(null);
                          setBatchForm({ name: '', org_id: String(col.org_id), description: '', status: 'ACTIVE' });
                          setIsBatchModalOpen(true);
                        }}
                        className="text-xs text-[#0F766E] hover:bg-teal-50 font-bold h-8 px-2.5"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Batch
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCollege(col);
                            setCollegeForm({ name: col.name, type: col.type || 'COLLEGE', status: col.status || 'ACTIVE' });
                            setIsCollegeModalOpen(true);
                          }}
                          className="text-xs text-slate-600 hover:bg-slate-200 h-8 px-2"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCollegeToDelete(col)}
                          className="text-xs text-red-600 hover:bg-red-50 h-8 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: BATCH MANAGEMENT ==================== */}
        {activeTab === 'batches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Batches Management</h2>
                <p className="text-xs text-slate-500">
                  Organize student classes and manage batch rosters.
                </p>
              </div>

              <Button
                onClick={() => {
                  setEditingBatch(null);
                  setBatchForm({ name: '', org_id: colleges[0]?.org_id ? String(colleges[0].org_id) : '', description: '', status: 'ACTIVE' });
                  setIsBatchModalOpen(true);
                }}
                className="bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold h-9 rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Create New Batch
              </Button>
            </div>

            <Card className="rounded-xl border-slate-200 shadow-2xs bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse table-auto">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                      <th className="py-3 px-4 w-[28%]">Batch Name</th>
                      <th className="py-3 px-4 w-[26%]">College / Organisation</th>
                      <th className="py-3 px-4 w-[16%]">Enrolled Students</th>
                      <th className="py-3 px-4 w-[18%]">Description</th>
                      <th className="py-3 px-4 w-[12%]">Status</th>
                      <th className="py-3 px-4 text-right w-[10%] min-w-[130px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            <div className="p-3 bg-teal-50 text-[#0F766E] rounded-full border border-teal-100 mb-2">
                              <Layers className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">No Batches Created Yet</p>
                            <p className="text-xs text-slate-400 mt-1 mb-4">
                              Create batches to group students for structured case assignments and curriculum access.
                            </p>
                            <Button
                              onClick={() => {
                                setEditingBatch(null);
                                setBatchForm({ name: '', org_id: colleges[0]?.org_id ? String(colleges[0].org_id) : '', description: '', status: 'ACTIVE' });
                                setIsBatchModalOpen(true);
                              }}
                              size="sm"
                              className="bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-xs h-8 px-3 rounded-lg shadow-xs"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Create New Batch
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      batches.map((b) => {
                        const enrolledCount = users.filter(u => u.batch_id === b.batch_id).length;
                        return (
                          <tr key={b.batch_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-teal-50 text-[#0F766E] rounded-lg shrink-0 border border-teal-100">
                                  <Layers className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                                  <p className="text-[11px] text-slate-400">ID #{b.batch_id} • Created {new Date(b.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                {b.organisation?.type === 'IN_HOUSE' ? (
                                  <Badge className="bg-slate-900 text-white border-slate-800 text-[10px] font-bold">
                                    In-House
                                  </Badge>
                                ) : (
                                  <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-[10px]">
                                    College
                                  </Badge>
                                )}
                                <span className="text-xs font-semibold text-slate-800">{b.organisation?.name || 'Default'}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <Badge className="bg-teal-50 text-teal-900 border-teal-200 font-bold text-xs">
                                {enrolledCount} Students
                              </Badge>
                            </td>

                            <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                              {b.description || '—'}
                            </td>

                            <td className="py-3.5 px-4">
                              <Badge className={`text-xs font-bold ${b.status === 'ACTIVE' ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-slate-100 text-slate-600'}`}>
                                {b.status}
                              </Badge>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setInspectingBatch(b)}
                                  className="text-xs text-[#0F766E] border-teal-200 hover:bg-teal-50 font-bold h-8 px-2.5 rounded-lg"
                                >
                                  <Users className="h-3.5 w-3.5 mr-1" />
                                  Manage Roster ({enrolledCount})
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingBatch(b);
                                    setBatchForm({
                                      name: b.name,
                                      org_id: String(b.org_id),
                                      description: b.description || '',
                                      status: b.status || 'ACTIVE'
                                    });
                                    setIsBatchModalOpen(true);
                                  }}
                                  className="text-xs text-slate-700 hover:bg-slate-100 h-8 px-2"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setBatchToDelete(b)}
                                  className="text-xs text-red-600 hover:bg-red-50 h-8 px-2"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ==================== TAB 4: ACTIVE LOGINS / SESSIONS ==================== */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            {/* Floating Bulk Action Bar for Sessions */}
            {selectedSessionIds.length > 0 && (
              <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#0F766E] text-white font-bold px-2.5 py-1">
                    {selectedSessionIds.length} Sessions Selected
                  </Badge>
                  <span className="text-xs text-slate-300">
                    Terminate selected device connections simultaneously without affecting your current device.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleBulkRevokeSessions}
                    disabled={isBulkRevokingSessions}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {isBulkRevokingSessions ? 'Revoking...' : `Revoke Selected (${selectedSessionIds.length})`}
                  </Button>

                  <button
                    onClick={() => setSelectedSessionIds([])}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 underline"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            <Card className="rounded-xl border-slate-200 shadow-2xs bg-white overflow-hidden">
              {/* Sessions Table Header Toolbar */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const selectable = filteredSessions.filter(s => !s.is_current);
                    const isAllSelected = selectable.length > 0 && selectedSessionIds.length === selectable.length;
                    return (
                      <button
                        onClick={handleToggleSelectAllSessions}
                        disabled={selectable.length === 0}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#0F766E] bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAllSelected ? (
                          <CheckSquare className="h-4 w-4 text-[#0F766E]" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                        <span>{isAllSelected ? 'Deselect All' : 'Select All Other Sessions'}</span>
                      </button>
                    );
                  })()}

                  <span className="text-xs font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                    {filteredSessions.length} active {filteredSessions.length === 1 ? 'connection' : 'connections'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {filteredSessions.filter(s => !s.is_current).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRevokeAllOtherSessions}
                      disabled={isBulkRevokingSessions}
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-bold h-8 px-3 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5 text-red-500" />
                      <span>Revoke All Other Sessions ({filteredSessions.filter(s => !s.is_current).length})</span>
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse table-auto">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 w-[24%]">User Details</th>
                      <th className="py-3 px-4 w-[10%]">Role</th>
                      <th className="py-3 px-4 w-[16%]">IP Address</th>
                      <th className="py-3 px-4 w-[20%]">Browser & Device</th>
                      <th className="py-3 px-4 w-[12%]">Activity Status</th>
                      <th className="py-3 px-4 w-[12%]">Login Time</th>
                      <th className="py-3 px-4 text-right w-[6%] min-w-[160px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredSessions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-slate-400 font-medium">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            <div className="p-3 bg-teal-50 text-[#0F766E] rounded-full border border-teal-100 mb-2">
                              <Key className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">No Active Sessions</p>
                            <p className="text-xs text-slate-400 mt-1">No active login sessions match your search query.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSessions.map((s) => {
                        const parsed = parseUserAgent(s.user_agent);
                        const ipFormatted = formatIP(s.ip_address);
                        const activityStr = getTimeAgo(s.last_active || s.created_at);
                        const isSelected = selectedSessionIds.includes(s.session_id);

                        return (
                          <tr key={s.session_id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-teal-50/50' : s.is_current ? 'bg-teal-50/20' : ''}`}>
                            <td className="py-3 px-4 text-center">
                              {s.is_current ? (
                                <span className="inline-flex justify-center items-center opacity-40 cursor-not-allowed" title="Current session is active on this device">
                                  <Square className="h-4 w-4 text-slate-400" />
                                </span>
                              ) : (
                                <button
                                  onClick={() => toggleSessionSelection(s.session_id)}
                                  className="text-slate-400 hover:text-[#0F766E] focus:outline-hidden"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-[#0F766E]" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center font-bold text-xs border border-teal-200 shrink-0">
                                  {s.user?.full_name ? s.user.full_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-slate-900 text-xs whitespace-nowrap">{s.user?.full_name || 'Unknown User'}</p>
                                    {s.is_current && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0F766E] text-white whitespace-nowrap shadow-2xs">
                                        Current Session
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-mono">@{s.user?.username}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <Badge className="text-[10px] font-bold bg-slate-100 text-slate-700 border-slate-200">
                                {s.user?.role || 'STUDENT'}
                              </Badge>
                            </td>

                            <td className="py-3 px-4 text-xs font-mono text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-slate-400" />
                                <span>{ipFormatted}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-xs text-slate-700">
                              <div className="flex items-center gap-1.5">
                                {parsed.isMobile ? (
                                  <Smartphone className="h-4 w-4 text-[#0F766E] shrink-0" />
                                ) : (
                                  <Laptop className="h-4 w-4 text-[#0F766E] shrink-0" />
                                )}
                                <div>
                                  <p className="font-semibold text-slate-900 text-xs">{parsed.browser}</p>
                                  <p className="text-[11px] text-slate-500">{parsed.os}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-xs">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#0F766E] animate-pulse" />
                                {activityStr}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-xs text-slate-500">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>{new Date(s.created_at).toLocaleString()}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedSessionForDetails(s)}
                                  className="text-xs text-[#0F766E] hover:bg-teal-50 font-semibold h-8 px-3 rounded-lg border border-teal-200"
                                >
                                  <Info className="h-3.5 w-3.5 mr-1" />
                                  Details
                                </Button>

                                {s.is_current ? (
                                  <span className="inline-flex items-center justify-center text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 h-8 px-3 rounded-lg">
                                    Active (This Device)
                                  </span>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevokeSession(s.session_id)}
                                    className="text-xs text-red-600 hover:bg-red-50 hover:border-red-200 font-semibold h-8 px-3 rounded-lg border border-transparent transition-colors"
                                  >
                                    <LogOut className="h-3.5 w-3.5 mr-1" />
                                    Revoke
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ==================== CREATE / EDIT USER MODAL ==================== */}
        <Modal open={isCreateUserModalOpen} onOpenChange={setIsCreateUserModalOpen}>
          <ModalContent className="sm:max-w-lg rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#0F766E]" />
                {editingUser ? `Edit User: ${editingUser.full_name}` : 'Create New User Account'}
              </ModalTitle>
              <ModalDescription className="text-xs text-slate-500">
                Assign student to a College or In-House unit and Batch for curriculum access.
              </ModalDescription>
            </ModalHeader>

            <form onSubmit={handleSaveUser} className="space-y-4 my-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <Input
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    required
                    placeholder="Jane Doe"
                    className="h-10 text-sm rounded-lg focus:ring-teal-600 focus:border-teal-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <Input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                    placeholder="jane@institution.edu"
                    className="h-10 text-sm rounded-lg focus:ring-teal-600 focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Username</label>
                  <Input
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    required
                    disabled={!!editingUser}
                    placeholder="janedoe"
                    className={`h-10 text-sm rounded-lg ${
                      isUsernameTaken 
                        ? 'border-red-500 text-red-900 focus:ring-red-500 focus:border-red-500 bg-red-50/30' 
                        : 'focus:ring-teal-600 focus:border-teal-600'
                    }`}
                  />
                  {isUsernameTaken && (
                    <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Username "@{userForm.username.trim()}" is already taken.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {editingUser ? 'New Password (Optional)' : 'Password'}
                  </label>
                  <Input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to keep' : '••••••••'}
                    className="h-10 text-sm rounded-lg focus:ring-teal-600 focus:border-teal-600"
                  />
                </div>
              </div>

              {/* College & Batch Selectors (Only for non-admin users) */}
              {editingUser?.role === 'ADMIN' ? (
                <div className="p-3.5 rounded-lg bg-teal-50/60 border border-teal-200 text-xs text-teal-900 flex items-center gap-2.5">
                  <Shield className="h-5 w-5 text-[#0F766E] shrink-0" />
                  <div>
                    <p className="font-bold">Global System Administrator</p>
                    <p className="text-[11px] text-teal-700">Administrators operate across all colleges and batches with full system privileges.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* College Selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Assigned College / Institution</label>
                    <select
                      value={userForm.org_id}
                      onChange={(e) => setUserForm({ ...userForm, org_id: e.target.value, batch_id: '' })}
                      required={editingUser?.role !== 'ADMIN'}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:ring-teal-600"
                    >
                      <option value="">Select College / In-House Unit...</option>
                      {colleges.map(c => (
                        <option key={c.org_id} value={c.org_id}>
                          {c.type === 'IN_HOUSE' ? '[In-House Unit] ' : ''}{c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Batch Selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Assigned Batch</label>
                    <select
                      value={userForm.batch_id}
                      onChange={(e) => setUserForm({ ...userForm, batch_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:ring-teal-600"
                    >
                      <option value="">No Batch Assigned (Unassigned)</option>
                      {formBatches.map(b => (
                        <option key={b.batch_id} value={b.batch_id}>
                          {b.name} ({b.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <ModalFooter className="pt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="rounded-lg h-10 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingUser || (!editingUser && isUsernameTaken)}
                  className="rounded-lg h-10 font-bold bg-[#0F766E] hover:bg-[#115E59] text-white disabled:opacity-50"
                >
                  {isSavingUser ? 'Saving...' : editingUser ? 'Update User' : 'Create Account'}
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>

        {/* ==================== CREATE / EDIT COLLEGE MODAL ==================== */}
        <Modal open={isCollegeModalOpen} onOpenChange={setIsCollegeModalOpen}>
          <ModalContent className="sm:max-w-md rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#0F766E]" />
                {editingCollege ? 'Edit College / Organisation' : 'Add College or In-House Unit'}
              </ModalTitle>
              <ModalDescription className="text-xs text-slate-500">
                Create a partner college or configure an internal In-House department.
              </ModalDescription>
            </ModalHeader>

            <form onSubmit={handleSaveCollege} className="space-y-4 my-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">College / Organisation Name</label>
                <Input
                  value={collegeForm.name}
                  onChange={(e) => setCollegeForm({ ...collegeForm, name: e.target.value })}
                  required
                  placeholder="e.g. Oxford College of Pharmacy or Clinformatiq In-House Lab"
                  className="h-10 text-sm rounded-lg focus:ring-teal-600 focus:border-teal-600"
                />
              </div>

              {/* Type Selection: College vs In-House */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Organisation Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCollegeForm({ ...collegeForm, type: 'COLLEGE' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      collegeForm.type === 'COLLEGE'
                        ? 'border-[#0F766E] bg-teal-50/70 ring-2 ring-teal-600/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className={`h-5 w-5 mt-0.5 ${collegeForm.type === 'COLLEGE' ? 'text-[#0F766E]' : 'text-slate-400'}`} />
                    <div>
                      <p className="font-bold text-xs text-slate-900">Partner College</p>
                      <p className="text-[10px] text-slate-500">External educational college</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCollegeForm({ ...collegeForm, type: 'IN_HOUSE' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      collegeForm.type === 'IN_HOUSE'
                        ? 'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-800/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className={`h-5 w-5 mt-0.5 ${collegeForm.type === 'IN_HOUSE' ? 'text-teal-400' : 'text-slate-400'}`} />
                    <div>
                      <p className={`font-bold text-xs ${collegeForm.type === 'IN_HOUSE' ? 'text-white' : 'text-slate-900'}`}>In-House Unit</p>
                      <p className={`text-[10px] ${collegeForm.type === 'IN_HOUSE' ? 'text-slate-300' : 'text-slate-500'}`}>Internal clinical training team</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Status Selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={collegeForm.status}
                  onChange={(e) => setCollegeForm({ ...collegeForm, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:ring-teal-600"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Setting to INACTIVE will automatically deactivate all its batches, students, and revoke their active login sessions.
                </p>
              </div>

              <ModalFooter className="pt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCollegeModalOpen(false)}
                  className="rounded-lg h-10 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingCollege}
                  className="rounded-lg h-10 font-bold bg-[#0F766E] hover:bg-[#115E59] text-white"
                >
                  {isSavingCollege ? 'Saving...' : editingCollege ? 'Update College' : 'Create College'}
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>

        {/* ==================== CREATE / EDIT BATCH MODAL ==================== */}
        <Modal open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
          <ModalContent className="sm:max-w-md rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#0F766E]" />
                {editingBatch ? `Edit Batch: ${editingBatch.name}` : 'Create New Student Batch'}
              </ModalTitle>
              <ModalDescription className="text-xs text-slate-500">
                Batches group students into cohorts under their respective college or in-house unit.
              </ModalDescription>
            </ModalHeader>

            <form onSubmit={handleSaveBatch} className="space-y-4 my-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Batch Name</label>
                <Input
                  value={batchForm.name}
                  onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  required
                  placeholder="e.g. Batch 2026-A or PharmD Fall 2025"
                  className="h-10 text-sm rounded-lg focus:ring-teal-600 focus:border-teal-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Parent College / In-House Unit</label>
                <select
                  value={batchForm.org_id}
                  onChange={(e) => setBatchForm({ ...batchForm, org_id: e.target.value })}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:ring-teal-600"
                >
                  <option value="">Select College / In-House Unit...</option>
                  {colleges.map(c => (
                    <option key={c.org_id} value={c.org_id}>
                      {c.type === 'IN_HOUSE' ? '[In-House] ' : ''}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description (Optional)</label>
                <Input
                  value={batchForm.description}
                  onChange={(e) => setBatchForm({ ...batchForm, description: e.target.value })}
                  placeholder="Semester, specialisation, or cohort notes"
                  className="h-10 text-sm rounded-lg focus:ring-teal-600 focus:border-teal-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={batchForm.status}
                  onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:ring-teal-600"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <ModalFooter className="pt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="rounded-lg h-10 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingBatch}
                  className="rounded-lg h-10 font-bold bg-[#0F766E] hover:bg-[#115E59] text-white"
                >
                  {isSavingBatch ? 'Saving...' : editingBatch ? 'Update Batch' : 'Create Batch'}
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>

        {/* ==================== BULK ASSIGN TO BATCH MODAL ==================== */}
        <Modal open={isBulkAssignModalOpen} onOpenChange={setIsBulkAssignModalOpen}>
          <ModalContent className="sm:max-w-md rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#0F766E]" />
                Assign {selectedUserIds.length} Students to Batch
              </ModalTitle>
              <ModalDescription className="text-xs text-slate-500">
                Assign all selected students to a specific College and Batch at once.
              </ModalDescription>
            </ModalHeader>

            <form onSubmit={handleBulkAssignBatchSubmit} className="space-y-4 my-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Target College / In-House Unit</label>
                <select
                  value={bulkAssignTarget.org_id}
                  onChange={(e) => setBulkAssignTarget({ ...bulkAssignTarget, org_id: e.target.value, batch_id: '' })}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:ring-teal-600"
                >
                  <option value="">Select Target College...</option>
                  {colleges.map(c => (
                    <option key={c.org_id} value={c.org_id}>
                      {c.type === 'IN_HOUSE' ? '[In-House] ' : ''}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Target Batch</label>
                <select
                  value={bulkAssignTarget.batch_id}
                  onChange={(e) => setBulkAssignTarget({ ...bulkAssignTarget, batch_id: e.target.value })}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:ring-teal-600"
                >
                  <option value="">Select Target Batch...</option>
                  {bulkAssignFormBatches.map(b => (
                    <option key={b.batch_id} value={b.batch_id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <ModalFooter className="pt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkAssignModalOpen(false)}
                  className="rounded-lg h-10 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isBulkAssigning || !bulkAssignTarget.batch_id}
                  className="rounded-lg h-10 font-bold bg-[#0F766E] hover:bg-[#115E59] text-white"
                >
                  {isBulkAssigning ? 'Assigning...' : `Assign ${selectedUserIds.length} Students Now`}
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>

        {/* ==================== BULK DELETE USERS CONFIRMATION MODAL ==================== */}
        <Modal open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
          <ModalContent className="sm:max-w-md rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Remove Selected Users ({selectedUserIds.length})
              </ModalTitle>
              <ModalDescription className="text-sm text-slate-600 mt-2">
                Are you sure you want to permanently remove or deactivate the <strong>{selectedUserIds.length}</strong> selected user accounts? Their active sessions will also be terminated immediately.
              </ModalDescription>
            </ModalHeader>

            <ModalFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="rounded-lg h-10 text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBulkDeleteUsers}
                disabled={isBulkDeleting}
                className="rounded-lg h-10 font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                {isBulkDeleting ? 'Removing...' : `Yes, Remove ${selectedUserIds.length} Users`}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* ==================== BATCH ROSTER INSPECTOR MODAL ==================== */}
        <Modal open={!!inspectingBatch} onOpenChange={() => setInspectingBatch(null)}>
          <ModalContent className="sm:max-w-2xl rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#0F766E]" />
                Batch Roster: {inspectingBatch?.name}
              </ModalTitle>
              <ModalDescription className="text-xs text-slate-500">
                View students assigned to this cohort, remove members, or add new students.
              </ModalDescription>
            </ModalHeader>

            {inspectingBatch && (() => {
              const enrolledStudents = users.filter(u => u.batch_id === inspectingBatch.batch_id);
              const unassignedStudents = users.filter(u => !u.batch_id && u.role === 'STUDENT');

              return (
                <div className="space-y-4 my-2">
                  <div className="p-3 bg-teal-50 rounded-lg border border-teal-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-teal-950 font-bold">{inspectingBatch.name}</span>
                      <span className="text-teal-700 block text-[11px]">{inspectingBatch.organisation?.name}</span>
                    </div>
                    <Badge className="bg-teal-100 text-teal-900 font-bold border-teal-300">
                      {enrolledStudents.length} Students
                    </Badge>
                  </div>

                  {/* Enrolled Students Table */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Currently Enrolled Students ({enrolledStudents.length}):</span>
                      {enrolledStudents.length > 0 && (
                        <button
                          onClick={async () => {
                            try {
                              await collegeBatchService.revokeStudentsFromBatch(inspectingBatch.batch_id);
                              showToast(`Revoked all students from '${inspectingBatch.name}'.`);
                              fetchData();
                            } catch (err) {
                              showErrorToast('Failed to revoke students.');
                            }
                          }}
                          className="text-red-600 hover:underline text-[11px]"
                        >
                          Revoke All from Batch
                        </button>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="py-2 px-3">Student Name</th>
                            <th className="py-2 px-3">Username / Email</th>
                            <th className="py-2 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {enrolledStudents.length === 0 ? (
                            <tr>
                              <td colSpan="3" className="py-4 text-center text-slate-400">
                                No students currently in this batch.
                              </td>
                            </tr>
                          ) : (
                            enrolledStudents.map(st => (
                              <tr key={st.user_id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-semibold text-slate-900">{st.full_name}</td>
                                <td className="py-2 px-3 text-slate-500 font-mono">@{st.username}</td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await collegeBatchService.revokeStudentsFromBatch(inspectingBatch.batch_id, [st.user_id]);
                                        showToast(`Removed ${st.full_name} from batch.`);
                                        fetchData();
                                      } catch (err) {
                                        showErrorToast('Failed to remove student.');
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800 text-[11px] font-semibold"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add Unassigned Students section */}
                  {unassignedStudents.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-700">Quick Add Unassigned Students:</span>
                      <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50/50">
                        {unassignedStudents.map(un => (
                          <div key={un.user_id} className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100 text-xs">
                            <div>
                              <span className="font-semibold text-slate-800">{un.full_name}</span>
                              <span className="text-slate-400 font-mono text-[10px] ml-1.5">@{un.username}</span>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await collegeBatchService.assignStudentsToBatch(inspectingBatch.batch_id, [un.user_id]);
                                  showToast(`Added ${un.full_name} to batch '${inspectingBatch.name}'.`);
                                  fetchData();
                                } catch (err) {
                                  showErrorToast('Failed to assign student.');
                                }
                              }}
                              className="text-[#0F766E] hover:text-[#115E59] font-bold text-xs bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                            >
                              + Add to Batch
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <ModalFooter className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setInspectingBatch(null)}
                      className="rounded-lg h-9 text-xs text-slate-600"
                    >
                      Close Roster
                    </Button>
                  </ModalFooter>
                </div>
              );
            })()}
          </ModalContent>
        </Modal>

        {/* ==================== DELETE SINGLE USER CONFIRMATION MODAL ==================== */}
        <Modal open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <ModalContent className="sm:max-w-md rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Remove User Account
              </ModalTitle>
              <ModalDescription className="text-sm text-slate-600 mt-2">
                Are you sure you want to remove user <strong>{userToDelete?.full_name}</strong> (@{userToDelete?.username})?
              </ModalDescription>
            </ModalHeader>

            <ModalFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserToDelete(null)}
                className="rounded-lg h-10 text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteUserConfirm}
                disabled={isDeletingUser}
                className="rounded-lg h-10 font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeletingUser ? 'Removing...' : 'Confirm Remove'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* ==================== DELETE COLLEGE CONFIRMATION MODAL ==================== */}
        <Modal open={!!collegeToDelete} onOpenChange={(open) => !open && setCollegeToDelete(null)}>
          <ModalContent className="sm:max-w-md rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Delete College / Organisation
              </ModalTitle>
              <ModalDescription className="text-sm text-slate-600 mt-2">
                Are you sure you want to delete <strong>{collegeToDelete?.name}</strong>?
                This action cannot be undone. Make sure no users are assigned before deleting.
              </ModalDescription>
            </ModalHeader>

            <ModalFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCollegeToDelete(null)}
                className="rounded-lg h-10 text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteCollegeConfirm}
                className="rounded-lg h-10 font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                Delete College
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* ==================== DELETE BATCH CONFIRMATION MODAL ==================== */}
        <Modal open={!!batchToDelete} onOpenChange={(open) => !open && setBatchToDelete(null)}>
          <ModalContent className="sm:max-w-md rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Delete Batch
              </ModalTitle>
              <ModalDescription className="text-sm text-slate-600 mt-2">
                Are you sure you want to delete batch <strong>{batchToDelete?.name}</strong>?
                Any enrolled students will be unassigned from this batch.
              </ModalDescription>
            </ModalHeader>

            <ModalFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBatchToDelete(null)}
                className="rounded-lg h-10 text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteBatchConfirm}
                className="rounded-lg h-10 font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Batch
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* ==================== RESET PASSWORD MODAL ==================== */}
        <Modal open={!!userToResetPassword} onOpenChange={(open) => !open && setUserToResetPassword(null)}>
          <ModalContent className="sm:max-w-md rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Key className="h-5 w-5 text-[#0F766E]" />
                Reset User Password
              </ModalTitle>
              <ModalDescription className="text-sm text-slate-600 mt-1">
                Enter a new password for account <strong>{userToResetPassword?.full_name}</strong> (@{userToResetPassword?.username}).
              </ModalDescription>
            </ModalHeader>

            <form onSubmit={handleResetPasswordConfirm} className="space-y-4 my-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">New Password</label>
                <Input
                  type="password"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  required
                  placeholder="Enter new password"
                  className="h-10 text-sm rounded-lg focus:ring-teal-600 focus:border-teal-600"
                />
              </div>

              <ModalFooter className="pt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUserToResetPassword(null)}
                  className="rounded-lg h-10 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isResettingPassword}
                  className="rounded-lg h-10 font-bold bg-[#0F766E] hover:bg-[#115E59] text-white"
                >
                  {isResettingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>

        {/* ==================== BULK EXCEL UPLOAD MODAL ==================== */}
        <Modal open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
          <ModalContent className="sm:max-w-2xl rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-[#0F766E]" />
                Bulk User, College & Batch Import (Excel / CSV)
              </ModalTitle>
              <ModalDescription className="text-xs text-slate-500">
                Upload a spreadsheet to create users and automatically assign them to Colleges and Batches.
              </ModalDescription>
            </ModalHeader>

            <div className="space-y-4 my-3">
              {/* Download Template Banner */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Download className="h-4 w-4 text-[#0F766E] shrink-0" />
                  <span>Download template with columns: <strong>Username, Password, Full Name, Email, Role, College, Batch</strong></span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="h-8 text-xs font-semibold border-slate-300 hover:bg-teal-50 hover:text-[#0F766E] hover:border-teal-300 whitespace-nowrap transition-colors"
                >
                  Download Excel Template
                </Button>
              </div>

              {/* File Drop / Select Area */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-[#0F766E] transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="excel-file-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="p-3 bg-teal-100 text-[#0F766E] rounded-full border border-teal-200">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">
                    {bulkFile ? bulkFile.name : 'Click to select Excel (.xlsx) or CSV file'}
                  </p>
                  <p className="text-xs text-slate-500">Supported formats: .xlsx, .xls, .csv</p>
                </label>
              </div>

              {/* Import Summary Results Report if finished */}
              {bulkSummary && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-teal-950 font-bold text-sm">
                    <span>Import Report Summary</span>
                    <span>{bulkSummary.created} / {bulkSummary.total} Created</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold py-2">
                    <div className="p-2 bg-white rounded-lg border border-teal-100 text-slate-700">
                      Total Rows: <span className="font-bold text-slate-900">{bulkSummary.total}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-teal-100 text-[#0F766E]">
                      Created: <span className="font-bold">{bulkSummary.created}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-teal-100 text-slate-600">
                      Skipped: <span className="font-bold">{bulkSummary.skipped}</span>
                    </div>
                  </div>

                  {bulkSummary.errors && bulkSummary.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                      <p className="font-bold text-slate-700">Skipped Row Details:</p>
                      {bulkSummary.errors.map((errStr, idx) => (
                        <p key={idx} className="text-slate-600 text-[11px] font-mono">• {errStr}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Parsed Rows Preview Table */}
              {bulkParsedRows.length > 0 && !bulkSummary && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span>Preview ({bulkParsedRows.length} users ready to import):</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 sticky top-0 font-bold text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Username</th>
                          <th className="py-2 px-3">Full Name</th>
                          <th className="py-2 px-3">College</th>
                          <th className="py-2 px-3">Batch</th>
                          <th className="py-2 px-3">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {bulkParsedRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 text-slate-400 font-sans">{i + 1}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-900">{r.username}</td>
                            <td className="py-1.5 px-3 font-sans text-slate-700">{r.full_name}</td>
                            <td className="py-1.5 px-3 font-sans text-slate-600">{r.college || 'Default'}</td>
                            <td className="py-1.5 px-3 font-sans text-[#0F766E]">{r.batch || '—'}</td>
                            <td className="py-1.5 px-3 font-sans">
                              <Badge className="text-[10px] bg-teal-50 text-teal-800 border-teal-200">
                                {r.role}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <ModalFooter className="pt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="rounded-lg h-10 text-slate-600"
                >
                  Close
                </Button>

                {bulkParsedRows.length > 0 && !bulkSummary && (
                  <Button
                    type="button"
                    onClick={handleConfirmBulkImport}
                    disabled={bulkImporting}
                    className="rounded-lg h-10 font-bold bg-[#0F766E] hover:bg-[#115E59] text-white"
                  >
                    {bulkImporting ? 'Importing Users...' : `Import ${bulkParsedRows.length} Users Now`}
                  </Button>
                )}
              </ModalFooter>
            </div>
          </ModalContent>
        </Modal>

        {/* ==================== SESSION DETAILS INSPECTOR MODAL ==================== */}
        <Modal open={!!selectedSessionForDetails} onOpenChange={() => setSelectedSessionForDetails(null)}>
          <ModalContent className="sm:max-w-xl rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Info className="h-6 w-6 text-[#0F766E]" />
                Session Diagnostics & Technical Details
              </ModalTitle>
              <ModalDescription className="text-xs text-slate-500">
                Detailed client environment, network identification, and security specs.
              </ModalDescription>
            </ModalHeader>

            {selectedSessionForDetails && (() => {
              const s = selectedSessionForDetails;
              const parsed = parseUserAgent(s.user_agent);
              const ipFormatted = formatIP(s.ip_address);
              const activityStr = getTimeAgo(s.last_active || s.created_at);

              return (
                <div className="space-y-4 my-3 text-xs">
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0F766E] animate-pulse" />
                      <span className="font-bold text-teal-950 text-sm">
                        Session Status: Active {s.is_current ? '(Current Session)' : ''}
                      </span>
                    </div>
                    <Badge className="bg-teal-100 text-teal-900 border-teal-300 font-mono">
                      Session #{s.session_id}
                    </Badge>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">User Account</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-800 font-medium">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Full Name</span>
                        <span className="font-bold">{s.user?.full_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Username</span>
                        <span className="font-mono">@{s.user?.username}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Email Address</span>
                        <span>{s.user?.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Access Role</span>
                        <Badge className="bg-slate-200 text-slate-800 text-[10px] mt-0.5">{s.user?.role}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Client & Network Specs</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-800 font-medium">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Browser Engine</span>
                        <span className="font-bold text-slate-900">{parsed.browser}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Operating System</span>
                        <span>{parsed.os}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Device Category</span>
                        <span>{parsed.deviceType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">IP Address</span>
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{ipFormatted}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Timestamps & Activity</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-800 font-medium">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Initial Login Time</span>
                        <span>{new Date(s.created_at).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Last Active Activity</span>
                        <span className="text-teal-800 font-bold">{activityStr} ({new Date(s.last_active || s.created_at).toLocaleTimeString()})</span>
                      </div>
                    </div>
                  </div>

                  <ModalFooter className="pt-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedSessionForDetails(null)}
                      className="rounded-lg h-9 text-xs text-slate-600"
                    >
                      Close Inspector
                    </Button>
                    {s.is_current ? (
                      <span className="text-xs text-teal-800 font-semibold px-3 py-1.5 bg-teal-50 rounded-lg border border-teal-200">
                        Current Session Active
                      </span>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => {
                          const id = s.session_id;
                          setSelectedSessionForDetails(null);
                          handleRevokeSession(id);
                        }}
                        className="rounded-lg h-9 text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
                      >
                        Revoke This Session Now
                      </Button>
                    )}
                  </ModalFooter>
                </div>
              );
            })()}
          </ModalContent>
        </Modal>
        {/* ==================== ADMIN PROFILE MODAL ==================== */}
        <Modal open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
          <ModalContent className="sm:max-w-md rounded-xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-[#0F766E]" />
                Administrator Profile
              </ModalTitle>
              <ModalDescription className="text-xs text-slate-500">
                Manage your system credentials and administrative account details.
              </ModalDescription>
            </ModalHeader>

            <form onSubmit={handleSaveProfile} className="space-y-4 my-2">
              <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-lg flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  {profileForm.full_name ? profileForm.full_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <p className="font-bold text-xs text-teal-950">Global System Administrator</p>
                  <p className="text-[11px] text-teal-700 font-mono">@admin • Full Privileges</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Full Name</label>
                <Input
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  required
                  placeholder="System Administrator"
                  className="h-10 text-sm rounded-lg focus:ring-teal-600 focus:border-teal-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Address</label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                  placeholder="admin@clinformatiq.com"
                  className="h-10 text-sm rounded-lg focus:ring-teal-600 focus:border-teal-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">New Password (Optional)</label>
                <Input
                  type="password"
                  value={profileForm.password}
                  onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                  placeholder="Leave blank to keep existing password"
                  className="h-10 text-sm rounded-lg focus:ring-teal-600 focus:border-teal-600"
                />
                <p className="text-[11px] text-slate-400">Only fill this field if you wish to change the administrator password.</p>
              </div>

              <ModalFooter className="pt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="rounded-lg h-10 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="rounded-lg h-10 font-bold bg-[#0F766E] hover:bg-[#115E59] text-white"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      </main>
    </div>
  );
}
