// 📂 server/endpoints/api/speech.js
const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } = require("@aws-sdk/client-transcribe");
const { v4: uuidv4 } = require("uuid");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const transcribeClient = new TranscribeClient({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

function apiSpeechEndpoints(router) {
  // 上傳錄音檔到 S3
  router.post("/speech/upload", upload.single("audio"), async (req, res) => {
    try {
      const file = req.file;
      const key = `uploads/audio_${Date.now()}.webm`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      res.json({ key });
    } catch (err) {
      console.error("Upload Error:", err);
      res.status(500).json({ error: "Failed to upload audio" });
    }
  });

  // 啟動 Transcribe 任務
  router.post("/speech/transcribe", async (req, res) => {
    try {
      const { key } = req.body;
      const jobName = `job-${uuidv4()}`;
      const mediaUri = `s3://${S3_BUCKET}/${key}`;

      await transcribeClient.send(
        new StartTranscriptionJobCommand({
          TranscriptionJobName: jobName,
          IdentifyMultipleLanguages: true,
          LanguageOptions: ["zh-TW", "en-US", "ja-JP"],
          MediaFormat: "webm",
          Media: { MediaFileUri: mediaUri },
          OutputBucketName: S3_BUCKET,
        })
      );

      res.json({ jobName });
    } catch (err) {
      console.error("Transcribe Start Error:", err);
      res.status(500).json({ error: "Failed to start transcription" });
    }
  });

  // 查詢 Transcribe 任務結果
  router.get("/speech/result/:jobName", async (req, res) => {
    try {
      const { jobName } = req.params;

      const { TranscriptionJob } = await transcribeClient.send(
        new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
      );

      if (TranscriptionJob.TranscriptionJobStatus === "COMPLETED") {
        const transcriptUri = TranscriptionJob.Transcript.TranscriptFileUri;
        const transcriptData = await fetch(transcriptUri).then((r) => r.json());
        const text = transcriptData.results.transcripts[0].transcript;

        res.json({ status: "COMPLETED", text });
      } else {
        res.json({ status: TranscriptionJob.TranscriptionJobStatus });
      }
    } catch (err) {
      console.error("Get Transcription Error:", err);
      res.status(500).json({ error: "Failed to get transcription result" });
    }
  });
}

module.exports = {
  apiSpeechEndpoints,
};
