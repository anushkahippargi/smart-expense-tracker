document.addEventListener('DOMContentLoaded', () => {
    // Endpoints
    const API_BASE = '/api';
    
    // DOM Elements
    const form = document.getElementById('expense-form');
    const budgetForm = document.getElementById('budget-form');
    const expenseList = document.getElementById('expense-list');
    const alertBox = document.getElementById('alert-box');
    
    const aiForm = document.getElementById('ai-form');
    const messageBox = document.getElementById('messageBox');
    const aiInput = document.getElementById('ai-text-input');
    const aiSubmitBtn = document.getElementById('ai-submit-btn');
    
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const submitBtn = document.getElementById('submit-btn');
    
    // Fetch and Load Initial Data
    loadDashboard();
    loadExpenses();
    
    // --- Dashboard & Insights ---
    async function loadDashboard() {
        try {
            const res = await fetch(`${API_BASE}/dashboard`);
            const data = await res.json();
            
            // Update Stats (INR)
            document.getElementById('total-spent').innerText = `₹${data.total.toFixed(2)}`;
            document.getElementById('weekly-spent').innerText = `₹${data.weekly.toFixed(2)}`;
            document.getElementById('monthly-spent').innerText = `₹${data.monthly.toFixed(2)}`;
            document.getElementById('daily-avg').innerText = data.daily_avg ? `₹${data.daily_avg.toFixed(2)} / day` : '₹0.00 / day';
            document.getElementById('frequent-cat').innerText = data.most_frequent_cat || 'None';
            
            // Update Budget
            const budgetEle = document.getElementById('budget-status');
            if (data.budget > 0) {
                budgetEle.innerText = `Budget: ₹${data.budget.toFixed(2)}`;
                document.getElementById('budget-input').value = data.budget;
            } else {
                budgetEle.innerText = `Budget: Not Set`;
            }
            
            // Budget Alert
            if (data.budget_alert) {
                alertBox.innerText = data.budget_alert;
                alertBox.classList.remove('hidden');
            } else {
                alertBox.classList.add('hidden');
            }
            
            // Update Insights
            const insightsList = document.getElementById('insights-list');
            insightsList.innerHTML = '';
            data.insights.forEach(insight => {
                const li = document.createElement('li');
                li.innerText = insight;
                insightsList.appendChild(li);
            });
            
            // Update Charts
            updateChart('pie', data.charts.pie);
            updateChart('bar', data.charts.bar);
            
        } catch (error) {
            console.error("Error loading dashboard:", error);
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
        }
    }
    
    // --- Expenses List ---
    async function loadExpenses() {
        try {
            const res = await fetch(`${API_BASE}/expenses`);
            const expenses = await res.json();
            
            expenseList.innerHTML = '';
            expenses.forEach(exp => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${exp.date}</td>
                    <td><span style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${exp.category}</span></td>
                    <td>${exp.description || '-'}</td>
                    <td style="font-weight: 600;">₹${exp.amount.toFixed(2)}</td>
                    <td class="action-btns">
                        <button class="btn btn-secondary" style="margin: 0; padding: 0.3rem 0.6rem;" onclick="editExpense(${exp.id}, ${exp.amount}, '${exp.category}', '${exp.date}', '${exp.description || ''}')">Edit</button>
                        <button class="btn btn-danger" style="margin: 0;" onclick="deleteExpense(${exp.id})">Del</button>
                    </td>
                `;
                expenseList.appendChild(tr);
            });
        } catch (error) {
            console.error("Error loading expenses:", error);
        }
    }
    
    // --- Forms ---
    
    // ADD VIA AI
    aiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        aiSubmitBtn.innerText = 'Adding...';
        aiSubmitBtn.disabled = true;
        messageBox.classList.add('hidden');
        messageBox.style.background = '';
        messageBox.style.color = '';
        messageBox.style.border = '';
        
        try {
            const res = await fetch(`${API_BASE}/parse_expense`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: aiInput.value })
            });
            
            const data = await res.json();
            
            if (data.success === false) {
                messageBox.innerText = "Couldn't understand. Try: 'Spent ₹200 on food'";
                messageBox.style.background = 'rgba(239, 68, 68, 0.1)';
                messageBox.style.color = '#ef4444';
                messageBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
                messageBox.classList.remove('hidden');
            } else {
                // Success
                messageBox.innerText = "Expense added successfully ✅";
                messageBox.style.background = 'rgba(16, 185, 129, 0.1)';
                messageBox.style.color = '#10b981';
                messageBox.style.border = '1px solid rgba(16, 185, 129, 0.3)';
                messageBox.classList.remove('hidden');
                
                aiInput.value = ''; // clear input
                loadDashboard();
                loadExpenses();
            }
            
        } catch (error) {
            messageBox.innerText = "Connection error. Please try again.";
            messageBox.style.background = 'rgba(239, 68, 68, 0.1)';
            messageBox.style.color = '#ef4444';
            messageBox.classList.remove('hidden');
        } finally {
            aiSubmitBtn.innerText = '✨ Add via AI';
            aiSubmitBtn.disabled = false;
        }
    });

    // Manual Add / Update Expense
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
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
            
            resetForm();
            loadDashboard();
            loadExpenses();
            document.getElementById('manual-form-container').classList.add('hidden');
        } catch (error) {
            console.error("Error saving expense:", error);
        }
    });
    
    // Update Budget
    budgetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amt = document.getElementById('budget-input').value;
        
        try {
            await fetch(`${API_BASE}/budget`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amt })
            });
            loadDashboard();
            budgetForm.reset();
        } catch (error) {
            console.error("Error setting budget:", error);
        }
    });
    
    // Edit Action (Global Scope)
    window.editExpense = (id, amount, category, date, description) => {
        document.getElementById('manual-form-container').classList.remove('hidden');
        document.getElementById('expense-id').value = id;
        document.getElementById('amount').value = amount;
        document.getElementById('category').value = category;
        document.getElementById('date').value = date;
        document.getElementById('description').value = description;
        
        submitBtn.innerText = 'Update Manually';
        cancelEditBtn.classList.remove('hidden');
    };
    
    // Delete Action (Global Scope)
    window.deleteExpense = async (id) => {
        if (!confirm("Are you sure you want to delete this expense?")) return;
        
        try {
            await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
            loadDashboard();
            loadExpenses();
        } catch (error) {
            console.error("Error deleting expense:", error);
        }
    };
    
    // Reset Form
    cancelEditBtn.addEventListener('click', resetForm);
    
    function resetForm() {
        form.reset();
        document.getElementById('expense-id').value = '';
        submitBtn.innerText = 'Save Manually';
        cancelEditBtn.classList.add('hidden');
    }
});
