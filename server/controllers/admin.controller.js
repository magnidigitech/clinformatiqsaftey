const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');

exports.getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { user_id: true, username: true, full_name: true, email: true, role: true, status: true, created_at: true }
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { username, password, full_name, email, role } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password_hash,
        full_name,
        email,
        role: role || 'STUDENT',
        org_id: req.user.org_id
      }
    });
    delete user.password_hash;
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { role, status } = req.body;
    const user = await prisma.user.update({
      where: { user_id: parseInt(req.params.id) },
      data: { role, status }
    });
    delete user.password_hash;
    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { user_id: parseInt(req.params.id) },
      data: { status: 'INACTIVE' }
    });
    res.json({ message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
};

exports.createOrganisation = async (req, res, next) => {
  try {
    const { name, type } = req.body;
    const org = await prisma.organisation.create({
      data: { name, type }
    });
    res.status(201).json(org);
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;

    // Total users in the system
    const totalUsers = await prisma.user.count({
      where: { status: 'ACTIVE', org_id: orgId }
    });

    // Total cases in the system
    const totalCases = await prisma.sptOrgCase.count({
      where: { org_id: orgId }
    });

    const activeCases = await prisma.sptOrgCase.count({
      where: { org_id: orgId, workflow_state: { not: 'CLOSED' } }
    });

    const closedCases = await prisma.sptOrgCase.count({
      where: { org_id: orgId, workflow_state: 'CLOSED' }
    });

    // Compute status distribution for pie chart
    const statusGroups = await prisma.sptOrgCase.groupBy({
      by: ['workflow_state'],
      where: { org_id: orgId },
      _count: {
        case_id: true
      }
    });

    const caseStatusDistribution = statusGroups.map(group => ({
      name: group.workflow_state || 'UNKNOWN',
      value: group._count.case_id
    }));

    // Fetch all active users with their created and assigned cases
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE', org_id: orgId },
      select: {
        user_id: true,
        username: true,
        full_name: true,
        cases: {
          select: {
            case_id: true,
            workflow_state: true
          }
        },
        assigned_cases: {
          select: {
            case_id: true,
            workflow_state: true
          }
        }
      }
    });

    // Compute stats per user
    const usersAnalytics = users.map(user => {
      const allCasesMap = new Map();
      if (user.cases) user.cases.forEach(c => allCasesMap.set(c.case_id, c.workflow_state));
      if (user.assigned_cases) user.assigned_cases.forEach(c => allCasesMap.set(c.case_id, c.workflow_state));

      let activeCasesCount = 0;
      let closedCasesCount = 0;
      
      allCasesMap.forEach(state => {
        if (state === 'CLOSED') closedCasesCount++;
        else activeCasesCount++;
      });

      return {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        total_cases: allCasesMap.size,
        active_cases: activeCasesCount,
        closed_cases: closedCasesCount
      };
    });

    res.json({
      totalUsers,
      totalCases,
      activeCases,
      closedCases,
      users: usersAnalytics,
      caseStatusDistribution
    });
  } catch (error) {
    next(error);
  }
};
