# scripts/reconcile_teachers_excel.py
# Menyatukan data dari DAFTARGURUTENDIK2027.xlsx dan data nama nip dan no hp.txt
# Menghasilkan file Excel baru lengkap: data guru/DAFTAR_GURU_TENDIK_LENGKAP.xlsx
# Serta memperbarui prisma/seeds/employees.json dan prisma/seeds/employees.sql

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json
import re
import os

def clean_nip(nip_val):
    if not nip_val:
        return ""
    s = re.sub(r'[^0-9]', '', str(nip_val).strip())
    # Jika berakhiran 000 karena rounding excel sebelumnya, kita ambil 14 digit pertama
    return s

def normalize_name(name):
    if not name:
        return ""
    n = name.lower()
    # Hilangkan gelar
    n = re.sub(r'\b(dra|drs|hj|h|dr|m\.pd|s\.pd|m\.si|s\.si|m\.ap|s\.st|s\.kom|m\.kom|s\.t|m\.t|s\.sos|m\.m|s\.e|gr|ak)\b', '', n)
    n = re.sub(r'[^a-z0-9]', '', n)
    return n

def format_phone(phone_val):
    if not phone_val:
        return ""
    p = str(phone_val).strip().replace("'", "").replace("+", "").replace("-", "").replace(" ", "")
    if p.endswith('.0'):
        p = p[:-2]
    p = re.sub(r'[^0-9]', '', p)
    if p.startswith('628'):
        p = '08' + p[3:]
    elif p.startswith('62') and not p.startswith('08'):
        p = '0' + p[2:]
    return p

def main():
    print("1. Membaca data nama nip dan no hp.txt...")
    txt_path = os.path.join("data guru", "data nama nip dan no hp.txt")
    with open(txt_path, "r", encoding="utf-8", errors="ignore") as f:
        txt_content = f.read().strip()
    
    if not txt_content.startswith("["):
        txt_content = "[" + txt_content
    if not txt_content.endswith("]"):
        txt_content = txt_content.rstrip().rstrip(",") + "]"
        
    try:
        txt_data = json.loads(txt_content)
    except Exception as e:
        # manual regex fallback jika json sedikit korup
        items = re.findall(r'\{[^{}]+\}', txt_content)
        txt_data = []
        for it in items:
            try:
                txt_data.append(json.loads(it))
            except:
                pass
                
    print(f"Total data dari txt: {len(txt_data)}")

    # Index txt by cleaned NIP dan normalized name
    txt_by_nip = {}
    txt_by_name = {}
    for item in txt_data:
        raw_nip = item.get("nip", "")
        c_nip = clean_nip(raw_nip)
        phone = format_phone(item.get("phone", ""))
        rfid = str(item.get("rfid", "") or "").strip()
        gender = item.get("gender", "")
        name = item.get("name", "").strip()
        
        info = {
            "name": name,
            "raw_nip": raw_nip,
            "clean_nip": c_nip,
            "phone": phone,
            "rfid": rfid,
            "gender": gender,
            "used": False
        }
        
        if c_nip:
            # simpan prefix 14 digit jika trailing 0
            txt_by_nip[c_nip] = info
            if len(c_nip) >= 14:
                txt_by_nip[c_nip[:14]] = info
        
        norm_n = normalize_name(name)
        if norm_n:
            txt_by_name[norm_n] = info

    print("2. Membaca DAFTARGURUTENDIK2027.xlsx...")
    xlsx_path = os.path.join("data guru", "DAFTARGURUTENDIK2027.xlsx")
    wb = openpyxl.load_workbook(xlsx_path)
    sheet = wb.active

    reconciled_list = []

    # Baris data dimulai dari baris 17 (header di baris 16)
    # Col 1: NO, Col 2: NAMA GURU, Col 3: L/P, Col 4: NUPTK, Col 5: PANGKAT, Col 6: GOL, Col 7: NIP
    for row in range(17, sheet.max_row + 1):
        nama = sheet.cell(row, 2).value
        if not nama or str(nama).strip() == "" or str(nama).strip().startswith("PEMERINTAH") or str(nama).strip().startswith("DAFTAR"):
            continue
        
        nama = str(nama).strip()
        lp = str(sheet.cell(row, 3).value or "").strip().upper()
        nuptk = str(sheet.cell(row, 4).value or "").strip()
        pangkat = str(sheet.cell(row, 5).value or "").strip()
        gol = str(sheet.cell(row, 6).value or "").strip()
        nip_val = str(sheet.cell(row, 7).value or "").strip()
        
        if nuptk.endswith('.0'): nuptk = nuptk[:-2]
        if nip_val.endswith('.0'): nip_val = nip_val[:-2]

        c_nip = clean_nip(nip_val)
        norm_n = normalize_name(nama)

        matched_txt = None
        if c_nip and c_nip in txt_by_nip:
            matched_txt = txt_by_nip[c_nip]
        elif c_nip and len(c_nip) >= 14 and c_nip[:14] in txt_by_nip:
            matched_txt = txt_by_nip[c_nip[:14]]
        elif norm_n and norm_n in txt_by_name:
            matched_txt = txt_by_name[norm_n]
        else:
            # Partial name match
            for k, v in txt_by_name.items():
                if len(k) > 6 and (k in norm_n or norm_n in k):
                    matched_txt = v
                    break

        phone = ""
        rfid = ""
        if matched_txt:
            matched_txt["used"] = True
            phone = matched_txt["phone"]
            rfid = matched_txt["rfid"]
            if not lp:
                lp = matched_txt.get("gender", "")

        pangkat_gol = ""
        if pangkat and gol:
            pangkat_gol = f"{pangkat} ({gol})"
        elif pangkat:
            pangkat_gol = pangkat
        elif gol:
            pangkat_gol = gol

        # Jabatan perkiraan
        jabatan = "Guru"
        if "kepala sekolah" in nama.lower() or row == 17:
            jabatan = "Kepala Sekolah"
        elif "tata usaha" in nama.lower() or not gol and not nuptk:
            jabatan = "Tenaga Kependidikan / TU"
        elif pangkat:
            jabatan = f"Guru ({pangkat})"

        reconciled_list.append({
            "name": nama,
            "nip": nip_val if nip_val and nip_val != "-" else "",
            "nuptk": nuptk if nuptk and nuptk != "-" else "",
            "gender": lp,
            "pangkat_gol": pangkat_gol,
            "jabatan": jabatan,
            "unit": "SMK Negeri 1 Subang",
            "phone": phone,
            "rfid": rfid,
            "status": "Aktif"
        })

    # Tambahkan sisa orang dari txt yang belum masuk di Excel
    added_from_txt = 0
    for k, item in txt_by_name.items():
        if not item.get("used"):
            added_from_txt += 1
            reconciled_list.append({
                "name": item["name"],
                "nip": item["raw_nip"] if item["raw_nip"] and not item["raw_nip"].endswith("000") else "",
                "nuptk": "",
                "gender": item.get("gender", ""),
                "pangkat_gol": "-",
                "jabatan": "Guru / Tendik",
                "unit": "SMK Negeri 1 Subang",
                "phone": item["phone"],
                "rfid": item.get("rfid", ""),
                "status": "Aktif"
            })

    print(f"Total data gabungan lengkap: {len(reconciled_list)} (ditambah {added_from_txt} dari file txt)")

    # 3. Buat File Excel Baru yang Rapi dan Profesional
    out_wb = openpyxl.Workbook()
    ws = out_wb.active
    ws.title = "GURU & TENDIK"

    # Styling
    header_fill = PatternFill(start_color="0D9488", end_color="0D9488", fill_type="solid") # Teal SIPKO
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    data_font = Font(name="Calibri", size=10)
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # Title block
    ws.merge_cells("A1:J1")
    ws["A1"] = "DAFTAR GURU & TENAGA KEPENDIDIKAN LENGKAP - SMKN 1 SUBANG"
    ws["A1"].font = Font(name="Calibri", size=14, bold=True, color="0F172A")
    ws["A1"].alignment = center_align

    ws.merge_cells("A2:J2")
    ws["A2"] = "SIPKO (Sistem Informasi Peminjaman Kendaraan Operasional) - Sinkronisasi Data 2026/2027"
    ws["A2"].font = Font(name="Calibri", size=10, italic=True, color="64748B")
    ws["A2"].alignment = center_align

    headers = [
        "NO", "NAMA LENGKAP", "NIP", "NUPTK", "L/P", 
        "PANGKAT / GOLONGAN", "JABATAN", "UNIT KERJA", "NOMOR WHATSAPP", "STATUS"
    ]

    ws.row_dimensions[4].height = 28
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(4, col_idx, h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = thin_border

    zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    for i, r in enumerate(reconciled_list, 1):
        row_idx = 4 + i
        ws.row_dimensions[row_idx].height = 20
        row_data = [
            i,
            r["name"],
            f' {r["nip"]}' if r["nip"] else "-",
            f' {r["nuptk"]}' if r["nuptk"] else "-",
            r["gender"] or "-",
            r["pangkat_gol"] or "-",
            r["jabatan"] or "Guru / Tendik",
            r["unit"] or "SMK Negeri 1 Subang",
            f' {r["phone"]}' if r["phone"] else "-",
            r["status"]
        ]

        for col_idx, val in enumerate(row_data, 1):
            cell = ws.cell(row_idx, col_idx, val)
            cell.font = data_font
            cell.border = thin_border
            if col_idx in [1, 3, 4, 5, 9, 10]:
                cell.alignment = center_align
            else:
                cell.alignment = left_align
            
            if i % 2 == 0:
                cell.fill = zebra_fill

    # Auto fit column width
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            if cell.row >= 4 and cell.value:
                max_len = max(max_len, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = max(max_len + 3, 10)

    out_path = os.path.join("data guru", "DAFTAR_GURU_TENDIK_LENGKAP.xlsx")
    out_wb.save(out_path)
    print(f"✅ File Excel lengkap berhasil disimpan di: {out_path}")

    # Simpan juga ke prisma/seeds/employees.json & employees.sql
    json_path = os.path.join("prisma", "seeds", "employees.json")
    sql_path = os.path.join("prisma", "seeds", "employees.sql")

    json_employees = []
    sql_statements = []

    for idx, r in enumerate(reconciled_list, 1):
        emp_id = f"emp_{idx:04d}"
        clean_name = r["name"].strip()
        clean_nip_val = r["nip"].strip() if r["nip"] else None
        clean_pangkat = r["pangkat_gol"].strip() if r["pangkat_gol"] and r["pangkat_gol"] != "-" else None
        clean_jabatan = r["jabatan"].strip() if r["jabatan"] else "Guru / Tendik"
        clean_unit = r["unit"].strip() if r["unit"] else "SMK Negeri 1 Subang"
        clean_phone = r["phone"].strip() if r["phone"] and r["phone"] != "-" else None

        json_employees.append({
            "id": emp_id,
            "name": clean_name,
            "nip": clean_nip_val,
            "pangkatGol": clean_pangkat,
            "jabatan": clean_jabatan,
            "unit": clean_unit,
            "phoneWa": clean_phone,
            "isActive": True
        })

        def sql_quote(val):
            if val is None:
                return "NULL"
            return "'" + str(val).replace("'", "''") + "'"

        sql_statements.append(
            f"INSERT INTO `employees` (`id`, `name`, `nip`, `pangkatGol`, `jabatan`, `unit`, `phoneWa`, `isActive`, `createdAt`, `updatedAt`) VALUES "
            f"({sql_quote(emp_id)}, {sql_quote(clean_name)}, {sql_quote(clean_nip_val)}, {sql_quote(clean_pangkat)}, {sql_quote(clean_jabatan)}, {sql_quote(clean_unit)}, {sql_quote(clean_phone)}, 1, NOW(), NOW()) "
            f"ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `nip`=VALUES(`nip`), `pangkatGol`=VALUES(`pangkatGol`), `jabatan`=VALUES(`jabatan`), `unit`=VALUES(`unit`), `phoneWa`=VALUES(`phoneWa`), `isActive`=1, `updatedAt`=NOW();"
        )

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_employees, f, ensure_ascii=False, indent=2)
    print(f"✅ Data JSON seed diperbarui: {json_path} ({len(json_employees)} data)")

    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))
    print(f"✅ Data SQL seed diperbarui: {sql_path} ({len(sql_statements)} statements)")

if __name__ == "__main__":
    main()
