const express = require('express');
const router = express.Router();
router.get('/', async (req, res) => {
  res.json({ status: 'healthy' });
});
module.exports = router;
