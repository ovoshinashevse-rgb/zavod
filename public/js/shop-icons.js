// ═══════════════════════════════════════════
// ИКОНКИ МАГАЗИНА ОБНАЛА
// Линейные SVG
// ═══════════════════════════════════════════

(function () {
  const SVG_OPEN =
    '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" ' +
    'fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">';

  const SVG_CLOSE = '</svg>';

  // ─── МАШИНЫ ───

  const CAR_OLD =
    '<path d="M10 42 L14 32 L20 28 L44 28 L50 32 L54 42"/>' +
    '<path d="M10 42 L54 42 L54 48 L10 48 Z"/>' +
    '<circle cx="18" cy="50" r="4"/>' +
    '<circle cx="46" cy="50" r="4"/>' +
    '<path d="M22 34 L26 32" stroke-width="1.5"/>';

  // НОВАЯ: Подержанная — обычная машина с потёртостью
  const CAR_USED =
    '<path d="M10 42 L16 30 L22 26 L42 26 L48 30 L54 42"/>' +
    '<path d="M10 42 L54 42 L54 48 L10 48 Z"/>' +
    '<circle cx="18" cy="50" r="4"/>' +
    '<circle cx="46" cy="50" r="4"/>' +
    '<line x1="26" y1="32" x2="38" y2="32" stroke-width="1.5"/>' +
    '<path d="M14 38 L18 36" stroke-width="1.5" opacity="0.6"/>' +
    '<path d="M48 40 L44 38" stroke-width="1.5" opacity="0.6"/>';

  const CAR_NORMAL =
    '<path d="M10 42 L16 30 L22 26 L42 26 L48 30 L54 42"/>' +
    '<path d="M10 42 L54 42 L54 48 L10 48 Z"/>' +
    '<circle cx="18" cy="50" r="4"/>' +
    '<circle cx="46" cy="50" r="4"/>' +
    '<line x1="26" y1="32" x2="38" y2="32" stroke-width="1.5"/>';

  const CAR_GOOD =
    '<path d="M8 42 L16 28 L24 24 L40 24 L48 28 L56 42"/>' +
    '<path d="M8 42 L56 42 L56 48 L8 48 Z"/>' +
    '<circle cx="18" cy="50" r="4"/>' +
    '<circle cx="46" cy="50" r="4"/>' +
    '<path d="M24 28 L26 34 L38 34 L40 28" stroke-width="1.5"/>' +
    '<line x1="32" y1="24" x2="32" y2="28" stroke-width="1.5"/>';

  const CAR_PREMIUM =
    '<path d="M6 42 L14 28 L22 22 L42 22 L50 28 L58 42"/>' +
    '<path d="M6 42 L58 42 L58 48 L6 48 Z"/>' +
    '<circle cx="16" cy="50" r="4.5"/>' +
    '<circle cx="48" cy="50" r="4.5"/>' +
    '<path d="M22 28 L26 34 L38 34 L42 28" stroke-width="1.5"/>' +
    '<line x1="32" y1="22" x2="32" y2="28" stroke-width="1.5"/>' +
    '<line x1="14" y1="38" x2="50" y2="38" stroke-width="1.5" opacity="0.6"/>';

  const CAR_LUXURY =
    '<path d="M4 44 L12 30 L22 24 L42 24 L52 30 L60 44"/>' +
    '<path d="M4 44 L60 44 L60 50 L4 50 Z"/>' +
    '<circle cx="14" cy="52" r="4.5"/>' +
    '<circle cx="50" cy="52" r="4.5"/>' +
    '<path d="M22 30 L26 36 L38 36 L42 30" stroke-width="1.5"/>' +
    '<path d="M16 34 Q 32 30, 48 34" stroke-width="1.2" opacity="0.5"/>';

  // ─── ЖИЛЬЁ ───

  const HOME_RENT =
    '<path d="M14 30 L32 16 L50 30"/>' +
    '<path d="M18 30 L18 52 L46 52 L46 30"/>' +
    '<rect x="28" y="38" width="8" height="14" rx="1"/>' +
    '<circle cx="34" cy="45" r="0.8" fill="currentColor"/>';

  // НОВАЯ: Своя комната — квадрат с окном и кроватью
  const HOME_ROOM =
    '<rect x="14" y="16" width="36" height="36" rx="2"/>' +
    '<rect x="20" y="22" width="10" height="8" rx="1" stroke-width="1.3"/>' +
    '<line x1="25" y1="22" x2="25" y2="30" stroke-width="1"/>' +
    '<line x1="20" y1="26" x2="30" y2="26" stroke-width="1"/>' +
    '<rect x="20" y="38" width="20" height="8" rx="1.5"/>' +
    '<line x1="20" y1="42" x2="40" y2="42" stroke-width="1.2" opacity="0.6"/>';

  const HOME_OWN =
    '<rect x="10" y="14" width="44" height="40" rx="2"/>' +
    '<line x1="10" y1="26" x2="54" y2="26" stroke-width="1.5"/>' +
    '<line x1="10" y1="40" x2="54" y2="40" stroke-width="1.5"/>' +
    '<rect x="16" y="18" width="8" height="6" rx="1" stroke-width="1.3"/>' +
    '<rect x="40" y="18" width="8" height="6" rx="1" stroke-width="1.3"/>' +
    '<rect x="16" y="30" width="8" height="6" rx="1" stroke-width="1.3"/>' +
    '<rect x="40" y="30" width="8" height="6" rx="1" stroke-width="1.3"/>' +
    '<rect x="28" y="44" width="8" height="10" rx="1" stroke-width="1.3"/>';

  const HOME_HOUSE =
    '<path d="M8 30 L32 10 L56 30"/>' +
    '<path d="M12 30 L12 54 L52 54 L52 30"/>' +
    '<path d="M40 16 L40 22" stroke-width="2.5"/>' +
    '<rect x="26" y="40" width="12" height="14" rx="1"/>' +
    '<circle cx="35" cy="47" r="0.8" fill="currentColor"/>' +
    '<line x1="20" y1="38" x2="20" y2="46" stroke-width="1.5"/>' +
    '<line x1="44" y1="38" x2="44" y2="46" stroke-width="1.5"/>';

  const HOME_MANSION =
    '<path d="M4 32 L32 10 L60 32"/>' +
    '<path d="M8 32 L8 56 L56 56 L56 32"/>' +
    '<path d="M30 16 L30 22" stroke-width="2.5"/>' +
    '<rect x="14" y="36" width="6" height="8" rx="1" stroke-width="1.3"/>' +
    '<rect x="26" y="36" width="6" height="8" rx="1" stroke-width="1.3"/>' +
    '<rect x="38" y="36" width="6" height="8" rx="1" stroke-width="1.3"/>' +
    '<rect x="26" y="48" width="12" height="8" rx="1"/>' +
    '<circle cx="35" cy="52" r="0.8" fill="currentColor"/>' +
    '<rect x="14" y="48" width="6" height="8" rx="1" stroke-width="1.3"/>' +
    '<rect x="44" y="48" width="6" height="8" rx="1" stroke-width="1.3"/>';

  const HOME_ESTATE =
    '<path d="M2 34 L32 8 L62 34"/>' +
    '<path d="M6 34 L6 56 L58 56 L58 34"/>' +
    '<rect x="14" y="36" width="4" height="20" stroke-width="1.5"/>' +
    '<rect x="22" y="36" width="4" height="20" stroke-width="1.5"/>' +
    '<rect x="30" y="36" width="4" height="20" stroke-width="1.5"/>' +
    '<rect x="38" y="36" width="4" height="20" stroke-width="1.5"/>' +
    '<rect x="46" y="36" width="4" height="20" stroke-width="1.5"/>' +
    '<rect x="27" y="14" width="10" height="10" rx="1" stroke-width="1.3"/>';

  // ─── ОТДЫХ ───

  const VAC_NONE =
    '<circle cx="32" cy="32" r="20"/>' +
    '<line x1="18" y1="18" x2="46" y2="46" stroke-width="2.5"/>';

  // НОВАЯ: Шашлыки — шампур с мясом на мангале
  const VAC_KEBAB =
    '<line x1="10" y1="36" x2="54" y2="36" stroke-width="2"/>' +
    '<path d="M14 36 L18 48 L46 48 L50 36" stroke-width="1.5"/>' +
    '<line x1="20" y1="48" x2="20" y2="54" stroke-width="1.5"/>' +
    '<line x1="32" y1="48" x2="32" y2="54" stroke-width="1.5"/>' +
    '<line x1="44" y1="48" x2="44" y2="54" stroke-width="1.5"/>' +
    '<line x1="22" y1="20" x2="42" y2="20"/>' +
    '<circle cx="26" cy="20" r="3" stroke-width="1.5"/>' +
    '<circle cx="32" cy="20" r="3" stroke-width="1.5"/>' +
    '<circle cx="38" cy="20" r="3" stroke-width="1.5"/>' +
    '<path d="M18 36 Q 22 28, 22 23" stroke-width="1.2" opacity="0.6"/>' +
    '<path d="M40 36 Q 36 30, 42 26" stroke-width="1.2" opacity="0.5"/>';

  const VAC_LOCAL =
    '<circle cx="32" cy="20" r="6"/>' +
    '<line x1="32" y1="8" x2="32" y2="12" stroke-width="1.5"/>' +
    '<line x1="44" y1="20" x2="48" y2="20" stroke-width="1.5"/>' +
    '<line x1="20" y1="20" x2="16" y2="20" stroke-width="1.5"/>' +
    '<path d="M4 38 Q 14 32, 24 38 T 44 38 T 60 38" stroke-width="2"/>' +
    '<path d="M4 48 Q 14 42, 24 48 T 44 48 T 60 48" stroke-width="2"/>';

  const VAC_ABROAD =
    '<path d="M8 34 L56 22 L50 34 L56 44 L8 34 Z" transform="rotate(-15 32 34)"/>' +
    '<path d="M22 28 L26 34" stroke-width="1.5" transform="rotate(-15 32 34)"/>' +
    '<path d="M22 40 L26 34" stroke-width="1.5" transform="rotate(-15 32 34)"/>';

  const VAC_LUXURY =
    '<circle cx="46" cy="16" r="6"/>' +
    '<line x1="46" y1="6" x2="46" y2="10" stroke-width="1.5"/>' +
    '<line x1="56" y1="16" x2="60" y2="16" stroke-width="1.5"/>' +
    '<path d="M16 56 Q 18 44, 20 36 L 24 36 Q 26 44, 28 56"/>' +
    '<path d="M22 36 Q 14 32, 10 34" stroke-width="1.5"/>' +
    '<path d="M22 36 Q 30 28, 38 30" stroke-width="1.5"/>' +
    '<path d="M22 36 Q 22 28, 18 24" stroke-width="1.5"/>' +
    '<path d="M22 36 Q 26 28, 30 26" stroke-width="1.5"/>' +
    '<path d="M4 56 L60 56" stroke-width="1.5" opacity="0.6"/>';

  const VAC_ISLAND =
    '<ellipse cx="32" cy="52" rx="20" ry="6"/>' +
    '<path d="M32 52 L32 34"/>' +
    '<path d="M32 34 Q 22 30, 16 34" stroke-width="1.5"/>' +
    '<path d="M32 34 Q 42 30, 48 34" stroke-width="1.5"/>' +
    '<path d="M32 34 Q 32 26, 26 22" stroke-width="1.5"/>' +
    '<path d="M32 34 Q 32 26, 38 22" stroke-width="1.5"/>' +
    '<circle cx="32" cy="18" r="1.5" fill="currentColor"/>';

  // ─── АКСЕССУАРЫ ───

  const WATCH_NONE =
    '<circle cx="32" cy="32" r="14"/>' +
    '<line x1="32" y1="20" x2="32" y2="32" stroke-width="2"/>' +
    '<line x1="32" y1="32" x2="40" y2="38" stroke-width="2"/>' +
    '<line x1="24" y1="18" x2="40" y2="46" stroke-width="2.5" opacity="0.6"/>';

  const WATCH_SIMPLE =
    '<circle cx="32" cy="32" r="14"/>' +
    '<circle cx="32" cy="32" r="10" stroke-width="1" opacity="0.5"/>' +
    '<line x1="32" y1="22" x2="32" y2="32" stroke-width="2"/>' +
    '<line x1="32" y1="32" x2="40" y2="34" stroke-width="2"/>' +
    '<circle cx="32" cy="32" r="1.5" fill="currentColor"/>';

  const WATCH_GOOD =
    '<circle cx="32" cy="32" r="14"/>' +
    '<circle cx="32" cy="32" r="10" stroke-width="1" opacity="0.5"/>' +
    '<line x1="32" y1="22" x2="32" y2="32" stroke-width="2"/>' +
    '<line x1="32" y1="32" x2="40" y2="34" stroke-width="2"/>' +
    '<circle cx="32" cy="32" r="1.5" fill="currentColor"/>' +
    '<path d="M24 18 L28 12 L36 12 L40 18" stroke-width="1.5"/>' +
    '<path d="M24 46 L28 52 L36 52 L40 46" stroke-width="1.5"/>';

  const WATCH_PREMIUM =
    '<circle cx="32" cy="32" r="14"/>' +
    '<circle cx="32" cy="32" r="11" stroke-width="1" opacity="0.6"/>' +
    '<circle cx="32" cy="32" r="8" stroke-width="1" opacity="0.4"/>' +
    '<line x1="32" y1="22" x2="32" y2="32" stroke-width="2"/>' +
    '<line x1="32" y1="32" x2="40" y2="34" stroke-width="2"/>' +
    '<circle cx="32" cy="32" r="1.5" fill="currentColor"/>' +
    '<path d="M24 18 L28 12 L36 12 L40 18" stroke-width="1.5"/>' +
    '<path d="M24 46 L28 52 L36 52 L40 46" stroke-width="1.5"/>';

  // ─── РОСКОШЬ ───

  const LUXURY_YACHT =
    '<path d="M4 48 L60 48 L52 56 L12 56 Z"/>' +
    '<line x1="32" y1="14" x2="32" y2="48"/>' +
    '<path d="M32 18 L48 44 L32 44 Z" stroke-width="1.5"/>' +
    '<path d="M32 22 L18 44 L32 44 Z" stroke-width="1.5"/>';

  const LUXURY_JET =
    '<path d="M6 32 L58 26 L52 32 L58 38 L6 32 Z"/>' +
    '<path d="M20 30 L24 24" stroke-width="1.5"/>' +
    '<path d="M20 34 L24 40" stroke-width="1.5"/>' +
    '<circle cx="46" cy="32" r="1.5" fill="currentColor"/>' +
    '<circle cx="38" cy="32" r="1.5" fill="currentColor"/>';

  // ─── КАРТА ───
  const ICONS = {
    car_old:        CAR_OLD,
    car_used:       CAR_USED,
    car_normal:     CAR_NORMAL,
    car_good:       CAR_GOOD,
    car_premium:    CAR_PREMIUM,
    car_luxury:     CAR_LUXURY,

    home_rent:      HOME_RENT,
    home_room:      HOME_ROOM,
    home_own:       HOME_OWN,
    home_house:     HOME_HOUSE,
    home_mansion:   HOME_MANSION,
    home_estate:    HOME_ESTATE,

    vac_none:       VAC_NONE,
    vac_kebab:      VAC_KEBAB,
    vac_local:      VAC_LOCAL,
    vac_abroad:     VAC_ABROAD,
    vac_luxury:     VAC_LUXURY,
    vac_island:     VAC_ISLAND,

    watch_none:     WATCH_NONE,
    watch_simple:   WATCH_SIMPLE,
    watch_good:     WATCH_GOOD,
    watch_premium:  WATCH_PREMIUM,

    luxury_yacht:   LUXURY_YACHT,
    luxury_jet:     LUXURY_JET
  };

  function renderIcon(iconKey) {
    if (!iconKey) return '';
    const body = ICONS[iconKey];
    if (!body) return '';
    return SVG_OPEN + body + SVG_CLOSE;
  }

  window.ShopIcons = {
    render: renderIcon
  };

  console.log('ShopIcons: модуль готов');
})();