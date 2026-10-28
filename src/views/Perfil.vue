<script setup>
import AppHeader from "../components/AppHeader.vue";
import { useAuth } from "../composables/useAuth";
import { useAccessibility } from "../composables/useAccessibility";

const { state: authState } = useAuth();
const { state, setFontScale, setColorScheme, setHighContrast } =
  useAccessibility();
</script>

<template>
  <div class="bg-surface-page dark:bg-surface-authBg min-h-screen">
    <AppHeader logged-in />

    <main class="max-w-7xl mx-auto px-4 py-8">
      <router-link
        to="/dashboard"
        class="inline-flex items-center gap-2 text-sm text-ink-secondary dark:text-ink-mutedDark hover:text-surface-dark dark:hover:text-white"
      >
        <i class="fa-solid fa-arrow-left"></i>
        Voltar ao dashboard
      </router-link>

      <div class="flex justify-between items-start mt-4 flex-wrap gap-4">
        <div>
          <h1 class="font-bold text-surface-dark dark:text-white text-2xl">
            Meu perfil
          </h1>
          <p class="text-ink-secondary dark:text-ink-mutedDark mt-1">
            Visualize suas informações de conta e preferências de
            acessibilidade.
          </p>
          <p
            v-if="authState.currentUser?.perfilInferido"
            class="text-amber-600 dark:text-amber-400 text-xs mt-2 flex items-center gap-1"
          >
            <i class="fa-solid fa-triangle-exclamation"></i>
            O backend ainda não tem um endpoint para confirmar seu nome e
            perfil após o login; os dados abaixo podem estar incompletos
            (ver MISSING_ENDPOINTS.md).
          </p>
        </div>
        <button
          type="button"
          class="bg-brand-mint hover:bg-brand-turquoise text-white text-sm font-bold py-2 px-4 rounded-xl cursor-pointer flex items-center gap-2"
        >
          <i class="fa-solid fa-pen"></i>
          Editar perfil
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mt-6 items-start">
        <div class="flex flex-col gap-6">
          <div
            class="bg-white dark:bg-surface-dark shadow-sm border border-surface-borderLight dark:border-surface-border rounded-xl p-6"
          >
            <div class="flex items-center gap-4">
              <div
                class="w-16 h-16 rounded-full bg-brand-mint/10 flex items-center justify-center"
              >
                <i class="fa-solid fa-user text-2xl text-brand-mint"></i>
              </div>
              <div>
                <h2 class="font-bold text-lg text-surface-dark dark:text-white">
                  {{ authState.currentUser?.nome || "Equipe Ferramentaria" }}
                </h2>
                <p class="text-sm text-ink-secondary dark:text-ink-mutedDark">
                  Tipo de perfil
                </p>
                <span
                  class="inline-block mt-1 text-xs font-semibold bg-brand-mint/10 text-brand-mint rounded-full px-3 py-1"
                >
                  {{ authState.currentUser?.tipoPerfil || "Ferramentaria" }}
                </span>
              </div>
            </div>
          </div>

          <div
            class="bg-white dark:bg-surface-dark shadow-sm border border-surface-borderLight dark:border-surface-border rounded-xl p-6"
          >
            <h2 class="font-bold text-surface-dark dark:text-white">
              Informações da conta
            </h2>
            <p class="text-sm text-ink-secondary dark:text-ink-mutedDark">
              Dados disponíveis para o usuário atual.
            </p>

            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-5 pt-5 border-t border-surface-borderLight dark:border-surface-border"
            >
              <div>
                <p class="text-sm text-ink-secondary dark:text-ink-mutedDark">
                  Nome completo
                </p>
                <p class="font-semibold text-surface-dark dark:text-white">
                  {{ authState.currentUser?.nome || "Não informado" }}
                </p>
              </div>
              <div>
                <p class="text-sm text-ink-secondary dark:text-ink-mutedDark">
                  E-mail
                </p>
                <p class="font-semibold text-surface-dark dark:text-white">
                  {{ authState.currentUser?.email || "Não informado" }}
                </p>
              </div>
            </div>

            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-4 pt-4 border-t border-surface-borderLight dark:border-surface-border"
            >
              <div>
                <p class="text-sm text-ink-secondary dark:text-ink-mutedDark">
                  Telefone
                </p>
                <p class="font-semibold text-surface-dark dark:text-white">
                  Não informado
                </p>
              </div>
              <div>
                <p class="text-sm text-ink-secondary dark:text-ink-mutedDark">
                  Data de criação da conta
                </p>
                <p class="font-semibold text-surface-dark dark:text-white">
                  Não informado
                </p>
              </div>
            </div>

            <div
              class="flex items-center gap-2 bg-surface-subtle dark:bg-surface-authBg rounded-lg p-3 mt-5 text-sm text-ink-secondary dark:text-ink-mutedDark"
            >
              <i class="fa-solid fa-circle-info"></i>
              Para atualizar suas informações, use a opção Editar perfil.
            </div>
          </div>
        </div>

        <div
          class="bg-white dark:bg-surface-dark shadow-sm border border-surface-borderLight dark:border-surface-border rounded-xl p-6"
        >
          <h2 class="font-bold text-surface-dark dark:text-white">
            Acessibilidade
          </h2>
          <p class="text-sm text-ink-secondary dark:text-ink-mutedDark">
            Ajuste fonte e cores da tela
          </p>

          <div class="mt-5">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-semibold text-surface-dark dark:text-white"
                >Tamanho da fonte</label
              >
              <span class="text-xs text-ink-secondary dark:text-ink-mutedDark"
                >Padrão</span
              >
            </div>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-xs font-bold text-surface-dark dark:text-white"
                >A-</span
              >
              <input
                type="range"
                min="0.875"
                max="1.5"
                step="0.125"
                :value="state.fontScale"
                class="w-full accent-brand-mint"
                @input="setFontScale(Number($event.target.value))"
              />
              <span class="text-base font-bold text-surface-dark dark:text-white"
                >A+</span
              >
            </div>
            <div class="flex gap-3 mt-3">
              <div
                class="border border-surface-borderLight dark:border-surface-border rounded-lg p-2 flex-1"
                :style="{ fontSize: `calc(0.75rem * ${state.fontScale})` }"
              >
                <p class="text-ink-secondary dark:text-ink-mutedDark">Exemplo</p>
                <p class="font-semibold text-surface-dark dark:text-white">
                  Solicitação #001
                </p>
              </div>
              <div
                class="border border-surface-borderLight dark:border-surface-border rounded-lg p-2 flex-1"
                :style="{ fontSize: `calc(1.125rem * ${state.fontScale})` }"
              >
                <p class="text-ink-secondary dark:text-ink-mutedDark">Exemplo</p>
                <p class="font-semibold text-surface-dark dark:text-white">
                  Solicitação #001
                </p>
              </div>
            </div>
          </div>

          <div class="mt-5 pt-5 border-t border-surface-borderLight dark:border-surface-border">
            <label class="text-sm font-semibold text-surface-dark dark:text-white"
              >Esquema de cores</label
            >
            <div class="flex gap-3 mt-2">
              <button
                type="button"
                class="flex-1 border rounded-lg p-2 cursor-pointer text-left text-xs"
                :class="
                  state.colorScheme === 'claro'
                    ? 'ring-2 ring-brand-mint border-brand-mint'
                    : 'border-surface-borderLight dark:border-surface-border'
                "
                @click="setColorScheme('claro')"
              >
                <span class="flex gap-1 items-center">
                  <span
                    class="w-3 h-3 rounded-full bg-white border border-surface-borderLight"
                  ></span>
                  <span class="w-3 h-3 rounded-full bg-surface-page"></span>
                  <span class="w-3 h-3 rounded-full bg-brand-mint"></span>
                  <i
                    v-if="state.colorScheme === 'claro'"
                    class="fa-solid fa-check text-brand-mint ml-auto"
                  ></i>
                </span>
                <span class="block mt-1 text-surface-dark dark:text-white"
                  >Claro</span
                >
              </button>
              <button
                type="button"
                class="flex-1 border rounded-lg p-2 cursor-pointer text-left text-xs bg-surface-dark text-white"
                :class="
                  state.colorScheme === 'escuro'
                    ? 'ring-2 ring-brand-mint border-brand-mint'
                    : 'border-surface-dark'
                "
                @click="setColorScheme('escuro')"
              >
                <span class="flex gap-1 items-center">
                  <span class="w-3 h-3 rounded-full bg-black"></span>
                  <span class="w-3 h-3 rounded-full bg-surface-authBg"></span>
                  <span class="w-3 h-3 rounded-full bg-brand-mint"></span>
                  <i
                    v-if="state.colorScheme === 'escuro'"
                    class="fa-solid fa-check ml-auto"
                  ></i>
                </span>
                <span class="block mt-1">Escuro</span>
              </button>
            </div>
          </div>

          <div
            class="mt-5 pt-5 border-t border-surface-borderLight dark:border-surface-border flex items-center justify-between"
          >
            <div>
              <p class="text-sm font-semibold text-surface-dark dark:text-white">
                Contraste alto
              </p>
              <p class="text-xs text-ink-secondary dark:text-ink-mutedDark">
                Ativar contraste alto
              </p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="state.highContrast"
              class="w-10 h-6 rounded-full relative cursor-pointer transition-colors"
              :class="state.highContrast ? 'bg-brand-mint' : 'bg-surface-borderLight'"
              @click="setHighContrast(!state.highContrast)"
            >
              <span
                class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                :class="state.highContrast ? 'left-[18px]' : 'left-0.5'"
              ></span>
            </button>
          </div>
        </div>
      </div>
    </main>
    <footer>
      <div class="bg-surface-dark p-5"></div>
    </footer>
  </div>
</template>
