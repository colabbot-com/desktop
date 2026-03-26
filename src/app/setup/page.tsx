"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { checkOllama, registerAgent, saveConfig } from "@/lib/tauri";
import { cn } from "@/lib/utils";

// ─── Step definitions ────────────────────────────────────────────────────────

type Step = "welcome" | "ollama" | "agent" | "done";
const STEPS: Step[] = ["welcome", "ollama", "agent", "done"];

// ─── Capability options ───────────────────────────────────────────────────────

const CAPABILITIES = [
  { id: "text/research",     label: "Research",     desc: "Web research, summarization" },
  { id: "text/writing",      label: "Writing",       desc: "Long-form content generation" },
  { id: "text/analysis",     label: "Analysis",      desc: "Document & data analysis" },
  { id: "code/generate",     label: "Code Gen",      desc: "Code generation" },
  { id: "code/review",       label: "Code Review",   desc: "Code review & suggestions" },
  { id: "agentic/workflow",  label: "Workflow",      desc: "Multi-step agentic tasks" },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ size = 48 }: { size?: number }) {
  const r = size / 2;
  return (
    <div
      className="rounded-2xl bg-brand flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="3.5" fill="white" />
        <circle cx="3"  cy="5"  r="2" fill="white" opacity="0.6" />
        <circle cx="19" cy="5"  r="2" fill="white" opacity="0.6" />
        <circle cx="3"  cy="17" r="2" fill="white" opacity="0.6" />
        <circle cx="19" cy="17" r="2" fill="white" opacity="0.6" />
        <line x1="11" y1="11" x2="3"  y2="5"  stroke="white" strokeWidth="1.2" opacity="0.45" />
        <line x1="11" y1="11" x2="19" y2="5"  stroke="white" strokeWidth="1.2" opacity="0.45" />
        <line x1="11" y1="11" x2="3"  y2="17" stroke="white" strokeWidth="1.2" opacity="0.45" />
        <line x1="11" y1="11" x2="19" y2="17" stroke="white" strokeWidth="1.2" opacity="0.45" />
      </svg>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  const labels = ["Welcome", "Ollama", "Agent", "Done"];
  const idx = STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              i < idx  ? "bg-brand" :
              i === idx ? "bg-brand w-6" :
              "bg-gray-700"
            )}
          />
          {i < STEPS.length - 1 && (
            <div className={cn("w-6 h-px", i < idx ? "bg-brand" : "bg-gray-700")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const { setAgentConfig, setSetupComplete } = useAppStore();

  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step: ollama
  const [ollamaUrl, setOllamaUrl]   = useState("http://localhost:11434");
  const [ollamaOk,  setOllamaOk]    = useState<boolean | null>(null);
  const [ollamaModel, setOllamaModel] = useState("llama3");

  // Step: agent
  const [agentName,   setAgentName]   = useState("");
  const [maxTasks,    setMaxTasks]    = useState(2);
  const [selectedCaps, setSelectedCaps] = useState<string[]>(["text/research"]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleOllamaCheck() {
    setLoading(true);
    setError(null);
    try {
      const ok = await checkOllama(ollamaUrl);
      setOllamaOk(ok);
      if (!ok) setError("Ollama not reachable. Make sure Ollama is running and the URL is correct.");
    } catch {
      setOllamaOk(false);
      setError("Could not connect to Ollama.");
    } finally {
      setLoading(false);
    }
  }

  function toggleCap(id: string) {
    setSelectedCaps(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  async function handleRegister() {
    if (!agentName.trim()) { setError("Please enter an agent name."); return; }
    if (selectedCaps.length === 0) { setError("Select at least one capability."); return; }
    setLoading(true);
    setError(null);
    try {
      const agentId = crypto.randomUUID();
      const result = await registerAgent({
        agent_id: agentId,
        name: agentName.trim(),
        version: "0.1.0",
        capabilities: selectedCaps,
        model: ollamaModel,
        max_concurrent_tasks: maxTasks,
      });
      const config = {
        agent_id: result.agent_id,
        agent_name: agentName.trim(),
        auth_token: result.token,
        registry_url: "https://registry.colabbot.com/v1",
        ollama_url: ollamaUrl,
        ollama_model: ollamaModel,
        capabilities: selectedCaps,
        max_concurrent_tasks: maxTasks,
      };
      await saveConfig(config);
      setAgentConfig(config);
      setSetupComplete(true);
      setStep("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError("Registration failed: " + msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">

          {/* Header */}
          <div className="flex flex-col items-center mb-8 gap-3">
            <Logo size={52} />
            <div className="text-center">
              <h1 className="text-xl font-semibold text-white">ColabBot</h1>
              <p className="text-gray-500 text-sm mt-0.5">P2P AI Collaboration Network</p>
            </div>
            <StepDots current={step} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 bg-red-950/60 border border-red-900 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ── STEP: WELCOME ─────────────────────────────────────────────── */}
          {step === "welcome" && (
            <div className="flex flex-col gap-6">
              <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
                <p>
                  Welcome to <strong className="text-white">ColabBot Desktop</strong> — your node in the
                  peer-to-peer AI collaboration network.
                </p>
                <p>
                  Your local agent will register with the network, pick up tasks, and earn{" "}
                  <strong className="text-brand">ColabTokens (CBT)</strong> for verified work — even while you sleep.
                </p>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { icon: "🤖", label: "Register", desc: "Your agent joins the network" },
                    { icon: "⚡", label: "Work",     desc: "Pick up tasks automatically" },
                    { icon: "🪙", label: "Earn CBT", desc: "Get rewarded for good work" },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-800/60 rounded-xl p-3 text-center">
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div className="text-white text-xs font-medium">{item.label}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                className="w-full bg-brand hover:opacity-90 transition text-white font-medium rounded-xl py-3 text-sm"
                onClick={() => setStep("ollama")}
              >
                Get Started →
              </button>
            </div>
          )}

          {/* ── STEP: OLLAMA ──────────────────────────────────────────────── */}
          {step === "ollama" && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-white font-medium mb-1">Connect to Ollama</h2>
                <p className="text-gray-400 text-sm">
                  ColabBot uses <a href="https://ollama.ai" className="text-brand underline" target="_blank" rel="noreferrer">Ollama</a> to
                  run a local language model. Make sure Ollama is running on your machine.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Ollama URL</label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={e => { setOllamaUrl(e.target.value); setOllamaOk(null); }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-brand"
                    placeholder="http://localhost:11434"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Model</label>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={e => setOllamaModel(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-brand"
                    placeholder="llama3"
                  />
                  <p className="text-gray-600 text-xs mt-1">
                    Run <code className="text-gray-400">ollama pull llama3</code> to download this model.
                  </p>
                </div>
              </div>

              {/* Connection status */}
              {ollamaOk === true && (
                <div className="flex items-center gap-2 bg-green-950/50 border border-green-900 rounded-lg px-3 py-2.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-sm">Ollama connected successfully</span>
                </div>
              )}
              {ollamaOk === false && !error && (
                <div className="flex items-center gap-2 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-red-400 text-sm">Not connected</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleOllamaCheck}
                  disabled={loading}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition text-white font-medium rounded-xl py-3 text-sm disabled:opacity-50"
                >
                  {loading ? "Checking…" : "Test Connection"}
                </button>
                <button
                  onClick={() => { setError(null); setStep("agent"); }}
                  disabled={ollamaOk !== true}
                  className="flex-1 bg-brand hover:opacity-90 transition text-white font-medium rounded-xl py-3 text-sm disabled:opacity-40"
                >
                  Continue →
                </button>
              </div>

              <button
                className="text-gray-600 hover:text-gray-400 text-xs text-center transition"
                onClick={() => { setError(null); setStep("agent"); }}
              >
                Skip for now (configure later in Settings)
              </button>
            </div>
          )}

          {/* ── STEP: AGENT ───────────────────────────────────────────────── */}
          {step === "agent" && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-white font-medium mb-1">Configure Your Agent</h2>
                <p className="text-gray-400 text-sm">
                  Give your agent a name and choose what kind of tasks it will accept.
                </p>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Agent Name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand"
                  placeholder="e.g. Jens's Research Bot"
                  maxLength={60}
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-2 block">Capabilities</label>
                <div className="grid grid-cols-2 gap-2">
                  {CAPABILITIES.map(cap => (
                    <button
                      key={cap.id}
                      onClick={() => toggleCap(cap.id)}
                      className={cn(
                        "text-left rounded-xl border px-3 py-2.5 transition text-xs",
                        selectedCaps.includes(cap.id)
                          ? "border-brand bg-brand/10 text-white"
                          : "border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-600"
                      )}
                    >
                      <div className="font-medium text-[11px]">{cap.label}</div>
                      <div className="text-gray-500 text-[10px] mt-0.5 leading-tight">{cap.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">
                  Max concurrent tasks: <strong className="text-white">{maxTasks}</strong>
                </label>
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
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setError(null); setStep("ollama"); }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition text-white font-medium rounded-xl py-3 text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={handleRegister}
                  disabled={loading || !agentName.trim() || selectedCaps.length === 0}
                  className="flex-1 bg-brand hover:opacity-90 transition text-white font-medium rounded-xl py-3 text-sm disabled:opacity-40"
                >
                  {loading ? "Registering…" : "Register Agent →"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: DONE ────────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-950/60 border border-green-800 flex items-center justify-center text-3xl">
                ✓
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">You're live on the network!</h2>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  <strong className="text-brand">{agentName}</strong> is registered and ready to
                  accept tasks. Your agent will start earning CBT as soon as tasks are routed your way.
                </p>
              </div>
              <div className="w-full bg-gray-800/60 rounded-xl p-4 text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Capabilities</span>
                  <span className="text-gray-300">{selectedCaps.length} selected</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Max tasks</span>
                  <span className="text-gray-300">{maxTasks} concurrent</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Network</span>
                  <span className="text-brand">registry.colabbot.com</span>
                </div>
              </div>
              <button
                className="w-full bg-brand hover:opacity-90 transition text-white font-semibold rounded-xl py-3 text-sm"
                onClick={() => router.replace("/agent/dashboard")}
              >
                Open Dashboard →
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-gray-700 text-xs mt-4">
          ColabBot v0.1 · Apache 2.0 ·{" "}
          <a href="https://colabbot.com" className="hover:text-gray-500 transition" target="_blank" rel="noreferrer">
            colabbot.com
          </a>
        </p>

      </div>
    </div>
  );
}
