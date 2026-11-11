"use strict";

const fields = [
  ["invest", "Investimento mensal", 0, 100000, 100, 5000, "R$"],
  ["cpl", "Custo por lead", 1, 200, 1, 25, "R$"],
  ["ag", "Taxa de agendamento", 0, 100, 1, 30, "%"],
  ["comp", "Taxa de comparecimento", 0, 100, 1, 65, "%"],
  ["conv", "Taxa de conversão", 0, 100, 1, 20, "%"],
  ["ticket", "Ticket médio", 0, 300000, 500, 25000, "R$"],
  ["margin", "% Lucro/Faturamento", 0, 100, 1, 0, "%"]
];
const capacities = { sdrCapacity: 750, closerCapacity: 90 };

function calculate({ invest, cpl, ag, comp, conv, ticket, margin = 0, sdrCapacity, closerCapacity }) {
  const leads = Math.floor(invest / cpl);
  const appointments = Math.floor(leads * ag / 100);
  const meetings = Math.floor(appointments * comp / 100);
  const sales = Math.floor(meetings * conv / 100);
  const revenue = sales * ticket;
  return {
    leads, appointments, meetings, sales, revenue,
    profit: revenue * margin / 100,
    cpa: appointments ? invest / appointments : null,
    costMeeting: meetings ? invest / meetings : null,
    cac: sales ? invest / sales : null,
    roas: invest ? revenue / invest : null,
    net: revenue - invest,
    sdrCount: Math.ceil(leads / sdrCapacity),
    closerCount: Math.ceil(meetings / closerCapacity)
  };
}

if (typeof document === "undefined") {
  module.exports = { calculate };
} else {
  init();
}

function init() {
  const byId = id => document.getElementById(id);
  const number = new Intl.NumberFormat("pt-BR");
  const money = new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 0
  });
  const ratio = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const valueOf = input => clamp(input.valueAsNumber || 0, Number(input.min), Number(input.max));
  const label = (value, unit) => unit === "%" ? number.format(value) + "%" : money.format(value);

  byId("fields").innerHTML = fields.map(([id, name, min, max, step, initial, unit]) => `
    <div class="field">
      <div class="field-head"><label for="${id}">${name}</label><div class="step-controls">
        <button class="step" type="button" aria-label="Diminuir ${name.toLowerCase()}">−</button>
        <div class="number-wrap">${unit === "R$" ? "<span>R$</span>" : ""}
          <input type="number" id="${id}" min="${min}" max="${max}" step="any" value="${initial}" inputmode="decimal">
          ${unit === "%" ? "<span>%</span>" : ""}
        </div>
        <button class="step" type="button" aria-label="Aumentar ${name.toLowerCase()}">+</button>
      </div></div>
      <input id="${id}Range" type="range" aria-label="Ajustar ${name.toLowerCase()}" min="${min}" max="${max}" step="${step}" value="${initial}">
      <div class="range-labels"><span>${label(min, unit)}</span><span>${label(max, unit)}</span></div>
    </div>`).join("");

  function render() {
    const input = Object.fromEntries(fields.map(([id]) => [id, valueOf(byId(id))]));
    for (const id of Object.keys(capacities)) input[id] = valueOf(byId(id));
    const result = calculate(input);
    const metrics = ["revenue", "profit", "net", "cpa", "costMeeting", "cac"];
    for (const id of metrics) byId(id).textContent = result[id] === null ? "—" : money.format(result[id]);
    for (const id of ["sales", "sdrCount", "closerCount"]) byId(id).textContent = number.format(result[id]);
    byId("ticketLabel").textContent = money.format(input.ticket);
    byId("roas").textContent = result.roas === null ? "—" : ratio.format(result.roas) + "×";
    const stages = [["Leads", result.leads], ["Agendamentos", result.appointments],
      ["Comparecimentos", result.meetings], ["Vendas", result.sales]];
    byId("funnel").innerHTML = stages.map(([name, count]) => `
      <div class="funnel-row"><span>${name}</span><div class="bar-track">
      <div class="bar" style="width:${result.leads ? count / result.leads * 100 : 0}%"></div>
      </div><b>${number.format(count)}</b></div>`).join("");
    byId("announcement").textContent = `Faturamento projetado: ${money.format(result.revenue)}. Lucro projetado: ${money.format(result.profit)}. ${result.sales} vendas.`;
  }

  function sync(id) {
    const input = byId(id);
    const range = byId(id + "Range");
    const value = valueOf(input);
    range.value = value;
    const fill = (value - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
    range.style.setProperty("--fill", fill + "%");
  }

  for (const [id, , min, max, step] of fields) {
    const input = byId(id);
    const range = byId(id + "Range");
    function update() {
      sync(id);
      render();
    }
    input.addEventListener("input", update);
    input.addEventListener("change", () => {
      input.value = valueOf(input);
      update();
    });
    range.addEventListener("input", () => {
      input.value = range.value;
      update();
    });
    const [minus, plus] = input.closest(".step-controls").querySelectorAll("button");
    for (const [button, direction] of [[minus, -1], [plus, 1]]) {
      button.addEventListener("click", () => {
        input.value = clamp(valueOf(input) + direction * step, min, max);
        update();
      });
    }
    sync(id);
  }

  for (const id of Object.keys(capacities)) {
    const input = byId(id);
    input.addEventListener("input", render);
    input.addEventListener("change", () => {
      input.value = valueOf(input);
      render();
    });
  }

  byId("calculator").addEventListener("submit", event => event.preventDefault());
  byId("reset").addEventListener("click", () => {
    for (const [id, , , , , initial] of fields) {
      byId(id).value = initial;
      sync(id);
    }
    for (const [id, initial] of Object.entries(capacities)) byId(id).value = initial;
    render();
  });
  render();
}
