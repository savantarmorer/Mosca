// Páginas institucionais. Textos editáveis aqui; o build gera o HTML com o mesmo cabeçalho/SEO do site.
export const EMAIL = 'redacao@mosca.news';
const ATUALIZADO = '7 de outubro de 2026';

export const PAGINAS = [
  {
    caminho: '/quem-somos/', titulo: 'Quem somos', tipo: 'AboutPage',
    desc: 'O Mosca é um veículo de jornalismo investigativo independente, sem dono corporativo, sem patrocinador e sem vínculo partidário.',
    html: `<p>O Mosca é um veículo de jornalismo investigativo independente, sem dono corporativo, sem patrocinador e sem vínculo partidário. O nome vem da mosca na sopa: o incômodo necessário, a presença que não deixa o poder confortável.</p>
<h2>O que fazemos</h2>
<p>Investigamos o poder político e econômico no Brasil — governos, Congresso, elite financeira, grandes plataformas digitais e os interesses por trás das decisões tomadas longe do público. Publicamos reportagens, análises de conjuntura e os documentos que as sustentam.</p>
<h2>Como trabalhamos</h2>
<p>Toda afirmação de fato é ligada a uma fonte verificável no próprio texto. Separamos fato de análise, procuramos o outro lado antes de publicar e corrigimos erros de forma visível. As regras completas estão na <a href="/linha-editorial/">linha editorial</a>.</p>
<h2>Por que as matérias não têm nome de autor</h2>
<p>As reportagens são assinadas como “Redação Mosca” ou “Investigação Anônima” para proteger quem apura e quem nos envia informações. Em troca, assumimos um compromisso mais rígido: o que publicamos é demonstrado por documentos, dados ou registros que o leitor pode conferir.</p>
<h2>Independência</h2>
<p>O Mosca não recebe dinheiro de partidos, governos ou anunciantes que sejam objeto das nossas reportagens. Não há conteúdo pago disfarçado de jornalismo.</p>
<h2>Fale com a redação</h2>
<p>Sugestões, pedidos de correção e direito de resposta: <a href="mailto:${EMAIL}">${EMAIL}</a>. Para enviar documentos com segurança, use o <a href="/denuncia/">canal anônimo</a>.</p>`,
  },
  {
    caminho: '/contato/', titulo: 'Contato', tipo: 'ContactPage',
    desc: 'Como falar com a redação do Mosca: e-mail, pedidos de correção, direito de resposta e envio anônimo de documentos.',
    html: `<p>Escolha o canal de acordo com o que você precisa.</p>
<h2>Redação</h2>
<p>Sugestões de pauta, pedidos de correção, direito de resposta e imprensa: <a href="mailto:${EMAIL}">${EMAIL}</a>. Respondemos pedidos de correção e de direito de resposta com prioridade.</p>
<h2>Envio anônimo de documentos</h2>
<p>Se você tem documentos ou informações sensíveis, não use e-mail. Use o <a href="/denuncia/">canal anônimo</a>: o conteúdo é criptografado no seu aparelho antes do envio e não pedimos identificação.</p>
<h2>Correções</h2>
<p>Erros confirmados são corrigidos no fim da própria matéria, com data e descrição do que mudou. Veja a <a href="/linha-editorial/#correcoes">política de correções</a>.</p>`,
  },
  {
    caminho: '/linha-editorial/', titulo: 'Linha editorial',
    desc: 'Princípios editoriais do Mosca: independência, apuração com fontes verificáveis, outro lado, anonimato e política de correções.',
    html: `<p>O Mosca é um veículo de jornalismo independente, sem dono corporativo, sem patrocinador e sem vínculo partidário.</p>
<h2>O que cobrimos</h2>
<p>Fiscalizamos o poder político e econômico: a elite financeira, as grandes plataformas digitais, os interesses por trás de pautas conservadoras e as decisões tomadas longe do público. Escolhemos nossas pautas com um olhar crítico, e não escondemos isso.</p>
<h2>Como apuramos</h2>
<p>Toda afirmação de fato é sustentada por fonte verificável — documento, dado público, registro reproduzível ou relato atribuído — indicada no próprio texto. Separamos fato de interpretação: textos de opinião e trechos interpretativos são identificados como “Análise”.</p>
<p>Quando um fato ainda está em apuração, o título diz isso. Afirmamos apenas o que podemos demonstrar.</p>
<h2>Outro lado</h2>
<p>Pessoas e instituições citadas são procuradas antes da publicação, com prazo razoável para resposta. Manifestações recebidas depois são incluídas no texto, com a data da atualização.</p>
<h2>Assinatura e anonimato</h2>
<p>As reportagens são assinadas como “Redação Mosca” ou “Investigação Anônima”, para proteger quem apura. Por isso o padrão de documentação é mais alto: sem fonte demonstrável, não publicamos.</p>
<h2 id="correcoes">Correções</h2>
<p>Erros são corrigidos de forma visível, no fim da matéria, com data e descrição do que mudou. Pedidos de correção: <a href="mailto:${EMAIL}">${EMAIL}</a> ou pelo <a href="/denuncia/">canal anônimo</a>.</p>`,
  },
  {
    caminho: '/termos/', titulo: 'Termos de uso',
    desc: 'Termos de uso do site Mosca: uso do conteúdo, reprodução, links externos, envio de informações e responsabilidades.',
    html: `<p class="sans text-xs text-[color:var(--cinza)]">Última atualização: ${ATUALIZADO}.</p>
<p>Ao acessar o site mosca.news, você concorda com estes termos.</p>
<h2>1. Conteúdo</h2>
<p>Reportagens, análises, imagens e demais materiais publicados pelo Mosca são protegidos pela Lei de Direitos Autorais (Lei nº 9.610/1998). Documentos-fonte de terceiros pertencem a seus respectivos titulares e são reproduzidos em razão do interesse público.</p>
<h2>2. Reprodução</h2>
<p>É permitido citar trechos curtos com crédito ao Mosca e link para a matéria original. A reprodução integral depende de autorização prévia pelo e-mail <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
<h2>3. Envio de informações</h2>
<p>Quem envia informações pelo canal anônimo declara fazê-lo por vontade própria. O Mosca avalia todo material recebido segundo sua linha editorial e não tem obrigação de publicá-lo. Não envie material obtido por meio de crime contra terceiros.</p>
<h2>4. Links externos</h2>
<p>As matérias podem conter links para sites de terceiros. O Mosca não se responsabiliza pelo conteúdo ou pelas práticas desses sites.</p>
<h2>5. Correções e direito de resposta</h2>
<p>Pedidos de correção e de direito de resposta (Lei nº 13.188/2015) devem ser enviados para <a href="mailto:${EMAIL}">${EMAIL}</a> e serão analisados com prioridade.</p>
<h2>6. Alterações</h2>
<p>Estes termos podem ser atualizados a qualquer momento. A data da última versão aparece no topo desta página.</p>
<h2>7. Legislação</h2>
<p>Estes termos são regidos pela legislação brasileira.</p>`,
  },
  {
    caminho: '/privacidade/', titulo: 'Política de privacidade',
    desc: 'Como o Mosca trata dados pessoais: sem cookies próprios, sem rastreamento publicitário e com canal anônimo criptografado. Em conformidade com a LGPD.',
    html: `<p class="sans text-xs text-[color:var(--cinza)]">Última atualização: ${ATUALIZADO}.</p>
<p>Esta política explica quais dados são tratados quando você usa o mosca.news, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
<h2>1. O que não fazemos</h2>
<p>O Mosca não usa cookies próprios, não exibe publicidade, não usa ferramentas de rastreamento publicitário e não vende nem compartilha dados de leitores. As fontes tipográficas são servidas pelo próprio site.</p>
<h2>2. Dados técnicos de acesso</h2>
<p>Como em qualquer site, o provedor de hospedagem (Netlify) recebe dados técnicos necessários para entregar as páginas, como endereço IP e tipo de navegador, e pode mantê-los em registros por um período limitado, conforme a política de privacidade dele.</p>
<h2>3. Ferramentas do Google nas matérias</h2>
<p>As páginas de matéria carregam um script do Google News (Reader Revenue Manager) que identifica o Mosca como publicação no Google. Ao carregar esse script, o Google pode receber dados técnicos do seu navegador, conforme a <a href="https://policies.google.com/privacy?hl=pt-BR">política de privacidade do Google</a>.</p>
<h2>4. Canal anônimo</h2>
<p>O conteúdo enviado pelo <a href="/denuncia/">canal anônimo</a> é criptografado no seu aparelho antes de sair dele e só pode ser aberto pela redação. Não pedimos nome, e-mail ou telefone. A página do canal não carrega scripts nem fontes de terceiros. O serviço de armazenamento (Supabase) e a hospedagem podem registrar dados técnicos de conexão, como o IP, por período limitado; para não expor o seu IP, use o Tor Browser.</p>
<h2>5. E-mail</h2>
<p>Se você nos escrever por e-mail, usaremos seu endereço apenas para responder. Você pode pedir a exclusão da conversa a qualquer momento.</p>
<h2>6. Seus direitos</h2>
<p>Você pode solicitar informações sobre o tratamento, correção ou exclusão de dados pessoais pelo e-mail <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>`,
  },
];
