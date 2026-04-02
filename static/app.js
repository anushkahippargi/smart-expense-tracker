document.addEventListener('DOMContentLoaded', () => {
    // Endpoints
    const API_BASE = '/api';
    
    // DOM Elements
    const form = document.getElementById('expense-form');
    const budgetForm = document.getElementById('budget-form');
    const expenseList = document.getElementById('expense-list');
    const alertBox = document.getElementById('alert-box');
    
    const aiForm = document.getElementById('ai-form');
    const aiInput = document.getElementById('ai-text-input');
    const aiSubmitBtn = document.getElementById('ai-submit-btn');
    
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const submitBtn = document.getElementById('submit-btn');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    // Global Dataset for Filtering
    window.allExpenses = [];
    const categoryFilter = document.getElementById('category-filter');
    if(categoryFilter) {
        categoryFilter.addEventListener('change', renderExpenses);
    }

    // Modal Handling
    let deleteTargetId = null;
    const deleteModal = document.getElementById('delete-modal');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');

    modalCancelBtn.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        deleteTargetId = null;
    });

    modalConfirmBtn.addEventListener('click', async () => {
        if (!deleteTargetId) return;
        
        const originalText = modalConfirmBtn.innerHTML;
        modalConfirmBtn.innerHTML = '<span class="spinner"></span> Deleting...';
        modalConfirmBtn.disabled = true;

        try {
            await fetch(`${API_BASE}/expenses/${deleteTargetId}`, { method: 'DELETE' });
            showToast("Expense deleted successfully", "success");
            loadDashboard();
            loadExpenses();
        } catch (error) {
            console.error("Error deleting expense:", error);
            showToast("Failed to delete expense", "error");
        } finally {
            deleteModal.classList.add('hidden');
            modalConfirmBtn.disabled = false;
            modalConfirmBtn.innerHTML = originalText;
            deleteTargetId = null;
        }
    });

    // Helper: Show Toast
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Pick an icon SVG
        let icon = '';
        if(type === 'success') {
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--success)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        } else if (type === 'error') {
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--danger)"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        } else {
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--highlight)"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        }

        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);

        // Auto remove from DOM after CSS animation (3s total)
        setTimeout(() => toast.remove(), 3200);
    }
    
    // Fetch and Load Initial Data
    loadDashboard();
    loadExpenses();
    
    // --- Dashboard & Insights ---
    async function loadDashboard() {
        try {
            // Optional local spinners handled strictly via CSS while fetching
            const res = await fetch(`${API_BASE}/dashboard`);
            const data = await res.json();
            
            // Update Stats (INR)
            document.getElementById('total-spent').innerHTML = `₹${data.total.toFixed(2)}`;
            document.getElementById('weekly-spent').innerHTML = `₹${data.weekly.toFixed(2)}`;
            document.getElementById('monthly-spent').innerHTML = `₹${data.monthly.toFixed(2)}`;
            document.getElementById('daily-avg').innerHTML = data.daily_avg ? `₹${data.daily_avg.toFixed(2)} / day` : '₹0.00 / day';
            document.getElementById('frequent-cat').innerHTML = data.most_frequent_cat || 'None';
            
            // Update Budget
            const budgetEle = document.getElementById('budget-status');
            if (data.budget > 0) {
                budgetEle.innerHTML = `Budget: ₹${data.budget.toFixed(2)}`;
                document.getElementById('budget-input').value = data.budget;
            } else {
                budgetEle.innerHTML = `Budget: Not Set`;
            }
            
            // Budget Alert
            if (data.budget_alert) {
                alertBox.innerText = data.budget_alert;
                alertBox.classList.remove('hidden');
                alertBox.className = 'alert warning'; 
            } else {
                alertBox.classList.add('hidden');
            }
            
            // Update Insights
            const insightsList = document.getElementById('insights-list');
            insightsList.innerHTML = '';
            if (data.insights && data.insights.length > 0) {
                data.insights.forEach(insight => {
                    const li = document.createElement('li');
                    li.innerHTML = insight;
                    insightsList.appendChild(li);
                });
            } else {
                insightsList.innerHTML = `<li><div class="empty-state" style="padding:1rem;">No AI insights available yet. Add some expenses!</div></li>`;
            }
            
            // Update Charts
            updateChart('pie', data.charts.pie);
            updateChart('bar', data.charts.bar);
            
        } catch (error) {
            console.error("Error loading dashboard:", error);
            showToast("Failed to sync dashboard data", "error");
        }
    }
    
    function updateChart(type, base64Data) {
        const img = document.getElementById(`${type}-chart`);
        const placeholder = document.getElementById(`${type}-placeholder`);
        if (base64Data) {
            img.src = `data:image/png;base64,${base64Data}`;
            img.classList.remove('hidden');
            placeholder.classList.add('hidden');
        } else {
            img.classList.add('hidden');
            placeholder.classList.remove('hidden');
            
            placeholder.innerHTML = `
                <div style="text-align:center;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:#cbd5e1; margin-bottom:0.5rem;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    <p style="margin:0; font-size:0.95rem;">Not enough data</p>
                </div>
            `;
        }
    }
    
    // --- Expenses List ---
    async function loadExpenses() {
        try {
            // Optional spinner for table
            expenseList.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:3rem;"><span class="spinner" style="font-size:2rem; color:var(--primary);"></span></td></tr>`;
            
            const res = await fetch(`${API_BASE}/expenses`);
            window.allExpenses = await res.json();
            renderExpenses();
            
        } catch (error) {
            console.error("Error loading expenses:", error);
            expenseList.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:2rem;">Failed to load data.</td></tr>`;
        }
    }

    function renderExpenses() {
        const filterVal = categoryFilter ? categoryFilter.value : 'All';
        const filtered = filterVal === 'All' ? window.allExpenses : window.allExpenses.filter(e => e.category === filterVal);

        expenseList.innerHTML = '';
        
        if (filtered.length === 0) {
            expenseList.innerHTML = `
                <tr class="empty-row">
                    <td colspan="5">
                        <div class="empty-state">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <h3>No Transactions Found</h3>
                            <p>${filterVal === 'All' ? "You haven't added any expenses yet." : `No expenses found in '${filterVal}' category.`}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(exp => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-weight:500;">${exp.date}</span></td>
                <td><span style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${exp.category}</span></td>
                <td>${exp.description || '<span style="color:#94a3b8;font-style:italic;">No description</span>'}</td>
                <td style="font-weight: 700; color:var(--text-main);" class="text-right">₹${exp.amount.toFixed(2)}</td>
                <td class="action-btns">
                    <button class="btn btn-secondary" style="margin: 0; padding: 0.3rem 0.6rem;" onclick="editExpense(${exp.id}, ${exp.amount}, '${exp.category}', '${exp.date}', '${exp.description || ''}')">Edit</button>
                    <button class="btn btn-danger" style="margin: 0;" onclick="deleteExpense(${exp.id})">Del</button>
                </td>
            `;
            expenseList.appendChild(tr);
        });
    }
    
    // --- Forms ---
    
    // ADD VIA AI
    aiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const originalText = aiSubmitBtn.innerHTML;
        aiSubmitBtn.innerHTML = '<span class="spinner"></span> <span class="btn-text">Processing...</span>';
        aiSubmitBtn.disabled = true;
        
        // Hide the old red/green inline alert if it was there
        const messageBox = document.getElementById('messageBox');
        if(messageBox) messageBox.classList.add('hidden');
        
        try {
            const res = await fetch(`${API_BASE}/parse_expense`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: aiInput.value })
            });
            
            const data = await res.json();
            
            if (data.success === false) {
                showToast("Couldn't understand input. Try: 'Spent ₹200 on food'", "warning");
            } else {
                showToast("Expense generated and added successfully", "success");
                aiInput.value = ''; // clear input
                loadDashboard();
                loadExpenses();
            }
            
        } catch (error) {
            showToast("Connection error. Please try again.", "error");
        } finally {
            aiSubmitBtn.innerHTML = originalText;
            aiSubmitBtn.disabled = false;
        }
    });

    // Manual Add / Update Expense
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> <span class="btn-text">Saving...</span>';
        submitBtn.disabled = true;

        const id = document.getElementById('expense-id').value;
        const payload = {
            amount: parseFloat(document.getElementById('amount').value),
            date: document.getElementById('date').value,
            category: document.getElementById('category').value,
            description: document.getElementById('description').value
        };
        
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/expenses/${id}` : `${API_BASE}/expenses`;
        
        try {
            await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            showToast(id ? "Expense updated successfully." : "Manual expense added successfully.", "success");
            resetForm();
            loadDashboard();
            loadExpenses();
            
            // Redirection is handled by the inline JS in index.html, but let's be sure:
            if(window.switchView) window.switchView('transactions');

        } catch (error) {
            console.error("Error saving expense:", error);
            showToast("Failed to save expense", "error");
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Update Budget
    budgetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amt = document.getElementById('budget-input').value;
        const budgetBtn = document.getElementById('budget-submit-btn');
        const origBtnHtml = budgetBtn.innerHTML;
        
        budgetBtn.innerHTML = '<span class="spinner"></span>';
        budgetBtn.disabled = true;

        try {
            await fetch(`${API_BASE}/budget`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amt })
            });
            showToast("Budget securely updated", "success");
            loadDashboard();
        } catch (error) {
            console.error("Error setting budget:", error);
            showToast("Failed to apply budget", "error");
        } finally {
            budgetBtn.innerHTML = origBtnHtml;
            budgetBtn.disabled = false;
        }
    });
    
    // Edit Action (Global Scope)
    window.editExpense = (id, amount, category, date, description) => {
        document.getElementById('expense-id').value = id;
        document.getElementById('amount').value = amount;
        document.getElementById('category').value = category;
        document.getElementById('date').value = date;
        document.getElementById('description').value = description;
        
        submitBtn.innerHTML = '<span class="btn-text">Update Expense</span>';
        cancelEditBtn.classList.remove('hidden');
    };
    
    // Delete Action Trigger (Global Scope)
    window.deleteExpense = (id) => {
        deleteTargetId = id;
        deleteModal.classList.remove('hidden');
    };
    
    // Reset Form
    cancelEditBtn.addEventListener('click', resetForm);
    
    function resetForm() {
        form.reset();
        document.getElementById('expense-id').value = '';
        submitBtn.innerHTML = '<span class="btn-text">Save Expense</span>';
        cancelEditBtn.classList.add('hidden');
    }
});
