#!/bin/bash
cd "$(dirname "$0")"
python3 -c "import json; data=json.load(open('../data/aerodromos.json', encoding='utf-8')); open('../data/aerodromos.js','w',encoding='utf-8').write('window.AERODROMOS = '+json.dumps(data, ensure_ascii=False, separators=(',',':'))+';'); print('OK:', len(data), 'aerodromos')"
