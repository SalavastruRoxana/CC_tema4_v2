const express = require('express');

router = express.Router();

videos = require('../Controllers/videos');

router.get('/videos', videos.videos);

module.exports = router