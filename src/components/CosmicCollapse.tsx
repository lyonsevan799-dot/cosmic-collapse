import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Engine, type HudState } from "@/game/engine";
import { LEVELS, OBJECTS, SKINS, UPGRADES, type UpgradeId } from "@/game/data";
import {
  claimMilestone, completeLevel, defaultSave, isLevelPlayable, loadSave, purchaseSkin, purchaseUpgrade,
  storageAvailable, upgradeCost, writeSave, type LevelResult, type RunStats, type SaveData,
} from "@/game/logic";
import { sfx } from "@/game/audio";
import { drawBlackHole } from "@/game/blackhole";

type Screen = "menu" | "levels" | "play" | "shop" | "hangar" | "settings" | "complete" | "gameComplete";
interface Confirm { title: string; body: string; yes: string; onYes: () => void; }

const TUTORIAL = [
  "Move with WASD or the arrow keys.",
  "Look for objects small enough to absorb — they glow with a ring.",
  "Nearby objects are pulled toward your event horizon.",
  "Every absorption increases your mass.",
  "Reach the target mass to complete the sector.",
];
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const fmt = (n: number) => n.toLocaleString("en-US");

export default function CosmicCollapse() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const saveRef = useRef(save);
  const [screen, setScreen] = useState<Screen>("menu");
  const screenRef = useRef(screen); screenRef.current = screen;
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused); pausedRef.current = paused;
  const [settingsFrom, setSettingsFrom] = useState<"menu" | "pause">("menu");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [hud, setHud] = useState<HudState>({ mass: 0, target: 1, time: 0, levelIndex: 0 });
  const [toasts, setToasts] = useState<{ id: number; msg: string; gem?: boolean }[]>([]);
  const [result, setResult] = useState<(LevelResult & { stats: RunStats; index: number }) | null>(null);
  const [tut, setTut] = useState<number | null>(null);
  const tutRef = useRef<{ step: number | null; since: number; flags: Set<string> }>({ step: null, since: 0, flags: new Set() });
  const levelRef = useRef(0);
  const toastId = useRef(0);

  const commit = useCallback((s: SaveData) => { saveRef.current = s; setSave(s); writeSave(s); }, []);
  const toast = useCallback((msg: string, gem = false) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, msg, gem }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  // engine lifecycle
  useEffect(() => {
    const e = new Engine(canvasRef.current!, {
      onHud: setHud,
      onPauseRequest: () => { if (!pausedRef.current) doPause(); else if (screenRef.current === "play") doResume(); },
      onBlur: () => doPause(),
      onToast: (m) => toast(m),
      onTutorial: (ev) => { tutRef.current.flags.add(ev); },
      onMass: (m) => {
        let s = saveRef.current; let r;
        while ((r = claimMilestone(s, m))) { s = r.save; toast(`Mass milestone ${fmt(r.milestone)} · +${r.gems} gems`, true); sfx.milestone(); }
        if (s !== saveRef.current) commit(s);
      },
      onComplete: (stats) => {
        const idx = levelRef.current;
        const res = completeLevel(saveRef.current, idx, stats);
        commit(res.save);
        setResult({ ...res, stats, index: idx });
        sfx.gem();
        setScreen("complete");
      },
    });
    engineRef.current = e;
    sfx.music(true);
    const unlock = () => sfx.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => { e.destroy(); window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setConfig({ upgrades: save.upgrades, skin: save.skin, settings: save.settings });
    sfx.set(save.settings);
  }, [save]);

  // tutorial driver
  useEffect(() => {
    const id = setInterval(() => {
      const T = tutRef.current; if (T.step === null || pausedRef.current) return;
      const el = (performance.now() - T.since) / 1000;
      const need = [() => T.flags.has("moved"), () => el > 2.5 && T.flags.has("pulled"), () => el > 2 && T.flags.has("absorbed"), () => el > 3, () => el > 4][T.step];
      if (need()) advanceTut();
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setTutStep = (s: number | null) => {
    tutRef.current.step = s; tutRef.current.since = performance.now(); setTut(s);
    if (engineRef.current) engineRef.current.highlight = s === 1;
  };
  const advanceTut = () => {
    const s = tutRef.current.step; if (s === null) return;
    if (s >= TUTORIAL.length - 1) { endTut(); return; }
    setTutStep(s + 1);
  };
  const endTut = () => { setTutStep(null); if (!saveRef.current.tutorialDone) commit({ ...saveRef.current, tutorialDone: true }); };

  const click = () => sfx.click();
  const doPause = () => { if (screenRef.current !== "play") return; engineRef.current?.pause(); setPaused(true); };
  const doResume = () => { engineRef.current?.resume(); setPaused(false); };

  const startLevel = (i: number) => {
    if (!isLevelPlayable(saveRef.current, i)) { sfx.error(); return; }
    levelRef.current = i; setResult(null); setPaused(false); setConfirm(null);
    engineRef.current?.startLevel(i);
    tutRef.current.flags = new Set();
    setTutStep(i === 0 && !saveRef.current.tutorialDone ? 0 : null);
    setScreen("play");
  };
  const toMenu = () => { engineRef.current?.startDemo(); setPaused(false); setTutStep(null); setConfirm(null); setScreen("menu"); };

  const restart = () => {
    const lvl = LEVELS[levelRef.current];
    if (hud.mass > lvl.startMass + 5) {
      setConfirm({ title: "Restart level?", body: "Your current mass in this level will be lost. Upgrades, gems and unlocks are kept.", yes: "Restart", onYes: () => startLevel(levelRef.current) });
    } else startLevel(levelRef.current);
  };

  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const lvl = LEVELS[screen === "play" || screen === "complete" ? levelRef.current : 0];
  const progress = Math.min(1, Math.max(0, (hud.mass - lvl.startMass) / (hud.target - lvl.startMass)));
  const hasProgress = save.highestUnlocked > 0 || save.completed.length > 0;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="absolute inset-0 block" aria-label="Game view" />

      {/* toasts */}
      <div className="pointer-events-none absolute left-1/2 top-24 z-40 flex -translate-x-1/2 flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className="cc-toast cc-panel px-4 py-2 text-center text-sm font-semibold">
            {t.gem && <span className="cc-gem">◆ </span>}{t.msg}
          </div>
        ))}
      </div>

      {screen === "menu" && (
        <MainMenu
          gems={save.gems} hasProgress={hasProgress} continueLevel={save.highestUnlocked}
          onPlay={() => { click(); startLevel(0); }}
          onContinue={() => { click(); startLevel(save.highestUnlocked); }}
          onNav={(s) => { click(); if (s === "settings") setSettingsFrom("menu"); setScreen(s); }}
        />
      )}

      {screen === "levels" && <LevelSelect save={save} onBack={() => { click(); setScreen("menu"); }} onPlay={(i) => { click(); startLevel(i); }} />}
      {screen === "shop" && <Shop save={save} onBack={() => { click(); setScreen("menu"); }} onBuy={(id) => {
        const n = purchaseUpgrade(saveRef.current, id);
        if (n) { commit(n); sfx.purchase(); } else sfx.error();
      }} />}
      {screen === "hangar" && <Hangar save={save} onBack={() => { click(); setScreen("menu"); }}
        onBuy={(id) => { const n = purchaseSkin(saveRef.current, id); if (n) { commit(n); sfx.purchase(); } else sfx.error(); }}
        onEquip={(id) => { if (saveRef.current.skinsOwned.includes(id)) { commit({ ...saveRef.current, skin: id }); click(); } }} />}
      {screen === "settings" && (
        <SettingsScreen save={save} onChange={(st) => commit({ ...saveRef.current, settings: st })}
          onBack={() => { click(); setScreen(settingsFrom === "pause" ? "play" : "menu"); }}
          onReset={() => setConfirm({ title: "Reset all progress?", body: "This deletes your levels, gems, upgrades and skins. This cannot be undone.", yes: "Reset everything", onYes: () => { const d = defaultSave(); d.settings = saveRef.current.settings; commit(d); toast("Progress reset"); } })} />
      )}

      {screen === "play" && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3 sm:p-4">
            <div className="cc-panel pointer-events-auto px-3 py-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Sector {lvl.sector} · {lvl.sectorName}</div>
              <div className="font-display text-sm font-semibold sm:text-base">{lvl.id}. {lvl.name}</div>
            </div>
            <div className={`cc-panel order-3 w-full px-3 py-2 sm:order-none sm:w-auto sm:min-w-[320px] ${tut === 4 ? "cc-highlight" : ""}`}>
              <div className="mb-1 flex items-baseline justify-between gap-4 text-xs">
                <span className="text-muted-foreground">Mass</span>
                <span className="font-display text-sm"><span className="text-primary">{fmt(hud.mass)}</span> <span className="text-muted-foreground">/ {fmt(hud.target)}</span></span>
              </div>
              <div className="cc-progress-track"><div className="cc-progress-fill" style={{ width: `${progress * 100}%` }} /></div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{fmtTime(hud.time)}</span>{progress >= 0.85 && progress < 1 && <span className="text-accent">Almost there!</span>}</div>
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <span className="cc-chip"><span className="cc-gem">◆</span>{fmt(save.gems)}</span>
              <button className="cc-btn cc-icon-btn" aria-label={save.settings.audio ? "Mute sound" : "Unmute sound"} onClick={() => commit({ ...saveRef.current, settings: { ...saveRef.current.settings, audio: !saveRef.current.settings.audio } })}>
                {save.settings.audio ? "♪" : "✕"}
              </button>
              <button className="cc-btn cc-icon-btn" aria-label="Pause" onClick={() => { click(); doPause(); }}>❚❚</button>
            </div>
          </div>

          {tut !== null && !paused && (
            <div className="absolute inset-x-0 bottom-36 z-20 flex justify-center px-4 sm:bottom-10">
              <div className="cc-panel cc-screen flex max-w-md items-center gap-3 px-4 py-3" key={tut}>
                <span className="font-display text-xs text-primary">{tut + 1}/5</span>
                <p className="text-sm">{tut === 0 && coarse ? "Move with the joystick." : TUTORIAL[tut]}</p>
                <button className="cc-btn cc-btn-ghost px-3 py-1 text-xs" onClick={endTut}>Skip</button>
              </div>
            </div>
          )}

          {coarse && !paused && <Joystick onMove={(x, y) => engineRef.current?.setJoystick(x, y)} />}

          {paused && !confirm && (
            <Overlay>
              <h2 className="cc-title mb-1 text-3xl">Paused</h2>
              <p className="mb-6 text-sm text-muted-foreground">{lvl.name} · {fmt(hud.mass)} mass</p>
              <div className="flex w-full flex-col gap-2">
                <button className="cc-btn cc-btn-primary" onClick={() => { click(); doResume(); }} autoFocus>Resume</button>
                <button className="cc-btn" onClick={() => { click(); restart(); }}>Restart Level</button>
                <button className="cc-btn" onClick={() => { click(); setSettingsFrom("pause"); setScreen("settings"); }}>Settings</button>
                <button className="cc-btn cc-btn-ghost" onClick={() => { click(); setConfirm({ title: "Return to main menu?", body: "Progress in this level will be lost.", yes: "Main Menu", onYes: toMenu }); }}>Main Menu</button>
              </div>
            </Overlay>
          )}
        </>
      )}

      {screen === "complete" && result && (
        <Overlay wide>
          <div className="text-xs uppercase tracking-widest text-primary">Sector {LEVELS[result.index].sector} · Level {result.index + 1} complete</div>
          <h2 className="cc-title mb-4 mt-1 text-3xl sm:text-4xl">{LEVELS[result.index].name}</h2>
          <div className="mb-4 grid w-full grid-cols-2 gap-2">
            <Stat label="Final mass" value={fmt(result.stats.mass)} />
            <Stat label="Time" value={fmtTime(result.stats.time)} />
          </div>
          <div className="mb-3 w-full space-y-1 text-left text-sm">
            {result.objectivesDone.map((o) => (
              <div key={o.label} className="flex items-center gap-2">
                <span className={o.done ? "text-success" : "text-muted-foreground"}>{o.done ? "✓" : "○"}</span>
                <span className={o.done ? "" : "text-muted-foreground"}>{o.label}</span>
                {o.done && !o.isNew && <span className="text-xs text-muted-foreground">(already claimed)</span>}
              </div>
            ))}
          </div>
          <div className="mb-5 w-full rounded-xl border border-border p-3 text-sm">
            {result.lines.map((l) => <div key={l.label} className="flex justify-between"><span>{l.label}</span><span className="cc-gem">+{l.gems} ◆</span></div>)}
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold"><span>Cosmic Gems earned</span><span className="cc-gem">+{result.total} ◆</span></div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <button className="cc-btn cc-btn-primary flex-1" autoFocus onClick={() => { click(); if (result.index >= LEVELS.length - 1) setScreen("gameComplete"); else startLevel(result.index + 1); }}>
              {result.index >= LEVELS.length - 1 ? "Continue" : "Next Level"}
            </button>
            <button className="cc-btn flex-1" onClick={() => { click(); startLevel(result.index); }}>Replay</button>
            <button className="cc-btn cc-btn-ghost flex-1" onClick={() => { click(); toMenu(); }}>Main Menu</button>
          </div>
        </Overlay>
      )}

      {screen === "gameComplete" && (
        <Overlay wide>
          <div className="text-xs uppercase tracking-widest text-gold">Campaign complete</div>
          <h2 className="cc-title my-2 text-4xl">Singularity Achieved</h2>
          <p className="mb-4 text-sm text-muted-foreground">You consumed the heart of the galaxy. The <b className="text-foreground">Galactic Crown</b> skin is now yours in the Hangar.</p>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <button className="cc-btn cc-btn-primary flex-1" onClick={() => { click(); engineRef.current?.startDemo(); setScreen("hangar"); }}>Open Hangar</button>
            <button className="cc-btn flex-1" onClick={() => { click(); engineRef.current?.startDemo(); setScreen("levels"); }}>Level Select</button>
            <button className="cc-btn cc-btn-ghost flex-1" onClick={() => { click(); toMenu(); }}>Main Menu</button>
          </div>
        </Overlay>
      )}

      {confirm && (
        <Overlay z="z-50">
          <h2 className="font-display mb-2 text-xl font-semibold">{confirm.title}</h2>
          <p className="mb-6 text-sm text-muted-foreground">{confirm.body}</p>
          <div className="flex w-full gap-2">
            <button className="cc-btn flex-1" autoFocus onClick={() => { click(); setConfirm(null); }}>Cancel</button>
            <button className="cc-btn cc-btn-danger flex-1" onClick={() => { click(); const f = confirm.onYes; setConfirm(null); f(); }}>{confirm.yes}</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, wide, z = "z-30" }: { children: ReactNode; wide?: boolean; z?: string }) {
  return (
    <div className={`absolute inset-0 ${z} flex items-center justify-center bg-background/60 p-4`}>
      <div className={`cc-panel cc-screen flex max-h-full w-full flex-col items-center overflow-y-auto p-6 text-center ${wide ? "max-w-lg" : "max-w-sm"}`}>{children}</div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border p-3"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="font-display text-xl">{value}</div></div>;
}
function Page({ title, onBack, gems, children }: { title: string; onBack: () => void; gems?: number; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-background/70" style={{ touchAction: "pan-y" }}>
      <div className="cc-screen mx-auto max-w-5xl p-4 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button className="cc-btn" onClick={onBack}>← Back</button>
          <h2 className="cc-title text-2xl sm:text-3xl">{title}</h2>
          {gems !== undefined ? <span className="cc-chip"><span className="cc-gem">◆</span>{fmt(gems)}</span> : <span className="w-16" />}
        </div>
        {children}
      </div>
    </div>
  );
}

function MainMenu({ gems, hasProgress, continueLevel, onPlay, onContinue, onNav }: { gems: number; hasProgress: boolean; continueLevel: number; onPlay: () => void; onContinue: () => void; onNav: (s: Screen) => void }) {
  return (
    <div className="cc-screen absolute inset-0 z-20 flex flex-col items-center justify-between p-6 sm:p-10">
      <div className="flex w-full justify-end"><span className="cc-chip"><span className="cc-gem">◆</span>{fmt(gems)} Cosmic Gems</span></div>
      <div className="text-center">
        <h1 className="cc-title text-5xl leading-none sm:text-7xl md:text-8xl">COSMIC<br />COLLAPSE</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">Begin as a speck. End as a singularity.</p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-2">
        {hasProgress && <button className="cc-btn cc-btn-primary py-4 text-base" onClick={onContinue}>Continue · Level {continueLevel + 1}</button>}
        <button className={`cc-btn py-4 text-base ${hasProgress ? "" : "cc-btn-primary"}`} onClick={onPlay}>Play Campaign</button>
        <div className="grid grid-cols-2 gap-2">
          <button className="cc-btn" onClick={() => onNav("levels")}>Level Select</button>
          <button className="cc-btn" onClick={() => onNav("shop")}>Upgrades</button>
          <button className="cc-btn" onClick={() => onNav("hangar")}>Hangar</button>
          <button className="cc-btn" onClick={() => onNav("settings")}>Settings</button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">WASD / arrows to move · Esc to pause · touch joystick on mobile</p>
      </div>
    </div>
  );
}

function LevelSelect({ save, onBack, onPlay }: { save: SaveData; onBack: () => void; onPlay: (i: number) => void }) {
  const sectors = [1, 2, 3, 4, 5];
  return (
    <Page title="Campaign" onBack={onBack} gems={save.gems}>
      <div className="space-y-6">
        {sectors.map((s) => (
          <div key={s}>
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Sector {s} · {LEVELS.find((l) => l.sector === s)!.sectorName}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {LEVELS.map((l, i) => ({ l, i })).filter(({ l }) => l.sector === s).map(({ l, i }) => {
                const unlocked = isLevelPlayable(save, i); const done = save.completed.includes(i); const best = save.bestTimes[String(i)];
                return (
                  <button key={l.id} disabled={!unlocked} onClick={() => unlocked && onPlay(i)} aria-label={`${l.name}${unlocked ? "" : " (locked)"}`}
                    className="cc-panel cc-btn flex-col items-start gap-1 p-4 text-left">
                    <div className="flex w-full items-center justify-between">
                      <span className="font-display text-xs text-primary">LEVEL {l.id}</span>
                      <span className="text-xs">{!unlocked ? "🔒 Locked" : done ? <span className="text-success">✓ Complete</span> : <span className="text-accent">● New</span>}</span>
                    </div>
                    <div className="font-display text-lg">{l.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">{l.theme}</div>
                    <div className="mt-1 flex w-full justify-between text-xs font-normal text-muted-foreground">
                      <span>Target {fmt(l.target)} mass</span>
                      <span>{best ? `Best ${fmtTime(best)}` : `◆ ${l.reward}`}</span>
                    </div>
                    <div className="text-[11px] font-normal text-muted-foreground">Objectives {l.objectives.filter((o) => save.objectives.includes(o.id)).length}/{l.objectives.length}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function Shop({ save, onBack, onBuy }: { save: SaveData; onBack: () => void; onBuy: (id: UpgradeId) => void }) {
  const eff = (id: UpgradeId, tier: number) => { const u = UPGRADES.find((x) => x.id === id)!; return `+${Math.round(u.per * tier * 100)}%`; };
  return (
    <Page title="Upgrades" onBack={onBack} gems={save.gems}>
      <div className="grid gap-4 sm:grid-cols-2">
        {UPGRADES.map((u) => {
          const tier = save.upgrades[u.id]; const cost = upgradeCost(save, u.id); const maxed = cost === null;
          return (
            <div key={u.id} className="cc-panel p-5">
              <div className="flex items-center justify-between"><h3 className="font-display text-lg">{u.name}</h3><span className="text-xs text-muted-foreground">Level {tier}/{u.costs.length}</span></div>
              <p className="mt-1 text-sm text-muted-foreground">{u.desc}</p>
              <div className="my-3 flex gap-1">{u.costs.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i < tier ? "bg-primary" : "bg-muted"}`} />)}</div>
              <div className="mb-3 text-sm">Current <b>{eff(u.id, tier)}</b>{!maxed && <> → Next <b className="text-primary">{eff(u.id, tier + 1)}</b></>}</div>
              <button className={`cc-btn w-full ${maxed ? "" : "cc-btn-primary"}`} disabled={maxed || save.gems < (cost ?? 0)} onClick={() => onBuy(u.id)}>
                {maxed ? "Maxed out" : <>Buy · <span>◆ {cost}</span></>}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">Earn Cosmic Gems by clearing levels, completing objectives, reaching mass milestones and absorbing Void Relics.</p>
    </Page>
  );
}

function SkinPreview({ skinId, size }: { skinId: string; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr; c.height = size * dpr;
    const ctx = c.getContext("2d")!; const skin = SKINS.find((s) => s.id === skinId)!;
    let raf = 0; const t0 = performance.now();
    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
      drawBlackHole(ctx, size / 2, size / 2, size * 0.14, (now - t0) / 1000, skin, false);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [skinId, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-label="Skin preview" />;
}

function Hangar({ save, onBack, onBuy, onEquip }: { save: SaveData; onBack: () => void; onBuy: (id: string) => void; onEquip: (id: string) => void }) {
  const [sel, setSel] = useState(save.skin);
  const skin = SKINS.find((s) => s.id === sel)!;
  const owned = save.skinsOwned.includes(sel); const equipped = save.skin === sel;
  return (
    <Page title="Hangar" onBack={onBack} gems={save.gems}>
      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <div className="cc-panel flex flex-col items-center p-4">
          <SkinPreview skinId={sel} size={280} />
          <h3 className="font-display text-xl">{skin.name}</h3>
          <p className="mb-3 text-xs text-muted-foreground">{equipped ? "Equipped" : owned ? "Unlocked" : skin.unlock === "campaign" ? "Unlock by completing the campaign" : `Locked · ◆ ${skin.price}`}</p>
          {owned ? (
            <button className="cc-btn cc-btn-primary w-full" disabled={equipped} onClick={() => onEquip(sel)}>{equipped ? "Equipped" : "Equip"}</button>
          ) : skin.unlock === "gems" ? (
            <button className="cc-btn cc-btn-accent w-full" disabled={save.gems < skin.price} onClick={() => onBuy(sel)}>Buy · ◆ {skin.price}</button>
          ) : <button className="cc-btn w-full" disabled>Campaign reward</button>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          {SKINS.map((s) => {
            const o = save.skinsOwned.includes(s.id);
            return (
              <button key={s.id} onClick={() => setSel(s.id)} className={`cc-panel cc-btn flex-col items-start gap-2 p-3 text-left ${sel === s.id ? "border-primary" : ""}`}>
                <div className="h-6 w-full rounded-md" style={{ background: `linear-gradient(90deg, ${s.hot}, ${s.mid}, ${s.outer})` }} />
                <span className="text-sm">{s.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{save.skin === s.id ? "★ Equipped" : o ? "✓ Owned" : s.unlock === "campaign" ? "🔒 Campaign" : `🔒 ◆ ${s.price}`}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Page>
  );
}

function SettingsScreen({ save, onChange, onBack, onReset }: { save: SaveData; onChange: (s: SaveData["settings"]) => void; onBack: () => void; onReset: () => void }) {
  const s = save.settings;
  const Toggle = ({ label, k, hint }: { label: string; k: "audio" | "shake" | "reduced"; hint?: string }) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span><span className="block text-sm font-semibold">{label}</span>{hint && <span className="text-xs text-muted-foreground">{hint}</span>}</span>
      <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={s[k]} onChange={(e) => onChange({ ...s, [k]: e.target.checked })} />
    </label>
  );
  const Slider = ({ label, k }: { label: string; k: "sfx" | "music" }) => (
    <label className="block py-3">
      <span className="mb-1 flex justify-between text-sm font-semibold"><span>{label}</span><span className="text-muted-foreground">{Math.round(s[k] * 100)}%</span></span>
      <input type="range" min={0} max={1} step={0.05} value={s[k]} className="cc-range" disabled={!s.audio} onChange={(e) => onChange({ ...s, [k]: Number(e.target.value) })} />
    </label>
  );
  return (
    <Page title="Settings" onBack={onBack}>
      <div className="cc-panel mx-auto max-w-lg divide-y divide-border px-5">
        <Toggle label="Sound" k="audio" />
        <Slider label="Sound effects" k="sfx" />
        <Slider label="Ambient music" k="music" />
        <Toggle label="Screen shake" k="shake" />
        <Toggle label="Reduced effects" k="reduced" hint="Fewer particles and softer flashes" />
        <div className="py-4">
          <button className="cc-btn cc-btn-danger w-full" onClick={onReset}>Reset saved progress</button>
          {!storageAvailable && <p className="mt-2 text-xs text-destructive">Your browser is blocking local storage, so progress will only last for this session.</p>}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Progress is saved in this browser only. No account needed.</p>
      <div className="mx-auto mt-4 max-w-lg text-xs text-muted-foreground">
        <div className="mb-1 font-semibold text-foreground">Absorption guide</div>
        {Object.values(OBJECTS).map((o) => <div key={o.type} className="flex justify-between"><span>{o.name}</span><span>needs {fmt(o.minMass)} mass</span></div>)}
      </div>
    </Page>
  );
}

function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const center = useRef({ x: 0, y: 0 }); const active = useRef<number | null>(null);
  const R = 50;
  const update = (e: React.PointerEvent) => {
    let dx = e.clientX - center.current.x, dy = e.clientY - center.current.y;
    const d = Math.hypot(dx, dy); if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setKnob({ x: dx, y: dy }); onMove(dx / R, dy / R);
  };
  const end = () => { active.current = null; setKnob({ x: 0, y: 0 }); onMove(0, 0); };
  useEffect(() => () => onMove(0, 0), [onMove]);
  return (
    <div className="cc-joy-base absolute bottom-8 left-8 z-20 flex h-32 w-32 items-center justify-center" style={{ touchAction: "none" }}
      onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; active.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); update(e); }}
      onPointerMove={(e) => { if (active.current === e.pointerId) update(e); }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <div className="cc-joy-knob h-14 w-14" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
