// Получаем форму
const orderForm = document.querySelector('.order-form');

// Функция для применения маски телефона
function applyPhoneMask(input) {
  const value = input.value.replace(/\D/g, '');

  // Форматируем номер в формате +7 (XXX) XXX-XX-XX
  if (value.startsWith('7') || value.startsWith('8')) {
    // Российский номер
    let formattedValue = '+7 ';

    if (value.length > 1) {
      formattedValue += `(${ value.substring(1, 4)}`;
    }
    if (value.length > 4) {
      formattedValue += `) ${ value.substring(4, 7)}`;
    }
    if (value.length > 7) {
      formattedValue += `-${ value.substring(7, 9)}`;
    }
    if (value.length > 9) {
      formattedValue += `-${ value.substring(9, 11)}`;
    }

    input.value = formattedValue;
  } else if (value.length > 0) {
    // Международный номер (просто добавляем +)
    input.value = `+${ value}`;
  } else {
    input.value = value;
  }
}

// Функция для валидации телефона
function validatePhone(phone) {
  if (!phone) {
    return { isValid: false, error: 'Телефон обязателен' };
  }

  // Убираем все нецифровые символы
  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.length === 0) {
    return { isValid: false, error: 'Телефон обязателен' };
  }

  // Проверяем российские номера (начинаются с 7 или 8, длина 11 цифр)
  if (/^[78]/.test(cleanPhone)) {
    if (cleanPhone.length !== 11) {
      return { isValid: false, error: 'Российский номер должен содержать 11 цифр' };
    }
    return { isValid: true, cleanPhone: cleanPhone };
  }

  // Международные номера
  if (cleanPhone.length < 10) {
    return { isValid: false, error: 'Телефон слишком короткий' };
  }

  if (cleanPhone.length > 15) {
    return { isValid: false, error: 'Телефон слишком длинный' };
  }

  return { isValid: true, cleanPhone: cleanPhone };
}

// Функция для показа ошибки
function showError(input, message) {
  hideError(input);

  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.color = 'red';
  errorDiv.style.fontSize = '12px';
  errorDiv.style.marginTop = '5px';
  errorDiv.textContent = message;

  input.parentNode.appendChild(errorDiv);
  input.style.borderColor = 'red';
}

// Функция для скрытия ошибки
function hideError(input) {
  const error = input.parentNode.querySelector('.error-message');
  if (error) {
    error.remove();
  }
  input.style.borderColor = '';
}

// Функция для сбора данных товаров
function collectProductsData(form) {
  const products = [];
  const productIds = form.querySelectorAll('input[name="product_id"]');
  const articles = Array.from(form.querySelectorAll('input[name="article"]'));

  productIds.forEach((productIdInput, index) => {
    const productId = productIdInput.value;
    const article = articles[index]?.value || '';

    const productData = {
      id: productId,
      article,
      size: form.querySelector(`input[name="size_${productId}"]:checked`)?.value || '',
      color: form.querySelector(`input[name="color_${productId}"]:checked`)?.value || '',
      quantity: form.querySelector(`input[name="quantity_${productId}"]`)?.value || '',
      price: form.querySelector(`input[name="price_${productId}"]`)?.value || '',
      oldPrice: form.querySelector(`input[name="old_price_${productId}"]`)?.value || '',
    };

    if (productId) {
      products.push(productData);
    }
  });

  return products;
}

// Функция для сбора основных данных заказа
function collectOrderData(form) {
  const phoneInput = form.querySelector('input[name="phone"]');
  const phoneValue = phoneInput?.value || '';

  const phoneValidation = validatePhone(phoneValue);

  const orderData = {
    firstName: form.querySelector('input[name="first_name"]')?.value || '',
    lastName: form.querySelector('input[name="last_name"]')?.value || '',
    phone: phoneValue,
    phoneClean: phoneValidation.isValid ? phoneValidation.cleanPhone : '',
    email: form.querySelector('input[name="email"]')?.value || '',
    address: form.querySelector('input[name="address"]')?.value || '',
    comment: form.querySelector('textarea[name="comment"]')?.value || '',
    promocode: form.querySelector('input[name="promocode"]')?.value || '',
    paymentMethod: form.querySelector('input[name="payment_method"]:checked')?.value || '',
    phoneValid: phoneValidation.isValid
  };

  return orderData;
}

// Функция для проверки опции "со склада"
function getLogisticOption(form) {
  const logisticCheckbox = form.querySelector('input[name="logistic_method"]');
  return logisticCheckbox?.checked || false;
}

// Добавляем обработчик события отправки формы
orderForm.addEventListener('submit', function(event) {
  event.preventDefault();

  // Валидируем телефон
  const phoneInput = this.querySelector('input[name="phone"]');
  const phoneValue = phoneInput?.value || '';
  const phoneValidation = validatePhone(phoneValue);

  if (!phoneValidation.isValid) {
    showError(phoneInput, phoneValidation.error);
    return;
  }

  hideError(phoneInput);

  // Создаем объект FormData
  const formData = new FormData(this);

  console.log('FormData содержимое:');
  for (const [key, value] of formData.entries()) {
    console.log(`${key}: ${value}`);
  }

  // Собираем остальные данные
  const productsData = collectProductsData(this);
  const orderData = collectOrderData(this);
  const logisticMethod = getLogisticOption(this);

  const order = {
    ...orderData,
    products: productsData,
    logisticMethod: logisticMethod,
  };

  console.log('Полный объект заказа:', JSON.stringify(order, null, 2));
  console.log('Телефон валиден:', orderData.phoneValid);
  console.log('Очищенный телефон:', orderData.phoneClean);
});

// Инициализация маски для телефона при загрузке
document.addEventListener('DOMContentLoaded', () => {
  const phoneInput = orderForm.querySelector('input[name="phone"]');

  if (phoneInput) {
    // Маска при вводе
    phoneInput.addEventListener('input', function() {
      // Сохраняем позицию курсора
      const cursorPosition = this.selectionStart;

      applyPhoneMask(this);

      // Восстанавливаем позицию курсора после форматирования
      this.setSelectionRange(cursorPosition, cursorPosition);
      hideError(this);
    });

    // Валидация при потере фокуса
    phoneInput.addEventListener('blur', function() {
      const validation = validatePhone(this.value);
      if (!validation.isValid && this.value) {
        showError(this, validation.error);
      } else {
        hideError(this);
      }
    });

    // Автозаполнение +7 при фокусе если поле пустое
    phoneInput.addEventListener('focus', function() {
      if (!this.value) {
        this.value = '+7 ';
      }
    });
  }
});
