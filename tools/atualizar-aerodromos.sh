#!/bin/bash
set -e
cd "$(dirname "$0")"

DATA_DIR="../data"
mkdir -p "$DATA_DIR"

echo ""
echo "🛬  Atualizador de aeródromos ANAC"
echo "=================================="
echo ""

URL_PUB="https://www.gov.br/anac/pt-br/assuntos/regulados/aeroportos-e-aerodromos/cadastro-de-aerodromos-privativo/aerodromos-cadastrados/cadastro-de-aerodromos-civis-publicos.csv"
URL_PRIV="https://sistemas.anac.gov.br/dadosabertos/Aerodromos/Aer%C3%B3dromos%20Privados/Lista%20de%20aer%C3%B3dromos%20privados/Aerodromos%20Privados/AerodromosPrivados.csv"

echo "📥 Baixando aeródromos PÚBLICOS..."
curl -sSL -A "Mozilla/5.0" --max-time 60 -o publicos.csv "$URL_PUB" \
  && echo "   ✔ OK ($(wc -c < publicos.csv) bytes)" \
  || { echo "   ✘ Falhou"; exit 1; }

echo "📥 Baixando aeródromos PRIVADOS..."
curl -sSL -A "Mozilla/5.0" --max-time 60 -o privados.csv "$URL_PRIV" \
  && echo "   ✔ OK ($(wc -c < privados.csv) bytes)" \
  || { echo "   ✘ Falhou"; exit 1; }

echo ""
echo "🔄 Convertendo para JSON (com lat/lon)..."
python3 <<'PYEOF'
import json, re, sys

def clean(s):
    return re.sub(r'\s+', ' ', (s or '').strip())

def to_float(s):
    """Converte string de coordenada pra float. Aceita vírgula ou ponto."""
    if s is None: return None
    t = str(s).strip().replace(',', '.')
    if not t: return None
    try:
        return float(t)
    except:
        return None

def parse_csv(src, dst, tipo):
    with open(src, 'rb') as f:
        raw = f.read()
    text = raw.decode('cp1252', errors='replace')
    lines = text.splitlines()

    delim = ';'
    for line in lines[:5]:
        if 'OACI' in line or 'ICAO' in line:
            if line.count(';') >= line.count('\t'):
                delim = ';'
            elif line.count('\t') > line.count(';'):
                delim = '\t'
            break

    header_idx = None
    for i, line in enumerate(lines):
        if 'OACI' in line or 'ICAO' in line:
            header_idx = i
            break
    if header_idx is None:
        print(f"   ✘ Não achei cabeçalho em {src}")
        sys.exit(1)

    data_lines = lines[header_idx:]
    header = [clean(h) for h in data_lines[0].split(delim)]

    def find_col(*terms):
        for idx, h in enumerate(header):
            up = h.upper()
            if any(t in up for t in terms) and 'PORTARIA' not in up:
                return idx
        return None

    i_icao = find_col('OACI', 'ICAO')
    i_nome = find_col('NOME')
    i_cid  = find_col('MUNIC', 'MUNICÍPIO', 'MUNICIPIO')
    i_uf   = None
    for idx, h in enumerate(header):
        if h.strip().upper() == 'UF':
            i_uf = idx
            break
    i_lat  = find_col('LATITUDE')
    i_lon  = find_col('LONGITUDE')

    if i_icao is None:
        print(f"   ✘ Coluna OACI não encontrada. Header: {header}")
        sys.exit(1)

    print(f"   → Colunas encontradas: ICAO={i_icao} NOME={i_nome} MUNIC={i_cid} UF={i_uf} LAT={i_lat} LON={i_lon}")

    rows = []
    com_coord = 0
    for line in data_lines[1:]:
        if not line.strip():
            continue
        cols = line.split(delim)
        if i_icao >= len(cols):
            continue
        icao = clean(cols[i_icao]).upper()
        if not re.match(r'^[A-Z]{4}$', icao):
            continue

        lat = to_float(cols[i_lat]) if i_lat is not None and i_lat < len(cols) else None
        lon = to_float(cols[i_lon]) if i_lon is not None and i_lon < len(cols) else None
        if lat is not None and lon is not None:
            com_coord += 1

        rows.append({
            "icao":   icao,
            "nome":   clean(cols[i_nome]) if i_nome is not None and i_nome < len(cols) else "",
            "cidade": clean(cols[i_cid])  if i_cid  is not None and i_cid  < len(cols) else "",
            "uf":     clean(cols[i_uf]).upper() if i_uf is not None and i_uf < len(cols) else "",
            "tipo":   tipo,
            "lat":    lat,
            "lon":    lon
        })

    print(f"   ✔ {dst}: {len(rows)} aeródromos ({com_coord} com coordenadas)")
    with open(dst, 'w', encoding='utf-8') as out:
        json.dump(rows, out, ensure_ascii=False, indent=0)
    return rows

pub = parse_csv('publicos.csv', '../data/aerodromos-publicos.json', 'público')
priv = parse_csv('privados.csv', '../data/aerodromos-privados.json', 'privado')

seen = {}
for r in pub + priv:
    if r['icao'] not in seen:
        seen[r['icao']] = r

final = sorted(seen.values(), key=lambda x: x['icao'])
with open('../data/aerodromos.json', 'w', encoding='utf-8') as fp:
    json.dump(final, fp, ensure_ascii=False, separators=(',', ':'))

# Gera o .js pro HTML
with open('../data/aerodromos.js', 'w', encoding='utf-8') as fp:
    fp.write('window.AERODROMOS = ')
    json.dump(final, fp, ensure_ascii=False, separators=(',', ':'))
    fp.write(';\n')

com_coord_total = sum(1 for r in final if r.get('lat') and r.get('lon'))
print(f"   ✔ ../data/aerodromos.json: {len(final)} aeródromos únicos")
print(f"   ✔ {com_coord_total} com coordenadas válidas")
PYEOF

echo ""
echo "🧹 Limpando arquivos temporários..."
rm -f publicos.csv privados.csv

echo ""
echo "✅ Pronto!"
ls -lh "$DATA_DIR"
echo ""
