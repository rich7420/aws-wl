import React, { useState, useRef, useEffect } from "react";
import { Microphone } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import { PROMPT_INPUT_EVENT } from "../../PromptInput";
import { useTranslation } from "react-i18next";

const SILENCE_INTERVAL = 3200; // 3.2秒沒聲音就自動結束
const POLLING_INTERVAL = 4000; // 每4秒詢問一次結果

export default function SpeechToText({ sendCommand }) {
  const [listening, setListening] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [pollingIntervalId, setPollingIntervalId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const timeoutRef = useRef(null);
  const jobNameRef = useRef(null);

  const { t } = useTranslation();

  const startRecording = async () => {
    setRecordedChunks([]);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorder.start();
    setListening(true);

    timeoutRef.current = setTimeout(() => {
      stopRecording();
    }, SILENCE_INTERVAL);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    setListening(false);
    clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    if (!listening && recordedChunks.length > 0) {
      uploadAndTranscribe();
    }
  }, [listening]);

  const uploadAndTranscribe = async () => {
    const audioBlob = new Blob(recordedChunks, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    try {
      const uploadRes = await fetch("/api/speech/upload-audio", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.key) throw new Error("Upload failed");

      const startRes = await fetch("/api/speech/start-transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: uploadData.key }),
      });

      const startData = await startRes.json();
      if (!startData.jobName) throw new Error("Start transcription failed");

      jobNameRef.current = startData.jobName;
      const intervalId = setInterval(checkTranscriptionStatus, POLLING_INTERVAL);
      setPollingIntervalId(intervalId);
    } catch (error) {
      console.error("Speech upload/start error:", error);
    }
  };

  const checkTranscriptionStatus = async () => {
    if (!jobNameRef.current) return;

    try {
      const resultRes = await fetch("/api/speech/get-transcription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobName: jobNameRef.current }),
      });

      const resultData = await resultRes.json();

      if (resultData.status === "COMPLETED") {
        clearInterval(pollingIntervalId);
        jobNameRef.current = null;
        sendCommand(resultData.text, true);
      }
    } catch (error) {
      console.error("Polling transcription error:", error);
    }
  };

  function handlePromptUpdate(e) {
    if (!e?.detail && timeoutRef.current) {
      stopRecording();
      clearTimeout(timeoutRef.current);
    }
  }

  useEffect(() => {
    if (window) window.addEventListener(PROMPT_INPUT_EVENT, handlePromptUpdate);
    return () => window?.removeEventListener(PROMPT_INPUT_EVENT, handlePromptUpdate);
  }, []);

  return (
    <div
      id="text-size-btn"
      data-tooltip-id="tooltip-text-size-btn"
      data-tooltip-content={t("chat_window.microphone")}
      aria-label={t("chat_window.microphone")}
      onClick={listening ? stopRecording : startRecording}
      className={`border-none relative flex justify-center items-center opacity-60 hover:opacity-100 light:opacity-100 light:hover:opacity-60 cursor-pointer ${
        listening ? "!opacity-100" : ""
      }`}
    >
      <Microphone
        weight="fill"
        color="var(--theme-sidebar-footer-icon-fill)"
        className={`w-[22px] h-[22px] pointer-events-none text-theme-text-primary ${
          listening ? "animate-pulse-glow" : ""
        }`}
      />
      <Tooltip
        id="tooltip-text-size-btn"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </div>
  );
}
