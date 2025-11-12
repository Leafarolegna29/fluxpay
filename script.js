// Webhook Configuration
const WEBHOOK_URL = 'https://auto-n8n.1bda3o.easypanel.host/webhook-test/submit/conversion/noiva-inteligente';

// Plan Configuration
const PLANOS = {
    basico: { nome: 'Básico', valor: 10.00 },
    premium: { nome: 'Premium', valor: 19.90 }
};

// State Management
let isSubmitting = false;
let pollingInterval = null;

// DOM Elements
const form = document.getElementById('paymentForm');
const telefoneInput = document.getElementById('telefone');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');

// Metrics Elements
const investidoEl = document.getElementById('investido');
const faturadoEl = document.getElementById('faturado');
const roasEl = document.getElementById('roas');
const lucroEl = document.getElementById('lucro');

// Toast Notification System
function showToast(type, title, description) {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconSvg = type === 'success' 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    
    toast.innerHTML = `
        <div class="toast-icon" style="color: ${type === 'success' ? 'var(--success)' : 'var(--error)'}">
            ${iconSvg}
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${description ? `<div class="toast-description">${description}</div>` : ''}
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Format Currency
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Update Metrics with Animation
function updateMetrics(data) {
    const investido = data.investido || 0;
    const faturado = data.faturado || 0;
    const roas = data.roas || 0;
    const lucro = data.lucro || 0;

    // Trigger animation by adding class
    [investidoEl, faturadoEl, roasEl, lucroEl].forEach(el => {
        el.style.animation = 'none';
        setTimeout(() => {
            el.style.animation = 'fadeInUp 0.8s ease-out';
        }, 10);
    });

    investidoEl.textContent = formatCurrency(investido);
    faturadoEl.textContent = formatCurrency(faturado);
    roasEl.textContent = `${roas.toFixed(2)}x`;
    lucroEl.textContent = formatCurrency(lucro);
}

// Fetch Metrics from Webhook
async function fetchMetrics() {
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateMetrics(data);
            console.log('Métricas atualizadas:', data);
        }
    } catch (error) {
        console.error('Erro ao buscar métricas:', error);
    }
}

// Handle Phone Input (only numbers)
telefoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

// Handle Form Submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    const telefone = telefoneInput.value.trim();
    const planoSelected = document.querySelector('input[name="plano"]:checked').value;

    // Validation
    if (!telefone || telefone.length < 13) {
        showToast('error', 'Erro de Validação', 'Por favor, insira um telefone válido no formato 55xxxxxxxxxxx');
        return;
    }

    // Prepare payload
    const payload = {
        telefone: telefone,
        produto: 'guia_noiva_inteligente',
        plano: planoSelected,
        valor: PLANOS[planoSelected].valor
    };

    // Update button state
    isSubmitting = true;
    submitBtn.disabled = true;
    btnText.innerHTML = '<span class="spinner"></span> Processando...';

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast('success', 'Pagamento Registrado', 'O pagamento foi registrado com sucesso!');
            
            // Reset form
            telefoneInput.value = '';
            document.querySelector('input[name="plano"][value="premium"]').checked = true;
            
            // Refresh metrics after 1 second
            setTimeout(() => {
                fetchMetrics();
            }, 1000);
        } else {
            showToast('error', 'Erro ao Registrar', 'Não foi possível registrar o pagamento. Tente novamente.');
        }
    } catch (error) {
        console.error('Erro ao enviar pagamento:', error);
        showToast('error', 'Erro de Conexão', 'Verifique sua internet e tente novamente.');
    } finally {
        // Reset button state
        isSubmitting = false;
        submitBtn.disabled = false;
        btnText.innerHTML = 'Enviar Pagamento';
    }
});

// Initialize Dashboard
function initDashboard() {
    console.log('FluxPay Dashboard Inicializado');
    
    // Fetch initial metrics
    fetchMetrics();
    
    // Setup polling every 5 minutes (300000ms)
    pollingInterval = setInterval(() => {
        console.log('Atualizando métricas automaticamente...');
        fetchMetrics();
    }, 300000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
});

// Start the dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
