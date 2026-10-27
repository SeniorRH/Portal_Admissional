# Portal Admissional Senior

**Projeto:** formulário admissional com front-end no GitHub Pages e back-end no Google Apps Script.  
**Identidade visual:** inspirada no site institucional [datasenior.com.br](https://datasenior.com.br/).  
**Versão:** 0.9.0. **Status:** protótipo — requer configuração, testes e revisão de segurança antes de receber dados reais.

## Estrutura

```text
portal_admissional_senior/
├── index.html          # Home com os portais ativos
├── frontend/
│   ├── index.html       # Home quando frontend/ é a raiz publicada
│   ├── home.css         # Seleção de portais, fundo padrão e atalhos Maps/WhatsApp
│   ├── form.html        # Formulário compartilhado em 3 etapas
│   ├── styles.css       # Estilo base compartilhado
│   ├── themes/          # CSS individual de cada empresa
│   ├── app.js           # Validações, CEP, anexos e integração
│   ├── config.js        # URL do Apps Script, empresas e logos
│   ├── logodatasenior.png # Logo local do portal Datasenior
│   ├── datasenior.png   # Fundo visual do portal Datasenior
│   ├── fundo.jpg        # Fundo da home e dos demais portais
│   ├── senior/          # Link /senior/
│   ├── seniorcon/       # Link /seniorcon/
│   ├── digital/         # Link /digital/
│   ├── datasenior/      # Link /datasenior/
│   └── works/           # Link /works/
├── backend/
│   └── Code.gs          # Referência do back-end Google Apps Script
└── README.md
```

## Funcionalidades previstas

- Cadastro de dados pessoais, endereço, contato e dependentes.
- Links independentes por empresa, com o mesmo formulário e padrão de dados.
- Organização automática das pastas no Drive por empresa e colaborador.
- Consulta de CEP via ViaCEP, com possibilidade de corrigir manualmente os campos.
- Campos para anexar os documentos admissionais em PDF, JPG ou PNG.
- Criação de pasta individual no Google Drive.
- Geração de arquivo Excel `.xlsx` com os dados cadastrais.
- Armazenamento dos anexos dentro da pasta individual.
- Aviso de privacidade no formulário.
- Layout responsivo para desktop e celular.

## Links e organização por empresa — versão 0.9.0

A raiz do repositório e `https://seniorrh.github.io/Portal_Admissional/` exibem uma página inicial com os quatro portais ativos e suas logos. Works está temporariamente desativada e oculta nas páginas iniciais; sua rota e configuração foram preservadas. Ao publicar a raiz do repositório, os links ativos apontam para `frontend/senior/`, `frontend/seniorcon/`, `frontend/digital/` e `frontend/datasenior/`. Se a pasta `frontend/` for configurada como raiz publicada, a página inicial existente nela apresenta os mesmos quatro portais.

Os caminhos publicados identificam a empresa sem duplicar o formulário:

| Empresa | Caminho |
|---|---|
| Senior | `/senior/` |
| Senior Con | `/seniorcon/` |
| Digital | `/digital/` |
| Datasenior | `/datasenior/` |
| Works | Temporariamente desativada e oculta na página inicial |

Cada caminho carrega o mesmo formulário e aplica o nome e a logo configurados em `frontend/config.js`. A empresa também é validada pelo Apps Script contra a lista permitida antes de salvar ou recuperar um cadastro. CNPJs e geração de contratos ainda não estão configurados.

**Importante:** o caminho identifica o destino e a marca, mas não autentica o colaborador nem prova que ele pertence à empresa indicada; um usuário pode editar a URL ou a requisição. Não use a separação por caminho como controle de acesso aos dados. Antes de produção, configure autenticação e autorização apropriadas no fluxo.

O Google Drive passa a usar esta estrutura para cada empresa:

```text
Pasta principal/
├── Senior/
│   └── Nome completo do colaborador/
├── Senior Con/
│   └── Nome completo do colaborador/
├── Digital/
│   └── Nome completo do colaborador/
├── Datasenior/
│   └── Nome completo do colaborador/
├── Works/
│   └── Nome completo do colaborador/
└── REGISTRO_PORTAL_ADMISSIONAL
```

Dentro de cada pasta de colaborador:

```text
Nome completo do colaborador/
    ├── Nome completo do colaborador.xlsx
    ├── Documentos Pessoais/
    ├── Documentos Admissionais/
    └── ASO/
```

`REGISTRO_PORTAL_ADMISSIONAL` permanece diretamente na pasta principal. A planilha registra a empresa contratante em uma coluna própria; os dados cadastrais completos ficam na coluna JSON oculta. O backend migra automaticamente o JSON da coluna antiga para a nova posição ao atualizar o cabeçalho.

O arquivo XLSX final fica na raiz da pasta individual, cujo nome é somente o nome completo do colaborador. Todos os arquivos enviados pelo formulário são gravados em `Documentos Pessoais`; `Documentos Admissionais` e `ASO` permanecem vazias nesta etapa. Arquivos que já estavam em `Documentos Admissionais` são movidos para `Documentos Pessoais` quando a estrutura do cadastro é preparada.

O cadastro permite adicionar vários números de contato. Cada número exige o nome da pessoa associada e possui seleções independentes para WhatsApp, ligação e mensagem de texto. O formulário preserva contatos antigos ao recuperar cadastros existentes.

**Publicação no GitHub Pages:** para que `https://seniorrh.github.io/Portal_Admissional/` mostre a seleção de empresas, configure o GitHub Pages para publicar a raiz deste repositório. A home abre os formulários dentro de `frontend/`. Se publicar apenas o conteúdo de `frontend/`, a home dessa pasta também oferece os cinco links, sem o prefixo `frontend/`.

**Configuração necessária:** configure `ROOT_FOLDER_ID` no Apps Script, execute `prepararPastasEmpresas()` uma vez para criar as cinco pastas, substitua o código do backend, publique uma nova versão do aplicativo da web e atualize os arquivos do Pages. Se uma empresa usar o link antes da execução manual, a pasta dela também será criada automaticamente. O portal Datasenior usa a logo local `logodatasenior.png` e o fundo `datasenior.png`; a home e os demais portais usam o fundo fixo `fundo.jpg`. Os cabeçalhos da home e dos formulários permanecem fixos no topo, com fundo branco. Os atalhos para o Google Maps e WhatsApp ficam disponíveis na home e em todos os portais. Senior Con usa temporariamente a logo atual da Senior até existir uma logo específica. Faça testes com dados fictícios antes de usar dados reais.

## Requisitos antes de publicar

1. Ter acesso de edição ao projeto Google Apps Script.
2. Criar uma pasta principal no Google Drive para receber os cadastros.
3. Copiar o ID dessa pasta e configurar `ROOT_FOLDER_ID` no `backend/Code.gs`.
4. Revisar a autenticação, autorização, limite de tamanho e prevenção de cadastros duplicados.
5. Testar com dados fictícios antes de usar dados reais.
6. Configurar a URL da implantação em `frontend/config.js`.

### Configurar o Apps Script

A URL fornecida para o projeto foi consultada e, no momento da verificação, retornou `Script function not found: doGet`. Isso indica que a implantação acessada não tem uma função `doGet` disponível, ou não está servindo a versão esperada. O front-end precisa de um endpoint funcional e o back-end deve implementar `doPost` para receber o cadastro.

1. Abra o projeto no editor do Google Apps Script.
2. Faça uma cópia de segurança do código atual.
3. Revise e incorpore o conteúdo de `backend/Code.gs` (não apague código existente sem avaliar dependências).
4. Em `CONFIG.ROOT_FOLDER_ID`, informe o ID da pasta principal no Drive.
5. Execute uma função de teste no editor e autorize apenas as permissões necessárias.
6. Implante como **Aplicativo da web** e revise cuidadosamente quem pode acessar e em nome de quem o aplicativo será executado.
7. Atualize `APPS_SCRIPT_URL` em `frontend/config.js` com a URL da implantação correta.

> **Atenção:** a configuração de acesso “qualquer pessoa” pode expor uma API que grava arquivos no Drive do proprietário. Não a use em produção sem proteção contra abuso, limitação de requisições e validação do servidor. Não coloque senhas ou segredos no JavaScript publicado no GitHub Pages.

### Configurar o Google Drive

O ID da pasta é o trecho final da URL da pasta, depois de `/folders/`. O proprietário da implantação precisa ter permissão de escrita nela. Os arquivos criados não devem ser compartilhados automaticamente.

### Publicar no GitHub Pages

1. Crie um repositório privado ou público conforme as regras da empresa.
2. Publique todo o conteúdo de `frontend/` (inclusive as cinco pastas de rota) na raiz do site, ou configure Pages para usar `frontend/` como raiz por meio de uma branch/workflow.
3. No GitHub, abra **Settings → Pages** e selecione a origem de publicação.
4. Aguarde a publicação e teste a URL gerada.
5. Não inclua dados reais de colaboradores, documentos ou credenciais no repositório.

## Campos coletados

- Nome completo e nome social
- CPF, data de nascimento e PIS/NIS
- CEP, logradouro, número, complemento, bairro, cidade e estado
- Um ou mais números de contato, nome associado e canais disponíveis (WhatsApp, ligação, SMS), além de e-mail
- Raça/cor
- Pessoa com deficiência e descrição opcional
- Estado civil
- Quantidade de dependentes para salário-família
- Quantidade de dependentes para Imposto de Renda
- Documentos admissionais selecionados no formulário

## Documentos previstos

- Carteira de Trabalho
- CNH opcional, ou RG e documento CPF obrigatórios enquanto a CNH não for enviada
- Título de Eleitor (obrigatório)
- Certificado de Reservista
- Certidão de casamento (obrigatória para pessoas casadas)
- Certidões de nascimento dos filhos menores de 18 anos, identificadas pelo nome informado
- Comprovante de endereço
- Foto 3x4 atual, nítida e legível, com o rosto visível para identificação biométrica facial

A CNH é opcional e substitui conjuntamente RG e CPF. A certidão de casamento só é solicitada para pessoas casadas; as certidões dos filhos acompanham a quantidade cadastrada. Outros documentos podem ser exigidos conforme a aplicabilidade.

## Segurança, privacidade e LGPD

O sistema processa dados pessoais, documentos de identificação e dados que podem exigir proteção reforçada. Antes da produção:

- Definir finalidade e base legal para cada campo.
- Coletar somente o necessário para a admissão.
- Disponibilizar aviso de privacidade completo, contato do responsável e regras de retenção.
- Restringir a pasta raiz e as subpastas a pessoas autorizadas.
- Não usar links públicos para documentos.
- Validar novamente todos os campos e arquivos no servidor.
- Definir limite de tamanho e quantidade de arquivos por requisição.
- Implementar proteção contra abuso, spam e duplicidade por CPF.
- Evitar registrar CPF, dados pessoais ou conteúdo de arquivos em logs.
- Definir processo para corrigir/excluir cadastros e atender solicitações dos titulares.
- Testar com dados fictícios e revisar o código com o responsável pela segurança/privacidade.

**Limitação técnica do protótipo:** arquivos são enviados em Base64 pelo navegador; isso aumenta o tamanho da requisição. O limite inicial é de 8 MB por arquivo, mas o limite efetivo também depende dos limites do Google Apps Script. Para arquivos maiores, é necessário projetar um fluxo de upload diferente.

## Versionamento

Este projeto usa **Versionamento Semântico** (`MAJOR.MINOR.PATCH`):

- **MAJOR:** mudanças incompatíveis na estrutura ou na integração.
- **MINOR:** novas funcionalidades compatíveis.
- **PATCH:** correções compatíveis.

### Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| `0.1.0` | 2026-10-20 | Estrutura inicial; formulário em 3 etapas; campos pessoais e de contato; consulta de CEP; anexos; layout responsivo; esqueleto do Apps Script; documentação inicial. |
| `0.7.0` | 2026-10-27 | Links por empresa, identificação de marca por caminho, separação dos registros e documentos por empresa e criação da estrutura de pastas do colaborador. |
| `0.8.0` | 2026-10-27 | Registro mestre mantido na pasta principal com coluna visível para empresa contratante e migração do JSON existente para coluna oculta. |
| `0.9.0` | 2026-10-27 | Raiz redireciona para Datasenior; folhas de estilo individuais por empresa; contatos adicionais ilimitados com nome e canais; arquivos enviados para Documentos Pessoais e pasta do colaborador nomeada pelo nome completo. |

### Próximas versões planejadas

- `0.2.0` — índice privado de cadastros, prevenção confiável de duplicidade e tratamento de atualização de cadastro.
- `0.3.0` — validação de CPF, melhor retorno de erros e status de documentos.
- `0.4.0` — autenticação/controles de acesso e revisão de segurança do fluxo de envio.
- `1.0.0` — versão de produção após testes de ponta a ponta, revisão LGPD e homologação do RH.

## Como registrar uma nova versão

1. Atualize a versão e a data no histórico deste README.
2. Descreva o que mudou e eventuais passos de migração.
3. Faça commit com mensagem objetiva, por exemplo: `feat: adicionar índice de cadastros`.
4. Crie uma tag Git, por exemplo `v0.2.0`, para marcar uma versão estável.
5. Nunca inclua dados pessoais ou documentos reais em commits.

## Licença e uso

Projeto interno de apoio ao processo admissional da Senior. Defina a licença e as regras de distribuição com a empresa antes de tornar o repositório público.


## Versão 0.2.0 — melhorias do formulário

- Validação de CPF com dígitos verificadores ao sair do campo (inclusive ao navegar com Tab).
- Campos de endereço bloqueados até o CEP conter oito dígitos; consulta ViaCEP e opção de preencher manualmente quando a consulta falhar.
- Campos CTPS (número) e Série da CTPS nos dados pessoais.
- CNH aceita como alternativa conjunta ao RG e documento CPF; sem CNH, RG e CPF são exigidos.
- Indicação visual de documentos cruciais e opcionais, com lista de itens ausentes antes do envio.
- Indicador de preparação por arquivo e barra geral de progresso. A barra acompanha a preparação local dos arquivos e os estados de envio/retorno; não representa uma medição contínua byte a byte do tráfego de rede.
- Aviso de privacidade com o texto fornecido para o processo admissional e confirmação de leitura.
- Validações equivalentes de CPF e documentos no Apps Script.

**Antes de usar com dados reais:** confirme o texto jurídico com o responsável por privacidade/jurídico; configure `ROOT_FOLDER_ID`; publique uma nova versão do Apps Script; restrinja acesso à pasta do Drive; e teste os limites de tamanho do Apps Script. Enviar vários arquivos codificados em Base64 pode exceder limites de requisição mesmo quando cada arquivo individual respeita o limite configurado.


## Versão 0.4.0 — envio imediato e recuperação

- A pasta individual e a planilha temporária são criadas no primeiro upload, usando os dados preenchidos nas etapas anteriores.
- Cada documento é enviado separadamente assim que selecionado; arquivos de outros tipos são preservados ao substituir um documento.
- Em caso de falha, o front-end consulta os documentos já presentes na pasta e atualiza os estados da tela. Ao recarregar a página e iniciar novamente com o mesmo CPF, o backend tenta recuperar o cadastro em andamento.
- O botão de conclusão permanece oculto até os campos e documentos obrigatórios estarem completos, os uploads terminarem e existir uma sessão de cadastro.
- A logo institucional é carregada de `https://datasenior.com.br/wp-content/uploads/2024/03/lgnormal.svg`; fundo branco, textos pretos e cor principal `#993132`.
- Limite por arquivo reduzido para 5 MB devido aos limites de requisição do Apps Script.
- O backend apresenta erro explícito se `ROOT_FOLDER_ID` não apontar para uma pasta válida ou acessível.

**Importante:** configure o ID real da pasta principal no `backend/Code.gs` e implante uma nova versão do Apps Script. A recuperação só é possível se a pasta raiz e as permissões estiverem corretas. O backend é um protótipo e ainda precisa de controles de acesso e revisão de segurança antes de uso com dados reais.


## Ajustes da versão 0.5.0
- Corrigido o identificador do campo Complemento e o desbloqueio dos campos de endereço após digitar o CEP.
- A pasta individual agora é criada/localizada ao avançar da etapa de endereço, antes de chegar ao envio de documentos.
- Adicionados os campos opcionais Sexo e Identidade de gênero; ambos são gravados na planilha de dados cadastrais.
- O backend continua exigindo configuração de `ROOT_FOLDER_ID` com o ID de uma pasta real do Google Drive e nova implantação do Apps Script.


## Novidades v0.6.1
- Atalho flutuante do WhatsApp com mensagem personalizada usando o nome digitado.
- Mini mapa do Google Maps com rota para Rua Myltho Anselmo da Silva, 1497, Mercês, Curitiba/PR, disponível nos portais Senior e Datasenior.
- Pasta criada/localizada logo após validar os dados pessoais da primeira etapa; endereço e contato são salvos na etapa seguinte.
- Campo para quantidade de filhos menores de 18 anos e geração de um upload por certidão.
- Sexo limitado a Feminino, Masculino e Prefiro não informar.
- Planilha `REGISTRO_PORTAL_ADMISSIONAL` criada na pasta principal com nome, CPF, ID da pasta, nascimento e status; os dados cadastrais completos ficam em coluna oculta para permitir recuperação.
- Consulta de cadastro por CPF, exigindo data de nascimento para confirmar e recuperar os dados/documentos.

**Atenção:** a primeira consulta/atualização pode criar a planilha de registro na pasta principal. Confirme permissões do Apps Script, implante uma nova versão e teste com dados fictícios antes de usar dados reais.


## v0.6.1 — acompanhamento e diagnóstico
- Barra de progresso/status do cadastro visível em todas as etapas.
- Indicador ✓ VERIFICADO para documentos já encontrados na pasta do cadastro, desde que seus nomes sigam o padrão de chave do portal.
- Erros de servidor recebem referência para pesquisa nos registros de execução do Apps Script; mensagens de erro no site orientam encaminhar a referência à equipe de TI.
- Avanço da etapa de endereço exibe status de validação e gravação no servidor.

**Limitação importante:** o portal só consegue reconhecer automaticamente arquivos da pasta que estejam identificados pelo padrão `chave - nome.extensão` (por exemplo, `ctps - Carteira de Trabalho.pdf`). Arquivos antigos com nomes genéricos precisam ser renomeados/classificados ou conferidos manualmente; não se deve marcar um arquivo como válido apenas por existir na pasta.


## Novidades v0.6.2
- Após concluir, o formulário é limpo e retorna à primeira etapa para iniciar outro cadastro.
- A consulta de CPF abre uma janela solicitando a data de nascimento; somente após a validação no servidor os dados existentes são carregados para edição.
- A recuperação utiliza o registro mestre e também aceita dados de planilhas temporárias antigas, quando disponíveis.
- O CPF é gravado como texto na planilha de dados e no registro mestre para preservar zeros à esquerda na exportação para Excel.
- A barra geral de progresso foi movida para abaixo dos botões do formulário, incluindo o botão de conclusão.

**Implantação:** substitua o código em `backend/Code.gs` no projeto Apps Script e publique uma nova versão da implantação. Atualize os arquivos da pasta `frontend` no GitHub Pages. Faça primeiro um teste com dados fictícios; a recuperação depende de o registro mestre conter os dados do cadastro.


## Atualizações da versão 0.6.3

- A consulta de CPF acontece automaticamente quando os 11 dígitos formam um CPF válido. Se houver cadastro, o portal pergunta se a pessoa deseja continuar com o cadastro existente; em caso afirmativo, solicita a data de nascimento antes de recuperar os dados e documentos. A opção de cancelar não sobrescreve o cadastro encontrado.
- Ao recuperar o cadastro, a lista de documentos é atualizada a partir da pasta do Drive. A indicação de arquivo encontrado permanece visível depois de alterar o estado civil ou a quantidade de filhos; documentos não necessários após uma correção não são apagados automaticamente.
- A data de nascimento é apresentada no Excel como `dd-MM-aaaa`, mantendo o valor interno normalizado para permitir a validação e o preenchimento do campo de data do navegador. O CPF é gravado como texto para preservar zeros à esquerda.
- A confirmação de leitura do aviso de privacidade chama atenção com um efeito pulsante na área de pendências e no próprio checkbox.
- O CSS usa `frontend/fundo.jpg` como fundo fixo da home e dos formulários (exceto o tema Datasenior, que usa `frontend/datasenior.png`).
- Ao reabrir cadastro concluído, o backend cria/associa uma nova planilha temporária, restaura o identificador na descrição da pasta e substitui planilhas XLSX antigas ao concluir a correção.

### Publicação da versão 0.6.3

Substitua os arquivos da pasta `frontend` no GitHub Pages e atualize o `backend/Code.gs` no Apps Script. No Apps Script, publique uma **nova versão da implantação**; atualizar o código sem publicar nova versão não altera o endpoint já utilizado pelo site. Faça um teste com cadastro fictício antes de usar dados reais.


## Atualizações da versão 0.6.4

- A data de nascimento é digitada e exibida no formato brasileiro `dd/mm/aaaa`, incluindo a janela de confirmação do cadastro existente.
- A data é validada no navegador e normalizada no backend para comparação segura.
- A data de nascimento é gravada como texto `dd/mm/aaaa` nas planilhas do cadastro e no registro mestre, evitando conversões automáticas de formato na exportação para XLSX.
- Melhorias responsivas para celulares: campos maiores, ações mais fáceis de tocar, botões adaptáveis, janela de confirmação otimizada e melhor uso da largura disponível.

### Publicação da versão 0.6.4

Atualize a pasta `frontend` no GitHub Pages e substitua o conteúdo de `backend/Code.gs` no Apps Script. Depois, crie uma nova versão da implantação. Teste em celular e confirme que a data aparece como `dd/mm/aaaa` tanto no portal quanto no arquivo XLSX gerado.

## Atualizações da versão 0.6.6

- Ao confirmar o CPF e a data de nascimento, os dependentes são recuperados com nome completo, CPF e data de nascimento.
- A recuperação entende formatos atuais e legados, tanto como lista de dependentes quanto como campos individuais, e infere a quantidade quando ela não está preenchida.
- Os campos de dependente não exibem numeração; os dados são relacionados na ordem em que foram cadastrados internamente.

### Publicação da versão 0.6.6

Atualize o `backend/Code.gs` no Apps Script e publique uma nova versão da implantação. A implantação atualmente configurada deve retornar a versão `0.6.6` em sua resposta de status. Faça o teste de recuperação com um cadastro fictício que tenha dependentes antes de usar os dados reais.

## Ajustes de interface posteriores

- Dependentes para salário-família e Imposto de Renda passaram a ser informados separadamente por Sim/Não. Valores numéricos de cadastros antigos são interpretados na recuperação: zero como Não e valores acima de zero como Sim.
- O fundo preserva as cores originais, começa abaixo do cabeçalho, ocupa a largura da tela e acompanha a rolagem do conteúdo.
