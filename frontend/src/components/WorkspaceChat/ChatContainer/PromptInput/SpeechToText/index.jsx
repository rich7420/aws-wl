import { useEffect, useRef, useState, useCallback } from "react";
import { Microphone } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import { PROMPT_INPUT_EVENT } from "../../PromptInput";
import { useTranslation } from "react-i18next";

let silenceTimeout;
const SILENCE_INTERVAL = 3200; // 3.2 seconds
const RECORDING_MAX_TIME = 15000; // Optional: Max 15 sec recording

export default function SpeechToText({ sendCommand }) {
  const { t } = useTranslation();
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const [recording, setRecording] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendAudioToServer(audioBlob);
        stopStream();
      });

      mediaRecorder.start();

      clearTimeout(silenceTimeout);
      silenceTimeout = setTimeout(() => {
        stopRecording();
      }, RECORDING_MAX_TIME);

      setRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearTimeout(silenceTimeout);
    setRecording(false);
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const sendAudioToServer = async (audioBlob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob);

    try {
      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.transcript) {
        sendCommand(data.transcript, true);
      }
    } catch (error) {
      console.error("Error sending audio:", error);
    }
  };

  const handleKeyPress = useCallback(
    (event) => {
      if (event.ctrlKey && event.keyCode === 77) {
        if (recording) {
          stopRecording();
        } else {
          startRecording();
        }
      }
    },
    [recording]
  );

  const handlePromptUpdate = (e) => {
    if (!e?.detail && silenceTimeout) {
      stopRecording();
      clearTimeout(silenceTimeout);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    if (window) {
      window.addEventListener(PROMPT_INPUT_EVENT, handlePromptUpdate);
    }
    return () => {
      window?.removeEventListener(PROMPT_INPUT_EVENT, handlePromptUpdate);
    };
  }, []);

  return (
    <div
      id="text-size-btn"
      data-tooltip-id="tooltip-text-size-btn"
      data-tooltip-content={t("chat_window.microphone")}
      aria-label={t("chat_window.microphone")}
      onClick={recording ? stopRecording : startRecording}
      className={`border-none relative flex justify-center items-center opacity-60 hover:opacity-100 light:opacity-100 light:hover:opacity-60 cursor-pointer ${
        recording ? "!opacity-100" : ""
      }`}
    >
      <Microphone
        weight="fill"
        color="var(--theme-sidebar-footer-icon-fill)"
        className={`w-[22px] h-[22px] pointer-events-none text-theme-text-primary ${
          recording ? "animate-pulse-glow" : ""
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
