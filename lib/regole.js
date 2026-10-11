// Regole dell'avviso usate sia dal browser sia dalle funzioni.
// Fonte: Avviso DEF 05.10.2026 (ANCORA BOZZA): art. 3 (contributo), art. 6 (tariffe), art. 7 (Tabella 1).
// Quando esce il testo definitivo, aggiornare solo questo file.
(function (root) {
  const REGOLE = {
    versioneAvviso: "DEF 05.10.2026 (bozza)",
    // art. 6 c. 6: professionista operante presso societa di consulenza
    tariffe: { senior: 640, junior: 258 },
    intensita: 0.8,          // art. 3
    spesaMinima: 12500,      // art. 3
    contributoMin: 10000,    // art. 3
    contributoMax: 60000,    // art. 3
    maxMissioniSemestre: 3,  // art. 7
    classi: {
      f1: "Fatturato ≤ € 1.000.000",
      f2: "Fatturato > € 1.000.000 e ≤ € 5.000.000",
      f3: "Fatturato > € 5.000.000",
    },
    // Tabella 1, art. 7: giornate massime per classe. mis = per missione, dig = per mese
    servizi: {
      chk:  { nome: "Export check-up", obbl: true, soloSenior: false, max: { f1: 2, f2: 3, f3: 3 } },
      str:  { nome: "Strategia e piano export", obbl: true, soloSenior: true, max: { f1: 5, f2: 8, f3: 10 } },
      mis:  { nome: "Missioni B2B", obbl: false, soloSenior: false, max: { f1: 6, f2: 8, f3: 8 }, unita: "missione" },
      dig:  { nome: "Lead generation digitale", obbl: false, soloSenior: false, max: { f1: 6, f2: 10, f3: 10 }, unita: "mese" },
      cert: { nome: "Certificazioni ed iscrizione elenco fornitori", obbl: false, soloSenior: false, max: { f1: 10, f2: 20, f3: 20 } },
      coo:  { nome: "Coordinamento", obbl: true, soloSenior: true, max: { f1: 5, f2: 7, f3: 9 } },
      mon:  { nome: "Monitoraggio finale", obbl: true, soloSenior: true, max: { f1: 4, f2: 5, f3: 6 } },
    },
    ordineServizi: ["chk", "str", "mis", "dig", "cert", "coo", "mon"],
    risultatiFissi: ["Nuovi contatti commerciali", "Incontri B2B", "Nuovi mercati raggiunti", "Certificazioni conseguite"],
  };

  const num = (v) => (isFinite(+v) && +v > 0 ? +v : 0);

  // Calcola giornate, spesa, contributo e controlli di ammissibilita.
  function calcola(d) {
    const cl = d.classe || "f1";
    const out = { righe: [], spesa: 0, contributo: 0, giornate: 0, errori: [], avvisi: [] };
    for (const k of REGOLE.ordineServizi) {
      const def = REGOLE.servizi[k];
      const s = (d.servizi && d.servizi[k]) || {};
      let sen = num(s.gg_senior), jun = num(s.gg_junior);
      let max = def.max[cl];
      if (k === "mis") {
        const n = (s.missioni || []).filter((m) => m && (m.mercato || num(m.gg))).length;
        max = def.max[cl] * Math.max(n, 1);
        if (n > REGOLE.maxMissioniSemestre * 2) out.errori.push("Più di " + REGOLE.maxMissioniSemestre + " missioni a semestre (art. 7).");
        let somma = 0;
        (s.missioni || []).forEach((m, i) => {
          somma += num(m.gg);
          if (num(m.gg) > def.max[cl]) out.errori.push("Missione " + (i + 1) + ": " + m.gg + " giornate, massimo " + def.max[cl] + " per missione (Tabella 1).");
        });
        if (somma !== num(s.gg_senior) + num(s.gg_junior))
          out.errori.push("Missioni B2B: le giornate delle singole missioni (" + somma + ") non coincidono con senior + junior (" + (num(s.gg_senior) + num(s.gg_junior)) + ").");
      }
      if (k === "dig") max = def.max[cl] * Math.max(num(s.mesi), 1);
      const gg = sen + jun;
      const attivo = def.obbl || gg > 0;
      if (def.obbl && gg === 0) out.errori.push(def.nome + ": servizio obbligatorio senza giornate (art. 7).");
      if (gg > max) out.errori.push(def.nome + ": " + gg + " giornate, massimo " + max + " per la classe (Tabella 1, art. 7).");
      if (def.soloSenior && jun > 0) out.errori.push(def.nome + ": deve essere svolto da un senior (art. 6 c. 4).");
      const costo = sen * REGOLE.tariffe.senior + jun * REGOLE.tariffe.junior;
      out.righe.push({ k, nome: def.nome, attivo, sen, jun, gg, max, costo });
      out.spesa += costo; out.giornate += gg;
    }
    out.contributo = Math.min(out.spesa * REGOLE.intensita, REGOLE.contributoMax);
    if (out.spesa < REGOLE.spesaMinima) out.errori.push("Spesa € " + fmt(out.spesa) + " sotto la spesa minima di € 12.500 (art. 3).");
    if (out.spesa * REGOLE.intensita > REGOLE.contributoMax) out.avvisi.push("Spesa oltre € 75.000: il contributo resta fermo a € 60.000 e l'eccedenza è a carico dell'impresa.");
    out.cofinanziamento = out.spesa - out.contributo;
    return out;
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  const api = { REGOLE, calcola, fmt };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TEMRegole = api;
})(this);
