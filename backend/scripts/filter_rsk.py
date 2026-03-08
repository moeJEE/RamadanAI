import csv
import os

input_file = r'c:\Users\MOE\Desktop\RamadanIA\backend\data\barrages_data.csv'
output_file = r'c:\Users\MOE\Desktop\RamadanIA\backend\data\barrages_rsk_data.csv'

rsk_dams = {"Sidi Mohammed Ben Abdellah", "Ain Kouachia"}

with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

# Group by date
data_by_date = {}
for row in rows:
    if len(row) < 5: continue
    date = row[0]
    if date not in data_by_date:
        data_by_date[date] = []
    data_by_date[date].append(row)

out_rows = []
for date in sorted(data_by_date.keys(), reverse=True):
    date_rows = data_by_date[date]
    total_res = 0.0
    valid_dams = []
    
    for row in date_rows:
        barrage = row[1]
        if barrage in rsk_dams:
            valid_dams.append(row)
            try:
                res_val = float(row[3]) if row[3] not in ('-', '') else 0.0
                total_res += res_val
            except ValueError:
                pass
    
    if valid_dams:
        for row in valid_dams:
            out_rows.append(row)
        # Add the "Réserve totale" row
        out_rows.append([date, "Réserve totale", "", f"{total_res:.4f}", ""])

with open(output_file, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(out_rows)

print(f"✅ Fichier créé : {output_file}")
print(f"Nombre de lignes : {len(out_rows) + 1}")
