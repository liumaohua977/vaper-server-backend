const router = require('koa-router')();
const netrelation = require("../controllers/netrelation");

router.post('/add', netrelation.add);
router.post('/search', netrelation.search);
router.get('/count', netrelation.count);
router.get('/fetch', netrelation.fetchLinks);

module.exports = router;