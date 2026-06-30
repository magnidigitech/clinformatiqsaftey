const express = require('express');
const router = express.Router({ mergeParams: true });
const productsController = require('../controllers/products.controller');
const authMiddleware = require('../middleware/auth.middleware');
const auditMiddleware = require('../middleware/audit.middleware');

router.use(authMiddleware);

router.get('/', productsController.list);
router.post('/', auditMiddleware('spt_org_product'), productsController.create);
router.put('/:productId', auditMiddleware('spt_org_product'), productsController.update);
router.delete('/:productId', auditMiddleware('spt_org_product'), productsController.remove);

module.exports = router;
