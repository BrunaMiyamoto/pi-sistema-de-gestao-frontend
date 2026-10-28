import { reactive } from "vue";
import { api } from "../services/api";
import { PERFIL_LABEL } from "./useAuth";

const usuarios = reactive([]);
const state = reactive({
  loading: false,
  error: "",
  salvando: false,
  erroAcao: "",
});

function mapUsuario(u) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
    tipoPerfil: PERFIL_LABEL[u.perfil] ?? u.perfil,
  };
}

async function carregarUsuarios() {
  state.loading = true;
  state.error = "";
  try {
    const dados = await api.get("/usuarios");
    usuarios.splice(0, usuarios.length, ...dados.map(mapUsuario));
  } catch (err) {
    state.error = err.data?.detail || "Não foi possível carregar os usuários. Verifique sua conexão e tente novamente.";
    throw err;
  } finally {
    state.loading = false;
  }
}

async function atualizarUsuario(usuario, { nome, email, perfil }) {
  state.salvando = true;
  state.erroAcao = "";
  try {
    const usuarioAtualizado = await api.put(`/usuarios/${usuario.id}`, { nome, email, perfil });
    Object.assign(usuario, mapUsuario(usuarioAtualizado));
    return usuario;
  } catch (err) {
    state.erroAcao = err.data?.detail || "Não foi possível salvar as alterações. Tente novamente.";
    throw err;
  } finally {
    state.salvando = false;
  }
}

export function useUsuarios() {
  return {
    usuarios,
    state,
    carregarUsuarios,
    atualizarUsuario,
  };
}
