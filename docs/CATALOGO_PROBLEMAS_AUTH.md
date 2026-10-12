# Catálogo de Problemas e Soluções: Fluxo de Autenticação (Login & Registro)

Este documento registra os problemas identificados, suas causas raízes, as soluções aplicadas no frontend e as diretrizes arquiteturais para os fluxos de login e cadastro do **AppFrame**.

---

## 1. Falha de Notificação de Credenciais Inválidas (HTTP 401) no Login

### Sintoma
Ao tentar efetuar login com e-mail ou senha incorretos, nenhuma mensagem de erro era exibida para o usuário na interface. No console de desenvolvedor do navegador, registrava-se:
```text
Failed to load resource: the server responded with a status of 401 (Unauthorized)
```
Visualmente, a tela apenas apresentava um piscar breve do spinner de carregamento e retornava aos campos em branco ou estado inicial sem nenhuma indicação do motivo da falha.

### Causa Raiz
1. O formulário em `LoginPage.tsx` invocava a função `login()` provida pelo `AuthContext`.
2. Dentro do `AuthContext`, a função `login()` executava `setIsLoading(true)` no estado global de autenticação.
3. A rota `/login` está protegida pelo componente de guarda `<PublicRoute>`. O `<PublicRoute>` monitora a propriedade `isLoading` global do `AuthContext`:
   ```tsx
   if (isLoading) {
     return <div className="spinner">...</div>;
   }
   ```
4. Consequentemente, assim que a requisição de login era disparada, o `<PublicRoute>` **desmontava imediatamente** o componente `<LoginPage>` para exibir o spinner de tela inteira.
5. Quando o backend NestJS respondia com `401 Unauthorized`, o bloco `catch` do `AuthContext` executava `setIsLoading(false)`. O `<PublicRoute>` então montava uma **nova instância virgem** de `<LoginPage>`, onde o estado local `errorMessage` iniciava como `null`.
6. Todo o estado do formulário e o erro capturado eram descartados durante o ciclo de desmontagem e remontagem.

### Solução Aplicada
- Em [`LoginPage.tsx`](../appframe-frontend/src/pages/LoginPage.tsx), a chamada à API passou a ser feita diretamente via `authService.login({ email, password })`.
- O estado de carregamento do botão agora é gerido estritamente pelo estado local `isLoading` do próprio componente, sem alterar o `isLoading` global do `AuthContext`.
- O componente `<LoginPage>` permanece montado durante todo o ciclo de vida da requisição HTTP.
- Ao receber o status `401`, o erro é retido no estado `errorMessage` e renderizado em um banner de alerta de alto contraste com estilo *Amber Noir*:
  ```tsx
  {errorMessage && (
    <div className="p-3 rounded-lg bg-red-50 dark:bg-error-container/30 border border-red-200 dark:border-error/40 text-red-800 dark:text-[#ffdad6] text-body-sm font-body-sm flex items-start gap-2 animate-in fade-in">
      <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 text-red-600 dark:text-error">error</span>
      <span className="font-medium">{errorMessage}</span>
    </div>
  )}
  ```
- Caso o login seja bem-sucedido, o `LoginPage` invoca `refreshProfile()` do `AuthContext` para carregar o perfil do usuário em memória e navega para `/varredura`.

---

## 2. Exibição de Erro de E-mail Já Cadastrado no Registro (Sem Sonner Toast)

### Sintoma
Ao tentar registrar uma conta com um e-mail já existente no banco de dados, o erro precisava ser exibido exclusivamente como aviso inline no formulário, sem poluir a interface com toasts globais do Sonner.

### Causa Raiz
Semelhante ao login, o `RegisterPage.tsx` chamava o método `register()` do `AuthContext`, o que também engatilhava o desmonte da página pelo `<PublicRoute>`.

### Solução Aplicada
- Em [`RegisterPage.tsx`](../appframe-frontend/src/pages/RegisterPage.tsx), a requisição passou a chamar diretamente `authService.register({ name, email, password })`.
- Ao receber `409 Conflict`, o componente define `errorMessage` com a mensagem explicativa:
  ```text
  "Já existe um usuário cadastrado com este e-mail. Faça login ou utilize outro e-mail."
  ```
- O erro é exibido **apenas no banner interno do card**, sem acionar `toast.error()` do Sonner.
- Ao alterar o conteúdo de qualquer campo (nome, e-mail ou senha), o erro anterior é limpo automaticamente.

---

## 3. Redirecionamento Pós-Cadastro para Login com Sonner Toast (Preparação para Verificação de E-mail)

### Contexto e Decisão de Design
Anteriormente, o fluxo de registro autenticava o usuário na hora e redirecionava para a tela inicial (`/` -> `/varredura`).

### Requisito e Implementação
- Ao concluir o cadastro com sucesso em `RegisterPage.tsx`:
  1. Dispara notificação via Sonner:
     ```tsx
     toast.success('Conta criada com sucesso! Faça login para acessar o AppFrame.');
     ```
  2. Redireciona o usuário para a página de login:
     ```tsx
     navigate('login', { registered: 'true', email });
     ```
  3. A página de login recebe os parâmetros e preenche automaticamente o campo de e-mail.

- **Eliminação de Sessão e Cookies no Registro (`POST /auth/register`):**
  - O endpoint `POST /auth/register` no backend **não cria sessões nem emite tokens JWT ou cookies `Set-Cookie`**.
  - Retorna estritamente o objeto sanitizado `{ user: UserResponseDto }`.
  - Tokens e cookies HTTP só passam a existir quando o usuário realiza login válido via `POST /auth/login`.

### Consideração Futura (Roadmap)
Este fluxo foi estruturado para suportar nativamente a futura implementação de **Confirmação de E-mail**:
- O backend enviará um e-mail com token/link seguro de ativação.
- O usuário permanecerá na tela de login até clicar no link do e-mail.
- Ao confirmar o e-mail, a flag `is_email_verified` será ativada no banco e o login será liberado.
