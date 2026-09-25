# Piano: Aggiunta del dato di nuvolosità (cloud cover) al JSON inviato

## Contesto

Il progetto `solar-monitor-box.yaml` (ESPHome) invia un JSON con i dati del pannello e della batteria, ad esempio:

```json
{"tstamp":1789988829,"v_pan":13.51,"i_pan":0.747,"w_pan":10.096,"v_bat":13.48,"i_bat":-0.701,"w_bat":9.455,"rssi":-52,"valid":true,"t_box":31.50}
```

L'obiettivo è aggiungere un dato di **nuvolosità** (cloud cover) al JSON, come coefficiente da 0 a 1 (0 = cielo sereno, 1 = totalmente coperto).

## Sorgente dati gratuita e semplice

La scelta migliore è **Open-Meteo** (https://open-meteo.com/), che:
- È **gratuito** per uso non commerciale (nessuna API key richiesta per volumi bassi).
- Non richiede registrazione.
- Fornisce il campo `cloud_cover` (0-100%) tramite una semplice chiamata HTTP GET.
- Supporta coordinate geografiche (latitudine/longitudine).

Esempio di chiamata:
```
https://api.open-meteo.com/v1/forecast?latitude=45.0&longitude=9.0&current=cloud_cover
```

Risposta (JSON):
```json
{
  "current": {
    "cloud_cover": 45
  }
}
```

## Approccio alternativo (se si preferisce non dipendere da coordinate fisse)

- **ipwho.is** o **ip-api.com**: forniscono la geolocalizzazione dell'IP, ma NON danno la nuvolosità. Servirebbero comunque per ricavare lat/lon e poi chiamare Open-Meteo.
- Dato che la scatola è fissa (monitor solare), è più semplice e robusto **configurare latitudine e longitudine direttamente nel file YAML** e chiamare Open-Meteo.

## Modifiche da apportare

### 1. `solar-monitor-box.yaml`
- Aggiungere una sezione `http_request` per effettuare la chiamata HTTP a Open-Meteo.
- Aggiungere un sensore `template` (o `sensor`) per memorizzare il cloud cover.
- Aggiungere un `interval` (es. ogni 10 minuti) che:
  1. Chiama Open-Meteo con le coordinate configurate.
  2. Parsa la risposta JSON.
  3. Salva il valore di `cloud_cover` (convertito da 0-100 a 0-1).
- Aggiungere il campo `cloud_cover` al JSON inviato.

### 2. `secrets.yaml`
- (Opzionale) Aggiungere latitudine e longitudine come segreti, oppure configurarle direttamente nel YAML.

## Verifica

- Compilare con `esphome compile solar-monitor-box.yaml`.
- Verificare che il JSON inviato contenga il campo `cloud_cover`.

## Note

- Il valore di `cloud_cover` da Open-Meteo è in percentuale (0-100). Per il coefficiente 0-1 richiesto, dividere per 100.
- Se la chiamata fallisce, mantenere l'ultimo valore valido (o inviare un valore di default).
