"use client";

import { useState } from "react";
import { Cpu, Save, SlidersHorizontal } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { checkOllama, saveConfig } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import type { Capability } from "@/types/colabbot";

const CAPABILITIES: Array<{ id: Capability; label: string; desc: string }> = [
  { id: "text/research", label: "Research", desc: "Web research and summarization" },
  { id: "text/writing", label: "Writing", desc: "Long-form content generation" },
  { id: "text/analysis", label: "Analysis", desc: "Structured document or data analysis" },
  { id: "code/generate", label: "Code Gen", desc: "Source code generation" },
  { id: "code/review", label: "Code Review", desc: "Review and feedback on code changes" },
  { id: "agentic/workflow", label: "Workflow", desc: "Multi-step task execution" },
];

export default function SettingsPage() {
  const { agentConfig, setAgentConfig } = useAppStore();

  const [agentName, setAgentName] = useState(agentConfig?.name ?? "");
  const [ollamaUrl, setOllamaUrl] = useState(agentConfig?.llmEndpoint ?? "http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState(agentConfig?.llmModel ?? "llama3");
  const [maxTasks, setMaxTasks] = useState(agentConfig?.maxConcurrentTasks ?? 2);
  const [caps, setCaps] = useState<Capability[]>(agentConfig?.capabilities ?? []);
  const [autoStart, setAutoStart] = useState(false);
  const [minimize, setMinimize] = useState(true);

  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);

  function toggleCap(id: Capability) {
    setCaps((prev) => (prev.includes(id) ? prev.filter((cap) => cap !== id) : [...prev, id]));
  }

  async function handleTestOllama() {
    setTesting(true);
    setOllamaOk(null);
    try {
      setOllamaOk(await checkOllama(ollamaUrl));
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
        name: agentName,
        llmProvider: "ollama" as const,
        llmEndpoint: ollamaUrl,
        llmModel: ollamaModel,
        capabilities: caps,
        maxConcurrentTasks: maxTasks,
      };

      await saveConfig(updated);
      setAgentConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Settings</p>
          <h1 className="page-title">Agent configuration</h1>
          <p className="page-copy mt-2 max-w-2xl">
            Alle lokalen Agent-Parameter in einer Seite: Identitaet, Modell-Endpunkt, zugelassene
            Capabilities und Laufzeitverhalten.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
        >
          <Save size={15} />
          {saving ? "Saving…" : saved ? "Saved" : "Save settings"}
        </button>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Section icon={<Cpu size={16} />} title="Identity">
            <Field label="Agent name">
              <input value={agentName} onChange={(event) => setAgentName(event.target.value)} className="input" maxLength={60} />
            </Field>
            <Field label="Agent ID">
              <input value={agentConfig?.agentId ?? ""} readOnly className="input font-mono text-xs opacity-60" />
            </Field>
            <Field label="Registry">
              <input value={agentConfig?.registryUrl ?? "https://registry.colabbot.com"} readOnly className="input font-mono text-xs opacity-60" />
            </Field>
          </Section>

          <Section icon={<Cpu size={16} />} title="Model runtime">
            <Field label="Ollama URL">
              <div className="flex gap-2">
                <input
                  value={ollamaUrl}
                  onChange={(event) => {
                    setOllamaUrl(event.target.value);
                    setOllamaOk(null);
                  }}
                  className="input flex-1 font-mono text-xs"
                />
                <button
                  onClick={handleTestOllama}
                  disabled={testing}
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  {testing ? "…" : "Test"}
                </button>
              </div>
              {ollamaOk === true && <p className="mt-2 text-xs text-brand">Connection successful</p>}
              {ollamaOk === false && <p className="mt-2 text-xs text-red-300">Endpoint not reachable</p>}
            </Field>
            <Field label="Model">
              <input value={ollamaModel} onChange={(event) => setOllamaModel(event.target.value)} className="input font-mono text-xs" />
            </Field>
          </Section>
        </div>

        <div className="space-y-4">
          <Section icon={<SlidersHorizontal size={16} />} title="Capabilities">
            <div className="grid gap-2">
              {CAPABILITIES.map((cap) => (
                <button
                  key={cap.id}
                  onClick={() => toggleCap(cap.id)}
                  className={cn(
                    "rounded-[1.25rem] border px-4 py-3 text-left transition",
                    caps.includes(cap.id)
                      ? "border-brand/30 bg-brand/10"
                      : "border-white/8 bg-black/10 hover:border-white/12 hover:bg-white/[0.04]"
                  )}
                >
                  <p className={caps.includes(cap.id) ? "text-sm font-medium text-white" : "text-sm font-medium text-gray-200"}>
                    {cap.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{cap.desc}</p>
                </button>
              ))}
            </div>
          </Section>

          <Section icon={<SlidersHorizontal size={16} />} title="Performance">
            <Field label={`Max concurrent tasks: ${maxTasks}`}>
              <input
                type="range"
                min={1}
                max={5}
                value={maxTasks}
                onChange={(event) => setMaxTasks(Number(event.target.value))}
                className="w-full accent-[var(--brand)]"
              />
            </Field>
            <Toggle label="Start automatically on login" checked={autoStart} onChange={setAutoStart} />
            <Toggle label="Minimize to tray on close" checked={minimize} onChange={setMinimize} />
          </Section>
        </div>
      </section>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">{icon}</div>
        <div>
          <p className="eyebrow mb-1">{title}</p>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-[1.25rem] border border-white/8 bg-black/10 px-4 py-3 text-left"
    >
      <span className="text-sm text-gray-300">{label}</span>
      <span className={cn(
        "relative h-6 w-11 rounded-full transition",
        checked ? "bg-brand" : "bg-white/10"
      )}>
        <span
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-white transition",
            checked ? "left-6" : "left-1"
          )}
        />
      </span>
    </button>
  );
}
