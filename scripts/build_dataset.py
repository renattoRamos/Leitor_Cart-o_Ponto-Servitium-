import json
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__)))

from part1 import collaborators_part1
from part2 import collaborators_part2
from part3 import collaborators_part3
from part4 import collaborators_part4

os.makedirs('public', exist_ok=True)
os.makedirs('src/data', exist_ok=True)

all_collaborators = collaborators_part1 + collaborators_part2 + collaborators_part3 + collaborators_part4

dataset = {
    "metadata": {
        "sistema_origem": "pontomais",
        "tipo_documento": "Relatório de Folha de Ponto / Jornada de Trabalho",
        "empresa_orgao": "COMPESA",
        "departamento": "COMPESA GPM (22.4.417)",
        "periodo": {
            "data_inicio": "01/08/2026",
            "data_fim": "31/08/2026",
            "mes_referencia": "08/2026"
        },
        "emissao": {
            "responsavel": "AMANDA FIALHO TORRES",
            "data": "02/09/2026",
            "hora": "16:19"
        },
        "codigo_autenticacao": "10.199576114",
        "total_colaboradores": len(all_collaborators)
    },
    "estatisticas_gerais": {
        "colaboradores_ativos": sum(1 for c in all_collaborators if c["resumo_dias"]["dias_trabalhados"] > 0),
        "colaboradores_em_afastamento_ou_inss": sum(1 for c in all_collaborators if c["resumo_dias"].get("inss", 0) > 0 or c["resumo_dias"].get("inss_atestado", 0) > 0 or c["resumo_dias"]["dias_trabalhados"] == 0),
        "total_horas_extras_50_geral": "1840:15",
        "total_horas_extras_100_geral": "164:12"
    },
    "colaboradores": all_collaborators
}

with open('public/dados_extraidos.json', 'w', encoding='utf-8') as f:
    json.dump(dataset, f, ensure_ascii=False, indent=2)

with open('src/data/pontomais.json', 'w', encoding='utf-8') as f:
    json.dump(dataset, f, ensure_ascii=False, indent=2)

print(f"Generated JSON successfully with {len(all_collaborators)} collaborators.")
