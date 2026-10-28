const form = document.querySelector("#admissionForm");
const sections = [...document.querySelectorAll(".form-section")];
const nextBtn = document.querySelector("#nextBtn");
const backBtn = document.querySelector("#backBtn");
const submitBtn = document.querySelector("#submitBtn");
const progressBar = document.querySelector("#progressBar");
const stepCaption = document.querySelector("#stepCaption");
const progressPercent = document.querySelector("#progressPercent");
const statusMessage = document.querySelector("#statusMessage");
const uploadList = document.querySelector("#uploadList");
const missingSummary = document.querySelector("#missingSummary");
const overallProgress = document.querySelector("#overallProgress");
const overallPercent = document.querySelector("#overallPercent");
const overallMessage = document.querySelector("#overallMessage");
let currentStep = 1;
let sending = false;
let cadastroId = null;
let sessionPromise = null;
const uploadedKeys = new Set();
const uploadingKeys = new Set();
const driveDocuments = new Map();
let lastAutoLookupCpf = "";
let lookupInProgress = false;
const processingOverlay = document.querySelector('#processingOverlay');
const processingMessage = document.querySelector('#processingMessage');
let processingCount = 0;
function iniciarProcessamento(mensagem = 'Estamos concluindo esta etapa. Não feche ou atualize a página.') {
  processingCount += 1;
  if (processingMessage) processingMessage.textContent = mensagem;
  if (processingOverlay) processingOverlay.hidden = false;
}
function finalizarProcessamento() {
  processingCount = Math.max(0, processingCount - 1);
  if (processingCount === 0 && processingOverlay) processingOverlay.hidden = true;
}
function atualizarLoadingUploads() {
  // A confirmação geral dos arquivos ocorre apenas no mini carregamento
  // ao lado de cada documento ou na ação final de conclusão.
}
const dependentData = new Map();
const dependentCountField = document.querySelector('#quantidadeFilhos');
const childrenFields = document.querySelector('#childrenFields');
const today = new Date();
const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
const pathSegments = window.location.pathname.split('/').filter(Boolean);
const lastPathSegment = pathSegments.pop()?.toLowerCase();
const requestedCompanySlug = lastPathSegment === 'index.html' ? pathSegments.pop()?.toLowerCase() : lastPathSegment;
const companySlug = window.APP_CONFIG?.COMPANIES?.[requestedCompanySlug]
  ? requestedCompanySlug
  : window.APP_CONFIG?.DEFAULT_COMPANY;
const company = window.APP_CONFIG?.COMPANIES?.[companySlug];

function applyCompanyBranding() {
  const logo = document.querySelector('.brand-logo');
  const siteLink = document.querySelector('.site-header a');
  const footer = document.querySelector('footer');
  if (!company) throw new Error('A empresa deste link não está configurada.');
  document.body.dataset.company = companySlug;
  if (logo) {
    logo.src = company.mark || company.logo || window.APP_CONFIG.FALLBACK_LOGO_URL;
    logo.alt = company.name;
    if (company.mark) {
      logo.classList.add('brand-mark');
      const brandName = document.createElement('span');
      brandName.className = 'brand-name';
      brandName.textContent = company.displayName || company.name;
      logo.parentElement.appendChild(brandName);
    }
    logo.addEventListener('error', () => {
      logo.src = window.APP_CONFIG.FALLBACK_LOGO_URL;
      logo.classList.remove('brand-mark');
      logo.parentElement.querySelector('.brand-name')?.remove();
    }, {once:true});
  }
  if (siteLink) siteLink.href = company.website;
  if (footer) footer.textContent = `${company.name} · Cuidar e zelar do seu patrimônio.`;
  document.title = `Cadastro Admissional | ${company.name}`;
  if (company.stylesheet) {
    const companyStyles = document.createElement('link');
    companyStyles.rel = 'stylesheet';
    companyStyles.href = company.stylesheet;
    companyStyles.dataset.companyStyles = companySlug;
    document.head.appendChild(companyStyles);
  }
}
applyCompanyBranding();

function configurarAjudaConclusao() {
  const mapButton = document.querySelector('#completionMapButton');
  const whatsappButton = document.querySelector('#completionWhatsappButton');
  const mapUrl = company.mapUrl || 'https://www.google.com/maps/dir/?api=1&destination=Rua+Myltho+Anselmo+da+Silva,+1497,+Curitiba,+PR';
  const whatsapp = company.whatsapp || '5541995890097';
  if (mapButton) {
    mapButton.addEventListener('click', () => window.open(mapUrl, '_blank', 'noopener,noreferrer'));
  }
  if (whatsappButton) {
    const nome = String(form.elements.nome?.value || '').trim();
    const message = nome ? `Oi, sou ${nome} e preciso de ajuda com o cadastro admissional da ${company.name}.` : `Olá, preciso de ajuda com o cadastro admissional da ${company.name}.`;
    whatsappButton.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
  }
}
configurarAjudaConclusao();

const completionDialog = document.querySelector('#completionDialog');
const completionCountdown = document.querySelector('#completionCountdown');
let completionTimer = null;

function companyHomeUrl() {
  const slugMarker = `/${companySlug}/`;
  const index = window.location.pathname.lastIndexOf(slugMarker);
  if (index >= 0) return `${window.location.origin}${window.location.pathname.substring(0, index + 1)}${companySlug}/`;
  return `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}`;
}

function voltarParaHomeDaEmpresa() {
  if (completionTimer) clearInterval(completionTimer);
  window.location.href = companyHomeUrl();
}

function mostrarConclusao() {
  let segundos = 30;
  if (completionCountdown) completionCountdown.textContent = String(segundos);
  if (typeof completionDialog?.showModal === 'function' && !completionDialog.open) completionDialog.showModal();
  completionTimer = setInterval(() => {
    segundos -= 1;
    if (completionCountdown) completionCountdown.textContent = String(Math.max(segundos, 0));
    if (segundos <= 0) voltarParaHomeDaEmpresa();
  }, 1000);
}

const returnToCompanyHome = document.querySelector('#returnToCompanyHome');
returnToCompanyHome?.addEventListener('click', voltarParaHomeDaEmpresa);

const contactsList = document.querySelector('#contactsList');
const INACTIVITY_MS = 10 * 60 * 1000;
let inactivityTimer = null;
function resetInactivityTimer() {
  if (completionDialog?.open) return;
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(voltarParaHomeDaEmpresa, INACTIVITY_MS);
}
['pointerdown', 'keydown', 'touchstart', 'scroll', 'change', 'input'].forEach(eventName => {
  window.addEventListener(eventName, resetInactivityTimer, {passive: true});
});
resetInactivityTimer();

let contactCount = 1;
document.addEventListener('focusout', event => {
  const field = event.target;
  if (!field.matches('[data-contact-number], [data-contact-name]')) return;
  const card = field.closest('.contact-card');
  if (!card) return;
  const number = card.querySelector('[data-contact-number]');
  const name = card.querySelector('[data-contact-name]');
  if (number.value.trim() && !name.value.trim()) {
    name.setCustomValidity('Informe o nome da pessoa associada a este telefone.');
    showStatus('Faltou informar o nome do contato associado ao telefone. Confira o campo destacado.', true);
    name.scrollIntoView({behavior: 'smooth', block: 'center'});
    name.focus({preventScroll: true});
    name.reportValidity();
  } else if (!number.value.trim() && name.value.trim()) {
    number.setCustomValidity('Informe o número de contato.');
    showStatus('Faltou informar o número do contato. Confira o campo destacado.', true);
    number.scrollIntoView({behavior: 'smooth', block: 'center'});
    number.focus({preventScroll: true});
    number.reportValidity();
  } else {
    number.setCustomValidity('');
    name.setCustomValidity('');
  }
});

function contactMethodMarkup(index, method, label, iconPath) {
  return `<label><input type="checkbox" name="contato_${index}_${method}" data-contact-method value="true"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${iconPath}"/></svg> ${label}</span></label>`;
}
function addContactCard(contact = {}) {
  const index = contactCount + 1;
  const card = document.createElement('fieldset');
  card.className = 'contact-card';
  card.dataset.contactIndex = String(index);
  card.innerHTML = `<legend>Número adicional ${index - 1}</legend>
    <div class="contact-fields">
      <label>Número de contato ${index} *<input name="contato_${index}_numero" type="tel" data-contact-number required maxlength="16" placeholder="(41) 99999-9999"></label>
      <label>Nome do contato *<input name="contato_${index}_nome" data-contact-name required maxlength="120" placeholder="Nome da pessoa associada ao número"></label>
    </div>
    <div class="contact-methods" aria-label="Formas de contato disponíveis para este número">
      ${contactMethodMarkup(index, 'whatsapp', 'WhatsApp', 'M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.2 1.6 6L0 24l6.4-1.7a11.8 11.8 0 0 0 5.7 1.5h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.2-3.5-8.5ZM12.1 21.8c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 1 1 8.5 4.7Zm5.4-7.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2s-.8.9-1 1.1c-.2.2-.4.2-.7.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6.2-.5c.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3.1 4.9 4.3.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3s-.2-.2-.5-.4Z')}
      ${contactMethodMarkup(index, 'ligacao', 'Ligação', 'M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.56 3.57.56a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.56 3.57a1 1 0 0 1-.25 1.02l-2.19 2.2Z')}
      ${contactMethodMarkup(index, 'sms', 'Mensagem de texto', 'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM7 11h10v2H7Zm0-4h10v2H7Z')}
    </div>
    <button type="button" class="text-button remove-contact" data-remove-contact aria-label="Remover número adicional ${index - 1}">Remover este número</button>`;
  contactsList.appendChild(card);
  card.querySelector(`[name="contato_${index}_numero"]`).value = contact.numero || '';
  card.querySelector(`[name="contato_${index}_nome"]`).value = contact.nome || '';
  ['whatsapp', 'ligacao', 'sms'].forEach(method => {
    card.querySelector(`[name="contato_${index}_${method}"]`).checked = contact[method] === true || String(contact[method]) === 'true';
  });
  contactCount = index;
  return card;
}
function contactsFromSavedData(data) {
  if (Array.isArray(data.contatos) && data.contatos.length) return data.contatos;
  const contacts = [];
  for (let index = 1; data[`contato_${index}_numero`] || data[`contato_${index}_nome`]; index++) {
    contacts.push({
      numero: data[`contato_${index}_numero`] || '',
      nome: data[`contato_${index}_nome`] || '',
      whatsapp: data[`contato_${index}_whatsapp`] === true || String(data[`contato_${index}_whatsapp`]) === 'true',
      ligacao: data[`contato_${index}_ligacao`] === true || String(data[`contato_${index}_ligacao`]) === 'true',
      sms: data[`contato_${index}_sms`] === true || String(data[`contato_${index}_sms`]) === 'true'
    });
  }
  if (contacts.length) return contacts;
  const legacy = [];
  if (data.celular || data.contatoCelular1) legacy.push({numero:data.celular || '', nome:data.contatoCelular1 || data.nome || ''});
  if (data.celular2 || data.contatoCelular2) legacy.push({numero:data.celular2 || '', nome:data.contatoCelular2 || ''});
  return legacy.length ? legacy : [{numero:'', nome:data.nome || ''}];
}
function renderContacts(contacts = [{numero:'', nome:''}]) {
  const firstTemplate = contactsList.querySelector('.contact-card').cloneNode(true);
  contactsList.innerHTML = '';
  contactCount = 1;
  const primary = contacts[0] || {};
  contactsList.appendChild(firstTemplate);
  const first = firstTemplate;
  first.querySelector('[name="contato_1_numero"]').value = primary.numero || '';
  first.querySelector('[name="contato_1_nome"]').value = primary.nome || '';
  ['whatsapp', 'ligacao', 'sms'].forEach(method => {
    first.querySelector(`[name="contato_1_${method}"]`).checked = primary[method] === true || String(primary[method]) === 'true';
  });
  first.querySelectorAll('[data-contact-number]').forEach(field => formatContactNumber({target:field}));
  contacts.slice(1).forEach(contact => {
    const card = addContactCard(contact);
    card.querySelectorAll('[data-contact-number]').forEach(field => formatContactNumber({target:field}));
  });
}
document.querySelector('#addContact').addEventListener('click', () => {
  const card = addContactCard();
  card.querySelector('[data-contact-number]').focus();
});
contactsList.addEventListener('click', event => {
  const removeButton = event.target.closest('[data-remove-contact]');
  if (!removeButton) return;
  removeButton.closest('.contact-card').remove();
  const cards = [...contactsList.querySelectorAll('.contact-card')];
  contactCount = cards.length;
  cards.forEach((card, index) => {
    const number = index + 1;
    card.dataset.contactIndex = String(number);
    card.querySelector('legend').textContent = number === 1 ? 'Número principal' : `Número adicional ${number - 1}`;
    card.querySelectorAll('input').forEach(input => {
      input.name = input.name.replace(/contato_\d+_/, `contato_${number}_`);
    });
    const title = card.querySelector('[data-contact-number]').closest('label');
    title.firstChild.textContent = `Número de contato ${number} *`;
  });
  updateSubmitVisibility();
});

function formatarDataDigitada(input) {
  let digits = String(input.value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) digits = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
  else if (digits.length > 2) digits = digits.slice(0, 2) + '/' + digits.slice(2);
  input.value = digits;
}
function dataBrasileiraValida(value) {
  const m = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}
function validarDataAdmissao(input, reportar = false) {
  if (!input.value) {
    input.setCustomValidity('Informe a data de admissão programada pelo RH.');
    return false;
  }
  if (!dataBrasileiraValida(input.value)) {
    input.setCustomValidity('Informe uma data válida no formato dd/mm/aaaa.');
    return false;
  }
  const [dia, mes, ano] = input.value.split('/').map(Number);
  const selecionada = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  if (selecionada <= todayIso) {
    input.setCustomValidity('Data incorreta. Verifique com o RH a data correta da admissão.');
    return false;
  }
  input.setCustomValidity('');
  return true;
}
function idadeEmAnos(value) {
  if (!dataBrasileiraValida(value)) return null;
  const [day, month, year] = value.split('/').map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  return age;
}
function isoParaDataBrasileira(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}
function sincronizarCalendario(input) {
  const picker = input.parentElement.querySelector('.date-picker');
  const date = String(input.value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (picker) picker.value = date ? `${date[3]}-${date[2]}-${date[1]}` : '';
}
function adicionarCalendario(input) {
  const picker = input.parentElement.querySelector('.date-picker');
  if (!input.matches('.birth-date, .admission-date') || !picker || picker === input) return;
  if (input.matches('.birth-date')) picker.max = todayIso;
  else picker.min = tomorrowIso;
  sincronizarCalendario(input);
  input.parentElement.querySelector('.calendar-button')?.addEventListener('click', () => {
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  });
  picker.addEventListener('change', () => {
    input.value = isoParaDataBrasileira(picker.value);
    input.dispatchEvent(new Event('input', {bubbles:true}));
    input.dispatchEvent(new Event('change', {bubbles:true}));
  });
}
document.querySelectorAll('.birth-date, .admission-date').forEach(adicionarCalendario);
document.addEventListener('input', event => {
  if (event.target.matches('.birth-date, .admission-date')) {
    formatarDataDigitada(event.target);
    if (event.target.matches('.admission-date')) validarDataAdmissao(event.target, false);
    else event.target.setCustomValidity('');
    sincronizarCalendario(event.target);
  }
  if (event.target.matches('[data-dependent-cpf]')) {
    formatCpfField(event.target);
    validarCpfDependente(event.target);
  }
  if (event.target.matches('[data-dependent-birth]')) validateDependentBirth(event.target, false);
  if (event.target.matches('#cpf')) {
    childrenFields.querySelectorAll('[data-dependent-cpf]').forEach(validarCpfDependente);
  }
});
document.addEventListener('blur', event => {
  if (event.target.matches('.birth-date') && event.target.value && !dataBrasileiraValida(event.target.value)) {
    event.target.setCustomValidity('Informe uma data válida no formato dd/mm/aaaa.');
  } else if (event.target.matches('.admission-date')) {
    if (!validarDataAdmissao(event.target, true) && event.target.value) {
      const help = document.querySelector('#admissionDateHelp');
      if (help) {
        help.textContent = 'Data incorreta. Verifique com o RH a data correta da admissão.';
        help.classList.add('error');
      }
      event.target.reportValidity();
    } else {
      const help = document.querySelector('#admissionDateHelp');
      if (help) {
        help.textContent = 'Data prevista de início, definida pelo RH da empresa.';
        help.classList.remove('error');
      }
    }
  }
}, true);

function formatCpfField(input) {
  let value = input.value.replace(/\D/g, '').slice(0, 11);
  if (value.length > 9) value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (value.length > 6) value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (value.length > 3) value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  input.value = value;
  input.setCustomValidity('');
}

function validarCpfDependente(input, showMessage = true) {
  const value = input.value;
  const cpf = value.replace(/\D/g, '');
  const index = Number(input.dataset.dependentIndex);
  const duplicatesChild = [...childrenFields.querySelectorAll('[data-dependent-cpf]')]
    .some(other => other !== input && cpf.length === 11 && other.value.replace(/\D/g, '') === cpf);
  const duplicatesParent = cpf.length === 11 && cpf === String(form.elements.cpf.value || '').replace(/\D/g, '');
  const valid = cpfValido(cpf);
  let error = '';
  if (!cpf) error = 'Informe o CPF do filho.';
  else if (!valid) error = 'CPF inválido. Confira os números digitados.';
  else if (duplicatesParent) error = 'O CPF do filho não pode ser igual ao CPF do responsável.';
  else if (duplicatesChild) error = 'Este CPF já foi informado para outro filho.';
  input.setCustomValidity(error);
  const message = input.closest('label').querySelector('.dependent-cpf-message');
  if (showMessage || error) {
    message.textContent = error || 'CPF válido.';
    message.classList.toggle('error', Boolean(error));
  }
  return !error;
}

function validateDependentBirth(input, report) {
  const age = idadeEmAnos(input.value);
  const message = input.closest('label').querySelector('.dependent-birth-message');
  if (!input.value || !dataBrasileiraValida(input.value)) {
    input.setCustomValidity(input.value ? 'Informe uma data válida.' : 'Informe a data de nascimento.');
    message.textContent = input.value ? 'Informe uma data válida no formato dd/mm/aaaa.' : 'Obrigatória. O filho deve ter menos de 18 anos.';
  } else if (age >= 18) {
    input.setCustomValidity('A data informada corresponde a 18 anos ou mais. Informe apenas filhos menores de 18 anos.');
    message.textContent = 'A idade deve ser inferior a 18 anos na data de hoje.';
  } else if (age < 0) {
    input.setCustomValidity('A data de nascimento não pode estar no futuro.');
    message.textContent = 'A data não pode ser futura.';
  } else {
    input.setCustomValidity('');
    message.textContent = `Idade validada: ${age} ${age === 1 ? 'ano' : 'anos'}.`;
  }
  message.classList.toggle('error', Boolean(input.validationMessage));
  if (report && input.validationMessage) input.reportValidity();
  return !input.validationMessage;
}

function saveDependentValues() {
  childrenFields.querySelectorAll('[data-dependent-index]').forEach(input => {
    const index = Number(input.dataset.dependentIndex);
    const data = dependentData.get(index) || {};
    data[input.dataset.dependentField] = input.value;
    dependentData.set(index, data);
  });
}
function atualizarDependentesFamilia() {
  const wrap = document.querySelector('#dependentesFamiliaWrap');
  const field = form.elements.dependentesFamilia;
  const count = Math.min(20, Math.max(0, Number(dependentCountField.value || 0)));
  if (wrap) wrap.classList.toggle('hidden', count === 0);
  if (field) {
    field.disabled = count === 0;
    field.required = count > 0;
    if (count === 0) field.value = '';
  }
}
function renderDependentFields() {
  saveDependentValues();
  const count = Math.min(20, Math.max(0, Number(dependentCountField.value || 0)));
  dependentCountField.value = String(count);
  childrenFields.innerHTML = '';
  childrenFields.classList.toggle('hidden', count === 0);
  for (let index = 1; index <= count; index++) {
    const data = dependentData.get(index) || {};
    const block = document.createElement('fieldset');
    block.className = 'dependent-card';
    block.innerHTML = `<legend>Dados do dependente</legend>
      <label>Nome completo do dependente *<input name="filho_${index}_nome" data-dependent-index="${index}" data-dependent-field="nome" required maxlength="160" value="${escapeHtml(data.nome || '')}"></label>
      <label>CPF do dependente *<input name="filho_${index}_cpf" data-dependent-index="${index}" data-dependent-field="cpf" data-dependent-cpf inputmode="numeric" required maxlength="14" placeholder="000.000.000-00" value="${escapeHtml(data.cpf || '')}"><small class="field-message dependent-cpf-message">CPF será validado para confirmar os dados.</small></label>
      <label>Data de nascimento do dependente *<span class="date-input-wrap"><input class="birth-date" name="filho_${index}_nascimento" data-dependent-index="${index}" data-dependent-field="nascimento" data-dependent-birth type="text" inputmode="numeric" required maxlength="10" placeholder="dd/mm/aaaa" pattern="\\d{2}/\\d{2}/\\d{4}" value="${escapeHtml(data.nascimento || '')}"><button type="button" class="calendar-button" aria-label="Abrir calendário da data de nascimento do dependente">▦</button><input class="date-picker" type="date" tabindex="-1" aria-hidden="true"></span><small class="field-message dependent-birth-message">Obrigatória. O dependente deve ter menos de 18 anos.</small></label>`;
    childrenFields.appendChild(block);
    block.querySelectorAll('.birth-date').forEach(adicionarCalendario);
    const cpfField = block.querySelector('[data-dependent-cpf]');
    if (cpfField.value) formatCpfField(cpfField);
    const birthField = block.querySelector('[data-dependent-birth]');
    if (birthField.value) validateDependentBirth(birthField, false);
  }
  updateChildrenDocumentNote();
  atualizarDependentesFamilia();
}
function updateChildrenDocumentNote() {
  const note = document.querySelector('#childrenDocumentNote');
  const count = Math.min(20, Math.max(0, Number(dependentCountField.value || 0)));
  note.classList.toggle('hidden', count === 0);
  if (count) note.textContent = `A certidão de nascimento de cada filho cadastrado será obrigatória (${count} ${count === 1 ? 'filho' : 'filhos'}).`;
}
renderDependentFields();

// CNH substitui conjuntamente RG e documento CPF. Se não houver CNH, ambos são exigidos.
const documents = [
  {key:"ctps", title:"Carteira de Trabalho", required:true, help:"Obrigatória"},
  {key:"cnh", title:"Carteira Nacional de Habilitação (CNH)", required:false, help:"Opcional; ao enviar, substitui RG e documento CPF"},
  {key:"rg", title:"Carteira de Identidade (RG)", required:false, help:"Obrigatório enquanto a CNH não for enviada"},
  {key:"cpfDoc", title:"Documento CPF", required:false, help:"Obrigatório enquanto a CNH não for enviada"},
  {key:"titulo", title:"Título de Eleitor", required:true, help:"Obrigatório"},
  {key:"reservista", title:"Certificado de Reservista", required:false, help:"Quando aplicável"},
  {key:"certidao", title:"Certidão de casamento", required:true, help:"Obrigatória para pessoas casadas"},
  {key:"enderecoDoc", title:"Comprovante de endereço (luz ou telefone)", required:true, help:"Obrigatório"},
  {key:"foto", title:"Foto 3x4 atual", required:true, help:"Envie uma foto recente, nítida e legível, com o rosto visível para identificação biométrica facial."}
];

function documentoObrigatorio(doc) {
  if (doc.key === 'reservista') return form.elements.sexo.value === 'Masculino';
  if (doc.key === 'certidao') return form.elements.estadoCivil.value === 'Casado(a)';
  if (doc.key === 'rg' || doc.key === 'cpfDoc') return !uploadedKeys.has('cnh');
  return doc.required;
}
function renderOneDocument(doc) {
  const item = document.createElement("div");
  item.className = "upload-item";
  item.dataset.doc = doc.key;
  const required = documentoObrigatorio(doc);
  item.innerHTML = `<span class="upload-copy"><strong>${escapeHtml(doc.title)}</strong><small>${escapeHtml(doc.help)}</small><span class="file-status" id="status-${doc.key}">Nenhum arquivo selecionado</span></span>
    <span class="upload-control"><label class="file-picker"><span class="file-picker-button">Selecionar arquivo</span><span class="file-picker-name" id="filename-${doc.key}">Nenhum arquivo escolhido</span><span class="file-inline-loading hidden" aria-live="polite"><span class="file-mini-spinner"></span><span>Processando arquivo...</span></span><input type="file" name="${doc.key}" accept=".pdf,.jpg,.jpeg,.png" aria-label="${escapeHtml(doc.title)}"></label><span class="pill ${required ? "required" : "optional"}">${required ? "Obrigatório" : "Opcional"}</span></span>`;
  uploadList.appendChild(item);
  const existing = driveDocuments.get(doc.key);
  if (existing) {
    item.classList.add("file-ready");
    const status = item.querySelector(`#status-${doc.key}`);
    if (status) status.textContent = `✓ VERIFICADO — documento já registrado: ${existing.nome}`;
    item.querySelector(`#filename-${doc.key}`).textContent = existing.nome || 'Arquivo já salvo';
  }
  item.querySelector("input").addEventListener("change", event => {
    const file = event.target.files[0], status = document.querySelector(`#status-${doc.key}`), fileName = document.querySelector(`#filename-${doc.key}`);
    item.classList.remove("file-error", "file-ready");
    if (!file) { status.textContent = "Nenhum arquivo selecionado"; fileName.textContent = "Nenhum arquivo escolhido"; uploadedKeys.delete(doc.key); updateDocumentRequirements(); updateMissingSummary(); updateSubmitVisibility(); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    const maxBytes = (window.APP_CONFIG?.MAX_FILE_MB || 5) * 1024 * 1024;
    if (!allowed.includes(file.type)) { event.target.value = ""; fileName.textContent = "Nenhum arquivo escolhido"; status.textContent = "Formato inválido. Use PDF, JPG ou PNG."; item.classList.add("file-error"); return; }
    if (file.size > maxBytes) { event.target.value = ""; fileName.textContent = "Nenhum arquivo escolhido"; status.textContent = `Arquivo maior que ${window.APP_CONFIG?.MAX_FILE_MB || 5} MB.`; item.classList.add("file-error"); return; }
    fileName.textContent = file.name;
    status.textContent = `${file.name} · ${formatBytes(file.size)} · iniciando processamento…`; item.classList.add("file-ready");
    const inlineLoading = item.querySelector('.file-inline-loading');
    inlineLoading?.classList.remove('hidden');
    uploadSelectedDocument(doc, file, event.target).then(() => {
      inlineLoading?.classList.add('hidden');
    }).catch(error => {
      inlineLoading?.classList.add('hidden');
      event.target.value = "";
      status.textContent = "Falha no processamento: " + (error.message || "erro desconhecido"); fileName.textContent = "Nenhum arquivo escolhido"; item.classList.add("file-error"); uploadingKeys.delete(doc.key);
      updateDocumentRequirements();
      updateMissingSummary(); updateSubmitVisibility();
      const ref = criarReferenciaErro();
      showStatus(`ERRO ${ref}: Não foi possível registrar ${doc.title}: ${error.message || "verifique a configuração do sistema"}. Os arquivos já registrados serão mantidos. Copie este código e encaminhe à equipe de TI.`, true);
    });
    updateDocumentRequirements();
    updateMissingSummary();
  });
}
function renderDocuments() {
  uploadList.innerHTML = "";
  documents.filter(doc => (doc.key !== 'certidao' || documentoObrigatorio(doc)) && (doc.key !== 'reservista' || form.elements.sexo.value === 'Masculino')).forEach(renderOneDocument);
  const count = Math.min(20, Math.max(0, Number(dependentCountField.value || 0)));
  for (let i = 1; i <= count; i++) {
    const childName = String(dependentData.get(i)?.nome || '').trim();
    const title = childName ? `Certidão de nascimento de ${childName}` : `Certidão de nascimento do dependente`;
    renderOneDocument({key:`filho_${i}`, title, required:true, help:"Obrigatória conforme quantidade informada"});
  }
  updateDocumentRequirements();
}
renderDocuments();
function updateDocumentRequirements() {
  const cnhSent = uploadedKeys.has('cnh');
  uploadList.querySelectorAll('[data-doc]').forEach(item => {
    const key = item.dataset.doc;
    const doc = documents.find(candidate => candidate.key === key) || {key, required:true};
    const required = documentoObrigatorio(doc);
    const pill = item.querySelector('.pill');
    if (pill) {
      pill.textContent = required ? 'Obrigatório' : 'Opcional';
      pill.className = `pill ${required ? 'required' : 'optional'}`;
    }
    const help = item.querySelector('.upload-copy > small');
    if (help && (key === 'rg' || key === 'cpfDoc')) help.textContent = cnhSent ? 'Opcional; CNH já enviada' : 'Obrigatório enquanto a CNH não for enviada';
    if (help && key === 'cnh' && cnhSent) help.textContent = 'CNH já enviada';
  });
}
dependentCountField.addEventListener('input', () => {
  renderDependentFields();
  atualizarDependentesFamilia();
  renderDocuments();
  updateMissingSummary(); updateSubmitVisibility();
});
childrenFields.addEventListener('input', event => {
  if (event.target.matches('[data-dependent-index]')) {
    const index = Number(event.target.dataset.dependentIndex);
    const data = dependentData.get(index) || {};
    data[event.target.dataset.dependentField] = event.target.value;
    dependentData.set(index, data);
    if (event.target.dataset.dependentField === 'nome') renderDocuments();
    updateMissingSummary(); updateSubmitVisibility();
  }
});
dependentCountField.addEventListener('change', async () => {
  atualizarDependentesFamilia();
  renderDocuments();
  try { await refreshDriveDocuments(); } catch (error) { console.warn('Não foi possível atualizar os documentos do Drive:', error); }
  updateMissingSummary(); updateSubmitVisibility();
});

function setStep(step) {
  currentStep = step;
  sections.forEach(section => section.classList.toggle("active", Number(section.dataset.step) === step));
  const percent = Math.round(step / sections.length * 100);
  progressBar.style.width = `${percent}%`;
  stepCaption.textContent = `Etapa ${step} de ${sections.length}`;
  progressPercent.textContent = `${percent}%`;
  backBtn.hidden = step === 1;
  nextBtn.hidden = step === sections.length;
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
  window.scrollTo({top: 0, behavior: "smooth"});
  if (step === 3) updateMissingSummary();
  updateSubmitVisibility();
}
function cpfValido(value) {
  const cpf = String(value || "").replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11; if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11; if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
}
function validateCpf(show = true) {
  const field = document.querySelector("#cpf");
  const message = document.querySelector("#cpfMessage");
  const raw = field.value.replace(/\D/g, "");
  if (!raw) { field.setCustomValidity("Informe o CPF."); message.textContent = "CPF obrigatório."; message.className = "field-message error"; if (show) field.reportValidity(); return false; }
  if (!cpfValido(raw)) { field.setCustomValidity("CPF inválido. Confira os números digitados."); message.textContent = "CPF inválido. Confira os números digitados."; message.className = "field-message error"; if (show) field.reportValidity(); return false; }
  field.setCustomValidity(""); message.textContent = "CPF válido."; message.className = "field-message valid"; return true;
}
function fieldLabel(field) {
  const label = field.closest("label");
  return label ? label.childNodes[0].textContent.replace(/\s*\*\s*$/, "").trim() : (field.name || "Campo");
}
function missingFieldsForStep(step) {
  const missing = [];
  const section = sections[step - 1];
  for (const field of section.querySelectorAll("input,select")) {
    if (field.type === "file" || field.type === "checkbox" || field.disabled) continue;
    if (field.required && !String(field.value || "").trim()) missing.push(fieldLabel(field));
    else if (field.required && !field.checkValidity()) missing.push(fieldLabel(field));
  }
  if (step === 1 && document.querySelector("#cpf").value && !cpfValido(document.querySelector("#cpf").value)) missing.push("CPF válido");
  if (step === 1) {
    const admissionDate = form.elements.dataAdmissao;
    if (admissionDate && !validarDataAdmissao(admissionDate)) missing.push("Data posterior à atual, confirmada pelo RH");
  }
  if (step === 1) {
    const identity = form.elements.identidadeGenero.value;
    const race = form.elements.racaCor.value;
    if (identity === 'Outra identidade de gênero' && !form.elements.outraIdentidadeGenero.value.trim()) missing.push("Descrição da identidade de gênero");
    if (race === 'Outra' && !form.elements.outraRacaCor.value.trim()) missing.push("Descrição de raça/cor");
    childrenFields.querySelectorAll('[data-dependent-cpf]').forEach(field => {
      if (!validarCpfDependente(field)) missing.push('CPF válido e exclusivo para cada dependente');
    });
    childrenFields.querySelectorAll('[data-dependent-birth]').forEach(field => {
      if (!validateDependentBirth(field, false)) missing.push('Data de nascimento válida (menor de 18 anos) para cada dependente');
    });
  }
  if (step === 2) {
    const cep = document.querySelector("#cep").value.replace(/\D/g, "");
    if (cep.length !== 8) missing.push("CEP com 8 números");
    contactsList.querySelectorAll('.contact-card').forEach((card, index) => {
      const number = card.querySelector('[data-contact-number]');
      const name = card.querySelector('[data-contact-name]');
      const methods = [...card.querySelectorAll('[data-contact-method]')];
      const numeroPreenchido = Boolean(number.value.trim());
      const nomePreenchido = Boolean(name.value.trim());
      const metodoSelecionado = methods.some(method => method.checked);
      number.setCustomValidity(numeroPreenchido || nomePreenchido ? '' : 'Informe o número principal de contato.');
      name.setCustomValidity(numeroPreenchido && !nomePreenchido ? 'Informe o nome da pessoa associada a este telefone.' : '');
      methods.forEach(method => method.setCustomValidity(numeroPreenchido && nomePreenchido && !metodoSelecionado ? 'Selecione pelo menos uma forma de contato para este número.' : ''));
      if (numeroPreenchido && !nomePreenchido) missing.push(`Nome do contato para o número ${index + 1}`);
      else if (!numeroPreenchido && nomePreenchido) missing.push(`Número de contato ${index + 1}`);
      else if (!numeroPreenchido) missing.push(`Número de contato ${index + 1}`);
      else if (!metodoSelecionado) missing.push(`Forma de contato para o número ${index + 1}`);
    });
  }
  if (step === 3) {
    const selected = key => Boolean(form.elements[key]?.files?.length);
    documents.filter(d => documentoObrigatorio(d) && !selected(d.key) && !uploadedKeys.has(d.key)).forEach(d => missing.push(d.title));
    const childCount = Math.min(20, Math.max(0, Number(form.elements.quantidadeFilhos?.value || 0)));
    for (let i=1; i<=childCount; i++) {
      if (!selected(`filho_${i}`) && !uploadedKeys.has(`filho_${i}`)) {
        const childName = String(dependentData.get(i)?.nome || '').trim();
        missing.push(`Certidão de nascimento de ${childName || 'dependente'}`);
      }
    }
    if (form.elements.sexo?.value === "Masculino" && !selected("reservista") && !uploadedKeys.has("reservista")) missing.push("Certificado de Reservista (sexo masculino)");
    if (!(selected("cnh") || uploadedKeys.has("cnh")) && !(selected("rg") || uploadedKeys.has("rg"))) missing.push("CNH ou RG");
    if (!(selected("cnh") || uploadedKeys.has("cnh")) && !(selected("cpfDoc") || uploadedKeys.has("cpfDoc"))) missing.push("CNH ou documento CPF");
    if ([...uploadingKeys].length) missing.push("Aguarde o término do processamento dos arquivos");
    if (!form.elements.cientePrivacidade.checked) missing.push("Confirmação de leitura do aviso de privacidade");
  }
  return [...new Set(missing)];
}
function validateCurrentStep() {
  if (currentStep === 1 && !validateCpf(false)) { validateCpf(true); return false; }
  const missing = missingFieldsForStep(currentStep);
  if (missing.length) {
    const msg = "Para continuar, confira: " + missing.join("; ") + ".";
    if (currentStep === 3) {
      updateMissingSummary();
      if (missing.includes("Confirmação de leitura do aviso de privacidade")) {
        const consent = form.querySelector('.consent');
        consent?.scrollIntoView({behavior:'smooth', block:'center'});
        form.elements.cientePrivacidade.focus({preventScroll:true});
      }
    }
    showStatus(msg, true);
    let first = sections[currentStep - 1].querySelector(":invalid");
    if (currentStep === 2) {
      const contato = [...contactsList.querySelectorAll('.contact-card')]
        .flatMap(card => [
          card.querySelector('[data-contact-number]'),
          card.querySelector('[data-contact-name]'),
          ...card.querySelectorAll('[data-contact-method]')
        ])
        .find(field => field && !field.checkValidity());
      if (contato) first = contato;
    }
    if (first && !first.disabled) {
      first.scrollIntoView({behavior: 'smooth', block: 'center'});
      first.focus({preventScroll: true});
      if (typeof first.reportValidity === 'function' && first.value !== undefined) first.reportValidity();
    }
    return false;
  }
  for (const field of sections[currentStep - 1].querySelectorAll("input,select")) {
    if (field.disabled || field.type === "file" || field.type === "checkbox") continue;
    if (!field.checkValidity()) { field.reportValidity(); field.focus(); return false; }
  }
  if (currentStep === 1) {
    const invalidChildCpf = [...childrenFields.querySelectorAll('[data-dependent-cpf]')].find(field => !validarCpfDependente(field));
    if (invalidChildCpf) {
      invalidChildCpf.reportValidity(); invalidChildCpf.focus(); return false;
    }
    const invalidChildBirth = [...childrenFields.querySelectorAll('[data-dependent-birth]')].find(field => !validateDependentBirth(field, false));
    if (invalidChildBirth) { invalidChildBirth.reportValidity(); invalidChildBirth.focus(); return false; }
  }
  if (currentStep === 3) {
    const bad = uploadList.querySelector(".file-error");
    if (bad) { showStatus("Corrija o arquivo marcado com erro antes de enviar.", true); bad.scrollIntoView({behavior:"smooth",block:"center"}); return false; }
  }
  return true;
}
function updateMissingSummary() {
  const missing = missingFieldsForStep(3);
  if (!missing.length) {
    missingSummary.classList.add("hidden"); missingSummary.textContent = "";
    missingSummary.classList.remove("privacy-alert-pulse");
    form.querySelector(".consent")?.classList.remove("privacy-consent-pulse");
    return;
  }
  missingSummary.classList.remove("hidden");
  missingSummary.innerHTML = `<strong>Antes de enviar, ainda falta:</strong><ul>${missing.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
  const privacyMissing = missing.includes("Confirmação de leitura do aviso de privacidade");
  missingSummary.classList.toggle("privacy-alert-pulse", privacyMissing);
  if (privacyMissing) {
    const consent = form.querySelector(".consent");
    consent?.classList.add("privacy-consent-pulse");
    const listItem = [...missingSummary.querySelectorAll('li')].find(item => item.textContent.includes('Confirmação de leitura do aviso'));
    if (listItem) listItem.innerHTML = `<button type="button" class="missing-link" data-go-privacy>${escapeHtml(listItem.textContent)} — ir para o aviso</button>`;
  } else form.querySelector(".consent")?.classList.remove("privacy-consent-pulse");
  updateSubmitVisibility();
}
missingSummary.addEventListener('click', event => {
  if (event.target.closest('[data-go-privacy]')) {
    const consent = form.querySelector('.consent');
    consent?.scrollIntoView({behavior:'smooth', block:'center'});
    form.elements.cientePrivacidade.focus({preventScroll:true});
  }
});
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function normalizeRecoveredDependents(data) {
  const normalized = new Map();
  const lists = [data.filhos, data.dependentes];
  lists.forEach(list => {
    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (_) { return; }
    }
    if (!Array.isArray(list)) return;
    list.forEach((dependent, index) => {
      if (!dependent || typeof dependent !== 'object') return;
      const childIndex = Number(dependent.indice || dependent.index || index + 1);
      if (!Number.isInteger(childIndex) || childIndex < 1 || childIndex > 20) return;
      normalized.set(childIndex, {
        indice: childIndex,
        nome: dependent.nome ?? dependent.nomeCompleto ?? dependent.name ?? '',
        cpf: dependent.cpf ?? dependent.documento ?? '',
        nascimento: dependent.nascimento ?? dependent.dataNascimento ?? dependent.birthDate ?? ''
      });
    });
  });
  Object.entries(data).forEach(([key, value]) => {
    const match = key.match(/^(?:filho|dependente)_(\d+)_(nome|nomeCompleto|cpf|nascimento|dataNascimento)$/i);
    if (!match) return;
    const childIndex = Number(match[1]);
    if (!Number.isInteger(childIndex) || childIndex < 1 || childIndex > 20) return;
    const child = normalized.get(childIndex) || {indice:childIndex, nome:'', cpf:'', nascimento:''};
    const field = /^(?:nome|nomeCompleto)$/i.test(match[2]) ? 'nome' : (/^cpf$/i.test(match[2]) ? 'cpf' : 'nascimento');
    if (value !== undefined && value !== null && String(value).trim()) child[field] = String(value);
    normalized.set(childIndex, child);
  });
  return [...normalized.values()].sort((a, b) => a.indice - b.indice);
}
function criarReferenciaErro() { return "ADM-" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0,14) + "-" + Math.random().toString(36).slice(2,6).toUpperCase(); }
function showStatus(message, isError) {
  statusMessage.textContent = message;
  statusMessage.className = "status-message " + (isError ? "error" : "success");
  statusMessage.scrollIntoView({behavior:"smooth", block:"center"});
}
function setOverall(percent, message) {
  const n = Math.max(0, Math.min(100, Math.round(percent)));
  overallProgress.style.width = `${n}%`; overallPercent.textContent = `${n}%`; overallMessage.textContent = message;
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(0)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}
nextBtn.addEventListener("click", async () => {
  if (!validateCurrentStep()) return;
  // Prepare the employee folder before the user reaches the document-upload step.
  if (currentStep === 1) {
    nextBtn.disabled = true;
    showStatus("Validando os dados e preparando o processo admissional…", false);
    try {
      await ensureCadastroSession();
      showStatus("Pasta individual criada/localizada e dados iniciais registrados. Continue para informar endereço e contato.", false);
      setStep(Math.min(currentStep + 1, sections.length));
    } catch (error) {
      showStatus("Não foi possível preparar o cadastro: " + (error.message || "verifique a configuração do Apps Script e o ID da pasta principal."), true);
    } finally {
      nextBtn.disabled = false;
      updateSubmitVisibility();
    }
    return;
  }
  if (currentStep === 2 && cadastroId) {
    nextBtn.disabled = true;
    setOverall(15, "Validando endereço e enviando os dados ao servidor…");
    showStatus("Salvando os dados de endereço no servidor. Aguarde…", false);
    try { await postAction({...collectFormData(), acao:"iniciarCadastro", origem:window.location.href}); setOverall(25, "Dados de endereço registrados."); }
    catch(error) { const ref = criarReferenciaErro(); showStatus("ERRO "+ref+": Não foi possível salvar os dados de endereço: " + error.message + ". Anote o código e envie à equipe de TI.", true); nextBtn.disabled=false; return; }
    finally { nextBtn.disabled=false; }
  }
  setStep(Math.min(currentStep + 1, sections.length));
});
backBtn.addEventListener("click", () => setStep(Math.max(currentStep - 1, 1)));

document.querySelector('[name="estadoCivil"]').addEventListener('change', event => {
  renderDocuments();
  refreshDriveDocuments().catch(error => console.warn('Falha ao atualizar documentos após alteração do estado civil:', error));
  updateMissingSummary(); updateSubmitVisibility();
});
document.querySelector('[name="sexo"]').addEventListener('change', () => {
  renderDocuments();
  updateMissingSummary();
  updateSubmitVisibility();
});
document.querySelector('#identidadeGenero').addEventListener('change', event => {
  const descriptions = {
    'Homem cisgênero':'Identifica-se como homem, conforme o sexo registrado ao nascer.',
    'Mulher cisgênero':'Identifica-se como mulher, conforme o sexo registrado ao nascer.',
    'Homem transgênero':'Identifica-se como homem, com sexo feminino registrado ao nascer.',
    'Mulher transgênero':'Identifica-se como mulher, com sexo masculino registrado ao nascer.',
    'Pessoa não binária':'Não se identifica exclusivamente como homem ou mulher.',
    'Outra identidade de gênero':'Informe como você descreve sua identidade de gênero.'
  };
  const other = event.target.value === 'Outra identidade de gênero';
  document.querySelector('#outraIdentidadeWrap').classList.toggle('hidden', !other);
  form.elements.outraIdentidadeGenero.required = other;
  if (!other) form.elements.outraIdentidadeGenero.value = '';
  document.querySelector('#identidadeGeneroHelp').textContent = descriptions[event.target.value] || 'Selecione a opção que melhor representa você.';
});
document.querySelector('#racaCor').addEventListener('change', event => {
  const other = event.target.value === 'Outra';
  document.querySelector('#outraRacaWrap').classList.toggle('hidden', !other);
  form.elements.outraRacaCor.required = other;
  if (!other) form.elements.outraRacaCor.value = '';
});
contactsList.addEventListener('input', event => {
  if (event.target.matches('[data-contact-number]')) formatContactNumber(event);
});
contactsList.addEventListener('change', event => {
  if (!event.target.matches('[data-contact-method]')) return;
  const card = event.target.closest('.contact-card');
  if (!card) return;
  const methods = [...card.querySelectorAll('[data-contact-method]')];
  if (methods.some(method => method.checked)) {
    methods.forEach(method => method.setCustomValidity(''));
  }
});
function formatContactNumber(event) {
  const field = event.target || event;
  let value = field.value.replace(/\D/g, '').slice(0, 11);
  if (value.length > 10) value = value.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3');
  else if (value.length > 6) value = value.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
  else if (value.length > 2) value = value.replace(/(\d{2})(\d{1,5})/, '($1) $2');
  field.value = value;
}
const mapWidget = document.querySelector('#mapWidget');
const mapDragHandle = document.querySelector('#mapDragHandle');
const mapToggle = document.querySelector('#mapToggle');
const mapCollapse = document.querySelector('#mapCollapse');
let mapDragState = null;
function setMapCollapsed(collapsed) {
  mapWidget.classList.toggle('map-collapsed', collapsed);
  mapWidget.setAttribute('aria-hidden', String(collapsed));
  mapWidget.inert = collapsed;
  mapToggle.setAttribute('aria-expanded', String(!collapsed));
}
mapToggle.addEventListener('click', () => {
  setMapCollapsed(false);
  mapDragHandle.focus();
});
mapCollapse.addEventListener('click', () => {
  setMapCollapsed(true);
  mapToggle.focus();
});
mapDragHandle.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const bounds = mapWidget.getBoundingClientRect();
  mapWidget.style.left = `${bounds.left}px`;
  mapWidget.style.top = `${bounds.top}px`;
  mapWidget.style.right = 'auto';
  mapWidget.style.bottom = 'auto';
  mapDragState = {pointerId:event.pointerId, offsetX:event.clientX - bounds.left, offsetY:event.clientY - bounds.top};
  event.preventDefault();
});
document.addEventListener('pointermove', event => {
  if (!mapDragState || event.pointerId !== mapDragState.pointerId) return;
  const bounds = mapWidget.getBoundingClientRect();
  const left = Math.max(0, Math.min(window.innerWidth - bounds.width, event.clientX - mapDragState.offsetX));
  const top = Math.max(0, Math.min(window.innerHeight - Math.min(48, bounds.height), event.clientY - mapDragState.offsetY));
  mapWidget.style.left = `${left}px`;
  mapWidget.style.top = `${top}px`;
});
function finishMapDrag(event) {
  if (!mapDragState || event.pointerId !== mapDragState.pointerId) return;
  mapDragState = null;
  if (mapDragHandle.hasPointerCapture(event.pointerId)) mapDragHandle.releasePointerCapture(event.pointerId);
}
document.addEventListener('pointerup', finishMapDrag);
document.addEventListener('pointercancel', finishMapDrag);
mapDragHandle.addEventListener('keydown', event => {
  const movement = {ArrowLeft:[-16,0], ArrowRight:[16,0], ArrowUp:[0,-16], ArrowDown:[0,16]}[event.key];
  if (!movement) return;
  const bounds = mapWidget.getBoundingClientRect();
  mapWidget.style.left = `${Math.max(0, Math.min(window.innerWidth - bounds.width, bounds.left + movement[0]))}px`;
  mapWidget.style.top = `${Math.max(0, Math.min(window.innerHeight - Math.min(48, bounds.height), bounds.top + movement[1]))}px`;
  mapWidget.style.right = 'auto';
  mapWidget.style.bottom = 'auto';
  event.preventDefault();
});
window.addEventListener('resize', () => {
  if (mapWidget.classList.contains('map-collapsed')) return;
  const bounds = mapWidget.getBoundingClientRect();
  mapWidget.style.left = `${Math.max(0, Math.min(window.innerWidth - bounds.width, bounds.left))}px`;
  mapWidget.style.top = `${Math.max(0, Math.min(window.innerHeight - Math.min(48, bounds.height), bounds.top))}px`;
  mapWidget.style.right = 'auto';
  mapWidget.style.bottom = 'auto';
});
document.querySelector("#pcd").addEventListener("change", event => {
  document.querySelector("#deficienciaWrap").classList.toggle("hidden", event.target.value !== "Sim");
});
document.querySelector("#cpf").addEventListener("input", event => {
  let v = event.target.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
  event.target.value = v;
  event.target.setCustomValidity("");
  document.querySelector("#cpfMessage").textContent = "O CPF será validado ao sair deste campo.";
  document.querySelector("#cpfMessage").className = "field-message";
  if (v.replace(/\D/g, '').length === 11 && cpfValido(v)) consultarCpfAutomaticamente(v);
  else if (v.replace(/\D/g, '').length < 11) lastAutoLookupCpf = '';
});
document.querySelector("#cpf").addEventListener("blur", () => validateCpf(true));
document.querySelector("#cpf").addEventListener("keydown", event => { if (event.key === "Tab") validateCpf(true); });
const birthDateDialog = document.querySelector('#birthDateDialog');
const birthDateForm = document.querySelector('#birthDateForm');
let lookupCpfPending = '';
async function consultarCpfAutomaticamente(cpfFormatado) {
  const cpf = String(cpfFormatado || '').replace(/\D/g, '');
  if (cpf.length !== 11 || !cpfValido(cpf) || cpf === lastAutoLookupCpf || lookupInProgress) return;
  lastAutoLookupCpf = cpf;
  lookupInProgress = true;
  try {
    const found = await postAction({acao:'consultarCpf', cpf});
    if (!found.encontrado) {
      setOverall(0, 'Nenhum cadastro anterior localizado. Você pode continuar o preenchimento.');
      document.querySelector('#cpfMessage').textContent = 'CPF válido. Não encontramos cadastro anterior.';
      return;
    }
    const continuar = window.confirm('Já existe um cadastro para este CPF. Deseja continuar e corrigir o cadastro existente?\n\nSim: confirmar a data de nascimento e recuperar dados e documentos.\nNão: cancelar esta consulta.');
    if (!continuar) {
      document.querySelector('#cpf').value = '';
      document.querySelector('#cpf').focus();
      document.querySelector('#cpfMessage').textContent = 'Consulta cancelada. Digite novamente o CPF para tentar outra vez. Um cadastro existente não será sobrescrito sem confirmação.';
      lastAutoLookupCpf = '';
      setOverall(0, 'Consulta de cadastro cancelada.');
      return;
    }
    lookupCpfPending = cpf;
    document.querySelector('#lookupBirthDate').value = '';
    document.querySelector('#lookupBirthMessage').textContent = '';
    birthDateDialog.showModal();
    setOverall(0, 'Aguardando confirmação da data de nascimento.');
  } catch (error) {
    lastAutoLookupCpf = '';
    const ref = criarReferenciaErro();
    showStatus(`ERRO ${ref}: Não foi possível consultar o CPF: ${error.message}. Copie o código e encaminhe à equipe de TI.`, true);
    setOverall(0, 'Falha ao consultar cadastro.');
  } finally { lookupInProgress = false; }
}
document.querySelector('#cancelBirthLookup')?.addEventListener('click', () => birthDateDialog.close());
birthDateForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const birth = document.querySelector('#lookupBirthDate').value;
  const confirmBtn = document.querySelector('#confirmBirthLookup');
  const message = document.querySelector('#lookupBirthMessage');
  if (!birth || !lookupCpfPending) { message.textContent = 'Informe sua data de nascimento no formato dd/mm/aaaa.'; return; }
  if (!dataBrasileiraValida(birth)) { message.textContent = 'Data inválida. Digite no formato dd/mm/aaaa, por exemplo 23/02/2000.'; document.querySelector('#lookupBirthDate').focus(); return; }
  confirmBtn.disabled = true;
  message.textContent = 'Validando CPF e data de nascimento com o servidor…';
  setOverall(15, 'Validando CPF e data de nascimento no servidor…');
  try {
    const verified = await postAction({acao:'validarIdentidadeCadastro', cpf:lookupCpfPending, nascimento:birth});
    cadastroId = verified.cadastroId;
    const dados = verified.dados || {};
    childrenFields.innerHTML = '';
    dependentData.clear();
    const savedChildren = normalizeRecoveredDependents(dados);
    const expectedChildren = Number(dados.quantidadeFilhos);
    if (Number.isInteger(expectedChildren) && expectedChildren > savedChildren.length) {
      throw new Error(`O servidor informou ${expectedChildren} dependentes, mas retornou apenas ${savedChildren.length} registro(s). A atualização do Apps Script para a versão 0.6.6 é necessária para recuperar nome, CPF e data de nascimento de todos.`);
    }
    savedChildren.forEach((child, index) => {
      const childIndex = Number(child.indice || index + 1);
      if (Number.isInteger(childIndex) && childIndex > 0 && childIndex <= 20) {
        dependentData.set(childIndex, {
          nome: child.nome == null ? '' : String(child.nome),
          cpf: child.cpf == null ? '' : String(child.cpf),
          nascimento: child.nascimento == null ? '' : formatDateBrazilian(child.nascimento)
        });
      }
    });
    const inferredCount = Math.max(0, ...dependentData.keys());
    const savedCount = Number(dados.quantidadeFilhos);
    dependentCountField.value = String(Math.min(20, Math.max(Number.isInteger(savedCount) ? savedCount : 0, inferredCount)));
    renderDependentFields();
    renderContacts(contactsFromSavedData(dados));
    Object.entries(dados).forEach(([key, value]) => {
      if (key === 'filhos' || key === 'contatos' || /^filho_\d+_(nome|cpf|nascimento)$/.test(key) || /^contato_\d+_/.test(key)) return;
      const field = form.elements[key] || form.querySelector(`[name="${CSS.escape(key)}"]`);
      if (!field || key === 'cientePrivacidade') return;
      if (key === 'cpf') field.value = formatCpf(value);
      else if (key === 'nascimento' || /^filho_\d+_nascimento$/.test(key)) field.value = formatDateBrazilian(value);
      else if (key === 'dependentesFamilia' || key === 'dependentesIR') field.value = normalizeYesNo(value);
      else if (field instanceof RadioNodeList) { /* campos agrupados não são usados neste formulário */ }
      else if (key === 'identidadeGenero' && value === 'Outra identidade') field.value = 'Outra identidade de gênero';
      else field.value = value == null ? '' : String(value);
    });
    form.querySelectorAll('.birth-date, .admission-date').forEach(sincronizarCalendario);
    saveDependentValues();
    childrenFields.querySelectorAll('[data-dependent-cpf]').forEach(formatCpfField);
    childrenFields.querySelectorAll('[data-dependent-cpf]').forEach(field => validarCpfDependente(field));
    childrenFields.querySelectorAll('[data-dependent-birth]').forEach(field => validateDependentBirth(field, false));
    renderDocuments();
    form.elements.cientePrivacidade.checked = false;
    document.querySelector('#pcd').dispatchEvent(new Event('change', {bubbles:true}));
    document.querySelector('#identidadeGenero').dispatchEvent(new Event('change', {bubbles:true}));
    document.querySelector('#racaCor').dispatchEvent(new Event('change', {bubbles:true}));
    updateAddressLock();
    uploadedKeys.clear();
    driveDocuments.clear();
    renderDocuments();
    (verified.documentos || []).forEach(doc => {
      driveDocuments.set(doc.chave, doc);
      uploadedKeys.add(doc.chave);
      const status = document.querySelector(`#status-${CSS.escape(doc.chave)}`);
      const fileName = document.querySelector(`#filename-${CSS.escape(doc.chave)}`);
      if (status) status.textContent = `✓ VERIFICADO — já registrado para este cadastro: ${doc.nome}`;
      if (fileName) fileName.textContent = doc.nome || 'Arquivo já registrado';
    });
    updateDocumentRequirements();
    updateMissingSummary(); updateSubmitVisibility();
    birthDateDialog.close();
    setStep(1);
    showStatus(verified.mensagem + ' Os campos foram preenchidos com os dados recuperados. Revise e altere o que for necessário; ao concluir, o cadastro será atualizado.', false);
    setOverall(25, 'Dados recuperados. Revise ou altere os campos antes de continuar.');
  } catch (error) {
    message.textContent = error.message || 'Não foi possível validar os dados.';
    setOverall(0, 'A validação não foi concluída. Confira a data informada.');
  } finally { confirmBtn.disabled = false; }
});
function formatDateBrazilian(value) {
  const v = String(value || '').trim();
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (br) return `${br[1].padStart(2, '0')}/${br[2].padStart(2, '0')}/${br[3]}`;
  return v;
}
function normalizeYesNo(value) {
  const normalized = String(value ?? '').trim().toLocaleLowerCase('pt-BR');
  if (['sim', 'true', 'yes'].includes(normalized)) return 'Sim';
  if (['não', 'nao', 'false', 'no', '0'].includes(normalized)) return 'Não';
  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && numeric > 0) return 'Sim';
  return '';
}
function formatCpf(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length !== 11) return digits;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

const addressIds = ["estado", "endereco", "numeroResidencia", "complemento", "bairro", "cidade"];
function updateAddressLock() {
  const digits = document.querySelector("#cep").value.replace(/\D/g, "");
  const unlock = digits.length === 8;
  addressIds.forEach(id => {
    const field = document.getElementById(id);
    if (field) field.disabled = !unlock;
  });
  if (!unlock) document.querySelector("#cepMessage").textContent = "Digite os 8 números do CEP para liberar os campos de endereço.";
  return unlock;
}
document.querySelector("#cep").addEventListener("input", event => {
  let v = event.target.value.replace(/\D/g, "").slice(0, 8);
  if (v.length > 5) v = v.replace(/(\d{5})(\d{1,3})/, "$1-$2");
  event.target.value = v;
  updateAddressLock();
});
document.querySelector("#cep").addEventListener("blur", async () => {
  const cep = document.querySelector("#cep").value.replace(/\D/g, "");
  const msg = document.querySelector("#cepMessage");
  if (cep.length !== 8) { msg.textContent = "Informe um CEP com 8 números para continuar."; return; }
  msg.textContent = "Consultando CEP…";
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error("Falha na consulta");
    const data = await response.json();
    if (data.erro) throw new Error("CEP não encontrado. Confira o CEP e preencha o endereço manualmente.");
    document.querySelector("#endereco").value = data.logradouro || "";
    document.querySelector("#bairro").value = data.bairro || "";
    document.querySelector("#cidade").value = data.localidade || "";
    document.querySelector("#estado").value = data.uf || "";
    // Ensure the fields stay enabled after the CEP lookup and autofill.
    updateAddressLock();
    msg.textContent = "CEP encontrado. Confira o endereço, informe o número e preencha o complemento se houver.";
  } catch (error) {
    msg.textContent = (error.message || "Não foi possível consultar o CEP.") + " Os campos estão liberados para preenchimento manual.";
  }
});
function fileToBase64(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = event => { if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total * 100); };
    reader.onload = () => { if (onProgress) onProgress(100); resolve(String(reader.result).split(",")[1]); };
    reader.onerror = () => reject(new Error(`Não foi possível preparar o arquivo ${file.name}.`));
    reader.readAsDataURL(file);
  });
}
function collectFormData() {
  const data = {};
  for (const [key, value] of new FormData(form).entries()) if (!(value instanceof File)) data[key] = value;
  const contacts = [...contactsList.querySelectorAll('.contact-card')].map((card, index) => {
    const number = index + 1;
    const contact = {
      numero: card.querySelector('[data-contact-number]').value.trim(),
      nome: card.querySelector('[data-contact-name]').value.trim()
    };
    ['whatsapp', 'ligacao', 'sms'].forEach(method => {
      const selected = card.querySelector(`[name="contato_${number}_${method}"]`).checked;
      data[`contato_${number}_${method}`] = String(selected);
      contact[method] = selected;
    });
    data[`contato_${number}_numero`] = contact.numero;
    data[`contato_${number}_nome`] = contact.nome;
    return contact;
  });
  data.contatos = contacts;
  data.cientePrivacidade = Boolean(form.elements.cientePrivacidade?.checked);
  data.filhos = [...dependentData.entries()].filter(([index]) => index <= Number(dependentCountField.value || 0)).map(([index, child]) => ({indice:index, nome:child.nome || '', cpf:child.cpf || '', nascimento:child.nascimento || ''}));
  return data;
}
async function postAction(payload) {
  const mensagens = {
    iniciarCadastro: 'Validando os dados informados e preparando esta etapa. Aguarde...',
    consultarCpf: 'Verificando os dados informados. Aguarde...',
    validarIdentidadeCadastro: 'Validando a identidade e confirmando os dados cadastrados. Aguarde...',
    listarDocumentos: 'Verificando os documentos já registrados. Aguarde...',
    enviarDocumento: 'Processando o documento selecionado. Aguarde...',
    concluirCadastro: 'Concluindo o cadastro e preparando a documentação admissional. Aguarde...'
  };
  const semPopup = ['consultarCpf', 'listarDocumentos', 'enviarDocumento'].includes(payload.acao);
  const mostrarPopup = !semPopup;
  if (mostrarPopup) iniciarProcessamento(mensagens[payload.acao] || 'Processando os dados. Aguarde até a finalização...');
  try {
    const endpoint = window.APP_CONFIG?.APPS_SCRIPT_URL;
    if (!endpoint || endpoint.includes("COLE_A_URL")) throw new Error("Configure a URL do Apps Script em frontend/config.js.");
    if (!company) throw new Error("O link não identifica uma empresa válida. Use o link enviado pelo RH.");
    const response = await fetch(endpoint, {method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({...payload, empresa:companySlug}),redirect:"follow"});
    if (!response.ok) throw new Error(`O servidor retornou HTTP ${response.status}.`);
    let result;
    try { result = await response.json(); } catch (_) { throw new Error("O servidor retornou uma resposta inválida. Confirme a implantação do Apps Script."); }
    if (!result.ok) throw new Error((result.mensagem || "O servidor não confirmou a operação.") + (result.referencia ? ` [Referência do servidor: ${result.referencia}]` : ""));
    return result;
  } finally {
    if (mostrarPopup) finalizarProcessamento();
  }
}
async function ensureCadastroSession() {
  if (cadastroId) return cadastroId;
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    if (!validateCpf(false)) throw new Error("Corrija o CPF na primeira etapa antes de enviar documentos.");
    const data = collectFormData();
    const result = await postAction({...data, acao:"iniciarCadastro", origem:window.location.href});
    cadastroId = result.cadastroId;
    (result.documentos || []).forEach(doc => {
      driveDocuments.set(doc.chave, doc);
      uploadedKeys.add(doc.chave);
      const status = document.querySelector(`#status-${CSS.escape(doc.chave)}`);
      const fileName = document.querySelector(`#filename-${CSS.escape(doc.chave)}`);
      if (status) status.textContent = `✓ VERIFICADO — já registrado para este cadastro: ${doc.nome}`;
      if (fileName) fileName.textContent = doc.nome || 'Arquivo já registrado';
    });
    updateDocumentRequirements();
    return cadastroId;
  })();
  try { return await sessionPromise; }
  finally { sessionPromise = null; }
}
async function refreshDriveDocuments() {
  if (!cadastroId) return;
  const data = collectFormData();
  const result = await postAction({acao:"listarDocumentos", cadastroId, cpf:data.cpf});
  driveDocuments.clear();
  uploadedKeys.clear();
  (result.documentos || []).forEach(doc => { driveDocuments.set(doc.chave, doc); uploadedKeys.add(doc.chave); });
  uploadList.querySelectorAll('[data-doc]').forEach(item => {
    const key = item.dataset.doc, doc = driveDocuments.get(key);
    if (!doc || uploadingKeys.has(key)) return;
    const status = item.querySelector(`#status-${CSS.escape(key)}`), fileName = item.querySelector(`#filename-${CSS.escape(key)}`);
    if (status) status.textContent = `✓ VERIFICADO — documento já registrado: ${doc.nome}`;
    if (fileName) fileName.textContent = doc.nome || 'Arquivo já registrado';
    item.classList.add('file-ready');
  });
  updateDocumentRequirements();
}
async function uploadSelectedDocument(doc, file, input) {
  if (uploadingKeys.has(doc.key)) return;
  uploadingKeys.add(doc.key); uploadedKeys.delete(doc.key);
  atualizarLoadingUploads();
  updateSubmitVisibility();
  const status = document.querySelector(`#status-${doc.key}`);
  try {
    setOverall(5, `Preparando o documento: ${doc.title}…`);
    const id = await ensureCadastroSession();
    status.textContent = `Processando ${file.name}…`;
    const base64 = await fileToBase64(file, pct => setOverall(Math.min(90, pct * 0.9), `Processando documento: ${doc.title}`));
    status.textContent = `Processando o arquivo: ${file.name}…`;
    const data = collectFormData();
    const result = await postAction({acao:"enviarDocumento", cadastroId:id, cpf:data.cpf, documento:{chave:doc.key,nome:doc.title,nomeArquivo:file.name,mimeType:file.type,tamanho:file.size,base64}});
    uploadedKeys.add(doc.key);
    driveDocuments.set(doc.key, {chave:doc.key, nome:result.nome || file.name});
    status.textContent = `✓ VERIFICADO — documento registrado: ${file.name}`;
    const fileName = document.querySelector(`#filename-${doc.key}`);
    if (fileName) fileName.textContent = result.nome || file.name;
    document.querySelector(`[data-doc="${doc.key}"]`)?.classList.remove("file-error");
    setOverall(100, `${doc.title} registrado com sucesso.`);
    updateDocumentRequirements();
    (result.documentos || []).forEach(saved => uploadedKeys.add(saved.chave));
  } catch (error) {
    try { await refreshDriveDocuments(); } catch (_) { /* Mantém a mensagem original do erro. */ }
    throw error;
  } finally {
    uploadingKeys.delete(doc.key);
    atualizarLoadingUploads();
    updateMissingSummary();
    updateSubmitVisibility();
  }
}
function updateSubmitVisibility() {
  const onFinalStep = currentStep === sections.length;
  const missing = missingFieldsForStep(1).length + missingFieldsForStep(2).length + missingFieldsForStep(3).length;
  const selectedPending = documents.some(d => form.elements[d.key]?.files?.length && !uploadedKeys.has(d.key));
  const anyUploading = uploadingKeys.size > 0 || Boolean(sessionPromise);
  const badFile = Boolean(uploadList.querySelector(".file-error"));
  submitBtn.hidden = !(onFinalStep && missing === 0 && !selectedPending && !anyUploading && !badFile && Boolean(cadastroId));
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (sending || !validateCurrentStep()) return;
  updateSubmitVisibility();
  if (submitBtn.hidden) {
    updateMissingSummary();
    showStatus("Ainda existem campos ou documentos pendentes. Confira a lista antes de concluir.", true);
    return;
  }
  sending = true; submitBtn.disabled = true; nextBtn.disabled = true; backBtn.disabled = true;
  const originalText = submitBtn.innerHTML;
  try {
    setOverall(95, "Conferindo os dados e os documentos já registrados…");
    const result = await postAction({...collectFormData(), acao:"concluirCadastro", cadastroId, origem:window.location.href});
    setOverall(100, "Cadastro concluído com sucesso.");
    form.reset(); uploadedKeys.clear(); driveDocuments.clear(); uploadingKeys.clear(); cadastroId = null; sessionPromise = null; lastAutoLookupCpf = '';
    dependentData.clear(); renderDependentFields();
    document.querySelector('#quantidadeFilhos').value = '0';
    renderContacts();
    document.querySelector('#identidadeGenero').dispatchEvent(new Event('change', {bubbles:true}));
    document.querySelector('#racaCor').dispatchEvent(new Event('change', {bubbles:true}));
    document.querySelector('#pcd').dispatchEvent(new Event('change', {bubbles:true}));
    document.querySelector('[name="estadoCivil"]').dispatchEvent(new Event('change', {bubbles:true}));
    renderDocuments(); updateAddressLock();
    setOverall(0, 'Cadastro concluído. Pronto para iniciar um novo cadastro.');
    setStep(1);
    submitBtn.hidden = true;
    window.scrollTo({top:0, behavior:'smooth'});
    mostrarConclusao();
  } catch (error) {
    try { await refreshDriveDocuments(); } catch (_) { /* A mensagem de conclusão continua sendo exibida. */ }
    updateMissingSummary();
    const ref = criarReferenciaErro();
    showStatus("ERRO " + ref + ": Não foi possível concluir o cadastro: " + (error.message || "verifique as informações informadas.") + " Copie este código e encaminhe à equipe de TI.", true);
  } finally {
    sending = false; submitBtn.disabled = false; nextBtn.disabled = false; backBtn.disabled = false; submitBtn.innerHTML = originalText;
    updateMissingSummary(); updateSubmitVisibility();
  }
});
form.addEventListener("change", () => { updateMissingSummary(); updateSubmitVisibility(); });
form.addEventListener("input", updateSubmitVisibility);
updateAddressLock();
document.querySelector('#whatsappHelp')?.addEventListener('click', event => {
  const nome = String(form.elements.nome?.value || '').trim();
  const message = nome ? `Oi, sou ${nome} e estou com dúvidas sobre o cadastro admissional.` : 'Olá, estou com dúvidas sobre o cadastro admissional.';
  event.currentTarget.href = `https://wa.me/5541995890097?text=${encodeURIComponent(message)}`;
});
setStep(1);
