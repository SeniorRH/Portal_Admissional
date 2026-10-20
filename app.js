const form = document.querySelector('#admissionForm');
const sections = [...document.querySelectorAll('.form-section')];
const nextBtn = document.querySelector('#nextBtn');
const backBtn = document.querySelector('#backBtn');
const submitBtn = document.querySelector('#submitBtn');
const progressBar = document.querySelector('#progressBar');
const stepCaption = document.querySelector('#stepCaption');
const progressPercent = document.querySelector('#progressPercent');
const statusMessage = document.querySelector('#statusMessage');
const uploadList = document.querySelector('#uploadList');
const missingSummary = document.querySelector('#missingSummary');
const overallProgress = document.querySelector('#overallProgress');
const overallPercent = document.querySelector('#overallPercent');
const overallMessage = document.querySelector('#overallMessage');
let currentStep = 1;
let sending = false;
let uploadInProgress = 0;
let queuedUploads = 0;
let uploadQueue = Promise.resolve();
let storedDocs = {};

const documents = [
  {key:'ctps', title:'Carteira de Trabalho Digital (CTPS)', required:true, crucial:true, help:'Indispensável'},
  {key:'cnh', title:'CNH (substitui RG e CPF)', required:false, crucial:true, help:'Alternativa: envie RG e CPF abaixo'},
  {key:'rg', title:'Carteira de Identidade (RG)', required:false, crucial:true, help:'Obrigatório se não enviar CNH'},
  {key:'cpfDoc', title:'Documento CPF', required:false, crucial:true, help:'Obrigatório se não enviar CNH'},
  {key:'titulo', title:'Título de Eleitor', required:false, crucial:false, help:'Opcional / conforme solicitação do RH'},
  {key:'reservista', title:'Certificado de Reservista', required:false, crucial:false, help:'Quando aplicável'},
  {key:'certidao', title:'Certidão de nascimento ou casamento', required:true, crucial:true, help:'Indispensável'},
  {key:'filhos', title:'Certidões de nascimento dos filhos menores de 18 anos', required:false, crucial:false, help:'Se houver filhos menores de 18 anos'},
  {key:'enderecoDoc', title:'Comprovante de endereço (luz ou telefone)', required:true, crucial:true, help:'Indispensável'},
  {key:'foto', title:'Foto 3x4 atual', required:true, crucial:true, help:'Indispensável'}
];
const labels = {nome:'Nome completo', cpf:'CPF', nascimento:'Data de nascimento', cep:'CEP', estado:'Estado (UF)', endereco:'Rua / logradouro', numero:'Número', bairro:'Bairro', cidade:'Cidade', celular:'Celular', email:'E-mail', cientePrivacidade:'Confirmação do aviso de privacidade'};
function endpoint(){ return window.APP_CONFIG?.APPS_SCRIPT_URL || ''; }
function getField(name){ return form.elements.namedItem(name); }
function cpfValido(value) {
  const cpf = String(value || '').replace(/\D/g, '');
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
  const field = document.querySelector('#cpf');
  const message = document.querySelector('#cpfMessage');
  const raw = field.value.replace(/\D/g, '');
  if (!raw) {
    field.setCustomValidity('Informe o CPF.'); message.textContent = 'CPF obrigatório.'; message.className = 'field-message error'; field.classList.add('input-error');
    if (show) { field.focus(); field.reportValidity(); } return false;
  }
  if (!cpfValido(raw)) {
    field.setCustomValidity('CPF inválido. Confira os números digitados.'); message.textContent = 'CPF inválido. Confira os números digitados.'; message.className = 'field-message error'; field.classList.add('input-error');
    if (show) { field.focus(); field.reportValidity(); } return false;
  }
  field.setCustomValidity(''); field.classList.remove('input-error'); message.textContent = 'CPF válido.'; message.className = 'field-message valid'; return true;
}
function fieldLabel(field) {
  if (labels[field.name]) return labels[field.name];
  const label = field.closest('label');
  return label ? label.childNodes[0].textContent.replace(/\s*\*\s*$/, '').trim() : (field.name || 'Campo');
}
function missingFieldsForStep(step) {
  const missing = [];
  const section = sections[step - 1];
  for (const field of section.querySelectorAll('input,select,textarea')) {
    if (field.type === 'file' || field.type === 'checkbox' || field.disabled || field.type === 'button' || field.type === 'submit') continue;
    if (field.required && !String(field.value || '').trim()) missing.push({label:fieldLabel(field), field});
    else if (field.required && !field.checkValidity()) missing.push({label:fieldLabel(field), field});
  }
  if (step === 1 && !cpfValido(getField('cpf').value)) missing.push({label:'CPF válido', field:getField('cpf')});
  if (step === 2 && document.querySelector('#cep').value.replace(/\D/g, '').length !== 8) missing.push({label:'CEP com 8 números', field:document.querySelector('#cep')});
  if (step === 3) {
    const has = key => Boolean(storedDocs[key]);
    documents.filter(d => d.required && !has(d.key)).forEach(d => missing.push({label:d.title, field:document.querySelector(`[data-doc="${d.key}"] input[type=file]`)}));
    if (!has('cnh') && !has('rg')) missing.push({label:'CNH ou RG', field:document.querySelector('[data-doc="cnh"] input[type=file]')});
    if (!has('cnh') && !has('cpfDoc')) missing.push({label:'CNH ou documento CPF', field:document.querySelector('[data-doc="cpfDoc"] input[type=file]')});
    if (!getField('cientePrivacidade').checked) missing.push({label:'Confirmação de leitura do aviso de privacidade', field:getField('cientePrivacidade')});
  }
  return missing.filter((item, i, arr) => arr.findIndex(other => other.label === item.label) === i);
}
function allComplete() {
  if (uploadInProgress > 0 || queuedUploads > 0) return false;
  for (let step = 1; step <= 3; step++) if (missingFieldsForStep(step).length) return false;
  return true;
}
function updateSubmitVisibility() {
  submitBtn.hidden = currentStep !== 3 || sending || uploadInProgress > 0 || queuedUploads > 0 || !allComplete();
  updateMissingSummary();
}
function renderDocuments() {
  documents.forEach(doc => {
    const item = document.createElement('div'); item.className = 'upload-item'; item.dataset.doc = doc.key;
    item.innerHTML = `<span class="upload-copy"><strong>${doc.title}</strong><small>${doc.help}</small><span class="file-status" id="status-${doc.key}">Nenhum arquivo selecionado</span><span class="file-progress"><span id="bar-${doc.key}"></span></span></span><span class="upload-control"><input type="file" name="${doc.key}" accept=".pdf,.jpg,.jpeg,.png" aria-label="${doc.title}"><span class="pill ${doc.crucial ? 'crucial' : 'optional'}">${doc.crucial ? 'Crucial' : 'Opcional'}</span></span>`;
    uploadList.appendChild(item);
    item.querySelector('input').addEventListener('change', async event => {
      const file = event.target.files[0]; const status = document.querySelector(`#status-${doc.key}`); const bar = document.querySelector(`#bar-${doc.key}`);
      item.classList.remove('file-error', 'file-ready');
      if (!file) { status.textContent = storedDocs[doc.key] ? `Já salvo no Drive: ${storedDocs[doc.key].nomeArquivo}` : 'Nenhum arquivo selecionado'; bar.style.width = storedDocs[doc.key] ? '100%' : '0%'; updateSubmitVisibility(); return; }
      const allowed = ['application/pdf', 'image/jpeg', 'image/png']; const maxBytes = (window.APP_CONFIG?.MAX_FILE_MB || 8) * 1024 * 1024;
      if (!allowed.includes(file.type)) { event.target.value = ''; status.textContent = 'Formato inválido. Use PDF, JPG ou PNG.'; item.classList.add('file-error'); bar.style.width = '0%'; updateSubmitVisibility(); return; }
      if (file.size > maxBytes) { event.target.value = ''; status.textContent = `Arquivo maior que ${window.APP_CONFIG?.MAX_FILE_MB || 8} MB.`; item.classList.add('file-error'); bar.style.width = '0%'; updateSubmitVisibility(); return; }
      queuedUploads++; updateSubmitVisibility();
      uploadQueue = uploadQueue.then(async () => { queuedUploads--; await uploadDocument(doc, file, item, status, bar); updateSubmitVisibility(); });
      await uploadQueue;
    });
  });
}
renderDocuments();
function setStep(step) {
  currentStep = step;
  sections.forEach(section => section.classList.toggle('active', Number(section.dataset.step) === step));
  const percent = Math.round(step / sections.length * 100); progressBar.style.width = `${percent}%`; stepCaption.textContent = `Etapa ${step} de ${sections.length}`; progressPercent.textContent = `${percent}%`;
  backBtn.hidden = step === 1; nextBtn.hidden = step === sections.length; statusMessage.textContent = ''; statusMessage.className = 'status-message';
  window.scrollTo({top:0, behavior:'smooth'});
  if (step === 3) refreshDriveDocuments().finally(updateSubmitVisibility); else updateSubmitVisibility();
}
function showStatus(message, isError) { statusMessage.textContent = message; statusMessage.className = 'status-message ' + (isError ? 'error' : 'success'); statusMessage.scrollIntoView({behavior:'smooth',block:'center'}); }
function setOverall(percent, message) { const n = Math.max(0, Math.min(100, Math.round(percent))); overallProgress.style.width = `${n}%`; overallPercent.textContent = `${n}%`; overallMessage.textContent = message; }
function formatBytes(bytes) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024*1024) return `${(bytes/1024).toFixed(0)} KB`; return `${(bytes/1024/1024).toFixed(1)} MB`; }
function currentIdentity() { return {nome:String(getField('nome').value || '').trim(), cpf:String(getField('cpf').value || '').replace(/\D/g, '')}; }
async function postPayload(payload) {
  const url = endpoint(); if (!url || url.includes('COLE_A_URL')) throw new Error('Configure a URL do Apps Script em frontend/config.js.');
  const response = await fetch(url, {method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow'});
  if (!response.ok) throw new Error(`O servidor retornou HTTP ${response.status}.`);
  let result; try { result = await response.json(); } catch (_) { throw new Error('Resposta inválida do Apps Script. Confira se a implantação está atualizada.'); }
  if (!result.ok) throw new Error(result.mensagem || 'O servidor não confirmou a operação.');
  return result;
}
function fileToBase64(file, onProgress) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded/e.total*100); }; reader.onload = () => { if (onProgress) onProgress(100); resolve(String(reader.result).split(',')[1]); }; reader.onerror = () => reject(new Error(`Não foi possível preparar o arquivo ${file.name}.`)); reader.readAsDataURL(file); });
}
async function uploadDocument(doc, file, item, status, bar) {
  const identity = currentIdentity();
  if (!identity.nome || !cpfValido(identity.cpf)) { status.textContent = 'Preencha o nome e informe um CPF válido na primeira etapa antes de anexar documentos.'; item.classList.add('file-error'); updateSubmitVisibility(); return; }
  uploadInProgress++; item.classList.remove('file-error'); item.classList.add('file-uploading'); updateSubmitVisibility();
  try {
    status.textContent = 'Preparando arquivo para envio imediato…';
    const base64 = await fileToBase64(file, pct => { bar.style.width = `${Math.round(pct * .25)}%`; setOverall(pct * .25, `Preparando ${doc.title}…`); });
    status.textContent = 'Enviando para o Drive…'; setOverall(30, `Enviando ${doc.title} para a pasta do funcionário…`);
    const result = await postPayload({acao:'salvarDocumento', ...identity, documento:{chave:doc.key,nome:doc.title,nomeArquivo:file.name,mimeType:file.type,tamanho:file.size,base64}});
    storedDocs[doc.key] = {nomeArquivo:result.nomeArquivo || file.name, id:result.id || ''};
    status.textContent = `Salvo no Drive ✓ ${storedDocs[doc.key].nomeArquivo}`; bar.style.width = '100%'; item.classList.add('file-ready'); item.classList.remove('file-uploading');
    setOverall(100, `${doc.title} salvo no Drive. Você pode continuar preenchendo o cadastro.`);
  } catch (error) {
    item.classList.add('file-error'); item.classList.remove('file-uploading'); status.textContent = `Falha no upload: ${error.message}`;
    setOverall(0, 'Não foi possível confirmar este arquivo. Consultando os documentos já salvos…');
    await refreshDriveDocuments();
    showStatus(`Não foi possível enviar ${doc.title}: ${error.message}. Os documentos já encontrados na pasta foram recarregados.`, true);
  } finally { uploadInProgress--; updateSubmitVisibility(); }
}
async function refreshDriveDocuments() {
  const identity = currentIdentity();
  if (!identity.nome || !cpfValido(identity.cpf)) { updateMissingSummary(); return; }
  try {
    const result = await postPayload({acao:'listarDocumentos', ...identity});
    storedDocs = result.documentos || {};
    documents.forEach(doc => {
      const item = document.querySelector(`[data-doc="${doc.key}"]`); const status = document.querySelector(`#status-${doc.key}`); const bar = document.querySelector(`#bar-${doc.key}`);
      if (storedDocs[doc.key]) { status.textContent = `Já salvo no Drive ✓ ${storedDocs[doc.key].nomeArquivo}`; bar.style.width = '100%'; item.classList.add('file-ready'); item.classList.remove('file-error'); }
      else if (!item.querySelector('input').files.length) { status.textContent = 'Nenhum arquivo encontrado na pasta'; bar.style.width = '0%'; item.classList.remove('file-ready'); }
    });
  } catch (error) {
    overallMessage.textContent = `Não foi possível consultar os documentos já salvos: ${error.message}`;
  }
  updateMissingSummary();
}
function updateMissingSummary() {
  if (!missingSummary) return;
  const missing = [];
  for (let step=1; step<=3; step++) missing.push(...missingFieldsForStep(step));
  const unique = missing.filter((item, i, arr) => arr.findIndex(other => other.label === item.label) === i);
  if (!unique.length) { missingSummary.classList.add('hidden'); missingSummary.textContent = ''; return; }
  missingSummary.classList.remove('hidden');
  missingSummary.innerHTML = `<strong>Para liberar o envio, finalize os itens abaixo:</strong><ul>${unique.map(x => `<li>${escapeHtml(x.label)}</li>`).join('')}</ul>`;
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function focusErrorField(field) {
  if (!field) return;
  const section = field.closest('.form-section');
  if (section && Number(section.dataset.step) !== currentStep) setStep(Number(section.dataset.step));
  window.setTimeout(() => { field.classList.add('input-error'); field.focus({preventScroll:false}); field.scrollIntoView({behavior:'smooth',block:'center'}); if (field.reportValidity && field.willValidate) field.reportValidity(); }, 60);
}
function focusServerError(message) {
  const lower = String(message).toLowerCase();
  const map = [['bairro','bairro'],['cep','cep'],['cpf','cpf'],['nome','nome'],['nascimento','nascimento'],['endereço','endereco'],['endereco','endereco'],['número','numero'],['numero','numero'],['cidade','cidade'],['estado','estado'],['celular','celular'],['e-mail','email'],['email','email']];
  for (const [needle,name] of map) if (lower.includes(needle)) { const field = getField(name); if (field) { focusErrorField(field); return; } }
  const doc = documents.find(d => lower.includes(d.title.toLowerCase()) || lower.includes(d.key.toLowerCase()));
  if (doc) { const field = document.querySelector(`[data-doc="${doc.key}"] input[type=file]`); focusErrorField(field); }
}
function markAndFocusFirstMissing(step) {
  const missing = missingFieldsForStep(step);
  if (!missing.length) return true;
  const first = missing[0];
  showStatus(`Antes de continuar, corrija ou complete: ${missing.map(x => x.label).join(', ')}.`, true);
  if (first.field) focusErrorField(first.field);
  return false;
}
function updateAddressLock() {
  const digits = document.querySelector('#cep').value.replace(/\D/g, ''); const unlock = digits.length === 8;
  ['estado','endereco','numeroResidencia','complemento','bairro','cidade'].forEach(id => { document.getElementById(id).disabled = !unlock; });
  if (!unlock) document.querySelector('#cepMessage').textContent = 'Digite os 8 números do CEP para liberar os campos de endereço.';
  return unlock;
}
nextBtn.addEventListener('click', () => {
  if (currentStep === 1 && !validateCpf(true)) return;
  if (!markAndFocusFirstMissing(currentStep)) return;
  const invalid = sections[currentStep-1].querySelector(':invalid:not(:disabled)');
  if (invalid) { focusErrorField(invalid); showStatus(`Confira o campo: ${fieldLabel(invalid)}.`, true); return; }
  setStep(Math.min(currentStep + 1, sections.length));
});
backBtn.addEventListener('click', () => setStep(Math.max(currentStep - 1, 1)));
document.querySelector('#pcd').addEventListener('change', event => document.querySelector('#deficienciaWrap').classList.toggle('hidden', event.target.value !== 'Sim'));
document.querySelector('#cpf').addEventListener('input', event => {
  let v = event.target.value.replace(/\D/g, '').slice(0,11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4'); else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3'); else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  event.target.value = v; event.target.setCustomValidity(''); event.target.classList.remove('input-error'); document.querySelector('#cpfMessage').textContent = 'O CPF será validado ao sair deste campo.'; document.querySelector('#cpfMessage').className = 'field-message'; updateSubmitVisibility();
});
document.querySelector('#cpf').addEventListener('blur', () => { validateCpf(true); if (currentStep === 3) refreshDriveDocuments(); updateSubmitVisibility(); });
document.querySelector('#cpf').addEventListener('keydown', event => { if (event.key === 'Tab' && !validateCpf(false)) { event.preventDefault(); validateCpf(true); } });
document.querySelector('#nome').addEventListener('input', () => { if (currentStep === 3) refreshDriveDocuments(); updateSubmitVisibility(); });
document.querySelector('#cep').addEventListener('input', event => { let v = event.target.value.replace(/\D/g, '').slice(0,8); if (v.length > 5) v = v.replace(/(\d{5})(\d{1,3})/, '$1-$2'); event.target.value = v; updateAddressLock(); updateSubmitVisibility(); });
document.querySelector('#cep').addEventListener('blur', async () => {
  const cep = document.querySelector('#cep').value.replace(/\D/g, ''); const msg = document.querySelector('#cepMessage');
  if (cep.length !== 8) { msg.textContent = 'Informe um CEP com 8 números para continuar.'; return; }
  msg.textContent = 'Consultando CEP…';
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`); if (!response.ok) throw new Error('Falha na consulta'); const data = await response.json();
    if (data.erro) throw new Error('CEP não encontrado. Confira o CEP e preencha o endereço manualmente.');
    document.querySelector('#endereco').value = data.logradouro || ''; document.querySelector('#bairro').value = data.bairro || ''; document.querySelector('#cidade').value = data.localidade || ''; document.querySelector('#estado').value = data.uf || '';
    msg.textContent = data.bairro ? 'CEP encontrado. Confira o endereço e informe o número da residência.' : 'CEP encontrado, mas o serviço não retornou o bairro. Preencha esse campo manualmente.';
  } catch (error) { msg.textContent = (error.message || 'Não foi possível consultar o CEP.') + ' Os campos estão liberados para preenchimento manual.'; }
  updateSubmitVisibility();
});
document.querySelector('#celular').addEventListener('input', event => { let v = event.target.value.replace(/\D/g,'').slice(0,11); if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{1,4})/,'($1) $2-$3'); else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{1,4})/,'($1) $2-$3'); else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,5})/,'($1) $2'); event.target.value = v; updateSubmitVisibility(); });
form.addEventListener('input', event => { if (event.target.id !== 'cpf' && event.target.id !== 'cep' && event.target.id !== 'celular') event.target.classList.remove('input-error'); updateSubmitVisibility(); });
form.addEventListener('change', () => updateSubmitVisibility());
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  if (!allComplete()) { updateMissingSummary(); const firstStep = [1,2,3].find(step => missingFieldsForStep(step).length) || 3; setStep(firstStep); markAndFocusFirstMissing(firstStep); return; }
  sending = true; submitBtn.disabled = true; nextBtn.disabled = true; backBtn.disabled = true; updateSubmitVisibility();
  const originalText = submitBtn.innerHTML;
  try {
    // Confirma a lista no Drive antes de finalizar, para aproveitar arquivos enviados anteriormente.
    await refreshDriveDocuments();
    if (!allComplete()) throw new Error('Há dados ou documentos indispensáveis faltando. Confira a lista de pendências.');
    const data = {};
    for (const [key,value] of new FormData(form).entries()) if (!(value instanceof File)) data[key] = value;
    data.acao = 'enviarCadastro'; data.origem = window.location.href;
    // Não recria nem limpa a pasta: o servidor atualiza apenas a planilha de dados e preserva os documentos existentes.
    setOverall(90, 'Validando os dados cadastrais e finalizando o cadastro…'); submitBtn.innerHTML = 'Finalizando…';
    const result = await postPayload(data);
    setOverall(100, 'Cadastro finalizado com sucesso.'); showStatus('Cadastro enviado com sucesso. Os documentos foram mantidos na pasta individual do Drive.', false);
    submitBtn.hidden = true; submitBtn.disabled = true;
  } catch (error) {
    await refreshDriveDocuments();
    setOverall(0, 'Não foi possível concluir. Os arquivos já salvos foram consultados novamente.');
    showStatus(`Não foi possível concluir o envio: ${error.message}`, true); focusServerError(error.message); updateSubmitVisibility();
  } finally { sending = false; nextBtn.disabled = false; backBtn.disabled = false; if (!submitBtn.hidden) submitBtn.disabled = false; updateSubmitVisibility(); }
});
updateAddressLock();
setStep(1);
