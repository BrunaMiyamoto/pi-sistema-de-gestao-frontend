<script setup>
import { reactive, watch } from "vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  solicitacao: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  erro: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close", "submit"]);

const form = reactive({
  status: "",
  feedback: "",
  valorOrcado: "",
  valorPedido: "",
});

watch(
  () => props.solicitacao,
  (solicitacao) => {
    form.status = solicitacao?.status ?? "";
    form.feedback = solicitacao?.feedback ?? "";
    form.valorOrcado = solicitacao?.valorOrcado ?? "";
    form.valorPedido = solicitacao?.valorPedido ?? "";
  },
  { immediate: true },
);

function fecharModal() {
  if (props.loading) return;
  emit("close");
}

function onBackdropClick(e) {
  if (e.target === e.currentTarget) {
    fecharModal();
  }
}

function salvarAlteracoes() {
  emit("submit", {
    ...form,
    valorOrcado: form.valorOrcado === "" ? null : Number(form.valorOrcado),
    valorPedido: form.valorPedido === "" ? null : Number(form.valorPedido),
  });
}
</script>

<template>
  <div
    v-if="open && solicitacao"
    class="fixed inset-0 z-50 flex items-center justify-center bg-overlay/45 backdrop-blur-sm p-4"
    @click="onBackdropClick"
  >
    <div
      class="rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col mx-auto"
    >
      <div class="bg-surface-dark text-white flex justify-between px-4 py-1 shrink-0">
        <div class="flex items-center">
          <div class="bg-brand-mint p-0.5 rounded-sm m-2">
            <i class="fa-solid fa-gear" style="color: rgb(30, 48, 80)"></i>
          </div>
          <p class="font-bold">Atualização da Solicitação</p>
        </div>
        <span class="py-3 cursor-pointer" @click="fecharModal"
          ><i class="fa-solid fa-circle-xmark" style="color: #ffffff"></i
        ></span>
      </div>
      <div class="shadow p-4 sm:p-6 bg-white overflow-y-auto">
        <h1 class="font-bold text-lg sm:text-xl py-2 sm:py-4">
          {{ solicitacao.id }}| {{ solicitacao.tipoServico }}
        </h1>

        <div class="flex flex-wrap justify-between gap-2">
          <div class="font-semibold text-xs">
            <h5 class="text-ink-secondary">SOLICITANTE</h5>
            <p class="text-sm">{{ solicitacao.solicitante }}</p>
          </div>
          <div class="font-semibold text-xs">
            <h5 class="text-ink-secondary">ABERTURA</h5>
            <p class="text-sm">{{ solicitacao.abertura }}</p>
          </div>
          <div class="font-semibold text-xs">
            <h5 class="text-ink-secondary">ATENDIDO</h5>
            <p class="text-sm">{{ solicitacao.atendido }}</p>
          </div>
        </div>

        <form class="m-3" @submit.prevent="salvarAlteracoes">
          <div class="flex flex-col">
            <h3 class="font-bold py-3">Interativo atalho técnico</h3>
            <label class="font-semibold">Status</label>
            <select
              v-model="form.status"
              name="status"
              class="border border-slate-300 rounded-sm p-1 my-2 focus:outline-none focus:ring-2 focus:ring-status-indigoText"
            >
              <option value="">Selecione..</option>
              <option value="andamento">Em Andamento</option>
              <option value="aguardando">Aguardando</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
            <div class="flex flex-col flex-1">
              <label class="font-semibold">Valor Orçado (R$)</label>
              <input
                v-model="form.valorOrcado"
                type="number"
                min="0"
                step="0.01"
                name="valorOrcado"
                placeholder="0,00"
                class="border border-slate-300 rounded-sm p-1 my-2 focus:outline-none focus:ring-2 focus:ring-status-indigoText"
              />
            </div>
            <div class="flex flex-col flex-1">
              <label class="font-semibold">Valor do Pedido (R$)</label>
              <input
                v-model="form.valorPedido"
                type="number"
                min="0"
                step="0.01"
                name="valorPedido"
                placeholder="0,00"
                class="border border-slate-300 rounded-sm p-1 my-2 focus:outline-none focus:ring-2 focus:ring-status-indigoText"
              />
            </div>
          </div>

          <div class="flex flex-col">
            <label class="font-semibold">Feedback</label>
            <textarea
              v-model="form.feedback"
              name="feedback"
              id="feedback"
              class="border border-slate-300 rounded-sm p-1 my-2"
              rows="5"
              cols="50"
            ></textarea>
          </div>

          <div v-if="erro" class="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 mt-2">
            <i class="fa-solid fa-triangle-exclamation text-red-600 mt-0.5"></i>
            <p class="text-sm text-red-700">{{ erro }}</p>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading"
              class="bg-brand-mint hover:bg-brand-turquoise text-white font-bold text-center w-full rounded-lg py-1 my-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <i v-if="loading" class="fa-solid fa-circle-notch fa-spin"></i>
              {{ loading ? "Salvando..." : "SALVAR" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
