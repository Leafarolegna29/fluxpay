document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTS ---
    const PRODUCT_NAME = "Guia da Noiva Inteligente";
    const PRODUCT_SLUG = "guia_noiva_inteligente";
    const PLANS = [
      { id: 'basic', name: 'Plano Básico', price: 10.00 },
      { id: 'premium', name: 'Plano Premium', price: 19.90 },
    ];
    const MOCK_WEBHOOK_URL = "https://auto-n8n.1bda3o.easypanel.host/webhook-test/submit/conversion/noiva-inteligente";

    // --- MOCK SERVER STATE ---
    let serverMetrics = {
        invested: 0,
        billed: 0,
        roas: 0,
        dailyProfit: 0,
    };

    // --- DOM ELEMENTS ---
    const elements = {
        investedValue: document.getElementById('invested-value'),
        billedValue: document.getElementById('billed-value'),
        roasValue: document.getElementById('roas-value'),
        profitValue: document.getElementById('profit-value'),
        productName: document.getElementById('product-name'),
        paymentForm: document.getElementById('payment-form'),
        phoneInput: document.getElementById('phone'),
        planSelection: document.getElementById('plan-selection'),
        submitButton: document.getElementById('submit-button'),
        submitButtonContent: document.getElementById('submit-button-content'),
        spinner: document.getElementById('spinner'),
        notificationToast: document.getElementById('notification-toast'),
    };

    // --- APP STATE ---
    let appState = {
        isSubmitting: false,
        selectedPlan: 'premium',
        pollingIntervalId: null,
    };

    // --- MOCK API CALLS ---
    const fetchMetricsAPI = () => {
        console.log("Polling for latest metrics...");
        return new Promise(resolve => {
            setTimeout(() => {
                if (serverMetrics.billed > 0) {
                    const newBilledAmount = Math.random() * 15;
                    serverMetrics.billed += newBilledAmount;
                    serverMetrics.dailyProfit += newBilledAmount;
                    serverMetrics.roas = serverMetrics.invested > 0 ? serverMetrics.billed / serverMetrics.invested : 0;
                }
                resolve({ ...serverMetrics });
            }, 800);
        });
    };

    const postPaymentAPI = (data) => {
        console.log("Posting payment to webhook:", MOCK_WEBHOOK_URL, data);
        fetch(MOCK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).catch(error => console.error("Real webhook POST failed:", error));

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.95) {
                    return reject(new Error("Webhook failed unexpectedly."));
                }
                if (serverMetrics.invested === 0) {
                    serverMetrics.invested = 5420.50;
                }
                serverMetrics.billed += data.valor;
                serverMetrics.dailyProfit = serverMetrics.billed - serverMetrics.invested;
                serverMetrics.roas = serverMetrics.invested > 0 ? serverMetrics.billed / serverMetrics.invested : 0;
                resolve({ success: true, updatedMetrics: { ...serverMetrics } });
            }, 1200);
        });
    };

    // --- UI & ANIMATION UTILS ---
    const formatNumber = (num, precision = 2) => {
        return num.toLocaleString('pt-BR', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
        });
    };
    
    const animateCountUp = (element, endValue, duration = 1500) => {
        const startValue = parseFloat(element.textContent.replace(/\./g, '').replace(',', '.')) || 0;
        let startTime = null;

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            const easedPercentage = 1 - Math.pow(1 - percentage, 3); // easeOutCubic
            const current = startValue + (endValue - startValue) * easedPercentage;
            
            const precision = (element.id === 'roas-value') ? 2 : 2;
            element.textContent = formatNumber(current, precision);

            if (progress < duration) {
                requestAnimationFrame(step);
            } else {
                element.textContent = formatNumber(endValue, precision);
            }
        };
        requestAnimationFrame(step);
    };

    const updateMetricsUI = (metrics) => {
        animateCountUp(elements.investedValue, metrics.invested);
        animateCountUp(elements.billedValue, metrics.billed);
        animateCountUp(elements.roasValue, metrics.roas);
        animateCountUp(elements.profitValue, metrics.dailyProfit);
    };
    
    const showNotification = (message, type = 'success') => {
        elements.notificationToast.textContent = message;
        elements.notificationToast.classList.remove('hidden', 'bg-green-600', 'bg-red-600');
        elements.notificationToast.classList.add(type === 'success' ? 'bg-green-600' : 'bg-red-600');
        
        setTimeout(() => {
            elements.notificationToast.classList.add('hidden');
        }, 5000);
    };

    const setSubmitting = (submitting) => {
        appState.isSubmitting = submitting;
        elements.submitButton.disabled = submitting || elements.phoneInput.value.length < 12;
        if (submitting) {
            elements.submitButtonContent.classList.add('hidden');
            elements.spinner.classList.remove('hidden');
        } else {
            elements.submitButtonContent.classList.remove('hidden');
            elements.spinner.classList.add('hidden');
        }
    };
    
    // --- EVENT HANDLERS ---
    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        elements.phoneInput.value = value.length <= 13 ? value : value.slice(0, 13);
        elements.submitButton.disabled = appState.isSubmitting || elements.phoneInput.value.length < 12;
    };
    
    const handlePlanSelect = (planId) => {
        appState.selectedPlan = planId;
        renderPlanButtons();
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (elements.phoneInput.value.length < 12 || appState.isSubmitting) return;

        setSubmitting(true);
        const planDetails = PLANS.find(p => p.id === appState.selectedPlan);
        const submissionData = {
            telefone: elements.phoneInput.value,
            produto: PRODUCT_SLUG,
            plano: planDetails.id,
            valor: planDetails.price,
        };

        try {
            const response = await postPaymentAPI(submissionData);
            if (response.success) {
                updateMetricsUI(response.updatedMetrics);
                showNotification('Pagamento registrado com sucesso!', 'success');
                elements.phoneInput.value = '55';
                appState.selectedPlan = 'premium';
                renderPlanButtons();

                if (!appState.pollingIntervalId) {
                    appState.pollingIntervalId = setInterval(async () => {
                        const data = await fetchMetricsAPI();
                        updateMetricsUI(data);
                    }, 5 * 60 * 1000);
                }
            }
        } catch (error) {
            showNotification('Falha ao registrar pagamento. Tente novamente.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // --- RENDER FUNCTIONS ---
    const renderPlanButtons = () => {
        elements.planSelection.innerHTML = '';
        PLANS.forEach(plan => {
            const isSelected = appState.selectedPlan === plan.id;
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.planId = plan.id;
            button.className = `text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
                isSelected
                  ? 'border-brand-cyan ring-2 ring-brand-cyan/50 bg-brand-cyan/10'
                  : 'border-dark-border hover:border-text-secondary/50 bg-dark-bg'
              }`;
            button.innerHTML = `
                <div class="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-brand-cyan' : 'border-text-secondary'}">
                    ${isSelected ? '<div class="w-2.5 h-2.5 rounded-full bg-brand-cyan"></div>' : ''}
                </div>
                <div>
                    <p class="font-semibold text-text-primary">${plan.name}</p>
                    <p class="text-sm text-text-secondary">${plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            `;
            button.addEventListener('click', () => handlePlanSelect(plan.id));
            elements.planSelection.appendChild(button);
        });
    };

    // --- INITIALIZATION ---
    const init = () => {
        elements.productName.textContent = PRODUCT_NAME;
        elements.phoneInput.addEventListener('input', handlePhoneChange);
        elements.paymentForm.addEventListener('submit', handlePaymentSubmit);

        // Initial render
        handlePhoneChange({target: elements.phoneInput}); // Set initial button disabled state
        renderPlanButtons();
    };

    init();
});
