// server/controllers/cases.controller.js – Full case CRUD + submit/lock/unlock
const prisma = require('../prisma/client');
const { generateCaseNumber, validateCaseAccess, assertEditable } = require('../services/case.service');

/**
 * GET /api/cases
 * STUDENT: own cases. INSTRUCTOR/ADMIN: all cases in org.
 */
async function list(req, res, next) {
  try {
    const { user } = req;
    const where = {};

    if (user.role === 'STUDENT') {
      where.OR = [
        { student_id: user.user_id },
        { assigned_to: user.user_id }
      ];
    } else {
      where.OR = [
        { org_id: user.org_id },
        { assigned_to: user.user_id }
      ];
    }

    // Support optional query filters
    if (req.query.workflow_state) {
      where.workflow_state = req.query.workflow_state;
    }
    if (req.query.case_number) {
      where.case_number = req.query.case_number;
    }

    if (user.role !== 'ADMIN') {
      where.AND = [
        {
          OR: [
            { locked_by: null },
            { locked_by: user.username },
            { assigned_to: user.user_id }
          ]
        }
      ];
    }

    const cases = await prisma.sptOrgCase.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      include: {
        student: {
          select: { user_id: true, username: true, full_name: true },
        },
        assignee: {
          select: { user_id: true, username: true, full_name: true },
        },
        patient: true,
        products: { take: 1 },
        events: { take: 1 },
        reporters: { take: 1 },
        workflow_logs: {
          orderBy: { action_time: 'desc' },
          take: 5,
          include: {
            user: { select: { user_id: true, username: true, full_name: true } }
          }
        },
        _count: {
          select: { products: true, events: true, reporters: true },
        },
      },
    });

    res.json({ success: true, data: cases });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cases
 * Create a new case with auto-generated case_number.
 */
async function create(req, res, next) {
  try {
    const { user } = req;
    const { 
      receipt_date, 
      aware_date, 
      case_type, 
      case_country,
      serious_flag,
      patient,
      reporter,
      product,
      initial_justification,
      attachments,
      references
    } = req.body;

    const case_number = await generateCaseNumber(user.org_id);

    const newCase = await prisma.$transaction(async (tx) => {
      // Prepare initial analysis_data containing attachments and references
      let initialAnalysis = {};
      if (req.body.analysis_data) {
        try {
          initialAnalysis = typeof req.body.analysis_data === 'string' 
            ? JSON.parse(req.body.analysis_data) 
            : req.body.analysis_data;
        } catch (e) {
          initialAnalysis = {};
        }
      }
      if (attachments && Array.isArray(attachments)) {
        initialAnalysis.attachments = attachments;
      }
      if (references && Array.isArray(references)) {
        initialAnalysis.references = references;
      }

      // 1. Create the case
      const createdCase = await tx.sptOrgCase.create({
        data: {
          case_number,
          student_id: user.user_id,
          org_id: user.org_id,
          workflow_state: 'DRAFT',
          case_country: case_country || (reporter ? reporter.country : null) || null,
          receipt_date: receipt_date ? new Date(receipt_date) : null,
          aware_date: aware_date ? new Date(aware_date) : null,
          case_type: case_type || null,
          serious_flag: serious_flag || 'N',
          case_narrative: req.body.case_narrative || null,
          analysis_data: Object.keys(initialAnalysis).length > 0 ? JSON.stringify(initialAnalysis) : null,
        },
      });

      const caseId = createdCase.case_id;

      // 2. Workflow Log
      await tx.workflowLog.create({
        data: {
          case_id: caseId,
          from_state: null,
          to_state: 'DRAFT',
          actioned_by: user.user_id,
          comments: initial_justification || 'Case created',
        },
      });

      // 3. Create Patient (if provided)
      if (patient) {
        await tx.sptOrgCad.create({
          data: {
            case_id: caseId,
            dob: patient.dob ? new Date(patient.dob) : null,
            age_value: patient.age ? parseInt(patient.age, 10) : null,
            age_unit: patient.ageUnits || null,
            sex: patient.gender || null,
            patient_code: patient.initials || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || null,
            first_name: patient.firstName || null,
            last_name: patient.lastName || null,
          }
        });
      }

      // 4. Create Product (if provided)
      if (product && product.productName) {
        await tx.sptOrgProduct.create({
          data: {
            case_id: caseId,
            drug_name: product.productName,
          }
        });
      }

      // 5. Create Reporter (if provided)
      if (reporter && (reporter.firstName || reporter.lastName || reporter.country)) {
        await tx.reporter.create({
          data: {
            case_id: caseId,
            salutation: reporter.sal || reporter.salutation || null,
            first_name: reporter.firstName || null,
            last_name: reporter.lastName || null,
            suffix: reporter.suffix || null,
            country: reporter.country || null,
            state: reporter.state || null,
            postal_code: reporter.postalCode || reporter.postal_code || null,
            reporter_type: reporter.reporterType || null,
          }
        });
      }

      return createdCase;
    });

    res.status(201).json({ success: true, data: newCase });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/cases/:id
 * Full case with all related data.
 */
async function getById(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const caseData = await prisma.sptOrgCase.findUnique({
      where: { case_id: caseId },
      include: {
        student: {
          select: { user_id: true, username: true, full_name: true, role: true },
        },
        assignee: {
          select: { user_id: true, username: true, full_name: true, role: true },
        },
        organisation: true,
        patient: true,
        products: true,
        events: {
          include: { causalities: true },
        },
        reporters: true,
        action_items: true,

        workflow_logs: {
          orderBy: { action_time: 'asc' },
          include: {
            user: {
              select: { user_id: true, username: true, full_name: true },
            },
          },
        },
        feedback: {
          include: {
            instructor: {
              select: { user_id: true, username: true, full_name: true },
            },
          },
        },
      },
    });

    if (!caseData) {
      const err = new Error('Case not found');
      err.statusCode = 404;
      throw err;
    }

    let parsedAnalysis = {};
    if (caseData.analysis_data) {
      try {
        parsedAnalysis = typeof caseData.analysis_data === 'string' ? JSON.parse(caseData.analysis_data) : caseData.analysis_data;
      } catch (e) {}
    }

    let qcRequestedBy = parsedAnalysis.qc_requested_by || null;
    if (!qcRequestedBy && caseData.workflow_logs && caseData.workflow_logs.length > 0) {
      const lastQcLog = [...caseData.workflow_logs].reverse().find(l => l.to_state === 'PENDING_QC');
      if (lastQcLog && lastQcLog.user) {
        qcRequestedBy = {
          user_id: lastQcLog.user.user_id,
          full_name: lastQcLog.user.full_name,
          username: lastQcLog.user.username,
        };
      }
    }
    if (!qcRequestedBy && caseData.student) {
      qcRequestedBy = {
        user_id: caseData.student.user_id,
        full_name: caseData.student.full_name,
        username: caseData.student.username,
        role: caseData.student.role,
      };
    }

    const caseResult = {
      ...caseData,
      case_country: caseData.case_country || caseData.reporters?.[0]?.country || null,
      attachments: parsedAnalysis.attachments || [],
      references: parsedAnalysis.references || [],
      qc_requested_by: qcRequestedBy,
    };

    res.json({ success: true, data: caseResult });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/cases/number/:case_number
 * Fetch a case by its case_number within the user's organization.
 */
async function getByNumber(req, res, next) {
  try {
    const caseNumber = req.params.case_number;
    
    const caseData = await prisma.sptOrgCase.findUnique({
      where: { case_number: caseNumber },
      include: {
        patient: true,
      },
    });

    if (!caseData || caseData.org_id !== req.user.org_id) {
      const err = new Error('Case not found');
      err.statusCode = 404;
      throw err;
    }

    let parsedAnalysis = {};
    if (caseData.analysis_data) {
      try {
        parsedAnalysis = typeof caseData.analysis_data === 'string' ? JSON.parse(caseData.analysis_data) : caseData.analysis_data;
      } catch (e) {}
    }

    res.json({
      success: true,
      data: {
        ...caseData,
        attachments: parsedAnalysis.attachments || [],
        references: parsedAnalysis.references || [],
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/cases/:id
 * Update case fields – only if DRAFT or NEEDS_REVISION and by owner.
 */
async function update(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const caseRecord = await validateCaseAccess(caseId, req.user);
    assertEditable(caseRecord, req.user);

    // Only the case owner (student) can update
    const { receipt_date, aware_date, case_type, case_country, serious_flag, workflow_state, assigned_to, case_narrative, analysis_data, patient_history_data, lab_data, attachments, references } = req.body;

    // Only the case owner (student) or current assignee can update unless it's a routing update
    if (req.user.role === 'STUDENT' && caseRecord.student_id !== req.user.user_id && caseRecord.assigned_to !== req.user.user_id && !workflow_state && !assigned_to) {
      const err = new Error('Only the case owner or assignee can update this case');
      err.statusCode = 403;
      throw err;
    }

    let updatedStudentId = undefined;
    if (assigned_to !== undefined && assigned_to !== null && assigned_to !== '') {
      if (/^\d+$/.test(String(assigned_to))) {
        updatedStudentId = parseInt(assigned_to, 10);
      } else {
        const targetUser = await prisma.user.findUnique({
          where: { username: assigned_to }
        });
        if (targetUser) {
          updatedStudentId = targetUser.user_id;
        }
      }
    }

    let parsedReceiptDate = undefined;
    if (receipt_date !== undefined) {
      parsedReceiptDate = null;
      if (receipt_date && receipt_date !== '00-MMM-0000') {
        const d = new Date(receipt_date);
        if (!isNaN(d.getTime())) parsedReceiptDate = d;
      }
    }

    let parsedAwareDate = undefined;
    if (aware_date !== undefined) {
      parsedAwareDate = null;
      if (aware_date && aware_date !== '00-MMM-0000') {
        const d = new Date(aware_date);
        if (!isNaN(d.getTime())) parsedAwareDate = d;
      }
    }

    const serializeVal = (val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    };

    let finalAnalysisData = undefined;
    if (analysis_data !== undefined || attachments !== undefined || references !== undefined) {
      let currentObj = {};
      if (caseRecord.analysis_data) {
        try {
          currentObj = typeof caseRecord.analysis_data === 'string' ? JSON.parse(caseRecord.analysis_data) : caseRecord.analysis_data;
        } catch (e) {}
      }
      if (analysis_data !== undefined) {
        try {
          const parsed = typeof analysis_data === 'string' ? JSON.parse(analysis_data) : analysis_data;
          currentObj = { ...currentObj, ...parsed };
        } catch (e) {}
      }
      if (attachments !== undefined) {
        currentObj.attachments = attachments;
      }
      if (references !== undefined) {
        currentObj.references = references;
      }
      finalAnalysisData = JSON.stringify(currentObj);
    }

    const updatedCase = await prisma.sptOrgCase.update({
      where: { case_id: caseId },
      data: {
        receipt_date: parsedReceiptDate,
        aware_date: parsedAwareDate,
        case_type: case_type !== undefined ? case_type : undefined,
        case_country: case_country !== undefined ? case_country : undefined,
        serious_flag: serious_flag !== undefined ? serious_flag : undefined,
        case_narrative: case_narrative !== undefined ? case_narrative : undefined,
        analysis_data: finalAnalysisData !== undefined ? finalAnalysisData : undefined,
        patient_history_data: serializeVal(patient_history_data),
        lab_data: serializeVal(lab_data),
        workflow_state: workflow_state !== undefined ? workflow_state : undefined,
        assigned_to: updatedStudentId !== undefined ? updatedStudentId : undefined,
      },
    });

    res.json({ success: true, data: updatedCase });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/cases/:id
 * Only DRAFT cases can be deleted (hard delete).
 */
async function remove(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const caseRecord = await validateCaseAccess(caseId, req.user);

    if (caseRecord.workflow_state !== 'DRAFT') {
      const err = new Error('Only DRAFT cases can be deleted');
      err.statusCode = 400;
      throw err;
    }

    // Delete related records in order to avoid FK constraints
    await prisma.$transaction([
      prisma.sptOrgEventCausality.deleteMany({
        where: { event: { case_id: caseId } },
      }),
      prisma.sptOrgEvent.deleteMany({ where: { case_id: caseId } }),
      prisma.sptOrgDosageRegimen.deleteMany({
        where: { product: { case_id: caseId } },
      }),
      prisma.sptOrgProduct.deleteMany({ where: { case_id: caseId } }),
      prisma.sptOrgCad.deleteMany({ where: { case_id: caseId } }),
      prisma.reporter.deleteMany({ where: { case_id: caseId } }),
      prisma.workflowLog.deleteMany({ where: { case_id: caseId } }),
      prisma.instructorFeedback.deleteMany({ where: { case_id: caseId } }),
      prisma.auditLog.deleteMany({ where: { case_id: caseId } }),
      prisma.sptOrgCase.delete({ where: { case_id: caseId } }),
    ]);

    res.json({ success: true, message: 'Case deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cases/:id/submit
 * DRAFT → SUBMITTED
 */
async function submit(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const caseRecord = await validateCaseAccess(caseId, req.user);

    if (caseRecord.workflow_state !== 'DRAFT' && caseRecord.workflow_state !== 'NEEDS_REVISION') {
      const err = new Error(
        `Cannot submit case in state "${caseRecord.workflow_state}"`
      );
      err.statusCode = 400;
      throw err;
    }

    const fromState = caseRecord.workflow_state;

    const [updatedCase] = await prisma.$transaction([
      prisma.sptOrgCase.update({
        where: { case_id: caseId },
        data: { workflow_state: 'SUBMITTED' },
      }),
      prisma.workflowLog.create({
        data: {
          case_id: caseId,
          from_state: fromState,
          to_state: 'SUBMITTED',
          actioned_by: req.user.user_id,
          comments: req.body.comments || 'Case submitted for review',
        },
      }),
    ]);

    res.json({ success: true, data: updatedCase });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cases/:id/lock
 */
async function lock(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const updatedCase = await prisma.sptOrgCase.update({
      where: { case_id: caseId },
      data: {
        locked_by: req.user.username,
        lock_time: new Date(),
      },
    });

    res.json({ success: true, data: updatedCase });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cases/:id/unlock
 */
async function unlock(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const updatedCase = await prisma.sptOrgCase.update({
      where: { case_id: caseId },
      data: {
        locked_by: null,
        lock_time: null,
      },
    });

    res.json({ success: true, data: updatedCase });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cases/:id/reopen
 */
async function reopen(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const caseRecord = await validateCaseAccess(caseId, req.user);

    if (req.user.role !== 'ADMIN') {
      const err = new Error('Only an admin can reopen cases');
      err.statusCode = 403;
      throw err;
    }

    if (caseRecord.workflow_state !== 'CLOSED') {
      const err = new Error('Only CLOSED cases can be reopened');
      err.statusCode = 400;
      throw err;
    }

    const [updatedCase] = await prisma.$transaction([
      prisma.sptOrgCase.update({
        where: { case_id: caseId },
        data: { workflow_state: 'DRAFT' },
      }),
      prisma.workflowLog.create({
        data: {
          case_id: caseId,
          from_state: caseRecord.workflow_state,
          to_state: 'DRAFT',
          actioned_by: req.user.user_id,
          comments: req.body.comments || 'Case reopened by admin',
        },
      }),
    ]);

    res.json({ success: true, data: updatedCase });
  } catch (err) {
    next(err);
  }
}

async function getRevisions(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const revisions = await prisma.auditLog.findMany({
      where: { case_id: caseId },
      include: {
        user: {
          select: {
            user_id: true,
            username: true,
            full_name: true,
          }
        }
      },
      orderBy: { changed_at: 'desc' },
    });

    res.json({ success: true, data: revisions });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cases/:id/route
 * Route a case to a specific user for QC or return back to requester.
 */
async function routeCase(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const caseRecord = await validateCaseAccess(caseId, req.user);
    const { assigned_to, comments, action, workflow_state } = req.body;

    if (!assigned_to) {
      const err = new Error('Assigned user is required');
      err.statusCode = 400;
      throw err;
    }

    let assigneeId;
    if (/^\d+$/.test(String(assigned_to))) {
      assigneeId = parseInt(assigned_to, 10);
    } else {
      const targetUser = await prisma.user.findUnique({
        where: { username: assigned_to }
      });
      if (!targetUser) {
        const err = new Error('Assigned user not found');
        err.statusCode = 404;
        throw err;
      }
      assigneeId = targetUser.user_id;
    }

    const fromState = caseRecord.workflow_state;
    const isReturn = action === 'RETURN' || (fromState === 'PENDING_QC' && workflow_state !== 'PENDING_QC');
    const toState = isReturn ? (workflow_state || 'QC_COMPLETED') : (workflow_state || 'PENDING_QC');

    let parsedAnalysis = {};
    if (caseRecord.analysis_data) {
      try {
        parsedAnalysis = typeof caseRecord.analysis_data === 'string'
          ? JSON.parse(caseRecord.analysis_data)
          : caseRecord.analysis_data;
      } catch (e) {}
    }

    if (!isReturn) {
      // User is routing for QC: save their data and link to case
      parsedAnalysis.qc_requested_by = {
        user_id: req.user.user_id,
        full_name: req.user.full_name,
        username: req.user.username,
        role: req.user.role,
        routed_at: new Date().toISOString()
      };
      parsedAnalysis.last_routed_by = {
        user_id: req.user.user_id,
        full_name: req.user.full_name,
        username: req.user.username,
      };
    } else {
      // User is returning case from QC
      parsedAnalysis.last_returned_by = {
        user_id: req.user.user_id,
        full_name: req.user.full_name,
        username: req.user.username,
        role: req.user.role,
        returned_at: new Date().toISOString()
      };
    }

    const defaultComments = isReturn ? 'Case returned with QC Completed' : 'Case routed for QC';
    const commentText = comments || defaultComments;

    const newRoutingComment = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      user: req.user.full_name || req.user.username,
      comment: commentText
    };

    if (Array.isArray(req.body.routingComments)) {
      parsedAnalysis.routingComments = req.body.routingComments;
    } else if (!Array.isArray(parsedAnalysis.routingComments)) {
      parsedAnalysis.routingComments = [];
    }

    // Prepend the new routing comment and avoid duplicate of identical text by same user
    parsedAnalysis.routingComments = [
      newRoutingComment,
      ...parsedAnalysis.routingComments.filter(rc => !(rc.comment === commentText && (rc.user === (req.user.full_name || req.user.username))))
    ];

    const [updatedCase] = await prisma.$transaction([
      prisma.sptOrgCase.update({
        where: { case_id: caseId },
        data: { 
          assigned_to: assigneeId,
          workflow_state: toState,
          analysis_data: JSON.stringify(parsedAnalysis),
          locked_by: null,
          lock_time: null,
        },
      }),
      prisma.workflowLog.create({
        data: {
          case_id: caseId,
          from_state: fromState,
          to_state: toState,
          actioned_by: req.user.user_id,
          comments: commentText,
        },
      }),
    ]);

    res.json({ success: true, data: updatedCase });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getById, getByNumber, update, remove, submit, lock, unlock, reopen, getRevisions, routeCase };
