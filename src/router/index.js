import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import Dashboard from "../views/Dashboard.vue";
import Relatorios from "../views/Relatorios.vue";
import Cadastro from "../views/Cadastro.vue";
import Perfil from "../views/Perfil.vue";
import Usuarios from "../views/Usuarios.vue";
import RecuperacaoSenha from "../views/RecuperacaoSenha.vue";
import { useAuth, isFerramentaria, isAdministrador } from "../composables/useAuth";
import { tokenExpirado } from "../services/api";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: () => {
        const { state } = useAuth();
        return state.currentUser ? { name: "dashboard" } : { name: "login" };
      },
    },
    { path: "/login", name: "login", component: Login },
    {
      path: "/dashboard",
      name: "dashboard",
      component: Dashboard,
      meta: { requiresAuth: true },
    },
    {
      path: "/relatorios",
      name: "relatorios",
      component: Relatorios,
      meta: { requiresAuth: true, requiresFerramentaria: true },
    },
    { path: "/cadastro", name: "cadastro", component: Cadastro },
    {
      path: "/perfil",
      name: "perfil",
      component: Perfil,
      meta: { requiresAuth: true },
    },
    {
      path: "/usuarios",
      name: "usuarios",
      component: Usuarios,
      meta: { requiresAuth: true, requiresAdministrador: true },
    },
    {
      path: "/recuperar-senha",
      name: "recuperar-senha",
      component: RecuperacaoSenha,
    },
  ],
});

router.beforeEach(async (to) => {
  const { state, sair, confirmarAdministradorViaProbe } = useAuth();

  if (to.meta.requiresAuth) {
    // Mesmo com o usuário salvo em sessão, o token pode ter expirado
    // enquanto o app estava fechado (ex: reload após o prazo do JWT).
    if (!state.currentUser || tokenExpirado()) {
      sair();
      return { name: "login" };
    }
  }

  if (to.meta.requiresFerramentaria && !isFerramentaria(state.currentUser)) {
    return { name: "dashboard" };
  }

  if (to.meta.requiresAdministrador && !isAdministrador(state.currentUser)) {
    // O diretório local pode não saber que esta conta é administrador
    // (ver MISSING_ENDPOINTS.md, item 1) — confirma testando um endpoint
    // administrador-only antes de negar o acesso.
    const confirmado = await confirmarAdministradorViaProbe();
    if (!confirmado) {
      return { name: "dashboard" };
    }
  }

  return true;
});

export default router;
