const WEBHOOK_URL = "https://auto-n8n.1bda3o.easypanel.host/webhook-test/submit/conversion/noiva-inteligente";

const form = document.getElementById("paymentForm");
const produto = document.getElementById("produto");
const planoContainer = document.getElementById("planoContainer");
const responseMessage = document.getElementById("responseMessage");

const investido = document.getElementById("investido");
const faturado = document.getElementById("faturado");
const roas = document.getElementById("roas");
const lucro = document.getElementById("lucro");

// Mostrar planos ao selecionar produto
produto.addEventListener("change", () => {
  planoContainer.classList.toggle("hidden", produto.value === "");
});

// Envio do formulário
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const telefone = document.getElementById("telefone").value.trim();
  const planoSelecionado = document.querySelector('input[name="plano"]:checked');
  
  if (!planoSelecionado) {
    mostrarMensagem("Selecione um plano.", "error");
    return;
  }

  const valor = planoSelecionado.dataset.valor;
  const plano = planoSelecionado.value;
  const produtoNome = produto.value;

  const payload = {
    telefone,
    produto: produtoNome,
    plano,
    valor: parseFloat(valor)
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.status === "ok") {
      mostrarMensagem("Pagamento registrado com sucesso!", "success");
      atualizarDashboard(data);
    } else {
      mostrarMensagem("Erro ao registrar pagamento.", "error");
    }
  } catch (err) {
    mostrarMensagem("Erro de conexão com o servidor.", "error");
    console.error(err);
  }
});

function mostrarMensagem(msg, tipo) {
  responseMessage.textContent = msg;
  responseMessage.className = `response-message ${tipo}`;
  responseMessage.classList.remove("hidden");
}

function atualizarDashboard(data) {
  investido.textContent = formatarMoeda(data.investido || 0);
  faturado.textContent = formatarMoeda(data.faturamentoTotal || 0);
  lucro.textContent = formatarMoeda(data.lucro || 0);
  roas.textContent = `${(data.faturamentoTotal / data.investido || 0).toFixed(2)}x`;
}

function formatarMoeda(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Atualização periódica
setInterval(async () => {
  try {
    const res = await fetch(WEBHOOK_URL + "/dados");
    const data = await res.json();
    atualizarDashboard(data);
  } catch (e) { console.warn("Falha ao atualizar dashboard"); }
}, 300000); // 5 minutos
