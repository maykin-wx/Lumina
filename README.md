# Lumina

Calendário e gerenciador de tarefas para organizar provas, vestibulares,
concursos, estudos e compromissos pessoais.

## Recursos

- visões mensal, semanal, diária e anual;
- central de tarefas com prioridades e conclusão;
- busca e filtros por categoria;
- criação, edição e exclusão de compromissos;
- impressão otimizada de todas as visões;
- autenticação por e-mail e senha;
- sincronização segura com Supabase e políticas RLS;
- layout responsivo para computador, tablet e celular.

## Desenvolvimento local

Requisitos: Node.js 22.13 ou superior e pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Preencha `.env.local` com a URL e a chave publicável do projeto Supabase.
Nunca use uma chave `service_role` no navegador.

## Publicar na Vercel

1. Envie este projeto para um repositório no GitHub.
2. Na Vercel, escolha **Add New → Project** e importe o repositório.
3. Adicione as variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` com o domínio final
4. Publique. O arquivo `vercel.json` já configura o build do Next.js.

No Supabase, inclua o domínio da Vercel em **Authentication → URL
Configuration → Site URL / Redirect URLs**.

## Banco de dados

As migrações versionadas estão em `supabase/migrations`. As tabelas públicas
usam Row Level Security: cada usuário pode acessar apenas os próprios
compromissos e perfil.

## Comandos

```bash
pnpm dev          # desenvolvimento
pnpm build        # build de produção para a Vercel
pnpm lint         # análise estática
```
