from nlp_parser import parse_expense_text

tests = [
    "200 coffee",
    "₹500 groceries",
    "Uber 150",
    "Paid rent 12000",
    "300 shopping yesterday",
    "I paid 200rs for coffee"
]

for t in tests:
    try:
        res = parse_expense_text(t)
        print(f"INPUT: {t}\nOUTPUT: {res}\n")
    except Exception as e:
        print(f"INPUT: {t}\nERROR: {e}\n")
