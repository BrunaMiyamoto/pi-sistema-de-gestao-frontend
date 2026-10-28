const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "jactoflow:token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function decodificarExpiracao(token) {
  try {
    const payloadBase64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(payloadBase64));
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

export function tokenExpirado() {
  const token = getToken();
  if (!token) return true;
  const exp = decodificarExpiracao(token);
  if (!exp) return false;
  return Date.now() >= exp * 1000;
}

let unauthorizedHandler = null;

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

function montarUrl(path, params) {
  const url = new URL(path.replace(/^\//, ""), BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`);
  if (params) {
    Object.entries(params).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== "") {
        url.searchParams.set(chave, valor);
      }
    });
  }
  return url;
}

async function request(path, { method = "GET", body, params, auth = true, isFormData = false } = {}) {
  const headers = {};
  if (!isFormData && body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(montarUrl(path, params), {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (res.status === 204) return null;

  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => null);
  }

  if (!res.ok) {
    if (res.status === 401 && auth && unauthorizedHandler) {
      unauthorizedHandler();
    }
    const detalhe = data?.detail;
    const mensagem = typeof detalhe === "string" ? detalhe : detalhe ? JSON.stringify(detalhe) : res.statusText;
    const erro = new Error(mensagem || "Erro na requisição");
    erro.status = res.status;
    erro.data = data;
    throw erro;
  }

  return data;
}

export const api = {
  get: (path, params, opts) => request(path, { method: "GET", params, ...opts }),
  post: (path, body, opts) => request(path, { method: "POST", body, ...opts }),
  put: (path, body, opts) => request(path, { method: "PUT", body, ...opts }),
  del: (path, opts) => request(path, { method: "DELETE", ...opts }),
  upload: (path, formData, opts) => request(path, { method: "POST", body: formData, isFormData: true, ...opts }),
};
