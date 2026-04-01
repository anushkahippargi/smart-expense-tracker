import re
from datetime import datetime, timedelta

def parse_expense_text(text):
    text_lower = text.lower()
    
    # 1. AMOUNT HANDLING
    amount = None
    # Matches '₹200', '200rs', '200 rupees', '200', '200.50'
    amount_match = re.search(r'(?:₹|rs\.?|rupees)?\s*(\d+(?:\.\d+)?)\s*(?:rs|rupees)?', text_lower)
    if amount_match:
        amount = float(amount_match.group(1))
        
    if amount is None:
        raise ValueError("Could not find an amount in the text.")
        
    # 2. DATE HANDLING
    # Default to today
    date_val = datetime.now().date()
    date_str_to_remove = ""
    
    if '3 days ago' in text_lower:
        date_val = date_val - timedelta(days=3)
        date_str_to_remove = '3 days ago'
    elif '2 days ago' in text_lower:
        date_val = date_val - timedelta(days=2)
        date_str_to_remove = '2 days ago'
    elif 'yesterday' in text_lower:
        date_val = date_val - timedelta(days=1)
        date_str_to_remove = 'yesterday'
    elif 'today' in text_lower:
        date_val = date_val
        date_str_to_remove = 'today'
        
    # 3. CATEGORY IMPROVEMENT
    category_map = {
        'Food': ['coffee', 'tea', 'lunch', 'dinner', 'snacks', 'snack', 'breakfast', 'groceries', 'grocery', 'food', 'restaurant'],
        'Travel': ['uber', 'ola', 'cab', 'auto', 'petrol', 'fuel', 'taxi', 'flight', 'train', 'bus'],
        'Bills': ['rent', 'electricity', 'wifi', 'recharge', 'bill', 'water', 'internet', 'emi'],
        'Shopping': ['amazon', 'flipkart', 'clothes', 'mall', 'shopping', 'shoes']
    }
    
    detected_category = 'Others'
    found_keyword = ""
    for cat_name, keywords in category_map.items():
        for kw in keywords:
            if re.search(r'\b' + kw + r'\b', text_lower):
                detected_category = cat_name
                found_keyword = kw
                break
        if detected_category != 'Others':
            break
            
    # 4. DESCRIPTION
    # Remove amount
    desc = text_lower
    if amount_match:
        desc = desc.replace(amount_match.group(0), '', 1)
        
    # Remove date
    if date_str_to_remove:
        desc = desc.replace(date_str_to_remove, '', 1)
        
    # Remove stop words and the keyword itself
    noise_words = ['spent', 'paid', 'on', 'for', 'rs', 'rupees', '₹']
    if found_keyword:
        noise_words.append(found_keyword)
        
    words = desc.split()
    clean_words = [w for w in words if w not in noise_words]
    
    desc_clean = ' '.join(clean_words).strip()
    
    # If description is empty after removing noise, fallback to the keyword or category
    if not desc_clean:
        if found_keyword:
            desc_clean = found_keyword.capitalize()
        else:
            desc_clean = detected_category
    else:
        desc_clean = desc_clean.capitalize()
    
    # 5. CLEAN OUTPUT FORMAT
    return {
        "amount": amount,
        "category": detected_category,
        "description": desc_clean,
        "date": date_val.strftime('%Y-%m-%d')
    }

if __name__ == '__main__':
    test_cases = [
        "200 coffee",
        "₹500 groceries",
        "Uber 150",
        "Paid rent 12000",
        "300 shopping yesterday",
        "Spent 200rs on snacks 2 days ago"
    ]
    
    for t in test_cases:
        print(f"Input: '{t}'")
        try:
            res = parse_expense_text(t)
            print(f"Output: {res}\n")
        except Exception as e:
            print(f"Error: {e}\n")
