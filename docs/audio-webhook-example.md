# Processamento de Áudios do WhatsApp

Este documento descreve como a API processa mensagens de áudio recebidas via webhook do WhatsApp.

## Fluxo de Processamento

1. **Recebimento do Webhook**: O webhook recebe uma mensagem de áudio com a estrutura:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1211338270424866",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5511914403625",
              "phone_number_id": "540109022529160"
            },
            "contacts": [
              {
                "profile": {
                  "name": "João Peretti"
                },
                "wa_id": "5514998328107"
              }
            ],
            "messages": [
              {
                "from": "5514998328107",
                "id": "wamid.HBgNNTUxNDk5ODMyODEwNxUCABIYFDNBN0ExNzFFM0U4ODRBNTVBNjIzAA==",
                "timestamp": "1750765196",
                "type": "audio",
                "audio": {
                  "mime_type": "audio/ogg; codecs=opus",
                  "sha256": "fKKJIxSt03n3LsQnknSneU5F080P2P8z2AqyMMU7KJk=",
                  "id": "10052996331450837",
                  "voice": true
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

2. **Obtenção da URL Temporária**: A API faz uma requisição para obter a URL de download:

```bash
curl -i -X GET \
  "https://graph.facebook.com/v23.0/10052996331450837?access_token=${META_ACCESS_TOKEN}"
```

3. **Download do Áudio**: O áudio é baixado da URL temporária retornada pelo Facebook.

4. **Upload para S3**: O arquivo de áudio é salvo no Amazon S3 na pasta `audios/`.

5. **Transcrição**: O áudio é transcrito usando a API do OpenAI Whisper.

6. **Processamento**: A transcrição é processada como uma mensagem de texto normal.

## Variáveis de Ambiente Necessárias

Certifique-se de que as seguintes variáveis estão configuradas:

```env
META_ACCESS_TOKEN=seu_token_do_meta
OPENAI_API_KEY=sua_chave_da_openai
OPENAI_API_BASEURL=https://api.openai.com/v1
AWS_ACCESS_KEY_ID=sua_access_key_aws
AWS_SECRET_ACCESS_KEY=sua_secret_key_aws
```

## Estrutura de Arquivos no S3

Os arquivos de áudio são salvos na seguinte estrutura:

```
bucket-name/
  audios/
    audio_10052996331450837_1750765196000.ogg
    audio_10052996331450838_1750765197000.ogg
    ...
```

## Tratamento de Erros

- **Erro ao obter URL**: Se não conseguir obter a URL temporária do Facebook
- **Erro de download**: Se não conseguir baixar o áudio
- **Erro de upload**: Se não conseguir salvar no S3
- **Erro de transcrição**: Se a API do OpenAI falhar na transcrição

Em caso de erro, a mensagem de áudio não será processada e um erro será logado.

## Exemplo de Teste

Para testar localmente, você pode usar o ngrok para expor sua API e configurar o webhook do WhatsApp para apontar para sua URL local:

```bash
ngrok http 3000
```

Depois configure o webhook no Facebook Developer Console para apontar para:
```
https://your-ngrok-url.ngrok.io/webhook
``` 