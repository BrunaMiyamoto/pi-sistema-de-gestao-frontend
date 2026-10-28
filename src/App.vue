<script setup>
import { watch } from "vue";
import { useRouter } from "vue-router";
import { useAccessibility } from "./composables/useAccessibility";
import { useAuth } from "./composables/useAuth";
import AccessibilityPanel from "./components/AccessibilityPanel.vue";

useAccessibility();

const router = useRouter();
const { state: authState } = useAuth();

// Se o backend devolver 401 (token expirado/inválido), o useAuth já limpa
// a sessão; aqui a gente só reage levando o usuário de volta ao login.
watch(
  () => authState.currentUser,
  (usuario, anterior) => {
    if (!usuario && anterior) {
      router.push("/login");
    }
  },
);
</script>

<template>
  <router-view />
  <AccessibilityPanel />
</template>
