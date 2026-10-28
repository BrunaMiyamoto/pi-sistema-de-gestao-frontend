import { reactive } from "vue";
import { api, getToken, setToken, clearToken, setUnauthorizedHandler } from "../services/api";

const SESSION_KEY = "jactoflow:currentUser";
// Diretório local de perfis conhecidos. Workaround para a ausência de um
// endpoint "quem sou eu" no backend (ver MISSING_ENDPOINTS.md, item 1):
// o login só devolve um JWT, sem nome/perfil, então guardamos aqui o que
// aprendemos no cadastro feito por este próprio frontend.
const DIRECTORY_KEY = "jactoflow:knownUsers";

export const PERFIL_LABEL = {
  solicitante: "Solicitante",
  funcionario: "Ferramentaria",
  administrador: "Administrador",
};

function loadCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadDirectory() {
  try {
    const raw = localStorage.getItem(DIRECTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const directory = loadDirectory();

function persistDirectory() {
  localStorage.setItem(DIRECTORY_KEY, JSON.stringify(directory));
}

function lembrarUsuario(email, { nome, perfil }) {
  directory[email.toLowerCase()] = { nome, perfil };
  persistDirectory();
}

const state = reactive({
  currentUser: loadCurrentUser(),
  loading: false,
  error: "",
});

function persistSession() {
  if (state.currentUser) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state.currentUser));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function decodificarToken(token) {
  try {
    const payloadBase64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payloadBase64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isFerramentaria(usuario) {
  return usuario?.perfil === "funcionario" || usuario?.perfil === "administrador";
}

export function isAdministrador(usuario) {
  return usuario?.perfil === "administrador";
}

// Sem endpoint "quem sou eu" (ver MISSING_ENDPOINTS.md, item 1), o único
// jeito de confirmar que a pessoa logada é administrador quando o
// diretório local não sabe disso é testar um endpoint administrador-only.
// Usado pelo guard de rota da tela de usuários.
async function confirmarAdministradorViaProbe() {
  try {
    await api.get("/usuarios");
  } catch {
    return false;
  }

  if (state.currentUser) {
    state.currentUser.perfil = "administrador";
    state.currentUser.tipoPerfil = PERFIL_LABEL.administrador;
    state.currentUser.perfilInferido = false;
    lembrarUsuario(state.currentUser.email, {
      nome: state.currentUser.nome,
      perfil: "administrador",
    });
    persistSession();
  }
  return true;
}

async function autenticar(email, senha) {
  state.error = "";
  state.loading = true;
  try {
    const resposta = await api.post("/login", { email, senha }, { auth: false });
    setToken(resposta.access_token);

    const payload = decodificarToken(resposta.access_token);
    const emailNormalizado = email.toLowerCase();
    // Sem endpoint de perfil atual, usamos o que o próprio cadastro local
    // guardou. Contas criadas direto no banco (funcionario/administrador)
    // cairão aqui como "solicitante" até o backend expor esse dado.
    const conhecido = directory[emailNormalizado];
    const perfil = conhecido?.perfil ?? "solicitante";

    const usuario = {
      id: payload?.sub ?? null,
      email: emailNormalizado,
      nome: conhecido?.nome ?? emailNormalizado,
      perfil,
      tipoPerfil: PERFIL_LABEL[perfil] ?? perfil,
      perfilInferido: !conhecido,
    };

    state.currentUser = usuario;
    persistSession();
    return usuario;
  } catch (err) {
    state.error = err.data?.detail || err.message || "Não foi possível entrar.";
    throw err;
  } finally {
    state.loading = false;
  }
}

async function registrarUsuario({ nome, email, senha, tipoPerfil }) {
  state.error = "";
  state.loading = true;
  try {
    // Cadastro público só pode criar "solicitante" (regra do backend).
    // Perfis de Ferramentaria precisam ser promovidos depois por um
    // administrador via PUT /usuarios/{id} (ver MISSING_ENDPOINTS.md, item 3).
    const resposta = await api.post(
      "/usuarios",
      { nome, email, senha, perfil: "solicitante" },
      { auth: false },
    );
    lembrarUsuario(email, { nome: resposta.nome, perfil: resposta.perfil });
    return { ...resposta, perfilSolicitado: tipoPerfil };
  } catch (err) {
    state.error = err.data?.detail || err.message || "Não foi possível criar a conta.";
    throw err;
  } finally {
    state.loading = false;
  }
}

function sair() {
  clearToken();
  state.currentUser = null;
  persistSession();
}

setUnauthorizedHandler(() => {
  clearToken();
  state.currentUser = null;
  persistSession();
});

export function useAuth() {
  return {
    state,
    autenticar,
    registrarUsuario,
    sair,
    isFerramentaria,
    isAdministrador,
    confirmarAdministradorViaProbe,
    estaAutenticado: () => Boolean(state.currentUser) && Boolean(getToken()),
  };
}
