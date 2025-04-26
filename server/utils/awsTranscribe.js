const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

// 🔵 直接寫死你的 AWS Key
AWS.config.update({
  region: 'us-west-2', // 你可以自己換成你實際AWS設定的區域
  accessKeyId: '*****',
  secretAccessKey: '*****',
});

const s3 = new AWS.S3();
const transcribeService = new AWS.TranscribeService();

// 🔵 直接寫死 S3 bucket 名稱
const S3_BUCKET = 'stt-test-0426';
const MEDIA_FORMAT = 'webm'; // 音訊格式，根據前端錄音設定

async function uploadAudioToS3(audioBuffer, key) {
  const params = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: audioBuffer,
    ContentType: 'audio/webm',
  };
  await s3.putObject(params).promise();
  return `s3://${S3_BUCKET}/${key}`;
}

async function startTranscriptionJob(s3Uri, jobName) {
  const params = {
    TranscriptionJobName: jobName,
    IdentifyMultipleLanguages: true,
    LanguageOptions: ["zh-TW", "en-US", "ja-JP"],
    MediaFormat: MEDIA_FORMAT,
    Media: { MediaFileUri: s3Uri },
  };
  await transcribeService.startTranscriptionJob(params).promise();
}

async function getTranscriptionResult(jobName) {
  while (true) {
    const { TranscriptionJob } = await transcribeService.getTranscriptionJob({ TranscriptionJobName: jobName }).promise();
    if (TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
      const transcriptUri = TranscriptionJob.Transcript.TranscriptFileUri;
      const response = await fetch(transcriptUri);
      const data = await response.json();
      return data.results.transcripts[0].transcript;
    } else if (TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
      throw new Error('Transcription failed.');
    }
    await new Promise((resolve) => setTimeout(resolve, 3000)); // 每3秒問一次
  }
}

async function deleteS3Object(key) {
  const params = {
    Bucket: S3_BUCKET,
    Key: key,
  };
  await s3.deleteObject(params).promise();
}

async function transcribeAudio(audioBuffer) {
  const audioKey = `uploads/audio_${Date.now()}.webm`;
  const jobName = `job-${uuidv4()}`;

  try {
    const s3Uri = await uploadAudioToS3(audioBuffer, audioKey);
    await startTranscriptionJob(s3Uri, jobName);
    const transcript = await getTranscriptionResult(jobName);
    return transcript; // 🔥 只回傳文字
  } catch (error) {
    console.error('Error during transcription:', error);
    throw error;
  } finally {
    await deleteS3Object(audioKey); // 🔵 上傳完後自動清掉
  }
}

module.exports = { transcribeAudio };
