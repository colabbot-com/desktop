"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { saveConfig, checkOllama } from "@/lib/tauri";
import { cn } from "@/lib/utils";

const CAPABILITIES = [
  { id: "text/research",    label: "Research",    desc: "Web research, summarization" },
  { id: "text/writing",     label: "Writing",     desc: "Long-form content generation" },
  { id: "text/analysis",    label: "Analysis",    desc: "Document & data analysis" },
  { id: "code/generate",    label: "Code Gen",    desc: "Code generation" },
  { id: "code/review",      label: "Code Review", desc: "Code review & suggestions" },
  { id: "agentic/workflow", label: "Workflow",    desc: "Multi-step agentic tasks" },
];

export default function SettingsPage() {
  const { agentConfig, setAgentConfig } = useAppStore();

  const [agentName,    setAgentName]    = useState(agentConfig?.agent_name   ?? "");
  const [ollamaUrl,    setOllamaUrl]    = useState(agentConfig?.ollama_url   ?? "http://localhost:11434");
  const [ollamaModel,  setOllamaModel]  = useState(agentConfig?.ollama_model ?? "llama3");
  const [maxTasks,     setMaxTasks]     = useState(agentConfig?.max_concurrent_tasks ?? 2);
  const [caps,         setCaps]         = useState<string[]>(agentConfig?.capabilities ?? []);
  const [autoStart,    setAutoStart]    = useState(false);
  const [minimize,     setMinimize]     = useState(true);

  const [ollamaOk,  setOllamaOk]  = useState<boolean | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [testing,   setTesting]   = useState(false);

  function toggleCap(id: string) {
    setCaps(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  async function handleTestOllama() {
    setTesting(true);
    setOllamaOk(null);
    try {
      const ok = await checkOllama(ollamaUrl);
      setOllamaOk(ok);
    } catch {
      setOllamaOk(false);
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!agentConfig) return;
    setSaving(true);
    try {
      const updated = {
        ...agentConfig,
        agent_name: agentName,
        ollama_url: ollamaUrl,
        ollama_model: ollamaModel,
        capabilities: caps,
        max_concurrent_tasks: maxTasks,
      };
      await saveConfig(updated);
      setAgentConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // handle
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-white text-xl font-semibold">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configure your agent and local preferences</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 pr-1">

        {/* Agent Identity */}
        <Section title="Agent Identity">
          <Field label="Agent Name">
            <input
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              className="input"
              maxLength={60}
            />
          </Field>
          <Field label="Agent ID">
            <input
              value={agentConfig?.agent_id ?? ""}
              readOnly
              className="input opacity-50 font-mono text-xs"
            />
          </Field>
          <Field label="Registry">
            <input
              value={agentConfig?.registry_url ?? "https://registry.colabbot.com/v1"}
              readOnly
              className="input opacity-50 font-mono text-xs"
            />
          </Field>
        </Section>

        {/* Ollama */}
        <Section title="Ollama">
          <Field label="Ollama URL">
            <div className="flex gap-2">
              <input
                value={ollamaUrl}
                onChange={e => { setOllamaUrl(e.target.value); setOllamaOk(null); }}
                className="input flex-1 font-mono text-xs"
              />
              <button
                onClick={handleTestOllama}
                disabled={testing}
                className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white text-xs px-3 rounded-lg transition disabled:opacity-50"
              >
                {testing ? "…" : ollamaOk === true ? "✓" : ollamaOk === false ? "✗" : "Test"}
              </button>
            </div>
            {ollamaOk === true  && <p className="text-green-400 text-xs mt-1">Connected</p>}
            {ollamaOk === false && <p className="text-red-400  text-xs mt-1">Not reachable</p>}
          </Field>
          <Field label="Model">
            <input
              value={ollamaModel}
              onChange={e => setOllamaModel(e.target.value)}
              className="input font-mono text-xs"
              placeholder="llama3"
            />
          </Field>
        </Section>

        {/* Capabilities */}
        <Section title="Capabilities">
          <div className="grid grid-cols-2 gap-2">
            {CAPABILITIES.map(cap => (
              <button
                key={cap.id}
                onClick={() => toggleCap(cap.id)}
                className={cn(
                  "text-left rounded-xl border px-3 py-2.5 transition text-xs",
                  caps.includes(cap.id)
                    ? "border-brand bg-brand/10 text-white"
                    : "border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-600"
                )}
              >
                <div className="font-medium text-[11px]">{cap.label}</div>
                <div className="text-gray-500 text-[10px] mt-0.5 leading-tight">{cap.desc}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* Performance */}
        <Section title="Performance">
          <Field label={`Max concurrent tasks: ${maxTasks}`}>
            <input
              type="range"
              min={1}
              max={5}
              value={maxTasks}
              onChange={e => setMaxTasks(Number(e.target.value))}
              className="w-full accent-brand"
            />
            <div className="flex justify-between text-gray-600 text-[10px] mt-1">
              <span>1 (conservative)</span>
              <span>5 (aggressive)</span>
            </div>
          </Field>
        </Section>

        {/* App Preferences */}
        <Section title="App Preferences">
          <Toggle
            label="Start automatically on login"
            checked={autoStart}
            onChange={setAutoStart}
          />
          <Toggle
            label="Minimize to system tray on close"
            checked={minimize}
            onChange={setMinimize}
          />
        </Section>

        {/* About */}
        <Section title="About">
          <div className="text-gray-500 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="font-mono text-gray-400">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span>Protocol</span>
              <span className="font-mono text-gray-400">v0.2</span>
            </div>
            <div className="flex justify-between">
              <span>License</span>
              <span className="font-mono text-gray-400">Apache 2.0</span>
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <a href="https://colabbot.com"           target="_blank" rel="noreferrer" className="text-brand text-xs hover:underline">Website</a>
            <a href="https://github.com/colabbot-com" target="_blank" rel="noreferrer" className="text-brand text-xs hover:underline">GitHub</a>
            <a href="https://colabbot.com/docs"       target="_blank" rel="noreferrer" className="text-brand text-xs hover:underline">Docs</a>
          </div>
        </Section>

      </div>

      {/* Save bar */}
      <div className="pt-4 border-t border-gray-800 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-brand hover:opacity-90 transition text-white font-medium rounded-xl py-3 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// ─── Utility components ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-gray-500 text-xs mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-xs">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors",
          checked ? "bg-brand" : "bg-gray-700"
        )}
      >
        <span className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}
