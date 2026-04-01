import io
import base64
import pandas as pd
import matplotlib
matplotlib.use('Agg') # Necessary for server-side generation
import matplotlib.pyplot as plt
import seaborn as sns

# Fix required for showing the Rupee (₹) symbol properly without missing glyphs
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'DejaVu Sans', 'sans-serif']

def generate_charts(expenses_dicts):
    if not expenses_dicts:
        return {"pie": None, "bar": None}
        
    df = pd.DataFrame(expenses_dicts)
    df['date'] = pd.to_datetime(df['date'])

    # Helper function to convert plot to base64
    def get_base64_plot(fig):
        img = io.BytesIO()
        fig.savefig(img, format='png', bbox_inches='tight')
        img.seek(0)
        encoded = base64.b64encode(img.getvalue()).decode('utf8')
        plt.close(fig)
        return encoded

    sns.set_theme(style="whitegrid", palette="pastel")

    # 1. Pie Chart: Category-wise spending
    category_totals = df.groupby('category')['amount'].sum()
    if not category_totals.empty:
        fig_pie, ax_pie = plt.subplots(figsize=(6, 6))
        ax_pie.pie(category_totals, labels=category_totals.index, autopct='%1.1f%%', startangle=90, colors=sns.color_palette("muted"))
        ax_pie.axis('equal') # Equal aspect ratio ensures that pie is drawn as a circle.
        ax_pie.set_title("Spending by Category")
        pie_b64 = get_base64_plot(fig_pie)
    else:
        pie_b64 = None

    # 2. Bar Chart: Weekly/Monthly trends (aggregate by day for the last 30 days)
    recent_30 = df[df['date'] >= (pd.Timestamp.now() - pd.Timedelta(days=30))].copy()
    if not recent_30.empty:
        daily_trends = recent_30.groupby(recent_30['date'].dt.date)['amount'].sum().reset_index()
        fig_bar, ax_bar = plt.subplots(figsize=(8, 4))
        sns.barplot(data=daily_trends, x='date', y='amount', ax=ax_bar, color='steelblue')
        ax_bar.set_title("Daily Spending (Recent 30 Days)")
        ax_bar.set_ylabel("Amount (₹)")  # INR UPDATE
        ax_bar.set_xlabel("Date")
        plt.xticks(rotation=45)
        bar_b64 = get_base64_plot(fig_bar)
    else:
        bar_b64 = None

    return {"pie": pie_b64, "bar": bar_b64}
