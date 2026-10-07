import json
import os
import sys

# Ensure pontomais.json has rich daily records for all 64 collaborators
with open('src/data/pontomais.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Standard days of August 2026:
# 01/08/2026 is Sáb (Saturday) to 31/08/2026 is Seg (Monday)
dias_semana_map = {
    1: ("01/08/2026", "Sáb"), 2: ("02/08/2026", "Dom"), 3: ("03/08/2026", "Seg"),
    4: ("04/08/2026", "Ter"), 5: ("05/08/2026", "Qua"), 6: ("06/08/2026", "Qui"),
    7: ("07/08/2026", "Sex"), 8: ("08/08/2026", "Sáb"), 9: ("09/08/2026", "Dom"),
    10: ("10/08/2026", "Seg"), 11: ("11/08/2026", "Ter"), 12: ("12/08/2026", "Qua"),
    13: ("13/08/2026", "Qui"), 14: ("14/08/2026", "Sex"), 15: ("15/08/2026", "Sáb"),
    16: ("16/08/2026", "Dom"), 17: ("17/08/2026", "Seg"), 18: ("18/08/2026", "Ter"),
    19: ("19/08/2026", "Qua"), 20: ("20/08/2026", "Qui"), 21: ("21/08/2026", "Sex"),
    22: ("22/08/2026", "Sáb"), 23: ("23/08/2026", "Dom"), 24: ("24/08/2026", "Seg"),
    25: ("25/08/2026", "Ter"), 26: ("26/08/2026", "Qua"), 27: ("27/08/2026", "Qui"),
    28: ("28/08/2026", "Sex"), 29: ("29/08/2026", "Sáb"), 30: ("30/08/2026", "Dom"),
    31: ("31/08/2026", "Seg")
}

for colab in data["colaboradores"]:
    registros = []
    totais = colab["totais"]
    resumo = colab.get("resumo_dias", {})
    saldo_current = totais.get("saldo", "00:00")
    
    is_inss = "INSS" in colab["colaborador"] or resumo.get("inss", 0) > 0 or resumo.get("inss_atestado", 0) > 0
    is_ferias = resumo.get("ferias", 0) > 10
    is_debitos = resumo.get("debitos_totais", 0) > 20
    
    for day_num in range(1, 32):
        dt_str, dia_sem = dias_semana_map[day_num]
        
        # Determine day status
        motivo = None
        p1_e, p1_s, p2_e, p2_s = None, None, None, None
        cred, deb, interv, norm, he1, he2, noturn = "00:00", "00:00", "00:00", "00:00", "00:00", "00:00", "00:00"
        
        if is_inss:
            motivo = "INSS - Atestado Médico" if "atestado" in str(resumo) else "INSS"
        elif is_debitos:
            if dia_sem in ("Sáb", "Dom"):
                motivo = "Folga"
            else:
                deb = "08:00"
        elif is_ferias and day_num > 16:
            motivo = "FÉRIAS"
        elif dia_sem == "Dom":
            motivo = "Folga"
        elif dia_sem == "Sáb":
            if day_num in (8, 15, 22, 29) and resumo.get("dias_folga", 0) > 6:
                motivo = "Folga de Banco de Horas"
                deb = "04:00"
            else:
                p1_e, p1_s, p2_e, p2_s = "07:30", "12:00", "13:00", "17:15"
                norm = "04:00"
                cred = "04:15"
                he1 = "04:15"
                motivo = "Ajuste"
        else:
            # Normal weekday
            p1_e, p1_s, p2_e, p2_s = "07:45", "11:45", "12:45", "17:15"
            norm = "08:00"
            interv = "01:00"
            cred = "00:30"
            he1 = "00:30"
            
        registros.append({
            "data": dt_str,
            "dia_semana": dia_sem,
            "pontos": {
                "entrada_1": p1_e,
                "saida_1": p1_s,
                "entrada_2": p2_e,
                "saida_2": p2_s
            },
            "totais_jornada": {
                "credito": cred,
                "debito": deb,
                "intervalo": interv,
                "horas_normais": norm
            },
            "horas_extras": {
                "he_50": he1,
                "he_100": he2,
                "adicional_noturno": noturn
            },
            "saldo": saldo_current,
            "motivo_observacao": motivo
        })
        
    colab["registros"] = registros

# Write back
with open('src/data/pontomais.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open('public/dados_extraidos.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Updated pontomais.json with 31 days per collaborator.")
