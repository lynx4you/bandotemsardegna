// Modulo "Piano di intervento" – Voucher TEM Sardegna (Touché Consulting)
// Usato da piano.html (impresa) e avvia.html (Touché). Richiede lib/regole.js.
(function () {
  const { REGOLE, calcola, fmt } = window.TEMRegole;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const get = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
  const set = (o, p, v) => {
    const ks = p.split("."); let a = o;
    ks.slice(0, -1).forEach((k, i) => { if (a[k] == null) a[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[k]; });
    a[ks[ks.length - 1]] = v;
  };

  // ---------- struttura del modulo (ricalca il Formulario, All. 1) ----------
  const SEZIONI = [
    { n: "1", t: "Dati del soggetto proponente", art: "Formulario, Sez. 1 · art. 4", campi: [
      ["impresa.ragione_sociale", "Ragione sociale", 1], ["impresa.forma_giuridica", "Forma giuridica", 1, "es. S.r.l., S.n.c., ditta individuale"],
      ["impresa.piva", "Partita IVA", 1], ["impresa.cf", "Codice fiscale", 1],
      ["impresa.sede_legale", "Sede legale", 1, "Indirizzo completo"], ["impresa.sede_operativa", "Sede operativa interessata dall'intervento", 1, "Deve essere in Sardegna da almeno 1 anno (art. 4)"],
      ["impresa.ateco", "Codice ATECO prevalente", 1, "Come da visura camerale"], ["impresa.data_costituzione", "Data di costituzione", 1, "gg/mm/aaaa"],
      ["impresa.addetti", "Numero addetti", 1], ["impresa.fatturato", "Fatturato dell'ultimo esercizio approvato", 1, "es. € 1.850.000 (bilancio 2025)"],
      ["impresa.legale_rappresentante", "Legale rappresentante", 1, "Firmerà digitalmente il Piano e la domanda"], ["impresa.referente", "Referente aziendale per il progetto", 1],
      ["impresa.telefono", "Telefono", 0], ["impresa.email", "E-mail", 1], ["impresa.pec", "PEC", 1],
      { tipo: "classe" },
    ] },
    { n: "2", t: "Profilo dell'impresa", art: "Formulario, Sez. 2 · art. 11 informazioni aziendali", campi: [
      ["profilo.attivita", "Attività svolta", 1, "In 3-5 righe: cosa fate, da quando, con quale organizzazione", "ta"],
      ["profilo.prodotti", "Principali prodotti o servizi, prodotti ed esportati", 1, "", "ta"],
      ["profilo.mercati_serviti", "Mercati attualmente serviti", 1, "Italia ed estero, con la quota indicativa sul fatturato", "ta"],
      ["profilo.esperienze", "Esperienze pregresse sui mercati esteri", 0, "Fiere, missioni, distributori, clienti esteri, anche occasionali", "ta"],
    ] },
    { n: "3", t: "Fabbisogno di internazionalizzazione", art: "Formulario, Sez. 3 · art. 11", campi: [
      ["fabbisogno.situazione", "Situazione aziendale di partenza", 0, "", "ta"],
      ["fabbisogno.fabbisogni", "Fabbisogni individuati", 0, "", "ta"],
      ["fabbisogno.criticita", "Criticità che limitano lo sviluppo internazionale", 0, "", "ta"],
      ["fabbisogno.opportunita", "Opportunità di crescita sui mercati esteri", 0, "", "ta"],
    ] },
    { n: "4", t: "Obiettivi e mercati target", art: "Formulario, Sez. 4 · art. 11 obiettivi chiari e quantificati", campi: [{ tipo: "obiettivi" }, { tipo: "mercati" }] },
    { n: "5·7", t: "Servizi, giornate e fornitore", art: "Formulario, Sez. 5, 6, 7 · art. 6, art. 7 Tabella 1", campi: [{ tipo: "servizi" }] },
    { n: "8·9", t: "Premialità e modalità di erogazione", art: "Formulario, Sez. 8, 9 · art. 11", campi: [{ tipo: "premi" }] },
    { n: "10", t: "Risultati attesi", art: "Formulario, Sez. 10", campi: [{ tipo: "risultati" }] },
    { n: "✎", t: "Note", art: "", campi: [["note_cliente", "Note o domande per Touché", 0, "Facoltativo", "ta"], { tipo: "admin_note" }] },
  ];
  const OBBLIGATORI = SEZIONI.flatMap((s) => s.campi.filter((c) => Array.isArray(c) && c[2]).map((c) => c[0]));

  let D = {}, MODO = "cliente", PRE = new Set(), timer = null, onSave = null, sporco = false;

  // ---------- rendering ----------
  function campo([p, l, req, aiuto, tipo]) {
    const v = get(D, p) ?? "";
    const pre = MODO === "cliente" && PRE.has(p);
    const ctrl = tipo === "ta"
      ? `<textarea id="f_${p}" data-p="${p}">${esc(v)}</textarea>`
      : `<input type="${p.endsWith("email") || p.endsWith("pec") ? "email" : "text"}" id="f_${p}" data-p="${p}" value="${esc(v)}">`;
    return `<div class="campo ${tipo === "ta" ? "largo" : ""} ${pre ? "pre" : ""}" data-campo="${p}">
      <label for="f_${p}">${esc(l)}${req ? ' <span class="req">*</span>' : ""}${pre ? '<span class="tag">precompilato · verifica</span>' : ""}</label>
      ${ctrl}${aiuto ? `<span class="aiuto">${esc(aiuto)}</span>` : ""}</div>`;
  }

  function blocco(c) {
    if (Array.isArray(c)) return campo(c);
    const admin = MODO === "admin";
    switch (c.tipo) {
      case "classe":
        return `<div class="campo largo"><label>Classe dimensionale ai fini dell'Avviso</label>
          ${admin ? `<select data-p="classe">${Object.entries(REGOLE.classi).map(([k, l]) => `<option value="${k}" ${D.classe === k ? "selected" : ""}>${l}</option>`).join("")}</select>`
            : `<div><b>${esc(REGOLE.classi[D.classe])}</b></div>`}
          <span class="aiuto">Determina le giornate massime della Tabella 1 (art. 7). ${admin ? "" : "Se non corrisponde al fatturato dell'ultimo bilancio, scrivilo nelle note."}</span></div>`;
      case "obiettivi": {
        const o = D.obiettivi || {};
        const voci = [["avvio", "Avvio attività export"], ["cons", "Consolidamento attività export"], ["nuovi", "Apertura nuovi mercati"], ["dig", "Sviluppo export digitale"], ["cert", "Ottenimento certificazioni per mercati esteri"], ["altro", "Altro"]];
        return `<div class="campo largo"><label>Obiettivi dell'intervento</label><div class="checks">
          ${voci.map(([k, l]) => `<label><input type="checkbox" data-p="obiettivi.${k}" ${o[k] ? "checked" : ""}> ${l}</label>`).join("")}</div></div>
          ${campo(["obiettivi.altro_testo", "Descrivi gli obiettivi in modo quantificato", 0, "es. 2 distributori negli EAU e € 150.000 di export in 12 mesi", "ta"])}`;
      }
      case "mercati": {
        const m = D.mercati || [];
        const righe = [0, 1, 2, 3].map((i) => `<tr>${["paese", "prodotto", "motivazione"].map((k) =>
          `<td><input type="text" aria-label="${k} ${i + 1}" data-p="mercati.${i}.${k}" value="${esc(m[i]?.[k])}"></td>`).join("")}</tr>`).join("");
        return `<div class="scroll"><label style="font-weight:600;font-size:14px">Paesi e mercati target</label>
          <table class="tab"><thead><tr><th>Paese / mercato</th><th>Prodotto o servizio</th><th>Motivazione</th></tr></thead><tbody>${righe}</tbody></table></div>`;
      }
      case "servizi": return servizi();
      case "premi": {
        const p = D.premialita || {};
        return `<div class="campo"><label>Premialità richieste</label><div class="checks">
            <label><input type="checkbox" data-p="premialita.rating" ${p.rating ? "checked" : ""}> Rating di legalità</label>
            <label><input type="checkbox" data-p="premialita.parita" ${p.parita ? "checked" : ""}> Certificazione della parità di genere</label></div>
            <span class="aiuto">Solo se già possedute: andranno allegate.</span></div>
          <div class="campo"><label>Erogazione del contributo</label><div class="checks">
            <label><input type="radio" name="erog" data-p="erogazione" value="anticipo" ${D.erogazione === "anticipo" ? "checked" : ""}> Anticipo del 50% con fideiussione</label>
            <label><input type="radio" name="erog" data-p="erogazione" value="saldo" ${D.erogazione === "saldo" ? "checked" : ""}> Solo a saldo</label></div>
            <span class="aiuto">L'anticipo richiede una fideiussione bancaria o assicurativa prima dell'erogazione.</span></div>`;
      }
      case "risultati": {
        const r = D.risultati || [];
        const righe = [0, 1, 2, 3, 4, 5].map((i) => `<tr><td>${i < 4 ? esc(REGOLE.risultatiFissi[i])
          : `<input type="text" aria-label="indicatore ${i + 1}" data-p="risultati.${i}.ind" value="${esc(r[i]?.ind)}" placeholder="Altro indicatore">`}</td>
          <td><input type="text" aria-label="valore ${i + 1}" data-p="risultati.${i}.val" value="${esc(r[i]?.val)}"></td></tr>`).join("");
        return `<div class="scroll"><table class="tab"><thead><tr><th>Indicatore</th><th>Valore atteso a fine progetto</th></tr></thead><tbody>${righe}</tbody></table></div>`;
      }
      case "admin_note":
        return admin ? campo(["note_touche", "Note interne Touché (non visibili all'impresa)", 0, "", "ta"]) : "";
    }
    return "";
  }

  function servizi() {
    const admin = MODO === "admin";
    const c = calcola(D);
    const s = D.servizi || {};
    const righe = c.righe.map((r) => {
      const def = REGOLE.servizi[r.k];
      const num = (f, dis) => admin && !dis ? `<input type="number" min="0" step="1" aria-label="${f} ${def.nome}" data-p="servizi.${r.k}.${f}" data-n="1" value="${s[r.k]?.[f] ?? ""}">` : (s[r.k]?.[f] || "–");
      return `<tr style="${r.attivo ? "" : "color:var(--grigio)"}"><td>${def.nome}${def.obbl ? " <b title='obbligatorio'>*</b>" : ""}${def.unita ? `<br><small>max ${def.max[D.classe || "f1"]} gg per ${def.unita}</small>` : ""}</td>
        <td class="num">${num("gg_senior")}</td><td class="num">${num("gg_junior", def.soloSenior)}</td>
        <td class="num">${r.gg} / ${r.max}</td><td class="num">€ ${fmt(r.costo)}</td>
        <td>${admin ? `<input type="text" aria-label="mercato ${def.nome}" data-p="servizi.${r.k}.mercato" value="${esc(s[r.k]?.mercato)}">` : esc(s[r.k]?.mercato || "")}</td>
        <td>${admin ? `<input type="text" aria-label="descrizione ${def.nome}" data-p="servizi.${r.k}.desc" value="${esc(s[r.k]?.desc)}">` : esc(s[r.k]?.desc || "")}</td></tr>`;
    }).join("");
    const mis = s.mis?.missioni || [];
    const tabMis = admin || mis.length ? `<div class="scroll"><label style="font-weight:600;font-size:14px">Missioni B2B previste (max 3 a semestre, art. 7)</label>
      <table class="tab"><thead><tr><th>Mercato</th><th>Missione</th><th class="num">Giornate</th><th>Descrizione</th></tr></thead><tbody>
      ${[0, 1, 2, 3].filter((i) => admin || mis[i]).map((i) => `<tr>${["mercato", "missione", "gg", "desc"].map((k) => `<td>${admin
        ? `<input type="${k === "gg" ? "number" : "text"}" ${k === "gg" ? 'data-n="1"' : ""} aria-label="${k} missione ${i + 1}" data-p="servizi.mis.missioni.${i}.${k}" value="${esc(mis[i]?.[k])}">`
        : esc(mis[i]?.[k])}</td>`).join("")}</tr>`).join("")}</tbody></table>
      ${admin ? `<label class="aiuto">Mesi di lead generation digitale: <input type="number" min="0" data-n="1" data-p="servizi.dig.mesi" value="${esc(s.dig?.mesi)}" style="width:72px"></label>` : ""}</div>` : "";
    const fo = D.fornitore || {};
    const forn = admin
      ? ["nome", "piva", "coordinatore", "team", "data_inizio", "data_fine"].map((k) => campo(["fornitore." + k,
        { nome: "Società incaricata", piva: "Partita IVA Touché", coordinatore: "Coordinatore (senior, ≥ 6 anni, art. 6 c. 4)", team: "Team: cognome, nome e seniority", data_inizio: "Inizio previsto", data_fine: "Conclusione prevista" }[k], 0, k === "team" ? "Ogni professionista max 8 imprese contemporanee (art. 6 c. 3)" : ""])).join("")
      : `<div class="campo largo"><label>Fornitore incaricato</label><div>${esc(fo.nome)} · coordinatore ${esc(fo.coordinatore)}${fo.team ? " · team: " + esc(fo.team) : ""}${fo.data_inizio ? ` · dal ${esc(fo.data_inizio)} al ${esc(fo.data_fine)}` : ""}</div></div>`;
    return `${admin ? "" : `<div class="msg info">Questa parte la prepariamo noi sulla base della call: servizi, giornate e costi rispettano la Tabella 1 (art. 7) e le tariffe dell'art. 6. Se qualcosa non ti torna, scrivilo nelle note in fondo.</div>`}
      <div class="kpi"><div><b>€ ${fmt(c.spesa)}</b><span>Spesa del Piano (IVA esclusa)</span></div>
        <div class="r"><b>€ ${fmt(c.contributo)}</b><span>Voucher a fondo perduto (80%, art. 3)</span></div>
        <div><b>€ ${fmt(c.cofinanziamento)}</b><span>A carico dell'impresa, più IVA</span></div></div>
      ${admin && c.errori.length ? `<div class="msg err"><b>Da correggere:</b><br>${c.errori.map(esc).join("<br>")}</div>` : ""}
      ${admin && !c.errori.length ? `<div class="msg ok">Controlli Tabella 1, servizi obbligatori e spesa minima: OK</div>` : ""}
      ${c.avvisi.map((a) => `<div class="msg info">${esc(a)}</div>`).join("")}
      <div class="scroll"><table class="tab"><thead><tr><th>Servizio</th><th class="num">gg senior<br>€ ${REGOLE.tariffe.senior}</th><th class="num">gg junior<br>€ ${REGOLE.tariffe.junior}</th>
        <th class="num">gg / max</th><th class="num">Importo</th><th>Mercato</th><th>Attività</th></tr></thead><tbody>${righe}</tbody>
        <tfoot><tr><td>Totale</td><td></td><td></td><td class="num">${c.giornate}</td><td class="num">€ ${fmt(c.spesa)}</td><td colspan="2"></td></tr></tfoot></table></div>
      ${tabMis}${forn}
      <p class="aiuto" style="grid-column:1/-1">Le spese di viaggio delle missioni si aggiungono a costi unitari UE (Annex 2a) e non sono incluse sopra. Tariffe e massimali: Avviso ${REGOLE.versioneAvviso}.</p>`;
  }

  function render() {
    const scrollY = window.scrollY, focusP = document.activeElement?.dataset?.p;
    $("#modulo").innerHTML = SEZIONI.map((s) => {
      const corpo = s.campi.map(blocco).join("");
      if (!corpo.trim()) return "";
      return `<section class="sez" id="sez-${s.n}"><header><span class="n">${s.n}</span><h2>${s.t}</h2><span class="art">${s.art}</span></header><div class="corpo">${corpo}</div></section>`;
    }).join("");
    if (focusP) { const el = document.querySelector(`[data-p="${focusP}"]`); if (el) { el.focus(); if (el.setSelectionRange && el.type === "text") el.setSelectionRange(el.value.length, el.value.length); } }
    window.scrollTo(0, scrollY);
    avanzamento();
  }

  function avanzamento() {
    const fatti = OBBLIGATORI.filter((p) => String(get(D, p) || "").trim()).length;
    const pct = Math.round((fatti / OBBLIGATORI.length) * 100);
    const b = $("#barra"); if (b) b.style.width = pct + "%";
    const s = $("#avanz"); if (s) s.textContent = `Campi obbligatori: ${fatti} di ${OBBLIGATORI.length}`;
    return OBBLIGATORI.length - fatti;
  }

  function onInput(e) {
    const el = e.target; const p = el.dataset.p; if (!p) return;
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (el.dataset.n) v = el.value === "" ? "" : Math.max(0, parseInt(el.value, 10) || 0);
    set(D, p, v);
    sporco = true;
    el.closest(".campo")?.classList.remove("manca");
    if (p.startsWith("servizi") || p === "classe") { if (e.type === "change" || el.type !== "text") render(); }
    else avanzamento();
    try { localStorage.setItem(chiaveLocale(), JSON.stringify(D)); } catch (_) {}
    if (onSave) { clearTimeout(timer); timer = setTimeout(() => onSave(false), 4000); }
  }
  const chiaveLocale = () => "piano_tem_" + (new URLSearchParams(location.search).get("t") || "demo").slice(-24);

  function evidenziaMancanti() {
    let primo = null;
    OBBLIGATORI.forEach((p) => {
      const ok = String(get(D, p) || "").trim();
      const box = document.querySelector(`[data-campo="${p}"]`);
      if (box) box.classList.toggle("manca", !ok);
      if (!ok && !primo) primo = box;
    });
    if (primo) primo.scrollIntoView({ behavior: "smooth", block: "center" });
    return !primo;
  }

  window.PianoUI = {
    init(data, opts = {}) {
      D = data; MODO = opts.modo || "cliente"; onSave = opts.onSave || null;
      if (!D.servizi) D.servizi = {};
      PRE = new Set(OBBLIGATORI.concat(SEZIONI.flatMap((s) => s.campi.filter(Array.isArray).map((c) => c[0]))).filter((p) => String(get(D, p) || "").trim()));
      const m = $("#modulo");
      m.addEventListener("input", onInput); m.addEventListener("change", onInput);
      render();
    },
    dati: () => D, render, evidenziaMancanti, mancanti: avanzamento,
    salvato() { sporco = false; }, sporco: () => sporco,
  };
})();
