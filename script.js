// Configuração do webhook N8N
const N8N_WEBHOOK = 'https://n8n.srv1025988.hstgr.cloud/webhook/fluxpay';

// Elementos do DOM
const form = document.getElementById('paymentForm');
const telefoneInput = document.getElementById('telefone');
const valorInput = document.getElementById('valor');
const submitBtn = form.querySelector('.submit-btn');
const responseMessage = document.getElementById('responseMessage');

// Elementos das métricas
const investidoEl = document.getElementById('investido');
const faturadoEl = document.getElementById('faturado');
const roasEl = document.getElementById('roas');
const lucroEl = document.getElementById('lucro');

// Formatação de moeda
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// Formatação de ROAS
function formatarROAS(investido, faturado) {
    if (investido === 0) return '0.00x';
    const roas = faturado / investido;
    return roas.toFixed(2) + 'x';
}

// Máscara de telefone
telefoneInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length <= 11) {
        if (value.length <= 2) {
            e.target.value = value;
        } else if (value.length <= 6) {
            e.target.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        } else if (value.length <= 10) {
            e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
        } else {
            e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
        }
    }
});

// Máscara de valor (moeda)
valorInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value === '') {
        e.target.value = '';
        return;
    }
    
    value = (parseInt(value) / 100).toFixed(2);
    e.target.value = 'R$ ' + value.replace('.', ',');
});

// Função para exibir mensagem
function exibirMensagem(mensagem, tipo) {
    responseMessage.textContent = mensagem;
    responseMessage.className = `response-message ${tipo}`;
    responseMessage.classList.remove('hidden');
}

// Função para atualizar o dashboard
function atualizarDashboard(data) {
    const investido = parseFloat(data.investido) || 0;
    const faturado = parseFloat(data.faturamentoTotal) || 0;
    const lucro = parseFloat(data.lucro) || 0;
    
    investidoEl.textContent = formatarMoeda(investido);
    faturadoEl.textContent = formatarMoeda(faturado);
    roasEl.textContent = formatarROAS(investido, faturado);
    lucroEl.textContent = formatarMoeda(lucro);
    
    [investidoEl, faturadoEl, roasEl, lucroEl].forEach(el => {
        el.style.animation = 'none';
        setTimeout(() => {
            el.style.animation = 'fadeIn 0.5s ease';
        }, 10);
    });
}

// Função para enviar dados ao N8N
async function enviarDados(telefone, valor) {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    const valorLimpo = parseFloat(valor.replace('R$ ', '').replace(',', '.'));
    
    try {
        const response = await fetch(N8N_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telefone: telefoneLimpo,
                valor: valorLimpo
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'ok') {
            exibirMensagem(data.mensagem || 'Pagamento registrado com sucesso!', 'success');
            atualizarDashboard(data);
            form.reset();
        } else {
            exibirMensagem(data.mensagem || 'Erro ao processar pagamento.', 'error');
        }
        
    } catch (error) {
        console.error('Erro ao enviar dados:', error);
        exibirMensagem('Erro ao conectar com o servidor. Verifique sua conexão.', 'error');
    }
}

// Event listener do formulário
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const telefone = telefoneInput.value;
    const valor = valorInput.value;
    
    if (!telefone || !valor) {
        exibirMensagem('Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    const textoOriginal = submitBtn.textContent;
    submitBtn.textContent = 'Enviando';
    
    await enviarDados(telefone, valor);
    
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.textContent = textoOriginal;
});

// Verificar se a logo existe, senão criar placeholder
window.addEventListener('load', function() {
    const logo = document.getElementById('logo');
    
    logo.onerror = function() {
        const logoSection = document.querySelector('.logo-section');
        logoSection.innerHTML = '<h1 style="color: #00bcd4; font-size: 2.5rem; font-weight: 700;">FluxPay</h1>';
    };
});
