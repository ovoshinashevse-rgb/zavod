// ═══════════════════════════════════════════
// ЗНАК ЗАВОДА — что производит завод
// Линейный символ продукта в шапке смены
// product: 'bread' | 'furniture' | 'electronics'
// building: 'old_hangar' | 'main_building' | 'new_shop' (зарезервировано)
// state: 'rich' | 'mid' | 'poor'
// equipment: ключ оборудования ('old_ovens' и т.д.)
// ═══════════════════════════════════════════

(function () {
  // ─── SVG-символы продуктов ───
  const SVG_OPEN =
    '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" ' +
    'fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">';

  const SVG_CLOSE = '</svg>';

  // ─── Колос (хлеб) ───
  const BREAD =
    '<line x1="32" y1="56" x2="32" y2="20"/>' +
    '<path d="M32 44 C 24 44, 20 40, 20 34 C 26 34, 30 38, 32 42"/>' +
    '<path d="M32 44 C 40 44, 44 40, 44 34 C 38 34, 34 38, 32 42"/>' +
    '<path d="M32 36 C 24 36, 20 32, 20 26 C 26 26, 30 30, 32 34"/>' +
    '<path d="M32 36 C 40 36, 44 32, 44 26 C 38 26, 34 30, 32 34"/>' +
    '<path d="M32 28 C 26 26, 24 22, 24 16 C 28 18, 31 22, 32 26"/>' +
    '<path d="M32 28 C 38 26, 40 22, 40 16 C 36 18, 33 22, 32 26"/>' +
    '<line x1="32" y1="18" x2="32" y2="10"/>';

  // ─── Кровать (мебель) ───
  const FURNITURE =
    '<rect x="4" y="16" width="6" height="30" rx="1.5" ' +
      'fill="currentColor" fill-opacity="0.22"/>' +
    '<line x1="4" y1="24" x2="10" y2="24" stroke-width="1.5"/>' +
    '<line x1="4" y1="38" x2="10" y2="38" stroke-width="1.5"/>' +
    '<rect x="54" y="28" width="6" height="18" rx="1.5" ' +
      'fill="currentColor" fill-opacity="0.22"/>' +
    '<rect x="8" y="36" width="48" height="9" rx="2.5" ' +
      'fill="currentColor" fill-opacity="0.16"/>' +
    '<line x1="10" y1="30" x2="54" y2="30" stroke-width="1.5" opacity="0.6"/>' +
    '<ellipse cx="18" cy="34" rx="9" ry="4.5" ' +
      'fill="currentColor" fill-opacity="0.30"/>' +
    '<line x1="12" y1="45" x2="12" y2="52" stroke-width="2.5"/>' +
    '<line x1="52" y1="45" x2="52" y2="52" stroke-width="2.5"/>';

  // ─── Микросхема (электроника) ───
  const ELECTRONICS =
    '<rect x="18" y="18" width="28" height="28" rx="3"/>' +
    '<rect x="26" y="26" width="12" height="12" rx="1"/>' +
    '<circle cx="32" cy="32" r="1.5"/>' +
    '<line x1="10" y1="24" x2="18" y2="24"/>' +
    '<line x1="10" y1="32" x2="18" y2="32"/>' +
    '<line x1="10" y1="40" x2="18" y2="40"/>' +
    '<line x1="46" y1="24" x2="54" y2="24"/>' +
    '<line x1="46" y1="32" x2="54" y2="32"/>' +
    '<line x1="46" y1="40" x2="54" y2="40"/>' +
    '<line x1="24" y1="46" x2="24" y2="54"/>' +
    '<line x1="32" y1="46" x2="32" y2="54"/>' +
    '<line x1="40" y1="46" x2="40" y2="54"/>';

  // ─── Карта символов ───
  const SIGNS = {
    bread:       BREAD,
    furniture:   FURNITURE,
    electronics: ELECTRONICS
  };

  // ─── Классы состояния ───
  const STATE_CLASSES = {
    rich: 'state-rich',
    mid:  'state-mid',
    poor: 'state-poor'
  };

  const ALL_STATE_CLASSES = ['state-rich', 'state-mid', 'state-poor'];

  // ─── Классы оборудования ───
  const EQUIP_CLASSES = {
    old: 'equip-old',
    mid: 'equip-mid',
    new: 'equip-new'
  };

  const ALL_EQUIP_CLASSES = ['equip-old', 'equip-mid', 'equip-new'];

  // ─── Ключ оборудования → уровень ───
  const EQUIPMENT_LEVEL = {
    // Хлеб
    old_ovens:  'old',
    gas_ovens:  'mid',
    auto_ovens: 'new',
    // Мебель
    hand_tools: 'old',
    electric:   'mid',
    cnc:        'new',
    // Электроника
    manual:     'old',
    semi_auto:  'mid',
    robotics:   'new'
  };

  function equipLevel(equipmentKey) {
    if (!equipmentKey) return 'mid';
    return EQUIPMENT_LEVEL[equipmentKey] || 'mid';
  }

  // ─── Отрисовать знак ───
  function renderFactorySign(product) {
    if (!product) return '';
    const body = SIGNS[product];
    if (!body) return '';
    return SVG_OPEN + body + SVG_CLOSE;
  }

  // ─── Вставить знак в конкретный контейнер ───
  // elementId — id div-а
  // product — ключ продукта
  // building — ключ помещения (зарезервировано)
  // state — 'rich' | 'mid' | 'poor'
  // equipment — ключ оборудования
  function mountFactorySign(elementId, product, building, state, equipment) {
    const box = document.getElementById(elementId);
    if (!box) return;

    // Снимаем старые классы
    box.classList.remove(...ALL_STATE_CLASSES);
    box.classList.remove(...ALL_EQUIP_CLASSES);

    // SVG
    box.innerHTML = renderFactorySign(product);

    if (!product) return;

    // Состояние
    const stateCls = STATE_CLASSES[state] || STATE_CLASSES.mid;
    box.classList.add(stateCls);

    // Оборудование
    const eqCls = EQUIP_CLASSES[equipLevel(equipment)];
    box.classList.add(eqCls);
  }

  // ─── Экспорт ───
  window.FactorySign = {
    render: renderFactorySign,
    mount: mountFactorySign
  };

  console.log('FactorySign: модуль готов');
})();