let currentFeature = 0;
let featureCopyAnimationTimer = null;
let featureCopyRunId = 0;

/** 离场：描述与标题两块错开（stagger）；进场：整块简单滑入 */
const FEATURE_COPY_LEAVE_STAGGER_MS = 72;
const FEATURE_COPY_SEG_LEAVE_MS = 400;
const FEATURE_COPY_LEAVE_PAD_MS = 48;
const FEATURE_COPY_ENTER_ANIM_MS = 320;

function flattenFeatureCopy(title, desc, titleText, descText) {
  title.textContent = titleText;
  desc.textContent = descText;
}

/** 平台介绍视频地址：① 进入页约 3s 自动弹窗播放 ② 主图「平台介绍」按钮打开弹窗播放（共用 #hero-intro-video） */
const HERO_INTRO_VIDEO_SRC = './asset/videos/锐竞采购平台介绍视频.mp4';

function bindHeroIntroVideoSource() {
  const video = document.getElementById('hero-intro-video');
  if (video) {
    video.src = HERO_INTRO_VIDEO_SRC;
  }
}

function buildFeatureCarousel() {
  const track = document.getElementById('feature-carousel-track');
  if (!track) {
    return;
  }

  track.innerHTML = window.features
    .map(
      feature => `
        <div class="feature-carousel-slide">
          <img src="${feature.imagePath}" alt="${feature.title}" />
        </div>
      `
    )
    .join('');
}

function animateFeatureCopy(feature, immediate = false) {
  const copy = document.getElementById('feature-copy');
  const title = document.getElementById('feature-title');
  const desc = document.getElementById('feature-desc');

  if (!copy || !title || !desc) {
    return;
  }

  if (featureCopyAnimationTimer) {
    clearTimeout(featureCopyAnimationTimer);
    featureCopyAnimationTimer = null;
  }

  if (immediate) {
    copy.classList.remove('is-leaving', 'is-entering', 'is-leaving-blocks');
    flattenFeatureCopy(title, desc, feature.title, feature.desc);
    return;
  }

  copy.classList.remove('is-entering', 'is-leaving', 'is-leaving-blocks');
  featureCopyRunId += 1;
  const runId = featureCopyRunId;

  void title.offsetHeight;
  copy.classList.add('is-leaving-blocks');

  const leaveEnd =
    FEATURE_COPY_SEG_LEAVE_MS + FEATURE_COPY_LEAVE_STAGGER_MS + FEATURE_COPY_LEAVE_PAD_MS;

  featureCopyAnimationTimer = setTimeout(() => {
    if (runId !== featureCopyRunId) {
      return;
    }

    copy.classList.remove('is-leaving-blocks');
    flattenFeatureCopy(title, desc, feature.title, feature.desc);
    copy.classList.remove('is-entering');
    requestAnimationFrame(() => {
      if (runId !== featureCopyRunId) {
        return;
      }
      copy.classList.add('is-entering');
      requestAnimationFrame(() => {
        featureCopyAnimationTimer = setTimeout(() => {
          featureCopyAnimationTimer = null;
          if (runId !== featureCopyRunId) {
            return;
          }
          copy.classList.remove('is-entering');
        }, FEATURE_COPY_ENTER_ANIM_MS);
      });
    });
  }, leaveEnd);
}

function updateFeature(index, options = {}) {
  const { immediate = false } = options;
  currentFeature = index;
  const feature = window.features[index];

  animateFeatureCopy(feature, immediate);

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

  updateFeatureCarousel(index, immediate);
}

function updateFeatureCarousel(index, immediate = false) {
  const track = document.getElementById('feature-carousel-track');
  if (!track) {
    return;
  }

  if (immediate) {
    const previousTransition = track.style.transition;
    track.style.transition = 'none';
    track.style.transform = `translateX(-${index * 100}%)`;
    track.offsetHeight;
    track.style.transition = previousTransition || '';
    return;
  }

  track.style.transform = `translateX(-${index * 100}%)`;
}

function switchFloatPanel(panelName) {
  const managerPanel = document.getElementById('manager-form-content');
  const buyerPanel = document.getElementById('buyer-panel-content');
  const successPanel = document.getElementById('success-panel-content');
  const phoneConsultPanel = document.getElementById('phone-consult-panel-content');
  const mainPanel = document.getElementById('main-panel');
  const floatingWindow = document.querySelector('.floating-window');

  mainPanel.style.display = 'block';
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

function openHeroIntroVideoModal() {
  const modal = document.getElementById('hero-video-modal');
  const video = document.getElementById('hero-intro-video');
  if (!modal) {
    return;
  }
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (!video) {
    return;
  }

  const playWithAutoplayPolicyFallback = () => {
    video.muted = false;
    const attempt = video.play();
    if (attempt === undefined) {
      return;
    }
    return attempt.catch(() => {
      video.muted = true;
      return video.play();
    }).catch(() => {});
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(playWithAutoplayPolicyFallback);
  });
}

function closeHeroIntroVideoModal() {
  const modal = document.getElementById('hero-video-modal');
  const video = document.getElementById('hero-intro-video');
  if (!modal) {
    return;
  }
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (video) {
    video.pause();
    video.currentTime = 0;
    video.muted = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bindHeroIntroVideoSource();
  buildFeatureCarousel();

  const supplierRows = document.querySelectorAll('#supplier-section .supplier-brand-row');
  if (supplierRows.length && 'IntersectionObserver' in window) {
    supplierRows.forEach(row => row.classList.add('supplier-brand-row--scroll-reveal'));

    const rowObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-row-visible');
            return;
          }
          const rect = entry.boundingClientRect;
          const vh = window.innerHeight || document.documentElement.clientHeight;
          const vw = window.innerWidth || document.documentElement.clientWidth;
          if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
            entry.target.classList.remove('is-row-visible');
          }
        });
      },
      { threshold: 0, rootMargin: '0px' }
    );

    supplierRows.forEach(row => rowObserver.observe(row));
  }

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
  const floatForm = document.getElementById('float-form');
  const floatName = document.getElementById('float-name');
  const floatPhone = document.getElementById('float-phone');
  const floatCompany = document.getElementById('float-company');
  const mainPanel = document.getElementById('main-panel');
  const floatingWindow = document.querySelector('.floating-window');

  floatCloseBtn.addEventListener('click', () => {
    mainPanel.style.display = 'none';
    floatingWindow?.classList.remove('phone-consult-active');
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

  const heroPlatformIntroBtn = document.getElementById('hero-platform-intro-btn');
  const heroVideoModal = document.getElementById('hero-video-modal');
  const heroVideoModalClose = document.getElementById('hero-video-modal-close');

  heroPlatformIntroBtn?.addEventListener('click', () => {
    openHeroIntroVideoModal();
  });

  heroVideoModalClose?.addEventListener('click', () => {
    closeHeroIntroVideoModal();
  });

  heroVideoModal?.addEventListener('click', e => {
    if (e.target === heroVideoModal) {
      closeHeroIntroVideoModal();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') {
      return;
    }
    if (document.getElementById('hero-video-modal')?.classList.contains('show')) {
      closeHeroIntroVideoModal();
    }
  });

  const heroIntroAutoOpenDelayMs = 3000;
  setTimeout(() => {
    const modal = document.getElementById('hero-video-modal');
    if (!modal || modal.classList.contains('show')) {
      return;
    }
    openHeroIntroVideoModal();
  }, heroIntroAutoOpenDelayMs);

  updateFeature(0, { immediate: true });
  switchFloatPanel('manager');
});
