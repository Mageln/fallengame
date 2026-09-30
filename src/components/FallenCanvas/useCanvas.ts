import { useRef, useEffect, useCallback } from 'react';
import { GameIcons, Task } from './types';
import { drawBackground } from './drawBackground';
import { drawCharacter, CHARACTER_POSITION } from './drawCharacter';
import { spawnParticles, updateParticles, drawParticles } from './particles';
import { drawUI, ButtonPosition, ProfileData, UIFlags, BossData, BossFight, MapRaid, RIGHT_PANEL_MAX_OFFSET, HoverAnim, BOSS_VISIBLE } from './drawUI';

export const useCanvas = (
  backgroundImage: HTMLImageElement | null,
  characterImage: HTMLImageElement | null,
  icons: GameIcons,
  energy: number,
  maxEnergy: number,
  authority: number,
  spicki: number,
  bullets: number,
  gold: number = 0,
  zhetons: number = 0,
  tasks: Task[] = [],
  appearanceColor = '#d4a574',
  currentLocation: string = 'location1',
  carLevel: number = 1,
  level: number = 1,
  districtName: string = '',
  playerName: string = 'Игрок',
  avatarImage: HTMLImageElement | null = null,
  // Callbacks
  onProfileClick?: () => void,
  onBattleClick?: () => void,
  onBossModalClose?: () => void,
  onCloseMap?: () => void,
  onOpenBossModal?: () => void,
  onCloseProfile?: () => void,
  onBackToMain?: () => void,
  onGoDistrict?: () => void,
  // Колбэки кнопок "+" у ресурсов
  onRestoreEnergy?: () => void,
  onRestoreSpicki?: () => void,
  onRestoreBullets?: () => void,
  onRestoreGold?: () => void,
  onRestoreZhetons?: () => void,
  onToggleFullscreen?: () => void,
  // Клик по рейду на карте (id рейда передаётся аргументом)
  onMapRaidClick?: (raidId: string) => void,
  // Атака босса из окна боссов (id босса)
  onBossAttack?: (bossId: string) => void,
  // Кнопки окна боя с боссом
  onFightAttack?: () => void,
  onFightLeave?: () => void,
  // State
  showProfile: boolean = false,
  showBossModal: boolean = false,
  showMap: boolean = false,
  profileData: ProfileData | null = null,
  bosses: BossData[] = [],
  bossFight: BossFight | null = null,
  mapRaids: MapRaid[] = [],
  mapImage: HTMLImageElement | null = null,
  topBarImage: HTMLImageElement | null = null,
  bossImage: HTMLImageElement | null = null,
  fullscreen: boolean = false,
  mapMessage: string = '',
  unreadNotifications: number = 0,
  onNotificationsClick?: () => void
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredRef = useRef({ x: 0, y: 0 });
  const buttonPositionsRef = useRef<ButtonPosition[]>([]);
  const needsRenderRef = useRef(true);
  const carouselOffsetRef = useRef(0);
  const bossScrollRef = useRef(0);
  const renderRef = useRef<() => void>(() => {});

  // Анимация наведения на иконки: плавное увеличение + тряска при удержании курсора
  const hoverAnimRef = useRef<HoverAnim>({ id: null, scale: 1, shakeX: 0, shakeY: 0, rot: 0 });
  const hoverTargetRef = useRef<string | null>(null);
  const stillSinceRef = useRef(0);
  const shakeLevelRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Refs для callback'ов чтобы не менять зависимости
  const callbacksRef = useRef<Record<string, ((...args: any[]) => any) | undefined>>({
    onProfileClick,
    onBattleClick,
    onBossModalClose,
    onCloseMap,
    onOpenBossModal,
    onCloseProfile,
    onBackToMain,
    onGoDistrict,
    onRestoreEnergy,
    onRestoreSpicki,
    onRestoreBullets,
    onRestoreGold,
    onRestoreZhetons,
    onToggleFullscreen,
    onMapRaidClick,
    onBossAttack,
    onFightAttack,
    onFightLeave,
    onNotificationsClick,
  });

  // Обновляем ref callback'ов при каждом изменении
  useEffect(() => {
    callbacksRef.current = {
      onProfileClick,
      onBattleClick,
      onBossModalClose,
      onCloseMap,
      onOpenBossModal,
      onCloseProfile,
      onBackToMain,
      onGoDistrict,
      onRestoreEnergy,
      onRestoreSpicki,
      onRestoreBullets,
      onRestoreGold,
      onRestoreZhetons,
      onToggleFullscreen,
      onMapRaidClick,
      onBossAttack,
      onFightAttack,
      onFightLeave,
      onNotificationsClick,
    };
  }, [
    onProfileClick, onBattleClick, onBossModalClose, onCloseMap,
    onOpenBossModal, onCloseProfile, onBackToMain, onGoDistrict,
    onRestoreEnergy, onRestoreSpicki, onRestoreBullets, onRestoreGold, onRestoreZhetons,
    onToggleFullscreen, onMapRaidClick, onBossAttack, onFightAttack, onFightLeave, onNotificationsClick
  ]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    const w = displayWidth;
    const h = displayHeight;

    ctx.clearRect(0, 0, w, h);
    
    drawBackground(ctx, w, h, backgroundImage);
    drawCharacter(ctx, CHARACTER_POSITION, characterImage, appearanceColor);
    
    updateParticles();
    drawParticles(ctx);

    const flags: UIFlags = { showProfile, showBossModal, showMap, bossFight };

    const buttons = drawUI(
      ctx, w, h,
      { energy, maxEnergy, spicki, bullets, gold, zhetons, level, carLevel, districtName, authority, playerName, avatarImage, unreadNotifications },
      profileData,
      flags,
      {
        personaz: icons.personaz || null,
        boss: icons.boss || null,
        clans: icons.clans || null,
        arena: icons.arena || null,
        spicki: icons.spicki || null,
        bullets: icons.bullets || null,
        gold: icons.gold || null,
        zhetons: icons.zhetons || null,
        plus: icons.plus || null,
        cloth: icons.cloth || null,
        komnata: icons.komnata || null,
        kazino: icons.kazino || null,
        raion: icons.raion || null,
        friends: icons.friends || null,
        quest: icons.quest || null,
        clan: icons.clan || null,
        fonIconBoss: icons.fonIconBoss || null,
        fonLoot: icons.fonLoot || null,
        fonWinnera: icons.fonWinnera || null,
      },
      carouselOffsetRef.current,
      hoveredRef.current.x,
      hoveredRef.current.y,
      bosses,
      characterImage,
      appearanceColor,
      flags.showMap ? mapRaids : [],
      mapImage,
      topBarImage,
      hoverAnimRef.current,
      bossScrollRef.current,
      bossImage,
      mapMessage
    );

    buttonPositionsRef.current = buttons;
    needsRenderRef.current = false;
  }, [backgroundImage, characterImage, icons, energy, maxEnergy, authority, spicki, bullets, gold, zhetons, tasks, appearanceColor, currentLocation, carLevel, level, districtName, playerName, avatarImage, showProfile, showBossModal, showMap, bossFight, profileData, bosses, mapRaids, mapImage, topBarImage, bossImage, fullscreen, mapMessage, unreadNotifications]);

  // Всегда актуальная версия render для обработчика кликов
  renderRef.current = render;

  // === Цикл анимации наведения (плавное увеличение + тряска при удержании) ===
  const HOVER_SCALE = 1.14;
  const HOLD_BEFORE_SHAKE_MS = 260;
  const SHAKE_FREQ = 42;
  const SHAKE_AMP = 2.6;

  const stopAnimLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startAnimLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;

      const anim = hoverAnimRef.current;
      const target = hoverTargetRef.current;
      const hovering = target !== null;

      // Прогресс появления/исчезновения эффекта (0..1)
      const speed = hovering ? dt / 130 : dt / 160;
      const prev = anim.scale;
      const goal = hovering ? HOVER_SCALE : 1;
      const step = (HOVER_SCALE - 1) * speed;
      let next = prev;
      if (prev < goal) next = Math.min(goal, prev + step);
      else if (prev > goal) next = Math.max(goal, prev - step);
      anim.scale = next;

      // Тряска включается, если курсор перестал двигаться поверх иконки
      const heldLong = hovering && now - stillSinceRef.current > HOLD_BEFORE_SHAKE_MS;
      const shakeGoal = heldLong ? 1 : 0;
      const shakeStep = dt / (heldLong ? 160 : 90);
      shakeLevelRef.current = shakeGoal > shakeLevelRef.current
        ? Math.min(shakeGoal, shakeLevelRef.current + shakeStep)
        : Math.max(shakeGoal, shakeLevelRef.current - shakeStep);
      const shake = shakeLevelRef.current;

      const t = now / 1000;
      const norm = (anim.scale - 1) / (HOVER_SCALE - 1);
      // Держим последнюю наведённую иконку, пока она не "сдуется" обратно
      if (target) anim.id = target;
      if (shake > 0.001) {
        const amp = SHAKE_AMP * shake * (0.5 + norm * 0.5);
        anim.shakeX = Math.sin(t * SHAKE_FREQ) * amp;
        anim.shakeY = Math.cos(t * SHAKE_FREQ * 1.37) * amp * 0.7;
        anim.rot = Math.sin(t * SHAKE_FREQ * 0.9) * 0.05 * shake;
      } else {
        anim.shakeX = 0;
        anim.shakeY = 0;
        anim.rot = 0;
      }

      renderRef.current();

      const animating = anim.scale !== 1 || shake > 0.001;
      if (animating) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        anim.id = null;
        rafRef.current = null;
        renderRef.current();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => stopAnimLoop, [stopAnimLoop]);

  // Любое изменение боссов (например, обновилось HP) требует нового кадра
  useEffect(() => {
    needsRenderRef.current = true;
  }, [bosses]);

  // Окно боя анимируется по времени (покачивание, вспышки) — рисуем кадры постоянно
  useEffect(() => {
    if (!bossFight) return;
    let raf = 0;
    const tick = () => {
      renderRef.current();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bossFight]);

  // Карта районов: пока есть идущие рейды, обновляем кадры — на маркерах идёт обратный отсчёт
  useEffect(() => {
    if (!showMap) return;
    if (!mapRaids.some((raid) => raid.isRunning)) return;
    let raf = 0;
    const tick = () => {
      renderRef.current();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showMap, mapRaids]);

  // Рендер когда нужно
  useEffect(() => {
    if (!needsRenderRef.current) return;
    render();
  }, [render]);

  // Ресайз
  useEffect(() => {
    const handleResize = () => { needsRenderRef.current = true; };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const buttons = buttonPositionsRef.current;
    const cb = callbacksRef.current;

    for (const btn of buttons) {
      if (x > btn.x && x < btn.x + btn.width && y > btn.y && y < btn.y + btn.height) {
        // Все кнопки "Назад" / "Закрыть" возвращают на главную страницу
        if (btn.id === 'close_profile') { cb.onBackToMain?.(); return; }
        if (btn.id === 'close_boss_modal') { cb.onBackToMain?.(); return; }
        if (btn.id === 'back_to_main') {
          cb.onBackToMain?.();
          return;
        }
        if (btn.id === 'go_battle') { cb.onBattleClick?.(); return; }
        if (btn.id === 'go_boss') { cb.onOpenBossModal?.(); return; }
        // Окно боя с боссом: "Удар" и "Отступить"/"Закрыть"
        if (btn.id === 'fight_attack') { cb.onFightAttack?.(); return; }
        if (btn.id === 'fight_leave') { cb.onFightLeave?.(); return; }
        // Атака по конкретному боссу в окне боссов: уменьшаем его HP
        if (btn.id.startsWith('attack_boss_')) {
          cb.onBossAttack?.(btn.id.slice('attack_boss_'.length));
          return;
        }
        if (btn.id.startsWith('boss_fight_')) {
          cb.onBossAttack?.(btn.id.slice('boss_fight_'.length));
          return;
        }
        if (btn.id.startsWith('solo_boss_')) {
          cb.onBossAttack?.(btn.id.slice('solo_boss_'.length));
          return;
        }
        if (btn.id === 'go_profile') { cb.onProfileClick?.(); return; }
        if (btn.id === 'restore_spicki') { cb.onRestoreSpicki?.(); return; }
        if (btn.id === 'restore_bullets') { cb.onRestoreBullets?.(); return; }
        if (btn.id === 'restore_gold') { cb.onRestoreGold?.(); return; }
        if (btn.id === 'restore_zhetons') { cb.onRestoreZhetons?.(); return; }
        if (btn.id === 'restore_energy') { cb.onRestoreEnergy?.(); return; }
        if (btn.id === 'toggle_fullscreen') { cb.onToggleFullscreen?.(); return; }
        if (btn.id === 'notifications') { cb.onNotificationsClick?.(); return; }
        if (btn.id === 'carousel_up' || btn.id === 'carousel_down') {
          carouselOffsetRef.current = btn.id === 'carousel_up'
            ? Math.max(0, carouselOffsetRef.current - 1)
            : Math.min(RIGHT_PANEL_MAX_OFFSET, carouselOffsetRef.current + 1);
          needsRenderRef.current = true;
          renderRef.current();
          return;
        }
        if (btn.id === 'go_workshop') { cb.onWorkshopClick?.(); return; }
        if (btn.id === 'go_raid') { cb.onRaidClick?.(); return; }
        // Клик по рейду на карте районов
        if (btn.id.startsWith('raid_')) { cb.onMapRaidClick?.(btn.id.slice('raid_'.length)); return; }
        if (btn.id === 'go_clan') { cb.onClanClick?.(); return; }
        if (btn.id === 'go_inventory') { cb.onInventoryClick?.(); return; }
        if (btn.id === 'go_quests') { cb.onQuestsClick?.(); return; }
        if (btn.id === 'go_crafting') { cb.onCraftingClick?.(); return; }
        if (btn.id === 'go_district') { cb.onGoDistrict?.(); return; }
        if (btn.id === 'go_cloth') { cb.onGoCloth?.(); return; }
        if (btn.id === 'go_komnata') { cb.onGoKomnata?.(); return; }
        if (btn.id === 'go_kazino') { cb.onGoKazino?.(); return; }
        if (btn.id === 'lottery') { cb.onLotteryClick?.(); return; }
        if (btn.id === 'claim_daily') { cb.onDailyGoldClick?.(); return; }
        return;
      }
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const newX = e.clientX - rect.left;
    const newY = e.clientY - rect.top;

    const prev = hoveredRef.current;
    if (prev.x !== newX || prev.y !== newY) {
      hoveredRef.current = { x: newX, y: newY };

      // Курсор двигается — сбрасываем таймер "удержания" для тряски
      stillSinceRef.current = performance.now();

      // Определяем иконку под курсором (только кликабельные зоны)
      const hit = buttonPositionsRef.current.find(
        btn => newX > btn.x && newX < btn.x + btn.width && newY > btn.y && newY < btn.y + btn.height
      );
      const id = hit ? hit.id : null;
      if (id !== hoverTargetRef.current) {
        hoverTargetRef.current = id;
        // Запускаем цикл и при уходе курсора — нужен кадр на "сдувание"
        startAnimLoop();
      }

      if (!needsRenderRef.current) {
        needsRenderRef.current = true;
        render();
      }
    }
  }, [render, startAnimLoop]);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = { x: 0, y: 0 };
    hoverTargetRef.current = null;
    startAnimLoop();
  }, [startAnimLoop]);

  // Прокрутка списка боссов колесом мыши (по BOSS_VISIBLE за шаг)
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!showBossModal) return;
    const maxOffset = Math.max(0, bosses.length - BOSS_VISIBLE);
    if (maxOffset <= 0) return;

    const next = Math.min(maxOffset, Math.max(0, bossScrollRef.current + (e.deltaY > 0 ? BOSS_VISIBLE : -BOSS_VISIBLE)));
    if (next !== bossScrollRef.current) {
      bossScrollRef.current = next;
      renderRef.current();
    }
  }, [showBossModal, bosses.length]);

  // При закрытии модалки сбрасываем прокрутку
  useEffect(() => {
    if (!showBossModal) bossScrollRef.current = 0;
  }, [showBossModal]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      canvasRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return {
    canvasRef,
    handleCanvasClick,
    handleMouseMove,
    handleMouseLeave,
    handleWheel,
    toggleFullscreen,
  };
};
