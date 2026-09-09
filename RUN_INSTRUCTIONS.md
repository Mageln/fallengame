# 🚀 Запуск проекта The Fallen

## Быстрый старт

### 1. Установка зависимостей

```bash
# Установка всех зависимостей
npm install
```

### 2. Настройка базы данных

Убедитесь, что PostgreSQL запущен и настройте `.env` файл:

```bash
# Перейдите в backend
cd backend

# Отредактируйте .env
# DATABASE_URL="postgresql://user:password@localhost:5432/the_fallen_db"
```

### 3. Применение миграций базы данных

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 4. Запуск проекта

```bash
# В корневой директории
npm run dev
```

Это запустит:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001

## Пошаговая инструкция

### Шаг 1: Установка Node.js и PostgreSQL

1. Скачайте и установите Node.js с https://nodejs.org/
2. Установите PostgreSQL с https://www.postgresql.org/download/

### Шаг 2: Создание базы данных

```sql
-- Создайте базу данных
CREATE DATABASE the_fallen_db;

-- Создайте пользователя (опционально)
CREATE USER fallen_user WITH PASSWORD 'fallen_password';
GRANT ALL PRIVILEGES ON DATABASE the_fallen_db TO fallen_user;
```

### Шаг 3: Настройка backend

1. Отредактируйте `backend/.env`:
```env
DATABASE_URL="postgresql://fallen_user:fallen_password@localhost:5432/the_fallen_db"
```

2. Примените миграции:
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### Шаг 4: Запуск разработки

Откройте два терминала:

**Терминал 1 - Backend:**
```bash
cd backend
npm run dev
```

**Терминал 2 - Frontend:**
```bash
npm run dev:frontend
```

## Проверка работы

1. Откройте http://localhost:5173 в браузере
2. Откройте http://localhost:3001/health для проверки backend
3. Проверьте консоль браузера на ошибки

## Решение проблем

### Ошибка подключения к базе данных

```bash
# Проверьте, запущен ли PostgreSQL
pg_isready

# Перезапустите PostgreSQL (Windows)
net start postgresql

# Перезапустите PostgreSQL (macOS/Linux)
brew services restart postgresql
```

### Ошибка портов

```bash
# Проверьте, какие порты заняты
netstat -ano | findstr :5173
netstat -ano | findstr :3001

# Измените порт в vite.config.ts или .env
```

### Ошибка Prisma

```bash
# Перегенерируйте клиент
cd backend
npx prisma generate

# Сбросьте и примените миграции
npx prisma migrate reset
npx prisma migrate dev
```

## Следующие шаги

1. Добавьте тестовые данные в БД
2. Настройте VK Mini Apps в VK Developers
3. Интегрируйте VK Pay для магазина
4. Добавьте спрайты и ассеты для Phaser.js

## Поддержка

При возникновении проблем проверьте:
- Версию Node.js (должна быть 18+)
- Запущен ли PostgreSQL
- Правильность настроек в .env
- Логи в консоли браузера и терминале
