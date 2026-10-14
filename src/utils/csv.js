// Exportação de CSV para planilhas (Excel pt-BR: separador ";" e BOM UTF-8)

function escapar(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  return `"${texto.replace(/"/g, '""')}"`
}

// Dispara o download de um arquivo .csv com cabeçalho e linhas de valores
export function baixarCSV(nomeArquivo, cabecalho, linhas) {
  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.map(escapar).join(';'))
    .join('\r\n')
  const blob = new Blob(['\ufeff' + conteudo], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
