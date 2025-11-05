const express = require('express');
const router = express.Router();
router.post('/', async (req, res) => {
  res.json({ message: 'Upload endpoint' });
});
module.exports = router;
