import React, { useState } from 'react';
import { TaskName } from '../types';
import {
  useShowAiSettings, useSetShowAiSettings,
  useProvider, useSetProvider,
  useGeminiKey, useSetGeminiKey,
  useOpenaiConfig, useSetOpenaiConfig,
  useTaskConfigs,
  useUpdateTaskConfig,
  useResetTaskConfigs,
} from '../store';

const TASK_LABELS: Record<TaskName, string> = {
  narrative: '叙事',
  realityMapping: '现实映射',
  worldRules: '世界法则',
  choices: '选项生成',
};

export const AiSettingsModal: React.FC = () => {
  const isOpen = useShowAiSettings();
  const setShowAiSettings = useSetShowAiSettings();
  const provider = useProvider();
  const setProvider = useSetProvider();
  const geminiKey = useGeminiKey();
  const setGeminiKey = useSetGeminiKey();
  const openaiConfig = useOpenaiConfig();
  const setOpenaiConfig = useSetOpenaiConfig();
  const taskConfigs = useTaskConfigs();
  const updateTaskConfig = useUpdateTaskConfig();
  const resetTaskConfigs = useResetTaskConfigs();
  const [activeTask, setActiveTask] = useState<TaskName>('narrative');

  const onClose = () => setShowAiSettings(false);
  if (!isOpen) return null;

  const config = taskConfigs[activeTask];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#1a0f0f] border-4 border-double border-gold rounded-lg w-full max-w-2xl shadow-[0_0_50px_rgba(212,175,55,0.3)] overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-gold/30 flex items-center justify-between bg-velvet-red/20">
          <h3 className="font-display text-2xl text-gold"><i className="fa-solid fa-cog mr-2"></i>AI 设置</h3>
          <button onClick={onClose} className="text-gold/60 hover:text-gold"><i className="fa-solid fa-times text-xl"></i></button>
        </div>
        <div className="p-6 space-y-5 bg-[#0f0303] max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <label className="p-3 border rounded cursor-pointer">
              <input type="radio" checked={provider === 'gemini'} onChange={() => setProvider('gemini')} className="mr-2"/>Gemini
            </label>
            <label className="p-3 border rounded cursor-pointer">
              <input type="radio" checked={provider === 'openai'} onChange={() => setProvider('openai')} className="mr-2"/>OpenAI
            </label>
          </div>
          {provider === 'gemini' ? (
            <input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="Gemini API Key" className="w-full px-3 py-2 bg-brown-800/40 border" />
          ) : (
            <div className="grid gap-2">
              <input type="text" value={openaiConfig.baseUrl} onChange={(e) => setOpenaiConfig((prev) => ({ ...prev, baseUrl: e.target.value }))} placeholder="Base URL" className="w-full px-3 py-2 bg-brown-800/40 border" />
              <input type="password" value={openaiConfig.apiKey} onChange={(e) => setOpenaiConfig((prev) => ({ ...prev, apiKey: e.target.value }))} placeholder="API Key" className="w-full px-3 py-2 bg-brown-800/40 border" />
              <input type="text" value={openaiConfig.model} onChange={(e) => setOpenaiConfig((prev) => ({ ...prev, model: e.target.value }))} placeholder="Model" className="w-full px-3 py-2 bg-brown-800/40 border" />
            </div>
          )}

          <div>
            <div className="flex gap-2 flex-wrap mb-3">
              {(Object.keys(TASK_LABELS) as TaskName[]).map((task) => (
                <button key={task} onClick={() => setActiveTask(task)} className={`px-3 py-1 border rounded ${activeTask === task ? 'border-gold text-gold' : 'border-brown-600 text-stone-gray'}`}>
                  {TASK_LABELS[task]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">Temperature
                <input type="number" step="0.05" value={config.temperature} onChange={(e) => updateTaskConfig(activeTask, { temperature: Number(e.target.value) })} className="w-full px-2 py-1 bg-brown-800/40 border" />
              </label>
              <label className="text-xs">Max Tokens
                <input type="number" value={config.maxOutputTokens} onChange={(e) => updateTaskConfig(activeTask, { maxOutputTokens: Number(e.target.value) })} className="w-full px-2 py-1 bg-brown-800/40 border" />
              </label>
              <label className="text-xs">Timeout(ms)
                <input type="number" value={config.timeoutMs} onChange={(e) => updateTaskConfig(activeTask, { timeoutMs: Number(e.target.value) })} className="w-full px-2 py-1 bg-brown-800/40 border" />
              </label>
              <label className="text-xs">重试次数
                <input type="number" value={config.maxRetries} onChange={(e) => updateTaskConfig(activeTask, { maxRetries: Number(e.target.value) })} className="w-full px-2 py-1 bg-brown-800/40 border" />
              </label>
            </div>
            <button onClick={resetTaskConfigs} className="mt-3 text-xs underline text-paper/70">恢复默认参数</button>
          </div>
        </div>
        <div className="p-4 bg-velvet-red/20 border-t border-gold/30 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gold text-black font-bold">保存设置</button>
        </div>
      </div>
    </div>
  );
};
