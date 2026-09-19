/* Render the selected trusted workshop catalog before app.js binds its forms. */
(function () {
  'use strict';
  const workshop = window.SCOPE_WORKSHOP;
  if (!workshop) return;
  const $ = (selector) => document.querySelector(selector);
  const text = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };
  const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const isDna = workshop.slug === 'dna-discovery-lab';
  const iconPaths = {
    'yeast-balloon-lab': '<ellipse cx="60" cy="35" rx="23" ry="28"/><path d="m56 62-3 8h14l-3-8M60 70v13M41 83h38v29H41zM48 83v-9h24v9"/><path d="M48 101h24M51 92h.1M68 96h.1M60 105h.1"/>',
    'human-engine-lab': '<path d="M60 105 20 67C-10 35 31 1 60 33c29-32 70 2 40 34Z"/><path d="M15 64h23l9-17 14 34 11-24 7 7h26"/>',
    'bubbling-leaves-lab': '<path d="M27 88C4 49 44 14 105 12c0 62-33 100-78 76ZM20 106 83 36M41 85V56M58 69h26"/><circle cx="17" cy="26" r="8"/><circle cx="19" cy="52" r="4"/>',
    'bird-beak-lab': '<path d="M21 104V73a39 39 0 0 1 78 0v20H61l-19 17M99 70l17 10-17 8M23 74l-17 9 17 7"/><circle cx="77" cy="56" r="3"/><path d="M42 82c7-13 20-16 28-10M45 105h22"/>'
  };
  const icon = (slug, className) => `<svg class="${className || ''}" aria-hidden="true" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${iconPaths[slug] || ''}</svg>`;
  document.title = `Scope: ${workshop.title}`;
  document.body.dataset.workshop = workshop.slug;
  $('meta[name="description"]').content = `Scope: ${workshop.title}. ${workshop.welcome}`;
  text('.quest-brand__lab', workshop.title);
  text('.welcome-lede', workshop.welcome);
  text('[data-workshop-meta]', `${workshop.grades} · ${workshop.duration} · Hands-on workshop`);
  $('#choose-workshop').innerHTML = Object.values(window.SCOPE_WORKSHOPS).map((item) => `<option value="${escape(item.slug)}"${item.slug === workshop.slug ? ' selected' : ''}>${escape(item.title)}</option>`).join('');
  $('[data-organizer-link]').href = `admin/?lab=${encodeURIComponent(workshop.slug)}`;
  if (!isDna) {
    text('.welcome-copy h1', workshop.title);
    $('.welcome-copy h1').classList.add('module-welcome-title');
    $('.dna-hero-art').classList.add('module-hero-art');
    $('.dna-hero-art').innerHTML = `<span class="dna-hero-art__label">${escape(workshop.heroLabel)}</span><div class="module-hero-symbol">${icon(workshop.slug, 'module-hero-icon')}<span class="module-hero-orbit" aria-hidden="true"></span></div><ol class="hero-path">${workshop.heroPath.map((label) => `<li><span>${escape(label)}</span></li>`).join('')}</ol>`;
    $('.dna-badge__ring svg').outerHTML = icon(workshop.slug);
  }

  text('#screen-introduction .step-label', workshop.introLabel);
  text('#screen-introduction h1', workshop.introTitle);
  text('#screen-introduction .screen-heading > p:last-child', workshop.introSummary);
  if (isDna) {
    document.querySelectorAll('.dna-zoom article').forEach((article, index) => {
      article.querySelector('h2').textContent = workshop.introFlow[index][0];
      article.querySelector('p').textContent = workshop.introFlow[index][1];
    });
  } else {
    $('.dna-zoom').setAttribute('aria-label', `Key ideas in ${workshop.title}`);
    $('.dna-zoom').classList.add('module-concept-flow');
    $('.dna-zoom').innerHTML = workshop.introFlow.map(([title, detail], index) => `${index ? '<span class="zoom-connector" aria-hidden="true"></span>' : ''}<article><span class="concept-number" aria-hidden="true">0${index + 1}</span><div><h2>${escape(title)}</h2><p>${escape(detail)}</p></div></article>`).join('');
  }
  $('#screen-introduction .learning-grid').innerHTML = workshop.concepts.map(([title, detail], index) => `<article class="learning-card${index === 0 ? ' learning-card--wide' : ''}"><h2>${escape(title)}</h2><p>${escape(detail)}</p></article>`).join('');
  $('.dna-uses').innerHTML = `<div class="section-subheading"><h2 id="dna-uses-title">${escape(workshop.usesTitle)}</h2><p>Open each example to learn more.</p></div>${workshop.uses.map(([title, detail, explanation]) => `<details><summary><span class="use-icon" aria-hidden="true">+</span><span><strong>${escape(title)}</strong><small>${escape(detail)}</small></span></summary><p>${escape(explanation)}</p></details>`).join('')}`;
  text('#confidence-before-form legend', `Right now, how ready do you feel to explain ${workshop.confidenceTopic}?`);
  text('#reflection-form .concept-pulse legend', `Now, how ready do you feel to explain ${workshop.confidenceTopic}?`);

  text('#screen-prediction h1', workshop.predictionQuestion);
  text('#prediction-form legend', workshop.predictionQuestion);
  $('#prediction-form .choice-grid').innerHTML = workshop.predictions.map((item) => `<label class="choice-card"><input type="radio" name="prediction" value="${escape(item.id)}" required /><span class="choice-card__mark" aria-hidden="true"></span><span><strong>${escape(item.label)}</strong><small>${escape(item.detail)}</small></span></label>`).join('');
  $('[data-chart="predictions"]').innerHTML = workshop.predictions.map((item) => `<div data-option="${escape(item.id)}"><span>${escape(item.label)}</span><i><b style="--bar-value: 0%"></b></i><strong>0%</strong></div>`).join('');
  text('#prediction-results .chart-note', 'After the experiment, compare your prediction with your evidence and the science behind it.');

  text('#screen-lab-guide h1', workshop.guideTitle);
  $('#screen-lab-guide .safety-note p').innerHTML = `<strong>Pause and follow your presenter.</strong> ${escape(workshop.safety)}`;
  const overview = document.createElement('details');
  overview.className = 'workshop-overview';
  overview.innerHTML = `<summary>Materials and lesson overview</summary><p><strong>${escape(workshop.grades)} · ${escape(workshop.duration)}</strong></p><p>${escape(workshop.materials)}</p><p class="field-hint">A presenter leads the introduction, hands-on experiment, and reflection. <a href="https://docs.google.com/document/d/1Xjb3_ISZh8sjFmNIQ8zUPuZOZ-9kIf13BCRz58v1Pfw/edit" target="_blank" rel="noopener noreferrer">View the workshop lesson plan</a>.</p>`;
  $('#screen-lab-guide .safety-note').before(overview);
  $('[data-lab-step-list]').innerHTML = workshop.steps.map((item, index) => `<li><article class="lab-step${index === 0 ? ' is-current' : ''}" data-lab-step="${index + 1}"><div class="lab-step__number"><span>${index + 1}</span><small>of ${workshop.steps.length}</small></div><div class="lab-step__content"><p class="lab-step__verb">${escape(item.verb)}</p><h2>${escape(item.title)}</h2><p class="lab-step__instruction">${escape(item.instruction)}</p><div class="why-card"><strong>Why this matters</strong><span>${escape(item.why)}</span></div><label class="step-note" for="step-note-${index + 1}">Optional observation</label><textarea id="step-note-${index + 1}" name="step_note_${index + 1}" rows="2" maxlength="240" placeholder="${escape(item.note)}"></textarea><button class="checkpoint-button" type="button" data-action="complete-lab-step" data-step="${index + 1}" aria-pressed="false"><span class="checkpoint-button__icon" aria-hidden="true">✓</span><span>Mark step complete</span></button></div></article></li>`).join('');

  const measurements = workshop.measurements;
  if (measurements.fields.length) {
    const fields = new Map(measurements.fields.map((item) => [item.key, item]));
    const input = (key) => {
      const item = fields.get(key);
      const shared = `id="measurement-${escape(key)}" name="measurement_${escape(key)}" data-measurement="${escape(key)}" aria-label="${escape(item.label)}" aria-describedby="measurements-hint"`;
      if (item.type === 'select') return `<select ${shared}><option value="">Choose tool</option>${item.options.map((option) => `<option value="${escape(option)}">${escape(option)}</option>`).join('')}</select>`;
      if (item.type === 'text') return `<input ${shared} type="text" maxlength="${item.maxlength || 80}" autocomplete="off" />`;
      return `<input ${shared} type="number" min="${item.min}" max="${item.max}" step="${item.step}" inputmode="${item.step === 1 ? 'numeric' : 'decimal'}" />`;
    };
    const panel = document.createElement('section');
    panel.className = 'measurement-panel';
    panel.setAttribute('aria-labelledby', 'measurements-title');
    panel.innerHTML = `<h2 id="measurements-title">${escape(measurements.title)}</h2><p id="measurements-hint">${escape(measurements.description)}</p>${measurements.rows ? `<div class="measurement-table-wrap" role="region" aria-label="${escape(measurements.title)}" tabindex="0"><table class="measurement-table"><thead><tr>${measurements.columns.map((column) => `<th scope="col">${escape(column)}</th>`).join('')}</tr></thead><tbody>${measurements.rows.map((row) => `<tr><th scope="row">${escape(row.label)}</th>${row.keys.map((key) => `<td>${input(key)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<div class="measurement-fields">${measurements.fields.map((item) => `<div class="field-group"><label for="measurement-${escape(item.key)}">${escape(item.label)}</label>${input(item.key)}</div>`).join('')}</div>`}<p class="field-hint">Measurements save with your lab notes. Leave unmeasured fields blank; enter 0 only when you measured zero.</p><p class="field-error" data-measurement-error role="alert"></p>`;
    $('[data-lab-step-list]').after(panel);
  }

  text('#observation-form .choice-fieldset legend', workshop.observationQuestion);
  text('#observation-hint', workshop.observationHint);
  $('#observation-form .observation-tags > div').innerHTML = workshop.observationTags.map((item) => `<label><input type="checkbox" name="observation_tags" value="${escape(item.id)}" /><span>${escape(item.label)}</span></label>`).join('');
  text('.photo-field > div > p', 'Photograph the experiment or equipment only, without people, names, or identifying details. The photo stays as a preview on this device and is not added to the class report.');
  text('#analysis-check-form legend', `Quick check: ${workshop.postCheckQuestion}`);
  text('[data-answer-explanation]', workshop.correctExplanation);
  $('#analysis-check-form .compact-choices').innerHTML = workshop.postCheckOptions.map((item) => `<label><input type="radio" name="analysis_answer" value="${escape(item.id)}" required /><span>${escape(item.label)}</span></label>`).join('');
  text('.metric-card--teal > span', workshop.successLabel);
  text('.metric-card--teal > small', workshop.successDetail);
  text('[data-chart="understanding"] > div:first-child small', workshop.predictionMetric);
  text('[data-chart="understanding"] > div:last-child small', workshop.conceptMetric);
  text('#analysis-results .result-panel:not(.result-panel--observation) h2', 'Predictions and understanding');

  $('#reflection-form .reflection-list').innerHTML = workshop.reflections.map((item) => `<li class="field-group"><label for="reflection-${escape(item.id)}">${escape(item.question)}</label><textarea id="reflection-${escape(item.id)}" name="reflection_${escape(item.id)}" rows="3" maxlength="500" placeholder="Use your observations to explain your thinking." aria-describedby="reflection-${escape(item.id)}-error" required></textarea><p class="field-error" id="reflection-${escape(item.id)}-error" data-error-for="reflection-${escape(item.id)}" aria-live="polite"></p></li>`).join('');
  text('.badge-copy h1', `Congratulations! You completed ${workshop.title === 'The Human Engine' ? '' : 'the '}${workshop.title}.`);
  text('.dna-badge h2', workshop.badgeTitle);
  text('[data-badge-name]', workshop.badgeTitle);
}());
