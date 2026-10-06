// ═══════════════════════════════════════════
// ЗНАК ЗАВОДА — что производит завод
// Линейный символ продукта в шапке смены
// product: 'bread' | 'furniture' | 'electronics'
// ═══════════════════════════════════════════

(function () {
  // ─── SVG-символы продуктов ───
  // Все нарисованы в viewBox 0 0 64 64
  // stroke="currentColor" — цвет наследуется от CSS
  // fill="none" — линейный стиль
  // stroke-width="2" — тонкая линия
  // stroke-linecap="round" stroke-linejoin="round" — мягкие окончания

  const SVG_OPEN =
    '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" ' +
    'fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">';

  const SVG_CLOSE = '</svg>';

  // ─── Колос (хлеб) ───
  // Стебель + пары зёрен по бокам + верхушка
  const BREAD =
    // Стебель
    '<line x1="32" y1="56" x2="32" y2="20"/>' +
    // Нижняя пара зёрен
    '<path d="M32 44 C 24 44, 20 40, 20 34 C 26 34, 30 38, 32 42"/>' +
    '<path d="M32 44 C 40 44, 44 40, 44 34 C 38 34, 34 38, 32 42"/>' +
    // Средняя пара
    '<path d="M32 36 C 24 36, 20 32, 20 26 C 26 26, 30 30, 32 34"/>' +
    '<path d="M32 36 C 40 36, 44 32, 44 26 C 38 26, 34 30, 32 34"/>' +
    // Верхушка
    '<path d="M32 28 C 26 26, 24 22, 24 16 C 28 18, 31 22, 32 26"/>' +
    '<path d="M32 28 C 38 26, 40 22, 40 16 C 36 18, 33 22, 32 26"/>' +
    // Точка-вершина
    '<line x1="32" y1="18" x2="32" y2="10"/>';

  // ─── Кровать (мебель) ───
  // Вид сбоку — знак отеля. Растянута по горизонтали.
  // Изголовье выше изножья — ключевой признак.
  const FURNITURE =
    // Изголовье — высокий прямоугольник слева, с двумя перекладинами
    '<rect x="4" y="16" width="6" height="30" rx="1.5" ' +
      'fill="currentColor" fill-opacity="0.22"/>' +
    '<line x1="4" y1="24" x2="10" y2="24" stroke-width="1.5"/>' +
    '<line x1="4" y1="38" x2="10" y2="38" stroke-width="1.5"/>' +

    // Изножье — низкий прямоугольник справа
    '<rect x="54" y="28" width="6" height="18" rx="1.5" ' +
      'fill="currentColor" fill-opacity="0.22"/>' +

    // Матрас — длинная горизонтальная плита во всю ширину
    '<rect x="8" y="36" width="48" height="9" rx="2.5" ' +
      'fill="currentColor" fill-opacity="0.16"/>' +

    // Верхняя перекладина изголовья (поверх матраса — соединяет)
    '<line x1="10" y1="30" x2="54" y2="30" stroke-width="1.5" opacity="0.6"/>' +

    // Подушка — крупный овал на левой стороне матраса
    '<ellipse cx="18" cy="34" rx="9" ry="4.5" ' +
      'fill="currentColor" fill-opacity="0.30"/>' +

    // Ножки — короткие, толстые
    '<line x1="12" y1="45" x2="12" y2="52" stroke-width="2.5"/>' +
    '<line x1="52" y1="45" x2="52" y2="52" stroke-width="2.5"/>';

  // ─── Микросхема (электроника) ───
  // Квадрат + ножки по бокам + точка внутри
  const ELECTRONICS =
    // Корпус — скруглённый квадрат
    '<rect x="18" y="18" width="28" height="28" rx="3"/>' +
    // Внутренний квадрат (кристалл)
    '<rect x="26" y="26" width="12" height="12" rx="1"/>' +
    // Точка-ориентир внутри (маленький кружок)
    '<circle cx="32" cy="32" r="1.5"/>' +
    // Ножки слева (3)
    '<line x1="10" y1="24" x2="18" y2="24"/>' +
    '<line x1="10" y1="32" x2="18" y2="32"/>' +
    '<line x1="10" y1="40" x2="18" y2="40"/>' +
    // Ножки справа (3)
    '<line x1="46" y1="24" x2="54" y2="24"/>' +
    '<line x1="46" y1="32" x2="54" y2="32"/>' +
    '<line x1="46" y1="40" x2="54" y2="40"/>' +
    // Ножки снизу (3)
    '<line x1="24" y1="46" x2="24" y2="54"/>' +
    '<line x1="32" y1="46" x2="32" y2="54"/>' +
    '<line x1="40" y1="46" x2="40" y2="54"/>';

  // ─── Карта символов ───
  const SIGNS = {
    bread:       BREAD,
    furniture:   FURNITURE,
    electronics: ELECTRONICS
  };

  // ─── Отрисовать знак ───
  // Возвращает HTML-строку SVG или пустую строку, если продукт неизвестен
  function renderFactorySign(product) {
    if (!product) return '';
    const body = SIGNS[product];
    if (!body) return '';
    return SVG_OPEN + body + SVG_CLOSE;
  }

  // ─── Вставить знак в конкретный контейнер ───
  // elementId — id div-а, куда вставляем (например, 'factory-sign-director')
  // product — ключ продукта
  function mountFactorySign(elementId, product) {
    const box = document.getElementById(elementId);
    if (!box) return;
    box.innerHTML = renderFactorySign(product);
  }

  // ─── Экспорт ───
  window.FactorySign = {
    render: renderFactorySign,
    mount: mountFactorySign
  };

  console.log('FactorySign: модуль готов');
})();