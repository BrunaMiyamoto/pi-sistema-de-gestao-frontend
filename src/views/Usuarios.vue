<script setup>
import { computed, onMounted, ref } from "vue";
import AppHeader from "../components/AppHeader.vue";
import EditarUsuarioModal from "../components/EditarUsuarioModal.vue";
import { useUsuarios } from "../composables/useUsuarios";
import { useAuth, PERFIL_LABEL } from "../composables/useAuth";

const { usuarios, state, carregarUsuarios, atualizarUsuario } = useUsuarios();
const { state: authState } = useAuth();

onMounted(() => {
  carregarUsuarios().catch(() => {});
});

const pesquisa = ref("");
const filtroPerfil = ref("");

const usuariosFiltrados = computed(() => {
  const termo = pesquisa.value.trim().toLowerCase();

  return usuarios.filter((usuario) => {
    const correspondeTermo =
      !termo || [usuario.nome, usuario.email].join(" ").toLowerCase().includes(termo);

    const correspondePerfil = !filtroPerfil.value || usuario.perfil === filtroPerfil.value;

    return correspondeTermo && correspondePerfil;
  });
});

function limparFiltros() {
  pesquisa.value = "";
  filtroPerfil.value = "";
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

function valorOrdenavel(usuario, campo) {
  if (campo === "perfil") return usuario.tipoPerfil ?? "";
  return usuario[campo] ?? "";
}

const usuariosOrdenados = computed(() => {
  const lista = [...usuariosFiltrados.value];
  if (!sortColuna.value) return lista;

  const direcao = sortDirecao.value === "asc" ? 1 : -1;

  return lista.sort((a, b) => {
    const valorA = valorOrdenavel(a, sortColuna.value);
    const valorB = valorOrdenavel(b, sortColuna.value);
    return String(valorA).localeCompare(String(valorB), "pt-BR") * direcao;
  });
});

const modalAberto = ref(false);
const usuarioSelecionado = ref(null);

function abrirEdicao(usuario) {
  usuarioSelecionado.value = usuario;
  state.erroAcao = "";
  modalAberto.value = true;
}

function fecharEdicao() {
  modalAberto.value = false;
  usuarioSelecionado.value = null;
}

async function salvarEdicao(dadosForm) {
  try {
    await atualizarUsuario(usuarioSelecionado.value, dadosForm);
    fecharEdicao();
  } catch {
    // Erro já fica em state.erroAcao e é exibido dentro do modal.
  }
}

const ehContaPropriaSelecionada = computed(() => {
  if (usuarioSelecionado.value == null || authState.currentUser?.id == null) return false;
  // O id no JWT (`sub`) vem como string; o id de GET /usuarios vem como
  // número — compara como string para os dois formatos baterem.
  return String(usuarioSelecionado.value.id) === String(authState.currentUser.id);
});
</script>

<template>
  <div class="bg-surface-page dark:bg-surface-authBg min-h-screen">
    <AppHeader logged-in />

    <main class="max-w-7xl mx-auto px-4 py-8">
      <h1 class="font-bold text-surface-dark dark:text-white text-2xl">Usuários</h1>

      <p v-if="state.error" class="text-red-600 dark:text-red-400 text-sm mt-3">
        {{ state.error }}
      </p>
      <p v-else-if="state.loading" class="text-ink-secondary dark:text-ink-mutedDark text-sm mt-3">
        Carregando usuários...
      </p>

      <!-- BARRA DE PESQUISA E FILTROS -->
      <div class="bg-white dark:bg-surface-dark p-2 rounded-xl shadow mt-6">
        <div class="flex gap-2 items-center">
          <i class="fa-solid fa-magnifying-glass text-ink-secondary dark:text-white"></i>

          <input
            v-model="pesquisa"
            type="text"
            name="pesquisar"
            id="pesquisar"
            placeholder="Buscar usuário por nome ou e-mail..."
            class="w-full bg-transparent dark:text-white dark:placeholder:text-ink-mutedDark"
          />
        </div>

        <div
          class="flex flex-wrap gap-3 items-end mt-3 pt-3 border-t border-surface-borderLight dark:border-surface-border"
        >
          <div class="flex flex-col">
            <label
              for="filtroPerfil"
              class="text-xs font-semibold text-ink-secondary dark:text-ink-mutedDark mb-1"
              >Perfil</label
            >
            <select
              v-model="filtroPerfil"
              id="filtroPerfil"
              name="filtroPerfil"
              class="border border-slate-300 dark:border-surface-border rounded-sm p-1 bg-white dark:bg-surface-authBg dark:text-white focus:outline-none focus:ring-2 focus:ring-status-indigoText"
            >
              <option value="">Todos</option>
              <option v-for="(label, valor) in PERFIL_LABEL" :key="valor" :value="valor">
                {{ label }}
              </option>
            </select>
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
          <thead>
            <tr
              class="bg-surface-subtle dark:bg-surface-authBg border-b border-surface-borderLight dark:border-surface-border text-ink-secondary dark:text-ink-mutedDark text-sm font-semibold"
            >
              <th
                class="px-3 py-3 font-semibold cursor-pointer select-none"
                @click="alternarOrdenacao('nome')"
              >
                <span class="inline-flex items-center gap-1"
                  >Nome
                  <i
                    class="fa-solid text-[10px] dark:text-white"
                    :class="classeIconeOrdenacao('nome')"
                  ></i></span
                >
              </th>
              <th
                class="py-3 font-semibold hidden sm:table-cell cursor-pointer select-none"
                @click="alternarOrdenacao('email')"
              >
                <span class="inline-flex items-center gap-1"
                  >E-mail
                  <i
                    class="fa-solid text-[10px] dark:text-white"
                    :class="classeIconeOrdenacao('email')"
                  ></i></span
                >
              </th>
              <th
                class="py-3 font-semibold cursor-pointer select-none"
                @click="alternarOrdenacao('perfil')"
              >
                <span class="inline-flex items-center gap-1"
                  >Perfil
                  <i
                    class="fa-solid text-[10px] dark:text-white"
                    :class="classeIconeOrdenacao('perfil')"
                  ></i></span
                >
              </th>
              <th class="py-3 px-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="usuario in usuariosOrdenados" :key="usuario.id" class="shadow">
              <td class="font-semibold text-black dark:text-white px-3">
                {{ usuario.nome }}
              </td>
              <td class="font-semibold text-black dark:text-white hidden sm:table-cell">
                {{ usuario.email }}
              </td>
              <td class="text-ink-secondary dark:text-ink-mutedDark">
                {{ usuario.tipoPerfil }}
              </td>
              <td class="px-3">
                <button
                  type="button"
                  @click="abrirEdicao(usuario)"
                  class="text-sm font-semibold text-brand-mint hover:text-brand-turquoise cursor-pointer"
                >
                  Editar
                </button>
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

    <EditarUsuarioModal
      :open="modalAberto"
      :usuario="usuarioSelecionado"
      :eh-conta-propria="ehContaPropriaSelecionada"
      :loading="state.salvando"
      :erro="state.erroAcao"
      @close="fecharEdicao"
      @submit="salvarEdicao"
    />
  </div>
</template>
