// Configurações → Conta: dados do usuário logado, foto de perfil, alteração
// de senha e encerrar sessão.

import { useRef, useState } from 'react'
import { UserCircleIcon, TrashIcon, LogoutIcon } from '../icons'
import { CampoInput } from '../sala/Campo'
import ConfirmDialog from '../sala/ConfirmDialog'
import { CartaoSecao, RodapeSecao } from './UI'
import { atualizarUsuario, findUser } from '../../utils/storage'
import { obterConfig } from '../../utils/etiquetas'

export default function SecaoConta({
  user,
  config,
  onLogout,
  onUsuarioAlterado,
  onSalvar,
  onMostrarToast,
}) {
  const inputFoto = useRef(null)
  const [nome, setNome] = useState(user.name || '')
  const [foto, setFoto] = useState(config.conta.foto || '')
  const [erroFoto, setErroFoto] = useState('')
  const [senha, setSenha] = useState({ atual: '', nova: '', confirmar: '' })
  const [erroSenha, setErroSenha] = useState('')
  const [confirmarSair, setConfirmarSair] = useState(false)

  function aoEscolherFoto(evento) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    // Os dados vivem no localStorage: imagens grandes não cabem
    if (arquivo.size > 400 * 1024) {
      setErroFoto('Imagem muito grande — envie um arquivo de até 400 KB.')
      evento.target.value = ''
      return
    }
    setErroFoto('')
    const leitor = new FileReader()
    leitor.onload = () => {
      setFoto(String(leitor.result))
      evento.target.value = ''
    }
    leitor.readAsDataURL(arquivo)
  }

  function salvarConta() {
    if (foto !== (config.conta.foto || '')) {
      onSalvar({ conta: { foto } })
    }
    const nomeLimpo = nome.trim()
    if (nomeLimpo !== user.name) {
      const atualizado = atualizarUsuario(user.username, { name: nomeLimpo })
      if (atualizado) onUsuarioAlterado?.(atualizado)
    }
    onMostrarToast?.('Conta atualizada com sucesso')
  }

  function alterarSenha() {
    setErroSenha('')
    const atual = findUser(user.username, senha.atual)
    if (!atual) {
      setErroSenha('A senha atual está incorreta.')
      return
    }
    if (!senha.nova || senha.nova.length < 4) {
      setErroSenha('A nova senha precisa ter ao menos 4 caracteres.')
      return
    }
    if (senha.nova !== senha.confirmar) {
      setErroSenha('A confirmação não confere com a nova senha.')
      return
    }
    atualizarUsuario(user.username, { password: senha.nova })
    setSenha({ atual: '', nova: '', confirmar: '' })
    onMostrarToast?.('Senha alterada com sucesso')
  }

  return (
    <>
      <CartaoSecao
        icone={UserCircleIcon}
        titulo="Sua conta"
        descricao="Dados do usuário logado neste aplicativo."
      >
        <div className="configuracoes-conta-topo">
          {foto ? (
            <div className="configuracoes-foto-wrap">
              <img src={foto} alt="Foto de perfil" className="configuracoes-foto" />
              <button
                type="button"
                className="redes-btn-acao perigo"
                aria-label="Remover foto"
                title="Remover foto"
                onClick={() => setFoto('')}
              >
                <TrashIcon size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="configuracoes-foto-vazia"
              onClick={() => inputFoto.current?.click()}
              title="Enviar foto"
            >
              <UserCircleIcon size={42} />
            </button>
          )}
          <div className="configuracoes-conta-info">
            <strong>{user.name || user.username}</strong>
            <span>@{user.username}</span>
            {user.email && <span>{user.email}</span>}
          </div>
          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            hidden
            onChange={aoEscolherFoto}
          />
        </div>
        {erroFoto && <p className="campo-erro">{erroFoto}</p>}

        <div className="secao-grade">
          <CampoInput
            chave="nomeExibicao"
            label="Nome de exibição"
            valor={nome}
            aoAlterar={setNome}
          />
          <div className="campo">
            <span className="campo-rotulo-solto">Nome de usuário</span>
            <input
              type="text"
              className="campo-input"
              value={user.username}
              readOnly
              aria-label="Nome de usuário (somente leitura)"
              style={{ background: '#f9fafb', color: '#6b7280' }}
            />
          </div>
        </div>
        <RodapeSecao onSalvar={salvarConta} />
      </CartaoSecao>

      <CartaoSecao
        icone={UserCircleIcon}
        titulo="Alterar senha"
        descricao="A senha atual é exigida por segurança."
      >
        <div className="secao-grade">
          <CampoInput
            chave="senhaAtual"
            label="Senha atual"
            tipo="password"
            valor={senha.atual}
            aoAlterar={(valor) => setSenha((atual) => ({ ...atual, atual: valor }))}
          />
          <CampoInput
            chave="senhaNova"
            label="Nova senha"
            tipo="password"
            valor={senha.nova}
            aoAlterar={(valor) => setSenha((atual) => ({ ...atual, nova: valor }))}
          />
          <CampoInput
            chave="senhaConfirmar"
            label="Confirmar nova senha"
            tipo="password"
            valor={senha.confirmar}
            aoAlterar={(valor) =>
              setSenha((atual) => ({ ...atual, confirmar: valor }))
            }
          />
        </div>
        {erroSenha && <p className="campo-erro">{erroSenha}</p>}
        <RodapeSecao onSalvar={alterarSenha} />
      </CartaoSecao>

      <CartaoSecao
        icone={LogoutIcon}
        titulo="Sessão"
        descricao="Encerra a sessão deste navegador (os dados continuam salvos)."
      >
        <div className="configuracoes-acoes">
          <button
            type="button"
            className="redes-filtro-btn perigo"
            onClick={() => setConfirmarSair(true)}
          >
            <LogoutIcon size={15} />
            Encerrar sessão
          </button>
        </div>
      </CartaoSecao>

      {confirmarSair && (
        <ConfirmDialog
          titulo="Encerrar sessão"
          texto="Tem certeza que deseja sair? Os dados continuam salvos para o próximo login."
          confirmarLabel="Sair"
          onConfirmar={onLogout}
          onCancelar={() => setConfirmarSair(false)}
        />
      )}
    </>
  )
}
