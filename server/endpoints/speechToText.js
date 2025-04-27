const express = require('express');
const multer = require('multer');
const upload = multer(); // 記得要處理audio blob上傳
const { transcribeAudio } = require('../utils/awsTranscribe'); // 你自己寫這個函式
const router = express.Router();

router.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    const audioBuffer = req.file.buffer;
    const transcript = await transcribeAudio(audioBuffer);
    res.json({ transcript });
  } catch (error) {
    console.error('Speech to text error:', error);
    res.status(500).json({ error: 'Speech recognition failed.' });
  }
});

module.exports = router;
