# scripts/generate_uploadable_teachers_excel.py
# Membuat file Excel akur dan siap di-upload: data guru/DAFTAR_GURU_TENDIK_LENGKAP.xlsx
# Format standar baris 1 = HEADER, baris 2 dst = DATA
# Diakurkan 100% antara DAFTARGURUTENDIK2027.xlsx dan data nama nip dan no hp.txt

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json
import re
import os

def clean(s):
    if not s: return ''
    return re.sub(r'[^a-zA-Z0-9]', '', str(s).lower())

def format_phone(phone_val):
    if not phone_val:
        return ""
    p = str(phone_val).strip().replace("'", "").replace("+", "").replace("-", "").replace(" ", "")
    if p.endswith('.0'):
        p = p[:-2]
    p = re.sub(r'[^0-9]', '', p)
    if not p:
        return ""
    if p.startswith('628'):
        p = '08' + p[3:]
    elif p.startswith('62') and not p.startswith('08'):
        p = '0' + p[2:]
    elif not p.startswith('0'):
        p = '0' + p
    return p

def main():
    print("1. Membaca data nama nip dan no hp.txt...")
    txt_path = os.path.join("data guru", "data nama nip dan no hp.txt")
    with open(txt_path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read().strip()
    if not text.startswith('['): text = '[' + text
    if not text.endswith(']'): text = text.rstrip().rstrip(',') + ']'
    txt_data = json.loads(text)
    print(f"Total data di txt: {len(txt_data)}")

    # Indexing txt
    txt_by_nip = {}
    txt_by_name = {}
    for it in txt_data:
        raw_nip = str(it.get('nip') or '').strip()
        c_nip = re.sub(r'\D', '', raw_nip)
        if c_nip:
            txt_by_nip[c_nip] = it
            if len(c_nip) >= 14:
                txt_by_nip[c_nip[:14]] = it
        c_name = clean(it.get('name'))
        if c_name:
            txt_by_name[c_name] = it

    print("2. Membaca DAFTARGURUTENDIK2027.xlsx...")
    xlsx_path = os.path.join("data guru", "DAFTARGURUTENDIK2027.xlsx")
    wb = openpyxl.load_workbook(xlsx_path)
    sheet = wb.active

    reconciled = []
    
    # Baris 2 sampai 160 adalah data pegawai
    # Col 1: NO, Col 2: NAMA GURU, Col 3: L/P, Col 4: PANGKAT, Col 5: GOL, Col 6: NIP
    for r in range(2, 161):
        nama = sheet.cell(r, 2).value
        if not nama or str(nama).strip() == "":
            continue
        
        nama = str(nama).strip()
        lp = str(sheet.cell(r, 3).value or "").strip().upper()
        pangkat = str(sheet.cell(r, 4).value or "").strip()
        gol = str(sheet.cell(r, 5).value or "").strip()
        nip_val = str(sheet.cell(r, 6).value or "").strip()

        if pangkat == "-" or pangkat == "None": pangkat = ""
        if gol == "-" or gol == "None": gol = ""
        if nip_val == "-" or nip_val == "None": nip_val = ""

        c_nip = re.sub(r'\D', '', nip_val)
        c_name = clean(nama)

        matched = None
        if c_nip and c_nip in txt_by_nip:
            matched = txt_by_nip[c_nip]
        elif c_nip and len(c_nip) >= 14 and c_nip[:14] in txt_by_nip:
            matched = txt_by_nip[c_nip[:14]]
        elif c_name in txt_by_name:
            matched = txt_by_name[c_name]
        else:
            for k, v in txt_by_name.items():
                if len(k) > 6 and (k in c_name or c_name in k):
                    matched = v
                    break

        phone = ""
        if matched:
            matched["used"] = True
            phone = format_phone(matched.get("phone"))
        
        # Khusus Kepala Sekolah (Ibu Walyati) yang tidak ada di txt:
        if "walyati" in c_name and not phone:
            phone = "085351856062"

        # Pangkat Golongan
        pangkat_gol = ""
        if pangkat and gol:
            pangkat_gol = f"{pangkat} ({gol})"
        elif pangkat:
            pangkat_gol = pangkat
        elif gol:
            pangkat_gol = gol

        # Jabatan
        jabatan = "Guru"
        if r == 2 or "kepala sekolah" in nama.lower():
            jabatan = "Kepala Sekolah"
        elif "tata usaha" in nama.lower() or (pangkat in ["TT", "PW"] and not gol):
            jabatan = "Tenaga Kependidikan / Staf TU"
        elif pangkat:
            jabatan = f"Guru ({pangkat})"

        reconciled.append({
            "name": nama,
            "nip": nip_val,
            "gender": lp,
            "pangkat_gol": pangkat_gol,
            "jabatan": jabatan,
            "unit": "SMK Negeri 1 Subang",
            "phone": phone,
            "status": "Aktif"
        })

    # Masukkan sisa orang dari txt yang belum ada di Excel
    for it in txt_data:
        if not it.get("used"):
            name = it.get("name", "").strip()
            if not name: continue
            raw_nip = str(it.get("nip") or "").strip()
            if raw_nip.endswith("000"): raw_nip = ""
            phone = format_phone(it.get("phone"))
            reconciled.append({
                "name": name,
                "nip": raw_nip,
                "gender": it.get("gender", ""),
                "pangkat_gol": "-",
                "jabatan": "Guru / Tendik",
                "unit": "SMK Negeri 1 Subang",
                "phone": phone,
                "status": "Aktif"
            })

    print(f"Total data akur lengkap: {len(reconciled)} orang")

    # 3. Buat File Excel Standar Upload (Header PERSIS di Baris 1)
    out_wb = openpyxl.Workbook()
    ws = out_wb.active
    ws.title = "Data Guru & Tendik"

    # Header tepat di Baris 1
    headers = [
        "No",
        "Nama Lengkap",
        "NIP",
        "Pangkat / Golongan",
        "Jabatan",
        "Unit Kerja",
        "Nomor WhatsApp",
        "Status"
    ]

    header_fill = PatternFill(start_color="0D9488", end_color="0D9488", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    data_font = Font(name="Segoe UI", size=10)
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    ws.row_dimensions[1].height = 28
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(1, col_idx, h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = thin_border

    zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    for idx, r in enumerate(reconciled, 1):
        row_num = idx + 1
        ws.row_dimensions[row_num].height = 22

        # Format sebagai teks agar tidak hilang 0 di depan
        nip_text = str(r["nip"]).strip() if r["nip"] else ""
        phone_text = str(r["phone"]).strip() if r["phone"] else ""

        row_vals = [
            idx,
            r["name"],
            nip_text,
            r["pangkat_gol"] or "-",
            r["jabatan"],
            r["unit"],
            phone_text,
            r["status"]
        ]

        for col_idx, val in enumerate(row_vals, 1):
            cell = ws.cell(row_num, col_idx)
            # Paksa tipe teks untuk NIP dan No WA
            if col_idx in [3, 7]:
                cell.number_format = '@'
                cell.value = str(val) if val else ""
            else:
                cell.value = val

            cell.font = data_font
            cell.border = thin_border
            if col_idx in [1, 3, 7, 8]:
                cell.alignment = center_align
            else:
                cell.alignment = left_align

            if idx % 2 == 0:
                cell.fill = zebra_fill

    # Set column widths
    col_widths = {
        'A': 8,   # No
        'B': 38,  # Nama Lengkap
        'C': 26,  # NIP
        'D': 28,  # Pangkat / Golongan
        'E': 26,  # Jabatan
        'F': 24,  # Unit Kerja
        'G': 20,  # Nomor WhatsApp
        'H': 14   # Status
    }
    for col_letter, w in col_widths.items():
        ws.column_dimensions[col_letter].width = w

    # Simpan file Excel siap upload
    out_path = os.path.join("data guru", "DAFTAR_GURU_TENDIK_SIPKO_UPLOAD.xlsx")
    out_wb.save(out_path)
    print(f"[OK] File Excel siap upload disimpan di: {out_path}")

    # Simpan juga ke public agar bisa langsung diunduh dari web
    public_copy = os.path.join("public", "DAFTAR_GURU_TENDIK_SIPKO_UPLOAD.xlsx")
    out_wb.save(public_copy)
    print(f"[OK] Salinan publik disimpan di: {public_copy}")

    # Coba simpan ke nama lama jika file tidak sedang dibuka di Excel
    try:
        old_path = os.path.join("data guru", "DAFTAR_GURU_TENDIK_LENGKAP.xlsx")
        out_wb.save(old_path)
        print(f"[OK] File Excel juga berhasil diperbarui di: {old_path}")
    except PermissionError:
        print("[INFO] 'DAFTAR_GURU_TENDIK_LENGKAP.xlsx' sedang dibuka di aplikasi Excel lain, file utama disimpan di 'DAFTAR_GURU_TENDIK_SIPKO_UPLOAD.xlsx'")

    # Simpan template kosong di public
    template_wb = openpyxl.Workbook()
    tws = template_wb.active
    tws.title = "Template Guru SIPKO"
    tws.row_dimensions[1].height = 28
    for col_idx, h in enumerate(headers, 1):
        cell = tws.cell(1, col_idx, h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = thin_border

    # Beri 2 baris contoh
    sample_rows = [
        [1, "Walyati Retnoningsih, S.Si., M.AP.", "19741110 200501 2 010", "Pembina Tk. I (IV/b)", "Kepala Sekolah", "SMK Negeri 1 Subang", "085351856062", "Aktif"],
        [2, "Dra. Hj. Mulya Rohati", "19670316 199203 2 003", "Pembina Utama Muda (IV/c)", "Guru Ahli Madya", "SMK Negeri 1 Subang", "082240280593", "Aktif"],
    ]
    for idx, srow in enumerate(sample_rows, 1):
        r_num = idx + 1
        tws.row_dimensions[r_num].height = 22
        for col_idx, val in enumerate(srow, 1):
            cell = tws.cell(r_num, col_idx)
            if col_idx in [3, 7]:
                cell.number_format = '@'
                cell.value = str(val)
            else:
                cell.value = val
            cell.font = data_font
            cell.border = thin_border
            if col_idx in [1, 3, 7, 8]:
                cell.alignment = center_align
            else:
                cell.alignment = left_align

    for col_letter, w in col_widths.items():
        tws.column_dimensions[col_letter].width = w

    os.makedirs("public", exist_ok=True)
    template_path = os.path.join("public", "template_guru_sipko.xlsx")
    template_wb.save(template_path)
    print(f"[OK] File template kosong disimpan di: {template_path}")

    # Simpan ke seeds JSON & SQL
    json_employees = []
    sql_statements = []

    for idx, r in enumerate(reconciled, 1):
        emp_id = f"emp_{idx:04d}"
        clean_name = r["name"].strip()
        clean_nip_val = r["nip"].strip() if r["nip"] else None
        clean_pangkat = r["pangkat_gol"].strip() if r["pangkat_gol"] and r["pangkat_gol"] != "-" else None
        clean_jabatan = r["jabatan"].strip() if r["jabatan"] else "Guru / Tendik"
        clean_unit = r["unit"].strip() if r["unit"] else "SMK Negeri 1 Subang"
        clean_phone = r["phone"].strip() if r["phone"] else None

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

    json_path = os.path.join("prisma", "seeds", "employees.json")
    sql_path = os.path.join("prisma", "seeds", "employees.sql")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_employees, f, ensure_ascii=False, indent=2)
    print(f"[OK] JSON seeds: {json_path} ({len(json_employees)} data)")

    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))
    print(f"[OK] SQL seeds: {sql_path} ({len(sql_statements)} statements)")

if __name__ == "__main__":
    main()
