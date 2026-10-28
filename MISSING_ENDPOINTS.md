# Integração com o backend — lacunas e decisões

Este documento registra o que foi integrado entre este frontend e o backend
(https://github.com/BrunaMiyamoto/pi_sistema_de_gestao_backend.git), o que
não existe no backend e precisou de um workaround no front, e o que
simplesmente não dá para resolver sem mudanças no backend.

Commit do backend usado como referência: estado do branch `main` em
26/10/2026 (`main.py`, `database.py`).

## O que foi integrado

- **Login** (`POST /login`) — `src/composables/useAuth.js`. Guarda o JWT em
  `localStorage` e o injeta em todas as chamadas autenticadas
  (`src/services/api.js`).
- **Cadastro** (`POST /usuarios`) — sempre envia `perfil: "solicitante"`,
  único valor aceito pelo endpoint público.
- **Listagem, criação, atualização e exclusão de pedidos**
  (`GET/POST/PUT/DELETE /pedidos`) — `src/composables/useSolicitacoes.js`,
  usado em `Dashboard.vue`.
- **Orçamentos** (`POST /pedidos/{id}/orcamentos`,
  `PUT /pedidos/{id}/orcamentos/{id}/decisao`) — acionados a partir dos
  campos "Valor Orçado" / "Valor do Pedido" do `ServicoModal`.
- **Relatório comercial** (`GET /relatorios/comercial`) — cards de resumo em
  `Relatorios.vue`, com seletor de mês.
- Ícones de editar/excluir pedido agora só aparecem para quem tem perfil
  `funcionario`/`administrador`, espelhando a regra que o backend já aplica
  em `PUT`/`DELETE /pedidos/{id}`.

## 1. [CRÍTICO] Não existe um endpoint "quem sou eu"

`POST /login` devolve só `{access_token, token_type}`. O JWT carrega apenas
`sub` (id do usuário) e `exp` — nenhum dado de perfil. Não existe
`GET /usuarios/me` nem qualquer outra rota que um usuário comum possa chamar
para descobrir seu próprio nome/perfil (`GET /usuarios` é
`administrador`-only).

**Impacto:** o frontend precisa saber o `perfil` do usuário logo após o
login para decidir o que mostrar (ex.: link "Relatórios", ícones de
editar/excluir pedido, o próprio `GET /pedidos` já filtra certo no servidor,
mas a UI de navegação depende do perfil no cliente).

**Workaround aplicado** (`useAuth.js`): mantemos um "diretório" local em
`localStorage` (`jactoflow:knownUsers`), populado quando o próprio usuário se
cadastra por este frontend. No login, se o e-mail está nesse diretório,
usamos o nome/perfil salvo; senão, assumimos `"solicitante"` por padrão e
marcamos `perfilInferido: true` (exibido como aviso em `Perfil.vue`).

**Consequência prática:** qualquer conta `funcionario`/`administrador`
criada direto no banco (não há outro jeito — ver item 3) será tratada como
`solicitante` da primeira vez que logar neste navegador, e vai perder acesso
a Relatórios/edição de pedidos na UI até alguém ajustar manualmente o
diretório local. As rotas do backend continuam protegidas corretamente
(receberiam 403 se a UI deixasse passar), então não é um risco de segurança,
é uma limitação de usabilidade.

**Recomendação:** adicionar `GET /usuarios/me` (ou devolver nome/perfil
dentro da resposta do `POST /login`), acessível a qualquer usuário
autenticado.

## 2. [CRÍTICO] Upload/consulta de anexos é restrito à Ferramentaria

`POST /pedidos/{id}/anexos`, `GET /pedidos/{id}/anexos` e
`GET /pedidos/{id}/anexos/{id}/download` exigem `exigir_funcionario`
(`funcionario` ou `administrador`).

**Impacto:** o formulário "Nova Solicitação" tem um campo de arquivo
pensado para o *solicitante* anexar desenhos técnicos ao abrir o pedido —
mas a própria pessoa que cria o pedido não tem permissão para enviar nem
depois visualizar o anexo que ela mesma enviaria.

**O que foi feito:** o campo de arquivo continua na UI (para não mudar o
formulário), mas o valor não é enviado a lugar nenhum — nenhuma chamada de
upload acontece. Um aviso foi adicionado no próprio formulário avisando que
o envio de anexos ainda não está disponível.

**Recomendação:** permitir que o `usuario_id` dono do pedido também
faça upload/listagem/download dos próprios anexos (hoje só `pedido.usuario_id
== usuario.id` extra na mesma checagem que já existe para `solicitante` em
`GET /pedidos/{id}`).

## 3. [CRÍTICO] Não há como criar uma conta `funcionario`/`administrador` pela API

`POST /usuarios` é público (sem `Depends`) e **sempre** rejeita qualquer
`perfil` diferente de `solicitante`, independentemente de quem está
chamando. `PUT /usuarios/{id}` muda o perfil de uma conta já existente, mas
exige `administrador` — ou seja, só promove alguém que **já existe** como
`solicitante`. Não existe nenhuma rota para criar a primeira conta
`administrador`/`funcionario` do sistema.

**Impacto direto neste frontend:** na tela de Cadastro, se a pessoa escolhe
o perfil "Ferramentaria", a conta é criada como Solicitante mesmo assim; a
UI agora mostra um aviso explicando isso e pedindo para um administrador
promover a conta depois.

**Como testamos isso durante esta integração:** inserindo a conta
`funcionario` direto no SQLite (não há outro caminho hoje).

**Recomendação:** um endpoint administrativo para criar usuários com
qualquer perfil (`POST /usuarios` autenticado como `administrador`, por
exemplo), e/ou uma forma de provisionar o primeiro administrador (seed/CLI).

## 4. O tipo de serviço (ferramenta) desapareceu da criação de pedido

`GET /ferramentas` ainda existe e lista os tipos (Molde de Injeção, Molde de
Sopro etc.), mas `PedidoCriar` (`POST /pedidos`) só aceita `prazo` e
`descricao_solicitante` — não há mais `ferramenta_id`. O comentário no
próprio `main.py` confirma a intenção ("Cadastrar pedido sem exigir tipo de
ferramenta").

**Workaround aplicado:** o formulário "Nova Solicitação" continua
perguntando o tipo de serviço, e o frontend concatena esse valor dentro de
`descricao_solicitante` como um prefixo (`[Tipo de Serviço: X] ...`), só
para a informação não se perder. É um hack de exibição, não um campo
estruturado — não dá para filtrar/relatar por tipo de serviço no backend.

**Recomendação:** decidir, junto com quem mantém o backend, se o tipo de
serviço volta a ser um campo estruturado (`ferramenta_id` de volta no
`PedidoCriar`) ou se o campo deve simplesmente sair do formulário do
frontend.

## 5. Orçamento/valor do pedido é um sub-recurso com histórico, não dois campos simples

O backend modela isso como `orcamentos`: cada pedido pode ter várias
revisões (`numero_revisao`), cada revisão tem um `situacao`
(`apresentado`/`aprovado`/`recusado`/`substituido`), e só a revisão mais
recente pode ser decidida. Não existe nenhum endpoint que devolva o pedido
já com o valor orçado/fechado embutido — é preciso buscar
`GET /pedidos/{id}/orcamentos` por pedido.

**Impacto:**
- **N+1 na listagem.** `Relatorios.vue` busca todos os pedidos e depois faz
  uma chamada de orçamentos *por pedido* para preencher as colunas "Valor
  Orçado"/"Valor do Pedido". Funciona para o volume de dados de um projeto
  acadêmico, mas não escala.
- **Simplificação no `ServicoModal`.** O formulário tem só dois campos
  (Valor Orçado, Valor do Pedido) e um botão "Salvar". Mapeamos isso para o
  fluxo real assim (`salvarValoresOrcamento` em `useSolicitacoes.js`):
  - Se "Valor Orçado" for preenchido e for diferente da revisão
    `apresentado` mais recente (ou não houver nenhuma), cria uma nova
    revisão (`POST /orcamentos`).
  - Se "Valor do Pedido" for preenchido e a revisão mais recente estiver
    `apresentado`, decide essa revisão como `aprovado` com esse valor
    (`PUT .../decisao`).
  - **Não cobre:** decidir como `recusado`, editar uma revisão já decidida,
    ou visualizar/gerenciar o histórico de revisões — o formulário simples
    não tem UI para isso.
- Os cards de resumo de `Relatorios.vue` (Nº Orçamentos, Nº Pedidos, Hit
  Rate, Valor Orçado, Valor Pedido, Win Rate) foram trocados para consumir
  `GET /relatorios/comercial?mes=AAAA-MM` diretamente — esse endpoint já
  calcula tudo isso igual ao que a UI queria mostrar. Só que esse endpoint é
  **por mês de calendário**, enquanto a tabela de pedidos abaixo dos cards
  continua usando o filtro de intervalo de datas da própria tela — os dois
  não ficam sincronizados (selecionar outro mês não refiltra a tabela, e
  vice-versa).

**Recomendação:** um endpoint que devolva pedidos já com o valor
orçado/fechado vigente embutido (ou um parâmetro `incluir=orcamento` em
`GET /pedidos`), para evitar o N+1 e simplificar o front.

## 6. `StatusCards` do Dashboard têm 4 categorias; o backend só tem 3 status

`status` em `pedidos` só aceita `andamento`, `aguardando`, `concluida`. Os
cards do Dashboard (herdados do protótipo original, antes desta integração)
preveem "Pendentes", "Em Análise", "Em Atendimento" e "Concluídas" — não há
uma correspondência 1:1.

**Mapeamento aplicado** (`Dashboard.vue`): Pendentes = `andamento`, Em
Atendimento = `aguardando`, Concluídas = `concluida`, Em Análise = sempre
`0` (sem equivalente no backend).

**Recomendação:** um produto decidir se os 4 rótulos do card devem virar 3
(alinhados ao enum do backend) ou se o backend precisa de um status
intermediário novo.

## 7. Sem edição de perfil / troca de senha pelo próprio usuário

`PUT /usuarios/{id}` exige `administrador`. Não existe `PATCH /usuarios/me`
nem qualquer rota de "alterar minha senha". O botão "Editar perfil" em
`Perfil.vue` já existia sem funcionalidade antes desta integração e
continua assim — não dava para implementá-lo com o que a API expõe hoje.

**Recomendação:** permitir que o próprio usuário autenticado atualize
nome/e-mail/senha (sem poder alterar seu próprio `perfil`).

## 8. Sem recuperação de senha

A tela "Esqueci minha senha" (`RecuperacaoSenha.vue`) simula o envio de um
link (`setTimeout` local) porque **não existe nenhum endpoint de
recuperação/redefinição de senha no backend**. Não alterei esse
comportamento simulado — não dá para integrar algo que não existe, e fingir
uma chamada de API real seria pior do que deixar explícito que é só
front-end.

**Recomendação:** endpoints de "esqueci minha senha" (gerar token por
e-mail) e "redefinir senha" (consumir token + nova senha).

## 9. Filtros de `GET /pedidos` são limitados

O endpoint aceita `data` (exata), `mes`, `descricao` (substring) e
`solicitante` (substring) — não há filtro por `status` nem por intervalo de
datas.

**O que foi feito:** o frontend busca a lista inteira (que o próprio backend
já restringe por usuário/perfil) uma vez e continua filtrando/ordenando
tudo no cliente, como já fazia antes — só a fonte dos dados mudou de mock
para API.

**Recomendação:** se o volume de pedidos crescer, vale adicionar `status` e
`data_inicio`/`data_fim` como query params em `GET /pedidos`.

## Outras diferenças menores, já tratadas no código

- Backend usa `perfil` em minúsculas (`solicitante`/`funcionario`/
  `administrador`); a UI antiga usava `tipoPerfil` com valores em português
  capitalizado (`"Solicitante"`/`"Ferramentaria"`). Padronizei em
  `useAuth.js`: `perfil` é a fonte da verdade (valor do backend) e
  `tipoPerfil` é só o rótulo derivado para exibição.
- `CORS` do backend (`main.py`) só libera `http://localhost:5173` e
  `http://127.0.0.1:5173`. Se o front rodar em outra porta (o Vite sobe em
  5174+ quando 5173 já está ocupada), as chamadas vão falhar por CORS — não
  é bug da integração, é preciso atualizar `allow_origins` no backend (ou
  sempre liberar a porta 5173 localmente) antes de testar.
- `VITE_API_URL` controla a URL do backend (`src/services/api.js`), padrão
  `http://127.0.0.1:8000`. Copie `.env.example` para `.env` para
  customizar.

## Como testei

Rodei o backend localmente (Python 3.12 + `requirements.txt`, variáveis
`JWT_SECRET_KEY`/`JWT_ALGORITHM`/`JWT_EXPIRE_MINUTES` num `.env`) e bati via
`curl` em cada endpoint que o frontend chama, na ordem que o app realmente
usa: cadastro → login → listar pedidos → criar pedido → (com um usuário
`funcionario` inserido manualmente no SQLite, por causa do item 3) atualizar
pedido → criar orçamento → decidir orçamento → relatório comercial. Todas as
respostas vieram no formato que o código em `src/composables/` e
`src/views/Relatorios.vue` espera. Não consegui abrir um navegador real
neste ambiente para um teste visual ponta a ponta — recomendo rodar
`npm run dev` com o backend no ar e passar pelo fluxo login → nova
solicitação → editar (como Ferramentaria) → relatórios antes de considerar
isso pronto para revisão.
