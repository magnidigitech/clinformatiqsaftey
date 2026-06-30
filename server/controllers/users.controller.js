const prisma = require('../prisma/client');

exports.getOrgUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        user_id: true,
        full_name: true,
        username: true,
        role: true
      },
      orderBy: {
        full_name: 'asc'
      }
    });

    res.json({ status: 'success', data: users });
  } catch (error) {
    console.error('Error fetching org users:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch organization users' });
  }
};
