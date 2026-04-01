import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

from models import db, Expense, Budget
from analysis import get_insights, get_summary
from visualizations import generate_charts
from nlp_parser import parse_expense_text

# Initialize Flask app
app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# SQLite database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'expenses.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize DB with app
db.init_app(app)

# Create tables before first request
with app.app_context():
    db.create_all()

# Serve Frontend
@app.route('/')
def index():
    return app.send_static_file('index.html')

# API Endpoints
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    expenses = Expense.query.order_by(Expense.date.desc()).all()
    return jsonify([exp.to_dict() for exp in expenses])

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    data = request.json
    try:
        new_expense = Expense(
            amount=data['amount'],
            category=data['category'],
            date=datetime.strptime(data['date'], '%Y-%m-%d'),
            description=data.get('description', '')
        )
        db.session.add(new_expense)
        db.session.commit()
        return jsonify(new_expense.to_dict()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/parse_expense', methods=['GET', 'POST', 'OPTIONS'])
def parse_and_add_expense():
    if request.method == 'GET':
        return jsonify({"status": "ok"})
    data = request.json
    raw_text = data.get('text', '')
    
    try:
        parsed = parse_expense_text(raw_text)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Couldn't understand. Try: 'Spent ₹200 on food'"
        }), 400
        
    try:
        # Save to DB
        new_expense = Expense(
            amount=parsed['amount'],
            category=parsed['category'],
            date=datetime.strptime(parsed['date'], '%Y-%m-%d'),
            description=parsed['description']
        )
        db.session.add(new_expense)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "data": new_expense.to_dict()
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/expenses/<int:id>', methods=['PUT', 'DELETE'])
def manage_expense(id):
    expense = Expense.query.get_or_404(id)
    if request.method == 'DELETE':
        db.session.delete(expense)
        db.session.commit()
        return '', 204
    else:
        # PUT method (edit)
        data = request.json
        try:
            expense.amount = data.get('amount', expense.amount)
            expense.category = data.get('category', expense.category)
            if 'date' in data:
                expense.date = datetime.strptime(data['date'], '%Y-%m-%d')
            expense.description = data.get('description', expense.description)
            db.session.commit()
            return jsonify(expense.to_dict())
        except Exception as e:
            return jsonify({"error": str(e)}), 400

@app.route('/api/budget', methods=['GET', 'POST'])
def handle_budget():
    current_month = datetime.now().strftime('%Y-%m')
    budget = Budget.query.filter_by(month_year=current_month).first()
    
    if request.method == 'GET':
        return jsonify(budget.to_dict() if budget else {"amount": 0.0, "month_year": current_month})
        
    # POST handling
    data = request.json
    try:
        new_amount = float(data.get('amount', 0))
        if budget:
            budget.amount = new_amount
        else:
            budget = Budget(amount=new_amount, month_year=current_month)
            db.session.add(budget)
        db.session.commit()
        return jsonify(budget.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    expenses = Expense.query.all()
    expenses_list = [exp.to_dict() for exp in expenses]
    
    # Generate stats, insights
    summary = get_summary(expenses_list)
    charts = generate_charts(expenses_list)
    
    # Add chart base64 strings to summary dict
    summary['charts'] = charts
    
    # Check budget
    current_month = datetime.now().strftime('%Y-%m')
    budget = Budget.query.filter_by(month_year=current_month).first()
    b_amt = budget.amount if budget else 0.0
    
    budget_alert = None
    if b_amt > 0:
        if summary['monthly'] >= b_amt:
             budget_alert = "WARNING: You have exceeded your monthly budget!"
        elif summary['monthly'] >= b_amt * 0.9:
             budget_alert = "NOTICE: You are nearing your monthly budget limit (90%+ reached)."
             
    summary['budget'] = b_amt
    summary['budget_alert'] = budget_alert
    
    return jsonify(summary)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
