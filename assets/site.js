// Previews live in their own column, outside the text and link hit areas.
const preview = document.querySelector('.project-preview');
document.querySelectorAll('.project-row').forEach((row) => {
  const link = row.querySelector('.project-link');
  const show = () => {
    if (!preview) return;
    const image = row.querySelector('.mobile-project-image img').cloneNode();
    image.alt = '';
    image.loading = 'eager';
    image.sizes = '30vw';
    preview.replaceChildren(image);
    preview.dataset.project = row.dataset.project;
    row.classList.add('is-previewing');
  };
  const hide = () => {
    if (preview?.dataset.project === row.dataset.project) {
      preview.replaceChildren();
      delete preview.dataset.project;
    }
    row.classList.remove('is-previewing');
  };
  link.addEventListener('pointerenter', show);
  link.addEventListener('pointerleave', () => {
    if (document.activeElement !== link) hide();
  });
  link.addEventListener('focus', show);
  link.addEventListener('blur', hide);
});
window.addEventListener('pageshow', () => {
  preview?.replaceChildren();
  document.querySelectorAll('.is-previewing').forEach(row => row.classList.remove('is-previewing'));
});

// Keep image boxes informative while Cloudinary selects and downloads the
// appropriate responsive source. The tiny blurred image is deliberately a
// background, so it never competes with the final image in layout.
document.documentElement.classList.add('has-progressive-images');

const imageFrame = image => image.closest(
  '.archive-image, .artwork-main-image, .artwork-additional-image, .artwork-image, .mobile-project-image, .event-preview, .project-preview'
) || image.parentElement;

const beginImageLoad = image => {
  const frame = imageFrame(image);
  if (!frame) return;
  const placeholder = image.dataset.placeholder;
  frame.classList.add('image-load-frame', 'is-image-loading');
  frame.classList.remove('is-image-error');
  frame.style.setProperty('--image-position', getComputedStyle(image).objectPosition || '50% 50%');
  if (placeholder) frame.style.setProperty('--image-placeholder', `url("${placeholder.replace(/"/g, '%22')}")`);
  image.classList.remove('is-loaded');
};

const finishImageLoad = image => {
  const frame = imageFrame(image);
  image.classList.add('is-loaded');
  frame?.classList.remove('is-image-loading', 'is-image-error');
  frame?.style.removeProperty('--image-placeholder');
  frame?.style.removeProperty('--image-position');
};

const failImageLoad = image => {
  const frame = imageFrame(image);
  frame?.classList.remove('is-image-loading');
  frame?.classList.add('is-image-error');
};

document.querySelectorAll('img').forEach(image => {
  if (image.complete && image.naturalWidth > 0) {
    finishImageLoad(image);
    return;
  }
  beginImageLoad(image);
  image.addEventListener('load', () => finishImageLoad(image), { once: true });
  image.addEventListener('error', () => failImageLoad(image), { once: true });
});

// Project pages show one clear artwork view at a time, with every view —
// including the cover — available below it as a thumbnail.
document.querySelectorAll('.work-images.multiple').forEach((gallery) => {
  const links = [...gallery.querySelectorAll(':scope > .artwork-image')];
  if (links.length < 2) return;

  const mainLink = links[0];
  const mainImage = mainLink.querySelector('img');
  if (!mainImage) return;

  gallery.classList.add('is-gallery');
  mainLink.classList.add('gallery-main');

  const thumbnails = document.createElement('div');
  thumbnails.className = 'gallery-thumbnails';
  thumbnails.setAttribute('aria-label', 'Artwork views');

  links.forEach((link, index) => {
    const sourceImage = link.querySelector('img');
    if (!sourceImage) return;
    const source = Object.fromEntries(['src', 'srcset', 'width', 'height', 'alt', 'data-placeholder'].map(attribute =>
      [attribute, sourceImage.getAttribute(attribute)]
    ));
    const sourceHref = link.href;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-thumbnail';
    button.setAttribute('aria-label', `Show artwork view ${index + 1}`);
    button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');

    const thumbnailImage = sourceImage.cloneNode();
    thumbnailImage.alt = '';
    thumbnailImage.loading = 'lazy';
    thumbnailImage.sizes = '(max-width: 760px) 76px, 10vw';
    thumbnailImage.removeAttribute('fetchpriority');
    button.append(thumbnailImage);

    let preparedImage;
    const prepare = () => {
      if (preparedImage) return preparedImage;
      preparedImage = new Image();
      preparedImage.sizes = '(max-width: 760px) 90vw, 70vw';
      if (source.srcset) preparedImage.srcset = source.srcset;
      preparedImage.src = source.src;
      return preparedImage;
    };

    button.addEventListener('pointerenter', prepare, { once: true });
    button.addEventListener('focus', prepare, { once: true });
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      beginImageLoad(mainImage);
      const frame = imageFrame(mainImage);
      if (source['data-placeholder']) {
        frame?.style.setProperty('--image-placeholder', `url("${source['data-placeholder'].replace(/"/g, '%22')}")`);
      }
      thumbnails.querySelectorAll('.gallery-thumbnail').forEach(item => item.setAttribute('aria-pressed', item === button ? 'true' : 'false'));

      const replacement = prepare();
      const reveal = () => {
        ['src', 'srcset', 'width', 'height', 'alt', 'data-placeholder'].forEach(attribute => {
          const value = source[attribute];
          value === null ? mainImage.removeAttribute(attribute) : mainImage.setAttribute(attribute, value);
        });
        mainImage.sizes = '(max-width: 760px) 90vw, 70vw';
        mainImage.loading = 'eager';
        mainLink.href = sourceHref;
        mainLink.setAttribute('aria-label', link.getAttribute('aria-label') || sourceImage.alt);
        if (mainImage.complete && mainImage.naturalWidth > 0) finishImageLoad(mainImage);
        else mainImage.addEventListener('load', () => finishImageLoad(mainImage), { once: true });
      };
      replacement.complete && replacement.naturalWidth > 0
        ? reveal()
        : replacement.addEventListener('load', reveal, { once: true });
      replacement.addEventListener('error', () => failImageLoad(mainImage), { once: true });
    });

    thumbnails.append(button);
    if (index > 0) link.remove();
  });

  gallery.append(thumbnails);
});

const artworkFilters = document.querySelector('.artwork-filters');
if (artworkFilters) {
  const menus = [...artworkFilters.querySelectorAll('.filter-menu')];
  const options = [...artworkFilters.querySelectorAll('.filter-option')];
  const cards = [...document.querySelectorAll('[data-artwork-card]')];
  const availability = artworkFilters.querySelector('[data-availability-filter]');
  const activeList = artworkFilters.querySelector('.active-filter-list');
  const resultCount = artworkFilters.querySelector('[data-artwork-count]');
  const clearButton = artworkFilters.querySelector('.clear-filters');
  const selected = new Map(menus.map(menu => [menu.dataset.filterGroup, new Set()]));

  const optionFor = (group, value) => options.find(option =>
    option.closest('.filter-menu').dataset.filterGroup === group && option.dataset.filterValue === value
  );

  const loadState = () => {
    const params = new URLSearchParams(window.location.search);
    selected.forEach((values, group) => {
      (params.get(group) || '').split(',').filter(Boolean).forEach(value => {
        if (optionFor(group, value)) values.add(value);
      });
    });
    availability.checked = params.get('availability') === 'available';
  };

  const cardMatches = card => {
    // Compatibility for older untagged static cards.
    if (!card.dataset.filterReady) return true;
    for (const [group, values] of selected) {
      if (!values.size) continue;
      const cardValues = new Set((card.dataset[`filter${group[0].toUpperCase()}${group.slice(1)}`] || '').split('|').filter(Boolean));
      if (![...values].some(value => cardValues.has(value))) return false;
    }
    return !availability.checked || (card.dataset.availability || 'available') === 'available';
  };

  const updateUrl = () => {
    const params = new URLSearchParams();
    selected.forEach((values, group) => {
      if (values.size) params.set(group, [...values].join(','));
    });
    if (availability.checked) params.set('availability', 'available');
    const query = params.toString();
    history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  };

  const render = () => {
    options.forEach(option => {
      const group = option.closest('.filter-menu').dataset.filterGroup;
      option.setAttribute('aria-pressed', selected.get(group).has(option.dataset.filterValue) ? 'true' : 'false');
    });
    menus.forEach(menu => {
      const size = selected.get(menu.dataset.filterGroup).size;
      menu.querySelector('.filter-selection-count').textContent = size ? ` (${size})` : '';
    });

    activeList.replaceChildren();
    selected.forEach((values, group) => values.forEach(value => {
      const source = optionFor(group, value);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'active-filter';
      chip.textContent = `${source.textContent} ×`;
      chip.setAttribute('aria-label', `Remove ${source.textContent} filter`);
      chip.addEventListener('click', () => {
        values.delete(value);
        render();
      });
      activeList.append(chip);
    }));
    if (availability.checked) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'active-filter';
      chip.textContent = 'Available now ×';
      chip.setAttribute('aria-label', 'Remove Available now filter');
      chip.addEventListener('click', () => {
        availability.checked = false;
        render();
      });
      activeList.append(chip);
    }

    let visible = 0;
    cards.forEach(card => {
      card.hidden = !cardMatches(card);
      if (!card.hidden) visible += 1;
    });
    resultCount.textContent = `${visible} ${visible === 1 ? 'work' : 'works'}`;
    clearButton.hidden = activeList.childElementCount === 0;
    updateUrl();
  };

  options.forEach(option => option.addEventListener('click', () => {
    const group = option.closest('.filter-menu').dataset.filterGroup;
    const values = selected.get(group);
    const value = option.dataset.filterValue;
    values.has(value) ? values.delete(value) : values.add(value);
    render();
  }));
  availability.addEventListener('change', render);
  clearButton.addEventListener('click', () => {
    selected.forEach(values => values.clear());
    availability.checked = false;
    render();
  });
  menus.forEach(menu => menu.addEventListener('toggle', () => {
    if (menu.open) menus.forEach(other => { if (other !== menu) other.open = false; });
  }));
  document.addEventListener('click', event => {
    if (!artworkFilters.contains(event.target)) menus.forEach(menu => { menu.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') menus.forEach(menu => { menu.open = false; });
  });

  loadState();
  render();
}
