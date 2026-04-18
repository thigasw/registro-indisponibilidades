const circuitosDisponiveis = [
    "Eletronet - FLA-ITZ/AEI/GETH/001", "Eletronet - BSA-BRE/AEI/GETH/001",
    "Tim Belem - TESADIP351465", "Tim Manuas - TESADIP351465",
    "Telebras - PATX000031", "Eletronet - BSA-BSA/AEI/GETH/001",
    "BR DIGITAL - VTA53008600425", "CONECTINFO - CNT&CT17316_VTAXSP4",
    "Eletronet - BRE-ARN/AEI/GETH/001"
];

let registros = JSON.parse(localStorage.getItem('registros_coelho')) || [];

// Popular selects de circuitos
const popularCircuitos = () => {
    const selects = [document.getElementById('filterCircuito'), document.getElementById('inputCircuito')];
    selects.forEach(sel => {
        circuitosDisponiveis.forEach(c => {
            const opt = new Option(c, c);
            sel.add(opt);
        });
    });
};

// Cálculo de tempo
function calcularDiferenca(inicio, fim) {
    const start = new Date(`2000-01-01T${inicio}:00`);
    const end = new Date(`2000-01-01T${fim}:00`);
    let diff = (end - start) / 1000 / 60; // em minutos
    if (diff < 0) diff += 1440; // Ajuste 24h
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
}

// Renderizar Tabela com Filtros
function renderizarTabela() {
    const tbody = document.getElementById('registroTableBody');
    const fCircuito = document.getElementById('filterCircuito').value;
    const fStatus = document.getElementById('filterStatus').value;
    const fData = document.getElementById('filterData').value;
    const fProt = document.getElementById('filterProtocolo').value.toLowerCase();

    tbody.innerHTML = '';

    const filtrados = registros.filter(r => {
        return (!fCircuito || r.circuito === fCircuito) &&
               (!fStatus || r.status === fStatus) &&
               (!fData || r.data === fData) &&
               (!fProt || r.protOp.toLowerCase().includes(fProt) || r.protCoelho.toLowerCase().includes(fProt));
    });

    filtrados.forEach((r, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${r.circuito}</td>
            <td style="color: ${r.status === 'Concluído' ? '#00ff00' : '#ff4444'}">${r.status}</td>
            <td>${r.protOp}</td>
            <td>${r.protCoelho}</td>
            <td>${r.data.split('-').reverse().join('/')}</td>
            <td>${r.inicio}</td>
            <td>${r.fim}</td>
            <td>${calcularDiferenca(r.inicio, r.fim)}</td>
            <td><button onclick="remover(${index})">🗑️</button></td>
        `;
    });
}

// Modal logic
const modal = document.getElementById('modalRegistro');
document.getElementById('addRecordBtn').onclick = () => modal.style.display = 'flex';
document.getElementById('closeModal').onclick = () => modal.style.display = 'none';

// Salvar Registro
document.getElementById('formRegistro').onsubmit = (e) => {
    e.preventDefault();
    const novo = {
        circuito: document.getElementById('inputCircuito').value,
        status: document.getElementById('inputStatus').value,
        protOp: document.getElementById('inputProtOperadora').value,
        protCoelho: document.getElementById('inputProtCoelho').value,
        data: document.getElementById('inputData').value,
        inicio: document.getElementById('inputInicio').value,
        fim: document.getElementById('inputFim').value
    };
    registros.push(novo);
    localStorage.setItem('registros_coelho', JSON.stringify(registros));
    renderizarTabela();
    modal.style.display = 'none';
    e.target.reset();
};

function remover(idx) {
    if(confirm("Deseja excluir este registro?")) {
        registros.splice(idx, 1);
        localStorage.setItem('registros_coelho', JSON.stringify(registros));
        renderizarTabela();
    }
}

// Exportar CSV
function exportarCSV() {
    let csv = "Circuito;Status;Protocolo Operadora;Protocolo Coelho;Data;Inicio;Fim;Tempo Total\n";
    registros.forEach(r => {
        csv += `${r.circuito};${r.status};${r.protOp};${r.protCoelho};${r.data};${r.inicio};${r.fim};${calcularDiferenca(r.inicio, r.fim)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio_indisponibilidade.csv";
    link.click();
}

window.onload = () => { popularCircuitos(); renderizarTabela(); };