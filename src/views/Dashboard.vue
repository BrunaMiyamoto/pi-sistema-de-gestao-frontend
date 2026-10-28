<script setup>
import { computed, onMounted, ref, watch } from "vue";
import AppHeader from "../components/AppHeader.vue";
import StatusCards from "../components/StatusCards.vue";
import NovaSolicitacaoModal from "../components/NovaSolicitacaoModal.vue";
import ServicoModal from "../components/ServicoModal.vue";
import ExcluirSolicitacaoModal from "../components/ExcluirSolicitacaoModal.vue";
import { useAuth, isFerramentaria } from "../composables/useAuth";
import { useSolicitacoes } from "../composables/useSolicitacoes";
import { exportarParaExcel } from "../utils/exportarExcel";

const { state: authState } = useAuth();
const {
  solicitacoes,
  state: solicitacoesState,
  carregarSolicitacoes,
  registrarSolicitacao: criarSolicitacao,
  atualizarSolicitacao,
  removerSolicitacao,
  carregarValoresOrcamento,
} = useSolicitacoes();

// O backend já filtra /pedidos pelo usuário logado quando o perfil é
// "solicitante", então não é preciso repetir esse filtro aqui no front.
const podeVerTodos = computed(() => isFerramentaria(authState.currentUser));

onMounted(() => {
  carregarSolicitacoes().catch(() => {});
});

// A API só tem 3 status de pedido (andamento/aguardando/concluida); os
// cards do dashboard preveem 4 categorias. Mapeamento aproximado abaixo —
// ver MISSING_ENDPOINTS.md, item 6.
const stats = computed(() => ({
  pendentes: solicitacoes.filter((s) => s.status === "andamento").length,
  emAnalise: 0,
  emAtendimento: solicitacoes.filter((s) => s.status === "aguardando").length,
  concluidas: solicitacoes.filter((s) => s.status === "concluida").length,
}));

const statusLabel = {
  andamento: "Em Andamento",
  aguardando: "Aguardando",
  concluida: "Concluída",
};

const statusClasses = {
  andamento: "bg-status-indigoBg text-status-indigoText",
  aguardando: "bg-status-inProgressBg text-status-inProgress",
  concluida: "bg-status-doneBg text-status-doneText",
};

function parseDataBR(str) {
  if (!str) return null;
  const [dia, mes, ano] = str.split("/").map(Number);
  if (!dia || !mes || !ano) return null;
  return new Date(ano, mes - 1, dia);
}

function parseDataInputISO(str) {
  if (!str) return null;
  const [ano, mes, dia] = str.split("-").map(Number);
  if (!dia || !mes || !ano) return null;
  return new Date(ano, mes - 1, dia);
}

const pesquisa = ref("");
const filtroStatus = ref("");
const filtroSolicitante = ref("");
const filtroDataInicio = ref("");
const filtroDataFim = ref("");

// Nada a filtrar aqui: GET /pedidos já devolve só os pedidos do próprio
// usuário quando o perfil não é Ferramentaria.
const solicitacoesVisiveis = computed(() => solicitacoes);

const solicitantesUnicos = computed(() =>
  Array.from(
    new Set(solicitacoesVisiveis.value.map((s) => s.solicitante).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR")),
);

const solicitacoesFiltradas = computed(() => {
  const termo = pesquisa.value.trim().toLowerCase();
  const inicio = parseDataInputISO(filtroDataInicio.value);
  const fim = parseDataInputISO(filtroDataFim.value);

  return solicitacoesVisiveis.value.filter((solicitacao) => {
    const correspondeTermo =
      !termo ||
      [solicitacao.id, solicitacao.solicitante, solicitacao.tipoServico]
        .join(" ")
        .toLowerCase()
        .includes(termo);

    const correspondeStatus =
      !filtroStatus.value || solicitacao.status === filtroStatus.value;

    const correspondeSolicitante =
      !filtroSolicitante.value || solicitacao.solicitante === filtroSolicitante.value;

    const dataSolicitacao = parseDataBR(solicitacao.data);
    const correspondeDataInicio =
      !inicio || (dataSolicitacao && dataSolicitacao >= inicio);
    const correspondeDataFim =
      !fim || (dataSolicitacao && dataSolicitacao <= fim);

    return (
      correspondeTermo &&
      correspondeStatus &&
      correspondeSolicitante &&
      correspondeDataInicio &&
      correspondeDataFim
    );
  });
});

function exportarSolicitacoes() {
  const linhas = solicitacoesOrdenadas.value.map((s) => ({
    ID: s.id,
    Data: s.data,
    Solicitante: s.solicitante,
    "Tipo de Serviço": s.tipoServico,
    Prazo: s.prazo,
    Status: statusLabel[s.status],
    "Valor Orçado (R$)": s.valorOrcado ?? "",
    "Valor do Pedido (R$)": s.valorPedido ?? "",
  }));
  exportarParaExcel(linhas, "solicitacoes", "Solicitações");
}

function limparFiltros() {
  pesquisa.value = "";
  filtroStatus.value = "";
  filtroSolicitante.value = "";
  filtroDataInicio.value = "";
  filtroDataFim.value = "";
}

// O filtro é todo local (ver solicitacoesVisiveis/solicitacoesFiltradas
// acima), mas mesmo assim sinalizamos um loading breve na tabela para dar
// feedback visual de que a busca/filtro foi aplicado.
const filtrando = ref(false);
let filtrandoTimeout = null;

watch([pesquisa, filtroStatus, filtroSolicitante, filtroDataInicio, filtroDataFim], () => {
  filtrando.value = true;
  clearTimeout(filtrandoTimeout);
  filtrandoTimeout = setTimeout(() => {
    filtrando.value = false;
  }, 700);
});

const sortColuna = ref(null);
const sortDirecao = ref("asc");

function alternarOrdenacao(campo) {
  if (sortColuna.value === campo) {
    sortDirecao.value = sortDirecao.value === "asc" ? "desc" : "asc";
  } else {
    sortColuna.value = campo;
    sortDirecao.value = "asc";
  }
}

function classeIconeOrdenacao(campo) {
  if (sortColuna.value !== campo) return "fa-sort opacity-40";
  return sortDirecao.value === "asc" ? "fa-sort-up" : "fa-sort-down";
}

function valorOrdenavel(solicitacao, campo) {
  if (campo === "data" || campo === "prazo") return parseDataBR(solicitacao[campo]);
  if (campo === "status") return statusLabel[solicitacao.status] ?? "";
  return solicitacao[campo] ?? "";
}

const solicitacoesOrdenadas = computed(() => {
  const lista = [...solicitacoesFiltradas.value];
  if (!sortColuna.value) return lista;

  const direcao = sortDirecao.value === "asc" ? 1 : -1;

  return lista.sort((a, b) => {
    const valorA = valorOrdenavel(a, sortColuna.value);
    const valorB = valorOrdenavel(b, sortColuna.value);

    if (valorA instanceof Date || valorB instanceof Date) {
      const tempoA = valorA ? valorA.getTime() : 0;
      const tempoB = valorB ? valorB.getTime() : 0;
      return (tempoA - tempoB) * direcao;
    }

    return String(valorA).localeCompare(String(valorB), "pt-BR") * direcao;
  });
});

const novaSolicitacaoAberta = ref(false);
const servicoModalAberto = ref(false);
const solicitacaoSelecionada = ref(null);

function abrirNovaSolicitacao() {
  solicitacoesState.erroAcao = "";
  novaSolicitacaoAberta.value = true;
}

function fecharNovaSolicitacao() {
  novaSolicitacaoAberta.value = false;
}

async function registrarSolicitacao(dadosForm) {
  try {
    await criarSolicitacao(dadosForm);
    fecharNovaSolicitacao();
  } catch {
    // erro exibido no modal via solicitacoesState.erroAcao; modal permanece aberto
  }
}

async function abrirServico(solicitacao) {
  solicitacoesState.erroAcao = "";
  if (podeVerTodos.value) {
    await carregarValoresOrcamento(solicitacao).catch(() => {});
  }
  solicitacaoSelecionada.value = solicitacao;
  servicoModalAberto.value = true;
}

function fecharServico() {
  servicoModalAberto.value = false;
}

async function salvarServico(dadosForm) {
  if (!solicitacaoSelecionada.value) return;
  try {
    await atualizarSolicitacao(solicitacaoSelecionada.value, dadosForm);
    fecharServico();
  } catch {
    // erro exibido no modal via solicitacoesState.erroAcao; modal permanece aberto
  }
}

const excluirModalAberto = ref(false);
const solicitacaoParaExcluir = ref(null);

function excluirSolicitacao(solicitacao) {
  solicitacoesState.erroAcao = "";
  solicitacaoParaExcluir.value = solicitacao;
  excluirModalAberto.value = true;
}

function fecharExclusao() {
  excluirModalAberto.value = false;
  solicitacaoParaExcluir.value = null;
}

async function confirmarExclusao() {
  try {
    await removerSolicitacao(solicitacaoParaExcluir.value);
    fecharExclusao();
  } catch {
    // erro exibido no modal via solicitacoesState.erroAcao; modal permanece aberto
  }
}
</script>

<template>
  <div class="bg-surface-page dark:bg-surface-authBg min-h-screen">
    <AppHeader logged-in />

    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex justify-between items-center">
        <h1 class="font-bold text-surface-dark dark:text-white text-2xl">Dashboard</h1>
        <div class="flex gap-2">
          <button
            type="button"
            :disabled="solicitacoesOrdenadas.length === 0"
            class="flex items-center gap-2 bg-white dark:bg-surface-dark border border-slate-300 dark:border-surface-border hover:border-brand-mint text-surface-dark dark:text-white text-sm font-bold py-1.5 px-4 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-300 dark:disabled:hover:border-surface-border"
            @click="exportarSolicitacoes"
          >
            <i class="fa-solid fa-file-excel text-brand-mint"></i>
            Exportar Excel
          </button>
          <button
            class="bg-brand-mint hover:bg-brand-turquoise text-white text-sm font-bold py-1.5 px-4 rounded-xl cursor-pointer"
            @click="abrirNovaSolicitacao"
          >
            + Nova Solicitação
          </button>
        </div>
      </div>

      <StatusCards :stats="stats" />

      <!-- BARRA DE PESQUISA E FILTROS -->
      <div class="bg-white dark:bg-surface-dark p-2 rounded-xl shadow">
        <div class="flex gap-2 items-center">
          <i class="fa-solid fa-magnifying-glass text-ink-secondary dark:text-white"></i>

          <input
            v-model="pesquisa"
            type="text"
            name="pesquisar"
            id="pesquisar"
            placeholder="Buscar solicitação po ID,solicitante ou tipo..."
            class="w-full bg-transparent dark:text-white dark:placeholder:text-ink-mutedDark"
          />
        </div>

        <div
          class="flex flex-wrap gap-3 items-end mt-3 pt-3 border-t border-surface-borderLight dark:border-surface-border"
        >
          <div class="flex flex-col">
            <label
              for="filtroStatus"
              class="text-xs font-semibold text-ink-secondary dark:text-ink-mutedDark mb-1"
              >Status</label
            >
            <select
              v-model="filtroStatus"
              id="filtroStatus"
              name="filtroStatus"
              class="border border-slate-300 dark:border-surface-border rounded-sm p-1 bg-white dark:bg-surface-authBg dark:text-white focus:outline-none focus:ring-2 focus:ring-status-indigoText"
            >
              <option value="">Todos</option>
              <option v-for="(label, valor) in statusLabel" :key="valor" :value="valor">
                {{ label }}
              </option>
            </select>
          </div>

          <div v-if="podeVerTodos" class="flex flex-col">
            <label
              for="filtroSolicitante"
              class="text-xs font-semibold text-ink-secondary dark:text-ink-mutedDark mb-1"
              >Solicitante</label
            >
            <select
              v-model="filtroSolicitante"
              id="filtroSolicitante"
              name="filtroSolicitante"
              class="border border-slate-300 dark:border-surface-border rounded-sm p-1 bg-white dark:bg-surface-authBg dark:text-white focus:outline-none focus:ring-2 focus:ring-status-indigoText"
            >
              <option value="">Todos</option>
              <option
                v-for="solicitante in solicitantesUnicos"
                :key="solicitante"
                :value="solicitante"
              >
                {{ solicitante }}
              </option>
            </select>
          </div>

          <div class="flex flex-col">
            <label
              for="filtroDataInicio"
              class="text-xs font-semibold text-ink-secondary dark:text-ink-mutedDark mb-1"
              >De</label
            >
            <input
              v-model="filtroDataInicio"
              type="date"
              id="filtroDataInicio"
              name="filtroDataInicio"
              class="border border-slate-300 dark:border-surface-border rounded-sm p-1 bg-white dark:bg-surface-authBg dark:text-white focus:outline-none focus:ring-2 focus:ring-status-indigoText"
            />
          </div>

          <div class="flex flex-col">
            <label
              for="filtroDataFim"
              class="text-xs font-semibold text-ink-secondary dark:text-ink-mutedDark mb-1"
              >Até</label
            >
            <input
              v-model="filtroDataFim"
              type="date"
              id="filtroDataFim"
              name="filtroDataFim"
              class="border border-slate-300 dark:border-surface-border rounded-sm p-1 bg-white dark:bg-surface-authBg dark:text-white focus:outline-none focus:ring-2 focus:ring-status-indigoText"
            />
          </div>

          <button
            type="button"
            @click="limparFiltros"
            class="flex items-center gap-1 text-sm font-semibold text-ink-secondary dark:text-ink-mutedDark hover:text-red-600 dark:hover:text-red-400 border border-slate-300 dark:border-surface-border rounded-sm px-3 py-1.5 cursor-pointer"
          >
            <i class="fa-solid fa-filter-circle-xmark dark:text-white"></i>
            Limpar Filtros
          </button>
        </div>
      </div>
      <!-- FIM DA BARRA DE PESQUISA E FILTROS -->

      <!-- TABELA TABELA TABELA TABELA  -->
      <div
        class="bg-white dark:bg-surface-dark shadow-sm border border-surface-borderLight dark:border-surface-border rounded-xl overflow-hidden mt-9"
      >
        <table class="w-full text-left border-collapse">
          <thead class="">
            <tr
              class="bg-surface-subtle dark:bg-surface-authBg border-b border-surface-borderLight dark:border-surface-border text-ink-secondary dark:text-ink-mutedDark text-sm font-semibold"
            >
              <th
                class="px-3 py-3 font-semibold cursor-pointer select-none"
                @click="alternarOrdenacao('id')"
              >
                <span class="inline-flex items-center gap-1"
                  >ID
                  <i
                    class="fa-solid text-[10px] dark:text-white"
                    :class="classeIconeOrdenacao('id')"
                  ></i></span
                >
              </th>
              <th
                class="py-3 font-semibold hidden sm:table-cell cursor-pointer select-none"
                @click="alternarOrdenacao('data')"
              >
                <span class="inline-flex items-center gap-1"
                  >Data
                  <i
                    class="fa-solid text-[10px] dark:text-white"
                    :class="classeIconeOrdenacao('data')"
                  ></i></span
                >
              </th>
              <th
                class="py-3 font-semibold hidden sm:table-cell cursor-pointer select-none"
                @click="alternarOrdenacao('solicitante')"
              >
                <span class="inline-flex items-center gap-1"
                  >Solicitante
                  <i
                    class="fa-solid text-[10px] dark:text-white"
                    :class="classeIconeOrdenacao('solicitante')"
                  ></i></span
                >
              </th>
              <th
                class="py-3 px-3 font-semibold hidden sm:table-cell cursor-pointer select-none"
                @click="alternarOrdenacao('tipoServico')"
              >
                <span class="inline-flex items-center gap-1"
                  >Tipo de Serviço
                  <i
                    class="fa-solid text-[10px] dark:text-white"
                    :class="classeIconeOrdenacao('tipoServico')"
                  ></i></span
                >
              </th>
              <th
                class="py-3 font-semibold cursor-pointer select-none"
                @click="alternarOrdenacao('prazo')"
              >
                <span class="inline-flex items-center gap-1"
                  >Prazo
                  <i
                    class="fa-solid text-[10px] dark:text-white"
                    :class="classeIconeOrdenacao('prazo')"
                  ></i></span
                >
              </th>
              <th
                class="py-3 font-semibold cursor-pointer select-none"
                @click="alternarOrdenacao('status')"
              >
                <span class="inline-flex items-center gap-1"
                  >Status
                  <i
                    class="fa-solid text-[10px] dark:text-white"
                    :class="classeIconeOrdenacao('status')"
                  ></i></span
                >
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="solicitacoesState.loading || filtrando">
              <td colspan="7" class="py-10 text-center">
                <div class="flex flex-col items-center gap-2 text-ink-secondary dark:text-ink-mutedDark">
                  <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-mint"></i>
                  <p class="font-semibold">Carregando solicitações...</p>
                </div>
              </td>
            </tr>
            <tr v-else-if="solicitacoesOrdenadas.length === 0">
              <td colspan="7" class="py-10 text-center">
                <div class="flex flex-col items-center gap-2 text-ink-secondary dark:text-ink-mutedDark">
                  <i class="fa-solid fa-inbox text-3xl opacity-40"></i>
                  <p class="font-semibold">Nenhuma solicitação</p>
                </div>
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="solicitacao in solicitacoesOrdenadas"
                :key="solicitacao.id"
                class="shadow"
              >
                <td class="font-semibold text-black dark:text-white px-3">
                  {{ solicitacao.id }}
                </td>
                <td class="text-ink-secondary dark:text-ink-mutedDark hidden sm:table-cell">
                  {{ solicitacao.data }}
                </td>
                <td class="font-semibold text-black dark:text-white hidden sm:table-cell">
                  {{ solicitacao.solicitante }}
                </td>
                <td class="font-semibold text-black dark:text-white hidden sm:table-cell">
                  {{ solicitacao.tipoServico }}
                </td>
                <td class="text-ink-secondary dark:text-ink-mutedDark w-24 sm:w-auto">
                  {{ solicitacao.prazo }}
                </td>
                <td class="p-2">
                  <div
                    :class="statusClasses[solicitacao.status]"
                    class="text-sm font-bold rounded-2xl my-2 p-1 max-w-32 text-center"
                  >
                    {{ statusLabel[solicitacao.status] }}
                  </div>
                </td>
                <td class="p-2">
                  <template v-if="podeVerTodos">
                    <a @click="abrirServico(solicitacao)"
                      ><i
                        class="fa-solid fa-pen-to-square cursor-pointer fa-[20px] text-surface-dark dark:text-white"
                      ></i
                    ></a>
                    <a @click="excluirSolicitacao(solicitacao)"
                      ><i
                        class="fa-solid fa-trash-can cursor-pointer fa-[20px] text-red-600 hover:text-red-700 dark:text-red-400"
                      ></i
                    ></a>
                  </template>
                  <span v-else class="text-ink-mutedDark text-xs">-</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <!-- FIM TABELA FIM TABELA FIM TABELA FIM TABELA  -->

      <NovaSolicitacaoModal
        :open="novaSolicitacaoAberta"
        :loading="solicitacoesState.salvando"
        :erro="solicitacoesState.erroAcao"
        @close="fecharNovaSolicitacao"
        @submit="registrarSolicitacao"
      />

      <ServicoModal
        :open="servicoModalAberto"
        :solicitacao="solicitacaoSelecionada"
        :loading="solicitacoesState.salvando"
        :erro="solicitacoesState.erroAcao"
        @close="fecharServico"
        @submit="salvarServico"
      />

      <ExcluirSolicitacaoModal
        :open="excluirModalAberto"
        :solicitacao="solicitacaoParaExcluir"
        :loading="solicitacoesState.salvando"
        :erro="solicitacoesState.erroAcao"
        @close="fecharExclusao"
        @confirm="confirmarExclusao"
      />
    </main>
    <footer>
      <div class="bg-surface-dark p-5"></div>
    </footer>
  </div>
</template>
