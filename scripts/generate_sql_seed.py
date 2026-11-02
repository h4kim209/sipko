import json

with open('prisma/seeds/employees.json', 'r', encoding='utf-8') as f:
    employees = json.load(f)

lines = ['-- Seed Master Data Guru & Tendik SIPKO', 'INSERT INTO `employees` (`id`, `name`, `nip`, `nuptk`, `pangkatGol`, `jabatan`, `unit`, `phoneWa`, `gender`, `isActive`, `createdAt`, `updatedAt`) VALUES']
vals = []
for i, e in enumerate(employees, 1):
    id_str = f"emp_{i:04d}"
    name = e['name'].replace("'", "''")
    nip = e['nip'].replace("'", "''") if e.get('nip') else ''
    nuptk = e['nuptk'].replace("'", "''") if e.get('nuptk') else ''
    pangkat = e['pangkatGol'].replace("'", "''") if e.get('pangkatGol') else ''
    jabatan = e['jabatan'].replace("'", "''") if e.get('jabatan') else 'Guru / Tendik'
    unit = e['unit'].replace("'", "''") if e.get('unit') else 'SMKN 1 Subang'
    phone = e['phoneWa'].replace("'", "''") if e.get('phoneWa') else ''
    gender = e['gender'].replace("'", "''") if e.get('gender') else ''
    vals.append(f"('{id_str}', '{name}', '{nip}', '{nuptk}', '{pangkat}', '{jabatan}', '{unit}', '{phone}', '{gender}', 1, NOW(), NOW())")

sql = lines[0] + '\n' + lines[1] + '\n' + ',\n'.join(vals) + ' ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `phoneWa`=VALUES(`phoneWa`), `pangkatGol`=VALUES(`pangkatGol`);\n'

with open('prisma/seeds/employees.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print('Saved prisma/seeds/employees.sql successfully!')
