/*
 * Ducted HVAC Card (FR)
 * Carte Home Assistant pour climatisation / pompe à chaleur gainable (ex. Atlantic) :
 * schéma animé, température, consigne, modes, ventilation, préréglages et capteurs de soufflage/reprise.
 * Style verre, thème clair/sombre automatique, éditeur visuel. Fonctionne avec toute entité « climate ».
 */

const CARD_VERSION = "1.0.0";

const DEFAULTS = {
  name: "",
  theme: "auto", // auto | light | dark
  info_entities: [],
  return_entity: "",
  return_name: "Reprise",
  duct_1: "", duct_2: "", duct_3: "", duct_4: "", duct_5: "",
  duct_1_name: "", duct_2_name: "", duct_3_name: "", duct_4_name: "", duct_5_name: "",
  temp_step: 0, // 0 = automatique (target_temp_step, sinon 0,5)
  show_controls: true,
  show_modes: true,
  show_fan: true,
  show_presets: true,
};

const MODES = {
  off: { label: "Arrêt", icon: "mdi:power", color: "off" },
  heat: { label: "Chauffage", icon: "mdi:fire", color: "heat" },
  cool: { label: "Froid", icon: "mdi:snowflake", color: "cool" },
  heat_cool: { label: "Auto", icon: "mdi:sun-snowflake-variant", color: "auto" },
  auto: { label: "Auto", icon: "mdi:thermostat-auto", color: "auto" },
  dry: { label: "Déshumid.", icon: "mdi:water-percent", color: "dry" },
  fan_only: { label: "Ventilation", icon: "mdi:fan", color: "fan" },
};
const ACTIONS = {
  heating: "Chauffe", cooling: "Refroidit", drying: "Déshumidifie", fan: "Ventile", idle: "En attente", off: "Arrêt", defrosting: "Dégivrage",
};
const FAN = { auto: "Auto", low: "Faible", medium: "Moyen", high: "Fort", quiet: "Silence", min: "Min", max: "Max", middle: "Moyen", top: "Fort", on: "Marche", off: "Arrêt" };
const PRESET = { eco: "Éco", comfort: "Confort", away: "Absent", home: "Présent", boost: "Boost", sleep: "Nuit", none: "Aucun", activity: "Activité" };
const ICONS = { temperature: "mdi:thermometer", humidity: "mdi:water-percent", power: "mdi:flash", pressure: "mdi:gauge" };

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isNum = (v) => v !== undefined && v !== null && v !== "" && !isNaN(Number(v));
const bad = (st) => !st || st.state === "unavailable" || st.state === "unknown";
const tr = (map, k) => map[k] || (k ? String(k).charAt(0).toUpperCase() + String(k).slice(1).replace(/_/g, " ") : "");

function modeKey(st) {
  if (bad(st)) return "unavailable";
  const a = st.attributes && st.attributes.hvac_action;
  if (st.state === "off") return "off";
  if (a === "cooling") return "cool";
  if (a === "heating" || a === "defrosting") return "heat";
  if (a === "drying") return "dry";
  if (a === "fan") return "fan";
  if (st.state === "heat") return "heat";
  if (st.state === "cool") return "cool";
  if (st.state === "dry") return "dry";
  if (st.state === "fan_only") return "fan";
  return "auto";
}

let UID = 0;

function unitSvg(running, uid, data) {
  const ys = [22, 48, 74, 100, 126];
  const cut = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
  const ducts = ys.map((y, i) => {
    const d = data.ducts[i];
    const pipe = `M168 ${74} C 200 ${74}, 214 ${y}, 252 ${y} H 290`;
    return `
    <path d="${pipe}" fill="none" stroke="var(--hv-pipe)" stroke-width="7" stroke-linecap="round"/>
    ${running ? `<path class="flow" d="${pipe}" fill="none" stroke="var(--hv-mode)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 7"/>` : ""}
    <rect x="290" y="${y - 8}" width="8" height="16" rx="2" fill="var(--hv-pipe)" stroke="var(--hv-mode)" stroke-width="1.2"/>
    ${d ? `<text x="304" y="${y - 1}" class="dv">${esc(d.value)}</text><text x="304" y="${y + 8}" class="dn">${esc(cut(d.name, 8))}</text>` : ""}`;
  }).join("");
  return `
<svg viewBox="0 0 360 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="sv">
  <defs><radialGradient id="hv-g-${uid}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="var(--hv-mode)" stop-opacity=".35"/><stop offset="100%" stop-color="var(--hv-mode)" stop-opacity="0"/></radialGradient></defs>
  ${running ? `<ellipse cx="150" cy="74" rx="75" ry="55" fill="url(#hv-g-${uid})"/>` : ""}
  ${ducts}
  <!-- caisson de reprise -->
  <rect x="6" y="30" width="92" height="88" rx="9" fill="var(--hv-box)" stroke="var(--hv-mode)" stroke-width="1.6"/>
  <text x="52" y="46" text-anchor="middle" class="bl">CAISSON DE REPRISE</text>
  <text x="52" y="78" text-anchor="middle" class="bv">${esc(data.returnVal)}</text>
  <text x="52" y="96" text-anchor="middle" class="bn">${esc(data.returnName)}</text>
  <path d="M14 106 H90" stroke="var(--hv-mode)" stroke-width="1.2" stroke-dasharray="2 3" opacity=".7"/>
  <!-- retour d'air -->
  <path d="M98 74 H116" stroke="var(--hv-pipe)" stroke-width="9" stroke-linecap="round"/>
  ${running ? `<path class="flow" d="M98 74 H116" stroke="var(--hv-mode)" stroke-width="2.4" stroke-dasharray="3 7"/>` : ""}
  <!-- unité -->
  <rect x="116" y="50" width="54" height="48" rx="8" fill="var(--hv-box)" stroke="var(--hv-mode)" stroke-width="1.6"/>
  <circle cx="143" cy="74" r="15" fill="none" stroke="var(--hv-pipe)" stroke-width="1.2"/>
  <g class="${running ? "fan" : ""}" style="transform-origin:143px 74px"><path d="M143 74 L143 61 A13 13 0 0 1 155 69Z M143 74 L156 74 A13 13 0 0 1 149 86Z M143 74 L137 86 A13 13 0 0 1 130 74Z M143 74 L130 74 A13 13 0 0 1 137 62Z" fill="var(--hv-mode)"/></g>
  <circle cx="143" cy="74" r="3" fill="var(--hv-box)"/>
</svg>`;
}

class DuctedHvacCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("ducted-hvac-card-editor");
  }

  static getStubConfig(hass) {
    const climates = Object.keys((hass && hass.states) || {}).filter((e) => e.startsWith("climate."));
    const guess = climates.find((e) => /gainable|atlantic|clim|hvac|pac/i.test(e + " " + ((hass.states[e].attributes || {}).friendly_name || "")))
      || climates[0] || "";
    return { ...DEFAULTS, entity: guess };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sig = "";
    this._uid = ++UID;
    this._pending = null;
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error("ducted-hvac-card : « entity » (l'entité climate) est obligatoire");
    this._config = { ...DEFAULTS, ...config };
    if (!Array.isArray(this._config.info_entities)) this._config.info_entities = [];
    this._sig = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const ids = [this._config.entity, this._config.return_entity, 1, 2, 3, 4, 5].map((x) => (typeof x === "number" ? this._config["duct_" + x] : x)).concat(this._infos().map((i) => i.entity)).filter(Boolean);
    const sig = ids.map((e) => {
      const s = hass.states[e];
      return s ? s.state + "|" + JSON.stringify([s.attributes.hvac_action, s.attributes.temperature, s.attributes.current_temperature, s.attributes.fan_mode, s.attributes.preset_mode, s.attributes.humidity]) : "x";
    }).join(";") + "#" + (this._isDark() ? "d" : "l") + "#" + this._pending;
    if (sig !== this._sig) {
      this._sig = sig;
      this._render();
    }
  }

  getCardSize() { return 5; }

  _infos() {
    return (this._config.info_entities || []).map((i) => (typeof i === "string" ? { entity: i } : i)).filter((i) => i && i.entity);
  }

  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    if (typeof dm === "boolean") return dm;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  _fmt(n, d = 1) {
    const lang = (this._hass && this._hass.locale && this._hass.locale.language) || "fr";
    return new Intl.NumberFormat(lang, { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n));
  }

  _unit() {
    return (this._hass && this._hass.config && this._hass.config.unit_system && this._hass.config.unit_system.temperature) || "°C";
  }

  _more(id) {
    if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: id } }));
  }

  _call(service, data) {
    this._hass.callService("climate", service, { entity_id: this._config.entity, ...data });
  }

  _adjust(dir) {
    const st = this._hass.states[this._config.entity];
    if (bad(st)) return;
    const a = st.attributes;
    const c = Number(this._config.temp_step);
    const step = c > 0 ? c : Number(a.target_temp_step) > 0 ? Number(a.target_temp_step) : 0.5;
    const min = isNum(a.min_temp) ? Number(a.min_temp) : 5;
    const max = isNum(a.max_temp) ? Number(a.max_temp) : 35;
    const base = this._pending !== null ? this._pending : Number(a.temperature);
    if (!isNum(base)) return;
    const next = Math.min(max, Math.max(min, Math.round((base + dir * step) / step) * step));
    this._pending = Math.round(next * 100) / 100;
    this._sig = "";
    this._render();
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._call("set_temperature", { temperature: this._pending });
      setTimeout(() => { this._pending = null; this._sig = ""; this._render(); }, 4000);
    }, 700);
  }

  _render() {
    const c = this._config, h = this._hass;
    if (!c || !h) return;
    const st = h.states[c.entity];
    const a = (st && st.attributes) || {};
    const key = modeKey(st);
    const unknown = key === "unavailable";
    const running = !unknown && key !== "off" && a.hvac_action !== "idle";
    const dark = this._isDark();
    const name = c.name || a.friendly_name || "Climatisation";
    const unit = this._unit();
    const cur = isNum(a.current_temperature) ? this._fmt(a.current_temperature) : "—";
    const tgtRaw = this._pending !== null ? this._pending : a.temperature;
    const hasTarget = isNum(tgtRaw);
    const tgt = hasTarget ? this._fmt(tgtRaw) : "—";
    const label = unknown ? "Indisponible" : a.hvac_action && st.state !== "off" ? tr(ACTIONS, a.hvac_action) : tr(MODES, st.state).label || tr(ACTIONS, st.state);
    const stateLabel = unknown ? "Indisponible" : st.state === "off" ? "Arrêt" : (a.hvac_action ? tr(ACTIONS, a.hvac_action) : (MODES[st.state] || {}).label || tr({}, st.state));

    const sval = (eid) => {
      const s2 = h.states[eid];
      if (bad(s2)) return "—";
      const v = isNum(s2.state) ? this._fmt(s2.state, 1) : String(s2.state);
      return v + (s2.attributes.unit_of_measurement ? s2.attributes.unit_of_measurement : "");
    };
    const ducts = [1, 2, 3, 4, 5].map((n) => {
      const eid = c["duct_" + n];
      if (!eid) return null;
      const s2 = h.states[eid];
      const nm = c["duct_" + n + "_name"] || (s2 && s2.attributes.friendly_name) || "Gaine " + n;
      return { value: sval(eid), name: nm };
    });
    const retS = c.return_entity ? h.states[c.return_entity] : null;
    const svgData = { ducts, returnVal: c.return_entity ? sval(c.return_entity) : cur + (cur === "—" ? "" : unit), returnName: c.return_name || (retS && retS.attributes.friendly_name) || "Reprise" };

    const modes = (a.hvac_modes || []).filter((m) => MODES[m] || m);
    const modeBtns = c.show_modes && !unknown ? `<div class="modes">${modes.map((m) => {
      const mm = MODES[m] || { label: tr({}, m), icon: "mdi:thermostat" };
      return `<button class="mode ${m === st.state ? "sel" : ""} m-${mm.color || "auto"}" data-mode="${esc(m)}" title="${esc(mm.label)}"><ha-icon icon="${mm.icon}"></ha-icon><span>${esc(mm.label)}</span></button>`;
    }).join("")}</div>` : "";

    const fans = c.show_fan && !unknown && Array.isArray(a.fan_modes) && a.fan_modes.length
      ? `<div class="row"><span class="rl"><ha-icon icon="mdi:fan"></ha-icon>Ventilation</span><div class="seg">${a.fan_modes.map((f) => `<button class="${f === a.fan_mode ? "sel" : ""}" data-fan="${esc(f)}">${esc(tr(FAN, f))}</button>`).join("")}</div></div>` : "";
    const presets = c.show_presets && !unknown && Array.isArray(a.preset_modes) && a.preset_modes.length
      ? `<div class="row"><span class="rl"><ha-icon icon="mdi:tune-variant"></ha-icon>Préréglage</span><div class="seg">${a.preset_modes.map((p) => `<button class="${p === a.preset_mode ? "sel" : ""}" data-preset="${esc(p)}">${esc(tr(PRESET, p))}</button>`).join("")}</div></div>` : "";

    const tiles = this._infos().map((i) => {
      const s = h.states[i.entity];
      const lab = i.name || (s && s.attributes.friendly_name) || i.entity;
      let val = "—";
      if (!bad(s)) {
        val = isNum(s.state) ? this._fmt(s.state, Number.isInteger(Number(s.state)) ? 0 : 1) : String(s.state);
        if (s.attributes.unit_of_measurement) val += " " + s.attributes.unit_of_measurement;
      }
      const icon = i.icon || (s && (s.attributes.icon || ICONS[s.attributes.device_class])) || "mdi:information-outline";
      return `<button class="tile" data-more="${esc(i.entity)}" title="${esc(lab)}"><span class="tl"><ha-icon icon="${esc(icon)}"></ha-icon><span class="tn">${esc(lab)}</span></span><span class="tv">${esc(val)}</span></button>`;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        ha-card.dark {
          --hv-text:#f4f6fb; --hv-muted:#a9afc0; --hv-bg:linear-gradient(160deg,#1b1e32 0%,#241a2a 55%,#2d1519 100%);
          --hv-border:rgba(255,255,255,.14); --hv-shadow:0 .6em 2em rgba(0,0,0,.35);
          --hv-glass:rgba(255,255,255,.07); --hv-glass-b:rgba(255,255,255,.13); --hv-fill:rgba(255,255,255,.09); --hv-fill-b:rgba(255,255,255,.16);
          --hv-heat:#ff8a3d; --hv-cool:#4fc3f7; --hv-auto:#9ad37f; --hv-dry:#7bd4c8; --hv-fan:#b9a7ff; --hv-off:#8a8f9c;
        }
        ha-card.light {
          --hv-text:#1c2030; --hv-muted:#5d6477; --hv-bg:linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#f8eff0 100%);
          --hv-border:rgba(20,24,40,.12); --hv-shadow:0 .4em 1.4em rgba(20,24,40,.12);
          --hv-glass:rgba(255,255,255,.7); --hv-glass-b:rgba(20,24,40,.1); --hv-fill:rgba(20,24,40,.06); --hv-fill-b:rgba(20,24,40,.14);
          --hv-heat:#e06a14; --hv-cool:#0f8fc4; --hv-auto:#2e9d4a; --hv-dry:#18978a; --hv-fan:#6c52d9; --hv-off:#8a8f9c;
        }
        ha-card { display:flex; flex-direction:column; gap:12px; padding:16px; overflow:hidden; color:var(--hv-text);
          border-radius:24px; border:1px solid var(--hv-border); background:var(--hv-bg); box-shadow:var(--hv-shadow); }
        button { font:inherit; color:inherit; cursor:pointer; border:0; background:none; padding:0; text-align:left; -webkit-tap-highlight-color:transparent; }
        ha-icon { --mdc-icon-size:1.2em; flex:none; }
        .head { display:flex; flex-direction:column; gap:3px; }
        .head b { font-size:1.1em; font-weight:650; }
        .state { display:flex; align-items:center; gap:.5em; font-size:.85em; font-weight:600; color:var(--hv-off); }
        .state::before { content:""; width:.6em; height:.6em; border-radius:50%; background:currentColor; box-shadow:0 0 .6em currentColor; }
        .state.heat { color:var(--hv-heat); } .state.cool { color:var(--hv-cool); } .state.auto { color:var(--hv-auto); } .state.dry { color:var(--hv-dry); } .state.fan { color:var(--hv-fan); }
        .panel { display:flex; flex-direction:column; gap:12px; padding:14px; border-radius:18px;
          background:var(--hv-glass); border:1px solid var(--hv-glass-b); -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); }
        .art svg { width:100%; height:auto; display:block; }
        .panel { --hv-mode:var(--hv-off); }
        .panel.m-heat { --hv-mode:var(--hv-heat); } .panel.m-cool { --hv-mode:var(--hv-cool); } .panel.m-auto { --hv-mode:var(--hv-auto); }
        .panel.m-dry { --hv-mode:var(--hv-dry); } .panel.m-fan { --hv-mode:var(--hv-fan); } .panel.m-off, .panel.m-unavailable { --hv-mode:var(--hv-off); }
        .panel { --hv-pipe:color-mix(in srgb, var(--hv-text) 18%, transparent); --hv-box:color-mix(in srgb, var(--hv-text) 8%, transparent); }
        .sv text { fill:var(--hv-text); font-family:inherit; }
        .sv .bl { font-size:7.5px; letter-spacing:.06em; fill:var(--hv-muted); } .sv .bv { font-size:22px; font-weight:700; fill:var(--hv-mode); }
        .sv .bn { font-size:9px; fill:var(--hv-muted); } .sv .dv { font-size:10px; font-weight:700; } .sv .dn { font-size:7px; fill:var(--hv-muted); }
        .read { flex-direction:row !important; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; }
        .read { display:flex; flex-direction:column; gap:12px; min-width:0; }
        .lbl { font-size:.72em; text-transform:uppercase; letter-spacing:.08em; color:var(--hv-muted); }
        .big { font-size:2.6em; font-weight:700; line-height:1; font-variant-numeric:tabular-nums; }
        .big small { font-size:.4em; font-weight:600; opacity:.7; margin-left:.15em; }
        .set { display:flex; align-items:center; gap:.5em; }
        .set .val { font-size:1.5em; font-weight:650; min-width:3.6em; text-align:center; font-variant-numeric:tabular-nums; }
        .set .val small { font-size:.55em; opacity:.7; margin-left:.1em; }
        .step { display:grid; place-items:center; width:2.4em; height:2.4em; border-radius:50%; background:var(--hv-fill); border:1px solid var(--hv-fill-b); font-size:1.1em; font-weight:700; touch-action:manipulation; }
        .step:active { background:var(--hv-fill-b); }
        .modes { display:grid; grid-template-columns:repeat(auto-fit,minmax(4.6em,1fr)); gap:.5em; }
        .mode { display:flex; flex-direction:column; align-items:center; gap:.3em; padding:.6em .3em; border-radius:1em; font-size:.78em; font-weight:600; text-align:center;
          background:var(--hv-glass); border:1px solid var(--hv-glass-b); color:var(--hv-muted); }
        .mode ha-icon { --mdc-icon-size:1.6em; }
        .mode.sel { color:var(--hv-text); border-color:currentColor; background:var(--hv-fill); }
        .mode.sel.m-heat { color:var(--hv-heat); } .mode.sel.m-cool { color:var(--hv-cool); } .mode.sel.m-auto { color:var(--hv-auto); }
        .mode.sel.m-dry { color:var(--hv-dry); } .mode.sel.m-fan { color:var(--hv-fan); }
        .row { display:flex; align-items:center; justify-content:space-between; gap:.6em; flex-wrap:wrap; }
        .rl { display:flex; align-items:center; gap:.45em; font-size:.8em; color:var(--hv-muted); }
        .seg { display:flex; flex-wrap:wrap; gap:.3em; }
        .seg button { padding:.35em .8em; border-radius:2em; font-size:.8em; font-weight:600; background:var(--hv-fill); border:1px solid var(--hv-fill-b); }
        .seg button.sel { background:var(--hv-text); color:var(--hv-bg-solid, #111); }
        ha-card.dark .seg button.sel { color:#1b1e32; } ha-card.light .seg button.sel { color:#fff; }
        .tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(9em,1fr)); gap:.6em; }
        .tile { display:flex; flex-direction:column; gap:.35em; padding:.7em .85em; border-radius:1em; background:var(--hv-glass); border:1px solid var(--hv-glass-b); min-width:0; }
        .tl { display:flex; align-items:center; gap:.45em; font-size:.74em; color:var(--hv-muted); min-width:0; }
        .tn { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .tv { font-size:1.2em; font-weight:650; font-variant-numeric:tabular-nums; }
        .fan { animation:hv-spin 1.2s linear infinite; } @keyframes hv-spin { to { transform:rotate(360deg); } }
        .flow { animation:hv-dash 1s linear infinite; } @keyframes hv-dash { to { stroke-dashoffset:-20; } }
        .led { animation:hv-led 1.6s ease-in-out infinite; } @keyframes hv-led { 50% { opacity:.35; } }
        .air { display:none; }
        @media (prefers-reduced-motion: reduce) { .fan, .flow, .led { animation:none; } }
        
      </style>
      <ha-card class="${dark ? "dark" : "light"}">
        <div class="head"><b>${esc(name)}</b><span class="state ${key === "unavailable" ? "off" : key}">${esc(stateLabel)}</span></div>
        <div class="panel m-${key}">
          <div class="art">${unitSvg(running, this._uid, svgData)}</div>
          <div class="read">
            <div><div class="lbl">Température</div><button class="big" data-more="${esc(c.entity)}">${esc(cur)}<small>${esc(unit)}</small></button></div>
            ${hasTarget ? `<div><div class="lbl">Consigne</div><div class="set">
              ${c.show_controls ? `<button class="step" data-action="down" aria-label="Baisser">−</button>` : ""}
              <span class="val">${esc(tgt)}<small>${esc(unit)}</small></span>
              ${c.show_controls ? `<button class="step" data-action="up" aria-label="Augmenter">+</button>` : ""}
            </div></div>` : ""}
          </div>
        </div>
        ${c.show_controls ? modeBtns : ""}
        ${c.show_controls ? fans : ""}
        ${c.show_controls ? presets : ""}
        ${tiles ? `<div class="tiles">${tiles}</div>` : ""}
      </ha-card>`;

    const root = this.shadowRoot;
    root.querySelectorAll("[data-more]").forEach((el) => el.addEventListener("click", () => this._more(el.dataset.more)));
    root.querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", () => this._adjust(el.dataset.action === "up" ? 1 : -1)));
    root.querySelectorAll("[data-mode]").forEach((el) => el.addEventListener("click", () => this._call("set_hvac_mode", { hvac_mode: el.dataset.mode })));
    root.querySelectorAll("[data-fan]").forEach((el) => el.addEventListener("click", () => this._call("set_fan_mode", { fan_mode: el.dataset.fan })));
    root.querySelectorAll("[data-preset]").forEach((el) => el.addEventListener("click", () => this._call("set_preset_mode", { preset_mode: el.dataset.preset })));
  }
}

/* ---------- Éditeur visuel ---------- */
const LABELS = {
  entity: "Climatisation (entité climate)", name: "Nom (facultatif)", info_entities: "Capteurs à afficher (soufflage, reprise, humidité...)",
  temp_step: "Pas de la consigne (0 = automatique)", theme: "Thème", show_controls: "Afficher les commandes",
  return_entity: "Caisson de reprise : température à afficher", return_name: "Caisson de reprise : nom",
  duct_1: "Gaine 1 : capteur", duct_2: "Gaine 2 : capteur", duct_3: "Gaine 3 : capteur", duct_4: "Gaine 4 : capteur", duct_5: "Gaine 5 : capteur",
  duct_1_name: "Gaine 1 : nom", duct_2_name: "Gaine 2 : nom", duct_3_name: "Gaine 3 : nom", duct_4_name: "Gaine 4 : nom", duct_5_name: "Gaine 5 : nom",
  show_modes: "Afficher les modes", show_fan: "Afficher la ventilation", show_presets: "Afficher les préréglages",
};

class DuctedHvacCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...DEFAULTS, ...config };
    this._build();
  }
  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }
  _build() {
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => LABELS[s.name] || s.name;
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._config = { ...this._config, ...ev.detail.value };
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = { ...this._config, info_entities: (this._config.info_entities || []).map((i) => (typeof i === "string" ? i : i.entity)) };
    this._form.schema = [
      { name: "entity", required: true, selector: { entity: { domain: "climate" } } },
      { name: "name", selector: { text: {} } },
      { name: "return_entity", selector: { entity: { domain: "sensor" } } },
      { type: "grid", name: "", schema: [{ name: "return_name", selector: { text: {} } }] },
      ...[1, 2, 3, 4, 5].map((n) => ({ type: "grid", name: "", schema: [
        { name: "duct_" + n, selector: { entity: { domain: "sensor" } } }, { name: "duct_" + n + "_name", selector: { text: {} } } ] })),
      { name: "info_entities", selector: { entity: { multiple: true } } },
      {
        type: "grid", name: "", schema: [
          { name: "temp_step", selector: { number: { min: 0, max: 5, step: 0.1, mode: "box" } } },
          { name: "theme", selector: { select: { mode: "dropdown", options: [
            { value: "auto", label: "Automatique (thème de Home Assistant)" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" } ] } } },
        ],
      },
      { name: "show_controls", selector: { boolean: {} } },
      { name: "show_modes", selector: { boolean: {} } },
      { name: "show_fan", selector: { boolean: {} } },
      { name: "show_presets", selector: { boolean: {} } },
    ];
  }
}

customElements.define("ducted-hvac-card", DuctedHvacCard);
customElements.define("ducted-hvac-card-editor", DuctedHvacCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ducted-hvac-card",
  name: "Ducted HVAC Card (FR)",
  description: "Climatisation / PAC gainable : schéma animé, température, consigne, modes, ventilation et capteurs.",
  preview: true,
});

console.info(
  `%c DUCTED-HVAC-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#0f8fc4;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px",
  "color:#0f8fc4;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px"
);
