<script setup>
import { reactive, watch } from "vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  usuario: {
    type: Object,
    default: null,
  },
  ehContaPropria: {
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
  nome: "",
  email: "",
  perfil: "",
});

watch(
  () => props.usuario,
  (usuario) => {
    form.nome = usuario?.nome ?? "";
    form.email = usuario?.email ?? "";
    form.perfil = usuario?.perfil ?? "";
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
  emit("submit", { ...form });
}
</script>

<template>
  <div
    v-if="open && usuario"
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
          <p class="font-bold">Editar Usuário</p>
        </div>
        <span class="py-3 cursor-pointer" @click="fecharModal"
          ><i class="fa-solid fa-circle-xmark" style="color: #ffffff"></i
        ></span>
      </div>
      <div class="shadow p-4 sm:p-6 bg-white overflow-y-auto">
        <form class="m-3" @submit.prevent="salvarAlteracoes">
          <div class="flex flex-col">
            <label class="font-semibold">Nome</label>
            <input
              v-model="form.nome"
              type="text"
              name="nome"
              class="border border-slate-300 rounded-sm p-1 my-2 focus:outline-none focus:ring-2 focus:ring-status-indigoText"
            />
          </div>

          <div class="flex flex-col">
            <label class="font-semibold">E-mail</label>
            <input
              v-model="form.email"
              type="email"
              name="email"
              class="border border-slate-300 rounded-sm p-1 my-2 focus:outline-none focus:ring-2 focus:ring-status-indigoText"
            />
          </div>

          <div class="flex flex-col">
            <label class="font-semibold">Perfil</label>
            <select
              v-model="form.perfil"
              name="perfil"
              :disabled="ehContaPropria"
              class="border border-slate-300 rounded-sm p-1 my-2 focus:outline-none focus:ring-2 focus:ring-status-indigoText disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="solicitante">Solicitante</option>
              <option value="funcionario">Ferramentaria</option>
              <option value="administrador">Administrador</option>
            </select>
            <p v-if="ehContaPropria" class="text-xs text-ink-secondary">
              Não é possível alterar o perfil da sua própria conta.
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
              {{ loading ? "Salvando..." : "SALVAR" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
