//Caso tenha um novo circuito ou tiver a remoção de um  atualizar a const circuitos 
const CIRCUITOS = [
  "Eletronet - FLA-ITZ/AEI/GETH/001",
  "Eletronet - BSA-BRE/AEI/GETH/001",
  "Eletronet - BSA-BSA/AEI/GETH/001",
  "Eletronet - BRE-ARN/AEI/GETH/001",
  "Tim Belem - TESADIP351465",
  "Tim Manuas - TESADIP351465",
  "Telebras - PATX000031",
  "BR DIGITAL - VTA53008600425",
  "CONECTINFO - CNT&CT17316_VTAXSP4"
];


const COR_CIRCUITO = [
  "#2563b8","#1b5091","#0f6e56","#854F0B",
  "#7a1d5e","#993C1D","#163e6e","#3B6D11","#5c6580"
];

let registros = [];
let charts    = {};    
let barMode   = "tempo"; 



document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
  popularFiltroCircuito();
  atualizarDashboard();
});

function carregarDados() {
  registros = JSON.parse(localStorage.getItem("registros_circuitos") || "[]");
}

function popularFiltroCircuito() {
  const sel = document.getElementById("filtroCircuitoDash");
  CIRCUITOS.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c.length > 38 ? c.slice(0, 36) + "…" : c;
    sel.appendChild(opt);
  });
}


function getFiltrados() {
  carregarDados(); 
  const periodo  = document.getElementById("filtroPeriodo").value;
  const circuito = document.getElementById("filtroCircuitoDash").value;
  const status   = document.getElementById("filtroStatusDash").value;
  const agora    = new Date();

  return registros.filter(r => {
    
    if (periodo !== "todos") {
      const dias   = parseInt(periodo);
      const inicio = new Date(r.inicio);
      const diff   = (agora - inicio) / 86400000;
      if (isNaN(diff) || diff > dias) return false;
    }
    
    if (circuito && r.circuito !== circuito) return false;
    
    if (status && r.status !== status) return false;
    return true;
  });
}

function calcularPorCircuito(lista) {
  const mapa = {};
  lista.forEach(r => {
    if (!mapa[r.circuito]) {
      mapa[r.circuito] = { qtd: 0, totalMs: 0, abertos: 0 };
    }
    mapa[r.circuito].qtd++;
    mapa[r.circuito].totalMs += r.duracaoMs || 0;
    if (r.status === "Em Aberto") mapa[r.circuito].abertos++;
  });
  return Object.entries(mapa)
    .map(([circ, d]) => ({ circ, ...d }))
    .sort((a, b) => b.totalMs - a.totalMs);
}

function calcularPorDia(lista) {
  const mapa = {};
  lista.forEach(r => {
    const dia = r.inicio ? r.inicio.slice(0, 10) : null;
    if (!dia) return;
    mapa[dia] = (mapa[dia] || 0) + 1;
  });
 
  return Object.entries(mapa)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, qtd]) => ({ data, qtd }));
}

function calcularPorSemana(lista) {
  const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const contagem = Array(7).fill(0);
  lista.forEach(r => {
    if (!r.inicio) return;
    const d = new Date(r.inicio).getDay();
    contagem[d]++;
  });
  return { labels: dias, data: contagem };
}

function calcularPorHora(lista) {
  const contagem = Array(24).fill(0);
  lista.forEach(r => {
    if (!r.inicio) return;
    const h = new Date(r.inicio).getHours();
    if (!isNaN(h)) contagem[h]++;
  });
  return {
    labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,"0")}h`),
    data: contagem
  };
}

function atualizarDashboard() {
  const lista = getFiltrados();
  atualizarPeriodoLabel();
  atualizarKPIs(lista);
  renderBarCircuito(lista);
  renderDonutStatus(lista);
  renderLinha(lista);
  renderSemana(lista);
  renderHora(lista);
  renderRanking(lista);
}

function atualizarPeriodoLabel() {
  const sel = document.getElementById("filtroPeriodo");
  const txt = sel.options[sel.selectedIndex].text;
  const el  = document.getElementById("periodoLabel");
  const agora = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" });
  if (el) el.textContent = `Atualizado em ${agora}  ·  ${txt}`;
}

function atualizarKPIs(lista) {
  const total     = lista.length;
  const abertos   = lista.filter(r => r.status === "Em Aberto").length;
  const concluidos= lista.filter(r => r.status === "Concluído").length;
  const totalMs   = lista.reduce((acc, r) => acc + (r.duracaoMs || 0), 0);
  const mediaMs   = total > 0 ? totalMs / total : 0;

  const porCirc   = calcularPorCircuito(lista);
  const piorCirc  = porCirc.length > 0 ? porCirc[0].circ : "—";
  const piorNome  = piorCirc.length > 30 ? piorCirc.slice(0, 28) + "…" : piorCirc;

  setText("kpiTotal",     total);
  setText("kpiAbertos",   abertos);
  setText("kpiConcluidos",concluidos);
  setText("kpiTempo",     formatarDuracao(totalMs));
  setText("kpiPior",      piorNome);
  setText("kpiMedia",     formatarDuracao(mediaMs));
}

const CHART_DEFAULTS = {
  font: { family: "'DM Sans', sans-serif", size: 12 },
  color: "#8a93aa"
};

Chart.defaults.font.family = CHART_DEFAULTS.font.family;
Chart.defaults.font.size   = CHART_DEFAULTS.font.size;
Chart.defaults.color       = CHART_DEFAULTS.color;

function destruir(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}


function renderBarCircuito(lista) {
  destruir("barCircuito");
  const porCirc  = calcularPorCircuito(lista);
  if (porCirc.length === 0) { desenharVazio("chartBarCircuito"); return; }

  const labels = porCirc.map(d => abreviarCircuito(d.circ));
  const data   = barMode === "tempo"
    ? porCirc.map(d => +(d.totalMs / 3600000).toFixed(2))
    : porCirc.map(d => d.qtd);

  const cores = porCirc.map((_, i) => COR_CIRCUITO[i % COR_CIRCUITO.length]);

  const ctx = document.getElementById("chartBarCircuito").getContext("2d");
  charts["barCircuito"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: barMode === "tempo" ? "Horas" : "Eventos",
        data,
        backgroundColor: cores.map(c => c + "cc"),
        borderColor: cores,
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => barMode === "tempo"
              ? ` ${ctx.parsed.x}h de indisponibilidade`
              : ` ${ctx.parsed.x} evento(s)`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: "#eef0f5" },
          ticks: { font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

function renderDonutStatus(lista) {
  destruir("donutStatus");
  const abertos    = lista.filter(r => r.status === "Em Aberto").length;
  const concluidos = lista.filter(r => r.status === "Concluído").length;

  if (lista.length === 0) { desenharVazio("chartDonutStatus"); return; }

  const ctx = document.getElementById("chartDonutStatus").getContext("2d");
  charts["donutStatus"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Em Aberto", "Concluído"],
      datasets: [{
        data: [abertos, concluidos],
        backgroundColor: ["#fff7e6", "#eaf6ed"],
        borderColor:     ["#e08c00", "#2e9e4f"],
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, padding: 14, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} evento(s)`
          }
        }
      }
    }
  });
}

function renderLinha(lista) {
  destruir("linhaEventos");
  const porDia = calcularPorDia(lista);
  if (porDia.length === 0) { desenharVazio("chartLinha"); return; }

  const labels = porDia.map(d => formatarDataCurta(d.data));
  const data   = porDia.map(d => d.qtd);

  const ctx = document.getElementById("chartLinha").getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, "rgba(37,99,184,.25)");
  grad.addColorStop(1, "rgba(37,99,184,.01)");

  charts["linhaEventos"] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Eventos",
        data,
        fill: true,
        backgroundColor: grad,
        borderColor: "#2563b8",
        borderWidth: 2,
        pointBackgroundColor: "#2563b8",
        pointRadius: data.length > 60 ? 0 : 4,
        pointHoverRadius: 6,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} evento(s)` } }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 14, font: { size: 11 }, maxRotation: 30 }
        },
        y: {
          beginAtZero: true,
          grid: { color: "#eef0f5" },
          ticks: { precision: 0, font: { size: 11 } }
        }
      }
    }
  });
}

function renderSemana(lista) {
  destruir("barSemana");
  const { labels, data } = calcularPorSemana(lista);

  const ctx = document.getElementById("chartSemana").getContext("2d");
  charts["barSemana"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Eventos",
        data,
        backgroundColor: data.map((v, i) => {
          const max = Math.max(...data);
          return v === max ? "#2563b8cc" : "#2563b830";
        }),
        borderColor: data.map((v, i) => {
          const max = Math.max(...data);
          return v === max ? "#2563b8" : "#2563b860";
        }),
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        y: { beginAtZero: true, grid: { color: "#eef0f5" }, ticks: { precision: 0, font: { size: 11 } } }
      }
    }
  });
}

function renderHora(lista) {
  destruir("barHora");
  const { labels, data } = calcularPorHora(lista);

  const ctx = document.getElementById("chartHora").getContext("2d");
  charts["barHora"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Eventos",
        data,
        backgroundColor: data.map(v => {
          const max = Math.max(...data);
          return v === max ? "#993C1Dcc" : "#993C1D22";
        }),
        borderColor: data.map(v => {
          const max = Math.max(...data);
          return v === max ? "#993C1D" : "#993C1D55";
        }),
        borderWidth: 1.5,
        borderRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: "#eef0f5" }, ticks: { precision: 0, font: { size: 11 } } }
      }
    }
  });
}

function desenharVazio(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#b4bace";
  ctx.font      = "13px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Sem dados para o período selecionado", canvas.width / 2, canvas.height / 2);
}

function alternarBarMode(modo) {
  barMode = modo;
  document.getElementById("btnBarTempo").classList.toggle("active", modo === "tempo");
  document.getElementById("btnBarQtd").classList.toggle("active",   modo === "qtd");
  renderBarCircuito(getFiltrados());
}

function renderRanking(lista) {
  const porCirc  = calcularPorCircuito(lista);
  const maxMs    = porCirc.length > 0 ? porCirc[0].totalMs : 1;
  const tbody    = document.getElementById("rankingBody");
  tbody.innerHTML = "";

  if (porCirc.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#b4bace">Nenhum dado disponível</td></tr>`;
    return;
  }

  porCirc.forEach((d, i) => {
    const pos     = i + 1;
    const rankCls = pos === 1 ? "rank-1" : pos === 2 ? "rank-2" : pos === 3 ? "rank-3" : "rank-n";
    const pct     = maxMs > 0 ? ((d.totalMs / maxMs) * 100).toFixed(1) : 0;
    const media   = d.qtd > 0 ? formatarDuracao(d.totalMs / d.qtd) : "—";
    const cor     = COR_CIRCUITO[(i) % COR_CIRCUITO.length];

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="rank-num ${rankCls}">${pos}</span></td>
      <td class="rank-circuit">${escapeHtml(d.circ)}</td>
      <td style="font-family:var(--font-mono);font-size:13px">${d.qtd}</td>
      <td style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--brand-700)">${formatarDuracao(d.totalMs)}</td>
      <td style="font-family:var(--font-mono);font-size:12px;color:var(--gray-500)">${media}</td>
      <td>${d.abertos > 0 ? `<span class="rank-badge-open">${d.abertos}</span>` : "—"}</td>
      <td class="rank-bar-wrap">
        <div class="rank-bar-track">
          <div class="rank-bar-fill" style="width:${pct}%;background:${cor}"></div>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

function gerarRelatorio() {
  const lista    = getFiltrados();
  const porCirc  = calcularPorCircuito(lista);
  const total    = lista.length;
  const abertos  = lista.filter(r => r.status === "Em Aberto").length;
  const concl    = lista.filter(r => r.status === "Concluído").length;
  const totalMs  = lista.reduce((acc, r) => acc + (r.duracaoMs || 0), 0);
  const mediaMs  = total > 0 ? totalMs / total : 0;
  const piorCirc = porCirc.length > 0 ? porCirc[0] : null;

  const agora    = new Date();
  const dataGer  = agora.toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });
  const horaGer  = agora.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });

  const periodoEl = document.getElementById("filtroPeriodo");
  const periodTxt = periodoEl.options[periodoEl.selectedIndex].text;

  const alertas = [];
  if (abertos > 0) alertas.push(`⚠ Existem <strong>${abertos} evento(s) em aberto</strong> que ainda não foram concluídos.`);
  if (piorCirc && piorCirc.abertos > 0) alertas.push(`⚠ O circuito <strong>${abreviarCircuito(piorCirc.circ)}</strong> possui ${piorCirc.abertos} ocorrência(s) ainda em aberto.`);
  if (totalMs > 0 && mediaMs > 3600000 * 4) alertas.push(`⚠ O tempo médio por evento (${formatarDuracao(mediaMs)}) está acima de 4h — avalie os SLAs.`);

  const { labels: diasNomes, data: diasData } = calcularPorSemana(lista);
  const maxDiaVal  = Math.max(...diasData);
  const maxDiaIdx  = diasData.indexOf(maxDiaVal);
  const piorDia    = maxDiaVal > 0 ? diasNomes[maxDiaIdx] : null;

  const { data: horasData } = calcularPorHora(lista);
  const maxHoraVal = Math.max(...horasData);
  const maxHoraIdx = horasData.indexOf(maxHoraVal);
  const piorHora   = maxHoraVal > 0 ? `${String(maxHoraIdx).padStart(2,"0")}h` : null;

  let conclusao = "";
  if (total === 0) {
    conclusao = "Não foram encontrados registros de indisponibilidade para o período e filtros selecionados.";
  } else {
    conclusao = `No período analisado (<strong>${periodTxt}</strong>), foram registrados <strong>${total} evento(s)</strong> de indisponibilidade, `;
    conclusao += `acumulando <strong>${formatarDuracao(totalMs)}</strong> de indisponibilidade total com tempo médio de <strong>${formatarDuracao(mediaMs)}</strong> por ocorrência. `;
    if (piorCirc) conclusao += `O circuito mais impactado foi <strong>${abreviarCircuito(piorCirc.circ)}</strong>, com ${piorCirc.qtd} evento(s) e ${formatarDuracao(piorCirc.totalMs)} de indisponibilidade acumulada. `;
    if (piorDia)  conclusao += `O dia da semana com maior incidência foi <strong>${piorDia}</strong>${piorHora ? `, com pico de ocorrências às <strong>${piorHora}</strong>` : ""}. `;
    if (abertos === 0) conclusao += "Todos os eventos estão concluídos.";
    else conclusao += `<strong>${abertos} evento(s)</strong> ainda permanecem em aberto e requerem atenção.`;
  }
  const linhasCircuito = porCirc.slice(0, 10).map((d, i) => `
    <tr>
      <td>${i + 1}º</td>
      <td>${escapeHtml(d.circ)}</td>
      <td>${d.qtd}</td>
      <td>${formatarDuracao(d.totalMs)}</td>
      <td>${d.qtd > 0 ? formatarDuracao(d.totalMs / d.qtd) : "—"}</td>
      <td>${d.abertos > 0 ? d.abertos : "—"}</td>
    </tr>`).join("");

  const ultimos = [...lista]
    .sort((a, b) => new Date(b.inicio) - new Date(a.inicio))
    .slice(0, 10);

  const linhasEventos = ultimos.map(r => `
    <tr>
      <td>${escapeHtml(abreviarCircuito(r.circuito))}</td>
      <td>${r.status === "Concluído" ? "✔ Concluído" : "⏳ Em Aberto"}</td>
      <td>${formatarDataHora(r.inicio)}</td>
      <td>${formatarDataHora(r.fim)}</td>
      <td>${r.duracao || "—"}</td>
    </tr>`).join("");

  const html = `
    <div class="rel-header">
      <div>
        <h1>Relatório de Indisponibilidade</h1>
        <p>Coelho Tecnologia — NOC / Monitoramento</p>
      </div>
      <div class="rel-meta">
        Gerado em: ${dataGer} às ${horaGer}<br>
        Período: ${periodTxt}<br>
        Total de registros: ${registros.length}
      </div>
    </div>

    ${alertas.length > 0 ? `
    <div class="rel-section">
      <h2>Alertas</h2>
      ${alertas.map(a => `<div class="rel-alerta">${a}</div>`).join("")}
    </div>` : ""}

    <div class="rel-section">
      <h2>Resumo Executivo</h2>
      <div class="rel-kpi-grid">
        <div class="rel-kpi">
          <div class="rel-kpi-label">Total de Eventos</div>
          <div class="rel-kpi-value">${total}</div>
        </div>
        <div class="rel-kpi">
          <div class="rel-kpi-label">Em Aberto</div>
          <div class="rel-kpi-value">${abertos}</div>
        </div>
        <div class="rel-kpi">
          <div class="rel-kpi-label">Concluídos</div>
          <div class="rel-kpi-value">${concl}</div>
        </div>
        <div class="rel-kpi">
          <div class="rel-kpi-label">Tempo Total</div>
          <div class="rel-kpi-value">${formatarDuracao(totalMs)}</div>
        </div>
        <div class="rel-kpi">
          <div class="rel-kpi-label">Tempo Médio</div>
          <div class="rel-kpi-value">${formatarDuracao(mediaMs)}</div>
        </div>
        <div class="rel-kpi">
          <div class="rel-kpi-label">Circuitos Afetados</div>
          <div class="rel-kpi-value">${porCirc.length}</div>
        </div>
      </div>
    </div>

    ${porCirc.length > 0 ? `
    <div class="rel-section">
      <h2>Ranking por Circuito</h2>
      <table class="rel-table">
        <thead>
          <tr>
            <th>Pos.</th><th>Circuito</th><th>Eventos</th>
            <th>Tempo Total</th><th>Tempo Médio</th><th>Em Aberto</th>
          </tr>
        </thead>
        <tbody>${linhasCircuito}</tbody>
      </table>
    </div>` : ""}

    ${ultimos.length > 0 ? `
    <div class="rel-section">
      <h2>Últimas Ocorrências (até 10)</h2>
      <table class="rel-table">
        <thead>
          <tr><th>Circuito</th><th>Status</th><th>Início</th><th>Fim</th><th>Duração</th></tr>
        </thead>
        <tbody>${linhasEventos}</tbody>
      </table>
    </div>` : ""}

    <div class="rel-section">
      <h2>Análise e Conclusão</h2>
      <div class="rel-conclusao">${conclusao}</div>
    </div>
  `;

  document.getElementById("relatorioConteudo").innerHTML = html;
  document.getElementById("modalRelatorio").style.display = "flex";
}

function fecharRelatorio() {
  document.getElementById("modalRelatorio").style.display = "none";
}

function imprimirRelatorio() {
  window.print();
}

function formatarDuracao(ms) {
  if (!ms || ms <= 0) return "—";
  const totalMin = Math.floor(ms / 60000);
  const h   = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0)   return `${min}min`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}min`;
}

function formatarDataHora(valor) {
  if (!valor) return "—";
  const [data, hora] = valor.split("T");
  if (!data) return valor;
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}${hora ? " " + hora : ""}`;
}

function formatarDataCurta(yyyymmdd) {
  if (!yyyymmdd) return "";
  const [y, m, d] = yyyymmdd.split("-");
  return `${d}/${m}`;
}

function abreviarCircuito(circ) {
  if (!circ) return "—";
  const partes = circ.split(" - ");
  if (partes.length >= 2) {
    const sigla = partes[1].split("/")[0];
    return `${partes[0].split(" ")[0]} · ${sigla}`;
  }
  return circ.length > 28 ? circ.slice(0, 26) + "…" : circ;
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}