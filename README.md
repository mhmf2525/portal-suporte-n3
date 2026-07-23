# Portal Suporte N3 — GitHub Pages

Portal estático para organizar e consultar scripts SQL, com layout inspirado nos prints fornecidos e código próprio.

O portal abre diretamente no painel, sem usuário, senha ou tela de autenticação.

## Recursos

- painel inicial e menu lateral no layout solicitado;
- todos os scripts, busca por nome e conteúdo;
- pastas e subpastas com criação, alteração e exclusão;
- categorias coloridas com criação, alteração e exclusão;
- criação, visualização, edição, exclusão e cópia de scripts;
- realce visual de palavras-chave SQL;
- importação individual de arquivos `.txt`;
- importação e backup completo em JSON;
- sincronização opcional por URL pública;
- tema claro/escuro e português/inglês;
- armazenamento local no navegador;
- layout responsivo.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo `portal-suporte-n3`.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione **main**, depois **/(root)** e clique em **Save**.
6. Aguarde o endereço `https://SEU-USUARIO.github.io/portal-suporte-n3/` ficar disponível.

## Backup e compartilhamento dos scripts

Os scripts cadastrados ficam no navegador atual. Use **Backup** para baixar um arquivo JSON. Em outro computador, use **Importar banco** para levar a biblioteca completa.

Para distribuir uma biblioteca central somente para leitura/importação, publique o JSON e informe sua URL em **Configurações → URL remota do banco**.
