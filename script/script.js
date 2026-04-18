

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

let registros = JSON.parse(localStorage.getItem("registros_circuitos") || "[]");
let editandoIndex = -1;




document.addEventListener("DOMContentLoaded", () => {
  popularCircuitos();
  renderizarTabela();
  configurarEventos();
});

function popularCircuitos() {
  const selects = [
    document.getElementById("filterCircuito"),
    document.getElementById("inputCircuito")
  ];
  CIRCUITOS.forEach(c => {
    selects.forEach(sel => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  });
}

function configurarEventos() {
  document.getElementById("addRecordBtn").addEventListener("click", () => abrirModal());
  document.getElementById("closeModal").addEventListener("click", fecharModal);
  document.getElementById("closeModalBtn").addEventListener("click", fecharModal);
  document.getElementById("modalRegistro").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modalRegistro")) fecharModal();
  });
  document.getElementById("formRegistro").addEventListener("submit", salvarRegistro);
  document.getElementById("inputInicio").addEventListener("change", calcularTempo);
  document.getElementById("inputFim").addEventListener("change", calcularTempo);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharModal(); });
}




function abrirModal(index = -1) {
  editandoIndex = index;
  const modal  = document.getElementById("modalRegistro");
  const titulo = document.getElementById("modalTitulo");
  if (index === -1) {
    titulo.textContent = "Novo Registro de Indisponibilidade";
    limparFormulario();
  } else {
    titulo.textContent = "Editar Registro";
    preencherFormulario(registros[index]);
  }
  modal.style.display = "flex";
  setTimeout(() => document.getElementById("inputCircuito").focus(), 220);
}

function fecharModal() {
  document.getElementById("modalRegistro").style.display = "none";
  limparFormulario();
  editandoIndex = -1;
}

function limparFormulario() {
  document.getElementById("formRegistro").reset();
  resetarPreviewTempo();
}

function preencherFormulario(r) {
  document.getElementById("inputCircuito").value      = r.circuito;
  document.getElementById("inputStatus").value        = r.status;
  document.getElementById("inputProtOperadora").value = r.protOperadora;
  document.getElementById("inputProtCoelho").value    = r.protCoelho;
  document.getElementById("inputInicio").value        = r.inicio;
  document.getElementById("inputFim").value           = r.fim;
  calcularTempo();
}



function calcularTempo() {
  const inicioVal = document.getElementById("inputInicio").value;
  const fimVal    = document.getElementById("inputFim").value;
  const preview   = document.getElementById("previewTempo");
  const box       = document.getElementById("tempoPreviewBox");

  if (!inicioVal || !fimVal) { resetarPreviewTempo(); return ""; }

  const ini = new Date(inicioVal);
  const fim = new Date(fimVal);

  if (isNaN(ini) || isNaN(fim)) { resetarPreviewTempo(); return ""; }

  if (fim <= ini) {
    box.className       = "tempo-preview has-error";
    preview.textContent = "O fim deve ser posterior ao início";
    return "";
  }

  const texto         = formatarDuracao(fim - ini);
  box.className       = "tempo-preview has-value";
  preview.textContent = texto;
  return texto;
}

function resetarPreviewTempo() {
  const preview = document.getElementById("previewTempo");
  const box     = document.getElementById("tempoPreviewBox");
  if (preview) preview.textContent = "Preencha início e fim para calcular";
  if (box)     box.className = "tempo-preview";
}

function formatarDuracao(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h   = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0)   return `${min}min`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}min`;
}




function salvarRegistro(e) {
  e.preventDefault();
  const inicioVal = document.getElementById("inputInicio").value;
  const fimVal    = document.getElementById("inputFim").value;

  if (fimVal && inicioVal && new Date(fimVal) <= new Date(inicioVal)) {
    alert("A data/hora de fim deve ser posterior ao início.");
    return;
  }

  const registro = {
    circuito:      document.getElementById("inputCircuito").value,
    status:        document.getElementById("inputStatus").value,
    protOperadora: document.getElementById("inputProtOperadora").value.trim(),
    protCoelho:    document.getElementById("inputProtCoelho").value.trim(),
    inicio:        inicioVal,
    fim:           fimVal,
    duracao:       calcularTempo(),
    duracaoMs:     (fimVal && inicioVal) ? new Date(fimVal) - new Date(inicioVal) : 0,
    criadoEm:      editandoIndex === -1 ? new Date().toISOString() : registros[editandoIndex].criadoEm
  };

  if (editandoIndex === -1) {
    registros.push(registro);
  } else {
    registros[editandoIndex] = registro;
  }

  salvarNoStorage();
  renderizarTabela();
  fecharModal();
}

function excluirRegistro(index) {
  if (!confirm("Deseja excluir este registro permanentemente?")) return;
  registros.splice(index, 1);
  salvarNoStorage();
  renderizarTabela();
}

function salvarNoStorage() {
  localStorage.setItem("registros_circuitos", JSON.stringify(registros));
}



function renderizarTabela() {
  const fCirc = document.getElementById("filterCircuito").value;
  const fStat = document.getElementById("filterStatus").value;
  const fData = document.getElementById("filterData").value;
  const fProt = document.getElementById("filterProtocolo").value.toLowerCase().trim();

  const filtrados = registros
    .map((r, i) => ({ ...r, _index: i }))
    .filter(r => {
      if (fCirc && r.circuito !== fCirc)        return false;
      if (fStat && r.status  !== fStat)         return false;
      if (fData && !r.inicio.startsWith(fData)) return false;
      if (fProt) {
        const matchOp = r.protOperadora.toLowerCase().includes(fProt);
        const matchCo = r.protCoelho.toLowerCase().includes(fProt);
        if (!matchOp && !matchCo)               return false;
      }
      return true;
    });

  montarLinhas(filtrados);
  atualizarRodape(filtrados.length, registros.length);
}

function montarLinhas(lista) {
  const tbody = document.getElementById("registroTableBody");
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">
          <span class="empty-icon">📋</span>
          Nenhum registro encontrado.
        </td>
      </tr>`;
    return;
  }

  lista.forEach(r => {
    const tr = document.createElement("tr");
    tr.classList.add(r.status === "Concluído" ? "status-concluido" : "status-aberto");

    const badgeStatus = r.status === "Concluído"
      ? `<span class="badge-status badge-ok">Concluído</span>`
      : `<span class="badge-status badge-open">Em Aberto</span>`;

    tr.innerHTML = `
      <td>${escapeHtml(r.circuito)}</td>
      <td>${badgeStatus}</td>
      <td>${escapeHtml(r.protOperadora) || "—"}</td>
      <td>${escapeHtml(r.protCoelho)    || "—"}</td>
      <td>${formatarDataHora(r.inicio)}</td>
      <td>${formatarDataHora(r.fim)}</td>
      <td>${escapeHtml(r.duracao)       || "—"}</td>
      <td>
        <button class="btn-acao btn-editar"  onclick="abrirModal(${r._index})">✏ Editar</button>
        <button class="btn-acao btn-excluir" onclick="excluirRegistro(${r._index})">🗑 Excluir</button>
      </td>`;

    tbody.appendChild(tr);
  });
}

function atualizarRodape(exibidos, total) {
  const footer = document.getElementById("tableFooter");
  if (!footer) return;
  if (total === 0) { footer.textContent = "Nenhum registro cadastrado ainda."; return; }
  const abertos    = registros.filter(r => r.status === "Em Aberto").length;
  const concluidos = registros.filter(r => r.status === "Concluído").length;
  footer.textContent = exibidos < total
    ? `Exibindo ${exibidos} de ${total} registros  ·  ${abertos} em aberto  ·  ${concluidos} concluídos`
    : `${total} registro${total !== 1 ? "s" : ""}  ·  ${abertos} em aberto  ·  ${concluidos} concluídos`;
}

function limparFiltros() {
  document.getElementById("filterCircuito").value  = "";
  document.getElementById("filterStatus").value    = "";
  document.getElementById("filterData").value      = "";
  document.getElementById("filterProtocolo").value = "";
  renderizarTabela();
}



function formatarDataHora(valor) {
  if (!valor) return "—";
  const [data, hora] = valor.split("T");
  if (!data) return valor;
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}${hora ? " " + hora : ""}`;
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}




function exportarCSV() {
  if (registros.length === 0) { alert("Nenhum registro para exportar."); return; }

  const cabecalho = ["Circuito","Status","Prot. Operadora","Prot. Coelho","Início","Fim","Tempo Total"];
  const linhas = registros.map(r => [
    escaparCSV(r.circuito),
    escaparCSV(r.status),
    escaparCSV(r.protOperadora),
    escaparCSV(r.protCoelho),
    escaparCSV(formatarDataHora(r.inicio)),
    escaparCSV(formatarDataHora(r.fim)),
    escaparCSV(r.duracao)
  ]);

  const conteudo = [cabecalho, ...linhas].map(l => l.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = `registros_circuitos_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escaparCSV(valor = "") {
  const str = String(valor);
  return (str.includes(";") || str.includes('"') || str.includes("\n"))
    ? `"${str.replace(/"/g, '""')}"` : str;
}