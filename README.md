# Kingdoms of Ash

**Kingdoms of Ash** é um protótipo jogável de estratégia **single-player** inspirado na sensação de um servidor de Travian: desenvolver economia, recrutar exércitos, disputar o ranking, negociar e observar impérios rivais a agir por iniciativa própria.

> Versão **v0.3 — Estratégia por turnos e relatórios de guerra**. Interface em português de Portugal. Sem backend, conta, multiplayer, anúncios, serviços pagos ou dependências JavaScript externas. Não é uma cópia de ativos, código ou interface do Travian.

## Jogar

1. Abre [index.html](./index.html) num navegador moderno. Basta abrir o ficheiro; não é necessário compilar.
2. Em alternativa, a partir da pasta do projeto, inicia um servidor local com `python3 -m http.server 8080` e visita `http://localhost:8080`.
3. O jogo avança **apenas quando carregas em ⏭️ Terminar turno**. Em cada turno, a produção e construções evoluem, as missões viajam/resolvem e os cinco reinos rivais agem. Não existem temporizadores nem progresso offline.
4. Seleciona províncias no mapa para fundar aldeias, enviar incursões ou tentar conquistar. Consulta as abas Aldeias, Exército, Diplomacia, Ranking, Relatórios e Crónicas.

A gravação é automática via `localStorage`, **apenas neste navegador e dispositivo**. Ao reabrir o jogo, o turno mantém-se inalterado. O botão **Nova campanha** substitui o save após confirmação.

## Navegação simplificada (atualização UX)

- O menu **Aldeias · Exército · Diplomacia · Ranking · Relatórios · Crónicas** fica horizontal, libertando espaço para o mapa.
- O cartão **O que fazer a seguir** sugere os primeiros três objetivos (melhorar produção, recrutar tropas e fundar outra aldeia), sem gastar recursos automaticamente.
- **Clica num território no mapa:** a ficha mostra apenas as ações adequadas. Aldeia tua: produção, edifícios/defesa e recrutamento. Terreno neutro: colonização e pilhagem. Reino rival: diplomacia, saque e conquista.
- As construções estão separadas em **Produção** e **Edifícios e defesa**, sem alterar as regras de construção.
- No telemóvel, o painel de ações surge imediatamente abaixo do mapa; **Voltar ao mapa** regressa à escolha de territórios.
- Os saves da v0.1 e da v0.2 são migrados automaticamente (mesma chave local). Nenhuma ação de navegação consome recursos; os botões que gastam recursos continuam explícitos.

## Atualização v0.3 — turnos, emojis e relatórios

- **Turnos exclusivamente manuais.** Nenhuma ação de navegação/recrutamento avança o mundo; usa **Terminar turno** quando terminares as decisões da ronda.
- **Emojis provisórios:** 🌲 madeira, 🧱 barro, ⛏️ ferro, 🌾 cereais; 🏰 aldeias, 🛡️ lanceiros, ⚔️ espadachins, 🐎 cavalaria e 💣 catapultas.
- **Barra militar sempre visível** com contagem de tropas disponíveis, missões enviadas, alertas de ataques a chegar e relatórios novos.
- **🚨 Alerta antes da chegada:** uma marcha inimiga contra uma província tua mostra destino e número de turnos restantes. Em territórios sob ataque, o mapa destaca o aviso.
- **📜 Relatórios de batalha:** para todas as batalhas em que atacas ou defendes, regista o turno, território, atacantes/defensores, tropas por tipo, sobreviventes, baixas, milícias, vitória/derrota, conquista e recursos saqueados. Os relatórios ficam guardados no navegador, com indicador de não lidos (máximo de 120 relatórios).
- **Relatórios acessíveis nas notícias:** as notícias militares permitem abrir o relatório, incluindo depois do fim da campanha.
- **Sem custo automático:** selecionar território, navegar e consultar relatórios não consome recursos nem avança turnos.
- Os saves anteriores permanecem compatíveis, mas não se recriam relatórios de batalhas ocorridas antes desta atualização.

## O que já está implementado

- **Mapa:** 40 províncias, com terreno, especializações de produção e fronteiras controladas por seis facções (tu + cinco governantes rivais).
- **Economia:** madeira, barro, ferro e cereais; produção diária por aldeia, consumo de cereais das tropas e sete melhorias locais com custos e tempo de construção.
- **Expansão:** colonização de províncias neutras dentro de três espaços de uma aldeia tua; preço que aumenta à medida que o império cresce; colonos sujeitos a tempo de viagem e concorrência pelo território.
- **Exército:** lanceiros, espadachins, cavaleiros e catapultas; recrutamento com custos; tropas em trânsito, perdas, defesas, pilhagem, regresso e conquistas com catapultas.
- **Diplomacia:** relações e opiniões persistentes; presentes, pactos de não agressão, alianças, pedidos de apoio, paz e guerra. As fações rivais também assinam pactos, formam alianças e declaram guerras entre si.
- **Rivais simulados:** cinco estilos (agressivo, economista, diplomata, oportunista e defensivo) que produzem, gastam, melhoram aldeias, colonizam e podem combater. Não recebem tropas nem recursos gratuitos para manter a aparência de competição.
- **Ranking:** pontuação calculada a partir de território, população, exército e recursos; varia com as ações de todos os governantes.
- **Eventos:** ultimatos diplomáticos bloqueiam o fim do turno e exigem uma escolha.
- **Condição de vitória:** liderar o ranking com pelo menos **10 aldeias** durante **4 turnos consecutivos**. Os rivais também podem ganhar; perdes caso fiques sem aldeias.
- **História emergente:** registo de colonizações, acordos, conflitos, conquistas e perdas.

## Regras e atalhos

| Ação | Regra |
| --- | --- |
| Colonização | Alvo neutro a até 3 espaços da tua aldeia mais próxima; custa recursos e demora dias |
| Construção | Uma obra de cada vez por aldeia; melhorias de recursos demoram 2 dias, quartel 3 |
| Recrutamento | Lotes de 5; cavaleiros exigem quartel 2 e catapultas quartel 3 |
| Incursão | Envia 25–100% das tropas disponíveis; resultado depende de ataque, defesa e terreno |
| Conquista | Exige atacar uma aldeia rival, sobreviver com pelo menos 2 catapultas e vencer decisivamente |
| Acordo diplomático | Impede atacar aliados ou fações com pacto; podes romper o acordo ou declarar guerra |
| Apoio aliado | Depois de uma aliança, podes pedir uma pequena ajuda de recursos e lanceiros, com tempo de recuperação |
| Turnos | Cada clique em **Terminar turno** avança um dia, resolve missões e executa as ações dos rivais; sem passagem automática do tempo |

## Estrutura

- `index.html` — ecrãs, painéis e estrutura da interface
- `styles.css` — estilo dark fantasy responsivo, mapa, grelha e controlos
- `game.js` — estado, regras, economia, combates, diplomacia, IA, renderização e save
- `tests/smoke.test.cjs` — testes de regressão sem dependências externas

## Executar testes

Requer **Node.js 18+**:

```sh
node --test
```

Os testes cobrem mapa, turnos manuais, fundação, construções, recrutamento, ataques, defesa inimiga, relatórios e baixas/saques, diplomacia, IA, integridade económica e migração de saves da v0.1.

## Limitações conscientes desta versão

Esta é uma **primeira experiência jogável**, não um clone completo nem um jogo terminado. Ainda simplifica:

- Os recursos de todas as aldeias do mesmo império são agregados num tesouro comum, em vez de haver armazéns e mercados separados.
- As unidades militares disponíveis são geridas ao nível do império e a defesa divide-as abstratamente pelas aldeias; não há guarnições ou reforços com trajetos individuais.
- Diplomacia por regras, não por modelos generativos; alianças dão acesso a apoio, mas ainda não planeiam ataques conjuntos.
- As catapultas permitem conquistar, mas ainda não escolhem edifícios a destruir; não existem fakes ou ataques sincronizados.
- Não existem tribos alternativas, exploradores, Maravilha do Mundo, replay/export de saves, dificuldade selecionável nem interface de tutorial completo.
- A IA usa heurísticas transparentes, não modelos de aprendizagem; os diferentes estilos ainda precisam de mais afinação de equilíbrio.
- Algumas ações de protótipo, como o recrutamento, são imediatas após o pagamento. Isso será revisto depois dos testes de diversão.

## Próximo checkpoint de desenvolvimento

**Próxima iteração:** defesa localizada por aldeia, reforços entre províncias, espionagem, catapultas por alvo, coordenação de ataques e equilíbrio da dificuldade. Os relatórios básicos de combate já estão implementados.

## Filosofia de design

O mundo avança **quando o jogador termina o turno**, sem o pressionar com temporizadores nem punir o fecho do jogo. Os rivais devem crescer, reagir e poder vencer com as mesmas restrições económicas. O objetivo é preservar o conflito entre quatro decisões: **crescer, combater, competir e negociar**.
