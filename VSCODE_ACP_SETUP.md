# Подключение агента Arena к VS Code через ACP Client

## Коротко про ограничение

**ACP Client не может подключить именно эту сессию агента.** ACP (Agent Client Protocol) —
это JSON-RPC 2.0 между редактором и **локальным процессом агента** (обычно stdio): редактор
сам запускает агента как подпроцесс. Удалённый транспорт (HTTP/WebSocket) в ACP всё ещё
экспериментальный, а нативной поддержки ACP в VS Code нет — используются расширения.
Я же работаю в облачной песочнице Arena: у меня нет ACP-сервера и публичного API текущей
сессии, который можно было бы указать в ACP Client.

Ссылки: https://agentclientprotocol.com/ · https://github.com/formulahendry/vscode-acp ·
https://www.danilchenko.dev/posts/agent-client-protocol-acp-connect-any-ai-agent-to-any-editor-2p0m

**Но можно подключить агента на моделях Arena к вашему локальному VS Code.** Это будет
отдельная сессия (без истории этого чата и без доступа к моей песочнице), зато она работает
напрямую с вашими локальными файлами.

---

## Вариант 1 (рекомендую): ACP Client → OpenCode → Arena API

Почему именно так: Arena официально документирует подключение OpenCode, и free-router ключи
работают именно с ним; Claude Agent SDK, `claude -p`, Codex и прочие харнессы с бесплатным
ключом получают `403`. OpenCode при этом имеет штатный ACP-режим `opencode acp`.

Документация:
- https://platform.arena.ai/docs/opencode — конфиг провайдера Arena
- https://platform.arena.ai/docs/claude-code — создание ключа, ограничения ключей
- https://opencode.ai/docs/acp/ — ACP-режим OpenCode
- https://opencode.ai/docs/config/ — подстановка `{env:VAR}`

### 1. Ключ Arena API

Создайте ключ на https://platform.arena.ai/dashboard/keys (он показывается один раз).

### 2. Node.js 18+

`npx` должен быть доступен в PATH. Проверьте: `node -v`, `npx -v`.

### 3. Глобальный конфиг OpenCode

Файл `~/.config/opencode/opencode.json`
(Windows: `%USERPROFILE%\.config\opencode\opencode.json`, при `XDG_CONFIG_HOME` —
`$XDG_CONFIG_HOME/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "arena/coding-router-preview",
  "small_model": "arena/coding-router-preview",
  "provider": {
    "arena": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Arena",
      "options": {
        "baseURL": "https://api.arena.ai/v1",
        "apiKey": "{env:ARENA_API_KEY}"
      },
      "models": {
        "coding-router-preview": {
          "name": "Arena Coding Router",
          "modalities": {
            "input": ["text", "image"],
            "output": ["text"]
          },
          "attachment": true,
          "tool_call": true,
          "reasoning": false,
          "variants": {
            "low": { "disabled": true },
            "medium": { "disabled": true },
            "high": { "disabled": true }
          },
          "limit": { "context": 1000000, "output": 128000 }
        }
      }
    }
  }
}
```

`{env:ARENA_API_KEY}` подставляет переменную окружения — так ключ не лежит в файле.
Важно: переменная должна быть видна процессу VS Code (запустите редактор из терминала, где
она экспортирована, либо задайте её в системных переменных окружения). Если не хотите
возится с env — вставьте ключ вместо `{env:ARENA_API_KEY}` и не коммитьте этот файл.
Вместо env можно использовать `{file:~/.config/opencode/arena-key}` с файлом прав 600.

Не кладите `opencode.json` в корень репозитория: проектный конфиг перекрывает глобальный.

### 4. Расширение ACP Client

```bash
code --install-extension formulahendry.acp-client
```

Альтернатива: `omercnet.vscode-acp` (`--install-extension omercnet.vscode-acp`).

### 5. Настройки VS Code (`settings.json`, пользовательские или рабочей области)

```json
{
  "acp.agents": {
    "Arena (OpenCode ACP)": {
      "command": "npx",
      "args": ["opencode-ai@latest", "acp"],
      "env": {}
    }
  },
  "acp.defaultWorkingDirectory": "",
  "acp.autoApprovePermissions": "ask"
}
```

Формат `acp.agents`: ключ — имя агента, значение — `command`, `args`, `env`.
`env` объединяется с окружением процесса (PATH сохраняется). Пустой
`acp.defaultWorkingDirectory` = текущая папка рабочей области.

Если у вас уже есть другие агенты в `acp.agents`, добавьте новый ключ в существующий
объект, не заменяя его целиком.

### 6. Подключение

Command Palette (`Ctrl+Shift+P`) → `ACP: Connect to Agent` → выберите
`Arena (OpenCode ACP)` → чат-панель ACP Client. Агент видит файлы рабочей области, умеет
читать/писать файлы, запускать терминал и запрашивать разрешения.

---

## Вариант 2: ACP Client → Claude Code ACP → шлюз Arena

Подходит, если у вас ключ с API-доступом (не free-router): Adapter
`@agentclientprotocol/claude-agent-acp` работает через Claude Agent SDK, а free-router ключи
для SDK закрыты (`403 organization_client_restricted` /
`403 free_router_harness_restricted`).

`~/.claude/settings.json` (по документации Arena):

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.arena.ai",
    "ANTHROPIC_AUTH_TOKEN": "<your-arena-key>",
    "ANTHROPIC_MODEL": "coding-router-preview",
    "ANTHROPIC_DEFAULT_MODEL": "coding-router-preview",
    "ANTHROPIC_SMALL_FAST_MODEL": "coding-router-preview",
    "CLAUDE_CODE_SUBAGENT_MODEL": "coding-router-preview",
    "CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT": "1",
    "CLAUDE_CODE_MODEL_CAPABILITIES": "coding-router-preview=-effort"
  }
}
```

`settings.json` VS Code:

```json
{
  "acp.agents": {
    "Arena (Claude Code ACP)": {
      "command": "npx",
      "args": ["@agentclientprotocol/claude-agent-acp@latest"],
      "env": {
        "ANTHROPIC_BASE_URL": "https://api.arena.ai",
        "ANTHROPIC_AUTH_TOKEN": "<your-arena-key>",
        "ANTHROPIC_MODEL": "coding-router-preview",
        "ANTHROPIC_DEFAULT_MODEL": "coding-router-preview",
        "ANTHROPIC_SMALL_FAST_MODEL": "coding-router-preview",
        "CLAUDE_CODE_SUBAGENT_MODEL": "coding-router-preview",
        "CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT": "1",
        "CLAUDE_CODE_MODEL_CAPABILITIES": "coding-router-preview=-effort"
      }
    }
  }
}
```

Не коммитьте файл с реальным ключом — храните его в пользовательских настройках или в env.
Используйте `ANTHROPIC_AUTH_TOKEN`, а не `ANTHROPIC_API_KEY`: шлюз Arena ожидает Bearer.

---

## Вариант 3 (уже работает): VS Code в моей песочнице

В песочнице Arena поднят code-server (VS Code 1.110) с открытым репозиторием
`/home/user/fallengame`. Мы видим **одни и те же файлы**: я правлю их своими инструментами,
изменения сразу появляются в редакторе; вы можете править код и запускать команды в его
терминале — я увижу результат.

- Адрес: `https://8080-<sandbox-id>.e2b.app/` (порт 8080, live preview в интерфейсе Arena)
- Пароль: выдаётся в чате сессии (лежит в `/home/user/.config/code-server/config.yaml`)
- Перезапуск: `bash /home/user/start-vscode.sh`
- Переустановка после перезапуска песочницы: `bash /home/user/setup-vscode.sh`

Ограничения: магазин расширений VS Code в песочнице недоступен (сеть ограничена),
интерфейс английский, сессия живёт пока активна песочница.

---

## Синхронизация через Git (для любого локального VS Code)

Ветка сессии: `arena/21c42f59-fallengame`.

```bash
git clone https://github.com/Mageln/fallengame.git
cd fallengame
git fetch origin
git switch arena/21c42f59-fallengame
git pull
code .
```
