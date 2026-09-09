import { useRef, useEffect, useCallback } from 'react';
import { GameIcons, Task } from './types';
import { drawBackground } from './drawBackground';
import { drawCharacter, CHARACTER_POSITION } from './drawCharacter';
import { spawnParticles, updateParticles, drawParticles } from './particles';
import { drawUI, ButtonPosition, ProfileData, UIFlags, BossData, MapRaid } from './drawUI';

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
  // State
  showProfile: boolean = false,
  showBossModal: boolean = false,
  showMap: boolean = false,
  profileData: ProfileData | null = null,
  bosses: BossData[] = [],
  mapRaids: MapRaid[] = [],
  mapImage: HTMLImageElement | null = null,
  fullscreen: boolean = false
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredRef = useRef({ x: 0, y: 0 });
  const buttonPositionsRef = useRef<ButtonPosition[]>([]);
  const needsRenderRef = useRef(true);
  const carouselOffsetRef = useRef(0);

  // Refs для callback'ов чтобы не менять зависимости
  const callbacksRef = useRef<Record<string, (() => void) | undefined>>({
    onProfileClick,
    onBattleClick,
    onBossModalClose,
    onCloseMap,
    onOpenBossModal,
    onCloseProfile,
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
    };
  }, [
    onProfileClick, onBattleClick, onBossModalClose, onCloseMap,
    onOpenBossModal, onCloseProfile
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

    const flags: UIFlags = { showProfile, showBossModal, showMap };

    const buttons = drawUI(
      ctx, w, h,
      { energy, maxEnergy, spicki, bullets, gold, zhetons, level, carLevel, districtName, authority, playerName, avatarImage },
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
      },
      carouselOffsetRef.current,
      hoveredRef.current.x,
      hoveredRef.current.y,
      bosses,
      characterImage,
      appearanceColor,
      flags.showMap ? mapRaids : [],
      mapImage
    );

    buttonPositionsRef.current = buttons;
    needsRenderRef.current = false;
  }, [backgroundImage, characterImage, icons, energy, maxEnergy, authority, spicki, bullets, gold, zhetons, tasks, appearanceColor, currentLocation, carLevel, level, districtName, playerName, avatarImage, showProfile, showBossModal, showMap, profileData, bosses, mapRaids, mapImage, fullscreen]);

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
        if (btn.id === 'close_profile') { cb.onCloseProfile?.(); return; }
        if (btn.id === 'close_boss_modal') { cb.onBossModalClose?.(); return; }
        if (btn.id === 'back_to_main') { 
          cb.onCloseMap?.();
          return;
        }
        if (btn.id.startsWith('attack_boss_')) { cb.onBattleClick?.(); return; }
        if (btn.id === 'go_battle') { cb.onBattleClick?.(); return; }
        if (btn.id === 'go_district') { cb.onGoDistrict?.(); return; }
        if (btn.id === 'go_boss') { cb.onOpenBossModal?.(); return; }
        if (btn.id.startsWith('attack_boss_') || btn.id.startsWith('solo_boss_')) { cb.onBattleClick?.(); return; }
        if (btn.id === 'go_profile') { cb.onProfileClick?.(); return; }
        if (btn.id === 'restore_spicki') { cb.onRestoreSpicki?.(); return; }
        if (btn.id === 'restore_bullets') { cb.onRestoreBullets?.(); return; }
        if (btn.id === 'restore_gold') { cb.onRestoreGold?.(); return; }
        if (btn.id === 'restore_zhetons') { cb.onRestoreZhetons?.(); return; }
        if (btn.id === 'carousel_up') { carouselOffsetRef.current = Math.max(0, carouselOffsetRef.current - 1); return; }
        if (btn.id === 'carousel_down') { carouselOffsetRef.current = Math.min(7, carouselOffsetRef.current + 1); return; }
        if (btn.id === 'go_workshop') { cb.onWorkshopClick?.(); return; }
        if (btn.id === 'go_raid') { cb.onRaidClick?.(); return; }
        if (btn.id === 'go_clan') { cb.onClanClick?.(); return; }
        if (btn.id === 'go_inventory') { cb.onInventoryClick?.(); return; }
        if (btn.id === 'go_quests') { cb.onQuestsClick?.(); return; }
        if (btn.id === 'go_crafting') { cb.onCraftingClick?.(); return; }
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
      if (!needsRenderRef.current) {
        needsRenderRef.current = true;
        render();
      }
    }
  }, [render]);

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
    toggleFullscreen,
  };
};
