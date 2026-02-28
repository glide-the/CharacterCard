import React, { useMemo, useRef, useState } from 'react';
import { Phase } from '../types';
import {
  useEnginePack,
  useEnginePackError,
  useEnginePackStatus,
  useSetEnginePack,
  useSetEnginePackError,
  useSetEnginePackStatus,
  useSetPhase,
} from '../store';
import { loadEnginePackFromFile, loadEnginePackFromUrl, resolveEnginePackUrl } from '../services/enginePackRuntime';

function statusClass(status: 'idle' | 'loading' | 'ready' | 'error') {
  if (status === 'ready') return 'bg-green-900/30 text-green-200 border-green-600/60';
  if (status === 'loading') return 'bg-yellow-900/30 text-yellow-200 border-yellow-600/60';
  if (status === 'error') return 'bg-red-900/30 text-red-200 border-red-600/60';
  return 'bg-gray-900/40 text-gray-300 border-gray-600/60';
}

function statusLabel(status: 'idle' | 'loading' | 'ready' | 'error') {
  if (status === 'ready') return '已生效';
  if (status === 'loading') return '加载中';
  if (status === 'error') return '加载失败';
  return '未加载';
}

const DesignRequirementsConfigPage: React.FC = () => {
  const setPhase = useSetPhase();
  const enginePack = useEnginePack();
  const enginePackStatus = useEnginePackStatus();
  const enginePackError = useEnginePackError();
  const setEnginePack = useSetEnginePack();
  const setEnginePackStatus = useSetEnginePackStatus();
  const setEnginePackError = useSetEnginePackError();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [sourceUrl, setSourceUrl] = useState(resolveEnginePackUrl());
  const [message, setMessage] = useState<string | null>(null);

  const promptOverrideCount = useMemo(
    () => Object.values(enginePack?.promptOverrides || {}).filter(Boolean).length,
    [enginePack]
  );

  const runWithStatus = async (runner: () => Promise<void>) => {
    setMessage(null);
    setEnginePackError(null);
    setEnginePackStatus('loading');
    try {
      await runner();
    } catch (error) {
      setEnginePackError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    await runWithStatus(async () => {
      const payload = await loadEnginePackFromFile(file);
      setEnginePack(payload);
      setMessage(`上传成功：${payload.id}`);
    });
    event.target.value = '';
  };

  const handleLoadFromUrl = async () => {
    const trimmed = sourceUrl.trim();
    if (!trimmed) {
      setEnginePackError('请先填写可访问的配置 URL。');
      return;
    }
    await runWithStatus(async () => {
      const payload = await loadEnginePackFromUrl(trimmed);
      setEnginePack(payload);
      setMessage(`加载成功：${payload.id}`);
    });
  };

  const clearPack = () => {
    setEnginePack(null);
    setMessage('已清除当前引擎包，将回退到默认规则。');
  };

  return (
    <div className="min-h-screen w-full bg-[#0f0303] text-paper relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_20%,#000000_100%)] opacity-80"></div>
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-6 py-4 border-b border-brown-700 bg-[#1a0505]/80">
          <div>
            <h1 className="font-display text-2xl text-gold">Game Engine 配置</h1>
            <p className="text-xs font-serif text-paper/70">
              上传或拉取 game-engine-package 转换后的 `evaluation-pack.v1.json`
            </p>
          </div>
          <button
            onClick={() => setPhase(Phase.SELECTION)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gold text-gold bg-black/40 hover:bg-gold/10 transition-colors rounded-full font-display text-sm"
          >
            <i className="fa-solid fa-arrow-left"></i>
            返回主页
          </button>
        </header>

        <main className="flex-1 grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-6 p-6">
          <section className="bg-[#1a0b0b]/60 border border-brown-700 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)] space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-brown-600 bg-black/30 p-4">
              <div>
                <p className="text-xs text-paper/60">当前状态</p>
                <p className="font-display text-lg text-gold">{enginePack?.id || '未生效配置'}</p>
              </div>
              <span className={`text-xs border px-3 py-1 rounded-full ${statusClass(enginePackStatus)}`}>
                {statusLabel(enginePackStatus)}
              </span>
            </div>

            <div className="rounded-xl border border-brown-600 bg-black/30 p-4 space-y-3">
              <h2 className="font-display text-lg text-gold">1) 本地上传 JSON</h2>
              <p className="text-sm text-paper/70">
                选择转换模块产出的配置文件，上传后会立即写入运行时配置。
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg border border-gold text-gold hover:bg-gold/10 transition-colors text-sm font-display"
                >
                  <i className="fa-solid fa-upload mr-2"></i>
                  选择并上传
                </button>
                <span className="text-xs text-paper/60">{selectedFileName || '尚未选择文件'}</span>
              </div>
            </div>

            <div className="rounded-xl border border-brown-600 bg-black/30 p-4 space-y-3">
              <h2 className="font-display text-lg text-gold">2) 从 URL 拉取</h2>
              <p className="text-sm text-paper/70">
                可用于加载部署在静态目录或远程地址上的 `evaluation-pack.v1.json`。
              </p>
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="/engine-pack/evaluation-pack.v1.json"
                className="w-full px-3 py-2 rounded-lg border border-brown-500 bg-black/50 text-paper text-sm"
              />
              <button
                onClick={handleLoadFromUrl}
                className="px-4 py-2 rounded-lg border border-gold text-gold hover:bg-gold/10 transition-colors text-sm font-display"
              >
                <i className="fa-solid fa-cloud-arrow-down mr-2"></i>
                拉取配置
              </button>
            </div>
          </section>

          <section className="bg-[#1a0b0b]/60 border border-brown-700 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)] flex flex-col gap-4">
            <h2 className="font-display text-xl text-gold">配置详情</h2>

            {enginePack ? (
              <div className="space-y-3 rounded-xl border border-brown-600 bg-black/35 p-4 text-sm font-serif">
                <p>
                  <span className="text-paper/60">配置 ID：</span>
                  <span className="text-gold font-display ml-1">{enginePack.id}</span>
                </p>
                <p>
                  <span className="text-paper/60">来源：</span>
                  <span className="text-paper/95">{enginePack.sourceUrl}</span>
                </p>
                <p>
                  <span className="text-paper/60">规则数量：</span>
                  <span className="text-paper/95">{enginePack.rules.length}</span>
                </p>
                <p>
                  <span className="text-paper/60">Prompt 覆盖任务数：</span>
                  <span className="text-paper/95">{promptOverrideCount}</span>
                </p>
              </div>
            ) : (
              <div className="text-sm text-paper/60 rounded-xl border border-dashed border-brown-600 bg-black/25 p-4">
                当前未加载引擎包，游戏会使用默认 `INITIAL_RULES`。
              </div>
            )}

            {message && (
              <div className="rounded-lg border border-green-600/60 bg-green-900/20 p-3 text-sm text-green-200">{message}</div>
            )}
            {enginePackError && (
              <div className="rounded-lg border border-red-600/60 bg-red-900/20 p-3 text-sm text-red-200">{enginePackError}</div>
            )}

            <button
              onClick={clearPack}
              className="self-start px-4 py-2 rounded-lg border border-brown-500 text-paper/80 hover:text-paper hover:bg-brown-900/30 transition-colors text-sm"
            >
              <i className="fa-regular fa-trash-can mr-2"></i>
              清除当前配置
            </button>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DesignRequirementsConfigPage;
