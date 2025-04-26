import React, { useState } from "react";
import AgentLLMItem from "./AgentLLMItem";
import { AVAILABLE_LLM_PROVIDERS } from "@/pages/GeneralSettings/LLMPreference";
import AgentModelSelection from "../AgentModelSelection";
import { useTranslation } from "react-i18next";

// 僅啟用 Bedrock
const ENABLED_PROVIDERS = ["bedrock"];

// 僅包含 Bedrock 提供者，移除其他選項
const LLMS = AVAILABLE_LLM_PROVIDERS.filter((llm) =>
  ENABLED_PROVIDERS.includes(llm.value)
);

// Bedrock 支援的模型清單
const BEDROCK_MODELS = [
  { name: "Nova Pro", value: "anthropic.nova-pro" },
  { name: "Nova Micro", value: "anthropic.nova-micro" },
  { name: "Sonnet 3.7", value: "anthropic.claude-3-7-sonnet" },
  { name: "Sonnet 3.5 v2", value: "anthropic.claude-3-5-sonnet-v2" },
];

export default function AgentLLMSelection({
  settings,
  workspace,
  setHasChanges,
}) {
  const [selectedLLM] = useState("bedrock"); // 固定為 Bedrock
  const { t } = useTranslation();
  const selectedLLMObject = LLMS.find((llm) => llm.value === selectedLLM);

  // 確保 Bedrock 存在，否則顯示錯誤
  if (!selectedLLMObject) {
    return (
      <div className="text-red-500 p-4 rounded-lg bg-red-100">
        Error: AWS Bedrock provider not found in available LLM providers. Please check the configuration in <code>LLMPreference.jsx</code>.
      </div>
    );
  }

  return (
    <div className="border-b border-white/40 pb-8">
      <div className="flex flex-col">
        <label htmlFor="name" className="block input-label text-white font-medium text-sm">
          {t("agent.provider.title")}
        </label>
        <p className="text-white text-opacity-60 text-xs font-medium py-1.5">
          {t("agent.provider.description")}
        </p>
      </div>

      <div className="relative">
        <input type="hidden" name="agentProvider" value={selectedLLM} />
        {/* 直接顯示 Bedrock 的 UI，移除搜尋和下拉選單 */}
        <div className="w-full max-w-[640px] h-[64px] bg-theme-settings-input-bg rounded-lg flex items-center p-[14px] justify-between border-2 border-primary-button">
          <div className="flex gap-x-4 items-center">
            <img
              src={selectedLLMObject.logo}
              alt={`${selectedLLMObject.name} logo`}
              className="w-10 h-10 rounded-md"
              onError={(e) => {
                e.target.src = "/default-logo.png"; // 圖標載入失敗時的備用圖片
              }}
            />
            <div className="flex flex-col text-left">
              <div className="text-sm font-semibold text-white">
                {selectedLLMObject.name}
              </div>
              <div className="mt-1 text-xs text-white/60">
                {selectedLLMObject.description}
              </div>
            </div>
          </div>
          {/* 顯示設置按鈕以編輯憑證 */}
          <AgentLLMItem
            llm={selectedLLMObject}
            availableLLMs={LLMS}
            settings={settings}
            checked={true}
            onClick={() => {}} // 無需切換提供者，僅用於觸發憑證模態框
          />
        </div>
      </div>

      {/* 模型選擇 */}
      <div className="mt-4 flex flex-col gap-y-1">
        <AgentModelSelection
          provider={selectedLLM}
          workspace={workspace}
          setHasChanges={setHasChanges}
          availableModels={BEDROCK_MODELS}
        />
      </div>
    </div>
  );
}