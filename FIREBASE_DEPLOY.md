# Publicar Kingdoms of Ash no Firebase Hosting

Esta configuração publica **apenas** o jogo estático (`index.html`, `game.js`, `styles.css`, `travian-layout.css`) através da pasta `dist/`. Não inclui testes, código do repositório ou documentos.

## Primeira publicação num projeto já existente

1. No [Firebase Console](https://console.firebase.google.com/), abre o projeto **do Kingdoms of Ash**. Copia o **ID do projeto**, apresentado em Definições do projeto. Confirma que **não** é um projeto do Wanderer nem do Plague.
2. No Mac, com Node.js instalado, prepara o CLI Firebase (caso ainda não esteja instalado):
   ```sh
   npm install -g firebase-tools
   firebase login
   firebase projects:list
   ```
3. Descarrega/clona este repositório e, na pasta do projeto, executa:
   ```sh
   npm run check
   firebase deploy --only hosting --project ID_EXATO_DO_KINGDOMS_OF_ASH
   ```
4. Abre o domínio indicado pelo Firebase no final (normalmente `https://ID_DO_PROJETO.web.app`) e verifica as vistas Recursos, Aldeia e Mapa.

**Nunca omitir `--project`** neste projeto até haver confirmação inequívoca de qual Firebase Hosting pertence ao Kingdoms of Ash. Não criar `.firebaserc` com outro projeto por aproximação.

## Por que não há deploy automático?

Falta confirmar o ID Firebase e a credencial de deploy do Kingdoms of Ash. Uma GitHub Action deve ser adicionada apenas depois desses dados estarem confirmados, usando uma conta de serviço exclusiva guardada em GitHub Secrets; não copiar segredos de Wanderer/Plague.

## Verificação local

```sh
npm run check
npx firebase-tools hosting:channel:deploy preview --project ID_EXATO_DO_KINGDOMS_OF_ASH
```

O comando de preview cria um canal de teste. O comando `firebase deploy --only hosting` publica no canal live.
