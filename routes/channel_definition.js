var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('channel_definition', { title: 'Channel Definition' });
});

module.exports = router;
