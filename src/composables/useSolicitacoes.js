import { reactive } from "vue";
import { api } from "../services/api";

const solicitacoes = reactive([]);
const state = reactive({
  loading: false,
  error: "",
  salvando: false,
  erroAcao: "",
});

function formatarDataBR(iso) {
  if (!iso) return "-";
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

function paraDataISO(valor) {
  if (!valor) return null;
  return valor;
}

// O backend não tem mais campo de tipo de serviço/ferramenta na criação do
// pedido (ver MISSING_ENDPOINTS.md, item 4). Guardamos o que o usuário
// escolheu dentro da própria descrição para não perder a informação, e
// extraímos de volta aqui só para exibição.
const PREFIXO_TIPO = "[Tipo de Serviço: ";

function extrairTipoServico(descricao) {
  if (!descricao) return "-";
  const fim = descricao.indexOf("]");
  if (descricao.startsWith(PREFIXO_TIPO) && fim !== -1) {
    return descricao.slice(PREFIXO_TIPO.length, fim);
  }
  return "-";
}

function montarDescricaoComTipo(tipoServico, descricao) {
  const base = descricao?.trim() ?? "";
  if (!tipoServico) return base;
  return `${PREFIXO_TIPO}${tipoServico}] ${base}`.trim();
}

function mapPedido(p) {
  return {
    id: `#${String(p.id).padStart(3, "0")}`,
    backendId: p.id,
    data: formatarDataBR(p.data),
    solicitante: p.solicitante,
    tipoServico: extrairTipoServico(p.descricao_solicitante),
    descricaoSolicitante: p.descricao_solicitante,
    descricaoFerramentaria: p.descricao_ferramentaria,
    prazo: formatarDataBR(p.prazo),
    status: p.status,
    abertura: formatarDataBR(p.abertura),
    atendido: p.atendido ? formatarDataBR(p.atendido) : "-",
    feedback: p.feedback ?? "",
    // Preenchidos sob demanda a partir de /pedidos/{id}/orcamentos — o
    // backend não embute esse valor na listagem (ver MISSING_ENDPOINTS.md,
    // item 5).
    valorOrcado: null,
    valorPedido: null,
  };
}

async function carregarSolicitacoes(filtros = {}) {
  state.loading = true;
  state.error = "";
  try {
    const pedidos = await api.get("/pedidos", {
      data: filtros.data,
      mes: filtros.mes,
      descricao: filtros.descricao,
      solicitante: filtros.solicitante,
    });
    solicitacoes.splice(0, solicitacoes.length, ...pedidos.map(mapPedido));
  } catch (err) {
    state.error = err.data?.detail || "Não foi possível carregar as solicitações. Verifique sua conexão e tente novamente.";
    throw err;
  } finally {
    state.loading = false;
  }
}

async function registrarSolicitacao(dadosForm) {
  state.salvando = true;
  state.erroAcao = "";
  try {
    const descricao = montarDescricaoComTipo(dadosForm.tipoServico, dadosForm.descricao);
    const pedido = await api.post("/pedidos", {
      prazo: paraDataISO(dadosForm.prazo),
      descricao_solicitante: descricao,
    });
    solicitacoes.push(mapPedido(pedido));
    return pedido;
  } catch (err) {
    state.erroAcao = err.data?.detail || "Não foi possível cadastrar a solicitação. Tente novamente.";
    throw err;
  } finally {
    state.salvando = false;
  }
}

// Orçamentos são um sub-recurso próprio no backend (histórico de revisões +
// decisão de aprovação), diferente dos dois campos simples que o formulário
// de serviço usa. Fazemos a melhor aproximação possível aqui — ver
// MISSING_ENDPOINTS.md, item 5, para as limitações dessa aproximação.
async function buscarOrcamentos(pedidoBackendId) {
  return api.get(`/pedidos/${pedidoBackendId}/orcamentos`);
}

async function salvarValoresOrcamento(pedidoBackendId, { valorOrcado, valorPedido }) {
  let atual = null;
  const orcamentos = await buscarOrcamentos(pedidoBackendId);
  atual = orcamentos[orcamentos.length - 1] ?? null;

  if (valorOrcado != null && valorOrcado !== "") {
    const valorNumerico = Number(valorOrcado);
    const precisaNovaRevisao =
      !atual || atual.situacao !== "apresentado" || Number(atual.valor_orcado) !== valorNumerico;

    if (precisaNovaRevisao) {
      atual = await api.post(`/pedidos/${pedidoBackendId}/orcamentos`, {
        valor_orcado: valorNumerico,
        apresentado_em: new Date().toISOString().slice(0, 10),
      });
    }
  }

  if (valorPedido != null && valorPedido !== "" && atual && atual.situacao === "apresentado") {
    atual = await api.put(`/pedidos/${pedidoBackendId}/orcamentos/${atual.id}/decisao`, {
      situacao: "aprovado",
      valor_fechado: Number(valorPedido),
    });
  }

  return atual;
}

async function carregarValoresOrcamento(solicitacao) {
  try {
    const orcamentos = await buscarOrcamentos(solicitacao.backendId);
    const ultima = orcamentos[orcamentos.length - 1];
    const aprovada = [...orcamentos].reverse().find((o) => o.situacao === "aprovado");
    solicitacao.valorOrcado = ultima ? Number(ultima.valor_orcado) : null;
    solicitacao.valorPedido = aprovada ? Number(aprovada.valor_fechado) : null;
  } catch {
    // Quem não é Ferramentaria não tem acesso a /orcamentos — mantém nulo.
    solicitacao.valorOrcado = null;
    solicitacao.valorPedido = null;
  }
}

async function atualizarSolicitacao(solicitacao, dadosForm) {
  state.salvando = true;
  state.erroAcao = "";
  try {
    const pedidoAtualizado = await api.put(`/pedidos/${solicitacao.backendId}`, {
      status: dadosForm.status,
      feedback: dadosForm.feedback,
      descricao_ferramentaria: solicitacao.descricaoFerramentaria ?? null,
    });

    await salvarValoresOrcamento(solicitacao.backendId, {
      valorOrcado: dadosForm.valorOrcado,
      valorPedido: dadosForm.valorPedido,
    });

    Object.assign(solicitacao, mapPedido(pedidoAtualizado));
    await carregarValoresOrcamento(solicitacao);
  } catch (err) {
    state.erroAcao = err.data?.detail || "Não foi possível salvar as alterações. Tente novamente.";
    throw err;
  } finally {
    state.salvando = false;
  }
}

async function removerSolicitacao(solicitacao) {
  state.salvando = true;
  state.erroAcao = "";
  try {
    await api.del(`/pedidos/${solicitacao.backendId}`);
    const index = solicitacoes.indexOf(solicitacao);
    if (index !== -1) solicitacoes.splice(index, 1);
  } catch (err) {
    state.erroAcao = err.data?.detail || "Não foi possível excluir a solicitação. Tente novamente.";
    throw err;
  } finally {
    state.salvando = false;
  }
}

export function useSolicitacoes() {
  return {
    solicitacoes,
    state,
    carregarSolicitacoes,
    registrarSolicitacao,
    atualizarSolicitacao,
    removerSolicitacao,
    carregarValoresOrcamento,
  };
}
