import * as XLSX from "xlsx";

export function exportarParaExcel(linhas, nomeArquivo, nomeAba = "Dados") {
  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, nomeAba);
  XLSX.writeFile(livro, `${nomeArquivo}.xlsx`);
}
