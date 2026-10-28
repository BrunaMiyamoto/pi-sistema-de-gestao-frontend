<script setup>
import { reactive, watch } from "vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
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
  tipoServico: "",
  prazo: "",
  descricao: "",
  file: null,
});

function resetForm() {
  form.tipoServico = "";
  form.prazo = "";
  form.descricao = "";
  form.file = null;
}

watch(
  () => props.open,
  (aberto) => {
    if (aberto) resetForm();
  },
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

function onFileChange(e) {
  form.file = e.target.files[0] ?? null;
}

function enviarForm() {
  emit("submit", { ...form });
}
</script>

<template>
  <div
    v-if="open"
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
          <p class="font-bold">Cadastro de Solicitação</p>
        </div>
        <span class="py-3 cursor-pointer" @click="fecharModal"
          ><i class="fa-solid fa-circle-xmark" style="color: #ffffff"></i
        ></span>
      </div>
      <div class="shadow p-4 sm:p-6 bg-white overflow-y-auto">
        <form @submit.prevent="enviarForm">
          <div class="flex flex-col">
            <label class="font-semibold">Tipo de Serviço</label>
            <select
              v-model="form.tipoServico"
              name="tipoServico"
              class="border border-slate-300 rounded-sm p-1 my-2"
            >
              <option value="">Selecione..</option>
              <option value="molde-injecao">Molde de Injeção</option>
            </select>
          </div>

          <div class="flex flex-col">
            <label class="font-semibold">Prazo Desejado</label>
            <input
              v-model="form.prazo"
              type="date"
              name="prazo"
              id="prazo"
              class="border border-slate-300 rounded-sm p-1 my-2"
            />
          </div>

          <div class="flex flex-col">
            <label class="font-semibold">Descrição</label>
            <textarea
              v-model="form.descricao"
              name="descricao"
              id="descricao"
              class="border border-slate-300 rounded-sm p-1 my-2"
              rows="5"
              cols="50"
              placeholder="Descrição"
            ></textarea>
          </div>

          <div class="flex flex-col">
            <label class="font-semibold">Links dos Arquivos Técnicos</label>
            <input
              type="file"
              name="file"
              id="file"
              class="border border-slate-300 rounded-sm p-1 my-2"
              @change="onFileChange"
            />
            <p class="text-ink-placeholder text-xs">
              O envio de anexos ainda não está disponível nesta integração (ver
              MISSING_ENDPOINTS.md).
            </p>
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
              {{ loading ? "Enviando..." : "REGISTRAR" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
