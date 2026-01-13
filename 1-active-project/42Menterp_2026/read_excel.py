import pandas as pd

xl = pd.ExcelFile(r'c:\Users\enkei\workspace\3-OPS\2026\26_01_01w\erp.xlsx', engine='openpyxl')
print('=== 시트 목록 ===')
print(xl.sheet_names)

for sheet in xl.sheet_names:
    print(f'\n{"="*50}')
    print(f'=== {sheet} ===')
    print(f'{"="*50}')
    df = pd.read_excel(xl, sheet_name=sheet)
    print(f'컬럼: {list(df.columns)}')
    print(f'행 수: {len(df)}')
    print()
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', None)
    print(df.head(20).to_string())
