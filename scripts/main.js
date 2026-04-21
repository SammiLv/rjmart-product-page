let currentFeature = 0;

function updateFeature(index) {
  currentFeature = index;
  const feature = window.features[index];

  document.getElementById('feature-title').textContent = feature.title;
  document.getElementById('feature-desc').textContent = feature.desc;

  document.querySelectorAll('.feature-tab').forEach((tab, i) => {
    if (i === index) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (index === 0) {
    prevBtn.classList.add('disabled');
  } else {
    prevBtn.classList.remove('disabled');
  }

  if (index === window.features.length - 1) {
    nextBtn.classList.add('disabled');
  } else {
    nextBtn.classList.remove('disabled');
  }

  loadFeatureImage(feature.imagePath, feature.title);
}

function loadFeatureImage(imagePath, title) {
  const imageContainer = document.getElementById('feature-image');
  imageContainer.innerHTML = `<img src="${imagePath}" alt="${title}" />`;
}

function switchFloatPanel(panelName) {
  const managerPanel = document.getElementById('manager-form-content');
  const buyerPanel = document.getElementById('buyer-panel-content');
  const successPanel = document.getElementById('success-panel-content');
  const phoneConsultPanel = document.getElementById('phone-consult-panel-content');
  const mainPanel = document.getElementById('main-panel');
  const floatingWindow = document.querySelector('.floating-window');

  managerPanel.style.display = 'none';
  buyerPanel.classList.remove('active');
  successPanel.classList.remove('active');
  phoneConsultPanel.classList.remove('active');
  floatingWindow.classList.remove('phone-consult-active');

  if (panelName === 'phone-consult') {
    mainPanel.style.width = '202px';
    mainPanel.style.height = '108px';
    phoneConsultPanel.classList.add('active');
    floatingWindow.classList.add('phone-consult-active');
  } else {
    mainPanel.style.width = '320px';
    mainPanel.style.height = '486px';

    if (panelName === 'manager') {
      managerPanel.style.display = 'flex';
    } else if (panelName === 'buyer') {
      buyerPanel.classList.add('active');
    } else if (panelName === 'success') {
      successPanel.classList.add('active');
    }
  }
}

function validatePhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

function showError(input) {
  input.classList.add('error');
}

function hideError(input) {
  input.classList.remove('error');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.feature-tab').forEach((tab, index) => {
    tab.addEventListener('click', () => {
      updateFeature(index);
    });
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentFeature > 0) {
      updateFeature(currentFeature - 1);
    }
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentFeature < window.features.length - 1) {
      updateFeature(currentFeature + 1);
    }
  });

  window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#' && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const headerHeight = 78;
          const targetPosition = target.offsetTop - headerHeight;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  document.querySelectorAll('.float-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabType = tab.getAttribute('data-tab');

      if (tabType === 'buyer') {
        switchFloatPanel('buyer');
      } else if (tabType === 'manager' || tabType === 'manager-back') {
        switchFloatPanel('manager');
      }
    });
  });

  const buyerRegisterBtn = document.getElementById('buyer-register-btn');
  if (buyerRegisterBtn) {
    buyerRegisterBtn.addEventListener('click', () => {
      window.open('https://www.rjmart.cn/signup?registerType=2', '_blank');
    });
  }

  const floatCloseBtn = document.getElementById('float-close-btn');
  const floatingWindow = document.querySelector('.floating-window');
  const floatForm = document.getElementById('float-form');
  const floatName = document.getElementById('float-name');
  const floatPhone = document.getElementById('float-phone');
  const floatCompany = document.getElementById('float-company');

  floatCloseBtn.addEventListener('click', () => {
    floatingWindow.style.display = 'none';
  });

  floatName.addEventListener('input', () => {
    if (floatName.value.trim()) {
      hideError(floatName);
    }
  });

  floatPhone.addEventListener('input', () => {
    if (validatePhone(floatPhone.value.trim())) {
      hideError(floatPhone);
    }
  });

  floatCompany.addEventListener('input', () => {
    if (floatCompany.value.trim()) {
      hideError(floatCompany);
    }
  });

  floatForm.addEventListener('submit', e => {
    e.preventDefault();

    let isValid = true;

    if (!floatName.value.trim()) {
      showError(floatName);
      isValid = false;
    } else {
      hideError(floatName);
    }

    if (!validatePhone(floatPhone.value.trim())) {
      showError(floatPhone);
      isValid = false;
    } else {
      hideError(floatPhone);
    }

    if (!floatCompany.value.trim()) {
      showError(floatCompany);
      isValid = false;
    } else {
      hideError(floatCompany);
    }

    if (isValid) {
      switchFloatPanel('success');
      floatForm.reset();
    }
  });

  document.getElementById('trial-btn').addEventListener('click', () => {
    switchFloatPanel('manager');
    setTimeout(() => {
      floatName.focus();
    }, 100);
  });

  document.getElementById('phone-consult-btn').addEventListener('click', () => {
    switchFloatPanel('phone-consult');
  });

  updateFeature(0);
  switchFloatPanel('manager');
});
