# VK Mini Apps - Настройка токенов и API

## 🔑 Типы ключей доступа

### 1. Сервисный ключ доступа (для бэкенда)
- **Где получить:** Настройки VK Mini Apps → "Ключ доступа приложения"
- **Срок действия:** Не ограничен
- **Использование:** Серверная часть (backend)
- **Безопасность:** Хранить только на сервере!

### 2. Ключ доступа пользователя (для клиента)
- **Как получить:** Автоматически через VK Bridge
- **Срок действия:** 1 час
- **Использование:** Клиентская часть (frontend)
- **Безопасность:** Безопасно использовать на клиенте

### 3. Ключ доступа сообщества
- **Где получить:** Настройки сообщества → Ключи доступа
- **Срок действия:** Не ограничен
- **Использование:** Действия от имени сообщества

---

## 🚀 Как получить сервисный ключ

1. Перейдите на [VK Developers](https://dev.vk.com/)
2. Выберите ваше Mini App
3. Перейдите в раздел **"Настройки"**
4. Найдите поле **"Ключ доступа приложения"**
5. Скопируйте ключ и сохраните в `.env` на бэкенде:
   ```
   VK_SERVICE_TOKEN=ваш_сервисный_ключ
   ```

---

## 📱 Как работает клиентская часть (уже настроено)

```typescript
// src/game/GameContext.tsx — идентификация и своё сохранение на игрока:
const userId = await getVkUserId();   // Bridge VKWebAppGetUserInfo (в dev — мок)
setCurrentUserId(userId);             // ключ сохранения: ergate-save-{vkId}
// src/game/storage.ts — saveState()/loadStateSync() работают с этим ключом
```

```typescript
// src/services/vkApi.ts — запросы к VK API:
import bridge from '@vkontakte/vk-bridge';

// Пользовательский токен — ТОЛЬКО в памяти (переменная cachedToken),
// получается через Bridge и живёт ~1 час:
const { access_token } = await bridge.send('VKWebAppGetAuthToken', {
  app_id: Number(VK_APP_ID), // из VITE_VK_APP_ID, см. src/config/vkConfig.ts
  scope: 'friends',
});

// Вызовы API — через Bridge, подпись подставляет платформа:
await bridge.send('VKWebAppCallAPIMethod', {
  method: 'friends.getAppUsers',
  params: { v: '5.131', access_token },
});
```

**Правила (соблюдаются в коде):**
- ✅ Никаких токенов в исходниках — утёкший хардкод удалён, ключ отозвать в dev.vk.com
- ✅ Никаких токенов в localStorage — в localStorage только сейвы `ergate-save-{vkId}` и общий справочник кланов
- ✅ Сервисный ключ никогда не вводится в UI и не используется на клиенте
- ✅ Работает даже без бэкенда
- ⚠️ Старый `vk_token` из localStorage однократно удаляется при старте (миграция в `vkApi.ts`)

---

## 🖥️ Настройка бэкенда (если нужен)

### 1. Создайте `.env` в папке backend:
```env
VK_SERVICE_TOKEN=ваш_сервисный_ключ_из_настроек_vk
DATABASE_URL=ваша_строка_подключения_к_postgres
PORT=3000
```

### 2. Используйте на сервере:
```typescript
import express from 'express';
import { VK_SERVICE_TOKEN } from './config';

const app = express();


async function getVkUserInfo(vkUserId: number) {
  const response = await fetch(
    `https://api.vk.com/method/users.get?user_ids=${vkUserId}&access_token=${VK_SERVICE_TOKEN}&v=5.131`
  );
  return response.json();
}
```

---

## 🔐 Безопасность

### Никогда не храните:
- ❌ Сервисный ключ в клиентском коде
- ❌ Токены пользователя в localStorage
- ❌ Ключи доступа в git-репозитории

### Используйте:
- ✅ `.env` файлы для ключей
- ✅ Серверные переменные окружения
- ✅ VK Bridge для клиентских запросов
- ✅ HTTPS для всех соединений

---

## 📚 Полезные ссылки

- [Документация VK API](https://dev.vk.com/reference)
- [VK Mini Apps Guide](https://dev.vk.com/mini-apps/guide)
- [VK Bridge Docs](https://github.com/VKCOM/VKBridge)
- [Работа с токенами](https://dev.vk.com/reference/access-token)

---

## ❓ Частые вопросы

### Q: Почему токен пользователя действует только 1 час?
A: Это политика безопасности VK. Для длительной работы используйте refresh token или просите пользователя авторизоваться заново.

### Q: Можно ли использовать сервисный ключ на клиенте?
A: **НЕТ!** Это критическая уязвимость. Любой пользователь может получить ваш ключ и получить полный контроль над приложением.

### Q: Как обновить токен пользователя?
A: VK Bridge делает это автоматически при каждом запросе. Или используйте `VKWebAppLoginPermission` для повторной авторизации.

### Q: Нужно ли мне бэкенд?
A: Зависит от ваших потребностей:
- Для простого сохранения прогресса — **нет**, достаточно localStorage
- Для мультиплеера, лидербордов, синхронизации — **да**, нужен бэкенд
