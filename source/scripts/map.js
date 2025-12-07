let map = null;
let placemark = null;
let isInitialized = false;
const DADATA_TOKEN = '5b87e019263b082d3dcc8dd576d2e87ca39dab8d';

// Функция для адаптивного изменения высоты textarea
function adjustTextareaHeight() {
  const addressTextarea = document.getElementById('address');
  if (!addressTextarea) {
    return;
  }

  addressTextarea.style.height = 'auto';
  const baseHeight = 60;
  const scrollHeight = addressTextarea.scrollHeight;
  addressTextarea.style.height = `${Math.max(baseHeight, scrollHeight) }px`;
}

// Функция для обновления placeholder в зависимости от ширины экрана
function updateAddressPlaceholder() {
  const addressTextarea = document.getElementById('address');
  if (!addressTextarea) {
    return;
  }

  const currentValue = addressTextarea.value;
  const isMobile = window.innerWidth <= 768;

  addressTextarea.value = '';

  if (isMobile) {
    addressTextarea.placeholder = 'г. Санкт-Петербург\nпр. Просвещения, д. 99, кв. 152';
  } else {
    addressTextarea.placeholder = 'г. Санкт-Петербург, пр. Просвещения, д. 99, кв. 152';
  }

  addressTextarea.value = currentValue;
  adjustTextareaHeight();
}

// Основная функция инициализации
function initMap() {
  if (isInitialized || typeof ymaps === 'undefined') {
    return;
  }

  ymaps.ready(() => {
    try {
      if (map) {
        return;
      }

      map = new ymaps.Map('map', {
        center: [59.9386, 30.3141],
        zoom: 12,
        controls: ['zoomControl']
      });

      console.log('Карта создана');
      isInitialized = true;

      initTextareaAdaptation();
      bindEvents();
      initInitialAddress();

    } catch (error) {
      console.error('Ошибка инициализации карты:', error);
    }
  });
}

// Инициализация адаптации textarea
function initTextareaAdaptation() {
  const addressTextarea = document.getElementById('address');
  if (!addressTextarea) {
    return;
  }

  updateAddressPlaceholder();

  addressTextarea.addEventListener('input', () => {
    adjustTextareaHeight();
  });

  window.addEventListener('resize', () => {
    updateAddressPlaceholder();
    adjustTextareaHeight();
  });

  setTimeout(() => {
    adjustTextareaHeight();
  }, 100);
}

// Привязка обработчиков событий
function bindEvents() {
  const addressTextarea = document.getElementById('address');

  if (!addressTextarea) {
    return;
  }

  // Обработчик ввода с debounce
  addressTextarea.addEventListener('input', debounce(() => {
    const address = addressTextarea.value.trim();
    if (address && address.length > 5) {
      geocodeAddressWithDaData(address);
    }
  }, 1000));

  // Обработчик потери фокуса
  addressTextarea.addEventListener('blur', () => {
    const address = addressTextarea.value.trim();
    if (address) {
      geocodeAddressWithDaData(address);
    }
  });

  // Обработчик клика по карте
  if (map) {
    map.events.add('click', (e) => {
      const coords = e.get('coords');
      reverseGeocode(coords);
    });
  }
}

// Функция debounce для оптимизации
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Геокодирование адреса через DaData API
async function geocodeAddressWithDaData(address) {
  try {
    const url = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address';

    const options = {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${ DADATA_TOKEN}`
      },
      body: JSON.stringify({
        query: address,
        count: 1,
        locations: [{ country: 'Россия' }],
        restrict_value: true
      })
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.suggestions && data.suggestions.length > 0) {
      const suggestion = data.suggestions[0];

      // Получаем координаты из подсказки
      if (suggestion.data && suggestion.data.geo_lat && suggestion.data.geo_lon) {
        const coords = [
          parseFloat(suggestion.data.geo_lat),
          parseFloat(suggestion.data.geo_lon)
        ];

        // Обновляем поле адреса с нормализованным адресом
        const addressTextarea = document.getElementById('address');
        addressTextarea.value = suggestion.value || address;

        // Обновляем высоту textarea
        setTimeout(() => {
          adjustTextareaHeight();
        }, 50);

        // Обновляем карту
        updateMap(coords, suggestion.value || address);

        console.log('Адрес найден через DaData:', suggestion.value);
      } else {
        // Если нет координат в подсказке, используем Яндекс геокодирование
        console.warn('Координаты не найдены в подсказке DaData, используем Яндекс');
        geocodeAddressWithYandex(address);
      }
    } else {
      console.warn('Подсказки не найдены для адреса:', address);
      geocodeAddressWithYandex(address);
    }

  } catch (error) {
    console.error('Ошибка геокодирования через DaData:', error);
    // Fallback на Яндекс геокодирование
    geocodeAddressWithYandex(address);
  }
}

// Альтернативный метод геокодирования через DaData (более точный, но платный)
async function geocodeAddressWithDaDataGeocode(address) {
  try {
    const url = 'https://cleaner.dadata.ru/api/v1/clean/address';

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${ DADATA_TOKEN}`,
        'X-Secret': 'f9a27fe64ba500d1bac0f16d7dc7749774df0cae' // Ваш секретный ключ
      },
      body: JSON.stringify([address])
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      // Если этот endpoint не работает, пробуем стандартный suggest
      if (response.status === 402 || response.status === 403) {
        console.log('DaData cleaning API недоступен, используем suggest API');
        return geocodeAddressWithDaData(address);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0 && data[0].geo_lat && data[0].geo_lon) {
      const result = data[0];
      const coords = [parseFloat(result.geo_lat), parseFloat(result.geo_lon)];

      const addressTextarea = document.getElementById('address');
      addressTextarea.value = result.result || address;

      setTimeout(() => {
        adjustTextareaHeight();
      }, 50);

      updateMap(coords, result.result || address);

      console.log('Адрес найден через DaData Clean:', result.result);
    } else {
      geocodeAddressWithYandex(address);
    }

  } catch (error) {
    console.error('Ошибка геокодирования через DaData Clean:', error);
    geocodeAddressWithYandex(address);
  }
}

// Геокодирование через Яндекс (резервный вариант)
function geocodeAddressWithYandex(address) {
  if (!map || typeof ymaps === 'undefined') {
    return;
  }

  ymaps.geocode(address, { results: 1 }).then((res) => {
    const firstGeoObject = res.geoObjects.get(0);
    if (firstGeoObject) {
      const coords = firstGeoObject.geometry.getCoordinates();
      const foundAddress = firstGeoObject.getAddressLine();

      const addressTextarea = document.getElementById('address');
      addressTextarea.value = foundAddress;

      setTimeout(() => {
        adjustTextareaHeight();
      }, 50);

      updateMap(coords, foundAddress);
      console.log('Адрес найден через Яндекс:', foundAddress);
    }
  }).catch((error) => {
    console.error('Ошибка геокодирования через Яндекс:', error);
  });
}

// Обратное геокодирование (координаты -> адрес)
function reverseGeocode(coords) {
  if (typeof ymaps === 'undefined') {
    return;
  }

  ymaps.geocode(coords).then((res) => {
    const firstGeoObject = res.geoObjects.get(0);
    if (firstGeoObject) {
      const address = firstGeoObject.getAddressLine();
      const addressTextarea = document.getElementById('address');
      addressTextarea.value = address;

      setTimeout(() => {
        adjustTextareaHeight();
      }, 50);

      updateMap(coords, address);
    }
  }).catch((error) => {
    console.error('Ошибка обратного геокодирования:', error);
  });
}

// Обновление карты с новыми координатами
function updateMap(coords, address) {
  if (!map) {
    return;
  }

  if (placemark) {
    map.geoObjects.remove(placemark);
  }

  placemark = new ymaps.Placemark(coords, {
    balloonContent: address,
    hintContent: 'Адрес доставки'
  }, {
    preset: 'islands#redDotIcon',
    balloonCloseButton: false
  });

  map.geoObjects.add(placemark);
  map.setCenter(coords, 16);
}

// Инициализация начального адреса
function initInitialAddress() {
  const addressTextarea = document.getElementById('address');
  if (addressTextarea && addressTextarea.value.trim()) {
    // Обновляем высоту для начального значения
    setTimeout(() => {
      adjustTextareaHeight();
    }, 200);

    // Геокодируем начальный адрес с небольшой задержкой
    setTimeout(() => {
      const address = addressTextarea.value.trim();
      if (address) {
        geocodeAddressWithDaData(address);
      }
    }, 1500);
  }
}

// Запуск инициализации
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM загружен, инициализируем карту...');

  // Даем время всем скриптам загрузиться
  if (typeof ymaps !== 'undefined') {
    setTimeout(initMap, 500);
  } else {
    // Если ymaps еще не загружен, ждем его
    const checkYmaps = setInterval(() => {
      if (typeof ymaps !== 'undefined') {
        clearInterval(checkYmaps);
        setTimeout(initMap, 500);
      }
    }, 100);
  }
});
