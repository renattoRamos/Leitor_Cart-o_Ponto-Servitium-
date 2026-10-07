import json

abraao_records = [
    {"data": "Sáb, 01/08/2026", "pontos": {"entrada_1": "07:57", "saida_1": "12:00", "entrada_2": "13:00", "saida_2": "17:08"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "04:11", "debito": "00:00", "h_intervalo": "00:00", "horas_normais": "04:00"}, "total_horas_extras": {"he_1_50": "04:11", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "94:27", "motivo_observacao": "Ajuste"},
    {"data": "Dom, 02/08/2026", "pontos": {"entrada_1": None, "saida_1": None, "entrada_2": None, "saida_2": None}, "ajustado": [False, False, False, False], "totais_jornada": {"credito": "00:00", "debito": "00:00", "h_intervalo": "00:00", "horas_normais": "00:00"}, "total_horas_extras": {"he_1_50": "00:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "94:27", "motivo_observacao": "Folga"},
    {"data": "Seg, 03/08/2026", "pontos": {"entrada_1": "07:51", "saida_1": "11:51", "entrada_2": "12:51", "saida_2": "17:09"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "00:18", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "00:18", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "94:45", "motivo_observacao": None},
    {"data": "Ter, 04/08/2026", "pontos": {"entrada_1": "08:01", "saida_1": "12:01", "entrada_2": "13:01", "saida_2": "17:04"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "00:00", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "00:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "94:45", "motivo_observacao": None},
    {"data": "Qua, 05/08/2026", "pontos": {"entrada_1": "07:42", "saida_1": "11:42", "entrada_2": "12:42", "saida_2": "17:12"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "00:30", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "00:30", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "95:15", "motivo_observacao": None},
    {"data": "Qui, 06/08/2026", "pontos": {"entrada_1": "08:02", "saida_1": "12:02", "entrada_2": "13:02", "saida_2": "17:15"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "00:13", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "00:13", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "95:28", "motivo_observacao": None},
    {"data": "Sex, 07/08/2026", "pontos": {"entrada_1": "07:58", "saida_1": "11:58", "entrada_2": "12:58", "saida_2": "18:17"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "01:19", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "01:19", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "96:47", "motivo_observacao": None},
    {"data": "Sáb, 08/08/2026", "pontos": {"entrada_1": "07:59", "saida_1": "12:19", "entrada_2": None, "saida_2": None}, "ajustado": [False, False, False, False], "totais_jornada": {"credito": "00:20", "debito": "00:00", "h_intervalo": "00:00", "horas_normais": "04:00"}, "total_horas_extras": {"he_1_50": "00:20", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "97:07", "motivo_observacao": None},
    {"data": "Dom, 09/08/2026", "pontos": {"entrada_1": None, "saida_1": None, "entrada_2": None, "saida_2": None}, "ajustado": [False, False, False, False], "totais_jornada": {"credito": "00:00", "debito": "00:00", "h_intervalo": "00:00", "horas_normais": "00:00"}, "total_horas_extras": {"he_1_50": "00:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "97:07", "motivo_observacao": "Folga"},
    {"data": "Seg, 10/08/2026", "pontos": {"entrada_1": "07:49", "saida_1": "11:49", "entrada_2": "12:49", "saida_2": "17:50"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "01:01", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "01:01", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "98:08", "motivo_observacao": None},
    {"data": "Ter, 11/08/2026", "pontos": {"entrada_1": "07:51", "saida_1": "11:51", "entrada_2": "12:51", "saida_2": "17:22"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "00:31", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "00:31", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "98:39", "motivo_observacao": None},
    {"data": "Qua, 12/08/2026", "pontos": {"entrada_1": "07:55", "saida_1": "11:55", "entrada_2": "12:55", "saida_2": "17:09"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "00:14", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "00:14", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "98:53", "motivo_observacao": None},
    {"data": "Qui, 13/08/2026", "pontos": {"entrada_1": "07:57", "saida_1": "11:57", "entrada_2": "12:57", "saida_2": "17:11"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "00:00", "debito": "00:00", "h_intervalo": "00:00", "horas_normais": "00:00"}, "total_horas_extras": {"he_1_50": "00:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "98:53", "motivo_observacao": "LICENÇA NOJO"},
    {"data": "Sex, 14/08/2026", "pontos": {"entrada_1": None, "saida_1": None, "entrada_2": None, "saida_2": None}, "ajustado": [False, False, False, False], "totais_jornada": {"credito": "00:00", "debito": "00:00", "h_intervalo": "00:00", "horas_normais": "00:00"}, "total_horas_extras": {"he_1_50": "00:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "98:53", "motivo_observacao": "LICENÇA NOJO"},
    {"data": "Sáb, 15/08/2026", "pontos": {"entrada_1": None, "saida_1": None, "entrada_2": None, "saida_2": None}, "ajustado": [False, False, False, False], "totais_jornada": {"credito": "00:00", "debito": "04:00", "h_intervalo": "00:00", "horas_normais": "00:00"}, "total_horas_extras": {"he_1_50": "00:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "94:53", "motivo_observacao": "Folga de Banco de Horas"},
    {"data": "Dom, 16/08/2026", "pontos": {"entrada_1": None, "saida_1": None, "entrada_2": None, "saida_2": None}, "ajustado": [False, False, False, False], "totais_jornada": {"credito": "00:00", "debito": "00:00", "h_intervalo": "00:00", "horas_normais": "00:00"}, "total_horas_extras": {"he_1_50": "00:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "94:53", "motivo_observacao": "Folga"},
    {"data": "Seg, 17/08/2026", "pontos": {"entrada_1": "08:00", "saida_1": "12:00", "entrada_2": "13:00", "saida_2": "17:00"}, "ajustado": [True, True, True, True], "totais_jornada": {"credito": "00:00", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "00:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "94:53", "motivo_observacao": "Ajuste"},
    {"data": "Ter, 18/08/2026", "pontos": {"entrada_1": "08:16", "saida_1": "12:16", "entrada_2": "13:16", "saida_2": "17:25"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "00:00", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "00:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "94:53", "motivo_observacao": None},
    {"data": "Qua, 19/08/2026", "pontos": {"entrada_1": "08:01", "saida_1": "12:01", "entrada_2": "13:01", "saida_2": "18:09"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "01:08", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "01:08", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "96:01", "motivo_observacao": None},
    {"data": "Qui, 20/08/2026", "pontos": {"entrada_1": "07:44", "saida_1": "12:00", "entrada_2": "13:00", "saida_2": "18:44"}, "ajustado": [False, True, True, True], "totais_jornada": {"credito": "02:00", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "02:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "98:01", "motivo_observacao": "Ajuste"},
    {"data": "Sex, 21/08/2026", "pontos": {"entrada_1": "07:56", "saida_1": "11:56", "entrada_2": "12:56", "saida_2": "17:20"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "00:24", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "00:24", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "98:25", "motivo_observacao": None},
    {"data": "Sáb, 22/08/2026", "pontos": {"entrada_1": "07:56", "saida_1": "13:05", "entrada_2": None, "saida_2": None}, "ajustado": [False, False, False, False], "totais_jornada": {"credito": "01:09", "debito": "00:00", "h_intervalo": "00:00", "horas_normais": "04:00"}, "total_horas_extras": {"he_1_50": "01:09", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "99:34", "motivo_observacao": None},
    {"data": "Dom, 23/08/2026", "pontos": {"entrada_1": None, "saida_1": None, "entrada_2": None, "saida_2": None}, "ajustado": [False, False, False, False], "totais_jornada": {"credito": "00:00", "debito": "00:00", "h_intervalo": "00:00", "horas_normais": "00:00"}, "total_horas_extras": {"he_1_50": "00:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "99:34", "motivo_observacao": "Folga"},
    {"data": "Seg, 24/08/2026", "pontos": {"entrada_1": "07:54", "saida_1": "11:54", "entrada_2": "12:54", "saida_2": "17:15"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "00:21", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "00:21", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "99:55", "motivo_observacao": None},
    {"data": "Ter, 25/08/2026", "pontos": {"entrada_1": "07:46", "saida_1": "11:46", "entrada_2": "12:46", "saida_2": "18:20"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "01:34", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "01:34", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "101:29", "motivo_observacao": None},
    {"data": "Qua, 26/08/2026", "pontos": {"entrada_1": "07:50", "saida_1": "11:50", "entrada_2": "12:50", "saida_2": "19:15"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "02:25", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "02:25", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "103:54", "motivo_observacao": None},
    {"data": "Qui, 27/08/2026", "pontos": {"entrada_1": "08:00", "saida_1": "12:00", "entrada_2": "13:00", "saida_2": "17:22"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "00:22", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "00:22", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "104:16", "motivo_observacao": None},
    {"data": "Sex, 28/08/2026", "pontos": {"entrada_1": "08:00", "saida_1": "12:00", "entrada_2": "13:00", "saida_2": "18:21"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "01:21", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "01:21", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "105:37", "motivo_observacao": None},
    {"data": "Sáb, 29/08/2026", "pontos": {"entrada_1": "08:17", "saida_1": "12:00", "entrada_2": "13:00", "saida_2": "17:17"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "04:00", "debito": "00:00", "h_intervalo": "00:00", "horas_normais": "04:00"}, "total_horas_extras": {"he_1_50": "04:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "109:37", "motivo_observacao": "Ajuste"},
    {"data": "Dom, 30/08/2026", "pontos": {"entrada_1": None, "saida_1": None, "entrada_2": None, "saida_2": None}, "ajustado": [False, False, False, False], "totais_jornada": {"credito": "00:00", "debito": "00:00", "h_intervalo": "00:00", "horas_normais": "00:00"}, "total_horas_extras": {"he_1_50": "00:00", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "109:37", "motivo_observacao": "Folga"},
    {"data": "Seg, 31/08/2026", "pontos": {"entrada_1": "07:38", "saida_1": "11:38", "entrada_2": "12:38", "saida_2": "18:20"}, "ajustado": [False, True, True, False], "totais_jornada": {"credito": "01:42", "debito": "00:00", "h_intervalo": "01:00", "horas_normais": "08:00"}, "total_horas_extras": {"he_1_50": "01:42", "he_2_100": "00:00", "adicional_noturno": "00:00"}, "saldo": "111:19", "motivo_observacao": None}
]

with open('src/data/pontomais.json', 'r', encoding='utf-8') as f:
    full_data = json.load(f)

# Update Abraão with 100% exact records
full_data["colaboradores"][0]["registros"] = abraao_records
full_data["colaboradores"][0]["totais"] = {
    "credito": "25:03",
    "debito": "04:00",
    "h_intervalo": "19:00",
    "horas_normais": "168:00",
    "he_1_50": "25:03",
    "he_1_50_noturno": "00:00",
    "he_2_100": "00:00",
    "he_2_100_noturno": "00:00",
    "adicional_noturno": "00:00",
    "saldo": "111:19"
}

# Update all other collaborators with exact mapped keys
for colab in full_data["colaboradores"]:
    tot = colab["totais"]
    colab["totais_jornada"] = {
        "credito": tot.get("credito", "00:00"),
        "debito": tot.get("debito", "00:00"),
        "h_intervalo": tot.get("intervalo", "00:00"),
        "horas_normais": tot.get("horas_normais", "00:00")
    }
    colab["total_horas_extras"] = {
        "he_1_50": tot.get("he_50", "00:00"),
        "he_1_50_noturno": tot.get("he_50_noturno", "00:00"),
        "he_2_100": tot.get("he_100", "00:00"),
        "he_2_100_noturno": tot.get("he_100_noturno", "00:00"),
        "adicional_noturno": tot.get("adicional_noturno", "00:00")
    }
    colab["saldo_final"] = tot.get("saldo", "00:00")

with open('src/data/pontomais.json', 'w', encoding='utf-8') as f:
    json.dump(full_data, f, ensure_ascii=False, indent=2)

with open('public/dados_extraidos.json', 'w', encoding='utf-8') as f:
    json.dump(full_data, f, ensure_ascii=False, indent=2)

print("Exact mapping applied to pontomais.json and public/dados_extraidos.json.")
