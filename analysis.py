import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def get_insights(df):
    if df.empty:
        return ["No expenses recorded yet. Start logging your expenses!"]
    
    insights = []
    
    # Highest spending category
    category_totals = df.groupby('category')['amount'].sum()
    if not category_totals.empty:
        highest_category = category_totals.idxmax()
        highest_amount = category_totals.max()
        total_spent = category_totals.sum()
        percentage = (highest_amount / total_spent) * 100
        
        insights.append(f"You spend most on {highest_category} ({percentage:.0f}% of total) — consider tracking this closely.")
    
    # Unusual spending spikes
    daily_spending = df.groupby('date')['amount'].sum()
    if len(daily_spending) > 3:
        mean_spend = daily_spending.mean()
        std_spend = daily_spending.std()
        recent_day = daily_spending.index[-1]
        recent_spend = daily_spending.iloc[-1]
        
        if recent_spend > mean_spend + (1.5 * std_spend):
            insights.append(f"High spending alert: You spent ₹{recent_spend:.2f} on {recent_day.strftime('%b %d')}, noticeably higher than your average.")
            
    # Weekday vs Weekend spending
    df['is_weekend'] = df['date'].apply(lambda x: x.weekday() >= 5)
    weekend_spent = df[df['is_weekend']]['amount'].sum()
    weekday_spent = df[~df['is_weekend']]['amount'].sum()
    
    num_weekends = len(df[df['is_weekend']]['date'].unique())
    num_weekdays = len(df[~df['is_weekend']]['date'].unique())
    
    avg_weekend = weekend_spent / num_weekends if num_weekends > 0 else 0
    avg_weekday = weekday_spent / num_weekdays if num_weekdays > 0 else 0
    
    if avg_weekend > (avg_weekday * 1.5):
        insights.append("High spending on weekends detected! Try planning budget-friendly activities.")
        
    # Repetitive small expenses
    small_food = df[(df['category'].isin(['Food', 'Shopping', 'Travel'])) & (df['amount'] < 500)]
    if len(small_food) >= 3:
        insights.append("Frequent small expenses detected (e.g. coffee, snacks, cabs). These add up and might be worth cutting down.")
        
    return insights

def get_summary(expenses_dicts):
    if not expenses_dicts:
        return {
            "total": 0,
            "weekly": 0,
            "monthly": 0,
            "daily_avg": 0,
            "most_frequent_cat": None,
            "insights": ["Log some expenses to get AI Insights!"],
            "category_totals": {}
        }
        
    df = pd.DataFrame(expenses_dicts)
    df['date'] = pd.to_datetime(df['date'])
    
    today = pd.Timestamp(datetime.now().date())
    
    # Total
    total_spent = float(df['amount'].sum())
    
    # Current month
    current_month_df = df[(df['date'].dt.year == today.year) & (df['date'].dt.month == today.month)]
    monthly_spent = float(current_month_df['amount'].sum())
    
    # Daily Average for the current month
    days_in_month_so_far = today.day
    daily_avg = monthly_spent / days_in_month_so_far if days_in_month_so_far > 0 else 0
    
    # Most frequent category (by count, not volume)
    if not current_month_df.empty:
        most_frequent_cat = current_month_df['category'].mode()[0]
    else:
        most_frequent_cat = df['category'].mode()[0]
    
    # Current week (last 7 days from today)
    one_week_ago = today - timedelta(days=7)
    current_week_df = df[df['date'] >= one_week_ago]
    weekly_spent = float(current_week_df['amount'].sum())
    
    # Category Breakdowns
    cat_totals = df.groupby('category')['amount'].sum().to_dict()
    
    # Insights
    insights = get_insights(current_month_df if not current_month_df.empty else df)
    
    return {
        "total": round(total_spent, 2),
        "weekly": round(weekly_spent, 2),
        "monthly": round(monthly_spent, 2),
        "daily_avg": round(daily_avg, 2),
        "most_frequent_cat": most_frequent_cat,
        "insights": insights,
        "category_totals": {k: round(v, 2) for k, v in cat_totals.items()}
    }
