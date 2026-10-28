<script setup>
import { computed, onMounted, ref, watch } from "vue";
import AppHeader from "../components/AppHeader.vue";
import { useSolicitacoes } from "../composables/useSolicitacoes";
import { exportarParaExcel } from "../utils/exportarExcel";
import { api } from "../services/api";

const { solicitacoes, state: solicitacoesState, carregarSolicitacoes, carregarValoresOrcamento } =
  useSolicitacoes();

function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

// Cards de resumo vêm direto de GET /relatorios/comercial, que já calcula
// hit rate / win rate no servidor para o mês escolhido.
const mesRelatorio = ref(mesAtual());
const relatorioComercial = ref(null);
const relatorioCarregando = ref(false);
const relatorioErro = ref("");

async function carregarRelatorioComercial() {
  relatorioCarregando.value = true;
  relatorioErro.value = "";
  try {
    relatorioComercial.value = await api.get("/relatorios/comercial", { mes: mesRelatorio.value });
  } catch (err) {
    relatorioErro.value = err.data?.detail || err.message || "Não foi possível carregar o relatório.";
  } finally {
    relatorioCarregando.value = false;
  }
}

watch(mesRelatorio, carregarRelatorioComercial);

onMounted(async () => {
  await carregarSolicitacoes().catch(() => {});
  // N+1: não existe endpoint que já traga o valor orçado/fechado junto com
  // a listagem de pedidos. Ver MISSING_ENDPOINTS.md, item 5.
  await Promise.all(solicitacoes.map((s) => carregarValoresOrcamento(s).catch(() => {})));
  await carregarRelatorioComercial();
});

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

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(valor) {
  return `${(valor * 100).toFixed(1)}%`;
}

const pesquisa = ref("");
const filtroStatus = ref("");
const filtroSolicitante = ref("");
const filtroDataInicio = ref("");
const filtroDataFim = ref("");

const solicitantesUnicos = computed(() =>
  Array.from(new Set(solicitacoes.map((s) => s.solicitante).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  ),
);

const solicitacoesFiltradas = computed(() => {
  const termo = pesquisa.value.trim().toLowerCase();
  const inicio = parseDataInputISO(filtroDataInicio.value);
  const fim = parseDataInputISO(filtroDataFim.value);

  return solicitacoes.filter((solicitacao) => {
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

function limparFiltros() {
  pesquisa.value = "";
  filtroStatus.value = "";
  filtroSolicitante.value = "";
  filtroDataInicio.value = "";
  filtroDataFim.value = "";
}

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
  if (campo === "valorOrcado" || campo === "valorPedido") return solicitacao[campo] ?? 0;
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

    if (typeof valorA === "number" && typeof valorB === "number") {
      return (valorA - valorB) * direcao;
    }

    return String(valorA).localeCompare(String(valorB), "pt-BR") * direcao;
  });
});

// Os cards de resumo abaixo vêm de GET /relatorios/comercial (escopo: um
// mês de calendário), enquanto a tabela usa o filtro de data/intervalo do
// usuário — os dois não ficam sincronizados. Ver MISSING_ENDPOINTS.md,
// observações finais.
const numeroOrcamentos = computed(() => relatorioComercial.value?.orcamentos_vigentes ?? 0);
const numeroPedidos = computed(() => relatorioComercial.value?.orcamentos_aprovados ?? 0);
const valorOrcadoTotal = computed(() => Number(relatorioComercial.value?.valor_orcado ?? 0));
const valorPedidoTotal = computed(() => Number(relatorioComercial.value?.valor_fechado ?? 0));
const hitRate = computed(() => Number(relatorioComercial.value?.hit_rate_percentual ?? 0) / 100);
const winRate = computed(() => Number(relatorioComercial.value?.win_rate_percentual ?? 0) / 100);

function exportarRelatorio() {
  const linhas = solicitacoesOrdenadas.value.map((s) => ({
    ID: s.id,
    Data: s.data,
    Solicitante: s.solicitante,
    "Tipo de Serviço": s.tipoServico,
    Status: statusLabel[s.status],
    "Valor Orçado (R$)": s.valorOrcado ?? "",
    "Valor do Pedido (R$)": s.valorPedido ?? "",
  }));
  exportarParaExcel(linhas, "relatorio-orcamentos-pedidos", "Relatório");
}
</script>

<template>
  <div class="bg-surface-page dark:bg-surface-authBg min-h-screen">
    <AppHeader logged-in />

    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex justify-between items-center flex-wrap gap-3">
        <h1 class="font-bold text-surface-dark dark:text-white text-2xl">Relatórios</h1>
        <div class="flex items-center gap-3">
          <label class="text-sm text-ink-secondary dark:text-ink-mutedDark" for="mesRelatorio"
            >Mês do relatório comercial</label
          >
          <input
            v-model="mesRelatorio"
            type="month"
            id="mesRelatorio"
            class="border border-slate-300 dark:border-surface-border rounded-sm p-1 bg-white dark:bg-surface-authBg dark:text-white"
          />
          <button
            type="button"
            class="flex items-center gap-2 bg-white dark:bg-surface-dark border border-slate-300 dark:border-surface-border hover:border-brand-mint text-surface-dark dark:text-white text-sm font-bold py-1.5 px-4 rounded-xl cursor-pointer"
            @click="exportarRelatorio"
          >
            <i class="fa-solid fa-file-excel text-brand-mint"></i>
            Exportar Excel
          </button>
        </div>
      </div>

      <p v-if="solicitacoesState.error" class="text-red-600 dark:text-red-400 text-sm mt-3">
        {{ solicitacoesState.error }}
      </p>
      <p v-if="relatorioErro" class="text-red-600 dark:text-red-400 text-sm mt-3">{{ relatorioErro }}</p>
      <p
        v-else-if="relatorioCarregando"
        class="text-ink-secondary dark:text-ink-mutedDark text-sm mt-3"
      >
        Carregando relatório comercial...
      </p>

      <!-- CARDS DE RESUMO -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-10">
        <article class="bg-status-analysisBlue rounded-xl shadow-sm text-white px-4 py-5">
          <p class="text-xs font-semibold">Nº ORÇAMENTOS</p>
          <div class="text-3xl font-bold">{{ numeroOrcamentos }}</div>
          <p class="text-xs opacity-80 mt-1">{{ formatarMoeda(valorOrcadoTotal) }}</p>
        </article>

        <article class="bg-status-inProgress rounded-xl shadow-sm text-white px-4 py-5">
          <p class="text-xs font-semibold">Nº PEDIDOS</p>
          <div class="text-3xl font-bold">{{ numeroPedidos }}</div>
          <p class="text-xs opacity-80 mt-1">{{ formatarMoeda(valorPedidoTotal) }}</p>
        </article>

        <article class="bg-brand-mint rounded-xl shadow-sm text-white px-4 py-5">
          <p class="text-xs font-semibold">HIT RATE</p>
          <div class="text-3xl font-bold">{{ formatarPercentual(hitRate) }}</div>
          <p class="text-xs opacity-80 mt-1">Nº Pedidos / Nº Orçamentos</p>
        </article>

        <article class="bg-status-pending rounded-xl shadow-sm text-white px-4 py-5">
          <p class="text-xs font-semibold">VALOR ORÇADO</p>
          <div class="text-3xl font-bold">{{ formatarMoeda(valorOrcadoTotal) }}</div>
        </article>

        <article class="bg-status-doneText rounded-xl shadow-sm text-white px-4 py-5">
          <p class="text-xs font-semibold">VALOR PEDIDO</p>
          <div class="text-3xl font-bold">{{ formatarMoeda(valorPedidoTotal) }}</div>
        </article>

        <article class="bg-brand-turquoise rounded-xl shadow-sm text-white px-4 py-5">
          <p class="text-xs font-semibold">WIN RATE</p>
          <div class="text-3xl font-bold">{{ formatarPercentual(winRate) }}</div>
          <p class="text-xs opacity-80 mt-1">Valor Pedidos / Valor Orçado</p>
        </article>
      </div>
      <!-- FIM CARDS DE RESUMO -->

      <!-- BARRA DE PESQUISA E FILTROS -->
      <div class="bg-white dark:bg-surface-dark p-2 rounded-xl shadow">
        <div class="flex gap-2 items-center">
          <i class="fa-solid fa-magnifying-glass text-ink-secondary dark:text-white"></i>

          <input
            v-model="pesquisa"
            type="text"
            name="pesquisar"
            id="pesquisar"
            placeholder="Buscar solicitação por ID, solicitante ou tipo..."
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

          <div class="flex flex-col">
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
              <th
                class="py-3 px-3 font-semibold cursor-pointer select-none"
                @click="alternarOrdenacao('valorOrcado')"
              >
                <span class="inline-flex items-center gap-1"
                  >Valor Orçado
                  <i
                    class="fa-solid text-[10px] dark:text-white"
                    :class="classeIconeOrdenacao('valorOrcado')"
                  ></i></span
                >
              </th>
              <th
                class="py-3 px-3 font-semibold cursor-pointer select-none"
                @click="alternarOrdenacao('valorPedido')"
              >
                <span class="inline-flex items-center gap-1"
                  >Valor do Pedido
                  <i
                    class="fa-solid text-[10px] dark:text-white"
                    :class="classeIconeOrdenacao('valorPedido')"
                  ></i></span
                >
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="solicitacao in solicitacoesOrdenadas"
              :key="solicitacao.id"
              class="shadow"
            >
              <td class="font-semibold text-black dark:text-white px-3">
                {{ solicitacao.id }}
              </td>
              <td class="font-semibold text-black dark:text-white hidden sm:table-cell">
                {{ solicitacao.solicitante }}
              </td>
              <td class="p-2">
                <div
                  :class="statusClasses[solicitacao.status]"
                  class="text-sm font-bold rounded-2xl my-2 p-1 max-w-32 text-center"
                >
                  {{ statusLabel[solicitacao.status] }}
                </div>
              </td>
              <td class="text-ink-secondary dark:text-ink-mutedDark px-3">
                {{ solicitacao.valorOrcado != null ? formatarMoeda(solicitacao.valorOrcado) : "-" }}
              </td>
              <td class="text-ink-secondary dark:text-ink-mutedDark px-3">
                {{ solicitacao.valorPedido != null ? formatarMoeda(solicitacao.valorPedido) : "-" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- FIM TABELA FIM TABELA FIM TABELA FIM TABELA  -->
    </main>
    <footer>
      <div class="bg-surface-dark p-5"></div>
    </footer>
  </div>
</template>
